/**
 * TrustNear — Full QA Test Suite for TN-008 (View Business Details)
 * Test Specifications 1 through 27
 */
import assert from 'assert';
// @ts-ignore
import request from 'supertest';
import app from '../../../server';
import { prisma } from '../../../config/db';

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

async function runAllDetailsTests() {
  console.log('===========================================================');
  console.log('🏢 TrustNear TN-008 View Business Details QA Suite (1 - 27)');
  console.log('===========================================================\n');

  let testCategoryId = 0;
  let testUserId = '';
  const createdBusinessIds: string[] = [];

  const TEST_LAT = 9.0305;
  const TEST_LNG = 38.7405;

  try {
    await prisma.$connect();

    // Setup Category & User
    const cat = await prisma.category.upsert({
      where: { name: 'cafes' },
      update: {},
      create: { name: 'cafes' },
    });
    testCategoryId = cat.id;

    const u = await prisma.user.create({
      data: {
        displayName: 'Details QA User',
        email: `details_qa_${Date.now()}@trustnear.com`,
        passwordHash: 'dummyhash',
        role: 'user',
      },
    });
    testUserId = u.id;

    // Helper to insert test business directly
    const insertTestBiz = async (
      name: string,
      status: 'published' | 'pending' | 'rejected',
      options: {
        description?: string;
        landmarkDescription?: string;
        phone?: string;
        hours?: any;
        avgRating?: number;
        reviewCount?: number;
        photos?: { url: string; sortOrder: number }[];
      } = {}
    ) => {
      const landmark = options.landmarkDescription ?? 'Near Bole Medhanealem Church';
      const desc = options.description ?? 'A cozy specialty coffee shop.';
      const phone = options.phone ?? '+251911000000';
      const hoursJson = options.hours ? JSON.stringify(options.hours) : null;
      const rating = options.avgRating ?? 4.5;
      const count = options.reviewCount ?? 12;

      const rows = await prisma.$queryRaw<[{ id: string }]>`
        INSERT INTO businesses (
          name, category_id, description, landmark_description, location, phone, hours, status, submitted_by, avg_rating, review_count, updated_at
        ) VALUES (
          ${name},
          ${testCategoryId}::smallint,
          ${desc}::text,
          ${landmark}::text,
          ST_SetSRID(ST_MakePoint(${TEST_LNG}::float8, ${TEST_LAT}::float8), 4326)::geography,
          ${phone}::varchar(32),
          ${hoursJson}::jsonb,
          ${status}::"BusinessStatus",
          ${testUserId}::uuid,
          ${rating}::numeric(2,1),
          ${count}::int,
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

    // Seed test business with full details & photos
    const publishedBizId = await insertTestBiz('Addis Coffee Roasters', 'published', {
      hours: { monday: '8am-8pm', tuesday: '8am-8pm' },
      photos: [
        { url: 'https://example.com/photo2.jpg', sortOrder: 1 },
        { url: 'https://example.com/photo1.jpg', sortOrder: 0 },
      ],
    });

    // Seed test business with no photos
    const noPhotoBizId = await insertTestBiz('No Photo Cafe', 'published', {
      photos: [],
    });

    // Seed pending & rejected businesses
    const pendingBizId = await insertTestBiz('Pending Bakery', 'pending');
    const rejectedBizId = await insertTestBiz('Rejected Bar', 'rejected');

    // ── TEST 1: Published business returns 200 ──
    try {
      const res = await request(app).get(`/api/businesses/${publishedBizId}`);
      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.body.success, true);
      recordPass('TEST-01', 'TN-008', 'Published business returns 200 HTTP status');
    } catch (e) {
      recordFail('TEST-01', 'TN-008', 'Published business returns 200 HTTP status', e);
    }

    // ── TEST 2: Correct business ID is returned ──
    try {
      const res = await request(app).get(`/api/businesses/${publishedBizId}`);
      assert.strictEqual(res.body.data.id, publishedBizId);
      recordPass('TEST-02', 'TN-008', 'Correct business ID is returned');
    } catch (e) {
      recordFail('TEST-02', 'TN-008', 'Correct business ID is returned', e);
    }

    // ── TEST 3: Correct name is returned ──
    try {
      const res = await request(app).get(`/api/businesses/${publishedBizId}`);
      assert.strictEqual(res.body.data.name, 'Addis Coffee Roasters');
      recordPass('TEST-03', 'TN-008', 'Correct business name is returned');
    } catch (e) {
      recordFail('TEST-03', 'TN-008', 'Correct business name is returned', e);
    }

    // ── TEST 4: Correct category is returned ──
    try {
      const res = await request(app).get(`/api/businesses/${publishedBizId}`);
      assert.deepStrictEqual(res.body.data.category, {
        id: testCategoryId,
        name: 'cafes',
      });
      recordPass('TEST-04', 'TN-008', 'Correct category object is returned');
    } catch (e) {
      recordFail('TEST-04', 'TN-008', 'Correct category object is returned', e);
    }

    // ── TEST 5: Correct description is returned ──
    try {
      const res = await request(app).get(`/api/businesses/${publishedBizId}`);
      assert.strictEqual(res.body.data.description, 'A cozy specialty coffee shop.');
      recordPass('TEST-05', 'TN-008', 'Correct description is returned');
    } catch (e) {
      recordFail('TEST-05', 'TN-008', 'Correct description is returned', e);
    }

    // ── TEST 6: Correct landmark description is returned ──
    try {
      const res = await request(app).get(`/api/businesses/${publishedBizId}`);
      assert.strictEqual(res.body.data.landmarkDescription, 'Near Bole Medhanealem Church');
      recordPass('TEST-06', 'TN-008', 'Correct landmark description is returned');
    } catch (e) {
      recordFail('TEST-06', 'TN-008', 'Correct landmark description is returned', e);
    }

    // ── TEST 7: Correct latitude/longitude are returned ──
    try {
      const res = await request(app).get(`/api/businesses/${publishedBizId}`);
      assert.ok(res.body.data.location);
      assert.strictEqual(typeof res.body.data.location.lat, 'number');
      assert.strictEqual(typeof res.body.data.location.lng, 'number');
      recordPass('TEST-07', 'TN-008', 'Correct latitude/longitude location object returned');
    } catch (e) {
      recordFail('TEST-07', 'TN-008', 'Correct latitude/longitude location object returned', e);
    }

    // ── TEST 8: Coordinates are NOT swapped ──
    try {
      const res = await request(app).get(`/api/businesses/${publishedBizId}`);
      assert.ok(Math.abs(res.body.data.location.lat - TEST_LAT) < 0.0001, `lat ${res.body.data.location.lat} should match ${TEST_LAT}`);
      assert.ok(Math.abs(res.body.data.location.lng - TEST_LNG) < 0.0001, `lng ${res.body.data.location.lng} should match ${TEST_LNG}`);
      recordPass('TEST-08', 'TN-008', 'Coordinates are NOT swapped (lat = latitude, lng = longitude)');
    } catch (e) {
      recordFail('TEST-08', 'TN-008', 'Coordinates are NOT swapped (lat = latitude, lng = longitude)', e);
    }

    // ── TEST 9: Phone number is returned when available ──
    try {
      const res = await request(app).get(`/api/businesses/${publishedBizId}`);
      assert.strictEqual(res.body.data.phone, '+251911000000');
      recordPass('TEST-09', 'TN-008', 'Phone number is returned when available');
    } catch (e) {
      recordFail('TEST-09', 'TN-008', 'Phone number is returned when available', e);
    }

    // ── TEST 10: Operating hours are returned when available ──
    try {
      const res = await request(app).get(`/api/businesses/${publishedBizId}`);
      assert.deepStrictEqual(res.body.data.hours, { monday: '8am-8pm', tuesday: '8am-8pm' });
      recordPass('TEST-10', 'TN-008', 'Operating hours are returned when available');
    } catch (e) {
      recordFail('TEST-10', 'TN-008', 'Operating hours are returned when available', e);
    }

    // ── TEST 11: Photos are returned ──
    try {
      const res = await request(app).get(`/api/businesses/${publishedBizId}`);
      assert.strictEqual(res.body.data.photos.length, 2);
      recordPass('TEST-11', 'TN-008', 'Photos array is returned');
    } catch (e) {
      recordFail('TEST-11', 'TN-008', 'Photos array is returned', e);
    }

    // ── TEST 12: Photos are ordered by sortOrder ──
    try {
      const res = await request(app).get(`/api/businesses/${publishedBizId}`);
      const photos = res.body.data.photos;
      assert.strictEqual(photos[0].sortOrder, 0);
      assert.strictEqual(photos[0].url, 'https://example.com/photo1.jpg');
      assert.strictEqual(photos[1].sortOrder, 1);
      assert.strictEqual(photos[1].url, 'https://example.com/photo2.jpg');
      recordPass('TEST-12', 'TN-008', 'Photos are ordered by sortOrder ASC');
    } catch (e) {
      recordFail('TEST-12', 'TN-008', 'Photos are ordered by sortOrder ASC', e);
    }

    // ── TEST 13: Business with no photos returns an empty array ──
    try {
      const res = await request(app).get(`/api/businesses/${noPhotoBizId}`);
      assert.strictEqual(res.status, 200);
      assert.deepStrictEqual(res.body.data.photos, []);
      recordPass('TEST-13', 'TN-008', 'Business with no photos returns empty array');
    } catch (e) {
      recordFail('TEST-13', 'TN-008', 'Business with no photos returns empty array', e);
    }

    // ── TEST 14: Aggregate rating is returned correctly ──
    try {
      const res = await request(app).get(`/api/businesses/${publishedBizId}`);
      assert.strictEqual(res.body.data.rating, 4.5);
      recordPass('TEST-14', 'TN-008', 'Aggregate star rating is returned correctly');
    } catch (e) {
      recordFail('TEST-14', 'TN-008', 'Aggregate star rating is returned correctly', e);
    }

    // ── TEST 15: Review count is returned correctly ──
    try {
      const res = await request(app).get(`/api/businesses/${publishedBizId}`);
      assert.strictEqual(res.body.data.reviewCount, 12);
      recordPass('TEST-15', 'TN-008', 'Review count is returned correctly');
    } catch (e) {
      recordFail('TEST-15', 'TN-008', 'Review count is returned correctly', e);
    }

    // ── TEST 16: Non-existent business returns 404 ──
    try {
      const nonExistentUuid = 'a0000000-0000-4000-8000-000000000000';
      const res = await request(app).get(`/api/businesses/${nonExistentUuid}`);
      assert.strictEqual(res.status, 404);
      assert.strictEqual(res.body.success, false);
      recordPass('TEST-16', 'TN-008', 'Non-existent business returns 404');
    } catch (e) {
      recordFail('TEST-16', 'TN-008', 'Non-existent business returns 404', e);
    }

    // ── TEST 17: Pending business returns 404 ──
    try {
      const res = await request(app).get(`/api/businesses/${pendingBizId}`);
      assert.strictEqual(res.status, 404);
      assert.strictEqual(res.body.success, false);
      recordPass('TEST-17', 'TN-008', 'Pending business returns 404');
    } catch (e) {
      recordFail('TEST-17', 'TN-008', 'Pending business returns 404', e);
    }

    // ── TEST 18: Rejected business returns 404 ──
    try {
      const res = await request(app).get(`/api/businesses/${rejectedBizId}`);
      assert.strictEqual(res.status, 404);
      assert.strictEqual(res.body.success, false);
      recordPass('TEST-18', 'TN-008', 'Rejected business returns 404');
    } catch (e) {
      recordFail('TEST-18', 'TN-008', 'Rejected business returns 404', e);
    }

    // ── TEST 19: Invalid business ID returns 400 ──
    try {
      const res = await request(app).get('/api/businesses/invalid-uuid-123');
      assert.strictEqual(res.status, 400);
      assert.strictEqual(res.body.success, false);
      recordPass('TEST-19', 'TN-008', 'Invalid business ID format returns 400');
    } catch (e) {
      recordFail('TEST-19', 'TN-008', 'Invalid business ID format returns 400', e);
    }

    // ── TEST 20: No authentication token is required ──
    try {
      const res = await request(app).get(`/api/businesses/${publishedBizId}`);
      assert.strictEqual(res.status, 200);
      recordPass('TEST-20', 'TN-008', 'No authentication token is required');
    } catch (e) {
      recordFail('TEST-20', 'TN-008', 'No authentication token is required', e);
    }

    // ── TEST 21: Sensitive/internal fields are not exposed ──
    try {
      const res = await request(app).get(`/api/businesses/${publishedBizId}`);
      const data = res.body.data;
      assert.strictEqual(data.submittedBy, undefined);
      assert.strictEqual(data.ownerId, undefined);
      assert.strictEqual(data.passwordHash, undefined);
      assert.strictEqual(data.status, undefined);
      assert.strictEqual(data.createdAt, undefined);
      assert.strictEqual(data.updatedAt, undefined);
      recordPass('TEST-21', 'TN-008', 'Sensitive/internal fields are not exposed');
    } catch (e) {
      recordFail('TEST-21', 'TN-008', 'Sensitive/internal fields are not exposed', e);
    }

    // ── TEST 22: Existing TN-003 nearby endpoint still works ──
    try {
      const res = await request(app).get('/api/businesses/nearby?lat=9.0305&lng=38.7405&radius=1000');
      assert.strictEqual(res.status, 200);
      assert.ok(Array.isArray(res.body.data.data));
      recordPass('TEST-22', 'Regression', 'Existing TN-003 nearby endpoint still works');
    } catch (e) {
      recordFail('TEST-22', 'Regression', 'Existing TN-003 nearby endpoint still works', e);
    }

    // ── TEST 23: Existing TN-004 search endpoint still works ──
    try {
      const res = await request(app).get('/api/businesses/nearby?lat=9.0305&lng=38.7405&radius=1000&name=Addis');
      assert.strictEqual(res.status, 200);
      assert.ok(Array.isArray(res.body.data.data));
      recordPass('TEST-23', 'Regression', 'Existing TN-004 search endpoint still works');
    } catch (e) {
      recordFail('TEST-23', 'Regression', 'Existing TN-004 search endpoint still works', e);
    }

    // ── TEST 24: Existing TN-006/TN-007 business creation tests route ──
    try {
      const res = await request(app).get('/api/categories');
      assert.strictEqual(res.status, 200);
      assert.ok(Array.isArray(res.body.data.categories));
      recordPass('TEST-24', 'Regression', 'Existing TN-006/TN-007 category endpoint still works');
    } catch (e) {
      recordFail('TEST-24', 'Regression', 'Existing TN-006/TN-007 category endpoint still works', e);
    }

    // ── TEST 25: Existing TN-021 moderation route check ──
    try {
      const res = await request(app).get('/api/admin/moderation/queue');
      // Requires auth -> 401
      assert.strictEqual(res.status, 401);
      recordPass('TEST-25', 'Regression', 'Existing TN-021 moderation route still works');
    } catch (e) {
      recordFail('TEST-25', 'Regression', 'Existing TN-021 moderation route still works', e);
    }

    // ── TEST 26: Existing TN-022 admin approval route check ──
    try {
      const res = await request(app).get('/api/admin/businesses/pending');
      // Requires auth -> 401
      assert.strictEqual(res.status, 401);
      recordPass('TEST-26', 'Regression', 'Existing TN-022 admin approval route still works');
    } catch (e) {
      recordFail('TEST-26', 'Regression', 'Existing TN-022 admin approval route still works', e);
    }

    // ── TEST 27: Existing authentication/RBAC route check ──
    try {
      const res = await request(app).post('/api/auth/register').send({});
      assert.strictEqual(res.status, 400);
      recordPass('TEST-27', 'Regression', 'Existing Auth/RBAC route still works');
    } catch (e) {
      recordFail('TEST-27', 'Regression', 'Existing Auth/RBAC route still works', e);
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
    if (testUserId) {
      await prisma.user.delete({ where: { id: testUserId } }).catch(() => {});
    }
    await prisma.$disconnect();
  }

  console.log('\n===========================================================');
  console.log('SUMMARY OF QA RESULTS:');
  const passed = results.filter((r) => r.status === 'PASS').length;
  const failed = results.filter((r) => r.status === 'FAIL').length;
  console.log(`Passed: ${passed} / ${results.length}`);
  console.log(`Failed: ${failed} / ${results.length}`);
  console.log('===========================================================');

  if (failed > 0) {
    process.exit(1);
  }
}

runAllDetailsTests().catch((err) => {
  console.error('Unhandled error during test run:', err);
  process.exit(1);
});
