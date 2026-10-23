import { Response } from 'express';
import { AuthRequest } from '../../middleware/auth';
import { UsersService } from './users.service';
import { updateProfileSchema, deleteAccountSchema, updateLocationSettingsSchema, updateNotificationSettingsSchema } from './users.validation';
import { sendSuccess, sendError } from '../../utils/response';

export class UsersController {
  static async getMe(req: AuthRequest, res: Response) {
    try {
      const user = await UsersService.getProfile(req.user!.id);
      return sendSuccess(res, user, 'Profile retrieved');
    } catch (err: any) {
      return sendError(res, err.message ?? 'Failed to retrieve profile', err.status ?? 500);
    }
  }

  static async updateMe(req: AuthRequest, res: Response) {
    const parsed = updateProfileSchema.safeParse(req.body);
    if (!parsed.success) {
      return sendError(res, 'Validation failed', 400, parsed.error.flatten());
    }
    try {
      const user = await UsersService.updateProfile(req.user!.id, parsed.data);
      return sendSuccess(res, user, 'Profile updated');
    } catch (err: any) {
      return sendError(res, err.message ?? 'Failed to update profile', err.status ?? 500);
    }
  }

  static async deleteMe(req: AuthRequest, res: Response) {
    const parsed = deleteAccountSchema.safeParse(req.body);
    if (!parsed.success) {
      return sendError(res, 'Password confirmation required', 400, parsed.error.flatten());
    }
    try {
      const result = await UsersService.deleteAccount(req.user!.id, parsed.data.password);
      return sendSuccess(res, result, 'Account deleted');
    } catch (err: any) {
      return sendError(res, err.message ?? 'Failed to delete account', err.status ?? 500);
    }
  }

  static async getLocationSettings(req: AuthRequest, res: Response) {
    try {
      const settings = await UsersService.getLocationSettings(req.user!.id);
      return sendSuccess(res, settings, 'Location settings retrieved');
    } catch (err: any) {
      return sendError(res, err.message ?? 'Failed to retrieve location settings', err.status ?? 500);
    }
  }

  static async updateLocationSettings(req: AuthRequest, res: Response) {
    const parsed = updateLocationSettingsSchema.safeParse(req.body);
    if (!parsed.success) {
      return sendError(res, 'Validation failed', 400, parsed.error.flatten());
    }
    try {
      const settings = await UsersService.updateLocationSettings(req.user!.id, parsed.data);
      return sendSuccess(res, settings, 'Location settings updated');
    } catch (err: any) {
      return sendError(res, err.message ?? 'Failed to update location settings', err.status ?? 500);
    }
  }

  static async getNotificationSettings(req: AuthRequest, res: Response) {
    try {
      const settings = await UsersService.getNotificationSettings(req.user!.id);
      return sendSuccess(res, settings, 'Notification settings retrieved');
    } catch (err: any) {
      return sendError(res, err.message ?? 'Failed to retrieve notification settings', err.status ?? 500);
    }
  }

  static async updateNotificationSettings(req: AuthRequest, res: Response) {
    const parsed = updateNotificationSettingsSchema.safeParse(req.body);
    if (!parsed.success) {
      return sendError(res, 'Validation failed', 400, parsed.error.flatten());
    }
    try {
      const settings = await UsersService.updateNotificationSettings(req.user!.id, parsed.data);
      return sendSuccess(res, settings, 'Notification settings updated');
    } catch (err: any) {
      return sendError(res, err.message ?? 'Failed to update notification settings', err.status ?? 500);
    }
  }
}


