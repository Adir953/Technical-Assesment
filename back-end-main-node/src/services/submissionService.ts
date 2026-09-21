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
import { badRequest, conflict, notFound } from '../middleware/errorHandler';
import { requireRole } from './userService';
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

export { type SubmitSolutionInput, type SolutionResult, type SubmissionDetail };

export async function startAssessment(
  studentId: number,
  assessmentId: number
): Promise<AssessmentSubmission> {
  await requireRole(studentId, 'student');

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

export async function submitSolution(input: SubmitSolutionInput): Promise<SolutionResult> {
  const submission = await assessmentSubmissionRepository.findById(
    input.assessmentSubmissionId
  );
  if (!submission) {
    throw notFound(`Assessment submission ${input.assessmentSubmissionId} not found`);
  }
  if (submission.completedAt) {
    throw conflict(`Assessment submission ${submission.id} is already completed`);
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

export async function completeAssessment(
  assessmentSubmissionId: number
): Promise<AssessmentSubmission> {
  const submission = await assessmentSubmissionRepository.findById(assessmentSubmissionId);
  if (!submission) {
    throw notFound(`Assessment submission ${assessmentSubmissionId} not found`);
  }
  if (submission.completedAt) {
    throw conflict(`Assessment submission ${submission.id} is already completed`);
  }

  const attempts = await questionSubmissionRepository.findByAssessmentSubmission(
    submission.id
  );
  const finalScore = sumLatestScorePerQuestion(attempts);

  return assessmentSubmissionRepository.complete(submission.id, finalScore);
}

export async function getSubmissionDetail(assessmentSubmissionId: number): Promise<SubmissionDetail> {
  const submission = await assessmentSubmissionRepository.findById(assessmentSubmissionId);
  if (!submission) {
    throw notFound(`Assessment submission ${assessmentSubmissionId} not found`);
  }

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

function buildTestCaseResults(
  questionSubmissionId: number,
  cases: TestCase[],
  execution: ReturnType<typeof runCode> extends Promise<infer T> ? T : never
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

function sumLatestScorePerQuestion(attempts: QuestionSubmissionWithQuestion[]): number {
  const latestByQuestion = new Map<number, QuestionSubmission>();

  for (const attempt of attempts) {
    if (!latestByQuestion.has(attempt.questionId)) {
      latestByQuestion.set(attempt.questionId, attempt);
    }
  }

  return [...latestByQuestion.values()].reduce((sum, attempt) => sum + (attempt.score ?? 0), 0);
}
