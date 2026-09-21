import { Request, Response, NextFunction } from 'express';
import * as userService from '../services/userService';
import { badRequest } from '../middleware/errorHandler';
import { requireString } from '../utils/validation';import type { UserRole } from '../types/user';

const ROLES: UserRole[] = ['student', 'admin'];

export async function login(req: Request, res: Response, next: NextFunction) {
  try {
    const role = req.body?.role;
    if (!ROLES.includes(role)) {
      throw badRequest(`role must be one of: ${ROLES.join(', ')}`);
    }
    const user = await userService.login(
      requireString(req.body?.username, 'username'),
      requireString(req.body?.password, 'password'),
      role
    );
    res.json(user);
  } catch (error) {
    next(error);
  }
}
