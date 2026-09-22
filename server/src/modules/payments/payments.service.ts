import { prisma } from '../../config/db.js';
import { ApiError } from '../../utils/apiError.js';
import { EmailService } from '../../services/email.service.js';

export class PaymentsService {
  /**
   * VERIFY PAYMENT SERVER-SIDE
   */
  static async verifyAndProcessPayment(
    bookingId: string,
    userId: string,
    action: 'SUCCESS' | 'FAILED' | 'CANCELLED',
    paymentMethod = 'CREDIT_CARD_VISA',
    transactionId?: string,
    temporaryPassword?: string
  ) {
    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
      include: {
        stalls: { include: { stall: true } },
        company: true,
        exhibition: true,
        user: { select: { id: true, name: true, email: true, phone: true } },
        payments: true,
      },
    });

    if (!booking) throw ApiError.notFound('Booking record not found.');
    if (booking.userId !== userId) throw ApiError.forbidden('Unauthorized access to booking.');

    const generatedTxnId = transactionId || `txn_mock_${Date.now()}_${Math.floor(Math.random() * 1000)}`;

    if (action === 'SUCCESS') {
      const result = await prisma.$transaction(async (tx) => {
        // 1. Update or Create Payment Record
        const existingPayment = await tx.payment.findFirst({
          where: { bookingId },
        });

        let payment;
        if (existingPayment) {
          payment = await tx.payment.update({
            where: { id: existingPayment.id },
            data: {
              status: 'SUCCESS',
              transactionId: generatedTxnId,
              paymentMethod,
              paidAt: new Date(),
            },
          });
        } else {
          payment = await tx.payment.create({
            data: {
              paymentReference: `PAY-${Math.floor(10000 + Math.random() * 90000)}`,
              bookingId,
              userId,
              amount: booking.grandTotal,
              currency: 'INR',
              status: 'SUCCESS',
              provider: 'STRIPE_SIMULATOR',
              transactionId: generatedTxnId,
              paymentMethod,
              paidAt: new Date(),
            },
          });
        }

        // 2. Mark Booking as CONFIRMED
        await tx.booking.update({
          where: { id: bookingId },
          data: { status: 'CONFIRMED' },
        });

        // 3. Mark ALL stalls as BOOKED_CONFIRMED
        const stallIds = booking.stalls.map((s) => s.stallId);
        await tx.stall.updateMany({
          where: { id: { in: stallIds } },
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

        // 5. Trigger System Notification for Client
        await tx.notification.create({
          data: {
            userId,
            title: 'Booking Confirmed!',
            message: `Your booking for ${booking.stalls.length} stall(s) has been successfully paid and confirmed. Invoice #${invoiceNum} generated.`,
            type: 'SUCCESS',
          },
        });

        // 6. Notify System Administrators about confirmed booking payment
        const admins = await tx.user.findMany({
          where: { role: { in: ['ADMIN', 'SUPERADMIN'] } },
          select: { id: true },
        });

        if (admins.length > 0) {
          await tx.notification.createMany({
            data: admins.map((admin) => ({
              userId: admin.id,
              title: 'Booking Payment Received',
              message: `Payment of ₹${Number(booking.grandTotal).toLocaleString()} received from "${booking.company.name}" (Ref: ${booking.bookingReference}).`,
              type: 'SUCCESS',
            })),
          });
        }

        return { bookingStatus: 'CONFIRMED', payment, invoice };
      });

      const stallNumbers = booking.stalls.map((s) => s.stall.stallNumber);

      // Background Email Dispatches: Client Invoice & Admin Notification
      EmailService.sendInvoiceAndCredentialsEmail({
        toEmail: booking.user.email,
        toName: booking.user.name,
        companyName: booking.company.name,
        bookingRef: booking.bookingReference,
        invoiceNumber: result.invoice.invoiceNumber,
        grandTotal: Number(booking.grandTotal),
        paidAmount: Number(booking.grandTotal),
        stalls: stallNumbers,
        exhibitionTitle: booking.exhibition?.title || 'Buoyant Exhibition',
        temporaryPassword,
      }).catch((e) => console.error('Client invoice email dispatch error:', e));

      EmailService.sendAdminAlert({
        type: 'PAYMENT_RECEIVED',
        companyName: booking.company.name,
        contactPerson: booking.user.name,
        email: booking.user.email,
        mobile: booking.user.phone || booking.company.mobile,
        bookingRef: booking.bookingReference,
        invoiceNumber: result.invoice.invoiceNumber,
        amount: Number(booking.grandTotal),
        stalls: stallNumbers,
        exhibitionTitle: booking.exhibition?.title,
      }).catch((e) => console.error('Admin payment email alert error:', e));

      return result;
    } else {
      // Payment Failed or Cancelled
      const existingPayment = await prisma.payment.findFirst({
        where: { bookingId },
      });

      if (existingPayment) {
        await prisma.payment.update({
          where: { id: existingPayment.id },
          data: {
            status: action === 'CANCELLED' ? 'CANCELLED' : 'FAILED',
            failureReason: action === 'CANCELLED' ? 'User cancelled checkout' : 'Simulated bank authorization decline',
          },
        });
      } else {
        await prisma.payment.create({
          data: {
            paymentReference: `PAY-${Math.floor(10000 + Math.random() * 90000)}`,
            bookingId,
            userId,
            amount: booking.grandTotal,
            currency: 'INR',
            status: action === 'CANCELLED' ? 'CANCELLED' : 'FAILED',
            failureReason: action === 'CANCELLED' ? 'User cancelled checkout' : 'Simulated bank authorization decline',
          },
        });
      }

      await prisma.notification.create({
        data: {
          userId,
          title: 'Payment Failed',
          message: `Payment attempt for your stall booking failed. You may retry payment before the session expires.`,
          type: 'ERROR',
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
            stalls: { include: { stall: true } },
            company: true,
          },
        },
        user: { select: { name: true, email: true } },
      },
    });
  }
}
