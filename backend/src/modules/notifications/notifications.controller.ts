import { Response, NextFunction } from 'express';
import { AuthRequest } from '../../middleware/auth';
import { sendSuccess, sendError } from '../../utils/response';
import { NotificationsService } from './notifications.service';
import {
  listNotificationsQuerySchema,
  notificationIdParamSchema,
} from './notifications.validation';

export class NotificationsController {
  static async listMyNotifications(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      if (!req.user) {
        return sendError(res, 'Authentication required', 401);
      }

      const queryValidation = listNotificationsQuerySchema.safeParse(req.query);
      if (!queryValidation.success) {
        const issue = queryValidation.error.issues[0];
        return sendError(res, issue.message, 400);
      }

      const result = await NotificationsService.getUserNotifications(
        req.user.id,
        queryValidation.data
      );

      return sendSuccess(res, result, 'Notifications retrieved successfully');
    } catch (error: any) {
      if (error.status) {
        return sendError(res, error.message, error.status);
      }
      return next(error);
    }
  }

  static async markAsRead(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      if (!req.user) {
        return sendError(res, 'Authentication required', 401);
      }

      const paramValidation = notificationIdParamSchema.safeParse(req.params);
      if (!paramValidation.success) {
        const issue = paramValidation.error.issues[0];
        return sendError(res, issue.message, 400);
      }

      const updated = await NotificationsService.markAsRead(
        paramValidation.data.notificationId,
        req.user.id
      );

      return sendSuccess(res, updated, 'Notification marked as read');
    } catch (error: any) {
      if (error.status) {
        return sendError(res, error.message, error.status);
      }
      return next(error);
    }
  }

  static async markAllAsRead(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      if (!req.user) {
        return sendError(res, 'Authentication required', 401);
      }

      const result = await NotificationsService.markAllAsRead(req.user.id);
      return sendSuccess(res, result, 'All notifications marked as read');
    } catch (error: any) {
      if (error.status) {
        return sendError(res, error.message, error.status);
      }
      return next(error);
    }
  }

  static async getUnreadCount(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      if (!req.user) {
        return sendError(res, 'Authentication required', 401);
      }

      const result = await NotificationsService.getUnreadCount(req.user.id);
      return sendSuccess(res, result, 'Unread notification count retrieved');
    } catch (error: any) {
      if (error.status) {
        return sendError(res, error.message, error.status);
      }
      return next(error);
    }
  }
}
