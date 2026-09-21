import type { users } from '../models/users';

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type UserRole = 'student' | 'admin';
/** Usuario sin datos sensibles, apto para responder al cliente. */
export type PublicUser = Pick<User, 'id' | 'name' | 'username' | 'email' | 'role'>;
