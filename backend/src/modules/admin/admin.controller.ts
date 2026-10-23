/**
 * TN-022 — Admin Business Approval Controller
 */
import { Response, NextFunction } from 'express';
import { AuthRequest } from '../../middleware/auth';
import { sendSuccess, sendError } from '../../utils/response';
import { AppError } from '../auth/auth.service';
import { AdminService } from './admin.service';
import {
  businessIdParamSchema,
  rejectBusinessSchema,
  pendingQuerySchema,
  userIdParamSchema,
  usersQuerySchema,
  updateUserRoleSchema,
  toggleUserBanSchema,
} from './admin.schema';

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

export class AdminController {
  /**
   * GET /api/admin/businesses/pending — TN-022
   */
  static async getPendingBusinesses(
    req: AuthRequest,
    res: Response,
    next: NextFunction
  ) {
    try {
      if (!req.user) {
        return sendError(res, 'Unauthenticated. Access token required.', 401);
      }

      const queryValidation = pendingQuerySchema.safeParse(req.query);
      const page = queryValidation.success ? queryValidation.data.page : 1;
      const pageSize = queryValidation.success ? queryValidation.data.pageSize : 20;

      let statusFilter = queryValidation.success ? queryValidation.data.status : undefined;
      if (req.path.includes('/approved')) {
        statusFilter = 'approved';
      } else if (req.path.includes('/rejected')) {
        statusFilter = 'rejected';
      } else if (req.path.includes('/pending')) {
        statusFilter = 'pending';
      } else if (!statusFilter) {
        statusFilter = 'all';
      }

      const result = await AdminService.getPendingBusinesses(page, pageSize, statusFilter);

      return sendSuccess(
        res,
        result,
        'Businesses retrieved successfully.'
      );
    } catch (error) {
      return handleControllerError(res, error, next);
    }
  }

  /**
   * PATCH /api/admin/businesses/:id/approve — TN-022
   */
  static async approveBusiness(
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

      const result = await AdminService.approveBusiness(
        req.user.id,
        paramValidation.data.id
      );

      return sendSuccess(
        res,
        result,
        'Business approved successfully.'
      );
    } catch (error) {
      return handleControllerError(res, error, next);
    }
  }

  /**
   * PATCH /api/admin/businesses/:id/reject — TN-022
   */
  static async rejectBusiness(
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

      const bodyValidation = rejectBusinessSchema.safeParse(req.body);
      if (!bodyValidation.success) {
        const issues = bodyValidation.error.issues.map((issue) => ({
          field: issue.path.join('.') || 'root',
          message: issue.message,
        }));
        return sendError(res, issues[0].message, 400, issues);
      }

      const result = await AdminService.rejectBusiness(
        req.user.id,
        paramValidation.data.id,
        bodyValidation.data.reason
      );

      return sendSuccess(
        res,
        result,
        'Business rejected successfully.'
      );
    } catch (error) {
      return handleControllerError(res, error, next);
    }
  }

  /**
   * GET /api/admin/users — Retrieve user accounts list
   */
  static async getUsers(
    req: AuthRequest,
    res: Response,
    next: NextFunction
  ) {
    try {
      if (!req.user) {
        return sendError(res, 'Unauthenticated. Access token required.', 401);
      }

      const queryValidation = usersQuerySchema.safeParse(req.query);
      const queryData = queryValidation.success
        ? queryValidation.data
        : { page: 1, pageSize: 50 };

      const result = await AdminService.getUsers(queryData);

      return sendSuccess(
        res,
        result,
        'User accounts retrieved successfully.'
      );
    } catch (error) {
      return handleControllerError(res, error, next);
    }
  }

  /**
   * PATCH /api/admin/users/:id/role — Update user role
   */
  static async updateUserRole(
    req: AuthRequest,
    res: Response,
    next: NextFunction
  ) {
    try {
      if (!req.user) {
        return sendError(res, 'Unauthenticated. Access token required.', 401);
      }

      const paramValidation = userIdParamSchema.safeParse(req.params);
      if (!paramValidation.success) {
        return sendError(res, paramValidation.error.issues[0]?.message || 'Invalid user ID format.', 400);
      }

      const bodyValidation = updateUserRoleSchema.safeParse(req.body);
      if (!bodyValidation.success) {
        return sendError(res, bodyValidation.error.issues[0]?.message || 'Invalid role payload.', 400);
      }

      const result = await AdminService.updateUserRole(
        req.user.id,
        paramValidation.data.id,
        bodyValidation.data.role
      );

      return sendSuccess(res, result, 'User role updated successfully.');
    } catch (error) {
      return handleControllerError(res, error, next);
    }
  }

  /**
   * POST /api/admin/users/:id/ban — Toggle user ban status
   */
  static async toggleUserBan(
    req: AuthRequest,
    res: Response,
    next: NextFunction
  ) {
    try {
      if (!req.user) {
        return sendError(res, 'Unauthenticated. Access token required.', 401);
      }

      const paramValidation = userIdParamSchema.safeParse(req.params);
      if (!paramValidation.success) {
        return sendError(res, paramValidation.error.issues[0]?.message || 'Invalid user ID format.', 400);
      }

      const bodyValidation = toggleUserBanSchema.safeParse(req.body);
      const isBanned = bodyValidation.success && typeof bodyValidation.data.isBanned === 'boolean'
        ? bodyValidation.data.isBanned
        : true;
      const reason = bodyValidation.success ? bodyValidation.data.reason : undefined;

      const result = await AdminService.toggleUserBan(
        req.user.id,
        paramValidation.data.id,
        isBanned,
        reason
      );

      return sendSuccess(res, result, isBanned ? 'User account suspended.' : 'User account unbanned.');
    } catch (error) {
      return handleControllerError(res, error, next);
    }
  }
}

