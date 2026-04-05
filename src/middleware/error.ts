import type { NextFunction, Request, Response } from "express";

export class AppError extends Error {
  status: number;

  constructor(message: string, status = 400) {
    super(message);
    this.status = status;
  }
}

export const errorHandler = (
  err: Error,
  _req: Request,
  res: Response,
  _next: NextFunction
) => {
  const status = err instanceof AppError ? err.status : 500;
  const message = err instanceof AppError ? err.message : "Internal server error";

  return res.status(status).json({
    success: false,
    error: message
  });
};