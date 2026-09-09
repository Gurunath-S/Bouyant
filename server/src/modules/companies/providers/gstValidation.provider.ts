import { env } from '../../../config/env.js';
import { GstVerificationResponse } from '../types/gstTypes.js';
import { ApiError } from '../../../utils/apiError.js';

export class GstValidationProvider {
  static async verify(gstNumber: string): Promise<GstVerificationResponse> {
    try {
      const response = await fetch(
        `https://www.gstinapi.in/v1/gstin/${gstNumber}`,
        {
          method: 'GET',
          headers: {
            'x-api-key': env.GSTIN_API_KEY,
          },
        }
      );

      if (response.ok) {
        const data = (await response.json()) as GstVerificationResponse;
        return data;
      }

      const errorBody: any = await response.json().catch(() => ({}));
      const errorMsg = errorBody?.error || errorBody?.message;

      // Handle unverified email credits hold or quota/auth issues
      if (errorBody?.code === 'email_unverified_credits_held' || response.status === 401 || response.status === 402 || response.status === 403) {
        if (env.NODE_ENV === 'development') {
          console.warn(
            `[GST API Notice] gstinapi.in returned ${response.status} (${errorMsg || errorBody?.code}). ` +
            `Falling back to development mock for ${gstNumber}.`
          );
          return this.getDevelopmentFallback(gstNumber);
        }

        if (errorBody?.code === 'email_unverified_credits_held') {
          throw ApiError.badRequest('Your GST lookup credits are waiting. Please confirm your email address on gstinapi.in to unlock them.');
        }

        throw ApiError.badRequest(errorMsg || `GST provider authorization failed (${response.status})`);
      }

      throw ApiError.badRequest(errorMsg || 'GST verification request failed');
    } catch (err: any) {
      if (err instanceof ApiError) throw err;

      if (env.NODE_ENV === 'development') {
        console.warn(`[GST API Notice] Provider error: ${err.message}. Using development fallback.`);
        return this.getDevelopmentFallback(gstNumber);
      }

      throw ApiError.badRequest(`GST verification failed: ${err.message}`);
    }
  }

  private static getDevelopmentFallback(gstNumber: string): GstVerificationResponse {
    return {
      success: true,
      gstin: gstNumber,
      data: {
        gstin: gstNumber,
        legal_name: 'Verified Business Enterprise',
        trade_name: 'Commercial Trade Entity',
        status: 'Active',
        pincode: '641001',
        block_status: 'No',
        city: 'Coimbatore',
        address: 'Commercial Complex, Cross Cut Road',
      },
    };
  }
}