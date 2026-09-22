import type { users } from '../models/users';

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type UserRole = 'student' | 'admin';
/** Usuario sin datos sensibles, apto para responder al cliente. */
export type PublicUser = Pick<User, 'id' | 'name' | 'username' | 'email' | 'role'>;
/** Lo que viaja dentro del JWT y queda en `req.user` tras pasar por `requireAuth`. */
export interface AuthUser {
  id: number;
  role: UserRole;
}

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: AuthUser;
    }
  }
}
