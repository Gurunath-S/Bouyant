import { prisma } from '../../config/db.js';
import { ApiError } from '../../utils/apiError.js';
import { InvoicesService } from '../invoices/invoices.service.js';

export class PaymentsService {
  /**
   * VERIFY PAYMENT SERVER-SIDE
   */
  static async verifyAndProcessPayment(
    bookingId: string,
    userId: string,
    action: 'SUCCESS' | 'FAILED' | 'CANCELLED',
    paymentMethod = 'CREDIT_CARD_VISA',
    transactionId?: string
  ) {
    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
      include: {
        stall: true,
        company: true,
        payment: true,
      },
    });

    if (!booking) throw ApiError.notFound('Booking record not found.');
    if (booking.userId !== userId) throw ApiError.forbidden('Unauthorized access to booking.');

    const generatedTxnId = transactionId || `txn_mock_${Date.now()}_${Math.floor(Math.random() * 1000)}`;

    if (action === 'SUCCESS') {
      return await prisma.$transaction(async (tx) => {
        // 1. Update Payment Record
        const payment = await tx.payment.upsert({
          where: { bookingId },
          update: {
            status: 'SUCCESS',
            transactionId: generatedTxnId,
            paymentMethod,
            paidAt: new Date(),
          },
          create: {
            paymentReference: `PAY-${Math.floor(10000 + Math.random() * 90000)}`,
            bookingId,
            userId,
            amount: booking.grandTotal,
            currency: 'USD',
            status: 'SUCCESS',
            provider: 'STRIPE_SIMULATOR',
            transactionId: generatedTxnId,
            paymentMethod,
            paidAt: new Date(),
          },
        });

        // 2. Mark Booking as CONFIRMED
        await tx.booking.update({
          where: { id: bookingId },
          data: { status: 'CONFIRMED' },
        });

        // 3. Mark Stall as BOOKED_CONFIRMED
        await tx.stall.update({
          where: { id: booking.stallId },
          data: {
            status: 'BOOKED_CONFIRMED',
            heldUntil: null,
            heldByUserId: null,
          },
        });

        // 4. Generate Invoice
        const invoiceNum = `INV-2026-${Math.floor(1000 + Math.random() * 9000)}`;
        const invoice = await tx.invoice.create({
          data: {
            invoiceNumber: invoiceNum,
            bookingId,
            paymentId: payment.id,
            companyId: booking.companyId,
            totalAmount: booking.totalAmount,
            taxAmount: booking.taxAmount,
            grandTotal: booking.grandTotal,
            status: 'PAID',
            issueDate: new Date(),
          },
        });

        // 5. Trigger System Notification
        await tx.notification.create({
          data: {
            userId,
            title: 'Stall Booking Confirmed!',
            message: `Your booking for Stall ${booking.stall.stallNumber} has been successfully paid and confirmed. Invoice #${invoiceNum} generated.`,
            type: 'SUCCESS',
          },
        });

        return { bookingStatus: 'CONFIRMED', payment, invoice };
      });
    } else {
      // Payment Failed or Cancelled
      await prisma.payment.upsert({
        where: { bookingId },
        update: {
          status: action === 'CANCELLED' ? 'CANCELLED' : 'FAILED',
          failureReason: action === 'CANCELLED' ? 'User cancelled checkout' : 'Simulated bank authorization decline',
        },
        create: {
          paymentReference: `PAY-${Math.floor(10000 + Math.random() * 90000)}`,
          bookingId,
          userId,
          amount: booking.grandTotal,
          currency: 'USD',
          status: action === 'CANCELLED' ? 'CANCELLED' : 'FAILED',
          failureReason: action === 'CANCELLED' ? 'User cancelled checkout' : 'Simulated bank authorization decline',
        },
      });

      await prisma.notification.create({
        data: {
          userId,
          title: 'Payment Unsuccessful',
          message: `Payment attempt for Stall ${booking.stall.stallNumber} failed. You may retry payment before session expires.`,
          type: 'DANGER',
        },
      });

      return { bookingStatus: booking.status, paymentStatus: action };
    }
  }

  static async listPayments() {
    return await prisma.payment.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        booking: {
          include: {
            stall: true,
            company: true,
          },
        },
        user: { select: { name: true, email: true } },
      },
    });
  }
}
