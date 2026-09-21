import { and, eq } from 'drizzle-orm';
import { questionStarterCodes } from '../models';
import type { QuestionStarterCode, NewQuestionStarterCode } from '../types/question';
import type { ProgrammingLanguage } from '../types/submission';

import { db, type DbClient } from '../db';

export async function findByQuestionId(questionId: number): Promise<QuestionStarterCode[]> {
  return db
    .select()
    .from(questionStarterCodes)
    .where(eq(questionStarterCodes.questionId, questionId));
}

export async function findByQuestionAndLanguage(
  questionId: number,
  language: ProgrammingLanguage
): Promise<QuestionStarterCode | undefined> {
  const [starterCode] = await db
    .select()
    .from(questionStarterCodes)
    .where(
      and(
        eq(questionStarterCodes.questionId, questionId),
        eq(questionStarterCodes.programmingLanguage, language)
      )
    );
  return starterCode;
}

export async function createMany(
  data: NewQuestionStarterCode[],
  client: DbClient = db
): Promise<QuestionStarterCode[]> {
  if (data.length === 0) {
    return [];
  }
  return client.insert(questionStarterCodes).values(data).returning();
}
