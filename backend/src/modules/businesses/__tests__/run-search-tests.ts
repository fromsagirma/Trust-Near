/**
 * TrustNear — Full QA Test Suite for TN-004 (Search by Name, Category, and Minimum Rating)
 *
 * Test Specifications:
 * Name search:
 *   1. Exact name match returns the business
 *   2. Partial name match returns the business (case-insensitive)
 *   3. Landmark description match with name param
 *   4. Name search with no matches returns empty data, HTTP 200
 *   5. SQL injection resilience: input is treated literally, no 500 or execution
 *   6. Empty-string / whitespace name is treated as not provided (all businesses returned)
 *   7. Name exceeding 200 characters returns 400
 *
 * Category filter:
 *   8. Valid categoryId filters correctly to only that category
 *   9. Non-existent categoryId returns 400
 *   10. Invalid-type categoryId (non-numeric string) returns 400
 *   11. Out-of-range categoryId (>32767 or <=0) returns 400
 *
 * Minimum rating filter:
 *   12. minRating filters out businesses below the threshold
 *   13. minRating=0 returns all businesses regardless of rating
 *   14. minRating=5 returns only 5.0-rated businesses
 *   15. minRating > 5 returns 400
 *   16. minRating < 0 returns 400
 *   17. Non-numeric minRating returns 400
 *
 * Combined filters & Radius interaction:
 *   18. name + categoryId together — both conditions must match
 *   19. name + categoryId + minRating together — all three conditions must match
 *   20. Business matching name/category/minRating but outside radius is excluded
 *   21. Full combination with sort=rating and pagination works correctly
 *   22. Count and pagination total/totalPages reflect the fully filtered count
 *
 * Backward compatibility:
 *   23. Pure lat/lng/radius request (no new params) behaves identically to TN-003
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

async function runAllSearchTests() {
  console.log('===========================================================');
  console.log('🔍 TrustNear TN-004 Search & Filter QA Suite');
  console.log('===========================================================\n');

  let catCafeId = 0;
  let catRestaurantId = 0;
  let catHotelId = 0;
  let testUserId = '';
  const createdBusinessIds: string[] = [];

  // Unique isolated coordinates for test suite to avoid collision with other tests/seed
  const CENTER_LAT = 15.55555;
  const CENTER_LNG = 40.44444;

  try {
    await prisma.$connect();

    // ── 1. SETUP CATEGORIES & USER ─────────────────────────────────────────────
    const catCafe = await prisma.category.upsert({
      where: { name: 'qa_search_cafe' },
      update: {},
      create: { name: 'qa_search_cafe' },
    });
    catCafeId = catCafe.id;

    const catRest = await prisma.category.upsert({
      where: { name: 'qa_search_restaurant' },
      update: {},
      create: { name: 'qa_search_restaurant' },
    });
    catRestaurantId = catRest.id;

    const catHotel = await prisma.category.upsert({
      where: { name: 'qa_search_hotel' },
      update: {},
      create: { name: 'qa_search_hotel' },
    });
    catHotelId = catHotel.id;

    const u = await prisma.user.create({
      data: {
        displayName: 'Search QA User',
        email: `search_qa_${Date.now()}@trustnear.com`,
        passwordHash: 'dummyhash',
        role: 'user',
      },
    });
    testUserId = u.id;

    const insertTestBiz = async (
      name: string,
      categoryId: number,
      landmarkDescription: string,
      lat: number,
      lng: number,
      status: 'published' | 'pending' | 'rejected',
      avgRating = 0,
      reviewCount = 0
    ) => {
      const rows = await prisma.$queryRaw<[{ id: string }]>`
        INSERT INTO businesses (
          name, category_id, landmark_description, location, status, submitted_by, avg_rating, review_count, updated_at
        ) VALUES (
          ${name},
          ${categoryId}::smallint,
          ${landmarkDescription},
          ST_SetSRID(ST_MakePoint(${lng}::float8, ${lat}::float8), 4326)::geography,
          ${status}::"BusinessStatus",
          ${testUserId}::uuid,
          ${avgRating}::numeric(2,1),
          ${reviewCount}::int,
          NOW()
        ) RETURNING id
      `;
      const id = rows[0].id;
      createdBusinessIds.push(id);
      return id;
    };

    // Seed test fixtures around CENTER_LAT, CENTER_LNG
    // (0.001 deg lat ~ 111 meters)
    // 1. "Blue Nile Coffee" - Cafe, 4.8 rating, 111m away, published
    const biz1 = await insertTestBiz(
      'Blue Nile Coffee',
      catCafeId,
      'Near Piazza Clock Tower',
      CENTER_LAT + 0.001,
      CENTER_LNG,
      'published',
      4.8,
      12
    );

    // 2. "Abyssinia Restaurant" - Restaurant, 3.5 rating, 222m away, published
    const biz2 = await insertTestBiz(
      'Abyssinia Restaurant',
      catRestaurantId,
      'Opposite National Museum',
      CENTER_LAT + 0.002,
      CENTER_LNG,
      'published',
      3.5,
      5
    );

    // 3. "Grand Luxury Hotel" - Hotel, 5.0 rating, 333m away, published
    const biz3 = await insertTestBiz(
      'Grand Luxury Hotel',
      catHotelId,
      'Near Bole Airport Roundabout',
      CENTER_LAT + 0.003,
      CENTER_LNG,
      'published',
      5.0,
      25
    );

    // 4. "Addis Cafe & Bakery" - Cafe, 4.2 rating, 444m away, published
    const biz4 = await insertTestBiz(
      'Addis Cafe & Bakery',
      catCafeId,
      'Behind Hilton Hotel',
      CENTER_LAT + 0.004,
      CENTER_LNG,
      'published',
      4.2,
      8
    );

    // 5. "Sunrise Coffee Corner" - Cafe, 0.0 rating (no reviews), 555m away, published
    const biz5 = await insertTestBiz(
      'Sunrise Coffee Corner',
      catCafeId,
      'Next to St. George Church',
      CENTER_LAT + 0.005,
      CENTER_LNG,
      'published',
      0.0,
      0
    );

    // 6. "Far Away Cafe" - Cafe, 4.9 rating, OUTSIDE radius (15km away), published
    const bizFar = await insertTestBiz(
      'Far Away Cafe',
      catCafeId,
      'Far Out Landmark',
      CENTER_LAT + 0.15,
      CENTER_LNG,
      'published',
      4.9,
      50
    );

    // 7. "Secret Pending Cafe" - Cafe, 5.0 rating, 111m away, pending (MUST be excluded)
    const bizPending = await insertTestBiz(
      'Secret Pending Cafe',
      catCafeId,
      'Secret Landmark',
      CENTER_LAT + 0.001,
      CENTER_LNG,
      'pending',
      5.0,
      100
    );

    console.log('--- 1. NAME SEARCH TESTS ---');

    // TEST-01: Exact name match
    try {
      const res = await request(app).get(
        `/api/businesses/nearby?lat=${CENTER_LAT}&lng=${CENTER_LNG}&radius=2000&name=Blue Nile Coffee`
      );
      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.body.success, true);
      assert.strictEqual(res.body.data.data.length, 1);
      assert.strictEqual(res.body.data.data[0].id, biz1);
      assert.strictEqual(res.body.data.data[0].name, 'Blue Nile Coffee');
      recordPass('TN004-01', 'Name Search', 'Exact name match returns the business');
    } catch (e) {
      recordFail('TN004-01', 'Name Search', 'Exact name match returns the business', e);
    }

    // TEST-02: Partial name match (case-insensitive)
    try {
      const res = await request(app).get(
        `/api/businesses/nearby?lat=${CENTER_LAT}&lng=${CENTER_LNG}&radius=2000&name=coffee`
      );
      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.body.success, true);
      assert.strictEqual(res.body.data.data.length, 2);
      const names = res.body.data.data.map((b: any) => b.name);
      assert.ok(names.includes('Blue Nile Coffee'));
      assert.ok(names.includes('Sunrise Coffee Corner'));
      recordPass('TN004-02', 'Name Search', 'Partial case-insensitive name match returns matching businesses');
    } catch (e) {
      recordFail('TN004-02', 'Name Search', 'Partial case-insensitive name match', e);
    }

    // TEST-03: Landmark description match with name parameter
    try {
      const res = await request(app).get(
        `/api/businesses/nearby?lat=${CENTER_LAT}&lng=${CENTER_LNG}&radius=2000&name=Piazza`
      );
      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.body.success, true);
      assert.strictEqual(res.body.data.data.length, 1);
      assert.strictEqual(res.body.data.data[0].id, biz1);
      recordPass('TN004-03', 'Name Search', 'Landmark description matches search query');
    } catch (e) {
      recordFail('TN004-03', 'Name Search', 'Landmark description match', e);
    }

    // TEST-04: Name search with no matches returns empty data with HTTP 200
    try {
      const res = await request(app).get(
        `/api/businesses/nearby?lat=${CENTER_LAT}&lng=${CENTER_LNG}&radius=2000&name=NonExistentBusiness12345`
      );
      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.body.success, true);
      assert.strictEqual(res.body.data.data.length, 0);
      assert.strictEqual(res.body.data.pagination.total, 0);
      assert.strictEqual(res.body.data.pagination.totalPages, 0);
      recordPass('TN004-04', 'Name Search', 'No matches returns HTTP 200 with empty array and 0 totals');
    } catch (e) {
      recordFail('TN004-04', 'Name Search', 'No matches empty return', e);
    }

    // TEST-05: SQL injection input treated as literal term, returns clean result with no 500
    try {
      const sqlInjectionTerm = "'; DROP TABLE businesses; --";
      const res = await request(app).get(
        `/api/businesses/nearby?lat=${CENTER_LAT}&lng=${CENTER_LNG}&radius=2000&name=${encodeURIComponent(sqlInjectionTerm)}`
      );
      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.body.success, true);
      assert.strictEqual(res.body.data.data.length, 0);
      // Verify table was not dropped
      const countCheck = await prisma.business.count();
      assert.ok(countCheck > 0, 'Businesses table still exists and populated');
      recordPass('TN004-05', 'Name Search', 'SQL injection input treated literally; no 500 and DB intact');
    } catch (e) {
      recordFail('TN004-05', 'Name Search', 'SQL injection resilience', e);
    }

    // TEST-06: Empty-string / whitespace-only name is treated as "not provided"
    try {
      const res = await request(app).get(
        `/api/businesses/nearby?lat=${CENTER_LAT}&lng=${CENTER_LNG}&radius=2000&name=%20%20%20`
      );
      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.body.success, true);
      assert.strictEqual(res.body.data.data.length, 5); // All 5 published in-radius businesses
      recordPass('TN004-06', 'Name Search', 'Whitespace-only name is treated as unprovided');
    } catch (e) {
      recordFail('TN004-06', 'Name Search', 'Whitespace-only name handling', e);
    }

    // TEST-07: Name exceeding 200 characters returns 400
    try {
      const longName = 'a'.repeat(201);
      const res = await request(app).get(
        `/api/businesses/nearby?lat=${CENTER_LAT}&lng=${CENTER_LNG}&radius=2000&name=${longName}`
      );
      assert.strictEqual(res.status, 400);
      assert.strictEqual(res.body.success, false);
      recordPass('TN004-07', 'Name Search', 'Name exceeding 200 chars returns 400');
    } catch (e) {
      recordFail('TN004-07', 'Name Search', 'Name max length validation', e);
    }

    console.log('\n--- 2. CATEGORY FILTER TESTS ---');

    // TEST-08: Valid categoryId filters correctly
    try {
      const res = await request(app).get(
        `/api/businesses/nearby?lat=${CENTER_LAT}&lng=${CENTER_LNG}&radius=2000&categoryId=${catCafeId}`
      );
      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.body.success, true);
      assert.strictEqual(res.body.data.data.length, 3); // biz1, biz4, biz5
      for (const item of res.body.data.data) {
        assert.strictEqual(item.categoryId, catCafeId);
      }
      recordPass('TN004-08', 'Category Filter', 'Valid categoryId filters result set to only that category');
    } catch (e) {
      recordFail('TN004-08', 'Category Filter', 'Valid categoryId filter', e);
    }

    // TEST-09: Non-existent categoryId returns 400
    try {
      const res = await request(app).get(
        `/api/businesses/nearby?lat=${CENTER_LAT}&lng=${CENTER_LNG}&radius=2000&categoryId=32000`
      );
      assert.strictEqual(res.status, 400);
      assert.strictEqual(res.body.success, false);
      const msg = res.body.error || res.body.message || '';
      assert.ok(msg.includes('does not exist'), `Clean error message: ${msg}`);
      recordPass('TN004-09', 'Category Filter', 'Non-existent categoryId returns 400 with clean error');
    } catch (e) {
      recordFail('TN004-09', 'Category Filter', 'Non-existent categoryId', e);
    }

    // TEST-10: Invalid-type categoryId returns 400, not raw DB error
    try {
      const res = await request(app).get(
        `/api/businesses/nearby?lat=${CENTER_LAT}&lng=${CENTER_LNG}&radius=2000&categoryId=notanumber`
      );
      assert.strictEqual(res.status, 400);
      assert.strictEqual(res.body.success, false);
      assert.ok(!JSON.stringify(res.body).toLowerCase().includes('prisma'), 'No Prisma error leaked');
      recordPass('TN004-10', 'Category Filter', 'Invalid-type categoryId returns 400 without DB leak');
    } catch (e) {
      recordFail('TN004-10', 'Category Filter', 'Invalid-type categoryId', e);
    }

    // TEST-11: Out-of-range categoryId returns 400
    try {
      const res1 = await request(app).get(
        `/api/businesses/nearby?lat=${CENTER_LAT}&lng=${CENTER_LNG}&radius=2000&categoryId=-1`
      );
      assert.strictEqual(res1.status, 400);

      const res2 = await request(app).get(
        `/api/businesses/nearby?lat=${CENTER_LAT}&lng=${CENTER_LNG}&radius=2000&categoryId=50000`
      );
      assert.strictEqual(res2.status, 400);
      recordPass('TN004-11', 'Category Filter', 'Out-of-range categoryId (negative or >32767) returns 400');
    } catch (e) {
      recordFail('TN004-11', 'Category Filter', 'Out of range categoryId', e);
    }

    console.log('\n--- 3. MINIMUM RATING TESTS ---');

    // TEST-12: minRating filters out businesses below threshold
    try {
      const res = await request(app).get(
        `/api/businesses/nearby?lat=${CENTER_LAT}&lng=${CENTER_LNG}&radius=2000&minRating=4`
      );
      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.body.success, true);
      assert.strictEqual(res.body.data.data.length, 3); // 4.8 (biz1), 5.0 (biz3), 4.2 (biz4)
      for (const item of res.body.data.data) {
        assert.ok(item.rating >= 4.0, `Rating ${item.rating} should be >= 4.0`);
      }
      recordPass('TN004-12', 'Minimum Rating', 'minRating=4 excludes businesses with rating < 4.0');
    } catch (e) {
      recordFail('TN004-12', 'Minimum Rating', 'minRating threshold filter', e);
    }

    // TEST-13: minRating=0 returns all businesses regardless of rating
    try {
      const res = await request(app).get(
        `/api/businesses/nearby?lat=${CENTER_LAT}&lng=${CENTER_LNG}&radius=2000&minRating=0`
      );
      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.body.success, true);
      assert.strictEqual(res.body.data.data.length, 5); // All 5 published in-radius businesses
      recordPass('TN004-13', 'Minimum Rating', 'minRating=0 returns all businesses including 0 rating');
    } catch (e) {
      recordFail('TN004-13', 'Minimum Rating', 'minRating=0 behavior', e);
    }

    // TEST-14: minRating=5 returns only perfectly-rated businesses
    try {
      const res = await request(app).get(
        `/api/businesses/nearby?lat=${CENTER_LAT}&lng=${CENTER_LNG}&radius=2000&minRating=5`
      );
      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.body.success, true);
      assert.strictEqual(res.body.data.data.length, 1);
      assert.strictEqual(res.body.data.data[0].id, biz3);
      assert.strictEqual(res.body.data.data[0].rating, 5.0);
      recordPass('TN004-14', 'Minimum Rating', 'minRating=5 returns only 5.0 rated businesses');
    } catch (e) {
      recordFail('TN004-14', 'Minimum Rating', 'minRating=5 filter', e);
    }

    // TEST-15: minRating > 5 returns 400
    try {
      const res = await request(app).get(
        `/api/businesses/nearby?lat=${CENTER_LAT}&lng=${CENTER_LNG}&radius=2000&minRating=5.5`
      );
      assert.strictEqual(res.status, 400);
      assert.strictEqual(res.body.success, false);
      recordPass('TN004-15', 'Minimum Rating', 'minRating > 5 returns 400');
    } catch (e) {
      recordFail('TN004-15', 'Minimum Rating', 'minRating > 5 validation', e);
    }

    // TEST-16: minRating < 0 returns 400
    try {
      const res = await request(app).get(
        `/api/businesses/nearby?lat=${CENTER_LAT}&lng=${CENTER_LNG}&radius=2000&minRating=-0.5`
      );
      assert.strictEqual(res.status, 400);
      assert.strictEqual(res.body.success, false);
      recordPass('TN004-16', 'Minimum Rating', 'minRating < 0 returns 400');
    } catch (e) {
      recordFail('TN004-16', 'Minimum Rating', 'minRating < 0 validation', e);
    }

    // TEST-17: Non-numeric minRating returns 400
    try {
      const res = await request(app).get(
        `/api/businesses/nearby?lat=${CENTER_LAT}&lng=${CENTER_LNG}&radius=2000&minRating=five`
      );
      assert.strictEqual(res.status, 400);
      assert.strictEqual(res.body.success, false);
      recordPass('TN004-17', 'Minimum Rating', 'Non-numeric minRating returns 400');
    } catch (e) {
      recordFail('TN004-17', 'Minimum Rating', 'Non-numeric minRating', e);
    }

    console.log('\n--- 4. COMBINED FILTERS & ADVANCED INTERACTION ---');

    // TEST-18: name + categoryId combined
    try {
      const res = await request(app).get(
        `/api/businesses/nearby?lat=${CENTER_LAT}&lng=${CENTER_LNG}&radius=2000&name=Addis&categoryId=${catCafeId}`
      );
      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.body.success, true);
      assert.strictEqual(res.body.data.data.length, 1);
      assert.strictEqual(res.body.data.data[0].id, biz4);
      assert.strictEqual(res.body.data.data[0].name, 'Addis Cafe & Bakery');
      recordPass('TN004-18', 'Combined Filters', 'name + categoryId together filters correctly');
    } catch (e) {
      recordFail('TN004-18', 'Combined Filters', 'name + categoryId combination', e);
    }

    // TEST-19: name + categoryId + minRating combined
    try {
      const res = await request(app).get(
        `/api/businesses/nearby?lat=${CENTER_LAT}&lng=${CENTER_LNG}&radius=2000&name=Coffee&categoryId=${catCafeId}&minRating=4.5`
      );
      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.body.success, true);
      assert.strictEqual(res.body.data.data.length, 1);
      assert.strictEqual(res.body.data.data[0].id, biz1);
      assert.strictEqual(res.body.data.data[0].name, 'Blue Nile Coffee');
      assert.strictEqual(res.body.data.data[0].rating, 4.8);
      recordPass('TN004-19', 'Combined Filters', 'name + categoryId + minRating together filters correctly');
    } catch (e) {
      recordFail('TN004-19', 'Combined Filters', 'name + categoryId + minRating combination', e);
    }

    // TEST-20: Business matching all filters but outside radius is strictly excluded
    try {
      const res = await request(app).get(
        `/api/businesses/nearby?lat=${CENTER_LAT}&lng=${CENTER_LNG}&radius=2000&name=Far Away&categoryId=${catCafeId}&minRating=4`
      );
      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.body.success, true);
      assert.strictEqual(res.body.data.data.length, 0);
      assert.strictEqual(res.body.data.pagination.total, 0);
      recordPass('TN004-20', 'Combined Filters', 'Business matching name/category/rating outside radius is excluded');
    } catch (e) {
      recordFail('TN004-20', 'Combined Filters', 'Radius boundary with combined filters', e);
    }

    // TEST-21: Full combination with sort=rating and pagination
    try {
      const res = await request(app).get(
        `/api/businesses/nearby?lat=${CENTER_LAT}&lng=${CENTER_LNG}&radius=2000&categoryId=${catCafeId}&sort=rating&page=1&pageSize=2`
      );
      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.body.success, true);
      assert.strictEqual(res.body.data.data.length, 2);
      assert.strictEqual(res.body.data.data[0].id, biz1); // 4.8
      assert.strictEqual(res.body.data.data[1].id, biz4); // 4.2
      assert.strictEqual(res.body.data.pagination.total, 3);
      assert.strictEqual(res.body.data.pagination.totalPages, 2);
      assert.strictEqual(res.body.data.pagination.page, 1);
      assert.strictEqual(res.body.data.pagination.pageSize, 2);
      recordPass('TN004-21', 'Combined Filters', 'Full combination with sort=rating and pagination works properly');
    } catch (e) {
      recordFail('TN004-21', 'Combined Filters', 'Sort + pagination + filters combination', e);
    }

    // TEST-22: Count/pagination accuracy reflects fully filtered count
    try {
      const res = await request(app).get(
        `/api/businesses/nearby?lat=${CENTER_LAT}&lng=${CENTER_LNG}&radius=2000&categoryId=${catCafeId}&minRating=4&page=1&pageSize=1`
      );
      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.body.success, true);
      assert.strictEqual(res.body.data.data.length, 1);
      // 2 cafes match rating >= 4 (biz1 @ 4.8, biz4 @ 4.2)
      assert.strictEqual(res.body.data.pagination.total, 2);
      assert.strictEqual(res.body.data.pagination.totalPages, 2);
      recordPass('TN004-22', 'Pagination Accuracy', 'Total and totalPages reflect the fully filtered count');
    } catch (e) {
      recordFail('TN004-22', 'Pagination Accuracy', 'Filtered count accuracy', e);
    }

    console.log('\n--- 5. BACKWARD COMPATIBILITY ---');

    // TEST-23: Request with only lat/lng/radius behaves identically to TN-003
    try {
      const res = await request(app).get(
        `/api/businesses/nearby?lat=${CENTER_LAT}&lng=${CENTER_LNG}&radius=2000`
      );
      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.body.success, true);
      assert.strictEqual(res.body.data.data.length, 5); // 5 published in-radius businesses
      assert.strictEqual(res.body.data.pagination.total, 5);
      assert.strictEqual(res.body.data.pagination.page, 1);
      assert.strictEqual(res.body.data.pagination.pageSize, 20);
      // Pending and outside businesses excluded
      const ids = res.body.data.data.map((b: any) => b.id);
      assert.ok(!ids.includes(bizFar));
      assert.ok(!ids.includes(bizPending));
      recordPass('TN004-23', 'Backward Compatibility', 'Request with only lat/lng/radius behaves identically to TN-003');
    } catch (e) {
      recordFail('TN004-23', 'Backward Compatibility', 'Pure TN-003 query backward compatibility', e);
    }

  } catch (globalErr: any) {
    console.error('💥 Fatal error in search test suite:', globalErr);
  } finally {
    console.log('\n🧹 Cleaning up test data...');
    try {
      if (createdBusinessIds.length > 0) {
        await prisma.business.deleteMany({
          where: { id: { in: createdBusinessIds } },
        });
      }
      if (testUserId) {
        await prisma.user.delete({ where: { id: testUserId } });
      }
      if (catCafeId || catRestaurantId || catHotelId) {
        await prisma.category.deleteMany({
          where: { id: { in: [catCafeId, catRestaurantId, catHotelId].filter(Boolean) } },
        });
      }
    } catch (cleanupErr) {
      console.warn('Cleanup warning:', cleanupErr);
    }
    await prisma.$disconnect();
  }

  // Summary
  const passed = results.filter((r) => r.status === 'PASS').length;
  const failed = results.filter((r) => r.status === 'FAIL').length;

  console.log('\n===========================================================');
  console.log('📊 QA SUMMARY REPORT — TN-004 SEARCH & FILTER');
  console.log('===========================================================');
  console.log(`Total Test Cases : ${results.length}`);
  console.log(`Passed           : ${passed} ✅`);
  console.log(`Failed           : ${failed} ❌\n`);

  if (failed > 0) {
    console.log('❌ SOME TESTS FAILED:');
    results
      .filter((r) => r.status === 'FAIL')
      .forEach((r) => console.log(`  - [${r.id}] ${r.name}: ${r.details}`));
    process.exit(1);
  } else {
    console.log('🎉 ALL TN-004 SEARCH & FILTER TESTS PASSED WITH 100% SUCCESS! 🚀\n');
  }
}

runAllSearchTests();
