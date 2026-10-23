/**
 * TN-021 — Admin Content Moderation Routes
 *
 * GET   /api/admin/moderation/queue          — List pending moderation reports
 * PATCH /api/admin/moderation/:reportId/dismiss — Dismiss a report without altering content
 * PATCH /api/admin/moderation/:reportId/remove  — Remove reported review & recalculate business rating
 *
 * All routes require authentication and allowed roles: admin, seed_admin
 */
import { Router } from 'express';
import { Role } from '@prisma/client';
import { authenticate, authorize } from '../../middleware/auth';
import { ModerationController } from './moderation.controller';

const router = Router();

// Guard all admin moderation routes with authentication and role check (admin | seed_admin)
const adminGuard = [
  authenticate,
  authorize(Role.admin, Role.seed_admin),
];

router.get('/admin/moderation', adminGuard, ModerationController.getModerationQueue);
router.get('/admin/moderation/queue', adminGuard, ModerationController.getModerationQueue);
router.get('/admin/moderation/dismissed', adminGuard, ModerationController.getModerationQueue);
router.get('/admin/moderation/removed', adminGuard, ModerationController.getModerationQueue);
router.patch('/admin/moderation/:reportId/dismiss', adminGuard, ModerationController.dismissReport);
router.patch('/admin/moderation/:reportId/remove', adminGuard, ModerationController.removeReport);
router.patch('/admin/moderation/:reportId/restore', adminGuard, ModerationController.restoreReport);

export default router;
