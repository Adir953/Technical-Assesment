import { pgTable, serial, integer, text, boolean } from 'drizzle-orm/pg-core';
import { questions } from './questions';

export const testCases = pgTable('test_cases', {
  id: serial('id').primaryKey(),
  questionId: integer('question_id')
    .notNull()
    .references(() => questions.id, { onDelete: 'cascade' }),
  inputValue: text('input_value').notNull(),
  expectedOutput: text('expected_output').notNull(),
  isVisible: boolean('is_visible').default(true),
});
