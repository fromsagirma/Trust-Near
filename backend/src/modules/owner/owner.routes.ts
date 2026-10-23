/**
 * TN-009 — Business Owner Dashboard Routes
 *
 * GET   /api/owner/businesses         — List businesses owned by authenticated owner
 * GET   /api/owner/businesses/:id      — View single owned business listing
 * PATCH /api/owner/businesses/:id      — Update allowed business listing fields
 * PATCH /api/owner/businesses/:id/photos — Manage photo URLs for owned business
 * GET   /api/owner/stats              — Aggregated performance statistics for owner
 *
 * All routes require authentication and allowed role: business_owner
 */
import { Router } from 'express';
import { Role } from '@prisma/client';
import { authenticate, authorize } from '../../middleware/auth';
import { OwnerController } from './owner.controller';

const router = Router();

const ownerGuard = [
  authenticate,
  authorize(Role.business_owner, Role.admin, Role.seed_admin),
];

router.get('/owner/stats', ownerGuard, OwnerController.getOwnerStats);
router.get('/owner/businesses', ownerGuard, OwnerController.getOwnerBusinesses);
router.get('/businesses/mine', authenticate, OwnerController.getOwnerBusinesses);
router.get('/owner/businesses/:id', ownerGuard, OwnerController.getOwnerBusinessById);
router.patch('/owner/businesses/:id', ownerGuard, OwnerController.updateOwnerBusiness);
router.patch('/owner/businesses/:id/photos', ownerGuard, OwnerController.updateOwnerBusinessPhotos);
router.post('/owner/reviews/:reviewId/reply', ownerGuard, OwnerController.replyToReview);
router.patch('/owner/reviews/:reviewId/reply', ownerGuard, OwnerController.replyToReview);

export default router;
