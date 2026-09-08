import { env } from '../../../config/env.js';
import { GstVerificationResponse } from '../types/gstTypes.js'

export class GstValidationProvider {
  static async verify(gstNumber: string): Promise<GstVerificationResponse> {

    const response = await fetch(
      `https://www.gstinapi.in/v1/gstin/${gstNumber}`,
      {
        method: 'GET',
        headers: {
          'x-api-key': env.GSTIN_API_KEY,
        },
      }
    );

    if (!response.ok) {
      throw new Error('GST provider request failed');
    }

  const data = (await response.json()) as GstVerificationResponse;

    return data;
  }
}