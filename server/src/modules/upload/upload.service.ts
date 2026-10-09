import { v2 as cloudinary } from 'cloudinary';
import { env } from '../../config/env.js';
import { ApiError } from '../../utils/apiError.js';

// Configure Cloudinary SDK if credentials exist
if (env.CLOUDINARY_URL) {
  cloudinary.config({
    cloudinary_url: env.CLOUDINARY_URL,
  });
} else if (env.CLOUDINARY_CLOUD_NAME && env.CLOUDINARY_API_KEY && env.CLOUDINARY_API_SECRET) {
  cloudinary.config({
    cloud_name: env.CLOUDINARY_CLOUD_NAME,
    api_key: env.CLOUDINARY_API_KEY,
    api_secret: env.CLOUDINARY_API_SECRET,
    secure: true,
  });
}

export class UploadService {
  /**
   * Upload an image (base64 string, data URL, or HTTP URL) to Cloudinary
   */
  static async uploadImage(imageData: string, folder: string = 'buoyant-media') {
    if (!imageData || typeof imageData !== 'string') {
      throw ApiError.badRequest('Invalid image data provided for upload.');
    }

    // Check if Cloudinary is configured
    const isConfigured = Boolean(
      env.CLOUDINARY_URL ||
        (env.CLOUDINARY_CLOUD_NAME && env.CLOUDINARY_API_KEY && env.CLOUDINARY_API_SECRET)
    );

    if (!isConfigured) {
      console.warn('⚠️ Cloudinary credentials not fully configured in env. Returning raw image URL or fallback.');
      // If it's already an HTTP(S) URL, return as-is
      if (imageData.startsWith('http://') || imageData.startsWith('https://')) {
        return { url: imageData, public_id: '' };
      }
      // Return provided image data
      return { url: imageData, public_id: '' };
    }

    try {
      const result = await cloudinary.uploader.upload(imageData, {
        folder: `buoyant-stall-booking/${folder}`,
        resource_type: 'auto',
      });

      return {
        url: result.secure_url,
        public_id: result.public_id,
        format: result.format,
        bytes: result.bytes,
      };
    } catch (err: any) {
      console.error('❌ Cloudinary upload error:', err);
      throw ApiError.internal(err.message || 'Failed to upload image to Cloudinary.');
    }
  }

  /**
   * Delete an image from Cloudinary by public_id
   */
  static async deleteImage(publicId: string) {
    if (!publicId) return;

    try {
      await cloudinary.uploader.destroy(publicId);
    } catch (err) {
      console.error('Failed to delete image from Cloudinary:', err);
    }
  }
}
