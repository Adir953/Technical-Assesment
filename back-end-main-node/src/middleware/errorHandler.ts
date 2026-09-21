import { Request, Response, NextFunction } from 'express';

export class AppError extends Error {
  constructor(
    message: string,
    public readonly status: number
  ) {
    super(message);
    this.name = 'AppError';
  }
}

export const notFound = (message: string) => new AppError(message, 404);
export const badRequest = (message: string) => new AppError(message, 400);
export const conflict = (message: string) => new AppError(message, 409);
export const unauthorized = (message: string) => new AppError(message, 401);
interface ApiError extends Error {
  status?: number;
}

export const errorHandler = (
  err: ApiError,
  _req: Request,
  res: Response,
  _next: NextFunction
) => {
  const status = err.status ?? 500;

  if (status >= 500) {
    console.error(err);
  }

  res.status(status).json({
    error: {
      status,
      message: err.message || 'Internal Server Error',
      timestamp: new Date().toISOString(),
    },
  });
};
