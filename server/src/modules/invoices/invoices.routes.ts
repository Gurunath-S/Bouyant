import { Router } from 'express';
import { InvoicesController } from './invoices.controller.js';
import { authenticateToken } from '../../middlewares/auth.js';
import { requireRole } from '../../middlewares/role.js';
import { asyncHandler } from '../../utils/asyncHandler.js';
import { UserRole } from '@prisma/client';

const router = Router();

router.use(authenticateToken);

router.get('/my-invoices', asyncHandler(InvoicesController.myInvoices));
router.get('/:id', asyncHandler(InvoicesController.getById));
router.get('/', requireRole(UserRole.ADMIN), asyncHandler(InvoicesController.listAll));

export const invoiceRoutes = router;
