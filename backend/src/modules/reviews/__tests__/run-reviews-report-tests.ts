/**
 * TrustNear — Full QA Test Suite for TN-013 (Review Reporting)
 * Test Specification: REPORT-001 through REPORT-018
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
  name: string;
  status: 'PASS' | 'FAIL';
  details?: string;
}
const results: QAResult[] = [];

function recordPass(id: string, name: string) {
  results.push({ id, name, status: 'PASS' });
  console.log(`  ✅ [PASS] ${id}: ${name}`);
}

function recordFail(id: string, name: string, error: any) {
  results.push({ id, name, status: 'FAIL', details: String(error?.message ?? error) });
  console.error(`  ❌ [FAIL] ${id}: ${name} — ${error?.message ?? error}`);
}

let testCategoryId = 0;
let authorId = '', authorToken = '';
let reporter1Id = '', reporter1Token = '';
let reporter2Id = '', reporter2Token = '';
let adminId = '', adminToken = '';
let ownerId = '', ownerToken = '';
let businessId = '';
let reviewId = '';
const createdUserIds: string[] = [];
const createdBusinessIds: string[] = [];
const FAKE_UUID = '99999999-9999-4999-a999-999999999999';

async function setup() {
  console.log('\n======================================================');
  console.log('  TN-013 REVIEW REPORTING — PRE-SUITE SETUP');
  console.log('======================================================');

  await prisma.$connect();
  const passwordHash = await bcrypt.hash('TestPassword123!', 4);
  const ts = Date.now();

  // 1. Create Category
  const cat = await prisma.category.create({
    data: { name: `TN013 Cat ${ts}_${Math.random().toString(36).substring(2, 5)}` },
  });
  testCategoryId = cat.id;

  // 2. Create Users
  const author = await prisma.user.create({
    data: { displayName: 'Review Author', email: `author_${ts}@test.com`, passwordHash, role: 'user' },
  });
  authorId = author.id; authorToken = makeToken(authorId, 'user'); createdUserIds.push(authorId);

  const r1 = await prisma.user.create({
    data: { displayName: 'Reporter One', email: `r1_${ts}@test.com`, passwordHash, role: 'user' },
  });
  reporter1Id = r1.id; reporter1Token = makeToken(reporter1Id, 'user'); createdUserIds.push(reporter1Id);

  const r2 = await prisma.user.create({
    data: { displayName: 'Reporter Two', email: `r2_${ts}@test.com`, passwordHash, role: 'user' },
  });
  reporter2Id = r2.id; reporter2Token = makeToken(reporter2Id, 'user'); createdUserIds.push(reporter2Id);

  const admin = await prisma.user.create({
    data: { displayName: 'Admin User', email: `admin_${ts}@test.com`, passwordHash, role: 'admin' },
  });
  adminId = admin.id; adminToken = makeToken(adminId, 'admin'); createdUserIds.push(adminId);

  const owner = await prisma.user.create({
    data: { displayName: 'Biz Owner', email: `owner_${ts}@test.com`, passwordHash, role: 'business_owner' },
  });
  ownerId = owner.id; ownerToken = makeToken(ownerId, 'business_owner'); createdUserIds.push(ownerId);

  // 3. Create Business
  const bizRows = await prisma.$queryRaw<[{ id: string }]>`
    INSERT INTO businesses (
      name, category_id, landmark_description, location, status, submitted_by, owner_id, updated_at
    ) VALUES (
      ${`TN013 Business ${ts}`},
      ${testCategoryId}::smallint,
      'Near Mexico Square',
      ST_SetSRID(ST_MakePoint(38.75, 9.01), 4326)::geography,
      'published'::"BusinessStatus",
      ${ownerId}::uuid,
      ${ownerId}::uuid,
      NOW()
    ) RETURNING id
  `;
  businessId = bizRows[0].id;
  createdBusinessIds.push(businessId);

  // 4. Create Review by author
  const rev = await prisma.review.create({
    data: {
      businessId,
      userId: authorId,
      rating: 4,
      comment: 'Great place!',
      isDeleted: false,
    },
  });
  reviewId = rev.id;

  console.log(`  Created Business: ${businessId}, Review: ${reviewId}\n`);
}

async function cleanup() {
  console.log('\n======================================================');
  console.log('  TN-013 REVIEW REPORTING — POST-SUITE CLEANUP');
  console.log('======================================================');
  try {
    if (createdBusinessIds.length > 0) {
      await prisma.reviewReport.deleteMany({ where: { review: { businessId: { in: createdBusinessIds } } } });
      await prisma.review.deleteMany({ where: { businessId: { in: createdBusinessIds } } });
      await prisma.businessPhoto.deleteMany({ where: { businessId: { in: createdBusinessIds } } });
      await prisma.business.deleteMany({ where: { id: { in: createdBusinessIds } } });
    }
    if (testCategoryId) {
      await prisma.category.delete({ where: { id: testCategoryId } }).catch(() => {});
    }
    if (createdUserIds.length > 0) {
      await prisma.adminAction.deleteMany({ where: { adminId: { in: createdUserIds } } });
      await prisma.user.deleteMany({ where: { id: { in: createdUserIds } } });
    }
    await prisma.$disconnect();
    console.log('  Cleanup completed successfully.');
  } catch (err) {
    console.error('  Cleanup error:', err);
  }
}

async function createTestReporter(role: 'user' | 'business_owner' | 'admin' = 'user') {
  const ts = Date.now();
  const rand = Math.random().toString(36).substring(2, 7);
  const u = await prisma.user.create({
    data: {
      displayName: `Reporter ${ts}_${rand}`,
      email: `rep_${ts}_${rand}@test.com`,
      passwordHash: 'hash',
      role,
    },
  });
  createdUserIds.push(u.id);
  return { id: u.id, token: makeToken(u.id, role) };
}

async function createTestReview(comment = 'Test review') {
  const revUser = await prisma.user.create({
    data: {
      displayName: 'Rev Author',
      email: `revu_${Date.now()}_${Math.random().toString(36).substring(2, 7)}@test.com`,
      passwordHash: 'hash',
      role: 'user',
    },
  });
  createdUserIds.push(revUser.id);

  const rev = await prisma.review.create({
    data: {
      businessId,
      userId: revUser.id,
      rating: 5,
      comment,
      isDeleted: false,
    },
  });
  return rev;
}

async function runTests() {
  await setup();

  console.log('======================================================');
  console.log('  RUNNING TN-013 SPECIFICATION VERIFICATION');
  console.log('======================================================\n');

  // REPORT-001: Registered user reports a review with a valid reason -> 201, status = pending
  try {
    const rep = await createTestReporter();
    const res = await request(app)
      .post(`/api/reviews/${reviewId}/report`)
      .set('Authorization', `Bearer ${rep.token}`)
      .send({ reason: 'spam' });

    assert.strictEqual(res.status, 201, `Expected 201, got ${res.status}`);
    assert.strictEqual(res.body.success, true);
    assert.strictEqual(res.body.data.reviewId, reviewId);
    assert.strictEqual(res.body.data.status, 'pending');
    assert.ok(res.body.data.id, 'Report ID missing');
    recordPass('REPORT-001', 'Registered user reports review with valid reason -> 201 pending');
  } catch (err) {
    recordFail('REPORT-001', 'Registered user reports review with valid reason -> 201 pending', err);
  }

  // REPORT-002: reporterId is always req.user.id, cannot be spoofed via body
  try {
    const rep = await createTestReporter();
    const spoofedUserId = FAKE_UUID;
    const res = await request(app)
      .post(`/api/reviews/${reviewId}/report`)
      .set('Authorization', `Bearer ${rep.token}`)
      .send({ reason: 'fake', reporterId: spoofedUserId });

    assert.strictEqual(res.status, 201, `Expected 201, got ${res.status}`);
    const reportInDb = await prisma.reviewReport.findUnique({ where: { id: res.body.data.id } });
    assert.ok(reportInDb, 'Report not found in DB');
    assert.strictEqual(reportInDb.reporterId, rep.id, 'reporterId was spoofed from body!');
    recordPass('REPORT-002', 'reporterId is always req.user.id and cannot be spoofed via body');
  } catch (err) {
    recordFail('REPORT-002', 'reporterId is always req.user.id and cannot be spoofed via body', err);
  }

  // REPORT-003: All four valid reason values (fake, abusive, spam, other) each work
  try {
    const reasons = ['fake', 'abusive', 'spam', 'other'] as const;
    for (const r of reasons) {
      const rep = await createTestReporter();
      const tempRev = await createTestReview(`Test ${r}`);
      const res = await request(app)
        .post(`/api/reviews/${tempRev.id}/report`)
        .set('Authorization', `Bearer ${rep.token}`)
        .send({ reason: r });
      assert.strictEqual(res.status, 201, `Reason '${r}' failed with status ${res.status}`);
      assert.strictEqual(res.body.data.status, 'pending');
    }
    recordPass('REPORT-003', 'All four valid reason values (fake, abusive, spam, other) each work');
  } catch (err) {
    recordFail('REPORT-003', 'All four valid reason values (fake, abusive, spam, other) each work', err);
  }

  // REPORT-004: Invalid/unrecognized reason value -> 400
  try {
    const rep = await createTestReporter();
    const res = await request(app)
      .post(`/api/reviews/${reviewId}/report`)
      .set('Authorization', `Bearer ${rep.token}`)
      .send({ reason: 'not_a_valid_reason' });

    assert.strictEqual(res.status, 400, `Expected 400, got ${res.status}`);
    assert.strictEqual(res.body.success, false);
    recordPass('REPORT-004', 'Invalid/unrecognized reason value -> 400');
  } catch (err) {
    recordFail('REPORT-004', 'Invalid/unrecognized reason value -> 400', err);
  }

  // REPORT-005: Missing reason -> 400
  try {
    const rep = await createTestReporter();
    const res = await request(app)
      .post(`/api/reviews/${reviewId}/report`)
      .set('Authorization', `Bearer ${rep.token}`)
      .send({});

    assert.strictEqual(res.status, 400, `Expected 400, got ${res.status}`);
    assert.strictEqual(res.body.success, false);
    recordPass('REPORT-005', 'Missing reason -> 400');
  } catch (err) {
    recordFail('REPORT-005', 'Missing reason -> 400', err);
  }

  // REPORT-006: User attempts to report their own review -> 403
  try {
    const res = await request(app)
      .post(`/api/reviews/${reviewId}/report`)
      .set('Authorization', `Bearer ${authorToken}`)
      .send({ reason: 'spam' });

    assert.strictEqual(res.status, 403, `Expected 403, got ${res.status}`);
    assert.strictEqual(res.body.success, false);
    assert.ok(res.body.error.includes('cannot report your own review'), 'Expected self-report message');
    recordPass('REPORT-006', 'User attempts to report their own review -> 403');
  } catch (err) {
    recordFail('REPORT-006', 'User attempts to report their own review -> 403', err);
  }

  // REPORT-007: Same user reports the same review twice while the first is still pending -> 409
  try {
    const rep = await createTestReporter();
    const r1 = await request(app)
      .post(`/api/reviews/${reviewId}/report`)
      .set('Authorization', `Bearer ${rep.token}`)
      .send({ reason: 'abusive' });
    assert.strictEqual(r1.status, 201);

    const res = await request(app)
      .post(`/api/reviews/${reviewId}/report`)
      .set('Authorization', `Bearer ${rep.token}`)
      .send({ reason: 'abusive' });

    assert.strictEqual(res.status, 409, `Expected 409, got ${res.status}`);
    assert.strictEqual(res.body.success, false);
    recordPass('REPORT-007', 'Duplicate report while first is pending -> 409');
  } catch (err) {
    recordFail('REPORT-007', 'Duplicate report while first is pending -> 409', err);
  }

  // REPORT-008: Same user reports the same review again AFTER their first report was dismissed -> 201
  try {
    const rep = await createTestReporter();
    const rev = await createTestReview('Dismiss test review');
    const r1Res = await request(app)
      .post(`/api/reviews/${rev.id}/report`)
      .set('Authorization', `Bearer ${rep.token}`)
      .send({ reason: 'spam' });
    assert.strictEqual(r1Res.status, 201);
    const reportId = r1Res.body.data.id;

    const dismissRes = await request(app)
      .patch(`/api/admin/moderation/${reportId}/dismiss`)
      .set('Authorization', `Bearer ${adminToken}`);
    assert.strictEqual(dismissRes.status, 200);

    const r2Res = await request(app)
      .post(`/api/reviews/${rev.id}/report`)
      .set('Authorization', `Bearer ${rep.token}`)
      .send({ reason: 'abusive' });

    assert.strictEqual(r2Res.status, 201, `Expected 201, got ${r2Res.status}`);
    assert.strictEqual(r2Res.body.data.status, 'pending');
    recordPass('REPORT-008', 'Re-reporting review after prior report dismissed -> 201');
  } catch (err) {
    recordFail('REPORT-008', 'Re-reporting review after prior report dismissed -> 201', err);
  }

  // REPORT-009: Same user reports the same review again AFTER first report was removed -> 404 (review deleted)
  try {
    const rep = await createTestReporter();
    const rev = await createTestReview('Remove test review');
    const r1Res = await request(app)
      .post(`/api/reviews/${rev.id}/report`)
      .set('Authorization', `Bearer ${rep.token}`)
      .send({ reason: 'abusive' });
    assert.strictEqual(r1Res.status, 201);
    const reportId = r1Res.body.data.id;

    const removeRes = await request(app)
      .patch(`/api/admin/moderation/${reportId}/remove`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ reason: 'Abusive content removed' });
    assert.strictEqual(removeRes.status, 200);

    const r2Res = await request(app)
      .post(`/api/reviews/${rev.id}/report`)
      .set('Authorization', `Bearer ${rep.token}`)
      .send({ reason: 'spam' });

    assert.strictEqual(r2Res.status, 404, `Expected 404 for deleted review, got ${r2Res.status}`);
    recordPass('REPORT-009', 'Reporting review after removal -> 404 (review deleted)');
  } catch (err) {
    recordFail('REPORT-009', 'Reporting review after removal -> 404 (review deleted)', err);
  }

  // REPORT-010: Reporting a non-existent reviewId -> 404
  try {
    const rep = await createTestReporter();
    const res = await request(app)
      .post(`/api/reviews/${FAKE_UUID}/report`)
      .set('Authorization', `Bearer ${rep.token}`)
      .send({ reason: 'spam' });

    assert.strictEqual(res.status, 404, `Expected 404, got ${res.status}`);
    recordPass('REPORT-010', 'Reporting non-existent reviewId -> 404');
  } catch (err) {
    recordFail('REPORT-010', 'Reporting non-existent reviewId -> 404', err);
  }

  // REPORT-011: Reporting a review that is already isDeleted = true -> 404
  try {
    const rep = await createTestReporter();
    const deletedRevUser = await prisma.user.create({
      data: { displayName: 'DelUser', email: `del_${Date.now()}@test.com`, passwordHash: 'hash', role: 'user' },
    });
    createdUserIds.push(deletedRevUser.id);
    const deletedRev = await prisma.review.create({
      data: { businessId, userId: deletedRevUser.id, rating: 2, comment: 'Soft deleted', isDeleted: true },
    });

    const res = await request(app)
      .post(`/api/reviews/${deletedRev.id}/report`)
      .set('Authorization', `Bearer ${rep.token}`)
      .send({ reason: 'spam' });

    assert.strictEqual(res.status, 404, `Expected 404, got ${res.status}`);
    recordPass('REPORT-011', 'Reporting review that is already soft-deleted -> 404');
  } catch (err) {
    recordFail('REPORT-011', 'Reporting review that is already soft-deleted -> 404', err);
  }

  // REPORT-012: Unauthenticated request -> 401
  try {
    const res = await request(app)
      .post(`/api/reviews/${reviewId}/report`)
      .send({ reason: 'spam' });

    assert.strictEqual(res.status, 401, `Expected 401, got ${res.status}`);
    recordPass('REPORT-012', 'Unauthenticated request -> 401');
  } catch (err) {
    recordFail('REPORT-012', 'Unauthenticated request -> 401', err);
  }

  // REPORT-013: Any authenticated Registered User role can report
  try {
    const ownerRev = await createTestReview('Review for owner report test');

    const bizOwnerRep = await createTestReporter('business_owner');
    // Business owner reporting a review
    const res = await request(app)
      .post(`/api/reviews/${ownerRev.id}/report`)
      .set('Authorization', `Bearer ${bizOwnerRep.token}`)
      .send({ reason: 'spam' });

    assert.strictEqual(res.status, 201, `Expected 201 for business_owner role, got ${res.status}`);

    const adminRep = await createTestReporter('admin');
    // Admin reporting a review
    const resAdmin = await request(app)
      .post(`/api/reviews/${ownerRev.id}/report`)
      .set('Authorization', `Bearer ${adminRep.token}`)
      .send({ reason: 'other' });

    assert.strictEqual(resAdmin.status, 201, `Expected 201 for admin role, got ${resAdmin.status}`);
    recordPass('REPORT-013', 'Any registered user role can report reviews');
  } catch (err) {
    recordFail('REPORT-013', 'Any registered user role can report reviews', err);
  }

  // REPORT-014: Exceeding the per-user report rate limit -> 429
  try {
    const rateLimitUser = await prisma.user.create({
      data: {
        displayName: 'RateLimit User',
        email: `rl_${Date.now()}@test.com`,
        passwordHash: 'hash',
        role: 'user',
      },
    });
    createdUserIds.push(rateLimitUser.id);
    const rateLimitToken = makeToken(rateLimitUser.id, 'user');

    let hitRateLimit = false;
    for (let i = 0; i < 11; i++) {
      const tempRev = await createTestReview(`RL test ${i}`);
      const res = await request(app)
        .post(`/api/reviews/${tempRev.id}/report`)
        .set('Authorization', `Bearer ${rateLimitToken}`)
        .send({ reason: 'spam' });

      if (res.status === 429) {
        hitRateLimit = true;
        break;
      }
    }
    assert.strictEqual(hitRateLimit, true, 'Rate limiter failed to trigger 429 on excess requests');
    recordPass('REPORT-014', 'Exceeding per-user report rate limit -> 429');
  } catch (err) {
    recordFail('REPORT-014', 'Exceeding per-user report rate limit -> 429', err);
  }

  // REPORT-015: Requests under the limit succeed normally
  try {
    const normalUser = await prisma.user.create({
      data: {
        displayName: 'Normal User',
        email: `normal_${Date.now()}@test.com`,
        passwordHash: 'hash',
        role: 'user',
      },
    });
    createdUserIds.push(normalUser.id);
    const normalToken = makeToken(normalUser.id, 'user');

    const tempRev = await createTestReview('Under limit test');
    const res = await request(app)
      .post(`/api/reviews/${tempRev.id}/report`)
      .set('Authorization', `Bearer ${normalToken}`)
      .send({ reason: 'fake' });

    assert.strictEqual(res.status, 201, `Expected 201, got ${res.status}`);
    recordPass('REPORT-015', 'Requests under rate limit succeed normally');
  } catch (err) {
    recordFail('REPORT-015', 'Requests under rate limit succeed normally', err);
  }

  // REPORT-016: Report created here appears correctly in GET /api/admin/moderation/queue (TN-021)
  try {
    const rep = await createTestReporter();
    const modQueueRev = await createTestReview('Moderation queue integration test');

    const reportRes = await request(app)
      .post(`/api/reviews/${modQueueRev.id}/report`)
      .set('Authorization', `Bearer ${rep.token}`)
      .send({ reason: 'abusive' });

    assert.strictEqual(reportRes.status, 201);
    const createdReportId = reportRes.body.data.id;

    // Fetch TN-021 moderation queue
    const queueRes = await request(app)
      .get('/api/admin/moderation/queue')
      .set('Authorization', `Bearer ${adminToken}`);

    assert.strictEqual(queueRes.status, 200);
    const reportsInQueue = queueRes.body.data.reports;
    const foundReport = reportsInQueue.find((r: any) => r.id === createdReportId);
    assert.ok(foundReport, 'Created report not found in moderation queue!');
    assert.strictEqual(foundReport.status, 'pending');
    assert.strictEqual(foundReport.reviewId, modQueueRev.id);
    assert.strictEqual(foundReport.reason, 'abusive');
    recordPass('REPORT-016', 'Report appears correctly in GET /api/admin/moderation/queue (TN-021)');
  } catch (err) {
    recordFail('REPORT-016', 'Report appears correctly in GET /api/admin/moderation/queue (TN-021)', err);
  }

  // REPORT-017: autoFlagged = false and autoFlagReason = null on created report
  try {
    const rep = await createTestReporter();
    const autoFlagRev = await createTestReview('Auto flag check review');

    const reportRes = await request(app)
      .post(`/api/reviews/${autoFlagRev.id}/report`)
      .set('Authorization', `Bearer ${rep.token}`)
      .send({ reason: 'other' });

    assert.strictEqual(reportRes.status, 201);
    const dbReport = await prisma.reviewReport.findUnique({ where: { id: reportRes.body.data.id } });
    assert.ok(dbReport);
    assert.strictEqual(dbReport.autoFlagged, false);
    assert.strictEqual(dbReport.autoFlagReason, null);
    recordPass('REPORT-017', 'autoFlagged = false and autoFlagReason = null on created report');
  } catch (err) {
    recordFail('REPORT-017', 'autoFlagged = false and autoFlagReason = null on created report', err);
  }

  // REPORT-018: Simulated DB failure -> generic 500, no raw Prisma/DB error exposed
  try {
    const rep = await createTestReporter();
    const originalFindFirst = prisma.reviewReport.findFirst;
    (prisma.reviewReport as any).findFirst = () => {
      throw new Error('P2002: Unique constraint failed on raw database');
    };

    const res = await request(app)
      .post(`/api/reviews/${reviewId}/report`)
      .set('Authorization', `Bearer ${rep.token}`)
      .send({ reason: 'spam' });

    prisma.reviewReport.findFirst = originalFindFirst;

    assert.strictEqual(res.status, 500, `Expected 500, got ${res.status}`);
    assert.strictEqual(res.body.success, false);
    assert.strictEqual(res.body.error, 'Internal server error', `Exposed DB details: ${res.body.error}`);
    recordPass('REPORT-018', 'Simulated DB failure -> generic 500, no raw Prisma error exposed');
  } catch (err) {
    recordFail('REPORT-018', 'Simulated DB failure -> generic 500, no raw Prisma error exposed', err);
  }

  await cleanup();

  console.log('\n======================================================');
  console.log('  TN-013 TEST RESULTS SUMMARY');
  console.log('======================================================');
  const passes = results.filter((r) => r.status === 'PASS').length;
  const fails = results.filter((r) => r.status === 'FAIL').length;
  console.log(`  TOTAL: ${results.length} | PASS: ${passes} | FAIL: ${fails}\n`);

  if (fails > 0) {
    console.error('❌ SOME TN-013 TESTS FAILED!');
    process.exit(1);
  } else {
    console.log('🎉 ALL TN-013 REVIEW REPORTING TESTS PASSED PERFECTLY!');
  }
}



runTests().catch((err) => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
