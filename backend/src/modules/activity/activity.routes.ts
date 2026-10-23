import { Router } from 'express';
import { authenticate } from '../../middleware/auth';
import { ActivityController } from './activity.controller';

const router = Router();

// All user activity routes require authentication
router.use(authenticate);

router.get('/users/me/activity', ActivityController.getMyActivities);
router.post('/users/me/activity/visit', ActivityController.recordVisit);
router.get('/users/me/activity/stats', ActivityController.getActivityStats);

export default router;
