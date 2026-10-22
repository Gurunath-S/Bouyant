import {Request,Response } from 'express';
import { AuthenticatedRequest } from '../../middlewares/auth.js';
import { PaymentsService } from './payments.service.js';
import { NotificationsService } from '../notifications/notifications.service.js';
import { sendResponse } from '../../utils/response.js';

export class PaymentsController {
  static verifyPayment = async (req:Request, res: Response) => {
    
    const result = await PaymentsService.verifyAndProcessPayment(req.body);

    // Trigger async notification dispatch after payment verification
    if (result.success && result.data?.bookingId) {
      NotificationsService.dispatchEvent({
        event: 'PAYMENT_RECEIVED',
        bookingId: result.data.bookingId,
        paymentId: result.data.paymentId,
      });
    }

    return sendResponse({
      res,
      statusCode: 200,
      message: 'Payment verified and booking confirmed!',
      data: result,
    });
  };

  static handleWebhook = async (req: Request, res: Response) => {
    const signature = req.headers['x-razorpay-signature'] as string | undefined;
    const result = await PaymentsService.handleWebhook(req.body, signature);
    return res.status(200).json(result);
  };

   static async balancePayment(
	  req: AuthenticatedRequest,
	  res: Response
	) {
	  const { bookingId } = req.params;
    const { amount, nextDueDate } = req.body || {};

	  const result =
	    await PaymentsService.createBalancePaymentOrder(
	      bookingId,
        req.user,
        amount !== undefined && amount !== null ? Number(amount) : undefined,
        nextDueDate ? String(nextDueDate) : undefined
	    );

  res.status(201).json({
    success: true,
    message: 'Balance payment order created successfully.',
    data: result,
  });
}

  static listAll = async (req: AuthenticatedRequest, res: Response) => {
    const page = req.query.page as string | undefined;
    const limit = req.query.limit as string | undefined;
    const search = (req.query.search as string) || '';
    const status = (req.query.status as string) || '';
    const method = (req.query.method as string) || '';

    const result = await PaymentsService.listPayments({
      page,
      limit,
      search,
      status,
      method,
    });
    return sendResponse({
      res,
      statusCode: 200,
      message: 'All payments retrieved.',
      data: result.payments,
      meta: {
        total: result.total,
        page: result.page,
        limit: result.limit,
        totalPages: result.totalPages,
        totalFilteredAmount: result.totalFilteredAmount,
      },
    });
  };

  static delete = async (req: AuthenticatedRequest, res: Response) => {
    const paymentId = req.params.id;
    const result = await PaymentsService.deletePayment(paymentId);
    return sendResponse({
      res,
      statusCode: 200,
      message: result.message,
      data: result,
    });
  };
}

