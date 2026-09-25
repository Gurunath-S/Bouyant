import { prisma } from '../config/db.js';

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
  /**
   * Sends / logs invoice email along with login credentials to the exhibitor
   */
  static async sendInvoiceAndCredentialsEmail(payload: InvoiceEmailPayload) {
    const credentialsBlock = payload.temporaryPassword
      ? `
==================================================
🔑 YOUR LOGIN CREDENTIALS
Email: ${payload.toEmail}
Temporary Password: ${payload.temporaryPassword}
Portal URL: http://localhost:3000/login
==================================================
`
      : `
==================================================
🔑 ACCOUNT DETAILS
Log in with your registered email: ${payload.toEmail}
==================================================
`;

    const emailBody = `
Dear ${payload.toName},

Thank you for reserving stall(s) at ${payload.exhibitionTitle}!

==================================================
📄 TAX INVOICE & BOOKING CONFIRMATION
Invoice Number: ${payload.invoiceNumber}
Booking Reference: ${payload.bookingRef}
Company Name: ${payload.companyName}
Reserved Stalls: ${payload.stalls.join(', ')}
Total Paid: ₹${payload.grandTotal.toLocaleString()} INR
==================================================
${credentialsBlock}

You can log in to your account dashboard anytime to view invoice details, download official event passes, and track booking status.

Best regards,
Buoyant Media Exhibition Team
`;

    console.log(`\n✉️ [EMAIL SERVICE] Dispatching Exhibitor Confirmation Email to: ${payload.toEmail}`);
    console.log(emailBody);
    return true;
  }

  /**
   * Sends / logs real-time alert email to Designated Event Administrators / Recipients
   */
  static async sendAdminAlert(payload: AdminNotificationPayload) {
    let recipientEmails = '';

    if (payload.customRecipients) {
      if (Array.isArray(payload.customRecipients)) {
        recipientEmails = payload.customRecipients.filter(Boolean).join(', ');
      } else if (typeof payload.customRecipients === 'string') {
        recipientEmails = payload.customRecipients.trim();
      }
    }

    // If no custom recipient specified for this exhibition, fallback to all system admins
    if (!recipientEmails) {
      const admins = await prisma.user.findMany({
        where: { role: { in: ['ADMIN', 'SUPERADMIN'] } },
        select: { email: true, name: true },
      });
      recipientEmails = admins.map((a) => a.email).join(', ') || 'admin@buoyant.com';
    }

    let subject = '';
    let body = '';

    if (payload.type === 'COMPANY_REGISTERED') {
      subject = `🏢 [ADMIN ALERT] New Company Registered: ${payload.companyName} (${payload.exhibitionTitle || 'Exhibition'})`;
      body = `
Administrator Alert:

A new corporate exhibitor has registered during the stall booking process.

Event: ${payload.exhibitionTitle || 'Exhibition'}
Company Name: ${payload.companyName}
Contact Person: ${payload.contactPerson}
Email Address: ${payload.email}
Mobile Number: ${payload.mobile}
Registered At: ${new Date().toLocaleString()}
`;
    } else if (payload.type === 'PAYMENT_RECEIVED') {
      subject = `💰 [ADMIN ALERT] Payment Received: ₹${payload.amount?.toLocaleString()} - ${payload.companyName}`;
      body = `
Administrator Alert:

Stall booking payment confirmed for ${payload.exhibitionTitle || 'Exhibition'}.

Event: ${payload.exhibitionTitle || 'Exhibition'}
Company: ${payload.companyName}
Contact: ${payload.contactPerson} (${payload.email}, ${payload.mobile})
Booking Ref: ${payload.bookingRef}
Invoice #: ${payload.invoiceNumber}
Stalls Reserved: ${payload.stalls?.join(', ')}
Amount Paid: ₹${payload.amount?.toLocaleString()} INR
`;
    }

    console.log(`\n📢 [ADMIN EMAIL ALERT] Dispatching to Designated Recipients (${recipientEmails}):`);
    console.log(`Subject: ${subject}`);
    console.log(body);

    return true;
  }
}
