import { runQuestion } from '../../src/services/questionService';
import {
  questionRepository,
  questionStarterCodeRepository,
  testCaseRepository,
} from '../../src/repositories';
import { runCode } from '../../src/clients/runnerClient';

jest.mock('../../src/db', () => ({ db: {} }));
jest.mock('../../src/repositories', () => ({
  questionRepository: { findById: jest.fn() },
  questionStarterCodeRepository: { findByQuestionId: jest.fn() },
  testCaseRepository: { findVisibleByQuestionId: jest.fn() },
}));
jest.mock('../../src/clients/runnerClient', () => ({ runCode: jest.fn() }));
jest.mock('../../src/services/userService', () => ({ requireRole: jest.fn() }));

describe('questionService.runQuestion', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.mocked(questionRepository.findById).mockResolvedValue({
      id: 2,
      createdBy: 1,
      title: 'Invierte una cadena',
      description: 'Dado un string, retorna el string invertido.',
      points: 10,
      createdAt: null,
    });
    jest.mocked(questionStarterCodeRepository.findByQuestionId).mockResolvedValue([
      { id: 1, questionId: 2, programmingLanguage: 'python', starterCode: 'def reverse_string(s):\n    pass\n' },
    ]);
    jest.mocked(testCaseRepository.findVisibleByQuestionId).mockResolvedValue(
      ['"hola"', '"abc"', '"a"'].map((word, i) => ({
        id: i + 1,
        questionId: 2,
        inputValue: `[${word}]`,
        expectedOutput: word.split('').reverse().join(''),
        isVisible: true,
      }))
    );
  });

  it('solo ejecuta los primeros casos visibles', async () => {
    jest.mocked(runCode).mockResolvedValue({ status: 'SUCCESS' });

    await runQuestion(2, 'def reverse_string(s):\n    return s[::-1]\n', 'python');

    const request = jest.mocked(runCode).mock.calls[0][0];
    expect(request.templateCode).toBe('def reverse_string(s):\n    pass\n');
    expect(request.testCases).toHaveLength(2);
  });

  it('rechaza un lenguaje sin código inicial', async () => {
    await expect(runQuestion(2, 'function reverseString() {}', 'javascript')).rejects.toMatchObject({
      status: 400,
      message: 'Language javascript is not allowed for question 2',
    });
    expect(runCode).not.toHaveBeenCalled();
  });
});
