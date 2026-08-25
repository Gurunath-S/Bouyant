import { Response } from 'express';
import { AuthenticatedRequest } from '../../middlewares/auth.js';
import { BookingsService } from './bookings.service.js';
import { sendResponse } from '../../utils/response.js';

export class BookingsController {
  static create = async (req: AuthenticatedRequest, res: Response) => {
    const booking = await BookingsService.createBooking(req.user!.userId, req.body);
    return sendResponse({
      res,
      statusCode: 201,
      message: 'Stall booking initiated. Please proceed to payment within 15 minutes.',
      data: booking,
    });
  };

  static myBookings = async (req: AuthenticatedRequest, res: Response) => {
    const bookings = await BookingsService.getUserBookings(req.user!.userId);
    return sendResponse({
      res,
      statusCode: 200,
      message: 'My bookings list retrieved.',
      data: bookings,
    });
  };

  static getById = async (req: AuthenticatedRequest, res: Response) => {
    const isClient = req.user!.role === 'CLIENT';
    const booking = await BookingsService.getBookingById(
      req.params.id,
      isClient ? req.user!.userId : undefined
    );

    return sendResponse({
      res,
      statusCode: 200,
      message: 'Booking details retrieved.',
      data: booking,
    });
  };

  static listAll = async (req: AuthenticatedRequest, res: Response) => {
    const page = parseInt(req.query.page as string || '1', 10);
    const limit = parseInt(req.query.limit as string || '20', 10);
    const status = req.query.status as string;

    const result = await BookingsService.listAllBookings(page, limit, status);
    return sendResponse({
      res,
      statusCode: 200,
      message: 'All bookings list retrieved.',
      data: result.bookings,
      meta: result.meta,
    });
  };
}
