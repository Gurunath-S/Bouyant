import { Router } from 'express';
import { PaymentsController } from './payments.controller.js';
import { authenticateToken } from '../../middlewares/auth.js';
import { requirePermission } from '../../middlewares/permission.js';
import { asyncHandler } from '../../utils/asyncHandler.js';
import { Permissions } from '../../config/permissions.js';

const router = Router();

router.post('/verify', asyncHandler(PaymentsController.verifyPayment));
router.post('/webhook', asyncHandler(PaymentsController.handleWebhook));
router.post('/balance/:bookingId', authenticateToken, asyncHandler(PaymentsController.balancePayment));
router.use(authenticateToken);

router.get('/', requirePermission(Permissions.PAYMENT_MANAGE), asyncHandler(PaymentsController.listAll));
router.delete('/:id', requirePermission(Permissions.PAYMENT_DELETE), asyncHandler(PaymentsController.delete));

export const paymentRoutes = router;

