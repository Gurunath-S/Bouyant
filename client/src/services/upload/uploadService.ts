import { apiClient } from '../api/apiClient';

export interface UploadResponse {
  url: string;
  public_id?: string;
  format?: string;
  bytes?: number;
}

export const uploadService = {
  /**
   * Upload image (base64 string or data URL) to Cloudinary via backend API
   */
  uploadImage: async (image: string, folder: string = 'general'): Promise<UploadResponse> => {
    try {
      const res: any = await apiClient.post('/upload', { image, folder });
      const payload = res?.data || res;
      const uploadedUrl = payload?.url || (typeof payload === 'string' ? payload : image);
      return {
        url: uploadedUrl,
        public_id: payload?.public_id || '',
        format: payload?.format,
        bytes: payload?.bytes,
      };
    } catch (err: any) {
      console.warn('Failed to upload image to Cloudinary endpoint, using local image data:', err);
      // Fallback: if server upload endpoint fails or offline, return original data URL
      return { url: image };
    }
  },
};
