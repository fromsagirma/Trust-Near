import { Router } from 'express';
import { ReviewsController } from './reviews.controller';
import { authenticate } from '../../middleware/auth';
import { reportRateLimiter } from '../../middleware/rateLimiter';

const router = Router();

// Public reviews listing for a business (TN-014 verified filter support)
router.get('/businesses/:businessId/reviews', ReviewsController.getBusinessReviews);

// Review submission & updates (with optional location for verified visit badge)
router.post('/businesses/:businessId/reviews', authenticate, ReviewsController.rate);
router.patch('/businesses/:businessId/reviews/:reviewId', authenticate, ReviewsController.update);
router.get('/businesses/:businessId/reviews/me', authenticate, ReviewsController.getMine);
router.delete('/businesses/:businessId/reviews', authenticate, ReviewsController.deleteMine);
router.delete('/businesses/:businessId/reviews/:reviewId', authenticate, ReviewsController.deleteById);

// Dedicated Verified Visit Badge check-in endpoints (TN-014 / UC-014)
router.post('/businesses/:businessId/reviews/verify', authenticate, ReviewsController.verifyVisit);
router.post('/businesses/:businessId/reviews/:reviewId/verify', authenticate, ReviewsController.verifyVisit);

// Review reporting (TN-013)
router.post('/reviews/:reviewId/report', authenticate, reportRateLimiter, ReviewsController.report);

export default router;


