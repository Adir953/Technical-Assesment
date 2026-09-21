import { asc, eq, and } from 'drizzle-orm';
import type { TestCase, NewTestCase } from '../types/question';
import { testCases } from '../models';
import { db, type DbClient } from '../db';

export async function findByQuestionId(questionId: number): Promise<TestCase[]> {
  return db.select().from(testCases).where(eq(testCases.questionId, questionId));
}

export async function findVisibleByQuestionId(questionId: number): Promise<TestCase[]> {
  return db
    .select()
    .from(testCases)
    .where(and(eq(testCases.questionId, questionId), eq(testCases.isVisible, true)))
    .orderBy(asc(testCases.id));
}

export async function createMany(
  data: NewTestCase[],
  client: DbClient = db
): Promise<TestCase[]> {
  if (data.length === 0) {
    return [];
  }
  return client.insert(testCases).values(data).returning();
}
