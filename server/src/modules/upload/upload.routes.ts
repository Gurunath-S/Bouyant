import { Router } from 'express';
import { UploadController } from './upload.controller.js';
import { optionalAuth } from '../../middlewares/auth.js';
import { asyncHandler } from '../../utils/asyncHandler.js';

const router = Router();

// Allow authenticated users or guests with optionalAuth to upload images to Cloudinary
router.post('/', optionalAuth, asyncHandler(UploadController.uploadImage));
router.post('/image', optionalAuth, asyncHandler(UploadController.uploadImage));

export const uploadRoutes = router;
