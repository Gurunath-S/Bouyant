import { prisma } from '../config/db.js';
import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: parseInt(process.env.SMTP_PORT || '587', 10),
  secure: process.env.SMTP_SECURE === 'true',
  auth: process.env.SMTP_USER ? {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  } : undefined,
});

export interface BookingConfirmationEmailPayload {
  toEmail: string;
  toName: string;
  companyName: string;
  bookingReference: string;
  exhibitionTitle: string;
  stalls: {
    stallNumber: string;
    category: string;
  }[];
  invoiceNumber: string;
  paymentPercentage: number;
  paymentAmount: number;
  remainingBalance: number;
  paymentDate: Date | string;
  paymentReference: string;
  userName?: string | null;
  temporaryPassword?: string | null;
  pdfBuffer: Buffer;
}

export interface PaymentAdminEmailPayload {
  companyName: string;
  contactPerson: string;
  bookingReference: string;
  exhibitionTitle: string;
  stalls: {
    stallNumber: string;
    category: string;
  }[];
  invoiceNumber: string;
  paymentPercentage: number;
  paymentAmount: number;
  remainingBalance: number;
  paymentDate: Date | string;
  paymentReference: string;
  notificationEmails: string[];
  pdfBuffer: Buffer;
}

export interface InvoiceEmailPayload {
  toEmail: string;
  toName: string;
  companyName: string;
  bookingRef: string;
  invoiceNumber: string;
  grandTotal: number;
  paidAmount: number;
  stalls: string[];
  exhibitionTitle: string;
  temporaryPassword?: string | null;
}

export interface AdminNotificationPayload {
  type: 'COMPANY_REGISTERED' | 'PAYMENT_RECEIVED';
  companyName: string;
  contactPerson: string;
  email: string;
  mobile: string;
  bookingRef?: string;
  invoiceNumber?: string;
  amount?: number;
  stalls?: string[];
  exhibitionTitle?: string;
  customRecipients?: string[] | string | null;
}

export class EmailService {
  private static formatINR(amount?: number | null): string {
    if (amount === undefined || amount === null || isNaN(amount)) return '0.00';
    return Number(amount).toLocaleString('en-IN', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  }

  static async sendBookingConfirmationEmail(payload: BookingConfirmationEmailPayload) {
    const isPartialPayment = payload.remainingBalance > 0;
    const paymentText = isPartialPayment
      ? `Partial Payment - ${payload.paymentPercentage}%`
      : 'Full Payment';

    const html = `
      <!DOCTYPE html>
      <html>
        <body style="margin:0; padding:0; background:#f5f7fa; font-family:Arial,sans-serif;">
          <div style="max-width:650px; margin:30px auto; background:#ffffff; border-radius:12px; overflow:hidden;">
            <div style="background:#012970; padding:28px 32px; color:#ffffff;">
              <h1 style="margin:0; font-size:22px;">Booking Confirmation</h1>
              <p style="margin:8px 0 0; color:#dbe7ff;">${payload.exhibitionTitle}</p>
            </div>
            <div style="padding:32px;">
              <p style="font-size:16px; color:#111827;">Dear <strong>${payload.toName}</strong>,</p>
              <p style="font-size:14px; line-height:1.7; color:#4b5563;">
                Thank you for reserving stall(s) at <strong>${payload.exhibitionTitle}</strong>.
                Your payment has been successfully processed and your reservation is confirmed.
              </p>
              <div style="margin-top:25px;">
                <h3 style="font-size:14px; color:#012970;">BOOKING DETAILS</h3>
                <table width="100%" cellpadding="8" cellspacing="0" style="font-size:14px; border-collapse:collapse;">
                  <tr>
                    <td style="color:#6b7280;">Company</td>
                    <td align="right"><strong>${payload.companyName}</strong></td>
                  </tr>
                  <tr>
                    <td style="color:#6b7280;">Booking Reference</td>
                    <td align="right"><strong>${payload.bookingReference}</strong></td>
                  </tr>
                  <tr>
                    <td style="color:#6b7280;">Stall(s)</td>
                    <td align="right">
                      ${payload.stalls.map((s) => `<div><strong>${s.stallNumber}</strong> - ${s.category}</div>`).join('')}
                    </td>
                  </tr>
                  <tr>
                    <td style="color:#6b7280;">Payment</td>
                    <td align="right"><strong>${paymentText}</strong></td>
                  </tr>
                  <tr>
                    <td style="color:#6b7280;">Amount Paid</td>
                    <td align="right"><strong>₹${this.formatINR(payload.paymentAmount)}</strong></td>
                  </tr>
                  ${isPartialPayment ? `
                  <tr>
                    <td style="color:#6b7280;">Remaining Balance</td>
                    <td align="right"><strong style="color:#dc2626;">₹${this.formatINR(payload.remainingBalance)}</strong></td>
                  </tr>
                  ` : ''}
                  <tr>
                    <td style="color:#6b7280;">Invoice</td>
                    <td align="right"><strong>${payload.invoiceNumber}</strong></td>
                  </tr>
                </table>
              </div>
              <p style="margin-top:25px; padding:15px; background:#f8fafc; border-radius:8px; font-size:14px; color:#475569;">
                Your official Tax Invoice PDF is attached to this email.
              </p>
            </div>
            <div style="background:#f8fafc; padding:20px 32px; text-align:center; color:#64748b; font-size:12px;">
              This is an automated booking confirmation from Buoyant Media.
            </div>
          </div>
        </body>
      </html>
    `;

    console.log(`✉️ [EMAIL SERVICE] Sending confirmation email with PDF attachment to: ${payload.toEmail}`);

    if (process.env.SMTP_USER) {
      await transporter.sendMail({
        from: `"Buoyant Media" <${process.env.SMTP_USER}>`,
        to: payload.toEmail,
        subject: `Booking Confirmed - ${payload.bookingReference}`,
        html,
        attachments: [
          {
            filename: `${payload.invoiceNumber}.pdf`,
            content: payload.pdfBuffer,
            contentType: 'application/pdf',
          },
        ],
      });
    }

    return true;
  }

  static async sendPaymentAdminEmail(payload: PaymentAdminEmailPayload) {
    if (!payload.notificationEmails || payload.notificationEmails.length === 0) return true;

    console.log(`📢 [EMAIL SERVICE] Sending admin payment alert to: ${payload.notificationEmails.join(', ')}`);

    if (process.env.SMTP_USER) {
      await transporter.sendMail({
        from: `"Buoyant Media" <${process.env.SMTP_USER}>`,
        to: payload.notificationEmails.join(','),
        subject: `Payment Received - ${payload.bookingReference} (${payload.companyName})`,
        text: `Payment of ₹${payload.paymentAmount} received for booking ${payload.bookingReference}.`,
        attachments: [
          {
            filename: `${payload.invoiceNumber}.pdf`,
            content: payload.pdfBuffer,
            contentType: 'application/pdf',
          },
        ],
      });
    }

    return true;
  }

  static async sendInvoiceAndCredentialsEmail(payload: InvoiceEmailPayload) {
    console.log(`\n✉️ [EMAIL SERVICE] Dispatching Exhibitor Confirmation Email to: ${payload.toEmail}`);
    return true;
  }

  static async sendAdminAlert(payload: AdminNotificationPayload) {
    console.log(`\n📢 [ADMIN EMAIL ALERT] Dispatching alert: ${payload.type} for ${payload.companyName}`);
    return true;
  }
}
