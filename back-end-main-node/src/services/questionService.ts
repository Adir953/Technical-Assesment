import { db } from '../db';
import {
  questionRepository,
  questionStarterCodeRepository,
  testCaseRepository,
} from '../repositories';
import { runCode } from '../clients/runnerClient';
import { notFound, badRequest } from '../middleware/errorHandler';
import type {
  Question,
  QuestionDetail,
  CreateQuestionInput,
  QuestionStarterCode,
  StarterCodes,
} from '../types/question';
import type { ProgrammingLanguage } from '../types/submission';

export { type Question, type QuestionDetail, type CreateQuestionInput };

export async function listQuestions(): Promise<Question[]> {
  return questionRepository.findAll();
}

/**
 * Detalle de una pregunta para el editor. Solo incluye los casos visibles; los ocultos nunca
 * salen del backend para que el estudiante no pueda ajustar su código a ellos.
 */
export async function getQuestion(id: number): Promise<QuestionDetail> {
  const question = await questionRepository.findById(id);
  if (!question) {
    throw notFound(`Question ${id} not found`);
  }
  const [starterCodes, visibleCases] = await Promise.all([
    questionStarterCodeRepository.findByQuestionId(id),
    testCaseRepository.findVisibleByQuestionId(id),
  ]);
  return { ...question, starterCodes: toStarterCodes(starterCodes), testCases: visibleCases };
}

/**
 * Crea la pregunta con su código inicial y sus casos de prueba en una transacción.
 * Los lenguajes que traen código inicial son los únicos permitidos para resolverla.
 */
export async function createQuestion(input: CreateQuestionInput): Promise<QuestionDetail> {
  if (input.testCases.length === 0) {
    throw badRequest('A question needs at least one test case');
  }
  const languages = Object.keys(input.starterCodes) as ProgrammingLanguage[];
  if (languages.length === 0) {
    throw badRequest('A question needs starter code for at least one language');
  }

  return db.transaction(async (tx) => {
    const question = await questionRepository.create(
      {
        createdBy: input.createdBy,
        title: input.title,
        description: input.description,
        points: input.points,
      },
      tx
    );

    const starterCodes = await questionStarterCodeRepository.createMany(
      languages.map((language) => ({
        questionId: question.id,
        programmingLanguage: language,
        starterCode: input.starterCodes[language]!,
      })),
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

    return { ...question, starterCodes: toStarterCodes(starterCodes), testCases: cases };
  });
}

// "Ejecutar" es una prueba rápida: corre solo los primeros casos de ejemplo (visibles) y no
// persiste nada. La calificación con todos los casos ocurre al enviar la respuesta.
const MAX_RUN_CASES = 2;

export async function runQuestion(id: number, code: string, language: ProgrammingLanguage) {
  const question = await getQuestion(id);
  const starterCode = question.starterCodes[language];
  if (!starterCode) {
    throw badRequest(`Language ${language} is not allowed for question ${id}`);
  }
  if (question.testCases.length === 0) {
    throw badRequest(`Question ${id} has no visible test cases`);
  }

  return runCode({
    questionId: question.id,
    language,
    code,
    templateCode: starterCode,
    testCases: question.testCases.slice(0, MAX_RUN_CASES).map((testCase) => ({
      input: testCase.inputValue,
      expectedOutput: testCase.expectedOutput,
      isVisible: true,
    })),
  });
}

/**
 * Código inicial de la pregunta en ese lenguaje. El runner lo usa para saber qué función
 * llamar; si no existe, el lenguaje no está permitido (400).
 */
export async function requireStarterCode(
  questionId: number,
  language: ProgrammingLanguage
): Promise<string> {
  const starterCode = await questionStarterCodeRepository.findByQuestionAndLanguage(
    questionId,
    language
  );
  if (!starterCode) {
    throw badRequest(`Language ${language} is not allowed for question ${questionId}`);
  }
  return starterCode.starterCode;
}

function toStarterCodes(rows: QuestionStarterCode[]): StarterCodes {
  return Object.fromEntries(rows.map((row) => [row.programmingLanguage, row.starterCode]));
}
