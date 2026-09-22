import type { Request, Response } from 'express';

interface RequestData {
  params?: Record<string, string>;
  query?: Record<string, unknown>;
  body?: unknown;
}

// req/res/next mínimos para llamar a un controlador sin levantar Express.
export function mockHttp({ params = {}, query = {}, body = {} }: RequestData = {}) {
  const res = { status: jest.fn(), json: jest.fn() };
  res.status.mockReturnValue(res);

  return {
    req: { params, query, body } as unknown as Request,
    res: res as unknown as Response,
    next: jest.fn(),
  };
}
