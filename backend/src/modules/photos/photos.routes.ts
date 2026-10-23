import { Router } from 'express';
import { authenticate } from '../../middleware/auth';
import { PhotosController } from './photos.controller';

const router = Router();

// Public photo listing
router.get('/businesses/:businessId/photos', PhotosController.getPhotos);

// Protected owner/admin photo operations
router.post('/businesses/:businessId/photos', authenticate, PhotosController.addPhoto);
router.put('/businesses/:businessId/photos/reorder', authenticate, PhotosController.reorderPhotos);
router.patch('/businesses/:businessId/photos/:photoId', authenticate, PhotosController.updatePhoto);
router.delete('/businesses/:businessId/photos/:photoId', authenticate, PhotosController.deletePhoto);

export default router;
