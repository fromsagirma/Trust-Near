import { Router } from 'express';
import { authenticate, authorize } from '../../middleware/auth';
import { AnalyticsController } from './analytics.controller';

const router = Router();

// Restricted to admin and seed_admin roles
router.use(authenticate);
router.use(authorize('admin', 'seed_admin'));

router.get('/overview', AnalyticsController.getOverview);
router.get('/categories', AnalyticsController.getCategoryDistribution);
router.get('/top-rated', AnalyticsController.getTopRated);
router.get('/top-businesses', AnalyticsController.getTopRated);
router.get('/most-viewed', AnalyticsController.getMostViewed);

export default router;

