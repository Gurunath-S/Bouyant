import { Router } from 'express';
import { PaymentsController } from './payments.controller.js';
import { authenticateToken } from '../../middlewares/auth.js';
import { requirePermission } from '../../middlewares/permission.js';
import { asyncHandler } from '../../utils/asyncHandler.js';
import { Permissions } from '../../config/permissions.js';

const router = Router();

router.post('/verify', asyncHandler(PaymentsController.verifyPayment));
router.post('/balance/:bookingId', authenticateToken, asyncHandler(PaymentsController.balancePayment));
router.use(authenticateToken);

router.get('/', requirePermission(Permissions.PAYMENT_MANAGE), asyncHandler(PaymentsController.listAll));

export const paymentRoutes = router;
