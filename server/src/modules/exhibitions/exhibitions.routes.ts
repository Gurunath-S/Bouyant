import { Router } from 'express';
import { ExhibitionsController } from './exhibitions.controller.js';
import { authenticateToken } from '../../middlewares/auth.js';
import { requirePermission } from '../../middlewares/permission.js';
import { validateRequest } from '../../middlewares/validate.js';
import { asyncHandler } from '../../utils/asyncHandler.js';
import { CreateExhibitionSchema, UpdateExhibitionSchema } from './exhibitions.schemas.js';
import { Permissions } from '../../config/permissions.js';

const router = Router();

// Public routes
router.get('/', asyncHandler(ExhibitionsController.list));
router.get('/:idOrSlug', asyncHandler(ExhibitionsController.getBySlug));

// Protected Exhibition Management
router.post(
  '/',
  authenticateToken,
  requirePermission(Permissions.EVENT_CREATE),
  validateRequest(CreateExhibitionSchema),
  asyncHandler(ExhibitionsController.create)
);

router.put(
  '/:id',
  authenticateToken,
  requirePermission(Permissions.EVENT_MANAGE),
  validateRequest(UpdateExhibitionSchema),
  asyncHandler(ExhibitionsController.update)
);

router.delete(
  '/:id',
  authenticateToken,
  requirePermission(Permissions.EVENT_DELETE),
  asyncHandler(ExhibitionsController.delete)
);

export const exhibitionRoutes = router;
