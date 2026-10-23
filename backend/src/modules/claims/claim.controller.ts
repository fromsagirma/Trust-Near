/**
 * TN-016 — Business Claiming Controller
 */
import { Response, NextFunction } from 'express';
import { AuthRequest } from '../../middleware/auth';
import { sendSuccess, sendError } from '../../utils/response';
import { AppError } from '../auth/auth.service';
import { ClaimService } from './claim.service';
import {
  businessIdParamSchema,
  claimIdParamSchema,
  createClaimSchema,
  rejectClaimSchema,
  pendingClaimsQuerySchema,
} from './claim.schema';

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

export class ClaimController {
  /**
   * POST /api/businesses/:id/claim — Submit claim
   */
  static async submitClaim(
    req: AuthRequest,
    res: Response,
    next: NextFunction
  ) {
    try {
      if (!req.user) {
        return sendError(res, 'Unauthenticated. Access token required.', 401);
      }

      const paramValidation = businessIdParamSchema.safeParse(req.params);
      if (!paramValidation.success) {
        return sendError(
          res,
          paramValidation.error.issues[0]?.message || 'Invalid business ID format.',
          400
        );
      }

      const bodyValidation = createClaimSchema.safeParse(req.body || {});
      const verificationInfo = bodyValidation.success
        ? bodyValidation.data.verificationInfo
        : undefined;

      const result = await ClaimService.submitClaim(
        req.user.id,
        paramValidation.data.id,
        verificationInfo
      );

      return sendSuccess(
        res,
        result,
        'Business claim submitted successfully.',
        201
      );
    } catch (error) {
      return handleControllerError(res, error, next);
    }
  }

  /**
   * GET /api/businesses/:id/claim-status — Retrieve claim status for user
   */
  static async getClaimStatus(
    req: AuthRequest,
    res: Response,
    next: NextFunction
  ) {
    try {
      if (!req.user) {
        return sendError(res, 'Unauthenticated. Access token required.', 401);
      }

      const paramValidation = businessIdParamSchema.safeParse(req.params);
      if (!paramValidation.success) {
        return sendError(
          res,
          paramValidation.error.issues[0]?.message || 'Invalid business ID format.',
          400
        );
      }

      const result = await ClaimService.getClaimStatus(
        req.user.id,
        paramValidation.data.id
      );

      return sendSuccess(
        res,
        result,
        'Claim status retrieved successfully.'
      );
    } catch (error) {
      return handleControllerError(res, error, next);
    }
  }

  /**
   * GET /api/admin/claims/pending — List pending claims for admin
   */
  static async getPendingClaims(
    req: AuthRequest,
    res: Response,
    next: NextFunction
  ) {
    try {
      if (!req.user) {
        return sendError(res, 'Unauthenticated. Access token required.', 401);
      }

      const queryValidation = pendingClaimsQuerySchema.safeParse(req.query);
      const page = queryValidation.success ? queryValidation.data.page : 1;
      const pageSize = queryValidation.success ? queryValidation.data.pageSize : 20;

      let statusFilter = (req.query.status as string) || undefined;
      if (req.path.includes('/approved')) {
        statusFilter = 'approved';
      } else if (req.path.includes('/rejected')) {
        statusFilter = 'rejected';
      } else if (req.path.includes('/pending')) {
        statusFilter = statusFilter || 'pending';
      }

      const result = await ClaimService.getPendingClaims(page, pageSize, statusFilter);

      return sendSuccess(
        res,
        result,
        'Claims retrieved successfully.'
      );
    } catch (error) {
      return handleControllerError(res, error, next);
    }
  }

  /**
   * PATCH /api/admin/claims/:claimId/approve — Approve claim
   */
  static async approveClaim(
    req: AuthRequest,
    res: Response,
    next: NextFunction
  ) {
    try {
      if (!req.user) {
        return sendError(res, 'Unauthenticated. Access token required.', 401);
      }

      const paramValidation = claimIdParamSchema.safeParse(req.params);
      if (!paramValidation.success) {
        return sendError(
          res,
          paramValidation.error.issues[0]?.message || 'Invalid claim ID format.',
          400
        );
      }

      const result = await ClaimService.approveClaim(
        req.user.id,
        paramValidation.data.claimId
      );

      return sendSuccess(
        res,
        result,
        'Business claim approved successfully.'
      );
    } catch (error) {
      return handleControllerError(res, error, next);
    }
  }

  /**
   * PATCH /api/admin/claims/:claimId/reject — Reject claim
   */
  static async rejectClaim(
    req: AuthRequest,
    res: Response,
    next: NextFunction
  ) {
    try {
      if (!req.user) {
        return sendError(res, 'Unauthenticated. Access token required.', 401);
      }

      const paramValidation = claimIdParamSchema.safeParse(req.params);
      if (!paramValidation.success) {
        return sendError(
          res,
          paramValidation.error.issues[0]?.message || 'Invalid claim ID format.',
          400
        );
      }

      const bodyValidation = rejectClaimSchema.safeParse(req.body || {});
      if (!bodyValidation.success) {
        const issues = bodyValidation.error.issues.map((issue) => ({
          field: issue.path.join('.') || 'root',
          message: issue.message,
        }));
        return sendError(res, issues[0].message, 400, issues);
      }

      const result = await ClaimService.rejectClaim(
        req.user.id,
        paramValidation.data.claimId,
        bodyValidation.data.reason
      );

      return sendSuccess(
        res,
        result,
        'Business claim rejected successfully.'
      );
    } catch (error) {
      return handleControllerError(res, error, next);
    }
  }
}
