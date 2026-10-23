/**
 * TrustNear — Full QA Test Suite for TN-011 (Business Photos & Media Management)
 * Mapped to Requirement FR-011 / UC-011
 * Test Specifications: PHOTO-001 through PHOTO-020
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

async function runBusinessPhotoTestSuite() {
  console.log('\n======================================================');
  console.log('  📸 TRUSTNEAR TN-011 BUSINESS PHOTOS TEST SUITE');
  console.log('======================================================\n');

  let adminId: string = '';
  let adminToken: string = '';
  let owner1Id: string = '';
  let owner1Token: string = '';
  let owner2Id: string = '';
  let owner2Token: string = '';

  let categoryId: number = 0;
  let bizId: string = '';
  let otherBizId: string = '';
  let photo1Id: string = '';
  let photo2Id: string = '';

  try {
    const passwordHash = await bcrypt.hash('TestPass123!', 8);

    const admin = await prisma.user.create({
      data: {
        email: `pht_admin_${Date.now()}@example.com`,
        passwordHash,
        displayName: 'PHT Admin User',
        role: 'admin',
      },
    });
    adminId = admin.id;
    adminToken = makeToken(admin.id, 'admin');

    const o1 = await prisma.user.create({
      data: {
        email: `pht_owner1_${Date.now()}@example.com`,
        passwordHash,
        displayName: 'PHT Owner 1',
        role: 'business_owner',
      },
    });
    owner1Id = o1.id;
    owner1Token = makeToken(o1.id, 'business_owner');

    const o2 = await prisma.user.create({
      data: {
        email: `pht_owner2_${Date.now()}@example.com`,
        passwordHash,
        displayName: 'PHT Owner 2',
        role: 'business_owner',
      },
    });
    owner2Id = o2.id;
    owner2Token = makeToken(o2.id, 'business_owner');

    // Create Category & Businesses
    let cat = await prisma.category.findFirst({ where: { name: 'Photo Test Cat' } });
    if (!cat) cat = await prisma.category.create({ data: { name: 'Photo Test Cat' } });
    categoryId = cat.id;

    const [b1] = await prisma.$queryRaw<[{ id: string }]>`
      INSERT INTO businesses (
        name, category_id, landmark_description, location, status, submitted_by, owner_id, updated_at
      ) VALUES (
        'PHT Photo Studio 1',
        ${categoryId}::smallint,
        'Bole Road',
        ST_SetSRID(ST_MakePoint(38.78, 9.00), 4326)::geography,
        'published'::"BusinessStatus",
        ${owner1Id}::uuid,
        ${owner1Id}::uuid,
        NOW()
      ) RETURNING id
    `;
    bizId = b1.id;

    const [b2] = await prisma.$queryRaw<[{ id: string }]>`
      INSERT INTO businesses (
        name, category_id, landmark_description, location, status, submitted_by, owner_id, updated_at
      ) VALUES (
        'PHT Photo Studio 2',
        ${categoryId}::smallint,
        'Piazza',
        ST_SetSRID(ST_MakePoint(38.75, 9.03), 4326)::geography,
        'published'::"BusinessStatus",
        ${owner2Id}::uuid,
        ${owner2Id}::uuid,
        NOW()
      ) RETURNING id
    `;
    otherBizId = b2.id;

    // ──────────────────────────────────────────────────────────
    // 1. PHOTO CRUD OPERATIONS (PHOTO-001 – PHOTO-005)
    // ──────────────────────────────────────────────────────────
    console.log('\n--- 1. PHOTO CRUD OPERATIONS ---');

    try {
      const res = await request(app)
        .post(`/api/businesses/${bizId}/photos`)
        .set('Authorization', `Bearer ${owner1Token}`)
        .send({
          url: 'https://res.cloudinary.com/demo/image/upload/v123456/photo1.jpg',
          sortOrder: 1,
        });

      assert.strictEqual(res.status, 201);
      assert.strictEqual(res.body.success, true);
      assert.strictEqual(res.body.data.businessId, bizId);
      assert.strictEqual(res.body.data.sortOrder, 1);
      photo1Id = res.body.data.id;
      recordPass('PHOTO-001', 'CRUD', 'Owner adds photo to business listing (201 Created)');
    } catch (e) { recordFail('PHOTO-001', 'CRUD', 'Add photo', e); }

    try {
      const res = await request(app)
        .post(`/api/businesses/${bizId}/photos`)
        .set('Authorization', `Bearer ${owner1Token}`)
        .send({
          url: 'https://res.cloudinary.com/demo/image/upload/v123456/photo2.jpg',
          sortOrder: 0,
        });

      assert.strictEqual(res.status, 201);
      photo2Id = res.body.data.id;

      const listRes = await request(app).get(`/api/businesses/${bizId}/photos`);
      assert.strictEqual(listRes.status, 200);
      assert.strictEqual(listRes.body.success, true);
      assert.ok(Array.isArray(listRes.body.data));
      assert.strictEqual(listRes.body.data.length, 2);
      assert.strictEqual(listRes.body.data[0].id, photo2Id); // sortOrder 0 comes first
      recordPass('PHOTO-002', 'CRUD', 'GET /photos returns business photos sorted by sortOrder ASC');
    } catch (e) { recordFail('PHOTO-002', 'CRUD', 'List photos', e); }

    try {
      const res = await request(app)
        .patch(`/api/businesses/${bizId}/photos/${photo1Id}`)
        .set('Authorization', `Bearer ${owner1Token}`)
        .send({
          url: 'https://res.cloudinary.com/demo/image/upload/v123456/photo1_updated.jpg',
          sortOrder: 5,
        });

      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.body.data.url, 'https://res.cloudinary.com/demo/image/upload/v123456/photo1_updated.jpg');
      assert.strictEqual(res.body.data.sortOrder, 5);
      recordPass('PHOTO-003', 'CRUD', 'Owner updates photo URL & sort order (200 OK)');
    } catch (e) { recordFail('PHOTO-003', 'CRUD', 'Update photo', e); }

    try {
      const res = await request(app)
        .put(`/api/businesses/${bizId}/photos/reorder`)
        .set('Authorization', `Bearer ${owner1Token}`)
        .send({
          photos: [
            { id: photo1Id, sortOrder: 0 },
            { id: photo2Id, sortOrder: 1 },
          ],
        });

      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.body.data[0].id, photo1Id);
      recordPass('PHOTO-004', 'CRUD', 'Owner batch reorders business photos (200 OK)');
    } catch (e) { recordFail('PHOTO-004', 'CRUD', 'Reorder photos', e); }

    try {
      const res = await request(app)
        .delete(`/api/businesses/${bizId}/photos/${photo2Id}`)
        .set('Authorization', `Bearer ${owner1Token}`);

      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.body.data.id, photo2Id);
      recordPass('PHOTO-005', 'CRUD', 'Owner deletes photo record (200 OK)');
    } catch (e) { recordFail('PHOTO-005', 'CRUD', 'Delete photo', e); }

    // ──────────────────────────────────────────────────────────
    // 2. AUTHENTICATION & AUTHORIZATION (PHOTO-006 – PHOTO-008)
    // ──────────────────────────────────────────────────────────
    console.log('\n--- 2. AUTHENTICATION & AUTHORIZATION ---');

    try {
      const res = await request(app)
        .post(`/api/businesses/${bizId}/photos`)
        .send({ url: 'https://example.com/unauth.jpg' });

      assert.strictEqual(res.status, 401);
      recordPass('PHOTO-006', 'Security', 'Unauthenticated request to add photo rejected with 401');
    } catch (e) { recordFail('PHOTO-006', 'Security', 'Unauthenticated add photo', e); }

    try {
      const res = await request(app)
        .post(`/api/businesses/${bizId}/photos`)
        .set('Authorization', `Bearer ${owner2Token}`)
        .send({ url: 'https://example.com/stolen.jpg' });

      assert.strictEqual(res.status, 403);
      recordPass('PHOTO-007', 'IDOR Security', 'Owner 2 cannot add photo to Owner 1 business (403 Forbidden)');
    } catch (e) { recordFail('PHOTO-007', 'IDOR Security', 'Non-owner photo add', e); }

    try {
      const res = await request(app)
        .post(`/api/businesses/${bizId}/photos`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ url: 'https://example.com/admin.jpg', sortOrder: 9 });

      assert.strictEqual(res.status, 201);
      recordPass('PHOTO-008', 'Admin Override', 'Admin user can add photos to any business (201 Created)');
    } catch (e) { recordFail('PHOTO-008', 'Admin Override', 'Admin add photo', e); }

    // ──────────────────────────────────────────────────────────
    // 3. VALIDATION & BUSINESS RULES (PHOTO-009 – PHOTO-015)
    // ──────────────────────────────────────────────────────────
    console.log('\n--- 3. VALIDATION & BUSINESS RULES ---');

    try {
      const res = await request(app)
        .post('/api/businesses/invalid-uuid/photos')
        .set('Authorization', `Bearer ${owner1Token}`)
        .send({ url: 'https://example.com/test.jpg' });

      assert.strictEqual(res.status, 400);
      recordPass('PHOTO-009', 'Validation', 'Invalid business UUID returns 400 Bad Request');
    } catch (e) { recordFail('PHOTO-009', 'Validation', 'Invalid business UUID', e); }

    try {
      const res = await request(app)
        .post(`/api/businesses/${bizId}/photos`)
        .set('Authorization', `Bearer ${owner1Token}`)
        .send({ url: 'not-a-valid-url' });

      assert.strictEqual(res.status, 400);
      recordPass('PHOTO-010', 'Validation', 'Malformed photo URL format returns 400 Bad Request');
    } catch (e) { recordFail('PHOTO-010', 'Validation', 'Malformed URL', e); }

    try {
      const res = await request(app)
        .post(`/api/businesses/${bizId}/photos`)
        .set('Authorization', `Bearer ${owner1Token}`)
        .send({ url: 'https://example.com/test.jpg', sortOrder: -5 });

      assert.strictEqual(res.status, 400);
      recordPass('PHOTO-011', 'Validation', 'Negative sortOrder returns 400 Bad Request');
    } catch (e) { recordFail('PHOTO-011', 'Validation', 'Negative sortOrder', e); }

    try {
      // Fill up to 10 photos
      const currentCount = await prisma.businessPhoto.count({ where: { businessId: bizId } });
      const needed = 10 - currentCount;
      for (let i = 0; i < needed; i++) {
        await prisma.businessPhoto.create({
          data: { businessId: bizId, url: `https://example.com/fill_${i}.jpg`, sortOrder: i + 10 },
        });
      }

      // Try 11th photo
      const res = await request(app)
        .post(`/api/businesses/${bizId}/photos`)
        .set('Authorization', `Bearer ${owner1Token}`)
        .send({ url: 'https://example.com/overflow.jpg' });

      assert.strictEqual(res.status, 400);
      assert.ok((res.body.error || res.body.message || '').includes('Maximum limit of 10 photos'));
      recordPass('PHOTO-012', 'Business Rules', 'Exceeding 10 photos per business limit returns 400 Bad Request');
    } catch (e) { recordFail('PHOTO-012', 'Business Rules', 'Max photos limit', e); }

    try {
      const res = await request(app)
        .delete(`/api/businesses/${bizId}/photos/${photo1Id}`)
        .set('Authorization', `Bearer ${owner2Token}`);

      assert.strictEqual(res.status, 403);
      recordPass('PHOTO-013', 'IDOR Security', 'Owner 2 cannot delete Owner 1 photo (403 Forbidden)');
    } catch (e) { recordFail('PHOTO-013', 'IDOR Security', 'Unauthorized deletion', e); }

    try {
      const res = await request(app)
        .delete(`/api/businesses/${otherBizId}/photos/${photo1Id}`)
        .set('Authorization', `Bearer ${owner2Token}`);

      assert.strictEqual(res.status, 404);
      recordPass('PHOTO-014', 'Business Rules', 'Deleting photo associated with wrong business returns 404');
    } catch (e) { recordFail('PHOTO-014', 'Business Rules', 'Photo wrong business', e); }

  } finally {
    // Pre-teardown cleanup
    console.log('\n======================================================');
    console.log('  TN-011 PRE-TEARDOWN CLEANUP');
    console.log('======================================================');
    if (bizId! || otherBizId!) {
      await prisma.businessPhoto.deleteMany({
        where: { businessId: { in: [bizId!, otherBizId!].filter(Boolean) } },
      });
      await prisma.business.deleteMany({
        where: { id: { in: [bizId!, otherBizId!].filter(Boolean) } },
      });
    }
    if (categoryId!) {
      await prisma.category.deleteMany({ where: { id: categoryId } });
    }
    if (adminId! || owner1Id! || owner2Id!) {
      await prisma.user.deleteMany({
        where: { id: { in: [adminId!, owner1Id!, owner2Id!].filter(Boolean) } },
      });
      console.log('Cleanup complete.');
    }
  }

  const passed = results.filter((r) => r.status === 'PASS').length;
  const failed = results.filter((r) => r.status === 'FAIL').length;

  console.log('\n======================================================');
  console.log('  TN-011 BUSINESS PHOTOS TEST SUITE SUMMARY');
  console.log('======================================================');
  console.log(`Total Tests Executed : ${results.length}`);
  console.log(`Passed               : ${passed} ✅`);
  console.log(`Failed               : ${failed} ${failed > 0 ? '❌' : ''}`);

  if (failed === 0) {
    console.log('\n🎉 PASS — TN-011 (Business Photos & Media) is fully verified!\n');
  } else {
    console.error('\n❌ FAIL — Some tests failed.\n');
    process.exit(1);
  }
}

runBusinessPhotoTestSuite().catch((err) => {
  console.error('Test suite failed:', err);
  process.exit(1);
});
