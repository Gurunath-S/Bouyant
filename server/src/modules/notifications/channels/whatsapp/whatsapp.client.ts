import { env } from '../../../../config/env.js';
import { WhatsAppMessagePayload, WhatsAppSendResult } from './whatsapp.types.js';

export class WhatsAppClient {
  /**
   * Dispatches a structured payload to the Meta WhatsApp Cloud API via standard fetch
   */
  static async sendMessage(payload: WhatsAppMessagePayload): Promise<WhatsAppSendResult> {
    if (!env.WHATSAPP_ENABLED) {
      console.log(`ℹ️ [WHATSAPP CLIENT] WhatsApp is disabled (WHATSAPP_ENABLED=false). Skipping dispatch to ${payload.to}.`);
      return {
        success: false,
        error: 'WHATSAPP_DISABLED',
      };
    }

    if (!env.WHATSAPP_PHONE_NUMBER_ID || !env.WHATSAPP_ACCESS_TOKEN) {
      console.warn('⚠️ [WHATSAPP CLIENT] Missing Meta WhatsApp credentials (WHATSAPP_PHONE_NUMBER_ID or WHATSAPP_ACCESS_TOKEN). Skipping dispatch.');
      return {
        success: false,
        error: 'MISSING_CREDENTIALS',
      };
    }

    const url = `https://graph.facebook.com/${env.WHATSAPP_API_VERSION}/${env.WHATSAPP_PHONE_NUMBER_ID}/messages`;

    try {
      console.log(`💬 [WHATSAPP CLIENT] Dispatching template "${payload.template.name}" to: ${payload.to}`);

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000); // 10s timeout safeguard

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${env.WHATSAPP_ACCESS_TOKEN}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      const responseData: any = await response.json();

      if (!response.ok) {
        const errorMsg = responseData?.error?.message || `HTTP ${response.status}: ${response.statusText}`;
        console.error(`❌ [WHATSAPP CLIENT ERROR] Meta API Error (${response.status}): ${errorMsg}`);
        return {
          success: false,
          statusCode: response.status,
          error: errorMsg,
          responseRaw: responseData,
        };
      }

      const messageId = responseData?.messages?.[0]?.id;
      console.log(`✅ [WHATSAPP CLIENT SUCCESS] Message dispatched successfully! Meta ID: ${messageId || 'N/A'}`);

      return {
        success: true,
        statusCode: response.status,
        messageId,
        responseRaw: responseData,
      };
    } catch (error: any) {
      const isAbort = error.name === 'AbortError';
      const errMsg = isAbort ? 'Request timeout after 10000ms' : (error.message || 'Network error');
      console.error(`❌ [WHATSAPP CLIENT EXCEPTION]: ${errMsg}`);
      return {
        success: false,
        error: errMsg,
      };
    }
  }
}
