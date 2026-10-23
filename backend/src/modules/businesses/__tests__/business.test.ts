/**
 * TN-006 / TN-007 — Business Listing & Landmark Location Tests
 *
 * 18 integration tests against the live database.
 * Test users are created with specific roles directly via Prisma (not the
 * register endpoint) so we can control role assignment. JWT tokens are
 * generated locally using the same secret as the auth middleware.
 *
 * IMPORTANT — test 18:
 *   We spy on prisma.$transaction, proxy the inner tx object so that
 *   businessPhoto.createMany throws, but let the real $queryRaw INSERT
 *   execute against the actual DB. When createMany rejects, the real
 *   Postgres transaction rolls back and we verify no orphan row remains.
 */
import request from 'supertest';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import app from '../../../server';
import { prisma } from '../../../config/db';

const JWT_SECRET = process.env.JWT_SECRET || 'trustnear-secret-key';

const makeToken = (id: string, role: string) =>
  jwt.sign({ id, role }, JWT_SECRET, { expiresIn: '1h' });

// ─── Shared state ─────────────────────────────────────────────────────────────
let testCategoryId: number;

let userId: string;
let userToken: string;

let ownerId: string;
let ownerToken: string;

let adminId: string;
let adminToken: string;

let seedAdminId: string;
let seedAdminToken: string;

const createdBusinessIds: string[] = [];

// ─── Helpers ──────────────────────────────────────────────────────────────────
const validPayload = () => ({
  name: `Test Business ${Date.now()}`,
  categoryId: testCategoryId,
  location: { lat: 9.03, lng: 38.74 },
  landmarkDescription: 'Behind St. Gabriel Church, blue gate',
});

// ─── Setup / Teardown ─────────────────────────────────────────────────────────
beforeAll(async () => {
  await prisma.$connect();

  // Low cost bcrypt for test speed — actual password is never used (tokens are signed directly)
  const passwordHash = await bcrypt.hash('Test!123', 4);

  // Create a test category
  const cat = await prisma.category.create({
    data: { name: `Test Category ${Date.now()}` },
  });
  testCategoryId = cat.id;

  // Create one user per role
  const ts = Date.now();

  const u = await prisma.user.create({
    data: { displayName: 'TN006 User', email: `tn006_user_${ts}@test.com`, passwordHash, role: 'user' },
  });
  userId = u.id;
  userToken = makeToken(userId, 'user');

  const o = await prisma.user.create({
    data: { displayName: 'TN006 Owner', email: `tn006_owner_${ts}@test.com`, passwordHash, role: 'business_owner' },
  });
  ownerId = o.id;
  ownerToken = makeToken(ownerId, 'business_owner');

  const a = await prisma.user.create({
    data: { displayName: 'TN006 Admin', email: `tn006_admin_${ts}@test.com`, passwordHash, role: 'admin' },
  });
  adminId = a.id;
  adminToken = makeToken(adminId, 'admin');

  const s = await prisma.user.create({
    data: { displayName: 'TN006 SeedAdmin', email: `tn006_seed_${ts}@test.com`, passwordHash, role: 'seed_admin' },
  });
  seedAdminId = s.id;
  seedAdminToken = makeToken(seedAdminId, 'seed_admin');
});

afterAll(async () => {
  // Remove all businesses created during tests
  if (createdBusinessIds.length > 0) {
    await prisma.businessPhoto.deleteMany({
      where: { businessId: { in: createdBusinessIds } },
    });
    await prisma.business.deleteMany({
      where: { id: { in: createdBusinessIds } },
    });
  }

  // Remove test category
  if (testCategoryId) {
    await prisma.category.delete({ where: { id: testCategoryId } }).catch(() => {});
  }

  // Remove test users
  const testUserIds = [userId, ownerId, adminId, seedAdminId].filter(Boolean);
  if (testUserIds.length) {
    await prisma.user.deleteMany({ where: { id: { in: testUserIds } } });
  }

  await prisma.$disconnect();
});

// ─────────────────────────────────────────────────────────────────────────────
describe('TN-006 / TN-007 — Business Listing Endpoints', () => {
  // ── Test 1: user role ──────────────────────────────────────────────────────
  it('1. user role → status=pending, ownerId=null, submittedBy=userId', async () => {
    const res = await request(app)
      .post('/api/businesses')
      .set('Authorization', `Bearer ${userToken}`)
      .send({ ...validPayload() });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.status).toBe('pending');
    expect(res.body.data.ownerId).toBeNull();
    expect(res.body.data.submittedBy).toBe(userId);
    expect(res.body.data.id).toBeDefined();

    createdBusinessIds.push(res.body.data.id);
  });

  // ── Test 2: business_owner role ───────────────────────────────────────────
  it('2. business_owner role → status=pending, ownerId=ownerId, submittedBy=ownerId', async () => {
    const res = await request(app)
      .post('/api/businesses')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ ...validPayload() });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.status).toBe('pending');
    expect(res.body.data.ownerId).toBe(ownerId);
    expect(res.body.data.submittedBy).toBe(ownerId);

    createdBusinessIds.push(res.body.data.id);
  });

  // ── Test 3: admin role ────────────────────────────────────────────────────
  it('3. admin role → status=pending, ownerId=null, submittedBy=adminId', async () => {
    const res = await request(app)
      .post('/api/businesses')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ ...validPayload() });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.status).toBe('pending');
    expect(res.body.data.ownerId).toBeNull();
    expect(res.body.data.submittedBy).toBe(adminId);

    createdBusinessIds.push(res.body.data.id);
  });

  // ── Test 4: seed_admin role ───────────────────────────────────────────────
  it('4. seed_admin role → status=published, ownerId=null, submittedBy=seedAdminId', async () => {
    const res = await request(app)
      .post('/api/businesses')
      .set('Authorization', `Bearer ${seedAdminToken}`)
      .send({ ...validPayload() });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.status).toBe('published');
    expect(res.body.data.ownerId).toBeNull();
    expect(res.body.data.submittedBy).toBe(seedAdminId);

    createdBusinessIds.push(res.body.data.id);
  });

  // ── Test 5: missing name ──────────────────────────────────────────────────
  it('5. missing name → 400', async () => {
    const { name: _, ...rest } = validPayload();
    const res = await request(app)
      .post('/api/businesses')
      .set('Authorization', `Bearer ${userToken}`)
      .send(rest);

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  // ── Test 6: missing categoryId ────────────────────────────────────────────
  it('6. missing categoryId → 400', async () => {
    const { categoryId: _, ...rest } = validPayload();
    const res = await request(app)
      .post('/api/businesses')
      .set('Authorization', `Bearer ${userToken}`)
      .send(rest);

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  // ── Test 7: missing location ──────────────────────────────────────────────
  it('7. missing location → 400', async () => {
    const { location: _, ...rest } = validPayload();
    const res = await request(app)
      .post('/api/businesses')
      .set('Authorization', `Bearer ${userToken}`)
      .send(rest);

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  // ── Test 8: missing landmarkDescription ───────────────────────────────────
  it('8. missing landmarkDescription → 400', async () => {
    const { landmarkDescription: _, ...rest } = validPayload();
    const res = await request(app)
      .post('/api/businesses')
      .set('Authorization', `Bearer ${userToken}`)
      .send(rest);

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  // ── Test 9: invalid latitude ──────────────────────────────────────────────
  it('9. latitude > 90 → 400', async () => {
    const res = await request(app)
      .post('/api/businesses')
      .set('Authorization', `Bearer ${userToken}`)
      .send({ ...validPayload(), location: { lat: 91, lng: 38.74 } });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  // ── Test 10: invalid longitude ────────────────────────────────────────────
  it('10. longitude < -180 → 400', async () => {
    const res = await request(app)
      .post('/api/businesses')
      .set('Authorization', `Bearer ${userToken}`)
      .send({ ...validPayload(), location: { lat: 9.03, lng: -181 } });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  // ── Test 11: non-existent categoryId ─────────────────────────────────────
  it('11. non-existent categoryId → 400', async () => {
    const res = await request(app)
      .post('/api/businesses')
      .set('Authorization', `Bearer ${userToken}`)
      .send({ ...validPayload(), categoryId: 9999 });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.error).toMatch(/does not exist/i);
  });

  // ── Test 12: unauthenticated request ──────────────────────────────────────
  it('12. no auth header → 401', async () => {
    const res = await request(app)
      .post('/api/businesses')
      .send({ ...validPayload() });

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });

  // ── Test 13: GET /api/categories — public ─────────────────────────────────
  it('13. GET /api/categories works without authentication', async () => {
    const res = await request(app).get('/api/categories');

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data.categories)).toBe(true);

    // The test category we created should be present
    const found = res.body.data.categories.find(
      (c: { id: number; name: string }) => c.id === testCategoryId
    );
    expect(found).toBeDefined();
    expect(found).toHaveProperty('id');
    expect(found).toHaveProperty('name');
    // Confirm no unexpected fields leak out
    expect(found).not.toHaveProperty('businesses');
  });

  // ── Test 14: PostGIS location stored with correct coordinate order ─────────
  it('14. PostGIS location stored with correct lng/lat order (ST_X=lng, ST_Y=lat)', async () => {
    const testLat = 9.0320;
    const testLng = 38.7465;

    const createRes = await request(app)
      .post('/api/businesses')
      .set('Authorization', `Bearer ${userToken}`)
      .send({
        ...validPayload(),
        name: `Location Order Test ${Date.now()}`,
        location: { lat: testLat, lng: testLng },
      });

    expect(createRes.status).toBe(201);
    const businessId: string = createRes.body.data.id;
    createdBusinessIds.push(businessId);

    // Query back the stored coordinates directly via PostGIS functions.
    // ST_X returns the x-axis value (longitude), ST_Y returns y-axis (latitude).
    const rows = await prisma.$queryRaw<Array<{ x: number; y: number }>>`
      SELECT
        ST_X(location::geometry) AS x,
        ST_Y(location::geometry) AS y
      FROM businesses
      WHERE id = ${businessId}::uuid
    `;

    expect(rows).toHaveLength(1);
    // Verify the coordinates are stored in the correct (lng, lat) order
    expect(rows[0].x).toBeCloseTo(testLng, 4); // ST_X = longitude
    expect(rows[0].y).toBeCloseTo(testLat, 4); // ST_Y = latitude
  });

  // ── Test 15: submittedBy injection blocked for all roles ──────────────────
  describe('15. submittedBy cannot be overridden via request body (all roles)', () => {
    const injectedId = '00000000-0000-0000-0000-000000000001';

    const roles = [
      { label: 'user', getToken: () => userToken, getExpected: () => userId },
      { label: 'business_owner', getToken: () => ownerToken, getExpected: () => ownerId },
      { label: 'admin', getToken: () => adminToken, getExpected: () => adminId },
      { label: 'seed_admin', getToken: () => seedAdminToken, getExpected: () => seedAdminId },
    ];

    roles.forEach(({ label, getToken, getExpected }) => {
      it(`role=${label}: injected submittedBy is silently ignored`, async () => {
        const res = await request(app)
          .post('/api/businesses')
          .set('Authorization', `Bearer ${getToken()}`)
          .send({ ...validPayload(), submittedBy: injectedId });

        expect(res.status).toBe(201);
        // The response must reflect the real authenticated user, not the injected ID
        expect(res.body.data.submittedBy).toBe(getExpected());
        expect(res.body.data.submittedBy).not.toBe(injectedId);

        createdBusinessIds.push(res.body.data.id);
      });
    });
  });

  // ── Test 16: ownerId injection blocked ────────────────────────────────────
  it('16. user role injecting ownerId → ownerId is still null', async () => {
    const injectedOwnerId = '00000000-0000-0000-0000-000000000002';

    const res = await request(app)
      .post('/api/businesses')
      .set('Authorization', `Bearer ${userToken}`)
      .send({ ...validPayload(), ownerId: injectedOwnerId });

    expect(res.status).toBe(201);
    // user role must always have ownerId=null regardless of what body says
    expect(res.body.data.ownerId).toBeNull();
    expect(res.body.data.ownerId).not.toBe(injectedOwnerId);

    createdBusinessIds.push(res.body.data.id);
  });

  // ── Test 17: status injection blocked ─────────────────────────────────────
  describe('17. status cannot be overridden via request body', () => {
    it('user role sending status=published → remains pending', async () => {
      const res = await request(app)
        .post('/api/businesses')
        .set('Authorization', `Bearer ${userToken}`)
        .send({ ...validPayload(), status: 'published' });

      expect(res.status).toBe(201);
      expect(res.body.data.status).toBe('pending');

      createdBusinessIds.push(res.body.data.id);
    });

    it('business_owner role sending status=published → remains pending', async () => {
      const res = await request(app)
        .post('/api/businesses')
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({ ...validPayload(), status: 'published' });

      expect(res.status).toBe(201);
      expect(res.body.data.status).toBe('pending');

      createdBusinessIds.push(res.body.data.id);
    });
  });

  // ── Test 18: Transaction rollback on second-write failure ─────────────────
  it('18. transaction rolls back — no orphan business row after photo-write failure', async () => {
    const uniqueName = `TxRollback_${Date.now()}`;

    /**
     * Save the original $transaction method BEFORE spying, so the mock
     * implementation can delegate to the real transaction (avoiding recursion).
     */
    const originalTransaction = (prisma.$transaction as Function).bind(prisma);

    const txSpy = jest
      .spyOn(prisma, '$transaction')
      .mockImplementationOnce(async (fn: any, options?: any) => {
        /**
         * Run the real Prisma transaction, but wrap the tx object in a Proxy
         * that intercepts businessPhoto.createMany and makes it fail.
         *
         * The $queryRaw INSERT (business + geography) executes against the
         * real database inside this real transaction. When createMany throws,
         * Postgres rolls back the entire transaction — including the INSERT.
         */
        return originalTransaction(async (realTx: any) => {
          const proxiedTx = new Proxy(realTx as object, {
            get(target: any, prop: string | symbol) {
              if (prop === 'businessPhoto') {
                return {
                  createMany: jest
                    .fn()
                    .mockRejectedValue(
                      new Error('Simulated photo write failure — testing transaction rollback')
                    ),
                };
              }
              const val = target[prop];
              return typeof val === 'function' ? val.bind(target) : val;
            },
          });
          return fn(proxiedTx);
        }, options);
      });

    let res: any;
    try {
      res = await request(app)
        .post('/api/businesses')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          name: uniqueName,
          categoryId: testCategoryId,
          location: { lat: 9.03, lng: 38.74 },
          landmarkDescription: 'Rollback test landmark',
          photoUrls: ['https://example.com/rollback-test.jpg'], // triggers the two-step write
        });
    } finally {
      txSpy.mockRestore();
    }

    // The service should surface a 500 (transaction failed)
    expect(res.status).toBe(500);

    // Critical assertion: the business row must NOT exist in the database.
    // If the transaction did not roll back, this would return a row.
    const orphan = await prisma.business.findFirst({
      where: { name: uniqueName },
    });
    expect(orphan).toBeNull();
  });
});
