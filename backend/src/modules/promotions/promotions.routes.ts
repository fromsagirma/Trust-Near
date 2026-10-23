import { Router } from 'express';
import { authenticate, authorize } from '../../middleware/auth';
import { PromotionsController } from './promotions.controller';

const router = Router();

// Public active promotions endpoint
router.get('/promotions/active', PromotionsController.getActivePromotions);

// Business Owner Endpoints
router.post(
  '/owner/businesses/:businessId/promotions',
  authenticate,
  authorize('business_owner', 'admin', 'seed_admin'),
  PromotionsController.createPromotion
);

router.get(
  '/owner/promotions',
  authenticate,
  authorize('business_owner', 'admin', 'seed_admin'),
  PromotionsController.getMyPromotions
);

router.patch(
  '/owner/promotions/:promotionId/cancel',
  authenticate,
  authorize('business_owner', 'admin', 'seed_admin'),
  PromotionsController.cancelPromotion
);

// Admin Endpoint
router.get(
  '/admin/promotions',
  authenticate,
  authorize('admin', 'seed_admin'),
  PromotionsController.adminListPromotions
);

export default router;
