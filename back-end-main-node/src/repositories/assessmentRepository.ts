import { desc, eq } from 'drizzle-orm';
import { assessments } from '../models';
import type { Assessment, NewAssessment } from '../types/assessment';

import { db, type DbClient } from '../db';

export async function findAll(): Promise<Assessment[]> {
  return db.select().from(assessments).orderBy(desc(assessments.createdAt));
}

export async function findById(id: number): Promise<Assessment | undefined> {
  const [assessment] = await db.select().from(assessments).where(eq(assessments.id, id));
  return assessment;
}

export async function create(
  data: NewAssessment,
  client: DbClient = db
): Promise<Assessment> {
  const [assessment] = await client.insert(assessments).values(data).returning();
  return assessment;
}
