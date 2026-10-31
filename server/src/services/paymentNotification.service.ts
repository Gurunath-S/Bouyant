import { prisma } from '../config/db.js';
import { EmailService } from './email.service.js';
import { InvoicePdfService } from './InvoicePdfService.js';
import { WhatsappService } from './whatsapp.service.js'; 
import { Prisma } from '@prisma/client';

export class PaymentNotificationService {

static async sendPaymentEmails(emailData: {
  booking: any;
  payment: any;
  invoice: any | null;
  paymentAmount: Prisma.Decimal;
  finalBalance: Prisma.Decimal;
  newPaidAmount?: Prisma.Decimal;
  isInitialPayment?: boolean;
}): Promise<void> {
  const {
    booking,
    payment,
    invoice,
    paymentAmount,
    finalBalance,
    newPaidAmount,
    isInitialPayment = true,
  } = emailData;

  setImmediate(async () => {
    try {
      // 1. Calculate payment summary
      const grandTotalNum = Number(booking.grandTotal || 0);

      const cumulativePaidNum = newPaidAmount
        ? newPaidAmount.toNumber()
        : Number(booking.paidAmount || 0) + paymentAmount.toNumber();

      const calculatedPercentage =
        grandTotalNum > 0
          ? Math.min(
              100,
              Math.round((cumulativePaidNum / grandTotalNum) * 100)
            )
          : 100;

      const isBalancePayment = !isInitialPayment;

      const invoiceNumber =
        invoice?.invoiceNumber ||
        `INV-${booking.bookingReference}`;

      // 2. Generate invoice PDF
      let pdfBuffer: Buffer | null = null;

      if (invoice) {
        try {
          const pdfData =
            InvoicePdfService.buildInvoicePdfData(invoice, booking);

          pdfBuffer =
            await InvoicePdfService.generateInvoicePdf(pdfData);
        } catch (err: any) {
          console.error(
            'Invoice PDF generation failed:',
            err?.message || err
          );
        }
      }

      // 3. Prepare booking and company details
      const stalls = (booking.stalls || []).map((s: any) => ({
        stallNumber: s.stall?.stallNumber || s.stallId,
        category: s.stall?.category || 'Standard',
      }));

      const comp = booking.company;

      const bookingOwnerUser =
        comp?.users?.find(
          (u: any) => u.id === booking.userId
        ) || comp?.users?.[0];

      const billingName =
        booking.billingName?.trim() ||
        comp?.name ||
        'Exhibitor';

      const contactPerson =
        booking.contactPerson?.trim() ||
        comp?.contactPerson ||
        comp?.name ||
        'Exhibitor';

      const contactEmail =
        booking.contactEmail?.trim() ||
        bookingOwnerUser?.email ||
        comp?.email ||
        '';

      const contactPhone =
        booking.contactPhone?.trim() ||
        comp?.mobile ||
        comp?.phone ||
        '';

      const billingGst =
        booking.billingGst?.trim() ||
        comp?.gstNumber ||
        undefined;

      const displayUsername =
        bookingOwnerUser?.username || null;

      const exhibitionTitle =
        booking.exhibition?.title ||
        'Exhibition Event';

      const paymentDate =
        payment.paidAt || new Date();

      // 4. Send customer confirmation email
      if (contactEmail) {
        try {
          await EmailService.sendBookingConfirmationEmail({
            toEmail: comp?.email || contactEmail,
            toName: contactPerson,
            companyName: billingName,
            bookingReference: booking.bookingReference,
            exhibitionTitle,
            stalls,
            invoiceNumber,
            paymentPercentage: calculatedPercentage,
            paymentAmount: paymentAmount.toNumber(),
            totalPaidAmount: cumulativePaidNum,
            grandTotal: grandTotalNum,
            remainingBalance: finalBalance.toNumber(),
            isBalancePayment,
            paymentDate,
            paymentReference: payment.paymentReference,
            userName: displayUsername,
            pdfBuffer,
            paymentMode: payment.paymentMode,
          });
        } catch (err: any) {
          console.error(
            'Customer confirmation email failed:',
            err?.message || err
          );
        }
      } else {
        console.warn(
          'Customer email skipped: no email address found.',
          booking.bookingReference
        );
      }

      // 5. Find admin notification email addresses
      try {
        const adminEmails: string[] = [];

        if (booking.exhibition?.notificationEmails) {
          const parsed =
            booking.exhibition.notificationEmails
              .split(/[\s,;]+/)
              .map((email: string) => email.trim())
              .filter(
                (email: string) =>
                  email.length > 0 &&
                  /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
              );

          adminEmails.push(...parsed);
        }

        const createdByEmail =
          booking.exhibition?.createdBy?.email;

        if (createdByEmail) {
          adminEmails.push(createdByEmail);
        }

        // Fallback to active admin users
        if (adminEmails.length === 0) {
          const adminUsers = await prisma.user.findMany({
            where: {
              role: {
                in: ['ADMIN', 'SUPERADMIN'],
              },
              isActive: true,
            },
            select: {
              email: true,
            },
          });

          adminUsers.forEach((admin) => {
            if (admin.email) {
              adminEmails.push(admin.email);
            }
          });
        }

        const uniqueAdminEmails = [
          ...new Set(
            adminEmails
              .map((email) => email.trim())
              .filter(Boolean)
          ),
        ];

        // 6. Send admin payment notification
        if (uniqueAdminEmails.length > 0) {
          await EmailService.sendPaymentAdminEmail({
            notificationEmails: uniqueAdminEmails,
            companyName: billingName,
            contactPerson,
            email: contactEmail || comp?.email,
            phone: contactPhone,
            gstNumber: billingGst,
            bookingReference: booking.bookingReference,
            exhibitionTitle,
            stalls: (booking.stalls || []).map((s: any) => ({
              stallNumber: s.stall?.stallNumber || s.stallId,
              category: s.stall?.category || 'Standard',
              price:
                s.price != null
                  ? Number(s.price)
                  : undefined,
            })),
            invoiceNumber,
            paymentPercentage: calculatedPercentage,
            paymentAmount: paymentAmount.toNumber(),
            remainingBalance: finalBalance.toNumber(),
            grandTotal: grandTotalNum,
            paymentMethod:
              payment.paymentMethod || 'Online Gateway',
            paymentDate,
            paymentReference: payment.paymentReference,
            pdfBuffer,
            paymentMode: payment.paymentMode,
          });
        }
        // 7. Send WhatsApp Booking Confirmation
         

      } catch (err: any) {
        console.error(
          'Admin payment email failed:',
          err?.message || err
        );
      }
    } catch (err: any) {
      console.error(
        'After-payment email processing failed:',
        err?.message || err
      );
    }

       try {
            await WhatsappService.sendBookingConfirmation({
                booking,
                payment,
                invoice,
                paymentAmount: paymentAmount.toNumber(),
            });
            } catch (err: any) {
            console.error(
                'WhatsApp booking confirmation failed:',
                err?.message || err
            );
         }
  });
}

}
