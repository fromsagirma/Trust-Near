import { Router } from 'express';
import { authenticate } from '../../middleware/auth';
import { NotificationsController } from './notifications.controller';

const router = Router();

// All notification endpoints require authentication
router.use(authenticate);

router.get('/', NotificationsController.listMyNotifications);
router.get('/unread-count', NotificationsController.getUnreadCount);
router.patch('/read-all', NotificationsController.markAllAsRead);
router.patch('/:notificationId/read', NotificationsController.markAsRead);

export default router;
