import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { sendError } from '../utils/response';
import { Role } from '@prisma/client';

export interface AuthenticatedUser {
  id: string;
  role: Role;
}

export interface AuthRequest extends Request {
  user?: AuthenticatedUser;
}

const JWT_SECRET = process.env.JWT_SECRET || 'trustnear-secret-key';

/**
 * Authentication Middleware — TN-TECH-005
 * 1. Reads Bearer token from Authorization header.
 * 2. Verifies JWT signature and expiration.
 * 3. Extracts user identity (id, role).
 * 4. Attaches req.user.
 * 5. Rejects invalid/missing tokens with 401 Unauthorized.
 */
export const authenticate = (req: AuthRequest, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.startsWith('Bearer ') ? authHeader.split(' ')[1] : null;

  if (!token) {
    return sendError(res, 'Authentication required. No token provided.', 401);
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as AuthenticatedUser;
    if (!decoded || !decoded.id || !decoded.role) {
      return sendError(res, 'Invalid token payload.', 401);
    }
    req.user = {
      id: decoded.id,
      role: decoded.role,
    };
    next();
  } catch (error: any) {
    if (error.name === 'TokenExpiredError') {
      return sendError(res, 'Access token expired.', 401);
    }
    return sendError(res, 'Invalid or corrupted access token.', 401);
  }
};

/**
 * Optional Authentication Middleware
 * If token is present and valid, attaches req.user.
 * Otherwise, allows request to proceed unauthenticated.
 */
export const optionalAuthenticate = (req: AuthRequest, _res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.startsWith('Bearer ') ? authHeader.split(' ')[1] : null;

  if (!token) {
    return next();
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as AuthenticatedUser;
    if (decoded && decoded.id && decoded.role) {
      req.user = {
        id: decoded.id,
        role: decoded.role,
      };
    }
  } catch (_) {
    // Continue as guest
  }
  next();
};

/**
 * Authorization Middleware — TN-TECH-005
 * Checks if authenticated req.user has one of the allowed roles.
 * Returns 401 if unauthenticated, 403 if role is forbidden.
 */
export const authorize = (...allowedRoles: Role[]) => {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return sendError(res, 'Unauthenticated. Access token required.', 401);
    }

    if (!allowedRoles.includes(req.user.role)) {
      return sendError(
        res,
        `Forbidden. Role '${req.user.role}' is not authorized to access this resource.`,
        403
      );
    }

    next();
  };
};
