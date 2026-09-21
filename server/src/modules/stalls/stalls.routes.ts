import { Router } from 'express';
import { StallsController } from './stalls.controller.js';
import { authenticateToken } from '../../middlewares/auth.js';
import { requirePermission } from '../../middlewares/permission.js';
import { validateRequest } from '../../middlewares/validate.js';
import { asyncHandler } from '../../utils/asyncHandler.js';
import { CreateStallSchema, UpdateStallSchema, HoldStallSchema } from './stalls.schemas.js';
import { Permissions } from '../../config/permissions.js';

const router = Router();

// Public route for viewing stalls
router.get('/floor-plan/:floorPlanId', asyncHandler(StallsController.getByFloorPlan));

// Authenticated client hold routes
router.post('/hold', authenticateToken, validateRequest(HoldStallSchema), asyncHandler(StallsController.hold));
router.delete('/hold/:stallId', authenticateToken, asyncHandler(StallsController.releaseHold));

// Stall management routes (restricted to Super Admin and Admin)
router.post(
  '/',
  authenticateToken,
  requirePermission(Permissions.STALL_MANAGE),
  validateRequest(CreateStallSchema),
  asyncHandler(StallsController.create)
);

router.put(
  '/:id',
  authenticateToken,
  requirePermission(Permissions.STALL_MANAGE),
  validateRequest(UpdateStallSchema),
  asyncHandler(StallsController.update)
);

router.patch(
  '/:id/block',
  authenticateToken,
  requirePermission(Permissions.STALL_MANAGE),
  asyncHandler(StallsController.toggleBlock)
);

export const stallRoutes = router;
