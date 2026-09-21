import { eq, and, asc, sql } from 'drizzle-orm';
import { assessmentQuestions } from '../models';
import { questions } from '../models';
import type { AssessmentQuestion, NewAssessmentQuestion } from '../types/assessment';
import type { Question } from '../types/question';

import { db, type DbClient } from '../db';

export type OrderedQuestion = Question & { questionOrder: number };

export async function findQuestionsByAssessment(
  assessmentId: number
): Promise<OrderedQuestion[]> {
  const rows = await db
    .select({ question: questions, questionOrder: assessmentQuestions.questionOrder })
    .from(assessmentQuestions)
    .innerJoin(questions, eq(assessmentQuestions.questionId, questions.id))
    .where(eq(assessmentQuestions.assessmentId, assessmentId))
    .orderBy(asc(assessmentQuestions.questionOrder));

  return rows.map((row) => ({ ...row.question, questionOrder: row.questionOrder }));
}

export async function sumQuestionPoints(assessmentId: number): Promise<number> {
  const [row] = await db
    .select({ total: sql<number>`COALESCE(SUM(${questions.points}), 0)::int` })
    .from(assessmentQuestions)
    .innerJoin(questions, eq(assessmentQuestions.questionId, questions.id))
    .where(eq(assessmentQuestions.assessmentId, assessmentId));

  return row?.total ?? 0;
}

export async function isQuestionInAssessment(
  assessmentId: number,
  questionId: number
): Promise<boolean> {
  const [row] = await db
    .select({ id: assessmentQuestions.id })
    .from(assessmentQuestions)
    .where(
      and(
        eq(assessmentQuestions.assessmentId, assessmentId),
        eq(assessmentQuestions.questionId, questionId)
      )
    );

  return row !== undefined;
}

export async function linkMany(
  data: NewAssessmentQuestion[],
  client: DbClient = db
): Promise<AssessmentQuestion[]> {
  if (data.length === 0) {
    return [];
  }
  return client.insert(assessmentQuestions).values(data).returning();
}
