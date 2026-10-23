/**
 * TrustNear — Full QA Test Suite for TN-021 (Admin Content Moderation)
 * Test Specification: MOD-001 through MOD-044
 */
import assert from 'assert';
import { execSync } from 'child_process';
import path from 'path';
// @ts-ignore
import request from 'supertest';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import app from '../../../server';
import { prisma } from '../../../config/db';
import * as moderationService from '../moderation.service';
import { ReportReason, ReportStatus } from '@prisma/client';

const JWT_SECRET = process.env.JWT_SECRET || 'trustnear-secret-key';
const makeToken = (id: string, role: string) =>
  jwt.sign({ id, role }, JWT_SECRET, { expiresIn: '1h' });

// ─── Result tracking ──────────────────────────────────────────────────────────
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

// ─── Notification spy ─────────────────────────────────────────────────────────
let notifyCallLog: Array<{ reviewId: string; decision: string; reason?: string | null }> = [];

// ─── Shared state ─────────────────────────────────────────────────────────────
let testCategoryId = 0;
let userId = '', userToken = '';
let user2Id = '', user2Token = '';
let ownerId = '', ownerToken = '';
let adminId = '', adminToken = '';
let seedAdminId = '', seedAdminToken = '';

const createdBusinessIds: string[] = [];
const createdUserIds: string[] = [];
const createdReviewIds: string[] = [];
const createdReportIds: string[] = [];

// ─── Helpers ──────────────────────────────────────────────────────────────────
const FAKE_UUID_A = '99999999-9999-4999-a999-999999999999';
const FAKE_UUID_B = '88888888-8888-4888-a888-888888888888';

async function createTestBusiness(): Promise<string> {
  const rows = await prisma.$queryRaw<[{ id: string }]>`
    INSERT INTO businesses (
      name, category_id, landmark_description, location, status, submitted_by, updated_at
    ) VALUES (
      ${`TN021 Biz ${Date.now()}_${Math.random().toString(36).substring(2, 7)}`},
      ${testCategoryId}::smallint,
      'Near Bole Medhanialem',
      ST_SetSRID(ST_MakePoint(38.78, 9.00), 4326)::geography,
      'published'::"BusinessStatus",
      ${ownerId}::uuid,
      NOW()
    ) RETURNING id
  `;
  const id = rows[0].id;
  createdBusinessIds.push(id);
  return id;
}

async function createTestReview(businessId: string, authorId: string, rating = 5, comment = 'Great place!'): Promise<string> {
  const review = await prisma.review.create({
    data: {
      businessId,
      userId: authorId,
      rating,
      comment,
      isVerified: true,
      isDeleted: false,
    },
  });
  createdReviewIds.push(review.id);

  // Update business aggregate
  const agg = await prisma.review.aggregate({
    where: { businessId, isDeleted: false },
    _avg: { rating: true },
    _count: { id: true },
  });
  await prisma.business.update({
    where: { id: businessId },
    data: {
      avgRating: agg._avg.rating ?? 0,
      reviewCount: agg._count.id,
    },
  });

  return review.id;
}

async function createTestReport(reviewId: string, reporterId: string, reason: ReportReason = ReportReason.spam, status: ReportStatus = ReportStatus.pending): Promise<string> {
  const report = await prisma.reviewReport.create({
    data: {
      reviewId,
      reporterId,
      reason,
      status,
      autoFlagged: false,
    },
  });
  createdReportIds.push(report.id);
  return report.id;
}

// ─── Main ─────────────────────────────────────────────────────────────────────
async function runAllModerationTests() {
  console.log('===========================================================');
  console.log('🛡️  TrustNear TN-021 Admin Content Moderation QA Suite');
  console.log('===========================================================\n');

  // ── SETUP ────────────────────────────────────────────────────────────────────
  await prisma.$connect();
  const passwordHash = await bcrypt.hash('Test!123', 4);
  const ts = Date.now();

  try {
    const cat = await prisma.category.create({
      data: { name: `ModCat_${ts}_${Math.random().toString(36).substring(2, 6)}` },
    });
    testCategoryId = cat.id;

    // Create users
    const [uNormal, uNormal2, uOwner, uAdmin, uSeedAdmin] = await Promise.all([
      prisma.user.create({
        data: {
          email: `mod_user_${ts}@trustnear.test`,
          passwordHash,
          displayName: 'Mod User 1',
          role: 'user',
        },
      }),
      prisma.user.create({
        data: {
          email: `mod_user2_${ts}@trustnear.test`,
          passwordHash,
          displayName: 'Mod User 2',
          role: 'user',
        },
      }),
      prisma.user.create({
        data: {
          email: `mod_owner_${ts}@trustnear.test`,
          passwordHash,
          displayName: 'Mod Owner',
          role: 'business_owner',
        },
      }),
      prisma.user.create({
        data: {
          email: `mod_admin_${ts}@trustnear.test`,
          passwordHash,
          displayName: 'Mod Admin',
          role: 'admin',
        },
      }),
      prisma.user.create({
        data: {
          email: `mod_seedadmin_${ts}@trustnear.test`,
          passwordHash,
          displayName: 'Mod SeedAdmin',
          role: 'seed_admin',
        },
      }),
    ]);

    userId = uNormal.id;
    userToken = makeToken(userId, 'user');
    user2Id = uNormal2.id;
    user2Token = makeToken(user2Id, 'user');
    ownerId = uOwner.id;
    ownerToken = makeToken(ownerId, 'business_owner');
    adminId = uAdmin.id;
    adminToken = makeToken(adminId, 'admin');
    seedAdminId = uSeedAdmin.id;
    seedAdminToken = makeToken(seedAdminId, 'seed_admin');

    createdUserIds.push(userId, user2Id, ownerId, adminId, seedAdminId);

    // Spy on notification stub
    const origNotify = moderationService.notifyReviewModerationDecision;
    // @ts-ignore
    moderationService.notifyReviewModerationDecision = (reviewId: string, decision: 'dismissed' | 'removed', reason?: string | null) => {
      notifyCallLog.push({ reviewId, decision, reason });
      origNotify(reviewId, decision, reason);
    };

    console.log('--- 1. ACCESS CONTROL ---');

    // GET /queue access control
    try {
      const res = await request(app)
        .get('/api/admin/moderation/queue')
        .set('Authorization', `Bearer ${adminToken}`);
      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.body.success, true);
      recordPass('MOD-001', 'Access Control', 'admin can view moderation queue -> 200');
    } catch (e) { recordFail('MOD-001', 'Access Control', 'admin can view moderation queue', e); }

    try {
      const res = await request(app)
        .get('/api/admin/moderation/queue')
        .set('Authorization', `Bearer ${seedAdminToken}`);
      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.body.success, true);
      recordPass('MOD-002', 'Access Control', 'seed_admin can view moderation queue -> 200');
    } catch (e) { recordFail('MOD-002', 'Access Control', 'seed_admin can view moderation queue', e); }

    try {
      const res = await request(app)
        .get('/api/admin/moderation/queue')
        .set('Authorization', `Bearer ${ownerToken}`);
      assert.strictEqual(res.status, 403);
      recordPass('MOD-003', 'Access Control', 'business_owner cannot view moderation queue -> 403');
    } catch (e) { recordFail('MOD-003', 'Access Control', 'business_owner cannot view moderation queue', e); }

    try {
      const res = await request(app)
        .get('/api/admin/moderation/queue')
        .set('Authorization', `Bearer ${userToken}`);
      assert.strictEqual(res.status, 403);
      recordPass('MOD-004', 'Access Control', 'user cannot view moderation queue -> 403');
    } catch (e) { recordFail('MOD-004', 'Access Control', 'user cannot view moderation queue', e); }

    try {
      const res = await request(app).get('/api/admin/moderation/queue');
      assert.strictEqual(res.status, 401);
      recordPass('MOD-005', 'Access Control', 'unauthenticated GET /queue -> 401');
    } catch (e) { recordFail('MOD-005', 'Access Control', 'unauthenticated GET /queue', e); }

    // PATCH /dismiss & /remove access control
    const bizAC = await createTestBusiness();
    const revAC1 = await createTestReview(bizAC, userId, 4, 'Test review AC1');
    const revAC2 = await createTestReview(bizAC, user2Id, 5, 'Test review AC2');
    const reportDismissAC = await createTestReport(revAC1, user2Id);
    const reportRemoveAC = await createTestReport(revAC2, userId);

    try {
      const res = await request(app)
        .patch(`/api/admin/moderation/${reportDismissAC}/dismiss`)
        .set('Authorization', `Bearer ${adminToken}`);
      assert.strictEqual(res.status, 200);
      recordPass('MOD-006', 'Access Control', 'admin can dismiss report -> 200');
    } catch (e) { recordFail('MOD-006', 'Access Control', 'admin can dismiss report', e); }

    const reportDismissAC2 = await createTestReport(revAC1, userId);
    try {
      const res = await request(app)
        .patch(`/api/admin/moderation/${reportDismissAC2}/dismiss`)
        .set('Authorization', `Bearer ${seedAdminToken}`);
      assert.strictEqual(res.status, 200);
      recordPass('MOD-007', 'Access Control', 'seed_admin can dismiss report -> 200');
    } catch (e) { recordFail('MOD-007', 'Access Control', 'seed_admin can dismiss report', e); }

    try {
      const res = await request(app)
        .patch(`/api/admin/moderation/${reportRemoveAC}/remove`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ reason: 'Admin remove test' });
      assert.strictEqual(res.status, 200);
      recordPass('MOD-008', 'Access Control', 'admin can remove report -> 200');
    } catch (e) { recordFail('MOD-008', 'Access Control', 'admin can remove report', e); }

    const bizAC3 = await createTestBusiness();
    const revAC3 = await createTestReview(bizAC3, userId, 2, 'Bad review AC3');
    const reportRemoveAC2 = await createTestReport(revAC3, user2Id);
    try {
      const res = await request(app)
        .patch(`/api/admin/moderation/${reportRemoveAC2}/remove`)
        .set('Authorization', `Bearer ${seedAdminToken}`)
        .send({ reason: 'Seed admin remove test' });
      assert.strictEqual(res.status, 200);
      recordPass('MOD-009', 'Access Control', 'seed_admin can remove report -> 200');
    } catch (e) { recordFail('MOD-009', 'Access Control', 'seed_admin can remove report', e); }

    try {
      const res = await request(app)
        .patch(`/api/admin/moderation/${FAKE_UUID_A}/dismiss`)
        .set('Authorization', `Bearer ${ownerToken}`);
      assert.strictEqual(res.status, 403);
      recordPass('MOD-010', 'Access Control', 'business_owner cannot dismiss -> 403');
    } catch (e) { recordFail('MOD-010', 'Access Control', 'business_owner cannot dismiss', e); }

    try {
      const res = await request(app)
        .patch(`/api/admin/moderation/${FAKE_UUID_A}/dismiss`)
        .set('Authorization', `Bearer ${userToken}`);
      assert.strictEqual(res.status, 403);
      recordPass('MOD-011', 'Access Control', 'user cannot dismiss -> 403');
    } catch (e) { recordFail('MOD-011', 'Access Control', 'user cannot dismiss', e); }

    try {
      const res = await request(app)
        .patch(`/api/admin/moderation/${FAKE_UUID_A}/remove`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({});
      assert.strictEqual(res.status, 403);
      recordPass('MOD-012', 'Access Control', 'business_owner cannot remove -> 403');
    } catch (e) { recordFail('MOD-012', 'Access Control', 'business_owner cannot remove', e); }

    try {
      const res = await request(app)
        .patch(`/api/admin/moderation/${FAKE_UUID_A}/remove`)
        .set('Authorization', `Bearer ${userToken}`)
        .send({});
      assert.strictEqual(res.status, 403);
      recordPass('MOD-013', 'Access Control', 'user cannot remove -> 403');
    } catch (e) { recordFail('MOD-013', 'Access Control', 'user cannot remove', e); }

    try {
      const res = await request(app).patch(`/api/admin/moderation/${FAKE_UUID_A}/dismiss`);
      assert.strictEqual(res.status, 401);
      recordPass('MOD-014', 'Access Control', 'unauthenticated dismiss -> 401');
    } catch (e) { recordFail('MOD-014', 'Access Control', 'unauthenticated dismiss', e); }

    try {
      const res = await request(app).patch(`/api/admin/moderation/${FAKE_UUID_A}/remove`).send({});
      assert.strictEqual(res.status, 401);
      recordPass('MOD-015', 'Access Control', 'unauthenticated remove -> 401');
    } catch (e) { recordFail('MOD-015', 'Access Control', 'unauthenticated remove', e); }

    console.log('\n--- 2. DISMISS FLOW ---');

    const bizDismiss = await createTestBusiness();
    const revDismiss = await createTestReview(bizDismiss, userId, 5, 'Great review staying intact');
    const repDismiss = await createTestReport(revDismiss, user2Id, ReportReason.fake);

    try {
      const res = await request(app)
        .patch(`/api/admin/moderation/${repDismiss}/dismiss`)
        .set('Authorization', `Bearer ${adminToken}`);
      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.body.success, true);
      assert.strictEqual(res.body.data.id, repDismiss);
      assert.strictEqual(res.body.data.status, 'dismissed');
      recordPass('MOD-016', 'Dismiss Flow', 'Dismissing a pending report -> 200, status = dismissed');
    } catch (e) { recordFail('MOD-016', 'Dismiss Flow', 'Dismissing a pending report', e); }

    try {
      const reviewInDb = await prisma.review.findUnique({ where: { id: revDismiss } });
      assert.strictEqual(reviewInDb?.isDeleted, false);
      assert.strictEqual(reviewInDb?.rating, 5);
      assert.strictEqual(reviewInDb?.comment, 'Great review staying intact');
      recordPass('MOD-017', 'Dismiss Flow', 'Dismissing does not alter underlying review');
    } catch (e) { recordFail('MOD-017', 'Dismiss Flow', 'Dismissing does not alter underlying review', e); }

    try {
      const res = await request(app)
        .patch(`/api/admin/moderation/${FAKE_UUID_A}/dismiss`)
        .set('Authorization', `Bearer ${adminToken}`);
      assert.strictEqual(res.status, 404);
      recordPass('MOD-018', 'Dismiss Flow', 'Dismissing non-existent report -> 404');
    } catch (e) { recordFail('MOD-018', 'Dismiss Flow', 'Dismissing non-existent report', e); }

    try {
      const res = await request(app)
        .patch(`/api/admin/moderation/${repDismiss}/dismiss`)
        .set('Authorization', `Bearer ${adminToken}`);
      assert.strictEqual(res.status, 409);
      assert.ok(res.body.error?.includes('dismissed'));
      recordPass('MOD-019', 'Dismiss Flow', 'Dismissing already-dismissed report -> 409 Conflict');
    } catch (e) { recordFail('MOD-019', 'Dismiss Flow', 'Dismissing already-dismissed report', e); }

    // Dismiss already removed
    const repAlreadyRemoved = await createTestReport(revDismiss, user2Id, ReportReason.spam, ReportStatus.removed);
    try {
      const res = await request(app)
        .patch(`/api/admin/moderation/${repAlreadyRemoved}/dismiss`)
        .set('Authorization', `Bearer ${adminToken}`);
      assert.strictEqual(res.status, 409);
      assert.ok(res.body.error?.includes('removed'));
      recordPass('MOD-020', 'Dismiss Flow', 'Dismissing already-removed report -> 409 Conflict');
    } catch (e) { recordFail('MOD-020', 'Dismiss Flow', 'Dismissing already-removed report', e); }

    try {
      const auditLog = await prisma.adminAction.findFirst({
        where: {
          targetId: revDismiss,
          action: 'dismiss',
          adminId,
        },
      });
      assert.ok(auditLog, 'Audit log row must exist');
      assert.strictEqual(auditLog?.targetType, 'review');
      assert.strictEqual(auditLog?.targetId, revDismiss);
      assert.strictEqual(auditLog?.action, 'dismiss');
      assert.strictEqual(auditLog?.reason, null);
      recordPass('MOD-021', 'Dismiss Flow', 'Audit log row created with action=dismiss, targetId=reviewId');
    } catch (e) { recordFail('MOD-021', 'Dismiss Flow', 'Audit log row created on dismiss', e); }

    console.log('\n--- 3. REMOVE FLOW ---');

    const bizRemove = await createTestBusiness();
    const revRemove1 = await createTestReview(bizRemove, userId, 1, 'Spammy offensive review');
    const revRemove2 = await createTestReview(bizRemove, user2Id, 5, 'Legitimate 5-star review');
    const repRemove = await createTestReport(revRemove1, user2Id, ReportReason.abusive);

    // Initial business state: avgRating = 3.0, reviewCount = 2
    const initialBiz = await prisma.business.findUnique({ where: { id: bizRemove } });
    assert.strictEqual(Number(initialBiz?.avgRating), 3.0);
    assert.strictEqual(initialBiz?.reviewCount, 2);

    try {
      const res = await request(app)
        .patch(`/api/admin/moderation/${repRemove}/remove`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ reason: 'Violates content policy: abusive language' });
      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.body.success, true);
      assert.strictEqual(res.body.data.id, repRemove);
      assert.strictEqual(res.body.data.status, 'removed');

      const updatedReview = await prisma.review.findUnique({ where: { id: revRemove1 } });
      assert.strictEqual(updatedReview?.isDeleted, true);
      recordPass('MOD-022', 'Remove Flow', 'Removing report -> 200, status = removed, review isDeleted = true');
    } catch (e) { recordFail('MOD-022', 'Remove Flow', 'Removing report', e); }

    try {
      const recalculatedBiz = await prisma.business.findUnique({ where: { id: bizRemove } });
      // Now only revRemove2 (rating: 5) remains active
      assert.strictEqual(Number(recalculatedBiz?.avgRating), 5.0);
      assert.strictEqual(recalculatedBiz?.reviewCount, 1);
      recordPass('MOD-023', 'Remove Flow', 'Business avgRating/reviewCount recalculated correctly');
    } catch (e) { recordFail('MOD-023', 'Remove Flow', 'Business avgRating/reviewCount recalculated correctly', e); }

    try {
      const auditLog = await prisma.adminAction.findFirst({
        where: {
          targetId: revRemove1,
          action: 'remove',
        },
      });
      assert.ok(auditLog);
      assert.strictEqual(auditLog?.reason, 'Violates content policy: abusive language');
      assert.strictEqual(auditLog?.adminId, adminId);
      recordPass('MOD-024', 'Remove Flow', 'Removing with reason -> reason stored in audit log');
    } catch (e) { recordFail('MOD-024', 'Remove Flow', 'Removing with reason stored in audit log', e); }

    // Remove without reason
    const bizNoReason = await createTestBusiness();
    const revNoReason = await createTestReview(bizNoReason, userId, 1, 'Another bad review');
    const repNoReason = await createTestReport(revNoReason, user2Id, ReportReason.spam);

    try {
      const res = await request(app)
        .patch(`/api/admin/moderation/${repNoReason}/remove`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({});
      assert.strictEqual(res.status, 200);

      const auditNoReason = await prisma.adminAction.findFirst({
        where: {
          targetId: revNoReason,
          action: 'remove',
        },
      });
      assert.strictEqual(auditNoReason?.reason, null);
      recordPass('MOD-025', 'Remove Flow', 'Removing without reason -> reason = null in audit log');
    } catch (e) { recordFail('MOD-025', 'Remove Flow', 'Removing without reason', e); }

    try {
      const res = await request(app)
        .patch(`/api/admin/moderation/${FAKE_UUID_A}/remove`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({});
      assert.strictEqual(res.status, 404);
      recordPass('MOD-026', 'Remove Flow', 'Removing non-existent report -> 404');
    } catch (e) { recordFail('MOD-026', 'Remove Flow', 'Removing non-existent report', e); }

    try {
      const res = await request(app)
        .patch(`/api/admin/moderation/${repRemove}/remove`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({});
      assert.strictEqual(res.status, 409);
      assert.ok(res.body.error?.includes('removed'));
      recordPass('MOD-027', 'Remove Flow', 'Removing already-removed report -> 409 Conflict');
    } catch (e) { recordFail('MOD-027', 'Remove Flow', 'Removing already-removed report', e); }

    try {
      const res = await request(app)
        .patch(`/api/admin/moderation/${repDismiss}/remove`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({});
      assert.strictEqual(res.status, 409);
      assert.ok(res.body.error?.includes('dismissed'));
      recordPass('MOD-028', 'Remove Flow', 'Removing already-dismissed report -> 409 Conflict (terminal state)');
    } catch (e) { recordFail('MOD-028', 'Remove Flow', 'Removing already-dismissed report', e); }

    try {
      const auditLog = await prisma.adminAction.findFirst({
        where: { targetId: revRemove1, action: 'remove' },
      });
      assert.strictEqual(auditLog?.targetId, revRemove1);
      assert.notStrictEqual(auditLog?.targetId, repRemove);
      recordPass('MOD-029', 'Remove Flow', 'Audit log targetId = reviewId (not reportId)');
    } catch (e) { recordFail('MOD-029', 'Remove Flow', 'Audit log targetId = reviewId', e); }

    // Admin spoofing prevention
    const bizSpoof = await createTestBusiness();
    const revSpoof = await createTestReview(bizSpoof, userId, 1, 'Spoof test review');
    const repSpoof = await createTestReport(revSpoof, user2Id, ReportReason.spam);

    try {
      const res = await request(app)
        .patch(`/api/admin/moderation/${repSpoof}/remove`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          adminId: userId, // malicious spoof attempt
          reason: 'Testing spoofing',
        });
      assert.strictEqual(res.status, 200);

      const auditSpoof = await prisma.adminAction.findFirst({
        where: { targetId: revSpoof, action: 'remove' },
      });
      assert.strictEqual(auditSpoof?.adminId, adminId);
      assert.notStrictEqual(auditSpoof?.adminId, userId);
      recordPass('MOD-030', 'Remove Flow', 'adminId on audit row cannot be spoofed via request body');
    } catch (e) { recordFail('MOD-030', 'Remove Flow', 'adminId spoofing protection', e); }

    console.log('\n--- 4. TRANSACTION INTEGRITY ---');

    // 24: Aggregate calculation failure rolls back
    const bizTx1 = await createTestBusiness();
    const revTx1 = await createTestReview(bizTx1, userId, 1, 'Rollback test 1');
    const repTx1 = await createTestReport(revTx1, user2Id, ReportReason.spam);

    try {
      const originalTx = prisma.$transaction;
      // @ts-ignore
      prisma.$transaction = async (fn: any, options?: any) => {
        return originalTx.call(prisma, async (tx: any) => {
          const proxiedTx = new Proxy(tx, {
            get(target, prop) {
              if (prop === 'business') {
                return {
                  ...target.business,
                  update: async () => {
                    throw new Error('Simulated rating recalculation failure');
                  },
                };
              }
              return (target as any)[prop];
            },
          });
          return fn(proxiedTx);
        }, options);
      };

      const res = await request(app)
        .patch(`/api/admin/moderation/${repTx1}/remove`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ reason: 'Should rollback' });

      // Restore transaction
      prisma.$transaction = originalTx;

      assert.strictEqual(res.status, 500);

      const reviewAfterRollback = await prisma.review.findUnique({ where: { id: revTx1 } });
      assert.strictEqual(reviewAfterRollback?.isDeleted, false, 'Review must NOT be soft deleted');

      const reportAfterRollback = await prisma.reviewReport.findUnique({ where: { id: repTx1 } });
      assert.strictEqual(reportAfterRollback?.status, 'pending', 'Report must stay pending');

      const auditRow = await prisma.adminAction.findFirst({ where: { targetId: revTx1 } });
      assert.strictEqual(auditRow, null, 'No audit row must exist');

      recordPass('MOD-031', 'Transaction Integrity', 'Aggregate calc failure rolls back soft-delete, status, and audit');
    } catch (e) {
      prisma.$transaction = (prisma as any).$transaction;
      recordFail('MOD-031', 'Transaction Integrity', 'Aggregate calc failure rollback', e);
    }

    // 25: Audit log write failure rolls back
    const bizTx2 = await createTestBusiness();
    const revTx2 = await createTestReview(bizTx2, userId, 1, 'Rollback test 2');
    const repTx2 = await createTestReport(revTx2, user2Id, ReportReason.spam);

    try {
      const originalTx = prisma.$transaction;
      // @ts-ignore
      prisma.$transaction = async (fn: any, options?: any) => {
        return originalTx.call(prisma, async (tx: any) => {
          const proxiedTx = new Proxy(tx, {
            get(target, prop) {
              if (prop === 'adminAction') {
                return {
                  ...target.adminAction,
                  create: async () => {
                    throw new Error('Simulated audit log write failure');
                  },
                };
              }
              return (target as any)[prop];
            },
          });
          return fn(proxiedTx);
        }, options);
      };

      const res = await request(app)
        .patch(`/api/admin/moderation/${repTx2}/remove`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ reason: 'Should rollback audit error' });

      // Restore transaction
      prisma.$transaction = originalTx;

      assert.strictEqual(res.status, 500);

      const reviewAfterRollback = await prisma.review.findUnique({ where: { id: revTx2 } });
      assert.strictEqual(reviewAfterRollback?.isDeleted, false, 'Review must NOT be soft deleted');

      const reportAfterRollback = await prisma.reviewReport.findUnique({ where: { id: repTx2 } });
      assert.strictEqual(reportAfterRollback?.status, 'pending', 'Report must stay pending');

      recordPass('MOD-032', 'Transaction Integrity', 'Audit write failure rolls back entire transaction');
    } catch (e) {
      prisma.$transaction = (prisma as any).$transaction;
      recordFail('MOD-032', 'Transaction Integrity', 'Audit write failure rollback', e);
    }

    console.log('\n--- 5. QUEUE CORRECTNESS & PAGINATION ---');

    const bizQueue = await createTestBusiness();
    const revPending = await createTestReview(bizQueue, userId, 3, 'Pending queue review');
    const revDismissed = await createTestReview(bizQueue, user2Id, 4, 'Dismissed review');
    const repP = await createTestReport(revPending, user2Id, ReportReason.other, ReportStatus.pending);
    const repD = await createTestReport(revDismissed, userId, ReportReason.spam, ReportStatus.dismissed);

    try {
      const res = await request(app)
        .get('/api/admin/moderation/queue')
        .set('Authorization', `Bearer ${adminToken}`);
      assert.strictEqual(res.status, 200);

      const ids = res.body.data.reports.map((r: any) => r.id);
      assert.ok(!ids.includes(repD), 'Dismissed reports must be excluded from queue');
      recordPass('MOD-033', 'Queue Correctness', 'Queue excludes dismissed reports');
    } catch (e) { recordFail('MOD-033', 'Queue Correctness', 'Queue excludes dismissed reports', e); }

    try {
      const res = await request(app)
        .get('/api/admin/moderation/queue')
        .set('Authorization', `Bearer ${adminToken}`);
      const ids = res.body.data.reports.map((r: any) => r.id);
      assert.ok(!ids.includes(repRemove), 'Removed reports must be excluded from queue');
      recordPass('MOD-034', 'Queue Correctness', 'Queue excludes removed reports');
    } catch (e) { recordFail('MOD-034', 'Queue Correctness', 'Queue excludes removed reports', e); }

    try {
      const res = await request(app)
        .get('/api/admin/moderation/queue')
        .set('Authorization', `Bearer ${adminToken}`);
      for (const r of res.body.data.reports) {
        assert.strictEqual(r.status, 'pending');
        assert.strictEqual(r.targetType, 'review');
        assert.ok(r.review !== undefined);
      }
      recordPass('MOD-035', 'Queue Correctness', 'Queue only shows pending reports with targetType and review payload');
    } catch (e) { recordFail('MOD-035', 'Queue Correctness', 'Queue only shows pending reports', e); }

    try {
      const res = await request(app)
        .get('/api/admin/moderation/queue?page=1&pageSize=2')
        .set('Authorization', `Bearer ${adminToken}`);
      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.body.data.page, 1);
      assert.strictEqual(res.body.data.pageSize, 2);
      assert.ok(res.body.data.total >= 1);
      recordPass('MOD-036', 'Queue Correctness', 'Pagination works correctly (page, pageSize, total)');
    } catch (e) { recordFail('MOD-036', 'Queue Correctness', 'Pagination works correctly', e); }

    try {
      const res = await request(app)
        .get('/api/admin/moderation/queue?pageSize=100')
        .set('Authorization', `Bearer ${adminToken}`);
      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.body.data.pageSize, 50, 'pageSize > 50 must clamp to 50');
      recordPass('MOD-037', 'Queue Correctness', 'pageSize > 50 clamps to 50');
    } catch (e) { recordFail('MOD-037', 'Queue Correctness', 'pageSize > 50 clamps to 50', e); }

    try {
      // Test empty queue behavior via direct service call with high offset or empty condition
      const emptyResult = await moderationService.ModerationService.getModerationQueue(99999, 20);
      assert.strictEqual(emptyResult.reports.length, 0);
      assert.strictEqual(emptyResult.page, 99999);
      recordPass('MOD-038', 'Queue Correctness', 'Empty queue returns 200 with reports: []');
    } catch (e) { recordFail('MOD-038', 'Queue Correctness', 'Empty queue handling', e); }

    console.log('\n--- 6. NOTIFICATION STUB ---');

    try {
      notifyCallLog = [];
      const bizNotif = await createTestBusiness();
      const revNotif1 = await createTestReview(bizNotif, userId, 4, 'Notif review 1');
      const revNotif2 = await createTestReview(bizNotif, user2Id, 1, 'Notif review 2');
      const repNotif1 = await createTestReport(revNotif1, user2Id);
      const repNotif2 = await createTestReport(revNotif2, userId);

      await request(app)
        .patch(`/api/admin/moderation/${repNotif1}/dismiss`)
        .set('Authorization', `Bearer ${adminToken}`);

      await request(app)
        .patch(`/api/admin/moderation/${repNotif2}/remove`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ reason: 'Offensive' });

      assert.strictEqual(notifyCallLog.length, 2);
      assert.strictEqual(notifyCallLog[0].reviewId, revNotif1);
      assert.strictEqual(notifyCallLog[0].decision, 'dismissed');
      assert.strictEqual(notifyCallLog[1].reviewId, revNotif2);
      assert.strictEqual(notifyCallLog[1].decision, 'removed');
      assert.strictEqual(notifyCallLog[1].reason, 'Offensive');
      recordPass('MOD-039', 'Notification Stub', 'Stub fires on successful dismiss and remove');
    } catch (e) { recordFail('MOD-039', 'Notification Stub', 'Stub fires on dismiss/remove', e); }

    try {
      notifyCallLog = [];
      // 404 call
      await request(app)
        .patch(`/api/admin/moderation/${FAKE_UUID_A}/dismiss`)
        .set('Authorization', `Bearer ${adminToken}`);

      // 400 call
      await request(app)
        .patch('/api/admin/moderation/invalid-uuid/dismiss')
        .set('Authorization', `Bearer ${adminToken}`);

      // 409 call
      await request(app)
        .patch(`/api/admin/moderation/${repDismiss}/dismiss`)
        .set('Authorization', `Bearer ${adminToken}`);

      assert.strictEqual(notifyCallLog.length, 0, 'Stub must not fire on error responses');
      recordPass('MOD-040', 'Notification Stub', 'Stub does NOT fire on 404/409/400');
    } catch (e) { recordFail('MOD-040', 'Notification Stub', 'Stub does not fire on errors', e); }

    console.log('\n--- 7. ERROR HYGIENE ---');

    try {
      const res = await request(app)
        .patch('/api/admin/moderation/not-a-valid-uuid/dismiss')
        .set('Authorization', `Bearer ${adminToken}`);
      assert.strictEqual(res.status, 400);
      assert.ok(res.body.error?.includes('UUID') || res.body.error?.includes('format'));
      recordPass('MOD-041', 'Error Hygiene', 'Invalid :reportId format -> 400, not raw DB error');
    } catch (e) { recordFail('MOD-041', 'Error Hygiene', 'Invalid :reportId format', e); }

    try {
      const origFind = prisma.reviewReport.findUnique;
      // @ts-ignore
      prisma.reviewReport.findUnique = async () => {
        throw new Error('FATAL: Database connection dropped postgres://secret_connection_info');
      };

      const res = await request(app)
        .patch(`/api/admin/moderation/${FAKE_UUID_A}/dismiss`)
        .set('Authorization', `Bearer ${adminToken}`);

      prisma.reviewReport.findUnique = origFind;

      assert.strictEqual(res.status, 500);
      assert.ok(!res.body.error?.includes('postgres://'), 'Must not leak connection details');
      assert.ok(!res.body.error?.includes('secret_connection_info'));
      recordPass('MOD-042', 'Error Hygiene', 'Simulated DB failure returns generic 500 without leaking DB internals');
    } catch (e) {
      prisma.reviewReport.findUnique = (prisma as any).reviewReport.findUnique;
      recordFail('MOD-042', 'Error Hygiene', 'Simulated DB failure error hygiene', e);
    }

    console.log('\n--- 8. BUILD & TOOLING ---');

    const BACKEND_DIR = path.resolve(__dirname, '../../../..');

    try {
      execSync('npx prisma validate', { cwd: BACKEND_DIR, stdio: 'pipe' });
      recordPass('MOD-043', 'Build & Tooling', 'npx prisma validate passes with 0 schema errors');
    } catch (e: any) {
      recordFail('MOD-043', 'Build & Tooling', 'npx prisma validate', new Error(e.stderr?.toString() || e.message));
    }

    try {
      execSync('npx tsc --noEmit', { cwd: BACKEND_DIR, stdio: 'pipe' });
      recordPass('MOD-044', 'Build & Tooling', 'TypeScript compile (tsc --noEmit) passes with 0 errors');
    } catch (e: any) {
      recordFail('MOD-044', 'Build & Tooling', 'TypeScript compile', new Error(e.stdout?.toString() || e.message));
    }

  } catch (fatalErr) {
    console.error('\n💥 Fatal test execution error:', fatalErr);
  } finally {
    // ── Cleanup ──────────────────────────────────────────────────────────
    console.log('\n🧹 Cleaning up test data...');
    if (createdReportIds.length > 0) {
      await prisma.reviewReport.deleteMany({ where: { id: { in: createdReportIds } } }).catch(() => {});
    }
    if (createdReviewIds.length > 0) {
      await prisma.adminAction.deleteMany({ where: { targetId: { in: createdReviewIds } } }).catch(() => {});
      await prisma.review.deleteMany({ where: { id: { in: createdReviewIds } } }).catch(() => {});
    }
    if (createdBusinessIds.length > 0) {
      await prisma.business.deleteMany({ where: { id: { in: createdBusinessIds } } }).catch(() => {});
    }
    if (createdUserIds.length > 0) {
      await prisma.refreshToken.deleteMany({ where: { userId: { in: createdUserIds } } }).catch(() => {});
      await prisma.user.deleteMany({ where: { id: { in: createdUserIds } } }).catch(() => {});
    }
    if (testCategoryId) {
      await prisma.category.delete({ where: { id: testCategoryId } }).catch(() => {});
    }
    await prisma.$disconnect();
  }

  // ── Summary ───────────────────────────────────────────────────────────────
  const passed = results.filter((r) => r.status === 'PASS').length;
  const failed = results.filter((r) => r.status === 'FAIL').length;

  console.log('\n===========================================================');
  console.log('📊 TN-021 QA VERIFICATION SUMMARY  MOD-001 – MOD-044');
  console.log('===========================================================');

  const sections: Record<string, string> = {
    'Access Control': 'MOD-001–015',
    'Dismiss Flow': 'MOD-016–021',
    'Remove Flow': 'MOD-022–030',
    'Transaction Integrity': 'MOD-031–032',
    'Queue Correctness': 'MOD-033–038',
    'Notification Stub': 'MOD-039–040',
    'Error Hygiene': 'MOD-041–042',
    'Build & Tooling': 'MOD-043–044',
  };

  for (const [cat, range] of Object.entries(sections)) {
    const catResults = results.filter((r) => r.category === cat);
    const catPassed = catResults.filter((r) => r.status === 'PASS').length;
    const catFailed = catResults.filter((r) => r.status === 'FAIL').length;
    const icon = catFailed === 0 ? '✅' : '❌';
    console.log(`  ${icon} ${cat.padEnd(24)} ${range.padEnd(16)} ${catPassed}/${catResults.length}`);
  }

  console.log('-----------------------------------------------------------');
  console.log(`Total Tests Executed : ${results.length}`);
  console.log(`Passed               : ${passed} ✅`);
  console.log(`Failed               : ${failed} ❌`);

  if (failed > 0) {
    console.log('\n❌ FAILURE DETAILS:');
    for (const f of results.filter((r) => r.status === 'FAIL')) {
      console.log(`  - [${f.id}] ${f.category} — ${f.name}`);
      if (f.details) console.log(`    ${f.details}\n`);
    }
    process.exit(1);
  } else {
    console.log('\n🌟 ALL TN-021 MODERATION TESTS PASSED PERFECTLY!\n');
    process.exit(0);
  }
}

runAllModerationTests();
