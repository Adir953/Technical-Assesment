import { Request, Response, NextFunction } from 'express';

/** Error de negocio con su código HTTP. Los servicios lanzan estos y el errorHandler los responde. */
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
export const forbidden = (message: string) => new AppError(message, 403);

interface ApiError extends Error {
  status?: number;
}

/**
 * Último middleware de Express. Responde todos los errores con el formato
 * `{ error: { status, message, timestamp } }`; lo que no sea AppError sale como 500 y se registra.
 */
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
