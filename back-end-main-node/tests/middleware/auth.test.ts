import type { Response } from 'express';
import jwt from 'jsonwebtoken';
import { requireAuth, SESSION_COOKIE, setSessionCookie } from '../../src/middleware/auth';
import { env } from '../../src/config/env';
import { mockHttp } from '../helpers/http';

// Firma un token real con setSessionCookie y devuelve su valor.
function tokenFor(id: number, role: 'student' | 'admin'): string {
  const res = { cookie: jest.fn() };
  setSessionCookie(res as unknown as Response, { id, role });
  return res.cookie.mock.calls[0][1];
}

describe('requireAuth', () => {
  it('deja el usuario del token en req.user', () => {
    const { req, res, next } = mockHttp({ cookies: { [SESSION_COOKIE]: tokenFor(3, 'student') } });

    requireAuth()(req, res, next);

    expect(req.user).toEqual({ id: 3, role: 'student' });
    expect(next).toHaveBeenCalledWith();
  });

  it('responde 401 sin cookie de sesión', () => {
    const { req, res, next } = mockHttp();

    requireAuth()(req, res, next);

    expect(next).toHaveBeenCalledWith(expect.objectContaining({ status: 401 }));
  });

  it('responde 401 con un token firmado con otro secreto o vencido', () => {
    const forged = jwt.sign({ role: 'admin' }, 'otro-secreto', { subject: '1' });
    const expired = jwt.sign({ role: 'admin' }, env.auth.jwtSecret, { subject: '1', expiresIn: -10 });

    for (const token of [forged, expired]) {
      const { req, res, next } = mockHttp({ cookies: { [SESSION_COOKIE]: token } });
      requireAuth()(req, res, next);
      expect(next).toHaveBeenCalledWith(expect.objectContaining({ status: 401 }));
    }
  });

  it('responde 403 si el rol no es el exigido', () => {
    const { req, res, next } = mockHttp({ cookies: { [SESSION_COOKIE]: tokenFor(3, 'student') } });

    requireAuth('admin')(req, res, next);

    expect(next).toHaveBeenCalledWith(expect.objectContaining({ status: 403 }));
  });
});
