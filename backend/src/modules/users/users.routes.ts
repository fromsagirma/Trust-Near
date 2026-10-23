import { Router } from 'express';
import { UsersController } from './users.controller';
import { authenticate } from '../../middleware/auth';

const router = Router();

router.get('/me', authenticate, UsersController.getMe);
router.patch('/me', authenticate, UsersController.updateMe);
router.delete('/me', authenticate, UsersController.deleteMe);

router.get('/me/location-settings', authenticate, UsersController.getLocationSettings);
router.patch('/me/location-settings', authenticate, UsersController.updateLocationSettings);

router.get('/me/notification-settings', authenticate, UsersController.getNotificationSettings);
router.patch('/me/notification-settings', authenticate, UsersController.updateNotificationSettings);

export default router;
