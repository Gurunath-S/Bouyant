import { Response } from 'express';
import { AuthenticatedRequest } from '../../middlewares/auth.js';
import { PaymentsService } from './payments.service.js';
import { sendResponse } from '../../utils/response.js';

export class PaymentsController {
  static verifyPayment = async (req: AuthenticatedRequest, res: Response) => {
    const { bookingId, action, paymentMethod, transactionId, payAmount } = req.body;
    const userId = req.user!.userId;
    const userRole = req.user!.role;

    const result = await PaymentsService.verifyAndProcessPayment(
      bookingId,
      userId,
      userRole,
      action || 'SUCCESS',
      paymentMethod,
      transactionId,
      undefined,
      payAmount ? Number(payAmount) : undefined
    );

    return sendResponse({
      res,
      statusCode: 200,
      message: action === 'SUCCESS' ? 'Payment processed and booking updated successfully!' : 'Payment processing updated.',
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
