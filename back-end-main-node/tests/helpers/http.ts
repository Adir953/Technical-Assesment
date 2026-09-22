import type { Request, Response } from 'express';
import type { AuthUser } from '../../src/types/user';

interface RequestData {
  params?: Record<string, string>;
  query?: Record<string, unknown>;
  body?: unknown;
  user?: AuthUser;
  cookies?: Record<string, string>;
}

// req/res/next mínimos para llamar a un controlador sin levantar Express.
export function mockHttp({ params = {}, query = {}, body = {}, user, cookies = {} }: RequestData = {}) {
  const res = { status: jest.fn(), json: jest.fn(), cookie: jest.fn(), clearCookie: jest.fn(), end: jest.fn() };
  res.status.mockReturnValue(res);

  return {
    req: { params, query, body, user, cookies } as unknown as Request,
    res: res as unknown as Response,
    next: jest.fn(),
  };
}
