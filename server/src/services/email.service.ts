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

    const loginUrl = `${process.env.CLIENT_URL || 'http://localhost:5173'}/login`;

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
              <h1 style="margin:0; font-size:22px; font-weight:800; tracking-tight: -0.5px;">Booking Confirmed 🎉</h1>
              <p style="margin:6px 0 0; color:#93c5fd; font-size:14px; font-weight:500;">${payload.exhibitionTitle}</p>
            </div>

            <div class="mobile-padding" style="padding:28px 32px;">
              <p style="font-size:15px; color:#1e293b; margin:0 0 16px; line-height:1.6;">
                Dear <strong>${payload.toName}</strong>,
              </p>
              <p style="font-size:14px; line-height:1.6; color:#475569; margin:0 0 24px;">
                Thank you for reserving stall(s) at <strong>${payload.exhibitionTitle}</strong>.
                Your payment has been successfully processed and your reservation is confirmed.
              </p>

              <!-- BOOKING SUMMARY BOX -->
              <div style="background:#f8fafc; border:1px solid #e2e8f0; border-radius:12px; padding:20px; margin-bottom:24px;">
                <h3 style="font-size:12px; font-weight:800; color:#012970; text-transform:uppercase; letter-spacing:0.8px; margin:0 0 14px; border-b:1px solid #cbd5e1; padding-bottom:8px;">BOOKING SUMMARY</h3>

                <table class="mobile-table" width="100%" cellpadding="6" cellspacing="0" style="font-size:13px; border-collapse:collapse;">
                  <tr>
                    <td style="color:#64748b; font-weight:500; vertical-align:top; width:45%;">Company Name</td>
                    <td align="right" style="color:#0f172a; font-weight:700; vertical-align:top; width:55%;">${payload.companyName}</td>
                  </tr>
                  <tr>
                    <td style="color:#64748b; font-weight:500; vertical-align:top;">Booking Reference</td>
                    <td align="right" style="color:#6366f1; font-weight:800; font-family:monospace; font-size:14px; vertical-align:top;">${payload.bookingReference}</td>
                  </tr>
                  <tr>
                    <td style="color:#64748b; font-weight:500; vertical-align:top;">Allocated Stall(s)</td>
                    <td align="right" style="color:#0f172a; font-weight:700; vertical-align:top;">
                      ${payload.stalls.map((s) => `<div>${s.stallNumber} <span style="font-weight:normal; color:#64748b; font-size:12px;">(${s.category})</span></div>`).join('')}
                    </td>
                  </tr>
                  <tr>
                    <td style="color:#64748b; font-weight:500; vertical-align:top;">Payment Status</td>
                    <td align="right" style="color:#0f172a; font-weight:700; vertical-align:top;">${paymentText}</td>
                  </tr>
                  <tr>
                    <td style="color:#64748b; font-weight:500; vertical-align:top;">Amount Paid</td>
                    <td align="right" style="color:#059669; font-weight:800; font-size:14px; vertical-align:top;">₹${this.formatINR(payload.paymentAmount)}</td>
                  </tr>
                  ${isPartialPayment ? `
                  <tr>
                    <td style="color:#64748b; font-weight:500; vertical-align:top;">Remaining Balance</td>
                    <td align="right" style="color:#dc2626; font-weight:800; font-size:14px; vertical-align:top;">₹${this.formatINR(payload.remainingBalance)}</td>
                  </tr>
                  ` : ''}
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
                    <td style="color:#0f172a; font-weight:700;">${payload.userName || payload.toEmail}</td>
                  </tr>
                  ${payload.temporaryPassword ? `
                  <tr>
                    <td style="color:#475569; font-weight:500;">Temporary Password:</td>
                    <td style="color:#1d4ed8; font-weight:800; font-family:monospace; font-size:15px;">${payload.temporaryPassword}</td>
                  </tr>
                  ` : `
                  <tr>
                    <td style="color:#475569; font-weight:500;">Password:</td>
                    <td style="color:#64748b; font-style:italic;">Your account password set during registration</td>
                  </tr>
                  `}
                </table>

                <!-- PROMINENT BUTTON -->
                <div style="text-align:center; margin-top:20px;">
                  <a href="${loginUrl}" target="_blank" style="display:inline-block; background:#2563eb; color:#ffffff; font-weight:700; font-size:14px; text-decoration:none; padding:12px 28px; border-radius:8px; shadow:0 2px 4px rgba(37,99,235,0.2);">
                    Login to Exhibitor Portal
                  </a>
                </div>

                <p style="margin:14px 0 0; text-align:center; font-size:11px; color:#64748b; word-break:break-all;">
                  Direct Link: <a href="${loginUrl}" style="color:#2563eb; text-decoration:underline;">${loginUrl}</a>
                </p>
              </div>

              <p style="padding:14px; background:#f8fafc; border:1px solid #e2e8f0; border-radius:8px; font-size:13px; color:#64748b; margin:0; text-align:center;">
                ${payload.pdfBuffer ? '📄 Your official Tax Invoice PDF is attached to this email.' : ' You can download your official Tax Invoice PDF directly from your user dashboard.'}
              </p>
            </div>

            <div style="background:#f8fafc; padding:18px 32px; text-align:center; color:#94a3b8; font-size:12px; border-t:1px solid #f1f5f9;">
              This is an automated booking confirmation from Buoyant Media.
            </div>
          </div>
        </body>
      </html>
    `;

    console.log(`✉️ [EMAIL SERVICE] Sending confirmation email to: ${payload.toEmail}`);

    if (process.env.SMTP_USER) {
      const attachments = payload.pdfBuffer
        ? [
            {
              filename: `${payload.invoiceNumber}.pdf`,
              content: payload.pdfBuffer,
              contentType: 'application/pdf',
            },
          ]
        : [];

      await transporter.sendMail({
        from: `"Buoyant Media" <${process.env.SMTP_USER}>`,
        to: payload.toEmail,
        subject: `Booking Confirmed - ${payload.bookingReference}`,
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
              <p style="margin:4px 0 0; color:#c7d2fe; font-size:13px; font-weight:500;">${payload.exhibitionTitle}</p>
            </div>

            <div class="mobile-padding" style="padding:24px 32px;">
              <p style="font-size:14px; line-height:1.6; color:#475569; margin:0 0 20px;">
                A new payment has been processed for stall booking <strong>${payload.bookingReference}</strong> in <strong>${payload.exhibitionTitle}</strong>.
              </p>

              <!-- EXHIBITOR DETAILS -->
              <div style="background:#f8fafc; border:1px solid #e2e8f0; border-radius:12px; padding:18px; margin-bottom:18px;">
                <h3 style="font-size:11px; font-weight:800; color:#4338ca; text-transform:uppercase; letter-spacing:0.8px; margin:0 0 12px; border-bottom:1px solid #cbd5e1; padding-bottom:6px;">EXHIBITOR IDENTITY</h3>
                <table class="mobile-table" width="100%" cellpadding="4" cellspacing="0" style="font-size:13px;">
                  <tr>
                    <td style="color:#64748b; font-weight:500; width:45%;">Company Name</td>
                    <td align="right" style="color:#0f172a; font-weight:700; width:55%;">${payload.companyName}</td>
                  </tr>
                  ${payload.contactPerson ? `
                  <tr>
                    <td style="color:#64748b; font-weight:500;">Contact Person</td>
                    <td align="right" style="color:#0f172a; font-weight:600;">${payload.contactPerson}</td>
                  </tr>` : ''}
                  ${payload.email ? `
                  <tr>
                    <td style="color:#64748b; font-weight:500;">Email Address</td>
                    <td align="right" style="color:#0f172a; font-weight:600;">${payload.email}</td>
                  </tr>` : ''}
                  ${payload.phone ? `
                  <tr>
                    <td style="color:#64748b; font-weight:500;">Phone Number</td>
                    <td align="right" style="color:#0f172a; font-weight:600;">${payload.phone}</td>
                  </tr>` : ''}
                  ${payload.gstNumber ? `
                  <tr>
                    <td style="color:#64748b; font-weight:500;">GSTIN Tax ID</td>
                    <td align="right" style="color:#0f172a; font-weight:600; font-family:monospace;">${payload.gstNumber}</td>
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

    if (process.env.SMTP_USER) {
      const attachments = payload.pdfBuffer
        ? [
            {
              filename: `${payload.invoiceNumber}.pdf`,
              content: payload.pdfBuffer,
              contentType: 'application/pdf',
            },
          ]
        : [];

      await transporter.sendMail({
        from: `"Buoyant Media Admin Alert" <${process.env.SMTP_USER}>`,
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
}
