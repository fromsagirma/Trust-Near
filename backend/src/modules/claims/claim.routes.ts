/**
 * TN-016 — Business Claiming Routes
 *
 * POST  /api/businesses/:id/claim         — Submit claim for business (Authenticated User)
 * GET   /api/admin/claims/pending         — List pending claim queue (admin | seed_admin)
 * PATCH /api/admin/claims/:claimId/approve — Approve a pending claim (admin | seed_admin)
 * PATCH /api/admin/claims/:claimId/reject  — Reject a pending claim (admin | seed_admin)
 */
import { Router } from 'express';
import { Role } from '@prisma/client';
import { authenticate, authorize } from '../../middleware/auth';
import { ClaimController } from './claim.controller';

const router = Router();

// User claiming routes (any authenticated user)
router.post(
  '/businesses/:id/claim',
  authenticate,
  ClaimController.submitClaim
);

router.get(
  '/businesses/:id/claim-status',
  authenticate,
  ClaimController.getClaimStatus
);

// Admin claims management routes (admin | seed_admin)
const adminGuard = [
  authenticate,
  authorize(Role.admin, Role.seed_admin),
];

router.get(
  '/admin/claims',
  adminGuard,
  ClaimController.getPendingClaims
);

router.get(
  '/admin/claims/pending',
  adminGuard,
  ClaimController.getPendingClaims
);

router.get(
  '/admin/claims/approved',
  adminGuard,
  ClaimController.getPendingClaims
);

router.get(
  '/admin/claims/rejected',
  adminGuard,
  ClaimController.getPendingClaims
);

router.patch(
  '/admin/claims/:claimId/approve',
  adminGuard,
  ClaimController.approveClaim
);

router.patch(
  '/admin/claims/:claimId/reject',
  adminGuard,
  ClaimController.rejectClaim
);

export default router;
