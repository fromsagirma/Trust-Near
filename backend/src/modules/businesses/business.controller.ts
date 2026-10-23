/**
 * TN-006 / TN-007 — Business Controller
 */
import { Request, Response, NextFunction } from 'express';
import { AuthRequest } from '../../middleware/auth';
import { sendSuccess, sendError } from '../../utils/response';
import { AppError } from '../auth/auth.service';
import { BusinessService } from './business.service';
import { createBusinessSchema, nearbyQuerySchema, getBusinessDetailsParamsSchema } from './business.schema';

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

export class BusinessController {
  /**
   * POST /api/businesses — TN-006, TN-007
   * Requires authentication. Allowed roles: user, business_owner, admin, seed_admin.
   */
  static async createBusiness(
    req: AuthRequest,
    res: Response,
    next: NextFunction
  ) {
    try {
      if (!req.user) {
        return sendError(res, 'Unauthenticated. Access token required.', 401);
      }

      const validation = createBusinessSchema.safeParse(req.body);
      if (!validation.success) {
        const issues = validation.error.issues.map((issue) => ({
          field: issue.path.join('.') || 'root',
          message: issue.message,
        }));
        return sendError(res, issues[0].message, 400, issues);
      }

      const business = await BusinessService.createBusiness(
        req.user.id,
        req.user.role,
        validation.data
      );

      return sendSuccess(
        res,
        business,
        'Business listing created successfully.',
        201
      );
    } catch (error) {
      return handleControllerError(res, error, next);
    }
  }

  /**
   * GET /api/categories — public, no authentication required
   */
  static async getCategories(
    _req: AuthRequest,
    res: Response,
    next: NextFunction
  ) {
    try {
      const categories = await BusinessService.getCategories();
      return sendSuccess(
        res,
        { categories },
        'Categories retrieved successfully.'
      );
    } catch (error) {
      return handleControllerError(res, error, next);
    }
  }

  /**
   * PUT /api/categories/:id — Update category (name / isActive status)
   */
  static async updateCategory(
    req: AuthRequest,
    res: Response,
    next: NextFunction
  ) {
    try {
      const id = parseInt(req.params.id, 10);
      if (isNaN(id)) {
        return sendError(res, 'Invalid category ID.', 400);
      }

      const { name, isActive } = req.body || {};
      const category = await BusinessService.updateCategory(id, { name, isActive });
      return sendSuccess(res, category, 'Category updated successfully.');
    } catch (error) {
      return handleControllerError(res, error, next);
    }
  }

  /**
   * POST /api/categories — Create category
   */
  static async createCategory(
    req: AuthRequest,
    res: Response,
    next: NextFunction
  ) {
    try {
      const name = req.body?.name || req.body?.categoryName;
      if (!name || typeof name !== 'string' || !name.trim()) {
        return sendError(res, 'Category name is required.', 400);
      }

      const category = await BusinessService.createCategory(name);
      return sendSuccess(res, category, 'Category created successfully.', 201);
    } catch (error) {
      return handleControllerError(res, error, next);
    }
  }

  /**
   * DELETE /api/categories/:id — Delete category
   */
  static async deleteCategory(
    req: AuthRequest,
    res: Response,
    next: NextFunction
  ) {
    try {
      const id = parseInt(req.params.id, 10);
      if (isNaN(id)) {
        return sendError(res, 'Invalid category ID.', 400);
      }

      const result = await BusinessService.deleteCategory(id);
      return sendSuccess(res, result, 'Category deleted successfully.');
    } catch (error) {
      return handleControllerError(res, error, next);
    }
  }

  /**
   * GET /api/businesses/nearby — TN-003
   * Public endpoint, no authentication required.
   */
  static async getNearbyBusinesses(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    try {
      const validation = nearbyQuerySchema.safeParse(req.query);
      if (!validation.success) {
        const issues = validation.error.issues.map((issue) => ({
          field: issue.path.join('.') || 'root',
          message: issue.message,
        }));
        return sendError(res, issues[0].message, 400, issues);
      }

      const result = await BusinessService.getNearbyBusinesses(
        validation.data
      );

      return sendSuccess(
        res,
        result,
        'Nearby businesses retrieved successfully.'
      );
    } catch (error) {
      return handleControllerError(res, error, next);
    }
  }

  /**
   * GET /api/businesses/:id — TN-008
   * Public endpoint, no authentication required.
   */
  static async getBusinessDetails(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    try {
      const validation = getBusinessDetailsParamsSchema.safeParse(req.params);
      if (!validation.success) {
        const issues = validation.error.issues.map((issue) => ({
          field: issue.path.join('.') || 'id',
          message: issue.message,
        }));
        return sendError(res, issues[0].message, 400, issues);
      }

      const business = await BusinessService.getBusinessDetails(
        validation.data.id
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
}


