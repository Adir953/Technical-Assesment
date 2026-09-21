import { pgTable, serial, varchar, text, integer, timestamp } from 'drizzle-orm/pg-core';
import { users } from './users';

export const questions = pgTable('questions', {
  id: serial('id').primaryKey(),
  createdBy: integer('created_by')
    .notNull()
    .references(() => users.id),
  title: varchar('title', { length: 255 }).notNull(),
  description: text('description').notNull(),
  points: integer('points').notNull(),
  starterCode: text('starter_code'),
  createdAt: timestamp('created_at').defaultNow(),
});
