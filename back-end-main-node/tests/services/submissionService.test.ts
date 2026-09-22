import * as submissionService from '../../src/services/submissionService';
import {
  assessmentRepository,
  assessmentQuestionRepository,
  assessmentSubmissionRepository,
  questionRepository,
  questionSubmissionRepository,
  testCaseRepository,
  testCaseResultRepository,
} from '../../src/repositories';
import { runCode } from '../../src/clients/runnerClient';
import type { AssessmentSubmission, QuestionSubmissionWithQuestion } from '../../src/types/submission';
import type { Question, TestCase } from '../../src/types/question';

jest.mock('../../src/db', () => ({
  db: { transaction: jest.fn((callback) => callback({})) },
}));

jest.mock('../../src/repositories', () => ({
  assessmentRepository: { findById: jest.fn() },
  assessmentQuestionRepository: {
    isQuestionInAssessment: jest.fn(),
    sumQuestionPoints: jest.fn(),
  },
  assessmentSubmissionRepository: {
    findById: jest.fn(),
    findInProgress: jest.fn(),
    create: jest.fn(),
    complete: jest.fn(),
  },
  questionRepository: { findById: jest.fn() },
  questionSubmissionRepository: { create: jest.fn(), findByAssessmentSubmission: jest.fn() },
  testCaseRepository: { findByQuestionId: jest.fn() },
  testCaseResultRepository: { createMany: jest.fn(), findByQuestionSubmission: jest.fn() },
}));

jest.mock('../../src/clients/runnerClient', () => ({ runCode: jest.fn() }));
jest.mock('../../src/services/userService', () => ({ requireRole: jest.fn() }));
jest.mock('../../src/services/questionService', () => ({
  requireStarterCode: jest.fn().mockResolvedValue('function findMax(arr) {\n}\n'),
}));

const submission: AssessmentSubmission = {
  id: 1,
  studentId: 3,
  assessmentId: 1,
  finalScore: null,
  totalPossiblePoints: 35,
  startedAt: new Date('2026-09-20T08:00:00Z'),
  completedAt: null,
};

const question: Question = {
  id: 1,
  createdBy: 1,
  title: 'Encuentra el número máximo',
  description: 'Dado un arreglo de números, retorna el valor máximo.',
  points: 10,
  createdAt: null,
};

const cases: TestCase[] = [1, 2, 3, 4, 5].map((id) => ({
  id,
  questionId: 1,
  inputValue: `[[${id}]]`,
  expectedOutput: String(id),
  isVisible: true,
}));

function attempt(id: number, questionId: number, score: number): QuestionSubmissionWithQuestion {
  return {
    id,
    assessmentSubmissionId: 1,
    questionId,
    studentCode: '...',
    programmingLanguage: 'javascript',
    score,
    passedTests: 0,
    totalTests: 5,
    compilationError: null,
    executionOutput: null,
    submittedAt: null,
    question: { ...question, id: questionId },
  };
}

const solution = { assessmentSubmissionId: 1, questionId: 1, code: 'function findMax() {}', language: 'javascript' as const };

describe('submissionService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.mocked(assessmentSubmissionRepository.findById).mockResolvedValue(submission);
    jest.mocked(assessmentQuestionRepository.isQuestionInAssessment).mockResolvedValue(true);
    jest.mocked(questionRepository.findById).mockResolvedValue(question);
    jest.mocked(testCaseRepository.findByQuestionId).mockResolvedValue(cases);
    jest.mocked(questionSubmissionRepository.create).mockImplementation(async (data) => ({ ...attempt(10, 1, 0), ...data }));
    jest.mocked(testCaseResultRepository.findByQuestionSubmission).mockResolvedValue([]);
  });

  describe('submitSolution', () => {
    it('da puntaje parcial según los casos que pasan', async () => {
      jest.mocked(runCode).mockResolvedValue({
        status: 'WRONG_ANSWER',
        testResults: cases.map((c, i) => ({
          testCaseIndex: i,
          input: c.inputValue,
          expectedOutput: c.expectedOutput,
          passed: i < 4,
        })),
      });

      await submissionService.submitSolution(solution);

      expect(questionSubmissionRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({ score: 8, passedTests: 4, totalTests: 5 }),
        expect.anything()
      );
      expect(testCaseResultRepository.createMany).toHaveBeenCalledTimes(1);
    });

    it('guarda el error de compilación con puntaje 0', async () => {
      jest.mocked(runCode).mockResolvedValue({
        status: 'COMPILE_ERROR',
        error: 'Solution.java:3: error: cannot find symbol',
      });

      const result = await submissionService.submitSolution(solution);

      expect(result.status).toBe('COMPILE_ERROR');
      expect(questionSubmissionRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          score: 0,
          compilationError: 'Solution.java:3: error: cannot find symbol',
          executionOutput: null,
        }),
        expect.anything()
      );
    });

    it('no acepta envíos en un intento que ya terminó', async () => {
      jest.mocked(assessmentSubmissionRepository.findById).mockResolvedValue({
        ...submission,
        completedAt: new Date(),
      });

      await expect(submissionService.submitSolution(solution)).rejects.toMatchObject({ status: 409 });
      expect(runCode).not.toHaveBeenCalled();
    });

    it('rechaza preguntas que no son del assessment', async () => {
      jest.mocked(assessmentQuestionRepository.isQuestionInAssessment).mockResolvedValue(false);

      await expect(submissionService.submitSolution(solution)).rejects.toMatchObject({ status: 400 });
    });
  });

  it('completeAssessment suma solo el último envío de cada pregunta', async () => {
    // El repositorio devuelve los envíos del más reciente al más antiguo
    jest.mocked(questionSubmissionRepository.findByAssessmentSubmission).mockResolvedValue([
      attempt(3, 1, 10),
      attempt(2, 3, 7),
      attempt(1, 1, 4),
    ]);

    await submissionService.completeAssessment(1);

    expect(assessmentSubmissionRepository.complete).toHaveBeenCalledWith(1, 17);
  });

  it('startAssessment no deja abrir dos intentos del mismo assessment', async () => {
    jest.mocked(assessmentRepository.findById).mockResolvedValue({
      id: 1,
      createdBy: 1,
      title: 'Assessment JavaScript Básico',
      description: null,
      durationMinutes: 60,
      totalQuestions: 3,
      createdAt: null,
    });
    jest.mocked(assessmentSubmissionRepository.findInProgress).mockResolvedValue(submission);

    await expect(submissionService.startAssessment(3, 1)).rejects.toMatchObject({ status: 409 });
    expect(assessmentSubmissionRepository.create).not.toHaveBeenCalled();
  });
});
