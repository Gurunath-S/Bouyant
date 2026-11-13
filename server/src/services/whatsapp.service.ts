import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import { DateTime } from "luxon";
import { getStallAreaSqMt } from '../utils/stallArea.js';

export interface SendConfirmationParams {
  booking: any;
  payment: any;
  invoice: any;
  paymentAmount: number;
  balanceAmount?: number; // 👈 Add this
  nextPaymentDate?: Date | string | null; // 👈 Add this
}

export interface PaymentReminderPayload {
  contactPerson:string;
  mobile:string;
  exhibitionName:string;
  bookingReference:string;
  paymentAmount: number;
  nextPaymentDate: Date|string;
  stallDetails:string;
}

export class WhatsappService {

  /**
   * Generate a secure, short-lived (15 minutes) signed URL for WhatsApp/AskEva download
   */

   private static readonly API_BASE = 'https://backend.askeva.io/v1/message/send-message';

  static generateSignedDownloadUrl(invoiceId: string, bookingId: string): string {
    const token = jwt.sign(
      { invoiceId, bookingId, purpose: 'INVOICE_DOWNLOAD' },
      env.JWT_SECRET,
      { expiresIn: '15m' } // Valid for 15 minutes
    );

    const baseUrl = env.API_BASE_URL || `http://localhost:${env.PORT}`;
    return `${baseUrl}/api/v1/invoices/public/${invoiceId}/pdf?token=${token}`;
  }

  /**       
   * Validate token from query param
   */
  static verifySignedToken(token: string, invoiceId: string): boolean {
    try {
      const decoded: any = jwt.verify(token, env.JWT_SECRET);
      return decoded.purpose === 'INVOICE_DOWNLOAD' && decoded.invoiceId === invoiceId;
    } catch {
      return false;
    }
  }

   static async sendBookingConfirmation(params: SendConfirmationParams): Promise<void> {
    const { booking, invoice, paymentAmount, balanceAmount = 0, nextPaymentDate } = params;
    try {
      const askEvaToken = process.env.ASKEVA_TOKEN;
      if (!askEvaToken) {
        console.warn('⚠️ [ASKEVA] ASKEVA_TOKEN is not set in environment. Skipping WhatsApp dispatch.');
        return;
      }
      // 1. Reusable Phone number validation
      const rawPhone = (booking.company?.mobile || booking.company?.phone || '').replace(/[^0-9]/g, '');
      if (!rawPhone || rawPhone.length < 10) {
        console.warn(`⚠️ [ASKEVA] Invalid or missing phone number for company "${booking.company?.name}". Skipping.`);
        return;
      }
      const formattedPhone = rawPhone.startsWith('91') && rawPhone.length > 10 ? rawPhone : `91${rawPhone.slice(-10)}`;
      // 2. Generate secure 15-min signed download link
      const downloadUrl = this.generateSignedDownloadUrl(invoice.id, booking.id);
      // 3. Format stall numbers & dimensions (Common reuse)
      const stallNumbers = (booking.stalls || [])
        .map((s: any) => s.stall?.stallNumber || s.stallId)
        .join(', ') || 'N/A';
      const stallDimensions = (booking.stalls || [])
        .map((s: any) => {
          const stall = s.stall;
          if (!stall) return 'Standard';
          const sqmt = getStallAreaSqMt(stall);
          if (stall.actualWidth && stall.actualHeight) {
            return `${stall.actualWidth}m × ${stall.actualHeight}m (${sqmt} Sq.Mt)`;
          }
          return `${sqmt} Sq.Mt`;
        })
        .join(', ') || 'Standard';
      // 4. Decide Template: Partial vs Full Settlement
      const isPartial = balanceAmount > 0;
      const templateName = isPartial ? 'invoice_partial' : 'invoice';
      // Common 6 parameters
      const bodyParameters: Array<{ type: 'text'; text: string }> = [
        { type: 'text', text: booking.company?.contactPerson || booking.company?.name || 'Customer' },
        { type: 'text', text: booking.exhibition?.title || 'Exhibition' },
        { type: 'text', text: booking.bookingReference },
        { type: 'text', text: stallNumbers },
        { type: 'text', text: stallDimensions },
        { type: 'text', text: Math.round(paymentAmount).toString() },
      ];
      // If Partial payment: Add remaining balance & due date (7th & 8th parameters)
      if (isPartial) {
        let formattedDueDate = 'To be decided';
        if (nextPaymentDate) {
          const dueDate =
            typeof nextPaymentDate === 'string'
              ? DateTime.fromISO(nextPaymentDate, { zone: 'utc' })
              : DateTime.fromJSDate(new Date(nextPaymentDate), { zone: 'utc' });
          if (dueDate.isValid) {
            formattedDueDate = dueDate.setZone('Asia/Kolkata').toLocaleString({
              day: '2-digit',
              month: 'long',
              year: 'numeric',
            });
          }
        }
        bodyParameters.push(
          { type: 'text', text: Math.round(balanceAmount).toString() }, // 7. Balance
          { type: 'text', text: formattedDueDate }                     // 8. Due Date
        );
      }
      // 5. Construct AskEva Payload
      const payload = {
        to: formattedPhone,
        type: 'template',
        template: {
          language: {
            policy: 'deterministic',
            code: 'en',
          },
          name: templateName,
          components: [
            {
              type: 'header',
              parameters: [
                {
                  type: 'document',
                  document: {
                    link: downloadUrl,
                    filename: `Invoice-${booking.bookingReference}.pdf`,
                  },
                },
              ],
            },
            {
              type: 'body',
              parameters: bodyParameters,
            },
          ],
        },
      };
      // 6. Send Request
      const response = await fetch(`${this.API_BASE}?token=${askEvaToken}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const responseData = await response.json();
      if (!response.ok) {
        console.error('❌ [ASKEVA WHATSAPP ERROR]:', responseData);
      } else {
        console.log(`✅ [ASKEVA WHATSAPP SENT] [Template: ${templateName}] to ${formattedPhone} for booking ${booking.bookingReference}`);
      }
    } catch (err: any) {
      console.error('⚠️ [ASKEVA DISPATCH EXCEPTION]:', err?.message || err);
    }
  }


static async sendWhatsappRemainder(
  params: PaymentReminderPayload
): Promise<void> {
  const {
    contactPerson,
    mobile,
    exhibitionName,
    bookingReference,
    paymentAmount,
    nextPaymentDate,
    stallDetails

  } = params;

  const askEvaToken = process.env.ASKEVA_TOKEN;

  if (!askEvaToken) {
    throw new Error("ASKEVA_TOKEN is not configured");
  }

  try {
    // 1. Format and validate the recipient phone number.
    // Pass the company mobile number into the function.

    const digits = String(mobile ?? "").replace(/\D/g, "");

    let nationalNumber: string;

    if (digits.length === 10) {
      nationalNumber = digits;
    } else if (digits.length === 12 && digits.startsWith("91")) {
      nationalNumber = digits.slice(2);
    } else {
      throw new Error(
        `Invalid WhatsApp number for booking ${bookingReference}`
      );
    }

   const formattedPhone = `91${nationalNumber}`;

const TIME_ZONE = "Asia/Kolkata";

const dueDate =
  typeof nextPaymentDate === "string"
    ? DateTime.fromISO(nextPaymentDate, { zone: "utc" })
    : DateTime.fromJSDate(nextPaymentDate, { zone: "utc" });

if (!dueDate.isValid) {
  throw new Error("Invalid next payment date.");
}

const dueDateIST = dueDate.setZone(TIME_ZONE);

const formattedDueDate = dueDateIST.toLocaleString({
  day: "2-digit",
  month: "long",
  year: "numeric",
});

    // 2. Build the AskEva reminder template payload.
    const payload = {
      to: formattedPhone,
      type: "template",
      template: {
        language: {
          policy: "deterministic",
          code: "en",
        },
        name: "reminder",
        components: [
          {
            type: "body",
              parameters: [
  {
    type: "text",
    text: contactPerson || "Customer",
  },
  {
    type: "text",
    text: exhibitionName,
  },
  {
    type: "text",
    text: "Stall Booking Payment",
  },
  {
    type: "text",
    text: bookingReference,
  },
  {
    type: "text",
    text: stallDetails,
  },
  {
    type: "text",
    text: paymentAmount.toFixed(2),
  },
  {
    type: "text",
    text: formattedDueDate,
  },

],
          },
        ],
      },
    };

    // 3. Send the WhatsApp message.
    const response = await fetch(
      `${this.API_BASE}?token=${askEvaToken}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      }
    );

    const responseText = await response.text();

    if (!response.ok) {
      throw new Error(
        `AskEva API error (${response.status}): ${responseText}`
      );
    }

    console.log(
      `[ASKEVA] Payment reminder submitted for booking ${bookingReference}`
    );
  } catch (error) {
    console.error(
      `[ASKEVA] Payment reminder failed for ${bookingReference}:`,
      error
    );

    throw error;
  }
}


}