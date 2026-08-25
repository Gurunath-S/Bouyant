import { Router } from 'express';
import { StallsController } from './stalls.controller.js';
import { authenticateToken } from '../../middlewares/auth.js';
import { requireRole } from '../../middlewares/role.js';
import { validateRequest } from '../../middlewares/validate.js';
import { asyncHandler } from '../../utils/asyncHandler.js';
import { CreateStallSchema, UpdateStallSchema, HoldStallSchema } from './stalls.schemas.js';
import { UserRole } from '@prisma/client';

const router = Router();

// Public route for viewing stalls
router.get('/floor-plan/:floorPlanId', asyncHandler(StallsController.getByFloorPlan));

// Authenticated client hold routes
router.post('/hold', authenticateToken, validateRequest(HoldStallSchema), asyncHandler(StallsController.hold));
router.delete('/hold/:stallId', authenticateToken, asyncHandler(StallsController.releaseHold));

// Admin management routes
router.post('/', authenticateToken, requireRole(UserRole.ADMIN), validateRequest(CreateStallSchema), asyncHandler(StallsController.create));
router.put('/:id', authenticateToken, requireRole(UserRole.ADMIN), validateRequest(UpdateStallSchema), asyncHandler(StallsController.update));
router.patch('/:id/block', authenticateToken, requireRole(UserRole.ADMIN), asyncHandler(StallsController.toggleBlock));

export const stallRoutes = router;
