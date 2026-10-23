import { Response, NextFunction } from 'express';
import { AuthRequest } from '../../middleware/auth';
import { sendSuccess, sendError } from '../../utils/response';
import { DiscoveryService } from './discovery.service';
import { recommendationQuerySchema } from './discovery.validation';

export class DiscoveryController {
  static async getRecommendations(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const queryValidation = recommendationQuerySchema.safeParse(req.query);
      if (!queryValidation.success) {
        const issue = queryValidation.error.issues[0];
        return sendError(res, issue.message, 400);
      }

      const userId = req.user?.id;
      if (!userId) {
        const publicRecs = await DiscoveryService.getPublicRecommendations(queryValidation.data);
        return sendSuccess(res, publicRecs, 'Public recommendations retrieved');
      }

      const result = await DiscoveryService.getPersonalizedRecommendations(
        userId,
        queryValidation.data
      );

      return sendSuccess(res, result, 'Personalized recommendations retrieved');
    } catch (error: any) {
      if (error.status) {
        return sendError(res, error.message, error.status);
      }
      return next(error);
    }
  }

  static async getPublicRecommendations(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const queryValidation = recommendationQuerySchema.safeParse(req.query);
      if (!queryValidation.success) {
        const issue = queryValidation.error.issues[0];
        return sendError(res, issue.message, 400);
      }

      const result = await DiscoveryService.getPublicRecommendations(queryValidation.data);
      return sendSuccess(res, result, 'Public recommendations retrieved');
    } catch (error: any) {
      if (error.status) {
        return sendError(res, error.message, error.status);
      }
      return next(error);
    }
  }
}
