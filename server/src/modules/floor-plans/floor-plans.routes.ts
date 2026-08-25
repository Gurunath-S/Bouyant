import { Router } from 'express';
import { FloorPlansController } from './floor-plans.controller.js';
import { authenticateToken } from '../../middlewares/auth.js';
import { requireRole } from '../../middlewares/role.js';
import { asyncHandler } from '../../utils/asyncHandler.js';
import { UserRole } from '@prisma/client';

const router = Router();

router.get('/:id', asyncHandler(FloorPlansController.getById));
router.put('/:id', authenticateToken, requireRole(UserRole.ADMIN), asyncHandler(FloorPlansController.update));

export const floorPlanRoutes = router;
