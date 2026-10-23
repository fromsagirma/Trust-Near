import { Response, NextFunction } from 'express';
import { AuthRequest } from '../../middleware/auth';
import { sendSuccess, sendError } from '../../utils/response';
import { AuthService, AppError } from './auth.service';
import {
  registerSchema,
  loginSchema,
  refreshTokenSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  changePasswordSchema,
} from './auth.validation';

const handleControllerError = (res: Response, error: any, next: NextFunction) => {
  if (error instanceof AppError) {
    return sendError(res, error.message, error.statusCode);
  }
  return next(error);
};

export class AuthController {
  static async register(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const validation = registerSchema.safeParse(req.body);
      if (!validation.success) {
        const firstIssue = validation.error.issues[0];
        return sendError(res, firstIssue.message, 400);
      }

      const user = await AuthService.register(validation.data);
      return sendSuccess(res, user, 'Registration successful', 201);
    } catch (error) {
      return handleControllerError(res, error, next);
    }
  }

  static async login(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const validation = loginSchema.safeParse(req.body);
      if (!validation.success) {
        const firstIssue = validation.error.issues[0];
        return sendError(res, firstIssue.message, 400);
      }

      const authData = await AuthService.login(validation.data);
      return sendSuccess(res, authData, 'Login successful');
    } catch (error) {
      return handleControllerError(res, error, next);
    }
  }

  static async refresh(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const validation = refreshTokenSchema.safeParse(req.body);
      if (!validation.success) {
        const firstIssue = validation.error.issues[0];
        return sendError(res, firstIssue.message, 400);
      }

      const tokens = await AuthService.refreshTokens(validation.data.refreshToken);
      return sendSuccess(res, tokens, 'Token refreshed successfully');
    } catch (error) {
      return handleControllerError(res, error, next);
    }
  }

  static async logout(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const refreshToken = req.body?.refreshToken;
      const userId = req.user?.id;

      const result = await AuthService.logout(refreshToken, userId);
      return sendSuccess(res, null, result.message);
    } catch (error) {
      return handleControllerError(res, error, next);
    }
  }

  static async forgotPassword(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const validation = forgotPasswordSchema.safeParse(req.body);
      if (!validation.success) {
        const firstIssue = validation.error.issues[0];
        return sendError(res, firstIssue.message, 400);
      }

      const identifier = validation.data.identifier || validation.data.email || validation.data.phone || '';
      const result = await AuthService.forgotPassword(identifier);
      return sendSuccess(res, null, result.message);
    } catch (error) {
      return handleControllerError(res, error, next);
    }
  }

  static async resetPassword(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const validation = resetPasswordSchema.safeParse(req.body);
      if (!validation.success) {
        const firstIssue = validation.error.issues[0];
        return sendError(res, firstIssue.message, 400);
      }

      const result = await AuthService.resetPassword(
        validation.data.token,
        validation.data.newPassword
      );
      return sendSuccess(res, null, result.message);
    } catch (error) {
      return handleControllerError(res, error, next);
    }
  }

  static async changePassword(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      if (!req.user) {
        return sendError(res, 'Unauthenticated user.', 401);
      }

      const validation = changePasswordSchema.safeParse(req.body);
      if (!validation.success) {
        const firstIssue = validation.error.issues[0];
        return sendError(res, firstIssue.message, 400);
      }

      const result = await AuthService.changePassword(
        req.user.id,
        validation.data.currentPassword,
        validation.data.newPassword
      );
      return sendSuccess(res, null, result.message);
    } catch (error) {
      return handleControllerError(res, error, next);
    }
  }

  static async getMe(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      if (!req.user) {
        return sendError(res, 'Unauthenticated user.', 401);
      }

      const me = await AuthService.getMe(req.user.id);
      return sendSuccess(res, me, 'User profile retrieved successfully');
    } catch (error) {
      return handleControllerError(res, error, next);
    }
  }
}
