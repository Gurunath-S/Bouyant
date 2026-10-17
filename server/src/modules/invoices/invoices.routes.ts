import { Router } from 'express';
import { InvoicesController } from './invoices.controller.js';
import { authenticateToken } from '../../middlewares/auth.js';
import { requirePermission } from '../../middlewares/permission.js';
import { asyncHandler } from '../../utils/asyncHandler.js';
import { Permissions } from '../../config/permissions.js';
import { pdfDownloadLimiter } from '../../middlewares/rateLimiter.js';

const router = Router();

// All invoice operations require a verified authentication context
router.use(authenticateToken);

router.get('/my-invoices', asyncHandler(InvoicesController.myInvoices));
router.get('/:id/pdf', pdfDownloadLimiter, asyncHandler(InvoicesController.downloadPdf));
router.get('/:id', asyncHandler(InvoicesController.getById));
router.get('/', requirePermission(Permissions.INVOICE_MANAGE), asyncHandler(InvoicesController.listAll));

export const invoiceRoutes = router;

