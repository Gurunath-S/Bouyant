import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from './auth.js';
import { ApiError } from '../utils/apiError.js';
import { Permission, hasUserPermission } from '../config/permissions.js';

export const requirePermission = (...permissions: Permission[]) => {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return next(ApiError.unauthorized('Authentication token missing or invalid.'));
    }

    const isAuthorized = permissions.some((p) => hasUserPermission(req.user, p));

    if (!isAuthorized) {
      return next(
        ApiError.forbidden(
          `Forbidden: Role '${req.user.role}' lacks required permission(s): ${permissions.join(', ')}`
        )
      );
    }

    next();
  };
};

export const requireAllPermissions = (...permissions: Permission[]) => {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return next(ApiError.unauthorized('Authentication token missing or invalid.'));
    }

    const isAuthorized = permissions.every((p) => hasUserPermission(req.user, p));

    if (!isAuthorized) {
      return next(
        ApiError.forbidden(
          `Forbidden: Role '${req.user.role}' lacks required permissions: ${permissions.join(', ')}`
        )
      );
    }

    next();
  };
};
