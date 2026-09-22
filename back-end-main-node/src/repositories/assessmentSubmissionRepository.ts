import { and, desc, eq, isNull, sql } from 'drizzle-orm';
import { assessments, assessmentSubmissions } from '../models';
import type { AssessmentSubmission, NewAssessmentSubmission } from '../types/submission';

import { db, type DbClient } from '../db';

export async function findById(id: number): Promise<AssessmentSubmission | undefined> {
  const [submission] = await db
    .select()
    .from(assessmentSubmissions)
    .where(eq(assessmentSubmissions.id, id));
  return submission;
}

/** Intentos de un estudiante, del más reciente al más antiguo. */
export async function findByStudent(studentId: number): Promise<AssessmentSubmission[]> {
  return db
    .select()
    .from(assessmentSubmissions)
    .where(eq(assessmentSubmissions.studentId, studentId))
    .orderBy(desc(assessmentSubmissions.startedAt), desc(assessmentSubmissions.id));
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

/**
 * Si ya pasó el tiempo límite del intento (más `graceSeconds`). Compara con el reloj de
 * PostgreSQL, el mismo que fijó `started_at`, así no influyen el reloj ni la zona horaria del
 * cliente o del contenedor de la API.
 */
export async function isPastDeadline(id: number, graceSeconds: number): Promise<boolean> {
  const [row] = await db
    .select({
      expired: sql<boolean>`LOCALTIMESTAMP > ${assessmentSubmissions.startedAt}
        + make_interval(mins => ${assessments.durationMinutes}, secs => ${graceSeconds})`,
    })
    .from(assessmentSubmissions)
    .innerJoin(assessments, eq(assessments.id, assessmentSubmissions.assessmentId))
    .where(eq(assessmentSubmissions.id, id));
  return row?.expired ?? false;
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
