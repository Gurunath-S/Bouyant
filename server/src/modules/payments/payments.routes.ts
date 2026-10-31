import { Router } from 'express';
import { PaymentsController } from './payments.controller.js';
import { authenticateToken } from '../../middlewares/auth.js';
import { requirePermission } from '../../middlewares/permission.js';
import { asyncHandler } from '../../utils/asyncHandler.js';
import { Permissions } from '../../config/permissions.js';
import { CashPaymentSchema } from './payment.schema.js';
import { validateRequest } from '../../middlewares/validate.js';

const router = Router();

router.post('/verify', asyncHandler(PaymentsController.verifyPayment));
router.post('/webhook', asyncHandler(PaymentsController.handleWebhook));
router.post('/balance/:bookingId', authenticateToken, asyncHandler(PaymentsController.balancePayment));
router.use(authenticateToken);
router.post('/cash',authenticateToken,validateRequest(CashPaymentSchema),asyncHandler(PaymentsController.cashPayment));

router.get('/', requirePermission(Permissions.PAYMENT_MANAGE), asyncHandler(PaymentsController.listAll));
router.delete('/:id', requirePermission(Permissions.PAYMENT_DELETE), asyncHandler(PaymentsController.delete));

export const paymentRoutes = router;

