import { Response, NextFunction } from 'express';
import { AuthRequest } from './auth';
import { sendError } from '../utils/response';
import { Role } from '@prisma/client';

/**
 * Resource Ownership Helper — TN-TECH-005
 * Checks if current authenticated user owns the resource or is an admin.
 *
 * @param resourceOwnerId ID of the user who owns the target resource
 * @param currentUserId ID of the currently authenticated user
 * @param currentUserRole Role of the currently authenticated user
 * @returns true if user owns the resource or is an admin, false otherwise
 */
export const checkOwnership = (
  resourceOwnerId: string | null | undefined,
  currentUserId: string,
  currentUserRole?: Role
): boolean => {
  if (!resourceOwnerId) return false;

  // Admins can manage resources if permitted
  if (currentUserRole === 'admin') {
    return true;
  }

  return resourceOwnerId === currentUserId;
};

/**
 * Ownership Middleware Factory — TN-TECH-005
 * Ensures the authenticated user owns the target resource before proceeding.
 * Returns 401 if unauthenticated, 403 if ownership check fails.
 *
 * @param getOwnerIdFn Async function to retrieve the resource owner ID from req
 */
export const requireOwnership = (
  getOwnerIdFn: (req: AuthRequest) => Promise<string | null | undefined> | string | null | undefined
) => {
  return async (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return sendError(res, 'Unauthenticated user.', 401);
    }

    try {
      const ownerId = await getOwnerIdFn(req);

      if (!ownerId) {
        return sendError(res, 'Target resource not found.', 404);
      }

      const isOwnerOrAdmin = checkOwnership(ownerId, req.user.id, req.user.role);

      if (!isOwnerOrAdmin) {
        return sendError(
          res,
          'Forbidden. You do not have permission to access or modify this resource.',
          403
        );
      }

      next();
    } catch (error: any) {
      next(error);
    }
  };
};
