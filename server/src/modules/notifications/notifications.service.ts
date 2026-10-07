import { prisma } from '../../config/db.js';
import { EmailService } from '../../services/email.service.js';
import { WhatsAppService } from './channels/whatsapp/whatsapp.service.js';
import { BookingNotificationData } from './channels/whatsapp/whatsapp.templates.js';

export type NotificationEventType =
  | 'BOOKING_CREATED'
  | 'PAYMENT_RECEIVED'
  | 'BOOKING_CONFIRMED'
  | 'PAYMENT_FAILED'
  | 'BOOKING_EXPIRED'
  | 'INVOICE_GENERATED';

export interface DispatchEventOptions {
  event: NotificationEventType;
  userId?: string;
  bookingId?: string;
  paymentId?: string;
  customData?: Partial<BookingNotificationData>;
}

export class NotificationsService {
  /**
   * Existing in-app notification query methods
   */
  static async getUserNotifications(userId: string) {
    return await prisma.notification.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
  }

  static async markAsRead(notificationId: string, userId: string) {
    return await prisma.notification.updateMany({
      where: { id: notificationId, userId },
      data: { isRead: true },
    });
  }

  static async markAllAsRead(userId: string) {
    return await prisma.notification.updateMany({
      where: { userId, isRead: false },
      data: { isRead: true },
    });
  }

  /**
   * CENTRAL ASYNCHRONOUS NOTIFICATION DISPATCHER
   * Triggers Email, WhatsApp, and In-App notifications out-of-band (outside DB transactions).
   */
  static async dispatchEvent(options: DispatchEventOptions): Promise<void> {
    // Wrap in non-blocking async context so it never throws or interrupts calling code
    setImmediate(async () => {
      try {
        await NotificationsService.processEvent(options);
      } catch (err: any) {
        console.error(`❌ [NOTIFICATION DISPATCHER ERROR] Unexpected failure processing event ${options.event}:`, err?.message || err);
      }
    });
  }

  private static async processEvent(options: DispatchEventOptions): Promise<void> {
    const { event, bookingId } = options;

    if (!bookingId) {
      console.warn(`⚠️ [NOTIFICATION DISPATCHER] No bookingId provided for event ${event}. Skipping dispatch.`);
      return;
    }

    // Fetch details required for notifications
    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
      include: {
        company: true,
        exhibition: true,
        stalls: { include: { stall: true } },
      },
    });

    if (!booking) {
      console.warn(`⚠️ [NOTIFICATION DISPATCHER] Booking ${bookingId} not found. Skipping.`);
      return;
    }

    const company = booking.company;
    const exhibition = booking.exhibition;
    const stallNumbers = booking.stalls.map((s) => s.stall.stallNumber);
    const toMobile = company.mobile;
    const toEmail = company.email;

    const notifData: BookingNotificationData = {
      customerName: company.contactPerson || company.name,
      companyName: company.name,
      exhibitionTitle: exhibition.title,
      bookingRef: booking.bookingReference,
      stalls: stallNumbers,
      amount: Number(booking.grandTotal),
      paidAmount: Number(booking.paidAmount),
      balanceAmount: Number(booking.balanceAmount),
      ...options.customData,
    };

    // -------------------------------------------------------------
    // 1. IN-APP NOTIFICATIONS
    // -------------------------------------------------------------
    const targetUserId = options.userId || (await prisma.user.findFirst({ where: { companyId: company.id } }))?.id;

    if (targetUserId) {
      let inAppTitle = '';
      let inAppMsg = '';

      if (event === 'BOOKING_CREATED') {
        inAppTitle = 'Stall Reservation Initiated';
        inAppMsg = `Your hold on stalls ${stallNumbers.join(', ')} for ${exhibition.title} has been created (Ref: ${booking.bookingReference}).`;
      } else if (event === 'PAYMENT_RECEIVED') {
        inAppTitle = 'Payment Confirmed';
        inAppMsg = `Payment of ₹${notifData.paidAmount?.toLocaleString('en-IN')} received for booking ${booking.bookingReference}. Remaining balance: ₹${notifData.balanceAmount?.toLocaleString('en-IN')}.`;
      } else if (event === 'BOOKING_CONFIRMED') {
        inAppTitle = 'Booking Confirmed 🎉';
        inAppMsg = `Your booking for stall(s) ${stallNumbers.join(', ')} at ${exhibition.title} is fully confirmed!`;
      } else if (event === 'PAYMENT_FAILED') {
        inAppTitle = 'Payment Attempt Failed';
        inAppMsg = `Payment processing for booking ${booking.bookingReference} failed. Please retry your payment.`;
      } else if (event === 'BOOKING_EXPIRED') {
        inAppTitle = 'Stall Reservation Expired';
        inAppMsg = `Your hold on stalls ${stallNumbers.join(', ')} has expired.`;
      }

      if (inAppTitle) {
        await prisma.notification.create({
          data: {
            userId: targetUserId,
            title: inAppTitle,
            message: inAppMsg,
            type: event === 'PAYMENT_FAILED' ? 'DANGER' : event === 'BOOKING_CONFIRMED' ? 'SUCCESS' : 'INFO',
          },
        }).catch((e) => console.error('Failed to create in-app notification record:', e.message));
      }
    }

    // -------------------------------------------------------------
    // 2. WHATSAPP NOTIFICATIONS (CUSTOMER)
    // -------------------------------------------------------------
    if (toMobile) {
      if (event === 'BOOKING_CREATED') {
        await WhatsAppService.sendBookingCreated(toMobile, notifData);
      } else if (event === 'PAYMENT_RECEIVED') {
        await WhatsAppService.sendPaymentSuccess(toMobile, notifData);
        if (booking.paymentStatus === 'PAID_FULL') {
          await WhatsAppService.sendBookingConfirmed(toMobile, notifData);
        }
      } else if (event === 'BOOKING_CONFIRMED') {
        await WhatsAppService.sendBookingConfirmed(toMobile, notifData);
      } else if (event === 'PAYMENT_FAILED') {
        await WhatsAppService.sendPaymentFailed(toMobile, notifData);
      } else if (event === 'BOOKING_EXPIRED') {
        await WhatsAppService.sendBookingExpired(toMobile, notifData);
      } else if (event === 'INVOICE_GENERATED') {
        await WhatsAppService.sendInvoiceGenerated(toMobile, notifData);
      }
    }

    // -------------------------------------------------------------
    // 3. EMAIL & WHATSAPP NOTIFICATIONS (ADMINS & MANAGEMENT)
    // -------------------------------------------------------------
    if (event === 'PAYMENT_RECEIVED' || event === 'BOOKING_CREATED') {
      // Email Admin Alert (Using existing EmailService)
      await EmailService.sendAdminAlert({
        type: event === 'PAYMENT_RECEIVED' ? 'PAYMENT_RECEIVED' : 'COMPANY_REGISTERED',
        companyName: company.name,
        contactPerson: company.contactPerson,
        email: toEmail,
        mobile: toMobile,
        bookingRef: booking.bookingReference,
        amount: Number(booking.paidAmount),
        stalls: stallNumbers,
        exhibitionTitle: exhibition.title,
        customRecipients: exhibition.notificationEmails,
      }).catch((e) => console.error('Failed to send admin email alert:', e.message));

      // WhatsApp Admin Alert to designated Admins with phone numbers
      const adminUsers = await prisma.user.findMany({
        where: {
          role: { in: ['ADMIN', 'SUPERADMIN'] },
          phone: { not: null },
          isActive: true,
        },
        select: { phone: true, name: true },
      });

      for (const admin of adminUsers) {
        if (admin.phone) {
          await WhatsAppService.sendAdminAlert(admin.phone, {
            eventTitle: exhibition.title,
            companyName: company.name,
            contactPerson: company.contactPerson,
            bookingRef: booking.bookingReference,
            amount: Number(booking.paidAmount || booking.grandTotal),
            stalls: stallNumbers,
            alertType: event === 'PAYMENT_RECEIVED' ? 'PAYMENT_RECEIVED' : 'NEW_BOOKING',
          });
        }
      }
    }
  }
}
