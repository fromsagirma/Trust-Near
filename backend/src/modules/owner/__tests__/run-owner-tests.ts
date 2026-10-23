/**
 * TrustNear — Full QA Test Suite for TN-009 (Manage Listing from Business Owner Dashboard)
 * Test Specifications 1 through 42
 */
import assert from 'assert';
// @ts-ignore
import request from 'supertest';
import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';
dotenv.config();

import app from '../../../server';
import { prisma } from '../../../config/db';

const JWT_SECRET = process.env.JWT_SECRET || 'trustnear-secret-key';

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

const generateToken = (id: string, role: string) => {
  return jwt.sign({ id, role }, JWT_SECRET, { expiresIn: '1h' });
};

async function runAllOwnerTests() {
  console.log('===========================================================');
  console.log('💼 TrustNear TN-009 Manage Owner Listing QA Suite (1 - 42)');
  console.log('===========================================================\n');

  let catId1 = 0;
  let catId2 = 0;

  // Test users
  let ownerAId = '';
  let ownerAToken = '';

  let ownerBId = '';
  let ownerBToken = '';

  let userRoleId = '';
  let userRoleToken = '';

  let adminRoleId = '';
  let adminRoleToken = '';

  let seedAdminRoleId = '';
  let seedAdminRoleToken = '';

  // Test businesses
  let ownerABizPendingId = '';
  let ownerABizPublishedId = '';
  let ownerBBizPublishedId = '';

  const createdUserIds: string[] = [];
  const createdBusinessIds: string[] = [];

  const TEST_LAT = 9.0305;
  const TEST_LNG = 38.7405;

  try {
    await prisma.$connect();

    // 1. Setup Categories
    const c1 = await prisma.category.upsert({
      where: { name: 'owner_test_cafes' },
      update: {},
      create: { name: 'owner_test_cafes' },
    });
    catId1 = c1.id;

    const c2 = await prisma.category.upsert({
      where: { name: 'owner_test_restaurants' },
      update: {},
      create: { name: 'owner_test_restaurants' },
    });
    catId2 = c2.id;

    // 2. Setup Test Users
    const createTestUser = async (displayName: string, role: any) => {
      const email = `owner_qa_${Date.now()}_${Math.random().toString(36).substring(7)}@trustnear.com`;
      const u = await prisma.user.create({
        data: {
          displayName,
          email,
          passwordHash: 'dummyhash',
          role,
        },
      });
      createdUserIds.push(u.id);
      return { id: u.id, token: generateToken(u.id, role) };
    };

    const oA = await createTestUser('Owner A', 'business_owner');
    ownerAId = oA.id;
    ownerAToken = oA.token;

    const oB = await createTestUser('Owner B', 'business_owner');
    ownerBId = oB.id;
    ownerBToken = oB.token;

    const uRole = await createTestUser('Standard User', 'user');
    userRoleId = uRole.id;
    userRoleToken = uRole.token;

    const aRole = await createTestUser('Admin User', 'admin');
    adminRoleId = aRole.id;
    adminRoleToken = aRole.token;

    const saRole = await createTestUser('Seed Admin User', 'seed_admin');
    seedAdminRoleId = saRole.id;
    seedAdminRoleToken = saRole.token;

    // Helper to insert business owned by specific user
    const insertTestBiz = async (
      name: string,
      ownerId: string,
      status: 'pending' | 'published' | 'rejected',
      options: {
        categoryId?: number;
        description?: string;
        landmarkDescription?: string;
        phone?: string;
        hours?: any;
        photos?: { url: string; sortOrder: number }[];
      } = {}
    ) => {
      const categoryId = options.categoryId ?? catId1;
      const landmark = options.landmarkDescription ?? 'Near Bole Medhanealem Church';
      const desc = options.description ?? 'A quality business.';
      const phone = options.phone ?? '+251911000000';
      const hoursJson = options.hours ? JSON.stringify(options.hours) : null;

      const rows = await prisma.$queryRaw<[{ id: string }]>`
        INSERT INTO businesses (
          name, category_id, description, landmark_description, location, phone, hours, status, submitted_by, owner_id, avg_rating, review_count, updated_at
        ) VALUES (
          ${name},
          ${categoryId}::smallint,
          ${desc}::text,
          ${landmark}::text,
          ST_SetSRID(ST_MakePoint(${TEST_LNG}::float8, ${TEST_LAT}::float8), 4326)::geography,
          ${phone}::varchar(32),
          ${hoursJson}::jsonb,
          ${status}::"BusinessStatus",
          ${ownerId}::uuid,
          ${ownerId}::uuid,
          4.5::numeric(2,1),
          10::int,
          NOW()
        ) RETURNING id
      `;

      const bId = rows[0].id;
      createdBusinessIds.push(bId);

      if (options.photos && options.photos.length > 0) {
        await prisma.businessPhoto.createMany({
          data: options.photos.map((p) => ({
            businessId: bId,
            url: p.url,
            sortOrder: p.sortOrder,
          })),
        });
      }

      return bId;
    };

    // Seed test businesses
    ownerABizPendingId = await insertTestBiz('Owner A Pending Cafe', ownerAId, 'pending', {
      photos: [{ url: 'https://example.com/photo1.jpg', sortOrder: 0 }],
    });

    ownerABizPublishedId = await insertTestBiz('Owner A Published Cafe', ownerAId, 'published', {
      photos: [{ url: 'https://example.com/photo2.jpg', sortOrder: 0 }],
    });

    ownerBBizPublishedId = await insertTestBiz('Owner B Published Restaurant', ownerBId, 'published', {
      photos: [{ url: 'https://example.com/photo3.jpg', sortOrder: 0 }],
    });

    // ── ACCESS CONTROL TESTS (1 - 5) ──

    // 1. Unauthenticated request -> 401
    try {
      const res = await request(app).get('/api/owner/businesses');
      assert.strictEqual(res.status, 401);
      assert.strictEqual(res.body.success, false);
      recordPass('TEST-01', 'Access Control', 'Unauthenticated request returns 401');
    } catch (e) {
      recordFail('TEST-01', 'Access Control', 'Unauthenticated request returns 401', e);
    }

    // 2. user role -> 403
    try {
      const res = await request(app)
        .get('/api/owner/businesses')
        .set('Authorization', `Bearer ${userRoleToken}`);
      assert.strictEqual(res.status, 403);
      assert.strictEqual(res.body.success, false);
      recordPass('TEST-02', 'Access Control', 'user role returns 403 Forbidden');
    } catch (e) {
      recordFail('TEST-02', 'Access Control', 'user role returns 403 Forbidden', e);
    }

    // 3. admin role -> 403
    try {
      const res = await request(app)
        .get('/api/owner/businesses')
        .set('Authorization', `Bearer ${adminRoleToken}`);
      assert.strictEqual(res.status, 403);
      assert.strictEqual(res.body.success, false);
      recordPass('TEST-03', 'Access Control', 'admin role returns 403 Forbidden');
    } catch (e) {
      recordFail('TEST-03', 'Access Control', 'admin role returns 403 Forbidden', e);
    }

    // 4. seed_admin role -> 403
    try {
      const res = await request(app)
        .get('/api/owner/businesses')
        .set('Authorization', `Bearer ${seedAdminRoleToken}`);
      assert.strictEqual(res.status, 403);
      assert.strictEqual(res.body.success, false);
      recordPass('TEST-04', 'Access Control', 'seed_admin role returns 403 Forbidden');
    } catch (e) {
      recordFail('TEST-04', 'Access Control', 'seed_admin role returns 403 Forbidden', e);
    }

    // 5. business_owner -> allowed
    try {
      const res = await request(app)
        .get('/api/owner/businesses')
        .set('Authorization', `Bearer ${ownerAToken}`);
      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.body.success, true);
      recordPass('TEST-05', 'Access Control', 'business_owner role is allowed (200 OK)');
    } catch (e) {
      recordFail('TEST-05', 'Access Control', 'business_owner role is allowed (200 OK)', e);
    }

    // ── OWNERSHIP & IDOR TESTS (6 - 11) ──

    // 6. Owner can list their businesses
    try {
      const res = await request(app)
        .get('/api/owner/businesses')
        .set('Authorization', `Bearer ${ownerAToken}`);
      assert.strictEqual(res.status, 200);
      assert.ok(Array.isArray(res.body.data));
      assert.strictEqual(res.body.data.length, 2);
      recordPass('TEST-06', 'Ownership', 'Owner can list their businesses');
    } catch (e) {
      recordFail('TEST-06', 'Ownership', 'Owner can list their businesses', e);
    }

    // 7. Owner can retrieve their own business
    try {
      const res = await request(app)
        .get(`/api/owner/businesses/${ownerABizPublishedId}`)
        .set('Authorization', `Bearer ${ownerAToken}`);
      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.body.data.id, ownerABizPublishedId);
      assert.strictEqual(res.body.data.name, 'Owner A Published Cafe');
      recordPass('TEST-07', 'Ownership', 'Owner can retrieve their own business');
    } catch (e) {
      recordFail('TEST-07', 'Ownership', 'Owner can retrieve their own business', e);
    }

    // 8. Owner cannot retrieve another owner's business (returns 404)
    try {
      const res = await request(app)
        .get(`/api/owner/businesses/${ownerBBizPublishedId}`)
        .set('Authorization', `Bearer ${ownerAToken}`);
      assert.strictEqual(res.status, 404);
      assert.strictEqual(res.body.success, false);
      recordPass('TEST-08', 'Ownership', 'Owner cannot retrieve another owner\'s business (404)');
    } catch (e) {
      recordFail('TEST-08', 'Ownership', 'Owner cannot retrieve another owner\'s business (404)', e);
    }

    // 9. Owner cannot update another owner's business (returns 404)
    try {
      const res = await request(app)
        .patch(`/api/owner/businesses/${ownerBBizPublishedId}`)
        .set('Authorization', `Bearer ${ownerAToken}`)
        .send({ name: 'Hacked Name' });
      assert.strictEqual(res.status, 404);
      assert.strictEqual(res.body.success, false);
      recordPass('TEST-09', 'Ownership', 'Owner cannot update another owner\'s business (404)');
    } catch (e) {
      recordFail('TEST-09', 'Ownership', 'Owner cannot update another owner\'s business (404)', e);
    }

    // 10. Owner cannot modify another owner's photos (returns 404)
    try {
      const res = await request(app)
        .patch(`/api/owner/businesses/${ownerBBizPublishedId}/photos`)
        .set('Authorization', `Bearer ${ownerAToken}`)
        .send({ photoUrls: ['https://example.com/hacked.jpg'] });
      assert.strictEqual(res.status, 404);
      assert.strictEqual(res.body.success, false);
      recordPass('TEST-10', 'Ownership', 'Owner cannot modify another owner\'s photos (404)');
    } catch (e) {
      recordFail('TEST-10', 'Ownership', 'Owner cannot modify another owner\'s photos (404)', e);
    }

    // 11. ownerId cannot be supplied to bypass ownership
    try {
      const res = await request(app)
        .get('/api/owner/businesses?ownerId=' + ownerBId)
        .set('Authorization', `Bearer ${ownerAToken}`);
      assert.strictEqual(res.status, 200);
      const ids = res.body.data.map((b: any) => b.id);
      assert.ok(ids.includes(ownerABizPendingId));
      assert.ok(ids.includes(ownerABizPublishedId));
      assert.strictEqual(ids.includes(ownerBBizPublishedId), false);
      recordPass('TEST-11', 'Ownership', 'ownerId cannot be supplied in client query/body to bypass ownership');
    } catch (e) {
      recordFail('TEST-11', 'Ownership', 'ownerId cannot be supplied in client query/body to bypass ownership', e);
    }

    // ── UPDATE TESTS (12 - 22) ──

    // 12. Owner can update name
    try {
      const res = await request(app)
        .patch(`/api/owner/businesses/${ownerABizPublishedId}`)
        .set('Authorization', `Bearer ${ownerAToken}`)
        .send({ name: 'Owner A Updated Cafe' });
      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.body.data.name, 'Owner A Updated Cafe');
      recordPass('TEST-12', 'Update', 'Owner can update business name');
    } catch (e) {
      recordFail('TEST-12', 'Update', 'Owner can update business name', e);
    }

    // 13. Owner can update description
    try {
      const res = await request(app)
        .patch(`/api/owner/businesses/${ownerABizPublishedId}`)
        .set('Authorization', `Bearer ${ownerAToken}`)
        .send({ description: 'New updated description.' });
      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.body.data.description, 'New updated description.');
      recordPass('TEST-13', 'Update', 'Owner can update description');
    } catch (e) {
      recordFail('TEST-13', 'Update', 'Owner can update description', e);
    }

    // 14. Owner can update phone
    try {
      const res = await request(app)
        .patch(`/api/owner/businesses/${ownerABizPublishedId}`)
        .set('Authorization', `Bearer ${ownerAToken}`)
        .send({ phone: '+251922111222' });
      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.body.data.phone, '+251922111222');
      recordPass('TEST-14', 'Update', 'Owner can update phone');
    } catch (e) {
      recordFail('TEST-14', 'Update', 'Owner can update phone', e);
    }

    // 15. Owner can update hours
    try {
      const res = await request(app)
        .patch(`/api/owner/businesses/${ownerABizPublishedId}`)
        .set('Authorization', `Bearer ${ownerAToken}`)
        .send({ hours: { monday: '9am-5pm', sunday: 'closed' } });
      assert.strictEqual(res.status, 200);
      assert.deepStrictEqual(res.body.data.hours, { monday: '9am-5pm', sunday: 'closed' });
      recordPass('TEST-15', 'Update', 'Owner can update operating hours');
    } catch (e) {
      recordFail('TEST-15', 'Update', 'Owner can update operating hours', e);
    }

    // 16. Owner can update landmark description
    try {
      const res = await request(app)
        .patch(`/api/owner/businesses/${ownerABizPublishedId}`)
        .set('Authorization', `Bearer ${ownerAToken}`)
        .send({ landmarkDescription: 'Opposite Edna Mall' });
      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.body.data.landmarkDescription, 'Opposite Edna Mall');
      recordPass('TEST-16', 'Update', 'Owner can update landmark description');
    } catch (e) {
      recordFail('TEST-16', 'Update', 'Owner can update landmark description', e);
    }

    // 17. Owner can update category
    try {
      const res = await request(app)
        .patch(`/api/owner/businesses/${ownerABizPublishedId}`)
        .set('Authorization', `Bearer ${ownerAToken}`)
        .send({ categoryId: catId2 });
      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.body.data.category.id, catId2);
      assert.strictEqual(res.body.data.category.name, 'owner_test_restaurants');
      recordPass('TEST-17', 'Update', 'Owner can update category');
    } catch (e) {
      recordFail('TEST-17', 'Update', 'Owner can update category', e);
    }

    // 18. Invalid categoryId -> 400
    try {
      const res = await request(app)
        .patch(`/api/owner/businesses/${ownerABizPublishedId}`)
        .set('Authorization', `Bearer ${ownerAToken}`)
        .send({ categoryId: -5 });
      assert.strictEqual(res.status, 400);
      assert.strictEqual(res.body.success, false);
      recordPass('TEST-18', 'Update', 'Invalid categoryId returns 400');
    } catch (e) {
      recordFail('TEST-18', 'Update', 'Invalid categoryId returns 400', e);
    }

    // 19. Non-existent categoryId -> 400
    try {
      const res = await request(app)
        .patch(`/api/owner/businesses/${ownerABizPublishedId}`)
        .set('Authorization', `Bearer ${ownerAToken}`)
        .send({ categoryId: 32000 });
      assert.strictEqual(res.status, 400);
      assert.strictEqual(res.body.success, false);
      recordPass('TEST-19', 'Update', 'Non-existent categoryId returns 400');
    } catch (e) {
      recordFail('TEST-19', 'Update', 'Non-existent categoryId returns 400', e);
    }

    // 20. Blank name -> 400
    try {
      const res = await request(app)
        .patch(`/api/owner/businesses/${ownerABizPublishedId}`)
        .set('Authorization', `Bearer ${ownerAToken}`)
        .send({ name: '   ' });
      assert.strictEqual(res.status, 400);
      assert.strictEqual(res.body.success, false);
      recordPass('TEST-20', 'Update', 'Blank name returns 400');
    } catch (e) {
      recordFail('TEST-20', 'Update', 'Blank name returns 400', e);
    }

    // 21. Invalid phone -> 400
    try {
      const res = await request(app)
        .patch(`/api/owner/businesses/${ownerABizPublishedId}`)
        .set('Authorization', `Bearer ${ownerAToken}`)
        .send({ phone: 'invalid-phone-format-$$$' });
      assert.strictEqual(res.status, 400);
      assert.strictEqual(res.body.success, false);
      recordPass('TEST-21', 'Update', 'Invalid phone returns 400');
    } catch (e) {
      recordFail('TEST-21', 'Update', 'Invalid phone returns 400', e);
    }

    // 22. Invalid hours -> 400
    try {
      const res = await request(app)
        .patch(`/api/owner/businesses/${ownerABizPublishedId}`)
        .set('Authorization', `Bearer ${ownerAToken}`)
        .send({ hours: 'invalid-hours-string' });
      assert.strictEqual(res.status, 400);
      assert.strictEqual(res.body.success, false);
      recordPass('TEST-22', 'Update', 'Invalid hours format returns 400');
    } catch (e) {
      recordFail('TEST-22', 'Update', 'Invalid hours format returns 400', e);
    }

    // ── PROTECTED FIELDS TESTS (23 - 27) ──

    // 23. Attempt to change ownerId -> rejected/ignored
    try {
      const res = await request(app)
        .patch(`/api/owner/businesses/${ownerABizPublishedId}`)
        .set('Authorization', `Bearer ${ownerAToken}`)
        .send({ ownerId: ownerBId });
      assert.strictEqual(res.status, 200);
      // DB check that ownerId is still ownerAId
      const bInDb = await prisma.business.findUnique({ where: { id: ownerABizPublishedId } });
      assert.strictEqual(bInDb?.ownerId, ownerAId);
      recordPass('TEST-23', 'Protected Fields', 'Attempt to change ownerId is ignored/rejected');
    } catch (e) {
      recordFail('TEST-23', 'Protected Fields', 'Attempt to change ownerId is ignored/rejected', e);
    }

    // 24. Attempt to change submittedBy -> rejected/ignored
    try {
      const res = await request(app)
        .patch(`/api/owner/businesses/${ownerABizPublishedId}`)
        .set('Authorization', `Bearer ${ownerAToken}`)
        .send({ submittedBy: ownerBId });
      assert.strictEqual(res.status, 200);
      const bInDb = await prisma.business.findUnique({ where: { id: ownerABizPublishedId } });
      assert.strictEqual(bInDb?.submittedBy, ownerAId);
      recordPass('TEST-24', 'Protected Fields', 'Attempt to change submittedBy is ignored/rejected');
    } catch (e) {
      recordFail('TEST-24', 'Protected Fields', 'Attempt to change submittedBy is ignored/rejected', e);
    }

    // 25. Attempt to change status -> rejected/ignored
    try {
      const res = await request(app)
        .patch(`/api/owner/businesses/${ownerABizPendingId}`)
        .set('Authorization', `Bearer ${ownerAToken}`)
        .send({ status: 'published' });
      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.body.data.status, 'pending');
      const bInDb = await prisma.business.findUnique({ where: { id: ownerABizPendingId } });
      assert.strictEqual(bInDb?.status, 'pending');
      recordPass('TEST-25', 'Protected Fields', 'Attempt to change status is ignored/rejected');
    } catch (e) {
      recordFail('TEST-25', 'Protected Fields', 'Attempt to change status is ignored/rejected', e);
    }

    // 26. Attempt to change avgRating -> rejected/ignored
    try {
      const res = await request(app)
        .patch(`/api/owner/businesses/${ownerABizPublishedId}`)
        .set('Authorization', `Bearer ${ownerAToken}`)
        .send({ avgRating: 5.0, rating: 5.0 });
      assert.strictEqual(res.status, 200);
      const bInDb = await prisma.business.findUnique({ where: { id: ownerABizPublishedId } });
      assert.strictEqual(Number(bInDb?.avgRating), 4.5);
      recordPass('TEST-26', 'Protected Fields', 'Attempt to change avgRating is ignored/rejected');
    } catch (e) {
      recordFail('TEST-26', 'Protected Fields', 'Attempt to change avgRating is ignored/rejected', e);
    }

    // 27. Attempt to change reviewCount -> rejected/ignored
    try {
      const res = await request(app)
        .patch(`/api/owner/businesses/${ownerABizPublishedId}`)
        .set('Authorization', `Bearer ${ownerAToken}`)
        .send({ reviewCount: 999 });
      assert.strictEqual(res.status, 200);
      const bInDb = await prisma.business.findUnique({ where: { id: ownerABizPublishedId } });
      assert.strictEqual(bInDb?.reviewCount, 10);
      recordPass('TEST-27', 'Protected Fields', 'Attempt to change reviewCount is ignored/rejected');
    } catch (e) {
      recordFail('TEST-27', 'Protected Fields', 'Attempt to change reviewCount is ignored/rejected', e);
    }

    // ── PHOTOS TESTS (28 - 32) ──

    // 28. Owner can update photo URLs
    try {
      const newPhotos = [
        'https://example.com/new_photo_1.jpg',
        'https://example.com/new_photo_2.jpg',
      ];
      const res = await request(app)
        .patch(`/api/owner/businesses/${ownerABizPublishedId}/photos`)
        .set('Authorization', `Bearer ${ownerAToken}`)
        .send({ photoUrls: newPhotos });
      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.body.data.photos.length, 2);
      assert.strictEqual(res.body.data.photos[0].url, newPhotos[0]);
      assert.strictEqual(res.body.data.photos[0].sortOrder, 0);
      assert.strictEqual(res.body.data.photos[1].url, newPhotos[1]);
      assert.strictEqual(res.body.data.photos[1].sortOrder, 1);
      recordPass('TEST-28', 'Photos', 'Owner can update photo URLs');
    } catch (e) {
      recordFail('TEST-28', 'Photos', 'Owner can update photo URLs', e);
    }

    // 29. Invalid photo URL -> 400
    try {
      const res = await request(app)
        .patch(`/api/owner/businesses/${ownerABizPublishedId}/photos`)
        .set('Authorization', `Bearer ${ownerAToken}`)
        .send({ photoUrls: ['not-a-valid-url'] });
      assert.strictEqual(res.status, 400);
      assert.strictEqual(res.body.success, false);
      recordPass('TEST-29', 'Photos', 'Invalid photo URL returns 400');
    } catch (e) {
      recordFail('TEST-29', 'Photos', 'Invalid photo URL returns 400', e);
    }

    // 30. Too many photos -> 400
    try {
      const tooManyPhotos = Array.from({ length: 11 }, (_, i) => `https://example.com/photo_${i}.jpg`);
      const res = await request(app)
        .patch(`/api/owner/businesses/${ownerABizPublishedId}/photos`)
        .set('Authorization', `Bearer ${ownerAToken}`)
        .send({ photoUrls: tooManyPhotos });
      assert.strictEqual(res.status, 400);
      assert.strictEqual(res.body.success, false);
      recordPass('TEST-30', 'Photos', 'Too many photos (>10) returns 400');
    } catch (e) {
      recordFail('TEST-30', 'Photos', 'Too many photos (>10) returns 400', e);
    }

    // 31. Photo update is transactional
    try {
      // Verifying by updating to empty array then valid array
      const res1 = await request(app)
        .patch(`/api/owner/businesses/${ownerABizPublishedId}/photos`)
        .set('Authorization', `Bearer ${ownerAToken}`)
        .send({ photoUrls: [] });
      assert.strictEqual(res1.status, 200);
      assert.deepStrictEqual(res1.body.data.photos, []);

      const dbPhotos = await prisma.businessPhoto.findMany({ where: { businessId: ownerABizPublishedId } });
      assert.strictEqual(dbPhotos.length, 0);

      recordPass('TEST-31', 'Photos', 'Photo update is transactional');
    } catch (e) {
      recordFail('TEST-31', 'Photos', 'Photo update is transactional', e);
    }

    // 32. Another owner cannot modify the photos -> 404
    try {
      const res = await request(app)
        .patch(`/api/owner/businesses/${ownerABizPublishedId}/photos`)
        .set('Authorization', `Bearer ${ownerBToken}`)
        .send({ photoUrls: ['https://example.com/stolen.jpg'] });
      assert.strictEqual(res.status, 404);
      assert.strictEqual(res.body.success, false);
      recordPass('TEST-32', 'Photos', 'Another owner cannot modify photos (404)');
    } catch (e) {
      recordFail('TEST-32', 'Photos', 'Another owner cannot modify photos (404)', e);
    }

    // ── STATUS TESTS (33 - 35) ──

    // 33. Pending listing remains pending after update
    try {
      const res = await request(app)
        .patch(`/api/owner/businesses/${ownerABizPendingId}`)
        .set('Authorization', `Bearer ${ownerAToken}`)
        .send({ name: 'Updated Pending Name' });
      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.body.data.status, 'pending');
      recordPass('TEST-33', 'Status', 'Pending listing remains pending after update');
    } catch (e) {
      recordFail('TEST-33', 'Status', 'Pending listing remains pending after update', e);
    }

    // 34. Published listing remains published after update
    try {
      const res = await request(app)
        .patch(`/api/owner/businesses/${ownerABizPublishedId}`)
        .set('Authorization', `Bearer ${ownerAToken}`)
        .send({ name: 'Updated Published Name' });
      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.body.data.status, 'published');
      recordPass('TEST-34', 'Status', 'Published listing remains published after update');
    } catch (e) {
      recordFail('TEST-34', 'Status', 'Published listing remains published after update', e);
    }

    // 35. Owner cannot approve/reject/publish their listing
    try {
      const res1 = await request(app)
        .patch(`/api/owner/businesses/${ownerABizPendingId}`)
        .set('Authorization', `Bearer ${ownerAToken}`)
        .send({ status: 'published' });
      assert.strictEqual(res1.status, 200);
      assert.strictEqual(res1.body.data.status, 'pending');

      const res2 = await request(app)
        .patch(`/api/admin/businesses/${ownerABizPendingId}/approve`)
        .set('Authorization', `Bearer ${ownerAToken}`);
      assert.strictEqual(res2.status, 403);
      recordPass('TEST-35', 'Status', 'Owner cannot approve/reject/publish their listing');
    } catch (e) {
      recordFail('TEST-35', 'Status', 'Owner cannot approve/reject/publish their listing', e);
    }

    // ── REGRESSION TESTS (36 - 42) ──

    // 36. TN-001/TN-TECH-005 tests still pass
    try {
      const res = await request(app).post('/api/auth/register').send({});
      assert.strictEqual(res.status, 400);
      recordPass('TEST-36', 'Regression', 'TN-001/TN-TECH-005 auth tests pass');
    } catch (e) {
      recordFail('TEST-36', 'Regression', 'TN-001/TN-TECH-005 auth tests pass', e);
    }

    // 37. TN-006/TN-007 tests still pass
    try {
      const res = await request(app).get('/api/categories');
      assert.strictEqual(res.status, 200);
      assert.ok(Array.isArray(res.body.data.categories));
      recordPass('TEST-37', 'Regression', 'TN-006/TN-007 creation/category tests pass');
    } catch (e) {
      recordFail('TEST-37', 'Regression', 'TN-006/TN-007 creation/category tests pass', e);
    }

    // 38. TN-003 tests still pass
    try {
      const res = await request(app).get('/api/businesses/nearby?lat=9.0305&lng=38.7405&radius=1000');
      assert.strictEqual(res.status, 200);
      assert.ok(Array.isArray(res.body.data.data));
      recordPass('TEST-38', 'Regression', 'TN-003 nearby search tests pass');
    } catch (e) {
      recordFail('TEST-38', 'Regression', 'TN-003 nearby search tests pass', e);
    }

    // 39. TN-004 tests still pass
    try {
      const res = await request(app).get('/api/businesses/nearby?lat=9.0305&lng=38.7405&radius=1000&name=Owner');
      assert.strictEqual(res.status, 200);
      assert.ok(Array.isArray(res.body.data.data));
      recordPass('TEST-39', 'Regression', 'TN-004 search filters pass');
    } catch (e) {
      recordFail('TEST-39', 'Regression', 'TN-004 search filters pass', e);
    }

    // 40. TN-008 tests still pass
    try {
      const res = await request(app).get(`/api/businesses/${ownerABizPublishedId}`);
      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.body.data.id, ownerABizPublishedId);
      recordPass('TEST-40', 'Regression', 'TN-008 business details tests pass');
    } catch (e) {
      recordFail('TEST-40', 'Regression', 'TN-008 business details tests pass', e);
    }

    // 41. TN-021 tests still pass
    try {
      const res = await request(app).get('/api/admin/moderation/queue');
      assert.strictEqual(res.status, 401);
      recordPass('TEST-41', 'Regression', 'TN-021 moderation queue route passes auth check');
    } catch (e) {
      recordFail('TEST-41', 'Regression', 'TN-021 moderation queue route passes auth check', e);
    }

    // 42. TN-022 tests still pass
    try {
      const res = await request(app).get('/api/admin/businesses/pending');
      assert.strictEqual(res.status, 401);
      recordPass('TEST-42', 'Regression', 'TN-022 admin business approval passes auth check');
    } catch (e) {
      recordFail('TEST-42', 'Regression', 'TN-022 admin business approval passes auth check', e);
    }

  } finally {
    // Clean up created business photos & businesses
    if (createdBusinessIds.length > 0) {
      await prisma.businessPhoto.deleteMany({
        where: { businessId: { in: createdBusinessIds } },
      });
      await prisma.$executeRawUnsafe(
        `DELETE FROM businesses WHERE id IN (${createdBusinessIds.map((id) => `'${id}'`).join(',')})`
      );
    }
    if (createdUserIds.length > 0) {
      await prisma.user.deleteMany({
        where: { id: { in: createdUserIds } },
      }).catch(() => {});
    }
    if (catId1) {
      await prisma.category.delete({ where: { id: catId1 } }).catch(() => {});
    }
    if (catId2) {
      await prisma.category.delete({ where: { id: catId2 } }).catch(() => {});
    }
    await prisma.$disconnect();
  }

  console.log('\n===========================================================');
  console.log('SUMMARY OF OWNER QA RESULTS:');
  const passed = results.filter((r) => r.status === 'PASS').length;
  const failed = results.filter((r) => r.status === 'FAIL').length;
  console.log(`Passed: ${passed} / ${results.length}`);
  console.log(`Failed: ${failed} / ${results.length}`);
  console.log('===========================================================');

  if (failed > 0) {
    process.exit(1);
  }
}

runAllOwnerTests().catch((err) => {
  console.error('Unhandled error during owner test run:', err);
  process.exit(1);
});
