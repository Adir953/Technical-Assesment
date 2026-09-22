import { desc, eq } from 'drizzle-orm';
import { questionSubmissions } from '../models';
import { questions } from '../models';
import type { QuestionSubmission, NewQuestionSubmission } from '../types/submission';
import type { Question } from '../types/question';

import { db, type DbClient } from '../db';

/**
 * Envíos de un intento con su pregunta, del más reciente al más antiguo. El cálculo del puntaje
 * final y el front dependen de este orden para quedarse con el último envío de cada pregunta.
 */
export async function findByAssessmentSubmission(
  assessmentSubmissionId: number
): Promise<(QuestionSubmission & { question: Question })[]> {
  const rows = await db
    .select({ submission: questionSubmissions, question: questions })
    .from(questionSubmissions)
    .innerJoin(questions, eq(questionSubmissions.questionId, questions.id))
    .where(eq(questionSubmissions.assessmentSubmissionId, assessmentSubmissionId))
    .orderBy(desc(questionSubmissions.submittedAt), desc(questionSubmissions.id));

  return rows.map((row) => ({ ...row.submission, question: row.question }));
}

export async function create(
  data: NewQuestionSubmission,
  client: DbClient = db
): Promise<QuestionSubmission> {
  const [submission] = await client.insert(questionSubmissions).values(data).returning();
  return submission;
}
