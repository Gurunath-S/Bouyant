import { env } from '../../../config/env.js';

export class GstValidationProvider {
  static async verify(gstNumber: string) {

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

    const data = await response.json();

    return data;
  }
}