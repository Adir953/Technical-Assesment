import { Request, Response, NextFunction } from 'express';
import * as userService from '../services/userService';
import { clearSessionCookie, setSessionCookie } from '../middleware/auth';
import { requireString } from '../utils/validation';

export async function login(req: Request, res: Response, next: NextFunction) {
  try {
    const user = await userService.login(
      requireString(req.body?.username, 'username'),
      requireString(req.body?.password, 'password')
    );
    setSessionCookie(res, user);
    res.json(user);
  } catch (error) {
    next(error);
  }
}

/** Usuario de la sesión actual; el front lo consulta al arrancar para restaurar la sesión. */
export async function me(req: Request, res: Response, next: NextFunction) {
  try {
    res.json(await userService.getPublicUser(req.user!.id));
  } catch (error) {
    next(error);
  }
}

export function logout(_req: Request, res: Response) {
  clearSessionCookie(res);
  res.status(204).end();
}
