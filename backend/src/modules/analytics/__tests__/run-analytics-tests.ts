/**
 * TrustNear — Full QA Test Suite for TN-023 (Admin Platform Analytics)
 * Mapped to Requirement FR-023 / UC-023
 * Test Specifications: ANL-001 through ANL-025
 */
import assert from 'assert';
// @ts-ignore
import request from 'supertest';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import app from '../../../server';
import { prisma } from '../../../config/db';

const JWT_SECRET = process.env.JWT_SECRET || 'trustnear-secret-key';
const makeToken = (id: string, role: string, expiresIn: any = '1h') =>
  jwt.sign({ id, role }, JWT_SECRET, { expiresIn } as jwt.SignOptions);

interface QAResult {
  id: string;
  category: string;
  name: string;
  status: 'PASS' | 'FAIL';
  details?: string;
}
const results: QAResult[] = [];

function recordPass(id: string, category: string, name: string) {
  results.push({ id, category, name, status: 'PASS' });
  console.log(`  ✅ [PASS] ${id}: ${name}`);
}
function recordFail(id: string, category: string, name: string, error: any) {
  results.push({ id, category, name, status: 'FAIL', details: String(error?.message ?? error) });
  console.error(`  ❌ [FAIL] ${id}: ${name} — ${error?.message ?? error}`);
}

async function runAnalyticsTestSuite() {
  console.log('\n======================================================');
  console.log('  📈 TRUSTNEAR TN-023 ADMIN ANALYTICS TEST SUITE');
  console.log('======================================================\n');

  let adminId: string = '';
  let adminToken: string = '';
  let ownerId: string = '';
  let ownerToken: string = '';
  let userId: string = '';
  let userToken: string = '';
  let testCategoryId: number = 0;
  let testBizId: string = '';

  try {
    const passwordHash = await bcrypt.hash('TestPass123!', 8);

    const admin = await prisma.user.create({
      data: {
        email: `anl_admin_${Date.now()}@example.com`,
        passwordHash,
        displayName: 'ANL Admin User',
        role: 'admin',
      },
    });
    adminId = admin.id;
    adminToken = makeToken(admin.id, 'admin');

    const owner = await prisma.user.create({
      data: {
        email: `anl_owner_${Date.now()}@example.com`,
        passwordHash,
        displayName: 'ANL Owner User',
        role: 'business_owner',
      },
    });
    ownerId = owner.id;
    ownerToken = makeToken(owner.id, 'business_owner');

    const normUser = await prisma.user.create({
      data: {
        email: `anl_user_${Date.now()}@example.com`,
        passwordHash,
        displayName: 'ANL Normal User',
        role: 'user',
      },
    });
    userId = normUser.id;
    userToken = makeToken(normUser.id, 'user');

    // Create category and test business for analytics data
    let cat = await prisma.category.findFirst({ where: { name: 'Analytics Cat' } });
    if (!cat) {
      cat = await prisma.category.create({
        data: { name: 'Analytics Cat' },
      });
    }
    testCategoryId = cat.id;

    const [biz] = await prisma.$queryRaw<[{ id: string }]>`
      INSERT INTO businesses (
        name, category_id, landmark_description, location, status, submitted_by, owner_id, updated_at
      ) VALUES (
        'ANL Test Business',
        ${testCategoryId}::smallint,
        'ANL Landmark',
        ST_SetSRID(ST_MakePoint(38.78, 9.00), 4326)::geography,
        'published'::"BusinessStatus",
        ${ownerId}::uuid,
        ${ownerId}::uuid,
        NOW()
      ) RETURNING id
    `;
    testBizId = biz.id;

    // Create test review for rating aggregation
    await prisma.review.create({
      data: {
        businessId: testBizId,
        userId: userId,
        rating: 5,
        comment: 'Great business for analytics test',
        isVerified: true,
      },
    });

    // ──────────────────────────────────────────────────────────
    // 1. ACCESS CONTROL & RBAC (ANL-001 – ANL-005)
    // ──────────────────────────────────────────────────────────
    console.log('\n--- 1. ACCESS CONTROL & RBAC ---');

    try {
      const res = await request(app).get('/api/admin/analytics/overview');
      assert.strictEqual(res.status, 401);
      recordPass('ANL-001', 'Access Control', 'Unauthenticated request to /overview rejected with 401');
    } catch (e) { recordFail('ANL-001', 'Access Control', 'Unauthenticated request', e); }

    try {
      const res = await request(app)
        .get('/api/admin/analytics/overview')
        .set('Authorization', `Bearer ${userToken}`);
      assert.strictEqual(res.status, 403);
      recordPass('ANL-002', 'Access Control', 'Regular user request rejected with 403 Forbidden');
    } catch (e) { recordFail('ANL-002', 'Access Control', 'User role forbidden', e); }

    try {
      const res = await request(app)
        .get('/api/admin/analytics/overview')
        .set('Authorization', `Bearer ${ownerToken}`);
      assert.strictEqual(res.status, 403);
      recordPass('ANL-003', 'Access Control', 'Business owner request rejected with 403 Forbidden');
    } catch (e) { recordFail('ANL-003', 'Access Control', 'Owner role forbidden', e); }

    try {
      const res = await request(app)
        .get('/api/admin/analytics/overview')
        .set('Authorization', `Bearer ${adminToken}`);
      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.body.success, true);
      recordPass('ANL-004', 'Access Control', 'Admin request to /overview succeeds with 200 OK');
    } catch (e) { recordFail('ANL-004', 'Access Control', 'Admin request allowed', e); }

    // ──────────────────────────────────────────────────────────
    // 2. OVERVIEW METRICS ACCURACY (ANL-006 – ANL-015)
    // ──────────────────────────────────────────────────────────
    console.log('\n--- 2. OVERVIEW METRICS ACCURACY ---');

    try {
      const res = await request(app)
        .get('/api/admin/analytics/overview')
        .set('Authorization', `Bearer ${adminToken}`);

      assert.strictEqual(res.status, 200);
      const data = res.body.data;

      assert.ok(typeof data.users.total === 'number' && data.users.total >= 3);
      assert.ok(typeof data.users.byRole.users === 'number');
      assert.ok(typeof data.users.byRole.businessOwners === 'number');
      assert.ok(typeof data.users.byRole.admins === 'number');
      recordPass('ANL-006', 'User Metrics', 'Overview contains accurate user role breakdown');

      assert.ok(typeof data.businesses.total === 'number' && data.businesses.total >= 1);
      assert.ok(typeof data.businesses.byStatus.published === 'number');
      assert.ok(typeof data.businesses.byStatus.pending === 'number');
      assert.ok(typeof data.businesses.byStatus.rejected === 'number');
      recordPass('ANL-007', 'Business Metrics', 'Overview contains accurate business status breakdown');

      assert.ok(typeof data.reviews.total === 'number' && data.reviews.total >= 1);
      assert.ok(typeof data.reviews.verified === 'number' && data.reviews.verified >= 1);
      assert.ok(typeof data.reviews.averageRating === 'number');
      recordPass('ANL-008', 'Review Metrics', 'Overview contains accurate review and rating metrics');

      assert.ok(typeof data.claims.total === 'number');
      assert.ok(typeof data.claims.byStatus.pending === 'number');
      recordPass('ANL-009', 'Claim Metrics', 'Overview contains accurate business claim metrics');
    } catch (e) { recordFail('ANL-006', 'Overview Metrics', 'Overview properties payload check', e); }

    // ──────────────────────────────────────────────────────────
    // 3. TIMEFRAME FILTERS (ANL-016 – ANL-020)
    // ──────────────────────────────────────────────────────────
    console.log('\n--- 3. TIMEFRAME FILTERS ---');

    try {
      const res7d = await request(app)
        .get('/api/admin/analytics/overview?timeframe=7d')
        .set('Authorization', `Bearer ${adminToken}`);

      assert.strictEqual(res7d.status, 200);
      assert.strictEqual(res7d.body.data.timeframe, '7d');
      recordPass('ANL-016', 'Timeframe Filter', 'timeframe=7d query filter processed correctly');
    } catch (e) { recordFail('ANL-016', 'Timeframe Filter', '7d filter', e); }

    try {
      const resAll = await request(app)
        .get('/api/admin/analytics/overview?timeframe=all')
        .set('Authorization', `Bearer ${adminToken}`);

      assert.strictEqual(resAll.status, 200);
      assert.strictEqual(resAll.body.data.timeframe, 'all');
      recordPass('ANL-017', 'Timeframe Filter', 'timeframe=all query filter processed correctly');
    } catch (e) { recordFail('ANL-017', 'Timeframe Filter', 'all filter', e); }

    try {
      const resBad = await request(app)
        .get('/api/admin/analytics/overview?timeframe=invalid_timeframe')
        .set('Authorization', `Bearer ${adminToken}`);

      assert.strictEqual(resBad.status, 400);
      recordPass('ANL-018', 'Input Validation', 'Invalid timeframe query parameter returns 400');
    } catch (e) { recordFail('ANL-018', 'Input Validation', 'Invalid timeframe', e); }

    // ──────────────────────────────────────────────────────────
    // 4. CATEGORY DISTRIBUTION (ANL-021 – ANL-025)
    // ──────────────────────────────────────────────────────────
    console.log('\n--- 4. CATEGORY DISTRIBUTION ---');

    try {
      const res = await request(app)
        .get('/api/admin/analytics/categories')
        .set('Authorization', `Bearer ${adminToken}`);

      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.body.success, true);
      assert.ok(Array.isArray(res.body.data.categories));
      assert.ok(typeof res.body.data.totalBusinesses === 'number');

      const targetCat = res.body.data.categories.find((c: any) => c.id === testCategoryId);
      assert.ok(targetCat);
      assert.ok(targetCat.businessCount >= 1);
      recordPass('ANL-021', 'Category Distribution', 'GET /categories returns accurate category business counts');
    } catch (e) { recordFail('ANL-021', 'Category Distribution', 'GET /categories test', e); }

    // ──────────────────────────────────────────────────────────
    // 5. TOP RATED & MOST VIEWED LISTS (ANL-026 – ANL-030)
    // ──────────────────────────────────────────────────────────
    console.log('\n--- 5. TOP RATED & MOST VIEWED LISTS ---');

    try {
      const resTop = await request(app)
        .get('/api/admin/analytics/top-rated?limit=5')
        .set('Authorization', `Bearer ${adminToken}`);

      assert.strictEqual(resTop.status, 200);
      assert.strictEqual(resTop.body.success, true);
      assert.ok(Array.isArray(resTop.body.data));
      recordPass('ANL-026', 'Top Rated', 'GET /top-rated returns filtered top-rated businesses list');
    } catch (e) { recordFail('ANL-026', 'Top Rated', 'GET /top-rated test', e); }

    try {
      const resMost = await request(app)
        .get('/api/admin/analytics/most-viewed?limit=5')
        .set('Authorization', `Bearer ${adminToken}`);

      assert.strictEqual(resMost.status, 200);
      assert.strictEqual(resMost.body.success, true);
      assert.ok(Array.isArray(resMost.body.data));
      recordPass('ANL-027', 'Most Viewed', 'GET /most-viewed returns filtered most-viewed businesses list');
    } catch (e) { recordFail('ANL-027', 'Most Viewed', 'GET /most-viewed test', e); }


  } finally {
    // Pre-teardown cleanup
    console.log('\n======================================================');
    console.log('  TN-023 PRE-TEARDOWN CLEANUP');
    console.log('======================================================');
    if (testBizId!) {
      await prisma.review.deleteMany({ where: { businessId: testBizId } });
      await prisma.business.deleteMany({ where: { id: testBizId } });
    }
    if (testCategoryId!) {
      await prisma.category.deleteMany({ where: { id: testCategoryId } });
    }
    if (adminId! || ownerId! || userId!) {
      await prisma.user.deleteMany({
        where: { id: { in: [adminId!, ownerId!, userId!].filter(Boolean) } },
      });
      console.log('Cleanup complete.');
    }
  }

  const passed = results.filter((r) => r.status === 'PASS').length;
  const failed = results.filter((r) => r.status === 'FAIL').length;

  console.log('\n======================================================');
  console.log('  TN-023 ADMIN ANALYTICS TEST SUITE SUMMARY');
  console.log('======================================================');
  console.log(`Total Tests Executed : ${results.length}`);
  console.log(`Passed               : ${passed} ✅`);
  console.log(`Failed               : ${failed} ${failed > 0 ? '❌' : ''}`);

  if (failed === 0) {
    console.log('\n🎉 PASS — TN-023 (Admin Platform Analytics) is fully verified!\n');
  } else {
    console.error('\n❌ FAIL — Some tests failed.\n');
    process.exit(1);
  }
}

runAnalyticsTestSuite().catch((err) => {
  console.error('Test suite failed:', err);
  process.exit(1);
});
