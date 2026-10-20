import { Router } from 'express';
import { AuthController } from './auth.controller.js';
import { validateRequest } from '../../middlewares/validate.js';
import { authenticateToken } from '../../middlewares/auth.js';
import { asyncHandler } from '../../utils/asyncHandler.js';
import { LoginSchema, ForgotPasswordSchema, ResetPasswordSchema } from './auth.schemas.js';
import { forgotPasswordLimiter, resetPasswordLimiter, accountLookupLimiter } from '../../middlewares/rateLimiter.js';

const router = Router();

// router.post('/register', validateRequest(RegisterSchema), asyncHandler(AuthController.register));
router.get('/check-username', asyncHandler(AuthController.checkUsername));
router.get('/lookup-account', accountLookupLimiter, asyncHandler(AuthController.lookupAccount));
router.post('/login', validateRequest(LoginSchema), asyncHandler(AuthController.login));
router.post('/refresh', asyncHandler(AuthController.refresh));
router.post('/forgot-password', forgotPasswordLimiter, validateRequest(ForgotPasswordSchema), asyncHandler(AuthController.forgotPassword));
router.post('/reset-password', resetPasswordLimiter, validateRequest(ResetPasswordSchema), asyncHandler(AuthController.resetPassword));
router.get('/me', authenticateToken, asyncHandler(AuthController.me));
router.post('/logout', asyncHandler(AuthController.logout));

export const authRoutes = router;
