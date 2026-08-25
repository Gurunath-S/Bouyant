import { Request, Response, NextFunction } from 'express';
import { ApiError } from '../utils/apiError.js';
import { env } from '../config/env.js';

export const errorHandler = (
  err: any,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  let statusCode = err.statusCode || 500;
  let message = err.message || 'Internal Server Error';
  let errors = err.errors || [];

  // Prisma Unique Constraint Error (P2002)
  if (err.code === 'P2002') {
    statusCode = 409;
    const target = err.meta?.target ? ` (${(err.meta.target as string[]).join(', ')})` : '';
    message = `A record with this information already exists${target}.`;
  }

  // Prisma Record Not Found (P2025)
  if (err.code === 'P2025') {
    statusCode = 404;
    message = 'Requested record was not found.';
  }

  // Log non-operational internal errors
  if (statusCode === 500) {
    console.error('💥 UNHANDLED SERVER ERROR:', err);
  }

  return res.status(statusCode).json({
    success: false,
    message,
    errors,
    ...(env.NODE_ENV === 'development' ? { stack: err.stack } : {}),
  });
};
