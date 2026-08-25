import { Router } from 'express';
import { BookingsController } from './bookings.controller.js';
import { authenticateToken } from '../../middlewares/auth.js';
import { requireRole } from '../../middlewares/role.js';
import { validateRequest } from '../../middlewares/validate.js';
import { asyncHandler } from '../../utils/asyncHandler.js';
import { CreateBookingSchema } from './bookings.schemas.js';
import { UserRole } from '@prisma/client';

const router = Router();

router.use(authenticateToken);

router.post('/', validateRequest(CreateBookingSchema), asyncHandler(BookingsController.create));
router.get('/my-bookings', asyncHandler(BookingsController.myBookings));
router.get('/:id', asyncHandler(BookingsController.getById));
router.get('/', requireRole(UserRole.ADMIN), asyncHandler(BookingsController.listAll));

export const bookingRoutes = router;
