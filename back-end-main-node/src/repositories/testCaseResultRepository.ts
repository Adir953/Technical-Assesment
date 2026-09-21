import { eq } from 'drizzle-orm';
import type { TestCaseResult, NewTestCaseResult } from '../types/submission';
import { testCaseResults } from '../models';
import { db, type DbClient } from '../db';

export async function findByQuestionSubmission(
  questionSubmissionId: number
): Promise<TestCaseResult[]> {
  return db
    .select()
    .from(testCaseResults)
    .where(eq(testCaseResults.questionSubmissionId, questionSubmissionId));
}

export async function createMany(
  data: NewTestCaseResult[],
  client: DbClient = db
): Promise<TestCaseResult[]> {
  if (data.length === 0) {
    return [];
  }
  return client.insert(testCaseResults).values(data).returning();
}
