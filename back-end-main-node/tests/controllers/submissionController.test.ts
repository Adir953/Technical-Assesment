import {
  completeAssessment,
  listSubmissions,
  startAssessment,
  submitSolution,
} from '../../src/controllers/submissionController';
import * as submissionService from '../../src/services/submissionService';
import { conflict } from '../../src/middleware/errorHandler';
import type { AssessmentSubmission, SolutionResult } from '../../src/types/submission';
import { mockHttp } from '../helpers/http';

jest.mock('../../src/services/submissionService', () => ({
  listByStudent: jest.fn(),
  startAssessment: jest.fn(),
  submitSolution: jest.fn(),
  completeAssessment: jest.fn(),
  getSubmissionDetail: jest.fn(),
}));

const student = { id: 3, role: 'student' as const };

describe('submissionController', () => {
  beforeEach(() => jest.clearAllMocks());

  it('GIVEN un intento en la URL y un estudiante en sesión, WHEN se llama a submitSolution, THEN envía la solución con ese intento y ese estudiante y responde 201', async () => {
    const result = { status: 'SUCCESS', testCaseResults: [] } as unknown as SolutionResult;
    jest.mocked(submissionService.submitSolution).mockResolvedValue(result);
    const { req, res, next } = mockHttp({
      params: { id: '7' },
      body: { questionId: 2, code: 'def reverse_string(s):\n    return s[::-1]\n', language: 'python' },
      user: student,
    });

    await submitSolution(req, res, next);

    expect(submissionService.submitSolution).toHaveBeenCalledWith({
      assessmentSubmissionId: 7,
      studentId: 3,
      questionId: 2,
      code: 'def reverse_string(s):\n    return s[::-1]\n',
      language: 'python',
    });
    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith(result);
  });

  it('GIVEN un studentId distinto en la query, WHEN se llama a listSubmissions, THEN lista los intentos del estudiante de la sesión', async () => {
    jest.mocked(submissionService.listByStudent).mockResolvedValue([]);
    const { req, res, next } = mockHttp({ query: { studentId: '99' }, user: student });

    await listSubmissions(req, res, next);

    expect(submissionService.listByStudent).toHaveBeenCalledWith(3);
    expect(res.json).toHaveBeenCalledWith([]);
  });

  it('GIVEN un studentId distinto en el body, WHEN se llama a startAssessment, THEN lo ignora y usa el estudiante de la sesión', async () => {
    jest.mocked(submissionService.startAssessment).mockResolvedValue({ id: 15 } as AssessmentSubmission);
    const { req, res, next } = mockHttp({ body: { studentId: 99, assessmentId: 1 }, user: student });

    await startAssessment(req, res, next);

    expect(submissionService.startAssessment).toHaveBeenCalledWith(3, 1);
    expect(res.status).toHaveBeenCalledWith(201);
  });

  it('GIVEN un intento ya cerrado, WHEN se llama a completeAssessment, THEN pasa el error 409 al middleware de errores', async () => {
    const error = conflict('Assessment submission 5 is already completed');
    jest.mocked(submissionService.completeAssessment).mockRejectedValue(error);
    const { req, res, next } = mockHttp({ params: { id: '5' }, user: student });

    await completeAssessment(req, res, next);

    expect(submissionService.completeAssessment).toHaveBeenCalledWith(5, 3);
    expect(next).toHaveBeenCalledWith(error);
    expect(res.json).not.toHaveBeenCalled();
  });
});
