import { Router } from 'express';
import { BookingsController } from './bookings.controller.js';
import { authenticateToken,optionalAuth} from '../../middlewares/auth.js';
import { requirePermission } from '../../middlewares/permission.js';
import { validateRequest } from '../../middlewares/validate.js';
import { asyncHandler } from '../../utils/asyncHandler.js';
import { CreateBookingSchema } from './bookings.schemas.js';
import { Permissions } from '../../config/permissions.js';

const router = Router();

router.post('/', validateRequest(CreateBookingSchema),optionalAuth,asyncHandler(BookingsController.create));

router.use(authenticateToken);
router.get('/my-bookings', asyncHandler(BookingsController.myBookings));
router.get('/:id', asyncHandler(BookingsController.getById));
router.get('/', requirePermission(Permissions.BOOKING_MANAGE), asyncHandler(BookingsController.listAll));

export const bookingRoutes = router;
