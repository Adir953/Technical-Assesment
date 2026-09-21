import { pgTable, serial, integer, varchar, text, timestamp } from 'drizzle-orm/pg-core';
import { assessmentSubmissions } from './assessmentSubmissions';
import { questions } from './questions';
import type { ProgrammingLanguage } from '../types/submission';

export const questionSubmissions = pgTable('question_submissions', {
  id: serial('id').primaryKey(),
  assessmentSubmissionId: integer('assessment_submission_id')
    .notNull()
    .references(() => assessmentSubmissions.id),
  questionId: integer('question_id')
    .notNull()
    .references(() => questions.id),
  studentCode: text('student_code').notNull(),
  programmingLanguage: varchar('programming_language', { length: 50 })
    .$type<ProgrammingLanguage>()
    .notNull(),
  score: integer('score'),
  passedTests: integer('passed_tests').default(0),
  totalTests: integer('total_tests').notNull(),
  compilationError: text('compilation_error'),
  executionOutput: text('execution_output'),
  submittedAt: timestamp('submitted_at').defaultNow(),
});
