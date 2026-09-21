import { pgTable, serial, integer, timestamp } from 'drizzle-orm/pg-core';
import { users } from './users';
import { assessments } from './assessments';

export const assessmentSubmissions = pgTable('assessment_submissions', {
  id: serial('id').primaryKey(),
  studentId: integer('student_id')
    .notNull()
    .references(() => users.id),
  assessmentId: integer('assessment_id')
    .notNull()
    .references(() => assessments.id),
  finalScore: integer('final_score'),
  totalPossiblePoints: integer('total_possible_points').notNull(),
  startedAt: timestamp('started_at').defaultNow(),
  completedAt: timestamp('completed_at'),
});
