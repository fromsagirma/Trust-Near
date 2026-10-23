import request from 'supertest';
import express, { Response } from 'express';
import jwt from 'jsonwebtoken';
import { authenticate, authorize, AuthRequest } from '../auth';
import { requireOwnership, checkOwnership } from '../ownership';
import { sendSuccess } from '../../utils/response';
import { Role } from '@prisma/client';

const JWT_SECRET = process.env.JWT_SECRET || 'trustnear-secret-key';

// Dummy Express App for Middleware & RBAC testing
const app = express();
app.use(express.json());

// Helper to sign token for tests
const createTestToken = (id: string, role: Role) => {
  return jwt.sign({ id, role }, JWT_SECRET, { expiresIn: '15m' });
};

// Test Routes
app.get('/api/test/user-only', authenticate, authorize('user'), (req: AuthRequest, res: Response) => {
  return sendSuccess(res, { userId: req.user!.id }, 'User access granted');
});

app.get('/api/test/business-owner-only', authenticate, authorize('business_owner'), (req: AuthRequest, res: Response) => {
  return sendSuccess(res, { userId: req.user!.id }, 'Business owner access granted');
});

app.get('/api/test/admin-only', authenticate, authorize('admin'), (req: AuthRequest, res: Response) => {
  return sendSuccess(res, { userId: req.user!.id }, 'Admin access granted');
});

app.get('/api/test/seed-admin-only', authenticate, authorize('seed_admin'), (req: AuthRequest, res: Response) => {
  return sendSuccess(res, { userId: req.user!.id }, 'Seed admin access granted');
});

// Resource Ownership Test Route (e.g. PATCH /businesses/:id)
const mockBusinessDatabase: Record<string, { id: string; ownerId: string; name: string }> = {
  'biz-1': { id: 'biz-1', ownerId: 'owner-aaa', name: 'Lucy Cafe' },
  'biz-2': { id: 'biz-2', ownerId: 'owner-bbb', name: 'Abyssinia Restaurant' },
};

app.patch(
  '/api/test/businesses/:id',
  authenticate,
  authorize('business_owner', 'admin'),
  requireOwnership(async (req: AuthRequest) => {
    const businessId = req.params.id;
    const biz = mockBusinessDatabase[businessId];
    return biz ? biz.ownerId : null;
  }),
  (req: AuthRequest, res: Response) => {
    return sendSuccess(res, { updated: true }, 'Business resource updated');
  }
);

describe('TN-TECH-005 — Authorization / RBAC & Resource Ownership', () => {

  // ----------------------------------------------------
  // 1. AUTHENTICATION & RBAC ROLES
  // ----------------------------------------------------
  describe('RBAC Middleware (authorize)', () => {
    const userToken = createTestToken('usr-1', 'user');
    const ownerToken = createTestToken('owner-aaa', 'business_owner');
    const adminToken = createTestToken('adm-1', 'admin');
    const seedAdminToken = createTestToken('seed-1', 'seed_admin');

    it('should reject unauthenticated request with 401', async () => {
      const res = await request(app).get('/api/test/user-only');
      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
      expect(res.body.error).toContain('Authentication required');
    });

    it('should allow user role to access user-only endpoint', async () => {
      const res = await request(app)
        .get('/api/test/user-only')
        .set('Authorization', `Bearer ${userToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.userId).toBe('usr-1');
    });

    it('should reject normal user from accessing business-owner endpoint with 403', async () => {
      const res = await request(app)
        .get('/api/test/business-owner-only')
        .set('Authorization', `Bearer ${userToken}`);

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.error).toContain('Forbidden');
    });

    it('should reject normal user from accessing admin endpoint with 403', async () => {
      const res = await request(app)
        .get('/api/test/admin-only')
        .set('Authorization', `Bearer ${userToken}`);

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.error).toContain('Forbidden');
    });

    it('should allow admin role to access admin endpoint', async () => {
      const res = await request(app)
        .get('/api/test/admin-only')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.userId).toBe('adm-1');
    });

    it('should restrict seed_admin to seed-admin endpoints specifically', async () => {
      // Seed Admin accessing seed_admin route -> 200
      const seedRes = await request(app)
        .get('/api/test/seed-admin-only')
        .set('Authorization', `Bearer ${seedAdminToken}`);
      expect(seedRes.status).toBe(200);

      // Seed Admin accessing standard user route -> 403 (unless permitted)
      const userRes = await request(app)
        .get('/api/test/user-only')
        .set('Authorization', `Bearer ${seedAdminToken}`);
      expect(userRes.status).toBe(403);
    });
  });

  // ----------------------------------------------------
  // 2. RESOURCE OWNERSHIP CHECKS
  // ----------------------------------------------------
  describe('Resource Ownership (checkOwnership & requireOwnership)', () => {
    const ownerAToken = createTestToken('owner-aaa', 'business_owner');
    const ownerBToken = createTestToken('owner-bbb', 'business_owner');
    const adminToken = createTestToken('adm-1', 'admin');

    it('checkOwnership helper unit checks', () => {
      expect(checkOwnership('owner-aaa', 'owner-aaa', 'business_owner')).toBe(true);
      expect(checkOwnership('owner-aaa', 'owner-bbb', 'business_owner')).toBe(false);
      expect(checkOwnership('owner-aaa', 'admin-user-id', 'admin')).toBe(true);
      expect(checkOwnership(null, 'owner-aaa', 'business_owner')).toBe(false);
    });

    it('should allow business owner to access/modify their OWN resource', async () => {
      const res = await request(app)
        .patch('/api/test/businesses/biz-1')
        .set('Authorization', `Bearer ${ownerAToken}`)
        .send({ name: 'Updated Lucy Cafe' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it('should REJECT business owner trying to modify ANOTHER owner resource with 403', async () => {
      const res = await request(app)
        .patch('/api/test/businesses/biz-1') // biz-1 belongs to owner-aaa
        .set('Authorization', `Bearer ${ownerBToken}`) // owner-bbb attempts patch
        .send({ name: 'Hacked Cafe' });

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.error).toContain('Forbidden');
    });

    it('should allow admin to bypass ownership check when modifying resources', async () => {
      const res = await request(app)
        .patch('/api/test/businesses/biz-1')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ name: 'Admin Moderated Cafe' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });
  });
});
