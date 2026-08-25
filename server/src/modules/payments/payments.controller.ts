import { Response } from 'express';
import { AuthenticatedRequest } from '../../middlewares/auth.js';
import { PaymentsService } from './payments.service.js';
import { sendResponse } from '../../utils/response.js';

export class PaymentsController {
  static verifyPayment = async (req: AuthenticatedRequest, res: Response) => {
    const { bookingId, action, paymentMethod, transactionId } = req.body;
    const userId = req.user!.userId;

    const result = await PaymentsService.verifyAndProcessPayment(
      bookingId,
      userId,
      action || 'SUCCESS',
      paymentMethod,
      transactionId
    );

    return sendResponse({
      res,
      statusCode: 200,
      message: action === 'SUCCESS' ? 'Payment verified and booking confirmed!' : 'Payment processing updated.',
      data: result,
    });
  };

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
