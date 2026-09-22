import { Request, Response, NextFunction, CookieOptions } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '../config/env';
import { forbidden, unauthorized } from './errorHandler';
import type { AuthUser, UserRole } from '../types/user';

export const SESSION_COOKIE = 'tap_session';

// httpOnly: el JavaScript del navegador no puede leer el token. sameSite strict: el navegador no
// lo envía en peticiones que se originan en otro sitio (protege contra CSRF).
const cookieOptions: CookieOptions = {
  httpOnly: true,
  sameSite: 'strict',
  secure: env.nodeEnv === 'production',
  path: '/api',
};

/** Firma el JWT y lo deja en la cookie de sesión. */
export function setSessionCookie(res: Response, user: AuthUser) {
  const token = jwt.sign({ role: user.role }, env.auth.jwtSecret, {
    subject: String(user.id),
    expiresIn: `${env.auth.sessionHours}h`,
  });
  res.cookie(SESSION_COOKIE, token, { ...cookieOptions, maxAge: env.auth.sessionHours * 3600_000 });
}

export function clearSessionCookie(res: Response) {
  res.clearCookie(SESSION_COOKIE, cookieOptions);
}

/**
 * Exige una sesión válida (y el rol indicado, si se pasa). Deja en `req.user` el id y el rol
 * del token: los controladores los usan en lugar de confiar en ids enviados por el cliente.
 */
export function requireAuth(role?: UserRole) {
  return (req: Request, _res: Response, next: NextFunction) => {
    const token: unknown = req.cookies?.[SESSION_COOKIE];
    if (typeof token !== 'string') {
      return next(unauthorized('Not authenticated'));
    }

    let payload: jwt.JwtPayload;
    try {
      payload = jwt.verify(token, env.auth.jwtSecret) as jwt.JwtPayload;
    } catch {
      return next(unauthorized('Session expired or invalid'));
    }

    req.user = { id: Number(payload.sub), role: payload.role };
    if (role && req.user.role !== role) {
      return next(forbidden(`Only ${role} users can do this`));
    }
    next();
  };
}
