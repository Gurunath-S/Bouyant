import { Response } from 'express';
import { AuthenticatedRequest } from '../../middlewares/auth.js';
import { NotificationsService } from './notifications.service.js';
import { sendResponse } from '../../utils/response.js';

export class NotificationsController {
  static list = async (req: AuthenticatedRequest, res: Response) => {
    const notifications = await NotificationsService.getUserNotifications(req.user!.userId);
    return sendResponse({
      res,
      statusCode: 200,
      message: 'Notifications list retrieved.',
      data: notifications,
    });
  };

  static markRead = async (req: AuthenticatedRequest, res: Response) => {
    await NotificationsService.markAsRead(req.params.id, req.user!.userId);
    return sendResponse({
      res,
      statusCode: 200,
      message: 'Notification marked as read.',
    });
  };

  static markAllRead = async (req: AuthenticatedRequest, res: Response) => {
    await NotificationsService.markAllAsRead(req.user!.userId);
    return sendResponse({
      res,
      statusCode: 200,
      message: 'All notifications marked as read.',
    });
  };
}
