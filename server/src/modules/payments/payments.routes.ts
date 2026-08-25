import { Router } from 'express';
import { PaymentsController } from './payments.controller.js';
import { authenticateToken } from '../../middlewares/auth.js';
import { requireRole } from '../../middlewares/role.js';
import { asyncHandler } from '../../utils/asyncHandler.js';
import { UserRole } from '@prisma/client';

const router = Router();

router.use(authenticateToken);

router.post('/verify', asyncHandler(PaymentsController.verifyPayment));
router.get('/', requireRole(UserRole.ADMIN), asyncHandler(PaymentsController.listAll));

export const paymentRoutes = router;
