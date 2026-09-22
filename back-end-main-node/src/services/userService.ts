import { scrypt, timingSafeEqual } from 'crypto';
import { promisify } from 'util';
import { userRepository } from '../repositories';
import { unauthorized } from '../middleware/errorHandler';
import type { PublicUser, User } from '../types/user';

const scryptAsync = promisify(scrypt) as (password: string, salt: string, keylen: number) => Promise<Buffer>;

/**
 * Valida usuario y contraseña; el rol sale de la base de datos. Responde siempre el mismo 401
 * para no revelar cuál de los dos datos falló.
 */
export async function login(username: string, password: string): Promise<PublicUser> {
  const user = await userRepository.findByUsername(username.trim().toLowerCase());
  const valid = user !== undefined && (await verifyPassword(password, user.passwordHash));
  if (!user || !valid) {
    throw unauthorized('Invalid username or password');
  }
  return toPublicUser(user);
}

/** 401 si el usuario del token ya no existe: la sesión deja de ser válida. */
export async function getPublicUser(id: number): Promise<PublicUser> {
  const user = await userRepository.findById(id);
  if (!user) {
    throw unauthorized('Session user no longer exists');
  }
  return toPublicUser(user);
}

/** Hash con formato `scrypt$<salt hex>$<hash hex>` (ver database/data.sql). */
async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const [scheme, salt, hash] = stored.split('$');
  if (scheme !== 'scrypt' || !salt || !hash) {
    return false;
  }
  const expected = Buffer.from(hash, 'hex');
  const actual = await scryptAsync(password, salt, expected.length);
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}

function toPublicUser({ id, name, username, email, role }: User): PublicUser {
  return { id, name, username, email, role };
}
