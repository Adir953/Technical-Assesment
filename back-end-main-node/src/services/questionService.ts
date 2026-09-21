import { db } from '../db';
import { questionRepository, testCaseRepository } from '../repositories';
import { runCode } from '../clients/runnerClient';
import { notFound, badRequest } from '../middleware/errorHandler';
import { requireRole } from './userService';
import type { Question, QuestionDetail, CreateQuestionInput } from '../types/question';
import type { ProgrammingLanguage } from '../types/submission';

export { type Question, type QuestionDetail, type CreateQuestionInput };

export async function listQuestions(): Promise<Question[]> {
  return questionRepository.findAll();
}

export async function getQuestion(id: number): Promise<QuestionDetail> {
  const question = await questionRepository.findById(id);
  if (!question) {
    throw notFound(`Question ${id} not found`);
  }
  const visibleCases = await testCaseRepository.findVisibleByQuestionId(id);
  return { ...question, testCases: visibleCases };
}

export async function createQuestion(input: CreateQuestionInput): Promise<QuestionDetail> {
  if (input.testCases.length === 0) {
    throw badRequest('A question needs at least one test case');
  }

  await requireRole(input.createdBy, 'admin');

  return db.transaction(async (tx) => {
    const question = await questionRepository.create(
      {
        createdBy: input.createdBy,
        title: input.title,
        description: input.description,
        points: input.points,
        starterCode: input.starterCode ?? null,
      },
      tx
    );

    const cases = await testCaseRepository.createMany(
      input.testCases.map((testCase) => ({
        questionId: question.id,
        inputValue: testCase.inputValue,
        expectedOutput: testCase.expectedOutput,
        isVisible: testCase.isVisible ?? true,
      })),
      tx
    );

    return { ...question, testCases: cases };
  });
}

export async function runQuestion(
  id: number,
  code: string,
  language: ProgrammingLanguage
) {
  const question = await getQuestion(id);
  if (question.testCases.length === 0) {
    throw badRequest(`Question ${id} has no visible test cases`);
  }

  return runCode({
    questionId: question.id,
    language,
    code,
    templateCode: question.starterCode ?? '',
    testCases: question.testCases.map((testCase) => ({
      input: testCase.inputValue,
      expectedOutput: testCase.expectedOutput,
      isVisible: true,
    })),
  });
}
