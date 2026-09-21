import { scrypt, timingSafeEqual } from 'crypto';
import { promisify } from 'util';
import { userRepository } from '../repositories';
import { badRequest, notFound, unauthorized } from '../middleware/errorHandler';
import type { PublicUser, User, UserRole } from '../types/user';

const scryptAsync = promisify(scrypt) as (password: string, salt: string, keylen: number) => Promise<Buffer>;

export async function requireRole(id: number, role: UserRole): Promise<User> {
  const user = await userRepository.findById(id);
  if (!user) {
    throw notFound(`User ${id} not found`);
  }
  if (user.role !== role) {
    throw badRequest(`User ${id} is not a ${role}`);
  }
  return user;
}

/**
 * Valida usuario, contraseña y perfil. Responde siempre el mismo 401 para no revelar
 * cuál de los tres datos falló.
 */
export async function login(username: string, password: string, role: UserRole): Promise<PublicUser> {
  const user = await userRepository.findByUsername(username.trim().toLowerCase());
  const valid = user !== undefined && (await verifyPassword(password, user.passwordHash));
  if (!user || !valid || user.role !== role) {
    throw unauthorized('Invalid username, password or role');
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
