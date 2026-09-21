import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from './auth.js';
import { ApiError } from '../utils/apiError.js';
import { Permission, hasPermission, hasAnyPermission } from '../config/permissions.js';

export const requirePermission = (...permissions: Permission[]) => {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return next(ApiError.unauthorized('Authentication token missing or invalid.'));
    }

    const userRole = req.user.role;
    const isAuthorized = permissions.length === 1
      ? hasPermission(userRole, permissions[0])
      : hasAnyPermission(userRole, permissions);

    if (!isAuthorized) {
      return next(
        ApiError.forbidden(
          `Forbidden: Role '${userRole}' lacks required permission(s): ${permissions.join(', ')}`
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

    const userRole = req.user.role;
    const isAuthorized = permissions.every((p) => hasPermission(userRole, p));

    if (!isAuthorized) {
      return next(
        ApiError.forbidden(
          `Forbidden: Role '${userRole}' lacks required permissions: ${permissions.join(', ')}`
        )
      );
    }

    next();
  };
};
