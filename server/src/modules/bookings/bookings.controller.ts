import { Response } from 'express';
import { AuthenticatedRequest } from '../../middlewares/auth.js';
import { BookingsService } from './bookings.service.js';
import { NotificationsService } from '../notifications/notifications.service.js';
import { sendResponse } from '../../utils/response.js';
import { ApiError } from '../../utils/apiError.js';

export class BookingsController {
 static create = async (req: AuthenticatedRequest, res: Response) => {
    const user = req.user;

    const booking = await BookingsService.createBooking(user, req.body);

    const targetBookingId = (booking as any)?.data?.bookingId || (booking as any)?.id;

    if (targetBookingId) {
      NotificationsService.dispatchEvent({
        event: 'BOOKING_CREATED',
        bookingId: targetBookingId,
        userId: user?.userId,
      });
    }

    return sendResponse({
      res,
      statusCode: 201,
      message: 'Stall booking initiated. Please proceed to payment within 15 minutes.',
      data: booking,
    });
  };

  static myBookings = async (req: AuthenticatedRequest, res: Response) => {
    const bookings = await BookingsService.getUserBookings(req.user);
    return sendResponse({
      res,
      statusCode: 200,
      message: 'My bookings list retrieved.',
      data: bookings,
    });
  };

  static getById = async (req: AuthenticatedRequest, res: Response) => {
    const booking = await BookingsService.getBookingById(
      req.params.id,
      req.user
    );

    return sendResponse({
      res,
      statusCode: 200,
      message: 'Booking details retrieved.',
      data: booking,
    });
  };

  static getPublicSummary = async (req: any, res: Response) => {
    const booking = await BookingsService.getPublicBookingSummary(req.params.id);
    return sendResponse({
      res,
      statusCode: 200,
      message: 'Public booking summary retrieved.',
      data: booking,
    });
  };

  static listAll = async (req: AuthenticatedRequest, res: Response) => {
    const page = req.query.page;
    const limit = req.query.limit;
    const search = (req.query.search as string) || '';
    const status = req.query.status as string;
    const paymentStatus = req.query.paymentStatus as string;
    const hasBalanceOnly = req.query.hasBalanceOnly as string;
    const registeredByRole = req.query.registeredByRole as string;
    const exhibitionId = req.query.exhibitionId as string;
    const userId = req.query.userId as string;
    let bookedByUserId = req.query.bookedByUserId as string;
    if (bookedByUserId === 'me' && req.user?.userId) {
      bookedByUserId = req.user.userId;
    }
    const bookingSource = req.query.bookingSource as string;

    const result = await BookingsService.listAllBookings({
      page,
      limit,
      search,
      status,
      paymentStatus,
      hasBalanceOnly,
      registeredByRole,
      exhibitionId,
      userId,
      bookedByUserId,
      bookingSource,
    });
    return sendResponse({
      res,
      statusCode: 200,
      message: 'All bookings list retrieved.',
      data: result.bookings,
      meta: result.meta,
    });
  };

  static cancel = async (req: AuthenticatedRequest, res: Response) => {
    const bookingId = req.params.id;
    const user = req.user;
    const reason = req.body?.reason;
    if (!user) {
      throw ApiError.forbidden('You do not have permission to cancel this booking.');
    }
    const result = await BookingsService.cancelBooking(bookingId, user, reason);
    return sendResponse({
      res,
      statusCode: 200,
      message: result.message || 'Booking cancelled successfully.',
      data: result.booking,
    });
  };

  static delete = async (req: AuthenticatedRequest, res: Response) => {
    const bookingId = req.params.id;
    const result = await BookingsService.deleteBooking(bookingId);
    return sendResponse({
      res,
      statusCode: 200,
      message: result.message,
      data: result,
    });
  };
}


