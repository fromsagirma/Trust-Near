import { Router, Request, Response, NextFunction } from 'express';
import multer from 'multer';
import {
  uploadSingleImage,
  uploadMultipleImages,
  getSignature,
} from './upload.controller';
import { authenticate } from '../../middleware/auth';
import { sendError } from '../../utils/response';

const router = Router();

// Configure multer memory storage (files stored in RAM as Buffer)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024, // 5 MB max file size limit
  },
  fileFilter: (_req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      const err = new Error('Only image files are allowed!') as any;
      err.statusCode = 400;
      cb(err);
    }
  },
});

// Middleware wrapper to handle single file upload with any field name (file, photo, image, etc.)
const handleSingleUpload = (req: Request, res: Response, next: NextFunction) => {
  upload.any()(req, res, (err: any) => {
    if (err) {
      const statusCode = err.statusCode || 400;
      return sendError(res, err.message || 'File upload error', statusCode);
    }
    if (req.files && Array.isArray(req.files) && req.files.length > 0) {
      req.file = req.files[0];
    }
    next();
  });
};

/**
 * GET /api/upload/signature
 * Generates signed credentials for direct client-side upload to Cloudinary.
 */
router.get('/signature', authenticate, getSignature);

/**
 * POST /api/upload
 * Uploads a single image to Cloudinary (field names supported: 'file', 'image', 'photo').
 */
router.post('/', authenticate, handleSingleUpload, uploadSingleImage);

/**
 * POST /api/upload/multiple
 * Uploads multiple images to Cloudinary (up to 10 photos).
 */
router.post('/multiple', authenticate, handleUpload(upload.array('photos', 10)), uploadMultipleImages);

export default router;

