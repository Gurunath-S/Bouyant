import { Router } from 'express';
import { CompaniesController } from './companies.controller.js';
import { authenticateToken } from '../../middlewares/auth.js';
import { requirePermission } from '../../middlewares/permission.js';
import { validateRequest } from '../../middlewares/validate.js';
import { asyncHandler } from '../../utils/asyncHandler.js';
import { CreateCompanySchema, UpdateCompanySchema, GstVerificationSchema } from './companies.schemas.js';
import { Permissions } from '../../config/permissions.js';

const router = Router();

// Public Routes
router.post('/', validateRequest(CreateCompanySchema), asyncHandler(CompaniesController.create));
router.post('/verify-gst', validateRequest(GstVerificationSchema), asyncHandler(CompaniesController.verifyGst));

// Protected Routes
router.use(authenticateToken);

router.get('/my-company', asyncHandler(CompaniesController.getById));
router.get('/:id', asyncHandler(CompaniesController.getById));
router.put('/:id', validateRequest(UpdateCompanySchema), asyncHandler(CompaniesController.update));
router.get('/', requirePermission(Permissions.COMPANY_MANAGE), asyncHandler(CompaniesController.list));

export const companyRoutes = router;
