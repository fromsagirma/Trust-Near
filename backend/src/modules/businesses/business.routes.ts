/**
 * TN-006 / TN-007 — Business Routes
 *
 * POST /api/businesses  — authenticated (user | business_owner | admin | seed_admin)
 * GET  /api/categories  — public (no auth required)
 */
import { Router } from 'express';
import { Role } from '@prisma/client';
import { authenticate, authorize } from '../../middleware/auth';
import { BusinessController } from './business.controller';

const router = Router();

// Business creation — all non-guest roles may submit listings
router.post(
  '/businesses',
  authenticate,
  authorize(Role.user, Role.business_owner, Role.admin, Role.seed_admin),
  BusinessController.createBusiness
);

// Nearby business search — TN-003: public, no auth guard
router.get('/businesses/nearby', BusinessController.getNearbyBusinesses);

// View business details — TN-008: public, no auth guard
router.get('/businesses/:id', BusinessController.getBusinessDetails);

// Category lookup — public, no auth guard
router.get('/categories', BusinessController.getCategories);
router.post('/categories', BusinessController.createCategory);
router.put('/categories/:id', BusinessController.updateCategory);
router.delete('/categories/:id', BusinessController.deleteCategory);

export default router;

