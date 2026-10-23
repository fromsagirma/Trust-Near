/**
 * TN-009 — Business Owner Controller
 */
import { Response, NextFunction } from 'express';
import { AuthRequest } from '../../middleware/auth';
import { sendSuccess, sendError } from '../../utils/response';
import { AppError } from '../auth/auth.service';
import { OwnerService } from './owner.service';
import {
  ownerBusinessParamsSchema,
  updateBusinessSchema,
  updatePhotosSchema,
  replyToReviewParamsSchema,
  replyToReviewBodySchema,
} from './owner.schema';


const handleControllerError = (
  res: Response,
  error: unknown,
  next: NextFunction
) => {
  if (error instanceof AppError) {
    return sendError(res, error.message, error.statusCode);
  }
  return next(error);
};

export class OwnerController {
  /**
   * GET /api/owner/businesses
   * Returns businesses owned by the authenticated business owner.
   */
  static async getOwnerBusinesses(
    req: AuthRequest,
    res: Response,
    next: NextFunction
  ) {
    try {
      if (!req.user) {
        return sendError(res, 'Unauthenticated. Access token required.', 401);
      }

      const businesses = await OwnerService.getOwnerBusinesses(req.user.id);
      return sendSuccess(
        res,
        businesses,
        'Owner businesses retrieved successfully.'
      );
    } catch (error) {
      return handleControllerError(res, error, next);
    }
  }

  /**
   * GET /api/owner/businesses/:id
   * View one business owned by the authenticated business owner.
   */
  static async getOwnerBusinessById(
    req: AuthRequest,
    res: Response,
    next: NextFunction
  ) {
    try {
      if (!req.user) {
        return sendError(res, 'Unauthenticated. Access token required.', 401);
      }

      const paramValidation = ownerBusinessParamsSchema.safeParse(req.params);
      if (!paramValidation.success) {
        const issues = paramValidation.error.issues.map((issue) => ({
          field: issue.path.join('.') || 'id',
          message: issue.message,
        }));
        return sendError(res, issues[0].message, 400, issues);
      }

      const business = await OwnerService.getOwnerBusinessById(
        req.user.id,
        paramValidation.data.id
      );

      return sendSuccess(
        res,
        business,
        'Business details retrieved successfully.'
      );
    } catch (error) {
      return handleControllerError(res, error, next);
    }
  }

  /**
   * PATCH /api/owner/businesses/:id
   * Update allowed fields of an owned business listing.
   */
  static async updateOwnerBusiness(
    req: AuthRequest,
    res: Response,
    next: NextFunction
  ) {
    try {
      if (!req.user) {
        return sendError(res, 'Unauthenticated. Access token required.', 401);
      }

      const paramValidation = ownerBusinessParamsSchema.safeParse(req.params);
      if (!paramValidation.success) {
        const issues = paramValidation.error.issues.map((issue) => ({
          field: issue.path.join('.') || 'id',
          message: issue.message,
        }));
        return sendError(res, issues[0].message, 400, issues);
      }

      const bodyValidation = updateBusinessSchema.safeParse(req.body);
      if (!bodyValidation.success) {
        const issues = bodyValidation.error.issues.map((issue) => ({
          field: issue.path.join('.') || 'root',
          message: issue.message,
        }));
        return sendError(res, issues[0].message, 400, issues);
      }

      const updated = await OwnerService.updateOwnerBusiness(
        req.user.id,
        paramValidation.data.id,
        bodyValidation.data
      );

      return sendSuccess(
        res,
        updated,
        'Business listing updated successfully.'
      );
    } catch (error) {
      return handleControllerError(res, error, next);
    }
  }

  /**
   * PATCH /api/owner/businesses/:id/photos
   * Manage photo URLs for an owned business listing.
   */
  static async updateOwnerBusinessPhotos(
    req: AuthRequest,
    res: Response,
    next: NextFunction
  ) {
    try {
      if (!req.user) {
        return sendError(res, 'Unauthenticated. Access token required.', 401);
      }

      const paramValidation = ownerBusinessParamsSchema.safeParse(req.params);
      if (!paramValidation.success) {
        const issues = paramValidation.error.issues.map((issue) => ({
          field: issue.path.join('.') || 'id',
          message: issue.message,
        }));
        return sendError(res, issues[0].message, 400, issues);
      }

      const bodyValidation = updatePhotosSchema.safeParse(req.body);
      if (!bodyValidation.success) {
        const issues = bodyValidation.error.issues.map((issue) => ({
          field: issue.path.join('.') || 'photoUrls',
          message: issue.message,
        }));
        return sendError(res, issues[0].message, 400, issues);
      }

      const updated = await OwnerService.updateOwnerBusinessPhotos(
        req.user.id,
        paramValidation.data.id,
        bodyValidation.data.photoUrls
      );

      return sendSuccess(
        res,
        updated,
        'Business photos updated successfully.'
      );
    } catch (error) {
      return handleControllerError(res, error, next);
    }
  }

  /**
   * POST /api/owner/reviews/:reviewId/reply


   * Post or update a single public owner reply to a customer review.
   */
  static async replyToReview(
    req: AuthRequest,
    res: Response,
    next: NextFunction
  ) {
    try {
      if (!req.user) {
        return sendError(res, 'Unauthenticated. Access token required.', 401);
      }

      const paramValidation = replyToReviewParamsSchema.safeParse(req.params);
      if (!paramValidation.success) {
        const issues = paramValidation.error.issues.map((issue) => ({
          field: issue.path.join('.') || 'reviewId',
          message: issue.message,
        }));
        return sendError(res, issues[0].message, 400, issues);
      }

      const bodyValidation = replyToReviewBodySchema.safeParse(req.body);
      if (!bodyValidation.success) {
        const issues = bodyValidation.error.issues.map((issue) => ({
          field: issue.path.join('.') || 'reply',
          message: issue.message,
        }));
        return sendError(res, issues[0].message, 400, issues);
      }

      const updated = await OwnerService.replyToReview(
        req.user.id,
        paramValidation.data.reviewId,
        bodyValidation.data.reply
      );

      return sendSuccess(
        res,
        updated,
        'Reply posted successfully.'
      );
    } catch (error) {
      return handleControllerError(res, error, next);
    }
  }

  /**
   * GET /api/owner/stats
   * Returns aggregated performance statistics for authenticated business owner.
   */
  static async getOwnerStats(
    req: AuthRequest,
    res: Response,
    next: NextFunction
  ) {
    try {
      if (!req.user) {
        return sendError(res, 'Unauthenticated. Access token required.', 401);
      }

      const stats = await OwnerService.getOwnerStats(req.user.id);
      return sendSuccess(
        res,
        stats,
        'Owner statistics retrieved successfully.'
      );
    } catch (error) {
      return handleControllerError(res, error, next);
    }
  }
}

