import {
  completeAssessment,
  listSubmissions,
  submitSolution,
} from '../../src/controllers/submissionController';
import * as submissionService from '../../src/services/submissionService';
import { conflict } from '../../src/middleware/errorHandler';
import type { SolutionResult } from '../../src/types/submission';
import { mockHttp } from '../helpers/http';

jest.mock('../../src/services/submissionService', () => ({
  listByStudent: jest.fn(),
  startAssessment: jest.fn(),
  submitSolution: jest.fn(),
  completeAssessment: jest.fn(),
  getSubmissionDetail: jest.fn(),
}));

describe('submissionController', () => {
  beforeEach(() => jest.clearAllMocks());

  it('submitSolution toma el intento de la URL y responde 201', async () => {
    const result = { status: 'SUCCESS', testCaseResults: [] } as unknown as SolutionResult;
    jest.mocked(submissionService.submitSolution).mockResolvedValue(result);
    const { req, res, next } = mockHttp({
      params: { id: '7' },
      body: { questionId: 2, code: 'def reverse_string(s):\n    return s[::-1]\n', language: 'python' },
    });

    await submitSolution(req, res, next);

    expect(submissionService.submitSolution).toHaveBeenCalledWith({
      assessmentSubmissionId: 7,
      questionId: 2,
      code: 'def reverse_string(s):\n    return s[::-1]\n',
      language: 'python',
    });
    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith(result);
  });

  it('listSubmissions requiere el studentId en la query', async () => {
    const { req, res, next } = mockHttp();

    await listSubmissions(req, res, next);

    expect(next).toHaveBeenCalledWith(
      expect.objectContaining({ status: 400, message: 'studentId must be a positive integer' })
    );
    expect(submissionService.listByStudent).not.toHaveBeenCalled();
  });

  it('completeAssessment devuelve el 409 si el intento ya estaba cerrado', async () => {
    const error = conflict('Assessment submission 5 is already completed');
    jest.mocked(submissionService.completeAssessment).mockRejectedValue(error);
    const { req, res, next } = mockHttp({ params: { id: '5' } });

    await completeAssessment(req, res, next);

    expect(next).toHaveBeenCalledWith(error);
    expect(res.json).not.toHaveBeenCalled();
  });
});
