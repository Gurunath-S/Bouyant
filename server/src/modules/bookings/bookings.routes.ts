import { Router } from 'express';
import { BookingsController } from './bookings.controller.js';
import { authenticateToken, optionalAuth } from '../../middlewares/auth.js';
import { requirePermission } from '../../middlewares/permission.js';
import { validateRequest } from '../../middlewares/validate.js';
import { asyncHandler } from '../../utils/asyncHandler.js';
import { CreateBookingSchema } from './bookings.schemas.js';
import { Permissions } from '../../config/permissions.js';

const router = Router();

// Public unauthenticated route for booking confirmation success page
router.get('/public/summary/:id', asyncHandler(BookingsController.getPublicSummary));

// Allow cancelling an unconfirmed/pending booking on checkout drop, exit, or cancel
router.post('/:id/cancel', optionalAuth, asyncHandler(BookingsController.cancel));

router.use(authenticateToken);

router.post('/', validateRequest(CreateBookingSchema), asyncHandler(BookingsController.create));
router.get('/my-bookings', asyncHandler(BookingsController.myBookings));
router.get('/:id', asyncHandler(BookingsController.getById));
router.get('/', requirePermission(Permissions.BOOKING_MANAGE), asyncHandler(BookingsController.listAll));

export const bookingRoutes = router;
