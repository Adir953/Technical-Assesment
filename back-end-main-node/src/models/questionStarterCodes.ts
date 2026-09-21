import { pgTable, serial, integer, varchar, text, unique } from 'drizzle-orm/pg-core';
import { questions } from './questions';
import type { ProgrammingLanguage } from '../types/submission';

export const questionStarterCodes = pgTable(
  'question_starter_codes',
  {
    id: serial('id').primaryKey(),
    questionId: integer('question_id')
      .notNull()
      .references(() => questions.id, { onDelete: 'cascade' }),
    programmingLanguage: varchar('programming_language', { length: 50 })
      .$type<ProgrammingLanguage>()
      .notNull(),
    starterCode: text('starter_code').notNull(),
  },
  (table) => [unique().on(table.questionId, table.programmingLanguage)]
);
