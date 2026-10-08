import { Router } from 'express';
import { UploadController } from './upload.controller.js';
import { authenticateToken } from '../../middlewares/auth.js';
import { asyncHandler } from '../../utils/asyncHandler.js';

const router = Router();

// Allow authenticated users (or optional auth) to upload images to Cloudinary
router.post('/', authenticateToken, asyncHandler(UploadController.uploadImage));
router.post('/image', authenticateToken, asyncHandler(UploadController.uploadImage));

export const uploadRoutes = router;
