import nodemailer from 'nodemailer';
import dns from 'dns';
import { env } from '../config/env.js';
import { escapeHtml } from '../utils/htmlEscape.js';
import { resolveClientOrigin } from '../utils/urlHelper.js';
import { DateTime } from "luxon";

export function getSmtpUser(): string {
  return (process.env.SMTP_USER || process.env.EMAIL_USER || '').trim();
}

export function getSmtpPass(): string {
  return (process.env.SMTP_PASS || process.env.EMAIL_PASS || '').trim().replace(/\s+/g, '');
}

export function isSmtpConfigured(): boolean {
  return Boolean(getSmtpUser() && getSmtpPass());
}

let testTransporterOverride: any = null;

export function setEmailTransporterForTesting(mock: any) {
  testTransporterOverride = mock;
}

export function resetEmailTransporterForTesting() {
  testTransporterOverride = null;
}

export function getEmailTransporter() {
  return testTransporterOverride || transporter;
}

export const smtpHost = (process.env.SMTP_HOST || 'smtp.gmail.com').trim();
export const smtpPort = parseInt(process.env.SMTP_PORT || '587', 10);
export const smtpSecure = process.env.SMTP_SECURE === 'true' || smtpPort === 465;

// In production, TLS certificate verification is strictly mandatory and cannot be disabled.
// In non-production environments, it defaults to true unless explicitly overridden for local mock/dev.
const rejectUnauthorized =
  env.NODE_ENV === 'production'
    ? true
    : process.env.SMTP_REJECT_UNAUTHORIZED === 'false'
    ? false
    : true;

export function getSmtpSecurityConfig() {
  return {
    host: smtpHost,
    port: smtpPort,
    secure: smtpSecure,
    rejectUnauthorized,
  };
}

const transporter = nodemailer.createTransport({
  host: smtpHost,
  port: smtpPort,
  secure: smtpSecure,
  auth: getSmtpUser() ? {
    user: getSmtpUser(),
    pass: getSmtpPass(),
  } : undefined,
  tls: {
    rejectUnauthorized,
  },
  connectionTimeout: 10000,
  greetingTimeout: 10000,
  socketTimeout: 15000,
  // Force IPv4 DNS resolution for outbound SMTP connections to prevent ENETUNREACH on Render
  lookup: (hostname: string, options: any, callback: any) => {
    const cb = typeof options === 'function' ? options : callback;
    dns.lookup(hostname, { family: 4 }, (err, address, family) => {
      cb(err, address, family);
    });
  },
} as any);

export const verifyEmailTransporter = async () => {
  const user = getSmtpUser();
  if (!user) {
    console.warn('⚠️ [EMAIL SERVICE] Neither SMTP_USER nor EMAIL_USER is configured in environment variables.');
    return;
  }
  console.log(`🔌 [EMAIL SERVICE] Testing Gmail Service connection for account: ${user}...`);
  try {
    await getEmailTransporter().verify();
    console.log('✅ [EMAIL SERVICE] Gmail SMTP Service verified and ready!');
  } catch (err: any) {
    console.error('❌ [EMAIL SERVICE] Gmail SMTP Verification Failed:', err?.message || err);
    if (err?.code === 'EAUTH') {
      console.error('👉 [EMAIL HINT] Invalid App Password. Ensure 2-Step Verification is ON and generate an App Password for Mail.');
    } else if (err?.code === 'ETIMEDOUT' || err?.code === 'ECONNREFUSED') {
      console.error('👉 [EMAIL HINT] Connection timed out on Render. Outbound SMTP ports are blocked by Render on free tiers.');
    }
  }
};

export interface PaymentReminderEmailPayload {
  toEmail: string;
  toName: string;
  bookingReference: string;
  exhibitionTitle: string;
  remainingBalance: number;
  nextPaymentDate: Date | string;
  stallDetails:string;
}

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
  totalPaidAmount?: number;
  grandTotal?: number;
  remainingBalance: number;
  isBalancePayment?: boolean;
  paymentDate: Date | string;
  paymentReference: string;
  userName?: string | null;
  temporaryPassword?: string | null;
  pdfBuffer?: Buffer | null;
}

export interface PaymentAdminEmailPayload {
  companyName: string;
  contactPerson?: string;
  email?: string;
  phone?: string;
  gstNumber?: string;
  bookingReference: string;
  exhibitionTitle: string;
  stalls: {
    stallNumber: string;
    category: string;
    price?: number;
  }[];
  invoiceNumber: string;
  paymentPercentage: number;
  paymentAmount: number;
  remainingBalance: number;
  grandTotal?: number;
  paymentMethod?: string;
  paymentDate: Date | string;
  paymentReference: string;
  notificationEmails: string[];
  pdfBuffer?: Buffer | null;
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

export interface AccountCredentialsEmailPayload {
  toEmail: string;
  toName: string;
  companyName: string;
  username: string;
  temporaryPassword?: string | null;
}

export interface PasswordResetEmailPayload {
  toEmail: string;
  toName: string;
  resetUrl: string;
}

export interface AdminPasswordResetNotificationPayload {
  toEmail: string;
  toName: string;
  username?: string;
  password?: string;
}

export interface EmailDeliveryResult {
  status: 'ACCEPTED' | 'FAILED' | 'SKIPPED';
  messageId?: string;
  attempts?: number;
  error?: string;
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
    const isBalancePayment = Boolean(payload.isBalancePayment);

    const emailSubject = isBalancePayment
      ? (isPartialPayment
          ? `Payment Received (Balance Pending) - ${payload.bookingReference}`
          : `Payment Received (Fully Settled) - ${payload.bookingReference}`)
      : (isPartialPayment
          ? `Booking Confirmed (Advance Payment) - ${payload.bookingReference}`
          : `Booking Confirmed - ${payload.bookingReference}`);

    const headerTitle = isBalancePayment
      ? (isPartialPayment ? 'Payment Received 💳' : 'Payment Received — Fully Settled 🎉')
      : 'Booking Confirmed 🎉';

    const paymentText = isBalancePayment
      ? (isPartialPayment
          ? `Partial Balance Payment (${payload.paymentPercentage}% Paid)`
          : 'Balance Settled (100% Paid)')
      : (isPartialPayment
          ? `Advance Payment (${payload.paymentPercentage}% Paid)`
          : 'Full Payment (100%)');

    const loginUrl = `${resolveClientOrigin()}/login`;
    const safeLoginUrl = escapeHtml(loginUrl);
    const safeToName = escapeHtml(payload.toName);
    const safeCompanyName = escapeHtml(payload.companyName);
    const safeExhibitionTitle = escapeHtml(payload.exhibitionTitle);
    const safeBookingReference = escapeHtml(payload.bookingReference);

    const introText = isBalancePayment
      ? (isPartialPayment
          ? `We have successfully received your installment/balance payment of <strong>₹${this.formatINR(payload.paymentAmount)}</strong> towards booking <strong>${safeBookingReference}</strong> for <strong>${safeExhibitionTitle}</strong>. Your updated payment summary and remaining balance are detailed below.`
          : `We have successfully received your final balance payment of <strong>₹${this.formatINR(payload.paymentAmount)}</strong> towards booking <strong>${safeBookingReference}</strong> for <strong>${safeExhibitionTitle}</strong>. Your booking is now <strong>fully settled and confirmed</strong>.`)
      : `Thank you for reserving stall(s) at <strong>${safeExhibitionTitle}</strong>. Your payment has been successfully processed and your reservation is confirmed.`;

    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
          <style>
            @media only screen and (max-width: 480px) {
              .mobile-table tr { display: block !important; margin-bottom: 10px !important; }
              .mobile-table td { display: block !important; text-align: left !important; width: 100% !important; box-sizing: border-box !important; padding: 4px 0 !important; }
              .mobile-padding { padding: 20px 16px !important; }
              .mobile-header { padding: 20px 16px !important; }
            }
          </style>
        </head>
        <body style="margin:0; padding:0; background:#f4f6f9; font-family:'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; color:#334155;">
          <div style="max-width:580px; margin:20px auto; background:#ffffff; border-radius:16px; overflow:hidden; border:1px solid #e2e8f0; box-shadow:0 4px 12px rgba(0,0,0,0.05);">
            <div class="mobile-header" style="background:#012970; padding:28px 32px; color:#ffffff;">
              <h1 style="margin:0; font-size:22px; font-weight:800; tracking-tight: -0.5px;">${headerTitle}</h1>
              <p style="margin:6px 0 0; color:#93c5fd; font-size:14px; font-weight:500;">${safeExhibitionTitle}</p>
            </div>

            <div class="mobile-padding" style="padding:28px 32px;">
              <p style="font-size:15px; color:#1e293b; margin:0 0 16px; line-height:1.6;">
                Dear <strong>${safeToName}</strong>,
              </p>
              <p style="font-size:14px; line-height:1.6; color:#475569; margin:0 0 24px;">
                ${introText}
              </p>

              <!-- BOOKING SUMMARY BOX -->
              <div style="background:#f8fafc; border:1px solid #e2e8f0; border-radius:12px; padding:20px; margin-bottom:24px;">
                <h3 style="font-size:12px; font-weight:800; color:#012970; text-transform:uppercase; letter-spacing:0.8px; margin:0 0 14px; border-bottom:1px solid #cbd5e1; padding-bottom:8px;">
                  ${isBalancePayment ? 'PAYMENT & BOOKING SUMMARY' : 'BOOKING SUMMARY'}
                </h3>

                <table class="mobile-table" width="100%" cellpadding="6" cellspacing="0" style="font-size:13px; border-collapse:collapse;">
                  <tr>
                    <td style="color:#64748b; font-weight:500; vertical-align:top; width:45%;">Company Name</td>
                    <td align="right" style="color:#0f172a; font-weight:700; vertical-align:top; width:55%;">${safeCompanyName}</td>
                  </tr>
                  <tr>
                    <td style="color:#64748b; font-weight:500; vertical-align:top;">Booking Reference</td>
                    <td align="right" style="color:#6366f1; font-weight:800; font-family:monospace; font-size:14px; vertical-align:top;">${safeBookingReference}</td>
                  </tr>
                  <tr>
                    <td style="color:#64748b; font-weight:500; vertical-align:top;">Allocated Stall(s)</td>
                    <td align="right" style="color:#0f172a; font-weight:700; vertical-align:top;">
                      ${payload.stalls.map((s) => `<div>${escapeHtml(s.stallNumber)} <span style="font-weight:normal; color:#64748b; font-size:12px;">(${escapeHtml(s.category)})</span></div>`).join('')}
                    </td>
                  </tr>
                  <tr>
                    <td style="color:#64748b; font-weight:500; vertical-align:top;">Payment Status</td>
                    <td align="right" style="color:#0f172a; font-weight:700; vertical-align:top;">${paymentText}</td>
                  </tr>
                  <tr>
                    <td style="color:#64748b; font-weight:500; vertical-align:top;">${isBalancePayment ? 'Amount Paid (This Payment)' : 'Amount Paid'}</td>
                    <td align="right" style="color:#059669; font-weight:800; font-size:14px; vertical-align:top;">₹${this.formatINR(payload.paymentAmount)}</td>
                  </tr>
                  ${payload.grandTotal ? `
                  <tr>
                    <td style="color:#64748b; font-weight:500; vertical-align:top;">Total Booking Amount</td>
                    <td align="right" style="color:#0f172a; font-weight:700; font-size:13px; vertical-align:top;">₹${this.formatINR(payload.grandTotal)}</td>
                  </tr>
                  ` : ''}
                  ${payload.totalPaidAmount !== undefined && (payload.totalPaidAmount > payload.paymentAmount || isBalancePayment) ? `
                  <tr>
                    <td style="color:#64748b; font-weight:500; vertical-align:top;">Total Paid to Date</td>
                    <td align="right" style="color:#059669; font-weight:700; font-size:13px; vertical-align:top;">₹${this.formatINR(payload.totalPaidAmount)}</td>
                  </tr>
                  ` : ''}
                  ${isPartialPayment ? `
                  <tr>
                    <td style="color:#64748b; font-weight:500; vertical-align:top;">Remaining Balance</td>
                    <td align="right" style="color:#dc2626; font-weight:800; font-size:14px; vertical-align:top;">₹${this.formatINR(payload.remainingBalance)}</td>
                  </tr>
                  ` : `
                  <tr>
                    <td style="color:#64748b; font-weight:500; vertical-align:top;">Remaining Balance</td>
                    <td align="right" style="color:#059669; font-weight:800; font-size:13px; vertical-align:top;">₹0.00 (Fully Settled)</td>
                  </tr>
                  `}
                  <tr>
                    <td style="color:#64748b; font-weight:500; vertical-align:top;">Invoice Number</td>
                    <td align="right" style="color:#0f172a; font-weight:700; font-family:monospace; vertical-align:top;">${payload.invoiceNumber}</td>
                  </tr>
                </table>
              </div>

              <!-- LOGIN CREDENTIALS & PORTAL BUTTON -->
              <div style="background:#eef2ff; border:1px solid #c7d2fe; border-radius:12px; padding:20px; margin-bottom:24px;">
                <h3 style="margin:0 0 10px; font-size:13px; font-weight:800; color:#1e40af; text-transform:uppercase; letter-spacing:0.8px;">EXHIBITOR PORTAL ACCESS</h3>
                <p style="margin:0 0 14px; font-size:13px; color:#3b82f6; line-height:1.5;">
                  Your account credentials have been linked to your registered email identity:
                </p>

                <table class="mobile-table" width="100%" cellpadding="5" cellspacing="0" style="font-size:13px; margin-bottom:16px;">
                  <tr>
                    <td style="color:#475569; font-weight:500; width:45%;">Registered Email:</td>
                    <td style="color:#0f172a; font-weight:700;">${escapeHtml(payload.toEmail)}</td>
                  </tr>
                  ${payload.userName && payload.userName !== payload.toEmail ? `
                  <tr>
                    <td style="color:#475569; font-weight:500;">Username:</td>
                    <td style="color:#0f172a; font-weight:700; font-family:monospace;">${escapeHtml(payload.userName)}</td>
                  </tr>
                  ` : ''}
                  ${payload.temporaryPassword ? `
                  <tr>
                    <td style="color:#475569; font-weight:500;">Initial Password:</td>
                    <td style="color:#1d4ed8; font-weight:800; font-family:monospace; font-size:15px;">${escapeHtml(payload.temporaryPassword)}</td>
                  </tr>
                  ` : `
                  <tr>
                    <td style="color:#475569; font-weight:500;">Password:</td>
                    <td style="color:#64748b; font-style:italic;">Use your account password set during registration</td>
                  </tr>
                  `}
                </table>

                <!-- PROMINENT BUTTON -->
                <div style="text-align:center; margin-top:20px;">
                  <a href="${safeLoginUrl}" target="_blank" style="display:inline-block; background:#2563eb; color:#ffffff; font-weight:700; font-size:14px; text-decoration:none; padding:12px 28px; border-radius:8px; box-shadow:0 2px 4px rgba(37,99,235,0.2);">
                    Login to Exhibitor Portal
                  </a>
                </div>

                <p style="margin:14px 0 0; text-align:center; font-size:11px; color:#64748b; word-break:break-all;">
                  Direct Link: <a href="${safeLoginUrl}" style="color:#2563eb; text-decoration:underline;">${safeLoginUrl}</a>
                </p>
              </div>

              <p style="padding:14px; background:#f8fafc; border:1px solid #e2e8f0; border-radius:8px; font-size:13px; color:#64748b; margin:0; text-align:center;">
                ${payload.pdfBuffer ? '📄 Your official Tax Invoice PDF is attached to this email.' : ' You can download your official Tax Invoice PDF directly from your user dashboard.'}
              </p>
            </div>

            <div style="background:#f8fafc; padding:18px 32px; text-align:center; color:#94a3b8; font-size:12px; border-top:1px solid #f1f5f9;">
              This is an automated payment confirmation from Buoyant Media.
            </div>
          </div>
        </body>
      </html>
    `;

    console.log(`✉️ [EMAIL SERVICE] Sending confirmation email to: ${payload.toEmail}`);

    const user = getSmtpUser();
    if (user) {
      const attachments = payload.pdfBuffer
        ? [
            {
              filename: `${payload.invoiceNumber}.pdf`,
              content: payload.pdfBuffer,
              contentType: 'application/pdf',
            },
          ]
        : [];

      await getEmailTransporter().sendMail({
        from: `"Buoyant Media" <${user}>`,
        to: payload.toEmail,
        subject: emailSubject,
        html,
        attachments,
      });
    } else {
      console.warn('⚠️ [EMAIL SERVICE] SMTP_USER is not configured in .env. Email was not sent.');
    }

    return true;
  }

  static async sendPaymentAdminEmail(payload: PaymentAdminEmailPayload) {
    if (!payload.notificationEmails || payload.notificationEmails.length === 0) return true;

    console.log(`📢 [EMAIL SERVICE] Sending admin payment alert to: ${payload.notificationEmails.join(', ')}`);

    const isPartialPayment = payload.remainingBalance > 0;
    const paymentStatusText = isPartialPayment
      ? `Partial Payment (${payload.paymentPercentage}%)`
      : 'Full Payment (100%)';

    const safeCompanyName = escapeHtml(payload.companyName);
    const safeExhibitionTitle = escapeHtml(payload.exhibitionTitle);
    const safeBookingReference = escapeHtml(payload.bookingReference);
    const safeContactPerson = payload.contactPerson ? escapeHtml(payload.contactPerson) : '';
    const safeEmail = payload.email ? escapeHtml(payload.email) : '';
    const safePhone = payload.phone ? escapeHtml(payload.phone) : '';
    const safeGstNumber = payload.gstNumber ? escapeHtml(payload.gstNumber) : '';

    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
          <style>
            @media only screen and (max-width: 480px) {
              .mobile-table tr { display: block !important; margin-bottom: 10px !important; }
              .mobile-table td { display: block !important; text-align: left !important; width: 100% !important; box-sizing: border-box !important; padding: 4px 0 !important; }
              .mobile-padding { padding: 20px 16px !important; }
              .mobile-header { padding: 20px 16px !important; }
            }
          </style>
        </head>
        <body style="margin:0; padding:0; background:#f4f6f9; font-family:'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; color:#334155;">
          <div style="max-width:580px; margin:20px auto; background:#ffffff; border-radius:16px; overflow:hidden; border:1px solid #e2e8f0; box-shadow:0 4px 12px rgba(0,0,0,0.05);">
            <div class="mobile-header" style="background:#4338ca; padding:24px 32px; color:#ffffff;">
              <span style="background:rgba(255,255,255,0.2); padding:4px 10px; border-radius:6px; font-size:11px; font-weight:700; uppercase; letter-spacing:0.5px;">EXHIBITION ADMIN ALERT</span>
              <h1 style="margin:8px 0 0; font-size:20px; font-weight:800;">New Payment Received 💳</h1>
              <p style="margin:4px 0 0; color:#c7d2fe; font-size:13px; font-weight:500;">${safeExhibitionTitle}</p>
            </div>

            <div class="mobile-padding" style="padding:24px 32px;">
              <p style="font-size:14px; line-height:1.6; color:#475569; margin:0 0 20px;">
                A new payment has been processed for stall booking <strong>${safeBookingReference}</strong> in <strong>${safeExhibitionTitle}</strong>.
              </p>

              <!-- EXHIBITOR DETAILS -->
              <div style="background:#f8fafc; border:1px solid #e2e8f0; border-radius:12px; padding:18px; margin-bottom:18px;">
                <h3 style="font-size:11px; font-weight:800; color:#4338ca; text-transform:uppercase; letter-spacing:0.8px; margin:0 0 12px; border-bottom:1px solid #cbd5e1; padding-bottom:6px;">EXHIBITOR IDENTITY</h3>
                <table class="mobile-table" width="100%" cellpadding="4" cellspacing="0" style="font-size:13px;">
                  <tr>
                    <td style="color:#64748b; font-weight:500; width:45%;">Company Name</td>
                    <td align="right" style="color:#0f172a; font-weight:700; width:55%;">${safeCompanyName}</td>
                  </tr>
                  ${safeContactPerson ? `
                  <tr>
                    <td style="color:#64748b; font-weight:500;">Contact Person</td>
                    <td align="right" style="color:#0f172a; font-weight:600;">${safeContactPerson}</td>
                  </tr>` : ''}
                  ${safeEmail ? `
                  <tr>
                    <td style="color:#64748b; font-weight:500;">Email Address</td>
                    <td align="right" style="color:#0f172a; font-weight:600;">${safeEmail}</td>
                  </tr>` : ''}
                  ${safePhone ? `
                  <tr>
                    <td style="color:#64748b; font-weight:500;">Phone Number</td>
                    <td align="right" style="color:#0f172a; font-weight:600;">${safePhone}</td>
                  </tr>` : ''}
                  ${safeGstNumber ? `
                  <tr>
                    <td style="color:#64748b; font-weight:500;">GSTIN Tax ID</td>
                    <td align="right" style="color:#0f172a; font-weight:600; font-family:monospace;">${safeGstNumber}</td>
                  </tr>` : ''}
                </table>
              </div>

              <!-- TRANSACTION & STALL DETAILS -->
              <div style="background:#f8fafc; border:1px solid #e2e8f0; border-radius:12px; padding:18px; margin-bottom:20px;">
                <h3 style="font-size:11px; font-weight:800; color:#4338ca; text-transform:uppercase; letter-spacing:0.8px; margin:0 0 12px; border-bottom:1px solid #cbd5e1; padding-bottom:6px;">TRANSACTION & STALL DETAILS</h3>
                <table class="mobile-table" width="100%" cellpadding="4" cellspacing="0" style="font-size:13px;">
                  <tr>
                    <td style="color:#64748b; font-weight:500; vertical-align:top;">Booking Ref</td>
                    <td align="right" style="color:#6366f1; font-weight:800; font-family:monospace; vertical-align:top;">${payload.bookingReference}</td>
                  </tr>
                  <tr>
                    <td style="color:#64748b; font-weight:500; vertical-align:top;">Invoice #</td>
                    <td align="right" style="color:#0f172a; font-weight:700; font-family:monospace; vertical-align:top;">${payload.invoiceNumber}</td>
                  </tr>
                  <tr>
                    <td style="color:#64748b; font-weight:500; vertical-align:top;">Allocated Stall(s)</td>
                    <td align="right" style="color:#0f172a; font-weight:700; vertical-align:top;">
                      ${payload.stalls.map((s) => `<div>Stall ${s.stallNumber} <span style="font-weight:normal; color:#64748b; font-size:12px;">(${s.category}${s.price ? ` - ₹${this.formatINR(s.price)}` : ''})</span></div>`).join('')}
                    </td>
                  </tr>
                  <tr>
                    <td style="color:#64748b; font-weight:500; vertical-align:top;">Payment Method</td>
                    <td align="right" style="color:#0f172a; font-weight:600; vertical-align:top;">${payload.paymentMethod || 'Online Payment'}</td>
                  </tr>
                  <tr>
                    <td style="color:#64748b; font-weight:500; vertical-align:top;">Payment Reference</td>
                    <td align="right" style="color:#0f172a; font-weight:600; font-family:monospace; vertical-align:top;">${payload.paymentReference}</td>
                  </tr>
                  <tr>
                    <td style="color:#64748b; font-weight:500; vertical-align:top;">Payment Status</td>
                    <td align="right" style="color:#0f172a; font-weight:700; vertical-align:top;">${paymentStatusText}</td>
                  </tr>
                  <tr>
                    <td style="color:#64748b; font-weight:500; vertical-align:top;">Amount Paid</td>
                    <td align="right" style="color:#059669; font-weight:800; font-size:14px; vertical-align:top;">₹${this.formatINR(payload.paymentAmount)}</td>
                  </tr>
                  ${isPartialPayment ? `
                  <tr>
                    <td style="color:#64748b; font-weight:500; vertical-align:top;">Remaining Balance</td>
                    <td align="right" style="color:#dc2626; font-weight:800; font-size:14px; vertical-align:top;">₹${this.formatINR(payload.remainingBalance)}</td>
                  </tr>` : `
                  <tr>
                    <td style="color:#64748b; font-weight:500; vertical-align:top;">Account Status</td>
                    <td align="right" style="color:#059669; font-weight:800; font-size:12px; text-transform:uppercase; vertical-align:top;">PAID IN FULL</td>
                  </tr>`}
                </table>
              </div>
            </div>
          </div>
        </body>
      </html>
    `;

    const user = getSmtpUser();
    if (user) {
      const attachments = payload.pdfBuffer
        ? [
            {
              filename: `${payload.invoiceNumber}.pdf`,
              content: payload.pdfBuffer,
              contentType: 'application/pdf',
            },
          ]
        : [];

      await getEmailTransporter().sendMail({
        from: `"Buoyant Media Admin Alert" <${user}>`,
        to: payload.notificationEmails.join(','),
        subject: `Payment Received: ${payload.companyName} (${payload.bookingReference}) - ${payload.exhibitionTitle}`,
        html,
        attachments,
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

  static async sendAccountCredentialsEmail(payload: AccountCredentialsEmailPayload): Promise<EmailDeliveryResult> {
    const loginUrl = `${resolveClientOrigin()}/login`;
    const safeLoginUrl = escapeHtml(loginUrl);
    const safeToName = escapeHtml(payload.toName);
    const safeCompanyName = escapeHtml(payload.companyName);
    const safeUsername = escapeHtml(payload.username);
    const safeToEmail = escapeHtml(payload.toEmail);
    const safeTempPassword = payload.temporaryPassword ? escapeHtml(payload.temporaryPassword) : '';

    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
          <style>
            @media only screen and (max-width: 480px) {
              .mobile-table tr { display: block !important; margin-bottom: 10px !important; }
              .mobile-table td { display: block !important; text-align: left !important; width: 100% !important; box-sizing: border-box !important; padding: 4px 0 !important; }
              .mobile-padding { padding: 20px 16px !important; }
              .mobile-header { padding: 20px 16px !important; }
            }
          </style>
        </head>
        <body style="margin:0; padding:0; background:#f4f6f9; font-family:'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; color:#334155;">
          <div style="max-width:580px; margin:20px auto; background:#ffffff; border-radius:16px; overflow:hidden; border:1px solid #e2e8f0; box-shadow:0 4px 12px rgba(0,0,0,0.05);">
            <div class="mobile-header" style="background:#012970; padding:28px 32px; color:#ffffff;">
              <h1 style="margin:0; font-size:22px; font-weight:800; letter-spacing:-0.5px;">Welcome to Buoyant Media 🌟</h1>
              <p style="margin:6px 0 0; color:#93c5fd; font-size:14px; font-weight:500;">Your Exhibitor Account Credentials</p>
            </div>

            <div class="mobile-padding" style="padding:28px 32px;">
              <p style="font-size:15px; color:#1e293b; margin:0 0 16px; line-height:1.6;">
                Dear <strong>${safeToName}</strong>,
              </p>
              <p style="font-size:14px; line-height:1.6; color:#475569; margin:0 0 24px;">
                Your exhibitor account for <strong>${safeCompanyName}</strong> has been successfully created. You can use the credentials below to sign in to the Exhibitor Portal to manage your stall reservations, view invoices, and complete payments.
              </p>

              <!-- CREDENTIALS BOX -->
              <div style="background:#eef2ff; border:1px solid #c7d2fe; border-radius:12px; padding:20px; margin-bottom:24px;">
                <h3 style="margin:0 0 12px; font-size:13px; font-weight:800; color:#1e40af; text-transform:uppercase; letter-spacing:0.8px;">LOGIN CREDENTIALS</h3>

                <table class="mobile-table" width="100%" cellpadding="6" cellspacing="0" style="font-size:13px; margin-bottom:16px; border-collapse:collapse;">
                  <tr>
                    <td style="color:#475569; font-weight:500; width:40%;">Company:</td>
                    <td style="color:#0f172a; font-weight:700;">${safeCompanyName}</td>
                  </tr>
                  <tr>
                    <td style="color:#475569; font-weight:500;">Username:</td>
                    <td style="color:#1e40af; font-weight:800; font-family:monospace; font-size:14px;">${safeUsername}</td>
                  </tr>
                  <tr>
                    <td style="color:#475569; font-weight:500;">Registered Email:</td>
                    <td style="color:#0f172a; font-weight:700;">${safeToEmail}</td>
                  </tr>
                  ${safeTempPassword ? `
                  <tr>
                    <td style="color:#475569; font-weight:500;">Initial Password:</td>
                    <td style="color:#1d4ed8; font-weight:800; font-family:monospace; font-size:15px;">${safeTempPassword}</td>
                  </tr>
                  ` : `
                  <tr>
                    <td style="color:#475569; font-weight:500;">Password:</td>
                    <td style="color:#64748b; font-style:italic;">Use your account password set during registration</td>
                  </tr>
                  `}
                </table>

                <!-- PROMINENT BUTTON -->
                <div style="text-align:center; margin-top:20px;">
                  <a href="${safeLoginUrl}" target="_blank" style="display:inline-block; background:#2563eb; color:#ffffff; font-weight:700; font-size:14px; text-decoration:none; padding:12px 28px; border-radius:8px; box-shadow:0 2px 4px rgba(37,99,235,0.2);">
                    Log In to Exhibitor Portal
                  </a>
                </div>

                <p style="margin:14px 0 0; text-align:center; font-size:11px; color:#64748b; word-break:break-all;">
                  Direct Link: <a href="${safeLoginUrl}" style="color:#2563eb; text-decoration:underline;">${safeLoginUrl}</a>
                </p>
              </div>

              <div style="background:#f8fafc; border:1px solid #e2e8f0; border-radius:8px; padding:14px; font-size:12px; color:#64748b; line-height:1.5;">
                🔒 <strong>Security Tip:</strong> You can sign in using either your username (<strong>${safeUsername}</strong>) or registered email (<strong>${safeToEmail}</strong>). For your security, do not share these credentials with unauthorized persons.
              </div>
            </div>

            <div style="background:#f8fafc; padding:18px 32px; text-align:center; color:#94a3b8; font-size:12px; border-top:1px solid #f1f5f9;">
              This is an automated credential notification from Buoyant Media Exhibition Platform.
            </div>
          </div>
        </body>
      </html>
    `;

    console.log(`✉️ [EMAIL SERVICE] Dispatching initial account credentials email to: ${payload.toEmail} (Username: ${payload.username})`);

    const user = getSmtpUser();
    if (!user) {
      const isProd = env.NODE_ENV === 'production' || process.env.NODE_ENV === 'production';
      if (isProd) {
        console.warn(`⚠️ [EMAIL SERVICE] SMTP_USER is not configured in production. Credentials email delivery failed for: ${payload.toEmail}`);
        return { status: 'FAILED', error: 'SMTP_NOT_CONFIGURED', attempts: 0 };
      }
      console.warn(`⚠️ [EMAIL SERVICE] SMTP_USER is not configured in environment. Credentials email skipped for: ${payload.toEmail}`);
      return { status: 'SKIPPED', error: 'SMTP_NOT_CONFIGURED', attempts: 0 };
    }

    const maxAttempts = 3;
    let lastError: any = null;
    const currentTransporter = getEmailTransporter();

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        const info = await currentTransporter.sendMail({
          from: `"Buoyant Media" <${user}>`,
          to: payload.toEmail,
          subject: `Your Buoyant Exhibitor Account Credentials - ${payload.companyName}`,
          html,
        });

        console.log(`✅ [EMAIL SERVICE] Account credentials email accepted by SMTP server for: ${payload.toEmail} (MessageId: ${info.messageId})`);
        return {
          status: 'ACCEPTED',
          messageId: info.messageId,
          attempts: attempt,
        };
      } catch (err: any) {
        lastError = err;
        console.error(`⚠️ [EMAIL SERVICE] Attempt ${attempt}/${maxAttempts} failed to deliver credentials to ${payload.toEmail}:`, err?.message || err);
        if (attempt < maxAttempts) {
          await new Promise((res) => setTimeout(res, 200));
        }
      }
    }

    return {
      status: 'FAILED',
      attempts: maxAttempts,
      error: lastError?.message || 'SMTP_DELIVERY_FAILED',
    };
  }

  static async sendPasswordResetEmail(payload: PasswordResetEmailPayload): Promise<EmailDeliveryResult> {
    console.log(`✉️ [EMAIL SERVICE] Dispatching password reset recovery email to: ${payload.toEmail}`);

    const safeToName = escapeHtml(payload.toName);
    const safeResetUrl = escapeHtml(payload.resetUrl);

    const user = getSmtpUser();
    if (!user) {
      const isProd = env.NODE_ENV === 'production' || process.env.NODE_ENV === 'production';
      if (isProd) {
        console.warn(`⚠️ [EMAIL SERVICE] SMTP_USER is not configured in production. Password reset email delivery failed for: ${payload.toEmail}`);
        return { status: 'FAILED', error: 'SMTP_NOT_CONFIGURED', attempts: 0 };
      }
      console.warn(`⚠️ [EMAIL SERVICE] SMTP_USER is not configured in environment. Password reset email skipped for: ${payload.toEmail}`);
      return { status: 'SKIPPED', error: 'SMTP_NOT_CONFIGURED', attempts: 0 };
    }

    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
          <style>
            @media only screen and (max-width: 480px) {
              .mobile-padding { padding: 20px 16px !important; }
              .mobile-header { padding: 20px 16px !important; }
            }
          </style>
        </head>
        <body style="margin:0; padding:0; background:#f4f6f9; font-family:'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; color:#334155;">
          <div style="max-width:580px; margin:20px auto; background:#ffffff; border-radius:16px; overflow:hidden; border:1px solid #e2e8f0; box-shadow:0 4px 12px rgba(0,0,0,0.05);">
            <div class="mobile-header" style="background:#012970; padding:28px 32px; color:#ffffff;">
              <h1 style="margin:0; font-size:22px; font-weight:800; letter-spacing:-0.5px;">Account Password Reset 🔑</h1>
              <p style="margin:6px 0 0; color:#93c5fd; font-size:14px; font-weight:500;">Buoyant Media Exhibitor Portal</p>
            </div>

            <div class="mobile-padding" style="padding:28px 32px;">
              <p style="font-size:15px; color:#1e293b; margin:0 0 16px; line-height:1.6;">
                Dear <strong>${safeToName}</strong>,
              </p>
              <p style="font-size:14px; line-height:1.6; color:#475569; margin:0 0 24px;">
                We received a request to set up or reset your password for your Buoyant Media account. Click the button below to establish your secure password.
              </p>

              <div style="text-align:center; margin:28px 0;">
                <a href="${safeResetUrl}" target="_blank" style="display:inline-block; background:#2563eb; color:#ffffff; font-weight:700; font-size:14px; text-decoration:none; padding:12px 28px; border-radius:8px; box-shadow:0 2px 4px rgba(37,99,235,0.2);">
                  Reset My Password
                </a>
              </div>

              <p style="margin:16px 0 0; text-align:center; font-size:11px; color:#64748b; word-break:break-all;">
                Direct Link: <a href="${safeResetUrl}" style="color:#2563eb; text-decoration:underline;">${safeResetUrl}</a>
              </p>

              <div style="margin-top:24px; background:#f8fafc; border:1px solid #e2e8f0; border-radius:8px; padding:14px; font-size:12px; color:#64748b; line-height:1.5;">
                🔒 <strong>Security Notice:</strong> This single-use link will expire in 1 hour. If you did not request a password reset, you can safely disregard this email; your existing password will remain unchanged.
              </div>
            </div>

            <div style="background:#f8fafc; padding:18px 32px; text-align:center; color:#94a3b8; font-size:12px; border-top:1px solid #f1f5f9;">
              This is an automated security notification from Buoyant Media Exhibition Platform.
            </div>
          </div>
        </body>
      </html>
    `;

    const maxAttempts = 3;
    let lastError: any = null;
    const currentTransporter = getEmailTransporter();

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        const info = await currentTransporter.sendMail({
          from: `"Buoyant Media Security" <${user}>`,
          to: payload.toEmail,
          subject: 'Reset Your Buoyant Exhibitor Account Password',
          html,
        });

        console.log(`✅ [EMAIL SERVICE] Password reset email accepted by SMTP server for: ${payload.toEmail} (MessageId: ${info.messageId})`);
        return {
          status: 'ACCEPTED',
          messageId: info.messageId,
          attempts: attempt,
        };
      } catch (err: any) {
        lastError = err;
        console.error(`⚠️ [EMAIL SERVICE] Attempt ${attempt}/${maxAttempts} failed to deliver password reset to ${payload.toEmail}:`, err?.message || err);
        if (attempt < maxAttempts) {
          await new Promise((res) => setTimeout(res, 200));
        }
      }
    }

    return {
      status: 'FAILED',
      attempts: maxAttempts,
      error: lastError?.message || 'SMTP_DELIVERY_FAILED',
    };
  }

  static async sendAdminPasswordResetNotificationEmail(
    payload: AdminPasswordResetNotificationPayload
  ): Promise<EmailDeliveryResult> {
    console.log(`✉️ [EMAIL SERVICE] Dispatching admin password update notification email to: ${payload.toEmail}`);

    const safeToName = escapeHtml(payload.toName);
    const safeToEmail = escapeHtml(payload.toEmail);
    const safeUsername = payload.username ? escapeHtml(payload.username) : safeToEmail;
    const safePassword = payload.password ? escapeHtml(payload.password) : null;
    const loginUrl = `${resolveClientOrigin()}/login`;
    const safeLoginUrl = escapeHtml(loginUrl);

    const user = getSmtpUser();
    if (!user) {
      const isProd = env.NODE_ENV === 'production' || process.env.NODE_ENV === 'production';
      if (isProd) {
        console.warn(`⚠️ [EMAIL SERVICE] SMTP_USER is not configured in production. Password update email delivery failed for: ${payload.toEmail}`);
        return { status: 'FAILED', error: 'SMTP_NOT_CONFIGURED', attempts: 0 };
      }
      console.warn(`⚠️ [EMAIL SERVICE] SMTP_USER is not configured in environment. Password update email skipped for: ${payload.toEmail}`);
      return { status: 'SKIPPED', error: 'SMTP_NOT_CONFIGURED', attempts: 0 };
    }

    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
          <style>
            @media only screen and (max-width: 480px) {
              .mobile-padding { padding: 20px 16px !important; }
              .mobile-header { padding: 20px 16px !important; }
              .mobile-table td { display: block !important; width: 100% !important; padding: 4px 0 !important; }
            }
          </style>
        </head>
        <body style="margin:0; padding:0; background:#f4f6f9; font-family:'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; color:#334155;">
          <div style="max-width:580px; margin:20px auto; background:#ffffff; border-radius:16px; overflow:hidden; border:1px solid #e2e8f0; box-shadow:0 4px 12px rgba(0,0,0,0.05);">
            <div class="mobile-header" style="background:#012970; padding:28px 32px; color:#ffffff;">
              <h1 style="margin:0; font-size:22px; font-weight:800; letter-spacing:-0.5px;">Account Password Reset 🔑</h1>
              <p style="margin:6px 0 0; color:#93c5fd; font-size:14px; font-weight:500;">Buoyant Media Portal Login Credentials</p>
            </div>

            <div class="mobile-padding" style="padding:28px 32px;">
              <p style="font-size:15px; color:#1e293b; margin:0 0 16px; line-height:1.6;">
                Dear <strong>${safeToName}</strong>,
              </p>
              <p style="font-size:14px; line-height:1.6; color:#475569; margin:0 0 20px;">
                Your account password has been updated by an administrator. Please log in to the Buoyant Media portal using the credentials provided below:
              </p>

              <!-- CREDENTIALS BOX -->
              <div style="background:#eef2ff; border:1px solid #c7d2fe; border-radius:12px; padding:20px; margin-bottom:24px;">
                <h3 style="margin:0 0 12px; font-size:13px; font-weight:800; color:#1e40af; text-transform:uppercase; letter-spacing:0.8px;">LOGIN CREDENTIALS</h3>

                <table class="mobile-table" width="100%" cellpadding="6" cellspacing="0" style="font-size:13px; margin-bottom:12px; border-collapse:collapse;">
                  <tr>
                    <td style="color:#475569; font-weight:500; width:40%;">Account Username:</td>
                    <td style="color:#0f172a; font-weight:700;">${safeUsername}</td>
                  </tr>
                  <tr>
                    <td style="color:#475569; font-weight:500; width:40%;">Registered Email:</td>
                    <td style="color:#0f172a; font-weight:700;">${safeToEmail}</td>
                  </tr>
                  ${safePassword ? `
                  <tr>
                    <td style="color:#475569; font-weight:500; width:40%;">New Password:</td>
                    <td style="color:#0f172a; font-family:Consolas, Monaco, monospace; font-size:14px; font-weight:700; background:#ffffff; padding:6px 12px; border-radius:6px; border:1px solid #cbd5e1; display:inline-block;">${safePassword}</td>
                  </tr>
                  ` : ''}
                </table>

                <div style="text-align:center; margin-top:20px;">
                  <a href="${safeLoginUrl}" target="_blank" style="display:inline-block; background:#2563eb; color:#ffffff; font-weight:700; font-size:14px; text-decoration:none; padding:12px 28px; border-radius:8px; box-shadow:0 2px 4px rgba(37,99,235,0.2);">
                    Log In to Portal
                  </a>
                </div>
              </div>

              ${safePassword ? `
              <div style="background:#fef3c7; border:1px solid #fde68a; border-radius:8px; padding:14px; font-size:12px; color:#92400e; line-height:1.5; margin-bottom:16px;">
                ⚠️ <strong>Security Recommendation:</strong> For your security, we strongly recommend logging in and updating your password immediately after sign-in. Never share your password or credentials with unauthorized individuals.
              </div>
              ` : ''}

              <div style="background:#f8fafc; border:1px solid #e2e8f0; border-radius:8px; padding:14px; font-size:12px; color:#64748b; line-height:1.5;">
                🔒 <strong>Security Notice:</strong> If you did not request or expect this change, please contact the Buoyant Media administration team immediately.
              </div>
            </div>

            <div style="background:#f8fafc; padding:18px 32px; text-align:center; color:#94a3b8; font-size:12px; border-top:1px solid #f1f5f9;">
              This is an automated administrative notification from Buoyant Media Exhibition Platform.
            </div>
          </div>
        </body>
      </html>
    `;

    const maxAttempts = 3;
    let lastError: any = null;
    const currentTransporter = getEmailTransporter();

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        const info = await currentTransporter.sendMail({
          from: `"Buoyant Media Security" <${user}>`,
          to: payload.toEmail,
          subject: 'Your Buoyant Media Account Password Has Been Updated',
          html,
        });

        console.log(`✅ [EMAIL SERVICE] Password update notification email accepted by SMTP server for: ${payload.toEmail} (MessageId: ${info.messageId})`);
        return {
          status: 'ACCEPTED',
          messageId: info.messageId,
          attempts: attempt,
        };
      } catch (err: any) {
        lastError = err;
        console.error(`⚠️ [EMAIL SERVICE] Attempt ${attempt}/${maxAttempts} failed to deliver password update to ${payload.toEmail}:`, err?.message || err);
        if (attempt < maxAttempts) {
          await new Promise((res) => setTimeout(res, 200));
        }
      }
    }

    return {
      status: 'FAILED',
      attempts: maxAttempts,
      error: lastError?.message || 'SMTP_DELIVERY_FAILED',
    };
  }

  static isConfigured(): boolean {
    return isSmtpConfigured();
  }

    static async sendPaymentReminderEmail(
  payload: PaymentReminderEmailPayload
) {
  const paymentUrl = `${
    process.env.CLIENT_URL || "http://localhost:5173"
  }/login`;

  const TIME_ZONE = "Asia/Kolkata";

  // 1. Parse the actual payment due date.
  const dueDate =
    typeof payload.nextPaymentDate === "string"
      ? DateTime.fromISO(payload.nextPaymentDate, {
          zone: "utc",
        })
      : DateTime.fromJSDate(payload.nextPaymentDate, {
          zone: "utc",
        });

  if (!dueDate.isValid) {
    throw new Error("Invalid next payment date.");
  }

  // 2. Convert the due date to IST.
  const dueDateIST = dueDate.setZone(TIME_ZONE);

  // 3. Compare calendar dates in IST.
  const todayIST = DateTime.now()
    .setZone(TIME_ZONE)
    .startOf("day");

  const dueDateOnlyIST = dueDateIST.startOf("day");

  const isOverdue =
    dueDateOnlyIST.toMillis() < todayIST.toMillis();

  const isDueToday =
    dueDateOnlyIST.toMillis() === todayIST.toMillis();

  // 4. Format the due date in IST.
  const formattedDueDate = dueDateIST.toLocaleString({
    day: "2-digit",
    month: "long",
    year: "numeric",
  });

  // 5. Set the email subject and message.
  let emailSubject: string;
  let emailMessage: string;
  let emailHeading: string;

  if (isOverdue) {
    emailSubject = `Overdue Payment Reminder - ${payload.bookingReference}`;
    emailHeading = "Overdue Payment Reminder";

    emailMessage = `
      Our records indicate that your payment was due on
      <strong>${formattedDueDate}</strong> and remains outstanding.
      Please complete the payment as soon as possible.
    `;
  } else if (isDueToday) {
    emailSubject = `Payment Due Today - ${payload.bookingReference}`;
    emailHeading = "Payment Due Today";

    emailMessage = `
      Your payment is due today,
      <strong>${formattedDueDate}</strong>.
      Please complete the payment today to avoid further delay.
    `;
  } else {
    emailSubject = `Payment Reminder - ${payload.bookingReference}`;
    emailHeading = "Payment Reminder";

    emailMessage = `
      This is a friendly reminder that your booking has an
      outstanding payment. Please complete the payment by
      <strong>${formattedDueDate}</strong>.
    `;
  }

  // 6. Build the email HTML.
  const html = `
    <!DOCTYPE html>
    <html>
      <body style="margin:0;padding:24px;background:#f4f6f9;
        font-family:Arial,sans-serif;color:#334155;">

        <div style="max-width:560px;margin:auto;background:#fff;
          border:1px solid #e2e8f0;border-radius:12px;overflow:hidden;">

          <div style="background:#012970;color:#fff;padding:24px;">
            <h2 style="margin:0;">
              ${emailHeading}
            </h2>
            <p style="margin-bottom:0;">
              Buoyant Media Exhibition Booking
            </p>
          </div>

          <div style="padding:24px;">
            <p>Dear <strong>${payload.toName}</strong>,</p>

            <p>${emailMessage}</p>

            <table style="width:100%;border-collapse:collapse;">
              <tr>
                <td style="padding:10px;border-bottom:1px solid #eee;">
                  Booking Reference
                </td>
                <td style="padding:10px;border-bottom:1px solid #eee;">
                  <strong>${payload.bookingReference}</strong>
                </td>
              </tr>
              <tr>
                <td style="padding:10px;border-bottom:1px solid #eee;">
                  Booked Stalls
                </td>
                <td style="padding:10px;border-bottom:1px solid #eee;">
                  <strong>${payload.stallDetails}</strong>
                </td>
             </tr>
              <tr>
                <td style="padding:10px;border-bottom:1px solid #eee;">
                  Exhibition
                </td>
                <td style="padding:10px;border-bottom:1px solid #eee;">
                  ${payload.exhibitionTitle}
                </td>
              </tr>

              <tr>
                <td style="padding:10px;border-bottom:1px solid #eee;">
                  Outstanding Balance
                </td>
                <td style="padding:10px;border-bottom:1px solid #eee;
                  color:#dc2626;">
                  <strong>
                    ₹${this.formatINR(payload.remainingBalance)}
                  </strong>
                </td>
              </tr>

              <tr>
                <td style="padding:10px;">Payment Due Date</td>
                <td style="padding:10px;">
                  <strong>${formattedDueDate}</strong>
                </td>
              </tr>
            </table>

            <div style="text-align:center;margin:28px 0;">
              <a href="${paymentUrl}"
                style="background:#012970;color:#fff;padding:12px 24px;
                border-radius:6px;text-decoration:none;display:inline-block;">
                Log In to Complete Payment
              </a>
            </div>

            <p style="font-size:13px;color:#64748b;">
              If you have already completed the payment, please disregard
              this reminder. If you need assistance, contact our team.
            </p>
          </div>
        </div>
      </body>
    </html>
  `;

  // 7. Validate SMTP configuration.
  if (!process.env.SMTP_USER) {
    throw new Error(
      "SMTP_USER is not configured. Email was not sent."
    );
  }

  // 8. Send the email.
  await transporter.sendMail({
    from: `"Buoyant Media" <${process.env.SMTP_USER}>`,
    to: payload.toEmail,
    subject: emailSubject,
    html,
  });

  console.log(
    `[EMAIL SERVICE] ${emailHeading} sent to ${payload.toEmail}`
  );

  return true;
}
}
