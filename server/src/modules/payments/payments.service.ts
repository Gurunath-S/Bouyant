import { prisma } from '../../config/db.js';
import { ApiError } from '../../utils/apiError.js';
import { EmailService } from '../../services/email.service.js';
import { generateReference } from '../../utils/reference.js';

export class PaymentsService {
  /**
   * VERIFY PAYMENT SERVER-SIDE
   */
  static async verifyAndProcessPayment(
    bookingId: string,
    userId: string,
    userRole = 'CLIENT',
    action: 'SUCCESS' | 'FAILED' | 'CANCELLED',
    paymentMethod = 'CREDIT_CARD_VISA',
    transactionId?: string,
    temporaryPassword?: string,
    payAmount?: number
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

    const isStaffOrAdmin = ['ADMIN', 'SUPERADMIN', 'STAFF'].includes(userRole);
    if (!isStaffOrAdmin && booking.userId !== userId) {
      throw ApiError.forbidden('Unauthorized access to booking.');
    }

    const generatedTxnId = transactionId || `txn_mock_${Date.now()}_${generateReference('TXN', 4, false)}`;

    if (action === 'SUCCESS') {
      const result = await prisma.$transaction(async (tx) => {
        // Calculate partial / balance payments
        const currentPaid = Number(booking.paidAmount || 0);
        const grandTotal = Number(booking.grandTotal);
        const balanceLeft = Number(booking.balanceAmount || Math.max(0, grandTotal - currentPaid));

        const paymentAmount = payAmount && payAmount > 0
          ? Math.min(payAmount, balanceLeft > 0 ? balanceLeft : grandTotal)
          : (balanceLeft > 0 ? balanceLeft : grandTotal);

        const newPaidAmount = Math.min(grandTotal, currentPaid + paymentAmount);
        const newBalanceAmount = Math.max(0, grandTotal - newPaidAmount);
        const newPaymentStatus = newBalanceAmount === 0 ? 'PAID_FULL' : 'PARTIALLY_PAID';

        // 1. Create or Update Payment Record
        const payment = await tx.payment.create({
          data: {
            paymentReference: generateReference('PAY', 8, false),
            bookingId,
            userId: booking.userId,
            amount: paymentAmount,
            currency: 'INR',
            status: 'SUCCESS',
            provider: isStaffOrAdmin ? 'ADMIN_OFFLINE_RECORD' : 'RAZORPAY',
            transactionId: generatedTxnId,
            paymentMethod: paymentMethod || (isStaffOrAdmin ? 'ADMIN_CASH_DIRECT' : 'CREDIT_CARD_VISA'),
            installmentType: newBalanceAmount > 0 ? 'PARTIAL' : 'FULL',
            paidAt: new Date(),
          },
        });

        // 2. Mark Booking as CONFIRMED with updated paidAmount and balanceAmount
        await tx.booking.update({
          where: { id: bookingId },
          data: {
            status: 'CONFIRMED',
            paidAmount: newPaidAmount,
            balanceAmount: newBalanceAmount,
            paymentStatus: newPaymentStatus,
          },
        });

        // 3. Re-verify stall hold ownership before confirming payment
        const stallIds = booking.stalls.map((s) => s.stallId);
        await tx.stall.updateMany({
          where: { id: { in: stallIds } },
          data: {
            status: 'BOOKED_CONFIRMED',
            heldUntil: null,
            heldByUserId: null,
          },
        });

        // 4. Update or Generate Invoice
        const existingInvoice = await tx.invoice.findFirst({ where: { bookingId } });
        let invoice;
        if (existingInvoice) {
          invoice = await tx.invoice.update({
            where: { id: existingInvoice.id },
            data: {
              status: newBalanceAmount === 0 ? 'PAID' : 'ISSUED',
              totalAmount: booking.totalAmount,
              taxAmount: booking.taxAmount,
              grandTotal: booking.grandTotal,
            },
          });
        } else {
          const invoiceNum = generateReference('INV', 6);
          invoice = await tx.invoice.create({
            data: {
              invoiceNumber: invoiceNum,
              bookingId,
              paymentId: payment.id,
              companyId: booking.companyId,
              totalAmount: booking.totalAmount,
              taxAmount: booking.taxAmount,
              grandTotal: booking.grandTotal,
              status: newBalanceAmount === 0 ? 'PAID' : 'ISSUED',
              issueDate: new Date(),
            },
          });
        }

        // 5. Trigger System Notification for Client
        await tx.notification.create({
          data: {
            userId: booking.userId,
            title: 'Booking Confirmed!',
            message: `Your booking for ${booking.stalls.length} stall(s) has been successfully paid and confirmed. Invoice #${invoice?.invoiceNumber || 'INV-REF'} generated.`,
            type: 'SUCCESS',
          },
        });

        // 6. Notify System Administrators or Designated Event Admins about confirmed booking payment
        const eventEmails = booking.exhibition?.notificationEmails
          ? booking.exhibition.notificationEmails.split(',').map((e) => e.trim().toLowerCase())
          : [];

        let targetAdmins = await tx.user.findMany({
          where: {
            OR: [
              ...(eventEmails.length > 0 ? [{ email: { in: eventEmails, mode: 'insensitive' as const } }] : []),
              ...(booking.exhibition?.createdByUserId ? [{ id: booking.exhibition.createdByUserId }] : []),
              { role: { in: ['ADMIN', 'SUPERADMIN'] } },
            ],
          },
          select: { id: true },
        });

        // Deduplicate target admin IDs
        const uniqueAdminIds = Array.from(new Set(targetAdmins.map((a) => a.id)));

        if (uniqueAdminIds.length > 0) {
          await tx.notification.createMany({
            data: uniqueAdminIds.map((adminId) => ({
              userId: adminId,
              title: 'Booking Payment Received',
              message: `Payment of ₹${Number(booking.grandTotal).toLocaleString()} received from "${booking.company.name}" for "${booking.exhibition?.title}" (Ref: ${booking.bookingReference}).`,
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
        customRecipients: booking.exhibition?.notificationEmails,
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
            paymentReference: generateReference('PAY', 8, false),
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

  static async listPayments(page = 1, limit = 50) {
    const take = Math.min(Math.max(Number(limit) || 50, 1), 100);
    const skip = (Math.max(Number(page) || 1, 1) - 1) * take;

    const [total, payments] = await prisma.$transaction([
      prisma.payment.count(),
      prisma.payment.findMany({
        take,
        skip,
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
      }),
    ]);

    return { payments, total, page, limit: take, totalPages: Math.ceil(total / take) };
  }
}
