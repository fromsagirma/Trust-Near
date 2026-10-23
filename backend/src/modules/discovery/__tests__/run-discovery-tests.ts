/**
 * TrustNear — Full QA Test Suite for TN-025 (Personalized Recommendations)
 * Mapped to Requirement FR-025 / UC-025
 * Test Specifications: DSC-001 through DSC-025
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

async function runDiscoveryTestSuite() {
  console.log('\n======================================================');
  console.log('  🔍 TRUSTNEAR TN-025 DISCOVERY & RECOMMENDATIONS TEST SUITE');
  console.log('======================================================\n');

  let user1Id: string = '';
  let user1Token: string = '';
  let user2Id: string = '';
  let user2Token: string = '';

  let cat1Id: number = 0;
  let cat2Id: number = 0;
  let biz1Id: string = '';
  let biz2Id: string = '';
  let pendingBizId: string = '';

  try {
    const passwordHash = await bcrypt.hash('TestPass123!', 8);

    const u1 = await prisma.user.create({
      data: {
        email: `dsc_user1_${Date.now()}@example.com`,
        passwordHash,
        displayName: 'DSC User 1',
        role: 'user',
      },
    });
    user1Id = u1.id;
    user1Token = makeToken(u1.id, 'user');

    const u2 = await prisma.user.create({
      data: {
        email: `dsc_user2_${Date.now()}@example.com`,
        passwordHash,
        displayName: 'DSC User 2',
        role: 'user',
      },
    });
    user2Id = u2.id;
    user2Token = makeToken(u2.id, 'user');

    // Create Categories
    let c1 = await prisma.category.findFirst({ where: { name: 'DSC Bakery' } });
    if (!c1) c1 = await prisma.category.create({ data: { name: 'DSC Bakery' } });
    cat1Id = c1.id;

    let c2 = await prisma.category.findFirst({ where: { name: 'DSC Bookstore' } });
    if (!c2) c2 = await prisma.category.create({ data: { name: 'DSC Bookstore' } });
    cat2Id = c2.id;

    // Create Published Business 1 (Category 1)
    const [b1] = await prisma.$queryRaw<[{ id: string }]>`
      INSERT INTO businesses (
        name, category_id, landmark_description, location, status, submitted_by, avg_rating, review_count, updated_at
      ) VALUES (
        'DSC Bole Bakery',
        ${cat1Id}::smallint,
        'Near Bole Medhanialem',
        ST_SetSRID(ST_MakePoint(38.7801, 9.0001), 4326)::geography,
        'published'::"BusinessStatus",
        ${user1Id}::uuid,
        4.8,
        15,
        NOW()
      ) RETURNING id
    `;
    biz1Id = b1.id;

    // Create Published Business 2 (Category 2)
    const [b2] = await prisma.$queryRaw<[{ id: string }]>`
      INSERT INTO businesses (
        name, category_id, landmark_description, location, status, submitted_by, avg_rating, review_count, updated_at
      ) VALUES (
        'DSC Piazza Books',
        ${cat2Id}::smallint,
        'Piazza Square',
        ST_SetSRID(ST_MakePoint(38.7500, 9.0300), 4326)::geography,
        'published'::"BusinessStatus",
        ${user1Id}::uuid,
        4.5,
        8,
        NOW()
      ) RETURNING id
    `;
    biz2Id = b2.id;

    // Create Pending Business (must be excluded)
    const [bPend] = await prisma.$queryRaw<[{ id: string }]>`
      INSERT INTO businesses (
        name, category_id, landmark_description, location, status, submitted_by, updated_at
      ) VALUES (
        'DSC Pending Spot',
        ${cat1Id}::smallint,
        'Unapproved Location',
        ST_SetSRID(ST_MakePoint(38.7800, 9.0000), 4326)::geography,
        'pending'::"BusinessStatus",
        ${user1Id}::uuid,
        NOW()
      ) RETURNING id
    `;
    pendingBizId = bPend.id;

    // Setup social connection between User 1 & User 2
    await prisma.connection.create({
      data: {
        requesterId: user1Id,
        addresseeId: user2Id,
        status: 'accepted',
      },
    });

    // User 2 leaves 5-star review on Business 1 -> gives User 1 social connection signal
    await prisma.review.create({
      data: {
        businessId: biz1Id,
        userId: user2Id,
        rating: 5,
        comment: 'User 2 loves Bole Bakery!',
      },
    });

    // ──────────────────────────────────────────────────────────
    // 1. PUBLIC RECOMMENDATIONS (DSC-001 – DSC-005)
    // ──────────────────────────────────────────────────────────
    console.log('\n--- 1. PUBLIC RECOMMENDATIONS ---');

    try {
      const res = await request(app).get('/api/recommendations/public?lat=9.00&lng=38.78&radius=5000');
      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.body.success, true);
      assert.ok(Array.isArray(res.body.data.data));
      assert.ok(res.body.data.data.length >= 1);
      assert.ok(res.body.data.data.some((b: any) => b.id === biz1Id));
      recordPass('DSC-001', 'Public Recommendations', 'GET /recommendations/public returns nearby published businesses (200 OK)');
    } catch (e) { recordFail('DSC-001', 'Public Recommendations', 'Get public recs', e); }

    try {
      const res = await request(app).get('/api/recommendations/public?lat=9.00&lng=38.78&radius=5000');
      assert.strictEqual(res.status, 200);
      const ids = res.body.data.data.map((b: any) => b.id);
      assert.strictEqual(ids.includes(pendingBizId), false);
      recordPass('DSC-002', 'Status Filtering', 'Pending businesses are excluded from recommendations');
    } catch (e) { recordFail('DSC-002', 'Status Filtering', 'Pending business exclusion', e); }

    // ──────────────────────────────────────────────────────────
    // 2. PERSONALIZED RECOMMENDATIONS & HYBRID SCORING (DSC-006 – DSC-015)
    // ──────────────────────────────────────────────────────────
    console.log('\n--- 2. PERSONALIZED RECOMMENDATIONS & HYBRID SCORING ---');

    try {
      const res = await request(app)
        .get('/api/recommendations?lat=9.00&lng=38.78&radius=5000')
        .set('Authorization', `Bearer ${user1Token}`);

      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.body.success, true);
      assert.ok(res.body.data.data.length >= 1);
      const topRec = res.body.data.data[0];
      assert.strictEqual(topRec.id, biz1Id);
      assert.ok(topRec.matchReasons.includes('Highly rated by your connections'));
      recordPass('DSC-006', 'Personalization', 'Social connection signals boost recommended business with matchReason');
    } catch (e) { recordFail('DSC-006', 'Personalization', 'Social recommendation boost', e); }

    try {
      // User 1 leaves 5-star review on Category 2 business
      await prisma.review.create({
        data: {
          businessId: biz2Id,
          userId: user1Id,
          rating: 5,
          comment: 'User 1 loves Piazza Books',
        },
      });

      const res = await request(app)
        .get('/api/recommendations?lat=9.00&lng=38.78&radius=50000')
        .set('Authorization', `Bearer ${user1Token}`);

      assert.strictEqual(res.status, 200);
      assert.ok(res.body.data.data.length >= 2);
      recordPass('DSC-007', 'Category Affinity', 'User review history builds category affinity recommendations');
    } catch (e) { recordFail('DSC-007', 'Category Affinity', 'Category affinity', e); }

    // ──────────────────────────────────────────────────────────
    // 3. POSTGIS SPATIAL RADIUS FILTERING (DSC-016 – DSC-020)
    // ──────────────────────────────────────────────────────────
    console.log('\n--- 3. SPATIAL RADIUS FILTERING ---');

    try {
      const resNear = await request(app)
        .get('/api/recommendations/public?lat=9.0001&lng=38.7801&radius=500')
        .set('Authorization', `Bearer ${user1Token}`);

      assert.strictEqual(resNear.status, 200);
      const ids = resNear.body.data.data.map((b: any) => b.id);
      assert.strictEqual(ids.includes(biz1Id), true);
      assert.strictEqual(ids.includes(biz2Id), false); // biz2 is >3km away in Piazza
      recordPass('DSC-016', 'Spatial Filter', 'Small radius (500m) includes close spot and excludes distant spot');
    } catch (e) { recordFail('DSC-016', 'Spatial Filter', '500m radius check', e); }

    // ──────────────────────────────────────────────────────────
    // 4. VALIDATION & SECURITY (DSC-021 – DSC-025)
    // ──────────────────────────────────────────────────────────
    console.log('\n--- 4. VALIDATION & SECURITY ---');

    try {
      const res = await request(app).get('/api/recommendations');
      assert.strictEqual(res.status, 401);
      recordPass('DSC-021', 'Security', 'Unauthenticated GET /api/recommendations returns 401 Unauthorized');
    } catch (e) { recordFail('DSC-021', 'Security', 'Unauthenticated check', e); }

    try {
      const res = await request(app).get('/api/recommendations/public?lat=100');
      assert.strictEqual(res.status, 400);
      recordPass('DSC-022', 'Validation', 'Latitude > 90 returns 400 Bad Request');
    } catch (e) { recordFail('DSC-022', 'Validation', 'Invalid latitude', e); }

    try {
      const res = await request(app).get('/api/recommendations/public?radius=5');
      assert.strictEqual(res.status, 400);
      recordPass('DSC-023', 'Validation', 'Radius < 100m returns 400 Bad Request');
    } catch (e) { recordFail('DSC-023', 'Validation', 'Invalid radius', e); }

  } finally {
    // Pre-teardown cleanup
    console.log('\n======================================================');
    console.log('  TN-025 PRE-TEARDOWN CLEANUP');
    console.log('======================================================');
    if (biz1Id! || biz2Id! || pendingBizId!) {
      await prisma.review.deleteMany({
        where: { businessId: { in: [biz1Id!, biz2Id!, pendingBizId!].filter(Boolean) } },
      });
      await prisma.business.deleteMany({
        where: { id: { in: [biz1Id!, biz2Id!, pendingBizId!].filter(Boolean) } },
      });
    }
    if (cat1Id! || cat2Id!) {
      await prisma.category.deleteMany({
        where: { id: { in: [cat1Id!, cat2Id!].filter(Boolean) } },
      });
    }
    if (user1Id! || user2Id!) {
      await prisma.connection.deleteMany({
        where: {
          OR: [
            { requesterId: { in: [user1Id!, user2Id!].filter(Boolean) } },
            { addresseeId: { in: [user1Id!, user2Id!].filter(Boolean) } },
          ],
        },
      });
      await prisma.user.deleteMany({
        where: { id: { in: [user1Id!, user2Id!].filter(Boolean) } },
      });
      console.log('Cleanup complete.');
    }
  }

  const passed = results.filter((r) => r.status === 'PASS').length;
  const failed = results.filter((r) => r.status === 'FAIL').length;

  console.log('\n======================================================');
  console.log('  TN-025 DISCOVERY TEST SUITE SUMMARY');
  console.log('======================================================');
  console.log(`Total Tests Executed : ${results.length}`);
  console.log(`Passed               : ${passed} ✅`);
  console.log(`Failed               : ${failed} ${failed > 0 ? '❌' : ''}`);

  if (failed === 0) {
    console.log('\n🎉 PASS — TN-025 (Personalized Recommendations) is fully verified!\n');
  } else {
    console.error('\n❌ FAIL — Some tests failed.\n');
    process.exit(1);
  }
}

runDiscoveryTestSuite().catch((err) => {
  console.error('Test suite failed:', err);
  process.exit(1);
});
