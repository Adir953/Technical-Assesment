import { pgTable, serial, integer, text, boolean } from 'drizzle-orm/pg-core';
import { questionSubmissions } from './questionSubmissions';
import { testCases } from './testCases';

export const testCaseResults = pgTable('test_case_results', {
  id: serial('id').primaryKey(),
  questionSubmissionId: integer('question_submission_id')
    .notNull()
    .references(() => questionSubmissions.id, { onDelete: 'cascade' }),
  testCaseId: integer('test_case_id')
    .notNull()
    .references(() => testCases.id),
  inputValue: text('input_value').notNull(),
  expectedOutput: text('expected_output').notNull(),
  actualOutput: text('actual_output'),
  isPassed: boolean('is_passed'),
  errorMessage: text('error_message'),
});
