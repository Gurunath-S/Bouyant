import { Router } from 'express';
import { BookingsController } from './bookings.controller.js';
import { authenticateToken } from '../../middlewares/auth.js';
import { requirePermission } from '../../middlewares/permission.js';
import { validateRequest } from '../../middlewares/validate.js';
import { asyncHandler } from '../../utils/asyncHandler.js';
import { CreateBookingSchema } from './bookings.schemas.js';
import { Permissions } from '../../config/permissions.js';

const router = Router();

router.use(authenticateToken);

router.post('/', validateRequest(CreateBookingSchema), asyncHandler(BookingsController.create));
router.get('/my-bookings', asyncHandler(BookingsController.myBookings));
router.get('/:id', asyncHandler(BookingsController.getById));
router.get('/', requirePermission(Permissions.BOOKING_MANAGE), asyncHandler(BookingsController.listAll));

export const bookingRoutes = router;
