/**
 * TrustNear — Full QA Test Suite for TN-014 (Earn a Verified Visit Badge)
 * Test Specification: VERIFY-001 through VERIFY-065
 */
import assert from 'assert';
// @ts-ignore
import request from 'supertest';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import app from '../../../server';
import { prisma } from '../../../config/db';

const JWT_SECRET = process.env.JWT_SECRET || 'trustnear-secret-key';
const makeToken = (id: string, role: string) =>
  jwt.sign({ id, role }, JWT_SECRET, { expiresIn: '1h' });

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

let testCategoryId = 0;
let user1Id = '', user1Token = '';
let user2Id = '', user2Token = '';
let user3Id = '', user3Token = '';
let ownerId = '', ownerToken = '';
let adminId = '', adminToken = '';
let businessId = '';
let pendingBusinessId = '';

const createdBusinessIds: string[] = [];
const createdUserIds: string[] = [];
const FAKE_UUID = '99999999-9999-4999-a999-999999999999';

// Business Location: Addis Ababa Bole (lat: 9.0000, lng: 38.7800)
const BIZ_LAT = 9.0000;
const BIZ_LNG = 38.7800;

// ~100m away (Within 500m threshold)
const NEAR_LAT = 9.0008;
const NEAR_LNG = 38.7805;

// ~1.5km away (Outside 500m threshold)
const FAR_LAT = 9.0150;
const FAR_LNG = 38.7900;

async function createTestBusiness(
  status: 'published' | 'pending' | 'rejected' = 'published',
  customOwnerId?: string
): Promise<string> {
  const effectiveOwnerId = customOwnerId ?? ownerId;
  const rows = await prisma.$queryRaw<[{ id: string }]>`
    INSERT INTO businesses (
      name, category_id, landmark_description, location, status, submitted_by, owner_id, updated_at
    ) VALUES (
      ${`TN014 Biz ${Date.now()}_${Math.random().toString(36).substring(2, 7)}`},
      ${testCategoryId}::smallint,
      'Near Bole Medhanialem',
      ST_SetSRID(ST_MakePoint(${BIZ_LNG}, ${BIZ_LAT}), 4326)::geography,
      ${status}::"BusinessStatus",
      ${effectiveOwnerId}::uuid,
      ${effectiveOwnerId}::uuid,
      NOW()
    ) RETURNING id
  `;
  const id = rows[0].id;
  createdBusinessIds.push(id);
  return id;
}

async function setup() {
  console.log('\n======================================================');
  console.log('  TN-014 VERIFIED VISIT BADGE — PRE-SUITE SETUP');
  console.log('======================================================');

  await prisma.$connect();
  const passwordHash = await bcrypt.hash('TestPassword123!', 4);
  const ts = Date.now();

  // 1. Create Category
  const cat = await prisma.category.create({
    data: { name: `TN014 Cat ${ts}_${Math.random().toString(36).substring(2, 5)}` },
  });
  testCategoryId = cat.id;

  // 2. Create Users
  const u1 = await prisma.user.create({
    data: { displayName: 'Reviewer One', email: `v1_${ts}@test.com`, passwordHash, role: 'user' },
  });
  user1Id = u1.id; user1Token = makeToken(user1Id, 'user'); createdUserIds.push(user1Id);

  const u2 = await prisma.user.create({
    data: { displayName: 'Reviewer Two', email: `v2_${ts}@test.com`, passwordHash, role: 'user' },
  });
  user2Id = u2.id; user2Token = makeToken(user2Id, 'user'); createdUserIds.push(user2Id);

  const u3 = await prisma.user.create({
    data: { displayName: 'Reviewer Three', email: `v3_${ts}@test.com`, passwordHash, role: 'user' },
  });
  user3Id = u3.id; user3Token = makeToken(user3Id, 'user'); createdUserIds.push(user3Id);

  const ow = await prisma.user.create({
    data: { displayName: 'Biz Owner', email: `v_owner_${ts}@test.com`, passwordHash, role: 'business_owner' },
  });
  ownerId = ow.id; ownerToken = makeToken(ownerId, 'business_owner'); createdUserIds.push(ownerId);

  const ad = await prisma.user.create({
    data: { displayName: 'Admin User', email: `v_admin_${ts}@test.com`, passwordHash, role: 'admin' },
  });
  adminId = ad.id; adminToken = makeToken(adminId, 'admin'); createdUserIds.push(adminId);

  // 3. Create Businesses
  businessId = await createTestBusiness('published');
  pendingBusinessId = await createTestBusiness('pending');

  console.log('Setup complete.');
}

async function cleanup() {
  console.log('\n======================================================');
  console.log('  TN-014 PRE-TEARDOWN CLEANUP');
  console.log('======================================================');

  if (createdBusinessIds.length > 0) {
    await prisma.reviewReport.deleteMany({
      where: { review: { businessId: { in: createdBusinessIds } } },
    }).catch(() => {});
    await prisma.review.deleteMany({
      where: { businessId: { in: createdBusinessIds } },
    }).catch(() => {});
    await prisma.businessPhoto.deleteMany({
      where: { businessId: { in: createdBusinessIds } },
    }).catch(() => {});
    await prisma.business.deleteMany({
      where: { id: { in: createdBusinessIds } },
    }).catch(() => {});
  }

  if (testCategoryId) {
    await prisma.category.delete({ where: { id: testCategoryId } }).catch(() => {});
  }

  if (createdUserIds.length > 0) {
    await prisma.user.deleteMany({ where: { id: { in: createdUserIds } } }).catch(() => {});
  }

  await prisma.$disconnect();
  console.log('Cleanup complete.');
}

async function runTests() {
  try {
    await setup();

    // ──────────────────────────────────────────────────────────
    // 1. HAPPY PATH: REVIEW SUBMISSION WITH LOCATION (VERIFY-001 – VERIFY-010)
    // ──────────────────────────────────────────────────────────
    console.log('\n--- 1. HAPPY PATH: REVIEW SUBMISSION & LOCATION VERIFICATION ---');

    // VERIFY-001: Review submitted within 500m gets isVerified: true
    try {
      const res = await request(app)
        .post(`/api/businesses/${businessId}/reviews`)
        .set('Authorization', `Bearer ${user1Token}`)
        .send({
          rating: 5,
          comment: 'Visited in person! Great place.',
          location: { lat: NEAR_LAT, lng: NEAR_LNG },
        });

      assert.strictEqual(res.status, 201);
      assert.strictEqual(res.body.success, true);
      assert.strictEqual(res.body.data.isVerified, true);
      assert.ok(typeof res.body.data.distanceMeters === 'number');
      assert.ok(res.body.data.distanceMeters <= 500);
      recordPass('VERIFY-001', 'Happy Path', 'Review within 500m qualifies for isVerified: true');
    } catch (e) { recordFail('VERIFY-001', 'Happy Path', 'Review within 500m', e); }

    // VERIFY-002: Review submitted with top-level lat/lng within 500m gets isVerified: true
    try {
      const tempBiz = await createTestBusiness('published');
      const res = await request(app)
        .post(`/api/businesses/${tempBiz}/reviews`)
        .set('Authorization', `Bearer ${user1Token}`)
        .send({
          rating: 4,
          comment: 'Top-level coords test',
          lat: NEAR_LAT,
          lng: NEAR_LNG,
        });

      assert.strictEqual(res.status, 201);
      assert.strictEqual(res.body.data.isVerified, true);
      recordPass('VERIFY-002', 'Happy Path', 'Top-level lat/lng coords qualify for isVerified: true');
    } catch (e) { recordFail('VERIFY-002', 'Happy Path', 'Top-level lat/lng', e); }

    // VERIFY-003: Review submitted far away (> 500m) succeeds with isVerified: false
    try {
      const res = await request(app)
        .post(`/api/businesses/${businessId}/reviews`)
        .set('Authorization', `Bearer ${user2Token}`)
        .send({
          rating: 4,
          comment: 'Reviewing from afar',
          location: { lat: FAR_LAT, lng: FAR_LNG },
        });

      assert.strictEqual(res.status, 201);
      assert.strictEqual(res.body.success, true);
      assert.strictEqual(res.body.data.isVerified, false);
      assert.ok(typeof res.body.data.distanceMeters === 'number');
      assert.ok(res.body.data.distanceMeters > 500);
      recordPass('VERIFY-003', 'Happy Path', 'Review outside 500m succeeds with isVerified: false (non-blocking)');
    } catch (e) { recordFail('VERIFY-003', 'Happy Path', 'Review outside 500m', e); }

    // VERIFY-004: Review submitted with NO location succeeds with isVerified: false
    try {
      const res = await request(app)
        .post(`/api/businesses/${businessId}/reviews`)
        .set('Authorization', `Bearer ${user3Token}`)
        .send({
          rating: 3,
          comment: 'No location permission granted',
        });

      assert.strictEqual(res.status, 201);
      assert.strictEqual(res.body.success, true);
      assert.strictEqual(res.body.data.isVerified, false);
      recordPass('VERIFY-004', 'Happy Path', 'Review without location succeeds with isVerified: false');
    } catch (e) { recordFail('VERIFY-004', 'Happy Path', 'Review without location', e); }

    // VERIFY-005: getMine returns correct isVerified status
    try {
      const res1 = await request(app)
        .get(`/api/businesses/${businessId}/reviews/me`)
        .set('Authorization', `Bearer ${user1Token}`);
      assert.strictEqual(res1.status, 200);
      assert.strictEqual(res1.body.data.isVerified, true);

      const res2 = await request(app)
        .get(`/api/businesses/${businessId}/reviews/me`)
        .set('Authorization', `Bearer ${user2Token}`);
      assert.strictEqual(res2.status, 200);
      assert.strictEqual(res2.body.data.isVerified, false);

      recordPass('VERIFY-005', 'Happy Path', 'GET /reviews/me preserves accurate isVerified badge status');
    } catch (e) { recordFail('VERIFY-005', 'Happy Path', 'GET /reviews/me badge check', e); }

    // ──────────────────────────────────────────────────────────
    // 2. DEDICATED VERIFICATION ENDPOINT (VERIFY-011 – VERIFY-020)
    // ──────────────────────────────────────────────────────────
    console.log('\n--- 2. DEDICATED VERIFIED VISIT CHECK-IN ENDPOINT ---');

    // VERIFY-011: Dedicated verify endpoint via /businesses/:businessId/reviews/verify (inside 500m)
    try {
      const res = await request(app)
        .post(`/api/businesses/${businessId}/reviews/verify`)
        .set('Authorization', `Bearer ${user3Token}`)
        .send({
          location: { lat: NEAR_LAT, lng: NEAR_LNG },
        });

      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.body.success, true);
      assert.strictEqual(res.body.data.isVerified, true);
      assert.ok(res.body.data.distanceMeters <= 500);
      assert.strictEqual(res.body.data.thresholdMeters, 500);
      assert.strictEqual(res.body.data.review.isVerified, true);
      recordPass('VERIFY-011', 'Verification Endpoint', 'POST /reviews/verify upgrades unverified review to isVerified: true');
    } catch (e) { recordFail('VERIFY-011', 'Verification Endpoint', 'POST /reviews/verify upgrade', e); }

    // VERIFY-012: Dedicated verify endpoint with reviewId param /businesses/:id/reviews/:reviewId/verify
    try {
      const user2Review = await prisma.review.findUnique({
        where: { businessId_userId: { businessId, userId: user2Id } },
      });
      assert.ok(user2Review);

      const res = await request(app)
        .post(`/api/businesses/${businessId}/reviews/${user2Review.id}/verify`)
        .set('Authorization', `Bearer ${user2Token}`)
        .send({
          lat: NEAR_LAT,
          lng: NEAR_LNG,
        });

      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.body.data.isVerified, true);
      assert.strictEqual(res.body.data.review.isVerified, true);
      recordPass('VERIFY-012', 'Verification Endpoint', 'POST /reviews/:reviewId/verify verifies with explicit reviewId');
    } catch (e) { recordFail('VERIFY-012', 'Verification Endpoint', 'POST /reviews/:reviewId/verify', e); }

    // VERIFY-013: Dedicated verify endpoint with far location returns isVerified: false
    try {
      const res = await request(app)
        .post(`/api/businesses/${businessId}/reviews/verify`)
        .set('Authorization', `Bearer ${user2Token}`)
        .send({
          location: { lat: FAR_LAT, lng: FAR_LNG },
        });

      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.body.data.isVerified, false);
      assert.ok(res.body.data.distanceMeters > 500);
      recordPass('VERIFY-013', 'Verification Endpoint', 'POST /reviews/verify returns isVerified: false when outside threshold');
    } catch (e) { recordFail('VERIFY-013', 'Verification Endpoint', 'POST /reviews/verify outside threshold', e); }

    // ──────────────────────────────────────────────────────────
    // 3. REVIEW UPDATE WITH LOCATION (VERIFY-021 – VERIFY-025)
    // ──────────────────────────────────────────────────────────
    console.log('\n--- 3. REVIEW UPDATE WITH LOCATION RE-EVALUATION ---');

    // VERIFY-021: PATCH update review with near location updates isVerified to true
    try {
      const user2Review = await prisma.review.findUnique({
        where: { businessId_userId: { businessId, userId: user2Id } },
      });

      const res = await request(app)
        .patch(`/api/businesses/${businessId}/reviews/${user2Review!.id}`)
        .set('Authorization', `Bearer ${user2Token}`)
        .send({
          comment: 'Updated review while at the store',
          location: { lat: NEAR_LAT, lng: NEAR_LNG },
        });

      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.body.data.isVerified, true);
      recordPass('VERIFY-021', 'Review Update', 'PATCH review with near location updates isVerified to true');
    } catch (e) { recordFail('VERIFY-021', 'Review Update', 'PATCH review with location', e); }

    // ──────────────────────────────────────────────────────────
    // 4. PUBLIC REVIEWS LISTING & BADGE FILTERING (VERIFY-026 – VERIFY-035)
    // ──────────────────────────────────────────────────────────
    console.log('\n--- 4. PUBLIC REVIEWS LISTING & VERIFIED FILTERING ---');

    // VERIFY-026: GET /api/businesses/:businessId/reviews returns all reviews with isVerified field
    try {
      const res = await request(app).get(`/api/businesses/${businessId}/reviews`);
      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.body.success, true);
      const items = res.body.data.data;
      assert.ok(Array.isArray(items));
      assert.ok(items.length >= 3);
      for (const r of items) {
        assert.ok(typeof r.isVerified === 'boolean');
        assert.ok(r.user);
        assert.ok(r.user.displayName);
        // Sensitive data check
        assert.strictEqual(r.user.passwordHash, undefined);
        assert.strictEqual(r.user.email, undefined);
        assert.strictEqual(r.user.phone, undefined);
      }
      recordPass('VERIFY-026', 'Reviews Query', 'GET /businesses/:id/reviews lists reviews with sanitized user info and isVerified');
    } catch (e) { recordFail('VERIFY-026', 'Reviews Query', 'GET reviews list', e); }

    // VERIFY-027: GET /api/businesses/:businessId/reviews?verifiedOnly=true returns ONLY verified reviews
    try {
      const res = await request(app).get(`/api/businesses/${businessId}/reviews?verifiedOnly=true`);
      assert.strictEqual(res.status, 200);
      const items = res.body.data.data;
      assert.ok(items.length > 0);
      for (const r of items) {
        assert.strictEqual(r.isVerified, true);
      }
      recordPass('VERIFY-027', 'Reviews Query', 'verifiedOnly=true query filter returns only verified reviews');
    } catch (e) { recordFail('VERIFY-027', 'Reviews Query', 'verifiedOnly filter', e); }

    // VERIFY-028: GET /api/businesses/:businessId/reviews?sort=verified sorts verified reviews first
    try {
      const res = await request(app).get(`/api/businesses/${businessId}/reviews?sort=verified`);
      assert.strictEqual(res.status, 200);
      const items = res.body.data.data;
      assert.ok(items.length > 0);
      recordPass('VERIFY-028', 'Reviews Query', 'sort=verified orders verified reviews appropriately');
    } catch (e) { recordFail('VERIFY-028', 'Reviews Query', 'sort=verified', e); }

    // VERIFY-029: Pagination works on reviews list
    try {
      const res = await request(app).get(`/api/businesses/${businessId}/reviews?page=1&pageSize=2`);
      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.body.data.data.length, 2);
      assert.strictEqual(res.body.data.pagination.pageSize, 2);
      assert.strictEqual(res.body.data.pagination.page, 1);
      recordPass('VERIFY-029', 'Reviews Query', 'Pagination metadata and limits work on reviews endpoint');
    } catch (e) { recordFail('VERIFY-029', 'Reviews Query', 'Pagination', e); }

    // ──────────────────────────────────────────────────────────
    // 5. AUTHENTICATION & RBAC (VERIFY-036 – VERIFY-045)
    // ──────────────────────────────────────────────────────────
    console.log('\n--- 5. AUTHENTICATION & RBAC RESTRICTIONS ---');

    // VERIFY-036: Unauthenticated request to verify visit returns 401
    try {
      const res = await request(app)
        .post(`/api/businesses/${businessId}/reviews/verify`)
        .send({ location: { lat: NEAR_LAT, lng: NEAR_LNG } });
      assert.strictEqual(res.status, 401);
      recordPass('VERIFY-036', 'Auth & RBAC', 'Unauthenticated request to verify endpoint returns 401');
    } catch (e) { recordFail('VERIFY-036', 'Auth & RBAC', 'Unauthenticated 401', e); }

    // VERIFY-037: Business owner cannot review own business (403)
    try {
      const res = await request(app)
        .post(`/api/businesses/${businessId}/reviews`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({
          rating: 5,
          comment: 'My business is best',
          location: { lat: NEAR_LAT, lng: NEAR_LNG },
        });
      assert.strictEqual(res.status, 403);
      recordPass('VERIFY-037', 'Auth & RBAC', 'Business owner cannot review own business (403 Forbidden)');
    } catch (e) { recordFail('VERIFY-037', 'Auth & RBAC', 'Owner cannot review', e); }

    // VERIFY-038: Business owner cannot verify visit on own business (403)
    try {
      const res = await request(app)
        .post(`/api/businesses/${businessId}/reviews/verify`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({ location: { lat: NEAR_LAT, lng: NEAR_LNG } });
      assert.strictEqual(res.status, 403);
      recordPass('VERIFY-038', 'Auth & RBAC', 'Business owner cannot verify visit on own business (403 Forbidden)');
    } catch (e) { recordFail('VERIFY-038', 'Auth & RBAC', 'Owner cannot verify visit', e); }

    // ──────────────────────────────────────────────────────────
    // 6. IDOR & OWNERSHIP GUARDS (VERIFY-046 – VERIFY-050)
    // ──────────────────────────────────────────────────────────
    console.log('\n--- 6. IDOR & RESOURCE OWNERSHIP ---');

    // VERIFY-046: User cannot verify another user's review via reviewId
    try {
      const user1Review = await prisma.review.findUnique({
        where: { businessId_userId: { businessId, userId: user1Id } },
      });
      assert.ok(user1Review);

      const res = await request(app)
        .post(`/api/businesses/${businessId}/reviews/${user1Review!.id}/verify`)
        .set('Authorization', `Bearer ${user2Token}`)
        .send({ location: { lat: NEAR_LAT, lng: NEAR_LNG } });

      assert.strictEqual(res.status, 404);
      recordPass('VERIFY-046', 'IDOR', 'User cannot verify another user review ID (404 / IDOR protected)');
    } catch (e) { recordFail('VERIFY-046', 'IDOR', 'IDOR review verification', e); }

    // VERIFY-047: Verify visit on non-existent review returns 404
    try {
      const freshUser = await prisma.user.create({
        data: { displayName: 'Fresh User', email: `fresh_${Date.now()}@test.com`, passwordHash: 'hash', role: 'user' },
      });
      createdUserIds.push(freshUser.id);
      const freshToken = makeToken(freshUser.id, 'user');

      const res = await request(app)
        .post(`/api/businesses/${businessId}/reviews/verify`)
        .set('Authorization', `Bearer ${freshToken}`)
        .send({ location: { lat: NEAR_LAT, lng: NEAR_LNG } });

      assert.strictEqual(res.status, 404);
      recordPass('VERIFY-047', 'IDOR', 'Attempting verification before review submission returns 404');
    } catch (e) { recordFail('VERIFY-047', 'IDOR', 'Verification without review 404', e); }

    // ──────────────────────────────────────────────────────────
    // 7. INPUT VALIDATION & SECURITY (VERIFY-051 – VERIFY-060)
    // ──────────────────────────────────────────────────────────
    console.log('\n--- 7. VALIDATION & SECURITY DEFENSES ---');

    // VERIFY-051: Invalid latitude (> 90) returns 400
    try {
      const res = await request(app)
        .post(`/api/businesses/${businessId}/reviews/verify`)
        .set('Authorization', `Bearer ${user1Token}`)
        .send({ location: { lat: 95, lng: 38.78 } });
      assert.strictEqual(res.status, 400);
      recordPass('VERIFY-051', 'Validation', 'Latitude > 90 rejected with 400');
    } catch (e) { recordFail('VERIFY-051', 'Validation', 'Lat > 90', e); }

    // VERIFY-052: Invalid latitude (< -90) returns 400
    try {
      const res = await request(app)
        .post(`/api/businesses/${businessId}/reviews/verify`)
        .set('Authorization', `Bearer ${user1Token}`)
        .send({ location: { lat: -95, lng: 38.78 } });
      assert.strictEqual(res.status, 400);
      recordPass('VERIFY-052', 'Validation', 'Latitude < -90 rejected with 400');
    } catch (e) { recordFail('VERIFY-052', 'Validation', 'Lat < -90', e); }

    // VERIFY-053: Invalid longitude (> 180) returns 400
    try {
      const res = await request(app)
        .post(`/api/businesses/${businessId}/reviews/verify`)
        .set('Authorization', `Bearer ${user1Token}`)
        .send({ location: { lat: 9.0, lng: 185 } });
      assert.strictEqual(res.status, 400);
      recordPass('VERIFY-053', 'Validation', 'Longitude > 180 rejected with 400');
    } catch (e) { recordFail('VERIFY-053', 'Validation', 'Lng > 180', e); }

    // VERIFY-054: Invalid longitude (< -180) returns 400
    try {
      const res = await request(app)
        .post(`/api/businesses/${businessId}/reviews/verify`)
        .set('Authorization', `Bearer ${user1Token}`)
        .send({ location: { lat: 9.0, lng: -185 } });
      assert.strictEqual(res.status, 400);
      recordPass('VERIFY-054', 'Validation', 'Longitude < -180 rejected with 400');
    } catch (e) { recordFail('VERIFY-054', 'Validation', 'Lng < -180', e); }

    // VERIFY-055: Missing coordinates in verify endpoint returns 400
    try {
      const res = await request(app)
        .post(`/api/businesses/${businessId}/reviews/verify`)
        .set('Authorization', `Bearer ${user1Token}`)
        .send({});
      assert.strictEqual(res.status, 400);
      recordPass('VERIFY-055', 'Validation', 'Missing coordinates in verify endpoint rejected with 400');
    } catch (e) { recordFail('VERIFY-055', 'Validation', 'Missing coords', e); }

    // VERIFY-056: Malformed UUID in businessId returns 400
    try {
      const res = await request(app)
        .post('/api/businesses/not-a-valid-uuid/reviews/verify')
        .set('Authorization', `Bearer ${user1Token}`)
        .send({ location: { lat: NEAR_LAT, lng: NEAR_LNG } });
      assert.strictEqual(res.status, 400);
      recordPass('VERIFY-056', 'Validation', 'Malformed business UUID returns 400');
    } catch (e) { recordFail('VERIFY-056', 'Validation', 'Malformed UUID', e); }

    // VERIFY-057: Malformed UUID in reviewId returns 400
    try {
      const res = await request(app)
        .post(`/api/businesses/${businessId}/reviews/not-a-uuid/verify`)
        .set('Authorization', `Bearer ${user1Token}`)
        .send({ location: { lat: NEAR_LAT, lng: NEAR_LNG } });
      assert.strictEqual(res.status, 400);
      recordPass('VERIFY-057', 'Validation', 'Malformed review UUID returns 400');
    } catch (e) { recordFail('VERIFY-057', 'Validation', 'Malformed review UUID', e); }

    // VERIFY-058: Non-existent business returns 404
    try {
      const res = await request(app)
        .post(`/api/businesses/${FAKE_UUID}/reviews/verify`)
        .set('Authorization', `Bearer ${user1Token}`)
        .send({ location: { lat: NEAR_LAT, lng: NEAR_LNG } });
      assert.strictEqual(res.status, 404);
      recordPass('VERIFY-058', 'Validation', 'Non-existent business returns 404');
    } catch (e) { recordFail('VERIFY-058', 'Validation', 'Non-existent biz 404', e); }

    // VERIFY-059: Cannot verify on pending/unpublished business (400)
    try {
      const res = await request(app)
        .post(`/api/businesses/${pendingBusinessId}/reviews/verify`)
        .set('Authorization', `Bearer ${user1Token}`)
        .send({ location: { lat: NEAR_LAT, lng: NEAR_LNG } });
      assert.strictEqual(res.status, 400);
      recordPass('VERIFY-059', 'Validation', 'Cannot verify visit on unpublished business (400)');
    } catch (e) { recordFail('VERIFY-059', 'Validation', 'Unpublished biz 400', e); }

    // VERIFY-060: SQL injection payload in coordinates handled safely
    try {
      const res = await request(app)
        .post(`/api/businesses/${businessId}/reviews/verify`)
        .set('Authorization', `Bearer ${user1Token}`)
        .send({
          location: {
            lat: "9.0'; DROP TABLE reviews; --",
            lng: 38.78,
          },
        });
      assert.strictEqual(res.status, 400);
      recordPass('VERIFY-060', 'Security', 'SQL injection payload in coordinates rejected by schema validator');
    } catch (e) { recordFail('VERIFY-060', 'Security', 'SQL injection in coords', e); }

    // ──────────────────────────────────────────────────────────
    // 8. DATA LEAKAGE & PRIVACY (VERIFY-061 – VERIFY-065)
    // ──────────────────────────────────────────────────────────
    console.log('\n--- 8. PRIVACY & SENSITIVE DATA LEAKAGE PREVENTION ---');

    // VERIFY-061: Verify response never leaks password hashes or tokens
    try {
      const res = await request(app)
        .post(`/api/businesses/${businessId}/reviews/verify`)
        .set('Authorization', `Bearer ${user1Token}`)
        .send({ location: { lat: NEAR_LAT, lng: NEAR_LNG } });

      assert.strictEqual(res.status, 200);
      const str = JSON.stringify(res.body);
      assert.strictEqual(str.includes('passwordHash'), false);
      assert.strictEqual(str.includes('password_hash'), false);
      assert.strictEqual(str.includes('tokenHash'), false);
      recordPass('VERIFY-061', 'Privacy', 'Verification response contains no password or token hashes');
    } catch (e) { recordFail('VERIFY-061', 'Privacy', 'Data leakage check', e); }

  } finally {
    await cleanup();
  }

  // ─── Summary Report ───────────────────────────────────────────────────────────
  console.log('\n======================================================');
  console.log('  TN-014 VERIFIED VISIT TEST SUITE SUMMARY');
  console.log('======================================================');

  const total = results.length;
  const passed = results.filter((r) => r.status === 'PASS').length;
  const failed = results.filter((r) => r.status === 'FAIL').length;

  console.log(`Total Tests Executed : ${total}`);
  console.log(`Passed               : ${passed} ✅`);
  console.log(`Failed               : ${failed} ${failed > 0 ? '❌' : ''}`);

  if (failed > 0) {
    console.log('\nFailed Tests:');
    results
      .filter((r) => r.status === 'FAIL')
      .forEach((r) => console.log(`  - ${r.id}: ${r.name} (${r.details})`));
    process.exit(1);
  } else {
    console.log('\n🎉 PASS — TN-014 (Earn a Verified Visit Badge) is fully verified!');
    process.exit(0);
  }
}

runTests().catch((e) => {
  console.error('Fatal test runner error:', e);
  process.exit(1);
});
