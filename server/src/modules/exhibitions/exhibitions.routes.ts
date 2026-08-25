import { Router } from 'express';
import { ExhibitionsController } from './exhibitions.controller.js';
import { authenticateToken } from '../../middlewares/auth.js';
import { requireRole } from '../../middlewares/role.js';
import { validateRequest } from '../../middlewares/validate.js';
import { asyncHandler } from '../../utils/asyncHandler.js';
import { CreateExhibitionSchema, UpdateExhibitionSchema } from './exhibitions.schemas.js';
import { UserRole } from '@prisma/client';

const router = Router();

// Public routes
router.get('/', asyncHandler(ExhibitionsController.list));
router.get('/:idOrSlug', asyncHandler(ExhibitionsController.getBySlug));

// Admin routes
router.post('/', authenticateToken, requireRole(UserRole.ADMIN), validateRequest(CreateExhibitionSchema), asyncHandler(ExhibitionsController.create));
router.put('/:id', authenticateToken, requireRole(UserRole.ADMIN), validateRequest(UpdateExhibitionSchema), asyncHandler(ExhibitionsController.update));

export const exhibitionRoutes = router;
