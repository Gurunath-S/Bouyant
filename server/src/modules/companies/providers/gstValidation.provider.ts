import { env } from '../../../config/env.js';
import { GstVerificationResponse } from '../types/gstTypes.js';
import { ApiError } from '../../../utils/apiError.js';
import { GST_STATE_CODES } from '../utils/gstUtils.js';

export class GstValidationProvider {
  static async verify(gstNumber: string): Promise<GstVerificationResponse> {
    const cleanGst = gstNumber.trim().toUpperCase();

    try {
      const response = await fetch(
        `https://www.gstinapi.in/v1/gstin/${cleanGst}?include=profile`,
        {
          method: 'GET',
          headers: {
            'x-api-key': env.GSTIN_API_KEY,
          },
        }
      );

      if (response.ok) {
        const rawData: any = await response.json();
        if (rawData && rawData.data) {
          const stateCode = cleanGst.substring(0, 2);
          const stateName = rawData.data.address_details?.state || GST_STATE_CODES[stateCode] || 'India';
          const pan = cleanGst.length === 15 ? cleanGst.substring(2, 12) : '';

          const normalized: GstVerificationResponse = {
            success: true,
            gstin: cleanGst,
            data: {
              gstin: cleanGst,
              legal_name: rawData.data.legal_name || rawData.data.trade_name || 'Registered Taxpayer',
              trade_name: rawData.data.trade_name || rawData.data.legal_name || 'Commercial Entity',
              status: rawData.data.status || 'Active',
              pincode: rawData.data.pincode || rawData.data.address_details?.pincode || '400001',
              block_status: rawData.data.block_status || 'Unblocked',
              city: rawData.data.address_details?.city || rawData.data.city || 'Commercial District',
              state: stateName,
              state_code: stateCode,
              address: rawData.data.address || rawData.data.address_details?.locality || 'Commercial Office',
              pan: pan,
              taxpayer_type: rawData.data.taxpayer_type || 'Regular',
              address_details: rawData.data.address_details,
            },
          };
          return normalized;
        }
      }

      const errorBody: any = await response.json().catch(() => ({}));
      const errorMsg = errorBody?.error || errorBody?.message;

      // Handle official 404 Not Found from registry
      if (response.status === 404) {
        throw ApiError.badRequest('GSTIN not found in official GST database. Please check the 15-character number.');
      }

      // Handle unverified email credits hold or quota/auth issues in development
      if (
        errorBody?.code === 'email_unverified_credits_held' ||
        response.status === 401 ||
        response.status === 402 ||
        response.status === 403 ||
        response.status === 429
      ) {

        if (errorBody?.code === 'email_unverified_credits_held') {
          throw ApiError.badRequest('Your GST lookup credits are waiting. Please confirm your email address on gstinapi.in to unlock them.');
        }

        throw ApiError.badRequest(errorMsg || `GST provider authorization failed (${response.status})`);
      }

      throw ApiError.badRequest(errorMsg || 'GST verification request failed');
    } catch (err: any) {
      if (err instanceof ApiError) throw err;

      throw ApiError.badRequest(`GST verification failed: ${err.message}`);
    }
  }


}