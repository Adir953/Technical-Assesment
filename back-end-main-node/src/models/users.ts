import { pgTable, serial, varchar, timestamp } from 'drizzle-orm/pg-core';
import type { UserRole } from '../types/user';

export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  name: varchar('name', { length: 255 }).notNull(),
  username: varchar('username', { length: 50 }).unique(),
  email: varchar('email', { length: 255 }).notNull().unique(),
  passwordHash: varchar('password_hash', { length: 255 }).notNull(),
  role: varchar('role', { length: 20 }).$type<UserRole>().notNull().default('student'),
  createdAt: timestamp('created_at').defaultNow(),
});
