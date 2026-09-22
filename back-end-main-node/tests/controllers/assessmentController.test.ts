import { createAssessment, getAssessment } from '../../src/controllers/assessmentController';
import * as assessmentService from '../../src/services/assessmentService';
import { notFound } from '../../src/middleware/errorHandler';
import type { AssessmentDetail } from '../../src/types/assessment';
import { mockHttp } from '../helpers/http';

jest.mock('../../src/services/assessmentService', () => ({
  listAssessments: jest.fn(),
  getAssessment: jest.fn(),
  createAssessment: jest.fn(),
}));

const assessment: AssessmentDetail = {
  id: 3,
  createdBy: 1,
  title: 'Assessment Java',
  description: null,
  durationMinutes: 45,
  totalQuestions: 2,
  createdAt: null,
  questions: [],
  totalPossiblePoints: 25,
};

describe('assessmentController', () => {
  beforeEach(() => jest.clearAllMocks());

  it('GIVEN un body con un createdBy distinto al de la sesión, WHEN se llama a createAssessment, THEN usa como autor al usuario de la sesión y responde 201', async () => {
    jest.mocked(assessmentService.createAssessment).mockResolvedValue(assessment);
    const { req, res, next } = mockHttp({
      // Un createdBy en el body se ignora: el autor es siempre el usuario de la sesión.
      body: { createdBy: '99', title: 'Assessment Java', durationMinutes: '45', questionIds: [1, '3'] },
      user: { id: 1, role: 'admin' },
    });

    await createAssessment(req, res, next);

    expect(assessmentService.createAssessment).toHaveBeenCalledWith({
      createdBy: 1,
      title: 'Assessment Java',
      description: undefined,
      durationMinutes: 45,
      questionIds: [1, 3],
    });
    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith(assessment);
    expect(next).not.toHaveBeenCalled();
  });

  it('GIVEN un id inválido, WHEN se llama a getAssessment, THEN responde 400 sin consultar el servicio', async () => {
    const { req, res, next } = mockHttp({ params: { id: 'abc' } });

    await getAssessment(req, res, next);

    expect(next).toHaveBeenCalledWith(expect.objectContaining({ status: 400 }));
    expect(assessmentService.getAssessment).not.toHaveBeenCalled();
  });

  it('GIVEN un servicio que lanza un error, WHEN se llama a getAssessment, THEN pasa el error al middleware de errores', async () => {
    const error = notFound('Assessment 99 not found');
    jest.mocked(assessmentService.getAssessment).mockRejectedValue(error);
    const { req, res, next } = mockHttp({ params: { id: '99' } });

    await getAssessment(req, res, next);

    expect(next).toHaveBeenCalledWith(error);
    expect(res.json).not.toHaveBeenCalled();
  });
});
