import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from './auth.js';
import { ApiError } from '../utils/apiError.js';
import { UserRole } from '@prisma/client';

export const requireRole = (...roles: UserRole[]) => {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return next(ApiError.unauthorized());
    }

    if (!roles.includes(req.user.role as UserRole)) {
      return next(
        ApiError.forbidden(`Access restricted to roles: ${roles.join(', ')}`)
      );
    }

    next();
  };
};
