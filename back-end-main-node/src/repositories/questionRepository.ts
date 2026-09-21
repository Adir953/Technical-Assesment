import { desc, eq, inArray } from 'drizzle-orm';
import { questions } from '../models';
import type { Question, NewQuestion } from '../types/question';

import { db, type DbClient } from '../db';

export async function findAll(): Promise<Question[]> {
  return db.select().from(questions).orderBy(desc(questions.createdAt));
}

export async function findById(id: number): Promise<Question | undefined> {
  const [question] = await db.select().from(questions).where(eq(questions.id, id));
  return question;
}

export async function findByIds(ids: number[]): Promise<Question[]> {
  if (ids.length === 0) {
    return [];
  }
  return db.select().from(questions).where(inArray(questions.id, ids));
}

export async function create(data: NewQuestion, client: DbClient = db): Promise<Question> {
  const [question] = await client.insert(questions).values(data).returning();
  return question;
}
