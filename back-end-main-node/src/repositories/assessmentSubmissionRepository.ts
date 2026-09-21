import { and, eq, isNull, sql } from 'drizzle-orm';
import { assessmentSubmissions } from '../models';
import type { AssessmentSubmission, NewAssessmentSubmission } from '../types/submission';

import { db, type DbClient } from '../db';

export async function findById(id: number): Promise<AssessmentSubmission | undefined> {
  const [submission] = await db
    .select()
    .from(assessmentSubmissions)
    .where(eq(assessmentSubmissions.id, id));
  return submission;
}

export async function findInProgress(
  studentId: number,
  assessmentId: number
): Promise<AssessmentSubmission | undefined> {
  const [submission] = await db
    .select()
    .from(assessmentSubmissions)
    .where(
      and(
        eq(assessmentSubmissions.studentId, studentId),
        eq(assessmentSubmissions.assessmentId, assessmentId),
        isNull(assessmentSubmissions.completedAt)
      )
    );
  return submission;
}

export async function create(
  data: NewAssessmentSubmission,
  client: DbClient = db
): Promise<AssessmentSubmission> {
  const [submission] = await client.insert(assessmentSubmissions).values(data).returning();
  return submission;
}

export async function complete(
  id: number,
  finalScore: number,
  client: DbClient = db
): Promise<AssessmentSubmission> {
  const [submission] = await client
    .update(assessmentSubmissions)
    .set({ finalScore, completedAt: sql`CURRENT_TIMESTAMP` })
    .where(eq(assessmentSubmissions.id, id))
    .returning();
  return submission;
}
