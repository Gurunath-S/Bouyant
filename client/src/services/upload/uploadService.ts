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
      return res.data || res;
    } catch (err: any) {
      console.error('Failed to upload image to Cloudinary:', err);
      // Fallback: if server upload endpoint fails or offline, return original data URL
      return { url: image };
    }
  },
};
