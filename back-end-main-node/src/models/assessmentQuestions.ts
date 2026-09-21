import { pgTable, serial, integer, unique } from 'drizzle-orm/pg-core';
import { assessments } from './assessments';
import { questions } from './questions';

export const assessmentQuestions = pgTable(
  'assessment_questions',
  {
    id: serial('id').primaryKey(),
    assessmentId: integer('assessment_id')
      .notNull()
      .references(() => assessments.id, { onDelete: 'cascade' }),
    questionId: integer('question_id')
      .notNull()
      .references(() => questions.id, { onDelete: 'cascade' }),
    questionOrder: integer('question_order').notNull(),
  },
  (table) => [unique().on(table.assessmentId, table.questionId)]
);
