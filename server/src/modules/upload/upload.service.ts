import { v2 as cloudinary } from 'cloudinary';
import { env } from '../../config/env.js';
import { ApiError } from '../../utils/apiError.js';

// Configure Cloudinary SDK if credentials exist
const cleanStr = (val?: string) => (val || '').replace(/['"]/g, '').trim();

const cloudName = cleanStr(env.CLOUDINARY_CLOUD_NAME);
const apiKey = cleanStr(env.CLOUDINARY_API_KEY);
const apiSecret = cleanStr(env.CLOUDINARY_API_SECRET);
const cloudinaryUrl = cleanStr(env.CLOUDINARY_URL);

if (cloudName && apiKey && apiSecret) {
  cloudinary.config({
    cloud_name: cloudName,
    api_key: apiKey,
    api_secret: apiSecret,
    secure: true,
  });
} else if (cloudinaryUrl) {
  const match = cloudinaryUrl.match(/^cloudinary:\/\/([^:]+):([^@]+)@(.+)$/);
  if (match) {
    cloudinary.config({
      api_key: match[1],
      api_secret: match[2],
      cloud_name: match[3],
      secure: true,
    });
  } else {
    process.env.CLOUDINARY_URL = cloudinaryUrl;
  }
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
      (cloudinary.config().cloud_name && cloudinary.config().api_key && cloudinary.config().api_secret) ||
        (cloudName && apiKey && apiSecret)
    );

    if (!isConfigured) {
      console.warn('⚠️ Cloudinary credentials not fully configured in env. Returning raw image URL or fallback.');
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
      // Fallback gracefully to data URL or image URL so the user flow is never blocked
      if (imageData.startsWith('data:') || imageData.startsWith('http://') || imageData.startsWith('https://')) {
        return { url: imageData, public_id: '' };
      }
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
