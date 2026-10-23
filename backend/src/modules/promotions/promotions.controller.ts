import { Response, NextFunction } from 'express';
import { AuthRequest } from '../../middleware/auth';
import { sendSuccess, sendError } from '../../utils/response';
import { PromotionsService } from './promotions.service';
import {
  createPromotionSchema,
  listPromotionsQuerySchema,
  promotionIdParamSchema,
  businessIdParamSchema,
} from './promotions.validation';

export class PromotionsController {
  static async createPromotion(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      if (!req.user) {
        return sendError(res, 'Authentication required', 401);
      }

      const paramValidation = businessIdParamSchema.safeParse(req.params);
      if (!paramValidation.success) {
        const issue = paramValidation.error.issues[0];
        return sendError(res, issue.message, 400);
      }

      const bodyValidation = createPromotionSchema.safeParse(req.body);
      if (!bodyValidation.success) {
        const issue = bodyValidation.error.issues[0];
        return sendError(res, issue.message, 400);
      }

      const promotion = await PromotionsService.createPromotion(
        req.user.id,
        paramValidation.data.businessId,
        bodyValidation.data,
        req.user.role
      );

      return sendSuccess(res, promotion, 'Promotion created successfully', 201);
    } catch (error: any) {
      if (error.status) {
        return sendError(res, error.message, error.status);
      }
      return next(error);
    }
  }

  static async getMyPromotions(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      if (!req.user) {
        return sendError(res, 'Authentication required', 401);
      }

      const queryValidation = listPromotionsQuerySchema.safeParse(req.query);
      if (!queryValidation.success) {
        const issue = queryValidation.error.issues[0];
        return sendError(res, issue.message, 400);
      }

      const result = await PromotionsService.getOwnerPromotions(
        req.user.id,
        queryValidation.data
      );

      return sendSuccess(res, result, 'Owner promotions retrieved successfully');
    } catch (error: any) {
      if (error.status) {
        return sendError(res, error.message, error.status);
      }
      return next(error);
    }
  }

  static async getActivePromotions(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const queryValidation = listPromotionsQuerySchema.safeParse(req.query);
      if (!queryValidation.success) {
        const issue = queryValidation.error.issues[0];
        return sendError(res, issue.message, 400);
      }

      const result = await PromotionsService.getActivePromotions(queryValidation.data);
      return sendSuccess(res, result, 'Active promoted listings retrieved successfully');
    } catch (error: any) {
      if (error.status) {
        return sendError(res, error.message, error.status);
      }
      return next(error);
    }
  }

  static async cancelPromotion(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      if (!req.user) {
        return sendError(res, 'Authentication required', 401);
      }

      const paramValidation = promotionIdParamSchema.safeParse(req.params);
      if (!paramValidation.success) {
        const issue = paramValidation.error.issues[0];
        return sendError(res, issue.message, 400);
      }

      const updated = await PromotionsService.cancelPromotion(
        paramValidation.data.promotionId,
        req.user.id,
        req.user.role
      );

      return sendSuccess(res, updated, 'Promotion cancelled successfully');
    } catch (error: any) {
      if (error.status) {
        return sendError(res, error.message, error.status);
      }
      return next(error);
    }
  }

  static async adminListPromotions(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const queryValidation = listPromotionsQuerySchema.safeParse(req.query);
      if (!queryValidation.success) {
        const issue = queryValidation.error.issues[0];
        return sendError(res, issue.message, 400);
      }

      const result = await PromotionsService.adminListPromotions(queryValidation.data);
      return sendSuccess(res, result, 'All platform promotions retrieved successfully');
    } catch (error: any) {
      if (error.status) {
        return sendError(res, error.message, error.status);
      }
      return next(error);
    }
  }
}
