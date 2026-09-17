import { Request, Response, NextFunction, RequestHandler } from 'express';
import { logger } from '../config/logger';

/**
 * Custom error class
 */
export class ApiError extends Error {
  statusCode: number;
  isOperational: boolean;

  constructor(statusCode: number, message: string, isOperational = true) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = isOperational;
    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * Error handling middleware
 */
export const errorHandler = (
  err: Error | ApiError,
  req: Request,
  res: Response,
  _next: NextFunction
) => {
  let statusCode = 500;
  let message = 'Internal server error';

  if (err instanceof ApiError) {
    statusCode = err.statusCode;
    message = err.message;
  } else if (err.message === 'Invalid credentials' || err.message === 'Invalid email or password') {
    statusCode = 401;
    message = 'Invalid email or password';
  } else if (err.message === 'User already exists') {
    statusCode = 409;
    message = err.message;
  } else if (err.name === 'ValidationError') {
    statusCode = 400;
    message = err.message;
  } else if (err.name === 'UnauthorizedError') {
    statusCode = 401;
    message = 'Unauthorized';
  }

  // Log error
  logger.error('Error:', {
    statusCode,
    message: err.message,
    stack: err.stack,
    url: req.url,
    method: req.method,
    ip: req.ip,
  });

  // Send error response
  const response: any = {
    success: false,
    error: message,
  };

  // Include stack trace in development
  if (process.env.NODE_ENV === 'development') {
    response.stack = err.stack;
  }

  res.status(statusCode).json(response);
};

/**
 * 404 handler
 */
export const notFoundHandler = (
  req: Request,
  _res: Response,
  next: NextFunction
) => {
  const error = new ApiError(404, `Route not found: ${req.originalUrl}`);
  next(error);
};

/**
 * Async handler wrapper
 */
export const asyncHandler = (
  fn: (req: Request, res: Response, next: NextFunction) => Promise<unknown>
): RequestHandler => {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};
