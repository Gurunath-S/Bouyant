import { Request, Response } from 'express';
import { UploadService } from './upload.service.js';
import { sendResponse } from '../../utils/response.js';

export class UploadController {
  static uploadImage = async (req: Request, res: Response) => {
    const { image, file, folder } = req.body;
    const imageData = image || file;

    const result = await UploadService.uploadImage(imageData, folder || 'general');

    return sendResponse({
      res,
      statusCode: 200,
      message: 'Image uploaded successfully to Cloudinary!',
      data: result,
    });
  };
}
