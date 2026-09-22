import { db } from '../db';
import {
  assessmentQuestionRepository,
  assessmentRepository,
  assessmentSubmissionRepository,
  questionRepository,
  questionSubmissionRepository,
  testCaseRepository,
  testCaseResultRepository,
} from '../repositories';
import { runCode } from '../clients/runnerClient';
import { badRequest, conflict, forbidden, notFound } from '../middleware/errorHandler';
import { requireStarterCode } from './questionService';
import type {
  AssessmentSubmission,
  QuestionSubmission,
  SubmitSolutionInput,
  SolutionResult,
  SubmissionDetail,
  QuestionSubmissionWithQuestion,
} from '../types/submission';
import type { TestCase } from '../types/question';
import type { ExecutionResult } from '../types/execution';

export { type SubmitSolutionInput, type SolutionResult, type SubmissionDetail };

// Margen sobre el tiempo límite para un envío hecho en los últimos segundos que tarda en llegar.
const DEADLINE_GRACE_SECONDS = 30;

export async function listByStudent(studentId: number): Promise<AssessmentSubmission[]> {
  return assessmentSubmissionRepository.findByStudent(studentId);
}

/**
 * Abre un intento nuevo. Un estudiante solo puede tener un intento en curso por assessment
 * (409 si ya existe). Los puntos posibles quedan guardados en el intento desde el inicio.
 */
export async function startAssessment(
  studentId: number,
  assessmentId: number
): Promise<AssessmentSubmission> {
  const assessment = await assessmentRepository.findById(assessmentId);
  if (!assessment) {
    throw notFound(`Assessment ${assessmentId} not found`);
  }

  const inProgress = await assessmentSubmissionRepository.findInProgress(
    studentId,
    assessmentId
  );
  if (inProgress) {
    throw conflict(
      `Student ${studentId} already has attempt ${inProgress.id} in progress for this assessment`
    );
  }

  const totalPossiblePoints =
    await assessmentQuestionRepository.sumQuestionPoints(assessmentId);

  return assessmentSubmissionRepository.create({
    studentId,
    assessmentId,
    totalPossiblePoints,
  });
}

/**
 * Califica la respuesta de una pregunta. A diferencia de "Ejecutar", corre todos los casos,
 * incluidos los ocultos, y el puntaje es proporcional a los casos aprobados
 * (4 de 5 en una pregunta de 10 puntos = 8). El envío y el resultado de cada caso se guardan
 * en una sola transacción. Se permiten varios envíos por pregunta; cuenta el último.
 */
export async function submitSolution(input: SubmitSolutionInput): Promise<SolutionResult> {
  const submission = await findOwnSubmission(input.assessmentSubmissionId, input.studentId);
  if (submission.completedAt) {
    throw conflict(`Assessment submission ${submission.id} is already completed`);
  }

  // El temporizador del front es solo visual: el servidor decide si todavía hay tiempo. Un envío
  // tardío se rechaza sin ejecutarse y el intento se cierra con lo que ya se había enviado.
  if (await assessmentSubmissionRepository.isPastDeadline(submission.id, DEADLINE_GRACE_SECONDS)) {
    await closeAttempt(submission.id);
    throw conflict(`Time limit exceeded: assessment submission ${submission.id} has been closed`);
  }

  const belongsToAssessment = await assessmentQuestionRepository.isQuestionInAssessment(
    submission.assessmentId,
    input.questionId
  );
  if (!belongsToAssessment) {
    throw badRequest(
      `Question ${input.questionId} does not belong to assessment ${submission.assessmentId}`
    );
  }

  const question = await questionRepository.findById(input.questionId);
  if (!question) {
    throw notFound(`Question ${input.questionId} not found`);
  }

  const starterCode = await requireStarterCode(question.id, input.language);

  const cases = await testCaseRepository.findByQuestionId(input.questionId);
  if (cases.length === 0) {
    throw badRequest(`Question ${input.questionId} has no test cases configured`);
  }

  const execution = await runCode({
    questionId: question.id,
    language: input.language,
    code: input.code,
    templateCode: starterCode,
    testCases: cases.map((testCase) => ({
      input: testCase.inputValue,
      expectedOutput: testCase.expectedOutput,
      isVisible: testCase.isVisible ?? true,
    })),
  });

  const passedTests = execution.testResults?.filter((result) => result.passed).length ?? 0;
  const score = Math.round((question.points * passedTests) / cases.length);
  const isCompileError = execution.status === 'COMPILE_ERROR';

  const questionSubmission = await db.transaction(async (tx) => {
    const created = await questionSubmissionRepository.create(
      {
        assessmentSubmissionId: submission.id,
        questionId: question.id,
        studentCode: input.code,
        programmingLanguage: input.language,
        score,
        passedTests,
        totalTests: cases.length,
        compilationError: isCompileError ? (execution.error ?? null) : null,
        executionOutput: execution.output ?? (isCompileError ? null : (execution.error ?? null)),
      },
      tx
    );

    await testCaseResultRepository.createMany(
      buildTestCaseResults(created.id, cases, execution),
      tx
    );

    return created;
  });

  const testCaseResults = await testCaseResultRepository.findByQuestionSubmission(
    questionSubmission.id
  );

  return { questionSubmission, status: execution.status, testCaseResults };
}

/**
 * Cierra el intento y fija el puntaje final. Después de esto ya no se aceptan envíos.
 * Se permite aunque el tiempo haya vencido: así el front cierra el intento al llegar a 0.
 */
export async function completeAssessment(
  assessmentSubmissionId: number,
  studentId: number
): Promise<AssessmentSubmission> {
  const submission = await findOwnSubmission(assessmentSubmissionId, studentId);
  if (submission.completedAt) {
    throw conflict(`Assessment submission ${submission.id} is already completed`);
  }

  return closeAttempt(submission.id);
}

/** Fija como puntaje final la suma del último envío de cada pregunta y marca el intento como terminado. */
async function closeAttempt(assessmentSubmissionId: number): Promise<AssessmentSubmission> {
  const attempts = await questionSubmissionRepository.findByAssessmentSubmission(
    assessmentSubmissionId
  );
  return assessmentSubmissionRepository.complete(
    assessmentSubmissionId,
    sumLatestScorePerQuestion(attempts)
  );
}

export async function getSubmissionDetail(
  assessmentSubmissionId: number,
  studentId: number
): Promise<SubmissionDetail> {
  const submission = await findOwnSubmission(assessmentSubmissionId, studentId);

  const attempts = await questionSubmissionRepository.findByAssessmentSubmission(
    submission.id
  );

  const detailed = await Promise.all(
    attempts.map(async (attempt) => ({
      ...attempt,
      testCaseResults: await testCaseResultRepository.findByQuestionSubmission(attempt.id),
    }))
  );

  return { ...submission, questionSubmissions: detailed };
}

/** Un estudiante solo puede ver o modificar sus propios intentos. */
async function findOwnSubmission(
  assessmentSubmissionId: number,
  studentId: number
): Promise<AssessmentSubmission> {
  const submission = await assessmentSubmissionRepository.findById(assessmentSubmissionId);
  if (!submission) {
    throw notFound(`Assessment submission ${assessmentSubmissionId} not found`);
  }
  if (submission.studentId !== studentId) {
    throw forbidden(`Assessment submission ${assessmentSubmissionId} belongs to another student`);
  }
  return submission;
}

// El runner responde los resultados en el mismo orden en que recibió los casos. Si no hay
// resultado (p. ej. error de compilación), el caso queda como fallido con el error general.
function buildTestCaseResults(
  questionSubmissionId: number,
  cases: TestCase[],
  execution: ExecutionResult
) {
  return cases.map((testCase, index) => {
    const result = execution.testResults?.[index];
    return {
      questionSubmissionId,
      testCaseId: testCase.id,
      inputValue: testCase.inputValue,
      expectedOutput: testCase.expectedOutput,
      actualOutput: result?.actualOutput ?? null,
      isPassed: result?.passed ?? false,
      errorMessage: result?.error ?? execution.error ?? null,
    };
  });
}

// Depende de que el repositorio devuelva los envíos del más reciente al más antiguo:
// el primero que aparece de cada pregunta es el que cuenta.
function sumLatestScorePerQuestion(attempts: QuestionSubmissionWithQuestion[]): number {
  const latestByQuestion = new Map<number, QuestionSubmission>();

  for (const attempt of attempts) {
    if (!latestByQuestion.has(attempt.questionId)) {
      latestByQuestion.set(attempt.questionId, attempt);
    }
  }

  return [...latestByQuestion.values()].reduce((sum, attempt) => sum + (attempt.score ?? 0), 0);
}
