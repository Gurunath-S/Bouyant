import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from './auth.js';
import { ApiError } from '../utils/apiError.js';
import { UserRole } from '@prisma/client';

export const requireRole = (...roles: UserRole[]) => {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return next(ApiError.unauthorized('Authentication token missing or invalid.'));
    }

    const userRole = req.user.role as UserRole;

    // Platform SUPERADMIN has platform-wide authority over any ADMIN or STAFF route
    if (userRole === UserRole.SUPERADMIN) {
      return next();
    }

    if (!roles.includes(userRole)) {
      return next(
        ApiError.forbidden(`Access restricted to roles: ${roles.join(', ')}`)
      );
    }

    next();
  };
};
