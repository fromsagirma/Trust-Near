/**
 * TN-021 — Admin Content Moderation Controller
 */
import { Response, NextFunction } from 'express';
import { AuthRequest } from '../../middleware/auth';
import { sendSuccess, sendError } from '../../utils/response';
import { AppError } from '../auth/auth.service';
import { ModerationService } from './moderation.service';
import {
  reportIdParamSchema,
  removeReportSchema,
  moderationQueueQuerySchema,
} from './moderation.schema';

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

export class ModerationController {
  /**
   * GET /api/admin/moderation/queue — TN-021
   */
  static async getModerationQueue(
    req: AuthRequest,
    res: Response,
    next: NextFunction
  ) {
    try {
      if (!req.user) {
        return sendError(res, 'Unauthenticated. Access token required.', 401);
      }

      const queryValidation = moderationQueueQuerySchema.safeParse(req.query);
      const page = queryValidation.success ? queryValidation.data.page : 1;
      const pageSize = queryValidation.success ? queryValidation.data.pageSize : 20;
      const sortBy = queryValidation.success ? queryValidation.data.sortBy : 'recency';

      let statusFilter = queryValidation.success ? queryValidation.data.status : undefined;
      if (req.path.includes('/dismissed')) {
        statusFilter = 'dismissed';
      } else if (req.path.includes('/removed')) {
        statusFilter = 'removed';
      } else if (req.path.includes('/queue')) {
        statusFilter = statusFilter || 'pending';
      }

      const result = await ModerationService.getModerationQueue(
        page,
        pageSize,
        sortBy,
        statusFilter
      );

      return sendSuccess(
        res,
        result,
        'Moderation queue retrieved successfully.'
      );
    } catch (error) {
      return handleControllerError(res, error, next);
    }
  }

  /**
   * PATCH /api/admin/moderation/:reportId/dismiss — TN-021
   */
  static async dismissReport(
    req: AuthRequest,
    res: Response,
    next: NextFunction
  ) {
    try {
      if (!req.user) {
        return sendError(res, 'Unauthenticated. Access token required.', 401);
      }

      const paramValidation = reportIdParamSchema.safeParse(req.params);
      if (!paramValidation.success) {
        return sendError(
          res,
          paramValidation.error.issues[0]?.message || 'Invalid report ID format.',
          400
        );
      }

      const result = await ModerationService.dismissReport(
        req.user.id,
        paramValidation.data.reportId
      );

      return sendSuccess(
        res,
        result,
        'Report dismissed successfully.'
      );
    } catch (error) {
      return handleControllerError(res, error, next);
    }
  }

  /**
   * PATCH /api/admin/moderation/:reportId/remove — TN-021
   */
  static async removeReport(
    req: AuthRequest,
    res: Response,
    next: NextFunction
  ) {
    try {
      if (!req.user) {
        return sendError(res, 'Unauthenticated. Access token required.', 401);
      }

      const paramValidation = reportIdParamSchema.safeParse(req.params);
      if (!paramValidation.success) {
        return sendError(
          res,
          paramValidation.error.issues[0]?.message || 'Invalid report ID format.',
          400
        );
      }

      const bodyValidation = removeReportSchema.safeParse(req.body);
      if (!bodyValidation.success) {
        const issues = bodyValidation.error.issues.map((issue) => ({
          field: issue.path.join('.') || 'root',
          message: issue.message,
        }));
        return sendError(res, issues[0].message, 400, issues);
      }

      const result = await ModerationService.removeReport(
        req.user.id,
        paramValidation.data.reportId,
        bodyValidation.data.reason
      );

      return sendSuccess(
        res,
        result,
        'Report actioned and review removed successfully.'
      );
    } catch (error) {
      return handleControllerError(res, error, next);
    }
  }

  /**
   * PATCH /api/admin/moderation/:reportId/restore — Restore soft-deleted review & report
   */
  static async restoreReport(
    req: AuthRequest,
    res: Response,
    next: NextFunction
  ) {
    try {
      if (!req.user) {
        return sendError(res, 'Unauthenticated. Access token required.', 401);
      }

      const paramValidation = reportIdParamSchema.safeParse(req.params);
      if (!paramValidation.success) {
        return sendError(
          res,
          paramValidation.error.issues[0]?.message || 'Invalid report ID format.',
          400
        );
      }

      const result = await ModerationService.restoreReport(
        req.user.id,
        paramValidation.data.reportId
      );

      return sendSuccess(
        res,
        result,
        'Content and report restored successfully.'
      );
    } catch (error) {
      return handleControllerError(res, error, next);
    }
  }
}

