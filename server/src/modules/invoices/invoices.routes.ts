import { Router } from 'express';
import { InvoicesController } from './invoices.controller.js';
import { authenticateToken } from '../../middlewares/auth.js';
import { requirePermission } from '../../middlewares/permission.js';
import { asyncHandler } from '../../utils/asyncHandler.js';
import { Permissions } from '../../config/permissions.js';

const router = Router();

router.use(authenticateToken);

router.get('/my-invoices', asyncHandler(InvoicesController.myInvoices));
router.get('/:id', asyncHandler(InvoicesController.getById));
router.get('/', requirePermission(Permissions.INVOICE_MANAGE), asyncHandler(InvoicesController.listAll));

export const invoiceRoutes = router;
