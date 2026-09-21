import { Router } from 'express';
import { FloorPlansController } from './floor-plans.controller.js';
import { authenticateToken } from '../../middlewares/auth.js';
import { requirePermission } from '../../middlewares/permission.js';
import { asyncHandler } from '../../utils/asyncHandler.js';
import { Permissions } from '../../config/permissions.js';

const router = Router();

router.get('/:id', asyncHandler(FloorPlansController.getById));

router.put(
  '/:id',
  authenticateToken,
  requirePermission(Permissions.FLOORPLAN_MANAGE),
  asyncHandler(FloorPlansController.update)
);

router.post(
  '/:id/sync',
  authenticateToken,
  requirePermission(Permissions.FLOORPLAN_MANAGE),
  asyncHandler(FloorPlansController.sync)
);

router.put(
  '/:id/sync',
  authenticateToken,
  requirePermission(Permissions.FLOORPLAN_MANAGE),
  asyncHandler(FloorPlansController.sync)
);

export const floorPlanRoutes = router;
