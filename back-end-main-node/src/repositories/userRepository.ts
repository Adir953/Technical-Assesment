import { eq } from 'drizzle-orm';
import { db } from '../db';
import { users } from '../models';
import type { User } from '../types/user';


export async function findById(id: number): Promise<User | undefined> {
  const [user] = await db.select().from(users).where(eq(users.id, id));
  return user;
}

export async function findByUsername(username: string): Promise<User | undefined> {
  const [user] = await db.select().from(users).where(eq(users.username, username));
  return user;
}
