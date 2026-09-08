import { Router } from 'express';
import { AuthController } from './auth.controller.js';
import { validateRequest } from '../../middlewares/validate.js';
import { authenticateToken } from '../../middlewares/auth.js';
import { asyncHandler } from '../../utils/asyncHandler.js';
import { RegisterSchema, LoginSchema } from './auth.schemas.js';

const router = Router();

// router.post('/register', validateRequest(RegisterSchema), asyncHandler(AuthController.register));
router.post('/login', validateRequest(LoginSchema), asyncHandler(AuthController.login));
router.post('/refresh', asyncHandler(AuthController.refresh));
router.get('/me', authenticateToken, asyncHandler(AuthController.me));
router.post('/logout', asyncHandler(AuthController.logout));

export const authRoutes = router;
