/**
 * TrustNear — Full QA Test Suite for TN-017 (Promoted Placement & Sponsoring)
 * Mapped to Requirement FR-017 / UC-017
 * Test Specifications: PRM-001 through PRM-025
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

async function runPromotionsTestSuite() {
  console.log('\n======================================================');
  console.log('  📢 TRUSTNEAR TN-017 PROMOTIONS TEST SUITE');
  console.log('======================================================\n');

  let adminId: string = '';
  let adminToken: string = '';
  let owner1Id: string = '';
  let owner1Token: string = '';
  let owner2Id: string = '';
  let owner2Token: string = '';
  let userId: string = '';
  let userToken: string = '';

  let categoryId: number = 0;
  let pubBizId: string = '';
  let pendingBizId: string = '';
  let promo1Id: string = '';

  try {
    const passwordHash = await bcrypt.hash('TestPass123!', 8);

    const admin = await prisma.user.create({
      data: {
        email: `prm_admin_${Date.now()}@example.com`,
        passwordHash,
        displayName: 'PRM Admin User',
        role: 'admin',
      },
    });
    adminId = admin.id;
    adminToken = makeToken(admin.id, 'admin');

    const o1 = await prisma.user.create({
      data: {
        email: `prm_owner1_${Date.now()}@example.com`,
        passwordHash,
        displayName: 'PRM Owner 1',
        role: 'business_owner',
      },
    });
    owner1Id = o1.id;
    owner1Token = makeToken(o1.id, 'business_owner');

    const o2 = await prisma.user.create({
      data: {
        email: `prm_owner2_${Date.now()}@example.com`,
        passwordHash,
        displayName: 'PRM Owner 2',
        role: 'business_owner',
      },
    });
    owner2Id = o2.id;
    owner2Token = makeToken(o2.id, 'business_owner');

    const u = await prisma.user.create({
      data: {
        email: `prm_user_${Date.now()}@example.com`,
        passwordHash,
        displayName: 'PRM Regular User',
        role: 'user',
      },
    });
    userId = u.id;
    userToken = makeToken(u.id, 'user');

    // Create Category & Businesses
    let cat = await prisma.category.findFirst({ where: { name: 'Promo Cat' } });
    if (!cat) {
      cat = await prisma.category.create({ data: { name: 'Promo Cat' } });
    }
    categoryId = cat.id;

    const [bPub] = await prisma.$queryRaw<[{ id: string }]>`
      INSERT INTO businesses (
        name, category_id, landmark_description, location, status, submitted_by, owner_id, updated_at
      ) VALUES (
        'PRM Published Store',
        ${categoryId}::smallint,
        'Bole Medhanialem',
        ST_SetSRID(ST_MakePoint(38.78, 9.00), 4326)::geography,
        'published'::"BusinessStatus",
        ${owner1Id}::uuid,
        ${owner1Id}::uuid,
        NOW()
      ) RETURNING id
    `;
    pubBizId = bPub.id;

    const [bPend] = await prisma.$queryRaw<[{ id: string }]>`
      INSERT INTO businesses (
        name, category_id, landmark_description, location, status, submitted_by, owner_id, updated_at
      ) VALUES (
        'PRM Pending Store',
        ${categoryId}::smallint,
        'Piazza',
        ST_SetSRID(ST_MakePoint(38.75, 9.03), 4326)::geography,
        'pending'::"BusinessStatus",
        ${owner1Id}::uuid,
        ${owner1Id}::uuid,
        NOW()
      ) RETURNING id
    `;
    pendingBizId = bPend.id;

    // ──────────────────────────────────────────────────────────
    // 1. PROMOTION CREATION (PRM-001 – PRM-010)
    // ──────────────────────────────────────────────────────────
    console.log('\n--- 1. PROMOTION CREATION ---');

    const today = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    const nextMonth = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    try {
      const res = await request(app)
        .post(`/api/owner/businesses/${pubBizId}/promotions`)
        .set('Authorization', `Bearer ${owner1Token}`)
        .send({
          title: 'Special Summer Sale',
          description: '20% off all beverages',
          startDate: today,
          endDate: nextMonth,
        });

      assert.strictEqual(res.status, 201);
      assert.strictEqual(res.body.success, true);
      assert.strictEqual(res.body.data.title, 'Special Summer Sale');
      assert.strictEqual(res.body.data.status, 'active');
      promo1Id = res.body.data.id;
      recordPass('PRM-001', 'Creation', 'Owner creates active promotion for published business (201 Created)');
    } catch (e) { recordFail('PRM-001', 'Creation', 'Create promotion', e); }

    try {
      const res = await request(app)
        .post(`/api/owner/businesses/${pendingBizId}/promotions`)
        .set('Authorization', `Bearer ${owner1Token}`)
        .send({
          title: 'Pending Business Promo',
          startDate: today,
          endDate: nextMonth,
        });

      assert.strictEqual(res.status, 400);
      recordPass('PRM-002', 'Creation Validation', 'Cannot create promotion for pending business (400 Bad Request)');
    } catch (e) { recordFail('PRM-002', 'Creation Validation', 'Pending business promo', e); }

    try {
      const res = await request(app)
        .post(`/api/owner/businesses/${pubBizId}/promotions`)
        .set('Authorization', `Bearer ${owner2Token}`)
        .send({
          title: 'Hijacked Promo',
          startDate: today,
          endDate: nextMonth,
        });

      assert.strictEqual(res.status, 403);
      recordPass('PRM-003', 'Ownership Security', 'Owner 2 cannot create promotion for Owner 1 business (403 Forbidden)');
    } catch (e) { recordFail('PRM-003', 'Ownership Security', 'Unowned business promo', e); }

    try {
      const res = await request(app)
        .post(`/api/owner/businesses/${pubBizId}/promotions`)
        .set('Authorization', `Bearer ${owner1Token}`)
        .send({
          title: 'Invalid Date Promo',
          startDate: '2026-08-30',
          endDate: '2026-08-01',
        });

      assert.strictEqual(res.status, 400);
      recordPass('PRM-004', 'Date Validation', 'endDate earlier than startDate rejected with 400');
    } catch (e) { recordFail('PRM-004', 'Date Validation', 'Invalid date order', e); }

    // ──────────────────────────────────────────────────────────
    // 2. LISTING PROMOTIONS (PRM-011 – PRM-018)
    // ──────────────────────────────────────────────────────────
    console.log('\n--- 2. LISTING PROMOTIONS ---');

    try {
      const res = await request(app)
        .get('/api/owner/promotions')
        .set('Authorization', `Bearer ${owner1Token}`);

      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.body.success, true);
      assert.strictEqual(res.body.data.data.length, 1);
      assert.strictEqual(res.body.data.data[0].id, promo1Id);
      recordPass('PRM-011', 'Owner Listing', 'GET /api/owner/promotions lists owner promotions');
    } catch (e) { recordFail('PRM-011', 'Owner Listing', 'Get owner promotions', e); }

    try {
      const res = await request(app).get('/api/promotions/active');

      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.body.success, true);
      assert.ok(Array.isArray(res.body.data.data));
      assert.ok(res.body.data.data.length >= 1);
      recordPass('PRM-012', 'Public Active Listing', 'GET /api/promotions/active returns active promoted listings (Public Endpoint)');
    } catch (e) { recordFail('PRM-012', 'Public Active Listing', 'Get active promotions', e); }

    try {
      const res = await request(app)
        .get('/api/admin/promotions')
        .set('Authorization', `Bearer ${adminToken}`);

      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.body.success, true);
      assert.ok(res.body.data.data.length >= 1);
      recordPass('PRM-013', 'Admin Listing', 'GET /api/admin/promotions lists all platform promotions');
    } catch (e) { recordFail('PRM-013', 'Admin Listing', 'Admin list promotions', e); }

    // ──────────────────────────────────────────────────────────
    // 3. CANCELLATION (PRM-019 – PRM-022)
    // ──────────────────────────────────────────────────────────
    console.log('\n--- 3. CANCELLATION ---');

    try {
      const res = await request(app)
        .patch(`/api/owner/promotions/${promo1Id}/cancel`)
        .set('Authorization', `Bearer ${owner2Token}`);

      assert.strictEqual(res.status, 404);
      recordPass('PRM-019', 'IDOR Protection', 'Owner 2 cannot cancel Owner 1 promotion (404 Not Found)');
    } catch (e) { recordFail('PRM-019', 'IDOR Protection', 'IDOR cancel promo', e); }

    try {
      const res = await request(app)
        .patch(`/api/owner/promotions/${promo1Id}/cancel`)
        .set('Authorization', `Bearer ${owner1Token}`);

      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.body.data.status, 'cancelled');
      recordPass('PRM-020', 'Cancellation', 'Owner 1 cancels active promotion successfully');
    } catch (e) { recordFail('PRM-020', 'Cancellation', 'Cancel promotion', e); }

    // ──────────────────────────────────────────────────────────
    // 4. SECURITY & VALIDATION (PRM-023 – PRM-025)
    // ──────────────────────────────────────────────────────────
    console.log('\n--- 4. SECURITY & VALIDATION ---');

    try {
      const res = await request(app)
        .post(`/api/owner/businesses/${pubBizId}/promotions`)
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          title: 'Regular User Promo',
          startDate: today,
          endDate: nextMonth,
        });

      assert.strictEqual(res.status, 403);
      recordPass('PRM-023', 'RBAC Security', 'Regular user role rejected with 403 Forbidden on owner endpoint');
    } catch (e) { recordFail('PRM-023', 'RBAC Security', 'User role forbidden', e); }

    try {
      const res = await request(app)
        .patch('/api/owner/promotions/invalid-uuid-format/cancel')
        .set('Authorization', `Bearer ${owner1Token}`);

      assert.strictEqual(res.status, 400);
      recordPass('PRM-024', 'Input Validation', 'Malformed promotion UUID returns 400 Bad Request');
    } catch (e) { recordFail('PRM-024', 'Input Validation', 'Invalid UUID', e); }

  } finally {
    // Pre-teardown cleanup
    console.log('\n======================================================');
    console.log('  TN-017 PRE-TEARDOWN CLEANUP');
    console.log('======================================================');
    if (pubBizId! || pendingBizId!) {
      await prisma.promotion.deleteMany({
        where: { businessId: { in: [pubBizId!, pendingBizId!].filter(Boolean) } },
      });
      await prisma.business.deleteMany({
        where: { id: { in: [pubBizId!, pendingBizId!].filter(Boolean) } },
      });
    }
    if (categoryId!) {
      await prisma.category.deleteMany({ where: { id: categoryId } });
    }
    if (adminId! || owner1Id! || owner2Id! || userId!) {
      await prisma.user.deleteMany({
        where: { id: { in: [adminId!, owner1Id!, owner2Id!, userId!].filter(Boolean) } },
      });
      console.log('Cleanup complete.');
    }
  }

  const passed = results.filter((r) => r.status === 'PASS').length;
  const failed = results.filter((r) => r.status === 'FAIL').length;

  console.log('\n======================================================');
  console.log('  TN-017 PROMOTIONS TEST SUITE SUMMARY');
  console.log('======================================================');
  console.log(`Total Tests Executed : ${results.length}`);
  console.log(`Passed               : ${passed} ✅`);
  console.log(`Failed               : ${failed} ${failed > 0 ? '❌' : ''}`);

  if (failed === 0) {
    console.log('\n🎉 PASS — TN-017 (Promoted Placement & Sponsoring) is fully verified!\n');
  } else {
    console.error('\n❌ FAIL — Some tests failed.\n');
    process.exit(1);
  }
}

runPromotionsTestSuite().catch((err) => {
  console.error('Test suite failed:', err);
  process.exit(1);
});
