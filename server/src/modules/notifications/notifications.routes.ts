import { Router } from 'express';
import { NotificationsController } from './notifications.controller.js';
import { authenticateToken } from '../../middlewares/auth.js';
import { asyncHandler } from '../../utils/asyncHandler.js';

const router = Router();

router.use(authenticateToken);

router.get('/', asyncHandler(NotificationsController.list));
router.patch('/:id/read', asyncHandler(NotificationsController.markRead));
router.patch('/read-all', asyncHandler(NotificationsController.markAllRead));

export const notificationRoutes = router;
