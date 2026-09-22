import { createQuestion, runQuestion } from '../../src/controllers/questionController';
import * as questionService from '../../src/services/questionService';
import type { QuestionDetail } from '../../src/types/question';
import { mockHttp } from '../helpers/http';

jest.mock('../../src/services/questionService', () => ({
  listQuestions: jest.fn(),
  getQuestion: jest.fn(),
  createQuestion: jest.fn(),
  runQuestion: jest.fn(),
}));

const admin = { id: 1, role: 'admin' as const };

const body = {
  title: 'Suma números pares',
  description: 'Retorna la suma de los números pares del arreglo.',
  points: '15',
  starterCodes: { python: 'def sum_even_numbers(arr):\n    pass\n' },
  testCases: [
    { inputValue: '[[1, 2, 3, 4]]', expectedOutput: '6' },
    { inputValue: '[[]]', expectedOutput: '0', isVisible: false },
  ],
};

describe('questionController', () => {
  beforeEach(() => jest.clearAllMocks());

  describe('createQuestion', () => {
    it('GIVEN casos de prueba sin isVisible, WHEN se llama a createQuestion, THEN crea la pregunta con esos casos visibles y responde 201', async () => {
      jest.mocked(questionService.createQuestion).mockResolvedValue({ id: 4 } as QuestionDetail);
      const { req, res, next } = mockHttp({ body, user: admin });

      await createQuestion(req, res, next);

      expect(questionService.createQuestion).toHaveBeenCalledWith(
        expect.objectContaining({
          createdBy: 1,
          points: 15,
          starterCodes: { python: 'def sum_even_numbers(arr):\n    pass\n' },
          testCases: [
            { inputValue: '[[1, 2, 3, 4]]', expectedOutput: '6', isVisible: true },
            { inputValue: '[[]]', expectedOutput: '0', isVisible: false },
          ],
        })
      );
      expect(res.status).toHaveBeenCalledWith(201);
    });

    it('GIVEN código inicial de un lenguaje no soportado, WHEN se llama a createQuestion, THEN responde 400 sin crear la pregunta', async () => {
      const { req, res, next } = mockHttp({
        body: { ...body, starterCodes: { ruby: 'def sum_even_numbers(arr)\nend' } },
        user: admin,
      });

      await createQuestion(req, res, next);

      expect(next).toHaveBeenCalledWith(
        expect.objectContaining({ status: 400, message: 'language must be one of: python, javascript, java' })
      );
      expect(questionService.createQuestion).not.toHaveBeenCalled();
    });

    it('GIVEN testCases que no son un arreglo, WHEN se llama a createQuestion, THEN responde 400', async () => {
      const { req, res, next } = mockHttp({ body: { ...body, testCases: 'nada' }, user: admin });

      await createQuestion(req, res, next);

      expect(next).toHaveBeenCalledWith(
        expect.objectContaining({ status: 400, message: 'testCases must be an array' })
      );
    });
  });

  it('GIVEN una petición sin código, WHEN se llama a runQuestion, THEN responde 400 sin llamar al runner', async () => {
    const { req, res, next } = mockHttp({ params: { id: '1' }, body: { language: 'python' } });

    await runQuestion(req, res, next);

    expect(next).toHaveBeenCalledWith(expect.objectContaining({ status: 400, message: 'code is required' }));
    expect(questionService.runQuestion).not.toHaveBeenCalled();
  });
});
