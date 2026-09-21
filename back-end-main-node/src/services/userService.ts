import { userRepository } from '../repositories';
import { badRequest, notFound } from '../middleware/errorHandler';
import type { User, UserRole } from '../types/user';

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
