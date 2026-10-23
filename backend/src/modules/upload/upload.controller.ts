import { Request, Response, NextFunction } from 'express';
import {
  uploadBufferToCloudinary,
  getCloudinaryUploadSignature,
  UploadResult,
} from './upload.service';
import { sendSuccess, sendError } from '../../utils/response';

/**
 * Controller: Handle single image upload.
 * POST /api/upload
 */
export const uploadSingleImage = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    if (!req.file) {
      return sendError(res, 'No image file uploaded', 400);
    }

    // Validate file type (must be image)
    if (!req.file.mimetype.startsWith('image/')) {
      return sendError(res, 'Only image files are allowed', 400);
    }

    const folder = (req.body.folder as string) || undefined;
    const result: UploadResult = await uploadBufferToCloudinary(
      req.file.buffer,
      folder
    );

    return sendSuccess(
      res,
      result,
      'Image uploaded successfully to Cloudinary',
      201
    );
  } catch (error: any) {
    if (error.message?.includes('Cloudinary is not configured')) {
      return sendError(res, error.message, 503);
    }
    next(error);
  }
};

/**
 * Controller: Handle multiple images upload.
 * POST /api/upload/multiple
 */
export const uploadMultipleImages = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const files = req.files as Express.Multer.File[];
    if (!files || files.length === 0) {
      return sendError(res, 'No image files uploaded', 400);
    }

    // Validate file types
    const invalidFile = files.find((f) => !f.mimetype.startsWith('image/'));
    if (invalidFile) {
      return sendError(res, 'All uploaded files must be images', 400);
    }

    const folder = (req.body.folder as string) || undefined;
    const uploadPromises = files.map((file) =>
      uploadBufferToCloudinary(file.buffer, folder)
    );

    const results: UploadResult[] = await Promise.all(uploadPromises);
    const urls = results.map((r) => r.url);

    return sendSuccess(
      res,
      { urls, photos: results },
      'Images uploaded successfully to Cloudinary',
      201
    );
  } catch (error: any) {
    if (error.message?.includes('Cloudinary is not configured')) {
      return sendError(res, error.message, 503);
    }
    next(error);
  }
};

/**
 * Controller: Get signed upload parameters for direct client-side upload.
 * GET /api/upload/signature
 */
export const getSignature = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const folder = (req.query.folder as string) || undefined;
    const signatureData = getCloudinaryUploadSignature(folder);

    return sendSuccess(
      res,
      signatureData,
      'Cloudinary upload signature generated successfully'
    );
  } catch (error: any) {
    if (error.message?.includes('Cloudinary is not configured')) {
      return sendError(res, error.message, 503);
    }
    next(error);
  }
};
