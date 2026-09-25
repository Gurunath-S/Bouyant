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

    const generatedTxnId = transactionId || `txn_mock_${Date.now()}_${generateReference('TXN', 4, false)}`;

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
              paymentReference: generateReference('PAY', 8, false),
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

        // 3. Re-verify stall hold ownership before confirming payment (Protects against expired late payment callbacks)
        const stallIds = booking.stalls.map((s) => s.stallId);
        const currentStalls = await tx.stall.findMany({
          where: { id: { in: stallIds } },
        });

        // Check if any stall was reassigned to another user while payment was processing
        const invalidStall = currentStalls.find(
          (s) => (s.status === 'BOOKED_CONFIRMED' && s.heldByUserId !== userId) || s.status === 'AVAILABLE'
        );

        if (invalidStall) {
          throw ApiError.conflict(
            `Payment Error: Stall hold timer expired prior to payment completion and stall ${invalidStall.stallNumber} was reassigned. Please contact support for a full refund.`
          );
        }

        // Mark ALL stalls as BOOKED_CONFIRMED
        await tx.stall.updateMany({
          where: { id: { in: stallIds } },
          data: {
            status: 'BOOKED_CONFIRMED',
            heldUntil: null,
            heldByUserId: null,
          },
        });

        // 4. Generate Invoice
        const invoiceNum = generateReference('INV', 6);
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
