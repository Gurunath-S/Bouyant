import { env } from '../../../../config/env.js';
import { WhatsAppMessagePayload } from './whatsapp.types.js';

export interface BookingNotificationData {
  customerName: string;
  companyName: string;
  exhibitionTitle: string;
  bookingRef: string;
  stalls: string[];
  amount: number;
  paidAmount?: number;
  balanceAmount?: number;
  invoiceNumber?: string;
  paymentRef?: string;
}

export interface AdminAlertNotificationData {
  eventTitle: string;
  companyName: string;
  contactPerson: string;
  bookingRef?: string;
  amount?: number;
  stalls?: string[];
  alertType: 'NEW_BOOKING' | 'PAYMENT_RECEIVED' | 'PAYMENT_FAILED';
}

export class WhatsAppTemplates {
  /**
   * Helper to build a standard Meta WhatsApp API template payload
   */
  private static buildPayload(
    toPhone: string,
    templateName: string,
    bodyParameters: string[]
  ): WhatsAppMessagePayload {
    return {
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to: toPhone,
      type: 'template',
      template: {
        name: templateName,
        language: {
          code: env.WHATSAPP_TEMPLATE_LANGUAGE || 'en',
        },
        components: [
          {
            type: 'body',
            parameters: bodyParameters.map((param) => ({
              type: 'text',
              text: param || '',
            })),
          },
        ],
      },
    };
  }

  static bookingCreated(toPhone: string, data: BookingNotificationData): WhatsAppMessagePayload {
    // Parameters: {{1}} Customer, {{2}} Exhibition, {{3}} Stalls, {{4}} BookingRef, {{5}} Total Amount
    return this.buildPayload(toPhone, env.WHATSAPP_TEMPLATE_BOOKING_CREATED, [
      data.customerName,
      data.exhibitionTitle,
      data.stalls.join(', '),
      data.bookingRef,
      `₹${data.amount.toLocaleString('en-IN')}`,
    ]);
  }

  static paymentSuccess(toPhone: string, data: BookingNotificationData): WhatsAppMessagePayload {
    // Parameters: {{1}} Customer, {{2}} BookingRef, {{3}} Amount Paid, {{4}} Exhibition, {{5}} Stalls, {{6}} Remaining Balance
    const paidStr = `₹${(data.paidAmount ?? data.amount).toLocaleString('en-IN')}`;
    const balanceStr = `₹${(data.balanceAmount ?? 0).toLocaleString('en-IN')}`;
    return this.buildPayload(toPhone, env.WHATSAPP_TEMPLATE_PAYMENT_SUCCESS, [
      data.customerName,
      data.bookingRef,
      paidStr,
      data.exhibitionTitle,
      data.stalls.join(', '),
      balanceStr,
    ]);
  }

  static bookingConfirmed(toPhone: string, data: BookingNotificationData): WhatsAppMessagePayload {
    // Parameters: {{1}} Customer, {{2}} Exhibition, {{3}} Stalls, {{4}} BookingRef
    return this.buildPayload(toPhone, env.WHATSAPP_TEMPLATE_BOOKING_CONFIRMED, [
      data.customerName,
      data.exhibitionTitle,
      data.stalls.join(', '),
      data.bookingRef,
    ]);
  }

  static paymentFailed(toPhone: string, data: BookingNotificationData): WhatsAppMessagePayload {
    // Parameters: {{1}} Customer, {{2}} BookingRef, {{3}} Exhibition
    return this.buildPayload(toPhone, env.WHATSAPP_TEMPLATE_PAYMENT_FAILED, [
      data.customerName,
      data.bookingRef,
      data.exhibitionTitle,
    ]);
  }

  static bookingExpired(toPhone: string, data: BookingNotificationData): WhatsAppMessagePayload {
    // Parameters: {{1}} Customer, {{2}} BookingRef, {{3}} Exhibition
    return this.buildPayload(toPhone, env.WHATSAPP_TEMPLATE_BOOKING_EXPIRED, [
      data.customerName,
      data.bookingRef,
      data.exhibitionTitle,
    ]);
  }

  static invoiceGenerated(toPhone: string, data: BookingNotificationData): WhatsAppMessagePayload {
    // Parameters: {{1}} Customer, {{2}} InvoiceNumber, {{3}} BookingRef, {{4}} Exhibition
    return this.buildPayload(toPhone, env.WHATSAPP_TEMPLATE_INVOICE_GENERATED, [
      data.customerName,
      data.invoiceNumber || 'INV-PENDING',
      data.bookingRef,
      data.exhibitionTitle,
    ]);
  }

  static adminAlert(toPhone: string, data: AdminAlertNotificationData): WhatsAppMessagePayload {
    // Parameters: {{1}} AlertType, {{2}} Event, {{3}} Company, {{4}} Contact, {{5}} Ref/Amount
    const detailStr = data.amount
      ? `Amount: ₹${data.amount.toLocaleString('en-IN')} (Ref: ${data.bookingRef || 'N/A'})`
      : `Booking Ref: ${data.bookingRef || 'N/A'}`;

    return this.buildPayload(toPhone, env.WHATSAPP_TEMPLATE_ADMIN_ALERT, [
      data.alertType,
      data.eventTitle,
      data.companyName,
      data.contactPerson,
      detailStr,
    ]);
  }
}
