import { Response } from 'express';
import { AuthRequest } from '../../middleware/auth';
import { ActivityService } from './activity.service';
import { sendSuccess, sendError } from '../../utils/response';

export class ActivityController {
  /**
   * GET /api/users/me/activity
   * Returns user activity feed
   */
  static async getMyActivities(req: AuthRequest, res: Response) {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const pageSize = parseInt(req.query.pageSize as string) || 20;

      const result = await ActivityService.getUserActivities(req.user!.id, page, pageSize);
      return sendSuccess(res, result, 'User activity feed retrieved successfully');
    } catch (err: any) {
      return sendError(res, err.message ?? 'Failed to retrieve activity feed', err.status ?? 500);
    }
  }

  /**
   * POST /api/users/me/activity/visit
   * Log a place visit for the current user
   */
  static async recordVisit(req: AuthRequest, res: Response) {
    try {
      const { businessId, location } = req.body;
      if (!businessId) {
        return sendError(res, 'businessId is required', 400);
      }

      const activity = await ActivityService.logPlaceVisit(req.user!.id, businessId, location);
      return sendSuccess(res, activity, 'Place visit recorded successfully', 201);
    } catch (err: any) {
      return sendError(res, err.message ?? 'Failed to record place visit', err.status ?? 500);
    }
  }

  /**
   * GET /api/users/me/activity/stats
   * Returns summary activity counts for ProfileScreen stat cards
   */
  static async getActivityStats(req: AuthRequest, res: Response) {
    try {
      const stats = await ActivityService.getUserActivityStats(req.user!.id);
      return sendSuccess(res, stats, 'Activity stats retrieved successfully');
    } catch (err: any) {
      return sendError(res, err.message ?? 'Failed to retrieve activity stats', err.status ?? 500);
    }
  }
}
