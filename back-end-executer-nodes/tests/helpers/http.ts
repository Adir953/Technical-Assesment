import type { Request, Response } from 'express';

// req/res mínimos para llamar al controlador sin levantar Express.
export function mockHttp(body: unknown = {}) {
  const res = { status: jest.fn(), json: jest.fn() };
  res.status.mockReturnValue(res);

  return {
    req: { body } as Request,
    res: res as unknown as Response,
  };
}
