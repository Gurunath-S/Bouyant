import { WhatsAppClient } from './whatsapp.client.js';
import { WhatsAppTemplates, BookingNotificationData, AdminAlertNotificationData } from './whatsapp.templates.js';
import { normalizePhoneNumber } from '../../../../utils/phone.js';
import { WhatsAppSendResult } from './whatsapp.types.js';

export class WhatsAppService {
  /**
   * Send WhatsApp notification for Booking Created
   */
  static async sendBookingCreated(rawPhone: string, data: BookingNotificationData): Promise<WhatsAppSendResult> {
    const formattedPhone = normalizePhoneNumber(rawPhone);
    if (!formattedPhone) {
      console.warn(`⚠️ [WHATSAPP SERVICE] Invalid or missing phone number: "${rawPhone}". Skipping notification.`);
      return { success: false, error: 'INVALID_PHONE_NUMBER' };
    }
    const payload = WhatsAppTemplates.bookingCreated(formattedPhone, data);
    return await WhatsAppClient.sendMessage(payload);
  }

  /**
   * Send WhatsApp notification for Payment Success (Full or Partial)
   */
  static async sendPaymentSuccess(rawPhone: string, data: BookingNotificationData): Promise<WhatsAppSendResult> {
    const formattedPhone = normalizePhoneNumber(rawPhone);
    if (!formattedPhone) {
      console.warn(`⚠️ [WHATSAPP SERVICE] Invalid or missing phone number: "${rawPhone}". Skipping notification.`);
      return { success: false, error: 'INVALID_PHONE_NUMBER' };
    }
    const payload = WhatsAppTemplates.paymentSuccess(formattedPhone, data);
    return await WhatsAppClient.sendMessage(payload);
  }

  /**
   * Send WhatsApp notification for Booking Confirmed
   */
  static async sendBookingConfirmed(rawPhone: string, data: BookingNotificationData): Promise<WhatsAppSendResult> {
    const formattedPhone = normalizePhoneNumber(rawPhone);
    if (!formattedPhone) {
      console.warn(`⚠️ [WHATSAPP SERVICE] Invalid or missing phone number: "${rawPhone}". Skipping notification.`);
      return { success: false, error: 'INVALID_PHONE_NUMBER' };
    }
    const payload = WhatsAppTemplates.bookingConfirmed(formattedPhone, data);
    return await WhatsAppClient.sendMessage(payload);
  }

  /**
   * Send WhatsApp notification for Payment Failed
   */
  static async sendPaymentFailed(rawPhone: string, data: BookingNotificationData): Promise<WhatsAppSendResult> {
    const formattedPhone = normalizePhoneNumber(rawPhone);
    if (!formattedPhone) {
      console.warn(`⚠️ [WHATSAPP SERVICE] Invalid or missing phone number: "${rawPhone}". Skipping notification.`);
      return { success: false, error: 'INVALID_PHONE_NUMBER' };
    }
    const payload = WhatsAppTemplates.paymentFailed(formattedPhone, data);
    return await WhatsAppClient.sendMessage(payload);
  }

  /**
   * Send WhatsApp notification for Booking Expired
   */
  static async sendBookingExpired(rawPhone: string, data: BookingNotificationData): Promise<WhatsAppSendResult> {
    const formattedPhone = normalizePhoneNumber(rawPhone);
    if (!formattedPhone) {
      console.warn(`⚠️ [WHATSAPP SERVICE] Invalid or missing phone number: "${rawPhone}". Skipping notification.`);
      return { success: false, error: 'INVALID_PHONE_NUMBER' };
    }
    const payload = WhatsAppTemplates.bookingExpired(formattedPhone, data);
    return await WhatsAppClient.sendMessage(payload);
  }

  /**
   * Send WhatsApp notification for Invoice Generated
   */
  static async sendInvoiceGenerated(rawPhone: string, data: BookingNotificationData): Promise<WhatsAppSendResult> {
    const formattedPhone = normalizePhoneNumber(rawPhone);
    if (!formattedPhone) {
      console.warn(`⚠️ [WHATSAPP SERVICE] Invalid or missing phone number: "${rawPhone}". Skipping notification.`);
      return { success: false, error: 'INVALID_PHONE_NUMBER' };
    }
    const payload = WhatsAppTemplates.invoiceGenerated(formattedPhone, data);
    return await WhatsAppClient.sendMessage(payload);
  }

  /**
   * Send WhatsApp alert to Admin / Management staff
   */
  static async sendAdminAlert(rawPhone: string, data: AdminAlertNotificationData): Promise<WhatsAppSendResult> {
    const formattedPhone = normalizePhoneNumber(rawPhone);
    if (!formattedPhone) {
      console.warn(`⚠️ [WHATSAPP SERVICE] Invalid or missing admin phone number: "${rawPhone}". Skipping alert.`);
      return { success: false, error: 'INVALID_PHONE_NUMBER' };
    }
    const payload = WhatsAppTemplates.adminAlert(formattedPhone, data);
    return await WhatsAppClient.sendMessage(payload);
  }
}
