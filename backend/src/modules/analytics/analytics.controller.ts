import { Response, NextFunction } from 'express';
import { AuthRequest } from '../../middleware/auth';
import { sendSuccess, sendError } from '../../utils/response';
import { AnalyticsService } from './analytics.service';
import { analyticsQuerySchema, analyticsFilteredListQuerySchema } from './analytics.validation';

export class AnalyticsController {
  static async getOverview(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const queryValidation = analyticsQuerySchema.safeParse(req.query);
      if (!queryValidation.success) {
        const issue = queryValidation.error.issues[0];
        return sendError(res, issue.message, 400);
      }

      const overview = await AnalyticsService.getPlatformOverview(queryValidation.data);
      return sendSuccess(res, overview, 'Platform overview analytics retrieved');
    } catch (error: any) {
      if (error.status) {
        return sendError(res, error.message, error.status);
      }
      return next(error);
    }
  }

  static async getCategoryDistribution(_req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const distribution = await AnalyticsService.getCategoryDistribution();
      return sendSuccess(res, distribution, 'Category distribution analytics retrieved');
    } catch (error: any) {
      if (error.status) {
        return sendError(res, error.message, error.status);
      }
      return next(error);
    }
  }

  static async getTopRated(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const queryValidation = analyticsFilteredListQuerySchema.safeParse(req.query);
      if (!queryValidation.success) {
        const issue = queryValidation.error.issues[0];
        return sendError(res, issue.message, 400);
      }

      const businesses = await AnalyticsService.getTopRatedBusinesses(queryValidation.data);
      return sendSuccess(res, businesses, 'Top rated businesses retrieved');
    } catch (error: any) {
      if (error.status) {
        return sendError(res, error.message, error.status);
      }
      return next(error);
    }
  }

  static async getMostViewed(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const queryValidation = analyticsFilteredListQuerySchema.safeParse(req.query);
      if (!queryValidation.success) {
        const issue = queryValidation.error.issues[0];
        return sendError(res, issue.message, 400);
      }

      const businesses = await AnalyticsService.getMostViewedBusinesses(queryValidation.data);
      return sendSuccess(res, businesses, 'Most viewed businesses retrieved');
    } catch (error: any) {
      if (error.status) {
        return sendError(res, error.message, error.status);
      }
      return next(error);
    }
  }
}

