/**
 * TrustNear — Full QA Test Suite for TN-003 (Nearby Business Search)
 * Test Specifications 1 through 39
 *
 * Changes from original 32-test suite:
 *   - TEST-26: updated — pageSize=500 now clamps to 50 (HTTP 200, not 400)
 *   - TEST-26b (new): pageSize=0 → 400
 *   - TEST-26c (new): pageSize=-5 → 400
 *   - TEST-33..37 (new): non-numeric input validation for lat/lng/radius/page/pageSize
 *   - TEST-38 (new): distance tie-break determinism (sort=distance)
 *   - TEST-39 (new): rating tie-break determinism (sort=rating)
 */
import assert from 'assert';
// @ts-ignore
import request from 'supertest';
import app from '../../../server';
import { prisma } from '../../../config/db';
import { execSync } from 'child_process';
import path from 'path';

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

async function runAllNearbyTests() {
  console.log('===========================================================');
  console.log('🗺️  TrustNear TN-003 Nearby Search QA Suite (Test 1 – 39)');
  console.log('===========================================================\n');

  let testCategoryId = 0;
  let testUserId = '';
  const createdBusinessIds: string[] = [];

  // Unique isolated coordinates for test suite to avoid collision with seed data
  const CENTER_LAT = 12.34567;
  const CENTER_LNG = 39.12345;

  try {
    await prisma.$connect();

    // ── SETUP CATEGORY & USER ──────────────────────────────────────────────────
    const cat = await prisma.category.upsert({
      where: { name: 'restaurant' },
      update: {},
      create: { name: 'restaurant' },
    });
    testCategoryId = cat.id;

    const u = await prisma.user.create({
      data: {
        displayName: 'Nearby QA User',
        email: `nearby_qa_${Date.now()}@trustnear.com`,
        passwordHash: 'dummyhash',
        role: 'user',
      },
    });
    testUserId = u.id;

    // Helper to insert business directly with exact status, location, and rating
    const insertTestBiz = async (
      name: string,
      lat: number,
      lng: number,
      status: 'published' | 'pending' | 'rejected',
      avgRating = 0
    ) => {
      const rows = await prisma.$queryRaw<[{ id: string }]>`
        INSERT INTO businesses (
          name, category_id, landmark_description, location, status, submitted_by, avg_rating, updated_at
        ) VALUES (
          ${name},
          ${testCategoryId}::smallint,
          'Test Landmark',
          ST_SetSRID(ST_MakePoint(${lng}::float8, ${lat}::float8), 4326)::geography,
          ${status}::"BusinessStatus",
          ${testUserId}::uuid,
          ${avgRating}::numeric(2,1),
          NOW()
        ) RETURNING id
      `;
      const id = rows[0].id;
      createdBusinessIds.push(id);
      return id;
    };

    // ── SEED TEST DATA AT ISOLATED COORDINATES ────────────────────────────────
    // Business 1: Published, ~166m north, rating 4.2
    const biz1Id = await insertTestBiz('Biz Near 166m', CENTER_LAT + 0.0015, CENTER_LNG, 'published', 4.2);
    // Business 2: Published, ~1492m north, rating 4.9
    const biz2Id = await insertTestBiz('Biz Med 1492m', CENTER_LAT + 0.0135, CENTER_LNG, 'published', 4.9);
    // Business 3: Published, ~3484m north, rating 3.5
    const biz3Id = await insertTestBiz('Biz Far 3484m', CENTER_LAT + 0.0315, CENTER_LNG, 'published', 3.5);
    // Business 4: Pending, ~100m north, rating 5.0
    const biz4Id = await insertTestBiz('Biz Pending 100m', CENTER_LAT + 0.0009, CENTER_LNG, 'pending', 5.0);
    // Business 5: Rejected, ~100m north, rating 5.0
    const biz5Id = await insertTestBiz('Biz Rejected 100m', CENTER_LAT + 0.0008, CENTER_LNG, 'rejected', 5.0);

    console.log('--- 1. RADIUS FILTERS (1000m, 2000m, 5000m) ---');

    // Test 1: Successful nearby search with radius=1000
    try {
      const res = await request(app).get(`/api/businesses/nearby?lat=${CENTER_LAT}&lng=${CENTER_LNG}&radius=1000`);
      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.body.success, true);
      assert.strictEqual(res.body.data.data.length, 1);
      assert.strictEqual(res.body.data.data[0].id, biz1Id);
      recordPass('TEST-01', 'Radius', 'Successful nearby search with radius=1000');
    } catch (e) { recordFail('TEST-01', 'Radius', 'radius=1000 search', e); }

    // Test 2: Successful nearby search with radius=2000
    try {
      const res = await request(app).get(`/api/businesses/nearby?lat=${CENTER_LAT}&lng=${CENTER_LNG}&radius=2000`);
      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.body.data.data.length, 2);
      const ids = res.body.data.data.map((b: any) => b.id);
      assert.ok(ids.includes(biz1Id));
      assert.ok(ids.includes(biz2Id));
      assert.ok(!ids.includes(biz3Id));
      recordPass('TEST-02', 'Radius', 'Successful nearby search with radius=2000');
    } catch (e) { recordFail('TEST-02', 'Radius', 'radius=2000 search', e); }

    // Test 3: Successful nearby search with radius=5000
    try {
      const res = await request(app).get(`/api/businesses/nearby?lat=${CENTER_LAT}&lng=${CENTER_LNG}&radius=5000`);
      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.body.data.data.length, 3);
      recordPass('TEST-03', 'Radius', 'Successful nearby search with radius=5000');
    } catch (e) { recordFail('TEST-03', 'Radius', 'radius=5000 search', e); }

    console.log('\n--- 2. PUBLISHED BUSINESSES ONLY ---');

    // Test 4: Only published businesses are returned
    try {
      const res = await request(app).get(`/api/businesses/nearby?lat=${CENTER_LAT}&lng=${CENTER_LNG}&radius=5000`);
      assert.strictEqual(res.status, 200);
      const ids = res.body.data.data.map((b: any) => b.id);
      assert.ok(ids.includes(biz1Id));
      assert.ok(ids.includes(biz2Id));
      assert.ok(ids.includes(biz3Id));
      recordPass('TEST-04', 'Status Filter', 'Only published businesses are returned');
    } catch (e) { recordFail('TEST-04', 'Status Filter', 'Only published returned', e); }

    // Test 5: Pending businesses are excluded
    try {
      const res = await request(app).get(`/api/businesses/nearby?lat=${CENTER_LAT}&lng=${CENTER_LNG}&radius=5000`);
      const ids = res.body.data.data.map((b: any) => b.id);
      assert.ok(!ids.includes(biz4Id), 'Pending business must be excluded');
      recordPass('TEST-05', 'Status Filter', 'Pending businesses are excluded');
    } catch (e) { recordFail('TEST-05', 'Status Filter', 'Pending excluded', e); }

    // Test 6: Rejected businesses are excluded
    try {
      const res = await request(app).get(`/api/businesses/nearby?lat=${CENTER_LAT}&lng=${CENTER_LNG}&radius=5000`);
      const ids = res.body.data.data.map((b: any) => b.id);
      assert.ok(!ids.includes(biz5Id), 'Rejected business must be excluded');
      recordPass('TEST-06', 'Status Filter', 'Rejected businesses are excluded');
    } catch (e) { recordFail('TEST-06', 'Status Filter', 'Rejected excluded', e); }

    console.log('\n--- 3. DISTANCE CALCULATION & FIELD MAPPING ---');

    // Test 7: Distance is returned as distanceMeters
    try {
      const res = await request(app).get(`/api/businesses/nearby?lat=${CENTER_LAT}&lng=${CENTER_LNG}&radius=1000`);
      assert.strictEqual(res.status, 200);
      const item = res.body.data.data[0];
      assert.ok(typeof item.distanceMeters === 'number', 'distanceMeters is numeric');
      assert.ok(item.distanceMeters > 0, 'distanceMeters > 0');
      recordPass('TEST-07', 'Distance', 'Distance is returned as distanceMeters');
    } catch (e) { recordFail('TEST-07', 'Distance', 'distanceMeters property check', e); }

    // Test 8: Distance is calculated correctly using PostGIS
    try {
      const res = await request(app).get(`/api/businesses/nearby?lat=${CENTER_LAT}&lng=${CENTER_LNG}&radius=1000`);
      const item = res.body.data.data[0];
      // Expected distance for offset 0.0015 lat is ~166m
      assert.ok(item.distanceMeters >= 150 && item.distanceMeters <= 180, `Expected ~166m, got ${item.distanceMeters}`);
      recordPass('TEST-08', 'Distance', 'Distance is calculated correctly using PostGIS (~166m)');
    } catch (e) { recordFail('TEST-08', 'Distance', 'PostGIS distance calculation accuracy', e); }

    console.log('\n--- 4. SORTING ---');

    // Test 9: Results default to nearest-first ordering
    try {
      const res = await request(app).get(`/api/businesses/nearby?lat=${CENTER_LAT}&lng=${CENTER_LNG}&radius=5000`);
      assert.strictEqual(res.status, 200);
      const items = res.body.data.data;
      assert.strictEqual(items[0].id, biz1Id, 'Nearest biz first');
      assert.strictEqual(items[1].id, biz2Id, 'Second nearest biz second');
      assert.strictEqual(items[2].id, biz3Id, 'Furthest biz third');
      recordPass('TEST-09', 'Sorting', 'Results default to nearest-first ordering');
    } catch (e) { recordFail('TEST-09', 'Sorting', 'Default sort=distance', e); }

    // Test 10: sort=distance explicitly works
    try {
      const res = await request(app).get(`/api/businesses/nearby?lat=${CENTER_LAT}&lng=${CENTER_LNG}&radius=5000&sort=distance`);
      assert.strictEqual(res.status, 200);
      const items = res.body.data.data;
      assert.strictEqual(items[0].id, biz1Id);
      assert.strictEqual(items[1].id, biz2Id);
      assert.strictEqual(items[2].id, biz3Id);
      recordPass('TEST-10', 'Sorting', 'sort=distance explicitly works');
    } catch (e) { recordFail('TEST-10', 'Sorting', 'Explicit sort=distance', e); }

    // Test 11: sort=rating orders by rating descending
    try {
      const res = await request(app).get(`/api/businesses/nearby?lat=${CENTER_LAT}&lng=${CENTER_LNG}&radius=5000&sort=rating`);
      assert.strictEqual(res.status, 200);
      const items = res.body.data.data;
      // Ratings: biz2 (4.9), biz1 (4.2), biz3 (3.5)
      assert.strictEqual(items[0].id, biz2Id, 'Highest rated biz (4.9) first');
      assert.strictEqual(items[1].id, biz1Id, 'Second highest rated biz (4.2) second');
      assert.strictEqual(items[2].id, biz3Id, 'Lowest rated biz (3.5) third');
      recordPass('TEST-11', 'Sorting', 'sort=rating orders by rating descending');
    } catch (e) { recordFail('TEST-11', 'Sorting', 'sort=rating', e); }

    console.log('\n--- 5. PAGINATION ---');

    // Test 12: Pagination page=1 works
    try {
      const res = await request(app).get(`/api/businesses/nearby?lat=${CENTER_LAT}&lng=${CENTER_LNG}&radius=5000&page=1&pageSize=2`);
      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.body.data.data.length, 2);
      assert.strictEqual(res.body.data.data[0].id, biz1Id);
      assert.strictEqual(res.body.data.data[1].id, biz2Id);
      recordPass('TEST-12', 'Pagination', 'Pagination page=1 works');
    } catch (e) { recordFail('TEST-12', 'Pagination', 'page=1', e); }

    // Test 13: Pagination page=2 works
    try {
      const res = await request(app).get(`/api/businesses/nearby?lat=${CENTER_LAT}&lng=${CENTER_LNG}&radius=5000&page=2&pageSize=2`);
      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.body.data.data.length, 1);
      assert.strictEqual(res.body.data.data[0].id, biz3Id);
      recordPass('TEST-13', 'Pagination', 'Pagination page=2 works');
    } catch (e) { recordFail('TEST-13', 'Pagination', 'page=2', e); }

    // Test 14: pageSize is respected
    try {
      const res = await request(app).get(`/api/businesses/nearby?lat=${CENTER_LAT}&lng=${CENTER_LNG}&radius=5000&page=1&pageSize=1`);
      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.body.data.data.length, 1);
      recordPass('TEST-14', 'Pagination', 'pageSize is respected');
    } catch (e) { recordFail('TEST-14', 'Pagination', 'pageSize=1', e); }

    // Test 15: Pagination metadata is correct
    try {
      const res = await request(app).get(`/api/businesses/nearby?lat=${CENTER_LAT}&lng=${CENTER_LNG}&radius=5000&page=1&pageSize=2`);
      assert.strictEqual(res.status, 200);
      assert.deepStrictEqual(res.body.data.pagination, {
        page: 1,
        pageSize: 2,
        total: 3,
        totalPages: 2,
      });
      recordPass('TEST-15', 'Pagination', 'Pagination metadata is correct');
    } catch (e) { recordFail('TEST-15', 'Pagination', 'Pagination metadata structure', e); }

    // Test 16: No results returns HTTP 200 with an empty data array
    try {
      // Query far away coordinate (e.g. North Pole 89.0, 0.0)
      const res = await request(app).get('/api/businesses/nearby?lat=89.0&lng=0.0&radius=1000');
      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.body.success, true);
      assert.deepStrictEqual(res.body.data.data, []);
      assert.deepStrictEqual(res.body.data.pagination, {
        page: 1,
        pageSize: 20,
        total: 0,
        totalPages: 0,
      });
      recordPass('TEST-16', 'Empty Results', 'No results returns HTTP 200 with empty data array');
    } catch (e) { recordFail('TEST-16', 'Empty Results', 'Empty result set returns 200', e); }

    console.log('\n--- 6. VALIDATION & ERROR HANDLING (400 ERRORS) ---');

    // Test 17: Missing lat -> 400
    try {
      const res = await request(app).get('/api/businesses/nearby?lng=38.74&radius=1000');
      assert.strictEqual(res.status, 400);
      assert.strictEqual(res.body.success, false);
      recordPass('TEST-17', 'Validation', 'Missing lat returns 400');
    } catch (e) { recordFail('TEST-17', 'Validation', 'Missing lat', e); }

    // Test 18: Missing lng -> 400
    try {
      const res = await request(app).get('/api/businesses/nearby?lat=9.03&radius=1000');
      assert.strictEqual(res.status, 400);
      assert.strictEqual(res.body.success, false);
      recordPass('TEST-18', 'Validation', 'Missing lng returns 400');
    } catch (e) { recordFail('TEST-18', 'Validation', 'Missing lng', e); }

    // Test 19: Missing radius -> 400
    try {
      const res = await request(app).get('/api/businesses/nearby?lat=9.03&lng=38.74');
      assert.strictEqual(res.status, 400);
      assert.strictEqual(res.body.success, false);
      recordPass('TEST-19', 'Validation', 'Missing radius returns 400');
    } catch (e) { recordFail('TEST-19', 'Validation', 'Missing radius', e); }

    // Test 20: Invalid latitude -> 400
    try {
      const res = await request(app).get('/api/businesses/nearby?lat=95.0&lng=38.74&radius=1000');
      assert.strictEqual(res.status, 400);
      recordPass('TEST-20', 'Validation', 'Invalid latitude (>90) returns 400');
    } catch (e) { recordFail('TEST-20', 'Validation', 'Invalid lat', e); }

    // Test 21: Invalid longitude -> 400
    try {
      const res = await request(app).get('/api/businesses/nearby?lat=9.03&lng=-190.0&radius=1000');
      assert.strictEqual(res.status, 400);
      recordPass('TEST-21', 'Validation', 'Invalid longitude (<-180) returns 400');
    } catch (e) { recordFail('TEST-21', 'Validation', 'Invalid lng', e); }

    // Test 22: Radius=500 -> 400
    try {
      const res = await request(app).get('/api/businesses/nearby?lat=9.03&lng=38.74&radius=500');
      assert.strictEqual(res.status, 400);
      recordPass('TEST-22', 'Validation', 'Radius=500 returns 400');
    } catch (e) { recordFail('TEST-22', 'Validation', 'Radius=500', e); }

    // Test 23: Radius=3000 -> 400
    try {
      const res = await request(app).get('/api/businesses/nearby?lat=9.03&lng=38.74&radius=3000');
      assert.strictEqual(res.status, 400);
      recordPass('TEST-23', 'Validation', 'Radius=3000 returns 400');
    } catch (e) { recordFail('TEST-23', 'Validation', 'Radius=3000', e); }

    // Test 24: Invalid sort value -> 400
    try {
      const res = await request(app).get('/api/businesses/nearby?lat=9.03&lng=38.74&radius=1000&sort=name');
      assert.strictEqual(res.status, 400);
      recordPass('TEST-24', 'Validation', 'Invalid sort value returns 400');
    } catch (e) { recordFail('TEST-24', 'Validation', 'Invalid sort', e); }

    // Test 25: Invalid page -> 400
    try {
      const res = await request(app).get('/api/businesses/nearby?lat=9.03&lng=38.74&radius=1000&page=0');
      assert.strictEqual(res.status, 400);
      recordPass('TEST-25', 'Validation', 'Invalid page=0 returns 400');
    } catch (e) { recordFail('TEST-25', 'Validation', 'Invalid page', e); }

    // Test 26: pageSize=500 is clamped to 50 → 200 OK, pagination.pageSize = 50
    try {
      const res = await request(app).get(`/api/businesses/nearby?lat=${CENTER_LAT}&lng=${CENTER_LNG}&radius=5000&pageSize=500`);
      assert.strictEqual(res.status, 200, 'pageSize=500 should clamp to 50, not return 400');
      assert.strictEqual(res.body.success, true);
      assert.strictEqual(res.body.data.pagination.pageSize, 50, 'pagination.pageSize should reflect clamped value (50)');
      assert.ok(res.body.data.data.length <= 50, 'data array length must not exceed 50');
      recordPass('TEST-26', 'Validation', 'pageSize=500 clamped to 50, returns 200 with pagination.pageSize=50');
    } catch (e) { recordFail('TEST-26', 'Validation', 'pageSize clamp to 50', e); }

    // Test 26b: pageSize=0 → 400 (still a genuine validation failure)
    try {
      const res = await request(app).get('/api/businesses/nearby?lat=9.03&lng=38.74&radius=1000&pageSize=0');
      assert.strictEqual(res.status, 400);
      assert.strictEqual(res.body.success, false);
      recordPass('TEST-26b', 'Validation', 'pageSize=0 returns 400');
    } catch (e) { recordFail('TEST-26b', 'Validation', 'pageSize=0 → 400', e); }

    // Test 26c: pageSize=-5 → 400 (still a genuine validation failure)
    try {
      const res = await request(app).get('/api/businesses/nearby?lat=9.03&lng=38.74&radius=1000&pageSize=-5');
      assert.strictEqual(res.status, 400);
      assert.strictEqual(res.body.success, false);
      recordPass('TEST-26c', 'Validation', 'pageSize=-5 returns 400');
    } catch (e) { recordFail('TEST-26c', 'Validation', 'pageSize=-5 → 400', e); }

    console.log('\n--- 7. PUBLIC ACCESS & POSTGIS INTEGRITY ---');

    // Test 27: Unauthenticated request succeeds because the endpoint is public
    try {
      const res = await request(app).get(`/api/businesses/nearby?lat=${CENTER_LAT}&lng=${CENTER_LNG}&radius=1000`);
      assert.strictEqual(res.status, 200, 'Unauthenticated request receives 200 OK');
      recordPass('TEST-27', 'Auth', 'Unauthenticated request succeeds (Public Endpoint)');
    } catch (e) { recordFail('TEST-27', 'Auth', 'Public access check', e); }

    // Test 28: Verify latitude/longitude are passed to PostGIS in correct order (longitude, latitude)
    try {
      // If order was inverted to (lat, lng) = (12.34567, 39.12345), location point would be at long 12.34567°E, lat 39.12345°N
      // distance from 12.34567, 39.12345 would be over 3,000 km instead of 166m.
      const res = await request(app).get(`/api/businesses/nearby?lat=${CENTER_LAT}&lng=${CENTER_LNG}&radius=1000`);
      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.body.data.data.length, 1);
      assert.ok(res.body.data.data[0].distanceMeters < 200, 'Longitude, latitude passed correctly to PostGIS');
      recordPass('TEST-28', 'PostGIS', 'Latitude/longitude passed to PostGIS in correct order (lng, lat)');
    } catch (e) { recordFail('TEST-28', 'PostGIS', 'PostGIS coordinate order (lng, lat)', e); }

    // Test 29: Verify SQL parameters are not vulnerable to SQL injection
    try {
      const injectionAttempt = "distance'; DROP TABLE businesses; --";
      const res = await request(app).get(`/api/businesses/nearby?lat=${CENTER_LAT}&lng=${CENTER_LNG}&radius=1000&sort=${encodeURIComponent(injectionAttempt)}`);
      assert.strictEqual(res.status, 400, 'SQL injection attempt blocked by validation');
      // Verify businesses table is completely intact
      const count = await prisma.business.count();
      assert.ok(count > 0, 'Database table intact after injection attempt');
      recordPass('TEST-29', 'Security', 'SQL parameters protected against SQL injection');
    } catch (e) { recordFail('TEST-29', 'Security', 'SQL injection safety', e); }

    console.log('\n--- 8. REGRESSION TESTS ---');

    // Test 30: Regression: existing TN-001/TN-TECH-005 auth pipeline check
    try {
      const res = await request(app).get('/api/health');
      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.body.success, true);
      recordPass('TEST-30', 'Regression', 'Existing TN-001 / TN-TECH-005 auth core operational');
    } catch (e) { recordFail('TEST-30', 'Regression', 'TN-001 / TN-TECH-005 regression check', e); }

    // Test 31: Regression: TN-006/TN-007 business listing route check
    try {
      const res = await request(app).post('/api/businesses').send({});
      assert.strictEqual(res.status, 401, 'Unauthenticated POST /api/businesses returns 401');
      recordPass('TEST-31', 'Regression', 'Existing TN-006 / TN-007 business listing creation route operational');
    } catch (e) { recordFail('TEST-31', 'Regression', 'TN-006 / TN-007 regression check', e); }

    // Test 32: Regression: TN-022 admin approval route check
    try {
      const res = await request(app).get('/api/admin/businesses/pending');
      assert.strictEqual(res.status, 401, 'Unauthenticated GET /api/admin/businesses/pending returns 401');
      recordPass('TEST-32', 'Regression', 'Existing TN-022 admin approval route operational');
    } catch (e) { recordFail('TEST-32', 'Regression', 'TN-022 admin approval regression check', e); }

    console.log('\n--- 9. NON-NUMERIC INPUT VALIDATION ---');

    // Test 33: lat="notanumber" → 400
    try {
      const res = await request(app).get('/api/businesses/nearby?lat=notanumber&lng=38.74&radius=1000');
      assert.strictEqual(res.status, 400);
      assert.strictEqual(res.body.success, false);
      recordPass('TEST-33', 'Validation', 'lat="notanumber" returns 400');
    } catch (e) { recordFail('TEST-33', 'Validation', 'lat non-numeric → 400', e); }

    // Test 34: lng="notanumber" → 400
    try {
      const res = await request(app).get('/api/businesses/nearby?lat=9.03&lng=notanumber&radius=1000');
      assert.strictEqual(res.status, 400);
      assert.strictEqual(res.body.success, false);
      recordPass('TEST-34', 'Validation', 'lng="notanumber" returns 400');
    } catch (e) { recordFail('TEST-34', 'Validation', 'lng non-numeric → 400', e); }

    // Test 35: radius="notanumber" → 400
    try {
      const res = await request(app).get('/api/businesses/nearby?lat=9.03&lng=38.74&radius=notanumber');
      assert.strictEqual(res.status, 400);
      assert.strictEqual(res.body.success, false);
      recordPass('TEST-35', 'Validation', 'radius="notanumber" returns 400');
    } catch (e) { recordFail('TEST-35', 'Validation', 'radius non-numeric → 400', e); }

    // Test 36: page="notanumber" → 400
    try {
      const res = await request(app).get('/api/businesses/nearby?lat=9.03&lng=38.74&radius=1000&page=notanumber');
      assert.strictEqual(res.status, 400);
      assert.strictEqual(res.body.success, false);
      recordPass('TEST-36', 'Validation', 'page="notanumber" returns 400');
    } catch (e) { recordFail('TEST-36', 'Validation', 'page non-numeric → 400', e); }

    // Test 37: pageSize="notanumber" → 400 (type failure, distinct from the clamp case)
    try {
      const res = await request(app).get('/api/businesses/nearby?lat=9.03&lng=38.74&radius=1000&pageSize=notanumber');
      assert.strictEqual(res.status, 400);
      assert.strictEqual(res.body.success, false);
      recordPass('TEST-37', 'Validation', 'pageSize="notanumber" returns 400 (type failure, not clamp case)');
    } catch (e) { recordFail('TEST-37', 'Validation', 'pageSize non-numeric → 400', e); }

    console.log('\n--- 10. TIE-BREAK DETERMINISM ---');

    // Seed two businesses at IDENTICAL coordinates (distanceMeters = 0 from center) with different creation times
    const tieDistBiz1 = await insertTestBiz('TieDist A', CENTER_LAT, CENTER_LNG, 'published', 3.0);
    const tieDistBiz2 = await insertTestBiz('TieDist B', CENTER_LAT, CENTER_LNG, 'published', 3.0);

    // Test 38: Distance tie-break determinism (sort=distance, tie-breaker created_at DESC)
    try {
      const res1 = await request(app).get(`/api/businesses/nearby?lat=${CENTER_LAT}&lng=${CENTER_LNG}&radius=1000&sort=distance`);
      const res2 = await request(app).get(`/api/businesses/nearby?lat=${CENTER_LAT}&lng=${CENTER_LNG}&radius=1000&sort=distance`);
      assert.strictEqual(res1.status, 200);
      assert.strictEqual(res2.status, 200);
      const ids1 = res1.body.data.data.map((b: any) => b.id);
      const ids2 = res2.body.data.data.map((b: any) => b.id);
      // Order must be identical across both calls
      assert.deepStrictEqual(ids1, ids2, 'Identical requests must return identical ordering');
      // TieDist B was inserted last → higher created_at → must appear BEFORE TieDist A with DESC sort
      const posA = ids1.indexOf(tieDistBiz1);
      const posB = ids1.indexOf(tieDistBiz2);
      assert.ok(posA > -1 && posB > -1, 'Both tie businesses must appear in result');
      assert.ok(posB < posA, 'TieDist B (newer created_at) must appear before TieDist A (older created_at) with tie-breaker created_at DESC');
      recordPass('TEST-38', 'Determinism', 'Distance tie-break returns stable order (created_at DESC) across repeated requests');
    } catch (e) { recordFail('TEST-38', 'Determinism', 'Distance tie-break determinism', e); }

    // Seed two businesses with identical avg_rating but different distances (for rating tie-break test)
    const tieRateBiz1 = await insertTestBiz('TieRate Near', CENTER_LAT + 0.0002, CENTER_LNG, 'published', 4.5); // ~22m
    const tieRateBiz2 = await insertTestBiz('TieRate Far',  CENTER_LAT + 0.0006, CENTER_LNG, 'published', 4.5); // ~67m

    // Test 39: Rating tie-break determinism (sort=rating → tie-breaker distanceMeters ASC, id ASC)
    try {
      const res1 = await request(app).get(`/api/businesses/nearby?lat=${CENTER_LAT}&lng=${CENTER_LNG}&radius=1000&sort=rating`);
      const res2 = await request(app).get(`/api/businesses/nearby?lat=${CENTER_LAT}&lng=${CENTER_LNG}&radius=1000&sort=rating`);
      assert.strictEqual(res1.status, 200);
      assert.strictEqual(res2.status, 200);
      const ids1 = res1.body.data.data.map((b: any) => b.id);
      const ids2 = res2.body.data.data.map((b: any) => b.id);
      // Order must be identical across both calls
      assert.deepStrictEqual(ids1, ids2, 'Identical requests must return identical ordering');
      // Both seeded businesses have rating 4.5; tie-break is distanceMeters ASC → Near must come before Far
      const posNear = ids1.indexOf(tieRateBiz1);
      const posFar  = ids1.indexOf(tieRateBiz2);
      assert.ok(posNear > -1 && posFar > -1, 'Both tie-rating businesses must appear in result');
      assert.ok(posNear < posFar, 'TieRate Near (shorter distanceMeters) must appear before TieRate Far with tie-breaker distanceMeters ASC');
      recordPass('TEST-39', 'Determinism', 'Rating tie-break returns stable order (distanceMeters ASC) across repeated requests');
    } catch (e) { recordFail('TEST-39', 'Determinism', 'Rating tie-break determinism', e); }

  } finally {
    // ── CLEANUP ───────────────────────────────────────────────────────────────
    if (createdBusinessIds.length > 0) {
      await prisma.$executeRawUnsafe(
        `DELETE FROM businesses WHERE id IN (${createdBusinessIds.map((id) => `'${id}'`).join(',')});`
      );
    }
    if (testUserId) {
      await prisma.user.delete({ where: { id: testUserId } }).catch(() => {});
    }
    await prisma.$disconnect();
  }

  // ── SUMMARY REPORT ──────────────────────────────────────────────────────────
  const total = results.length;
  const passed = results.filter((r) => r.status === 'PASS').length;
  const failed = results.filter((r) => r.status === 'FAIL').length;

  console.log('\n===========================================================');
  console.log('📊 QA SUMMARY REPORT — TN-003 NEARBY SEARCH');
  console.log('===========================================================');
  console.log(`Total Test Cases : ${total}`);
  console.log(`Passed           : ${passed} ✅`);
  console.log(`Failed           : ${failed} ❌`);

  if (failed > 0) {
    console.error('\n❌ FAILED TESTS DETAILS:');
    results
      .filter((r) => r.status === 'FAIL')
      .forEach((r) => console.error(`  - [${r.id}] ${r.name}: ${r.details}`));
    process.exit(1);
  } else {
    console.log('\n🎉 ALL 41 TEST SPECIFICATIONS PASSED WITH 100% SUCCESS! 🚀\n');
  }
}

runAllNearbyTests().catch((err) => {
  console.error('Test execution error:', err);
  process.exit(1);
});
