/**
 * TN-022 — Admin Routes
 *
 * GET   /api/admin/businesses/pending  — list pending business queue
 * PATCH /api/admin/businesses/:id/approve — approve a pending business
 * PATCH /api/admin/businesses/:id/reject  — reject a pending business
 *
 * All routes require authentication and allowed roles: admin, seed_admin
 */
import { Router } from 'express';
import { Role } from '@prisma/client';
import { authenticate, authorize } from '../../middleware/auth';
import { AdminController } from './admin.controller';

const router = Router();

// Guard all admin routes with authentication and role check (admin | seed_admin)
const adminGuard = [
  authenticate,
  authorize(Role.admin, Role.seed_admin),
];

router.get('/admin/businesses', adminGuard, AdminController.getPendingBusinesses);
router.get('/admin/businesses/pending', adminGuard, AdminController.getPendingBusinesses);
router.get('/admin/businesses/approved', adminGuard, AdminController.getPendingBusinesses);
router.get('/admin/businesses/rejected', adminGuard, AdminController.getPendingBusinesses);
router.patch('/admin/businesses/:id/approve', adminGuard, AdminController.approveBusiness);
router.patch('/admin/businesses/:id/reject', adminGuard, AdminController.rejectBusiness);

// User Governance Routes — TN-002 / TN-010
router.get('/admin/users', adminGuard, AdminController.getUsers);
router.patch('/admin/users/:id/role', adminGuard, AdminController.updateUserRole);
router.post('/admin/users/:id/ban', adminGuard, AdminController.toggleUserBan);

export default router;

