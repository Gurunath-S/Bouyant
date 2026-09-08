import { Router } from 'express';
import { CompaniesController } from './companies.controller.js';
import { authenticateToken } from '../../middlewares/auth.js';
import { requireRole } from '../../middlewares/role.js';
import { validateRequest } from '../../middlewares/validate.js';
import { asyncHandler } from '../../utils/asyncHandler.js';
import { CreateCompanySchema, UpdateCompanySchema,GstVerificationSchema} from './companies.schemas.js';
import { UserRole } from '@prisma/client';

const router = Router();
// Public Routes

// router.post(
//   '/verify-gst',
//   validateRequest(GstVerificationSchema),
//   asyncHandler(CompaniesController.verifyGst)
// );

router.post('/', validateRequest(CreateCompanySchema), asyncHandler(CompaniesController.create));
router.post('/verify-gst', validateRequest(GstVerificationSchema), asyncHandler(CompaniesController.verifyGst));

// Protect Routes

router.use(authenticateToken);

router.get('/my-company', asyncHandler(CompaniesController.getById));
router.get('/:id', asyncHandler(CompaniesController.getById));
router.put('/:id', validateRequest(UpdateCompanySchema), asyncHandler(CompaniesController.update));
router.get('/', requireRole(UserRole.ADMIN), asyncHandler(CompaniesController.list));

export const companyRoutes = router;
