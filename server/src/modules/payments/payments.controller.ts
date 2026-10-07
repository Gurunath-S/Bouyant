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

   static async balancePayment(
	  req: AuthenticatedRequest,
	  res: Response
	) {
	  const { bookingId } = req.params;

	  const result =
	    await PaymentsService.createBalancePaymentOrder(
	      bookingId,
        req.user
	    );

  res.status(201).json({
    success: true,
    message: 'Balance payment order created successfully.',
    data: result,
  });
}

  static listAll = async (req: AuthenticatedRequest, res: Response) => {
    const payments = await PaymentsService.listPayments();
    return sendResponse({
      res,
      statusCode: 200,
      message: 'All payments retrieved.',
      data: payments,
    });
  };
}
