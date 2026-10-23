import { Response, NextFunction } from 'express';
import { AuthRequest } from '../../middleware/auth';
import { sendSuccess, sendError } from '../../utils/response';
import { PhotosService } from './photos.service';
import {
  addPhotoSchema,
  updatePhotoSchema,
  reorderPhotosSchema,
  businessIdParamSchema,
  photoIdParamSchema,
  businessAndPhotoIdParamSchema,
} from './photos.validation';

export class PhotosController {
  static async addPhoto(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      if (!req.user) return sendError(res, 'Authentication required', 401);

      const paramValidation = businessIdParamSchema.safeParse(req.params);
      if (!paramValidation.success) {
        return sendError(res, paramValidation.error.issues[0].message, 400);
      }

      const bodyValidation = addPhotoSchema.safeParse(req.body);
      if (!bodyValidation.success) {
        return sendError(res, bodyValidation.error.issues[0].message, 400);
      }

      const photo = await PhotosService.addBusinessPhoto(
        req.user.id,
        req.user.role,
        paramValidation.data.businessId,
        bodyValidation.data
      );

      return sendSuccess(res, photo, 'Business photo added successfully', 201);
    } catch (error: any) {
      if (error.status) return sendError(res, error.message, error.status);
      return next(error);
    }
  }

  static async getPhotos(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const paramValidation = businessIdParamSchema.safeParse(req.params);
      if (!paramValidation.success) {
        return sendError(res, paramValidation.error.issues[0].message, 400);
      }

      const photos = await PhotosService.getBusinessPhotos(paramValidation.data.businessId);
      return sendSuccess(res, photos, 'Business photos retrieved successfully');
    } catch (error: any) {
      if (error.status) return sendError(res, error.message, error.status);
      return next(error);
    }
  }

  static async updatePhoto(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      if (!req.user) return sendError(res, 'Authentication required', 401);

      const paramValidation = businessAndPhotoIdParamSchema.safeParse(req.params);
      if (!paramValidation.success) {
        return sendError(res, paramValidation.error.issues[0].message, 400);
      }

      const bodyValidation = updatePhotoSchema.safeParse(req.body);
      if (!bodyValidation.success) {
        return sendError(res, bodyValidation.error.issues[0].message, 400);
      }

      const updated = await PhotosService.updateBusinessPhoto(
        req.user.id,
        req.user.role,
        paramValidation.data.businessId,
        paramValidation.data.photoId,
        bodyValidation.data
      );

      return sendSuccess(res, updated, 'Business photo updated successfully');
    } catch (error: any) {
      if (error.status) return sendError(res, error.message, error.status);
      return next(error);
    }
  }

  static async deletePhoto(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      if (!req.user) return sendError(res, 'Authentication required', 401);

      const paramValidation = businessAndPhotoIdParamSchema.safeParse(req.params);
      if (!paramValidation.success) {
        return sendError(res, paramValidation.error.issues[0].message, 400);
      }

      const result = await PhotosService.deleteBusinessPhoto(
        req.user.id,
        req.user.role,
        paramValidation.data.businessId,
        paramValidation.data.photoId
      );

      return sendSuccess(res, result, 'Business photo deleted successfully');
    } catch (error: any) {
      if (error.status) return sendError(res, error.message, error.status);
      return next(error);
    }
  }

  static async reorderPhotos(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      if (!req.user) return sendError(res, 'Authentication required', 401);

      const paramValidation = businessIdParamSchema.safeParse(req.params);
      if (!paramValidation.success) {
        return sendError(res, paramValidation.error.issues[0].message, 400);
      }

      const bodyValidation = reorderPhotosSchema.safeParse(req.body);
      if (!bodyValidation.success) {
        return sendError(res, bodyValidation.error.issues[0].message, 400);
      }

      const reordered = await PhotosService.reorderBusinessPhotos(
        req.user.id,
        req.user.role,
        paramValidation.data.businessId,
        bodyValidation.data
      );

      return sendSuccess(res, reordered, 'Business photos reordered successfully');
    } catch (error: any) {
      if (error.status) return sendError(res, error.message, error.status);
      return next(error);
    }
  }
}
