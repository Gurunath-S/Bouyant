import { Router } from 'express';
import { UsersController } from './users.controller.js';
import { authenticateToken } from '../../middlewares/auth.js';
import { requirePermission } from '../../middlewares/permission.js';
import { validateRequest } from '../../middlewares/validate.js';
import { asyncHandler } from '../../utils/asyncHandler.js';
import { Permissions } from '../../config/permissions.js';
import {
  CreateAdminSchema,
  CreateStaffSchema,
  UpdateUserSchema,
  ToggleUserStatusSchema,
  ResetPasswordSchema,
} from './users.schemas.js';

const router = Router();

// All user management routes require valid authentication
router.use(authenticateToken);

router.get(
  '/',
  requirePermission(Permissions.USER_VIEW),
  asyncHandler(UsersController.list)
);

router.get(
  '/:id',
  requirePermission(Permissions.USER_VIEW),
  asyncHandler(UsersController.getById)
);

router.post(
  '/admin',
  requirePermission(Permissions.USER_CREATE_ADMIN),
  validateRequest(CreateAdminSchema),
  asyncHandler(UsersController.createAdmin)
);

router.post(
  '/staff',
  requirePermission(Permissions.USER_CREATE_STAFF),
  validateRequest(CreateStaffSchema),
  asyncHandler(UsersController.createStaff)
);

router.put(
  '/:id',
  requirePermission(Permissions.USER_MANAGE_ADMIN, Permissions.USER_MANAGE_STAFF),
  validateRequest(UpdateUserSchema),
  asyncHandler(UsersController.update)
);

router.patch(
  '/:id/status',
  requirePermission(Permissions.USER_STATUS_TOGGLE),
  validateRequest(ToggleUserStatusSchema),
  asyncHandler(UsersController.toggleStatus)
);

router.post(
  '/:id/reset-password',
  requirePermission(Permissions.USER_RESET_PASSWORD),
  validateRequest(ResetPasswordSchema),
  asyncHandler(UsersController.resetPassword)
);

export const userRoutes = router;
