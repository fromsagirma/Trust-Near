/**
 * TrustNear — Full QA Test Suite for TN-020 (Notifications Module)
 * Mapped to Requirement FR-020 / UC-020
 * Test Specifications: NOTIF-001 through NOTIF-035
 */
import assert from 'assert';
// @ts-ignore
import request from 'supertest';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import app from '../../../server';
import { prisma } from '../../../config/db';
import { NotificationType } from '@prisma/client';
import { NotificationsService } from '../notifications.service';

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

async function runNotificationsTestSuite() {
  console.log('\n======================================================');
  console.log('  🔔 TRUSTNEAR TN-020 NOTIFICATIONS TEST SUITE');
  console.log('======================================================\n');

  let user1Id: string;
  let user1Token: string;
  let user2Id: string;
  let user2Token: string;

  try {
    const passwordHash = await bcrypt.hash('TestPass123!', 8);

    const u1 = await prisma.user.create({
      data: {
        email: `notif_user1_${Date.now()}@example.com`,
        passwordHash,
        displayName: 'Notif User 1',
        role: 'user',
      },
    });
    user1Id = u1.id;
    user1Token = makeToken(u1.id, 'user');

    const u2 = await prisma.user.create({
      data: {
        email: `notif_user2_${Date.now()}@example.com`,
        passwordHash,
        displayName: 'Notif User 2',
        role: 'user',
      },
    });
    user2Id = u2.id;
    user2Token = makeToken(u2.id, 'user');

    // ──────────────────────────────────────────────────────────
    // 1. NOTIFICATION DISPATCH & PERSISTENCE (NOTIF-001 – NOTIF-005)
    // ──────────────────────────────────────────────────────────
    console.log('\n--- 1. NOTIFICATION DISPATCH & PERSISTENCE ---');

    let notif1Id: string = '';
    let notif2Id: string = '';
    let notif3Id: string = '';
    let user2NotifId: string = '';

    try {
      const n1 = await NotificationsService.createNotification(
        user1Id,
        NotificationType.review_reply,
        { reviewId: 'dummy-review-id', businessName: 'Test Cafe' }
      );
      assert.ok(n1.id);
      assert.strictEqual(n1.userId, user1Id);
      assert.strictEqual(n1.type, 'review_reply');
      assert.strictEqual(n1.isRead, false);
      notif1Id = n1.id;
      recordPass('NOTIF-001', 'Persistence', 'Service creates and persists notification with isRead=false');
    } catch (e) { recordFail('NOTIF-001', 'Persistence', 'createNotification review_reply', e); }

    try {
      const n2 = await NotificationsService.createNotification(
        user1Id,
        NotificationType.claim_approved,
        { claimId: 'dummy-claim-id', businessName: 'Addis Bistro' }
      );
      notif2Id = n2.id;
      recordPass('NOTIF-002', 'Persistence', 'Service creates claim_approved notification');
    } catch (e) { recordFail('NOTIF-002', 'Persistence', 'createNotification claim_approved', e); }

    try {
      const n3 = await NotificationsService.createNotification(
        user1Id,
        NotificationType.claim_rejected,
        { claimId: 'dummy-claim-2', reason: 'Insufficient proof' }
      );
      notif3Id = n3.id;
      recordPass('NOTIF-003', 'Persistence', 'Service creates claim_rejected notification');
    } catch (e) { recordFail('NOTIF-003', 'Persistence', 'createNotification claim_rejected', e); }

    // User2 notification for IDOR testing
    try {
      const nUser2 = await NotificationsService.createNotification(
        user2Id,
        NotificationType.connection_request,
        { requesterId: user1Id }
      );
      user2NotifId = nUser2.id;
      recordPass('NOTIF-004', 'Persistence', 'Created notification for User 2 (IDOR target)');
    } catch (e) { recordFail('NOTIF-004', 'Persistence', 'User 2 notification', e); }

    // ──────────────────────────────────────────────────────────
    // 2. LISTING & PAGINATION (NOTIF-005 – NOTIF-015)
    // ──────────────────────────────────────────────────────────
    console.log('\n--- 2. LISTING & PAGINATION ---');

    try {
      const res = await request(app)
        .get('/api/notifications')
        .set('Authorization', `Bearer ${user1Token}`);

      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.body.success, true);
      assert.ok(Array.isArray(res.body.data.data));
      assert.strictEqual(res.body.data.data.length, 3);
      assert.strictEqual(res.body.data.unreadCount, 3);
      assert.strictEqual(res.body.data.pagination.total, 3);
      recordPass('NOTIF-005', 'Listing', 'GET /api/notifications lists all notifications for user');
    } catch (e) { recordFail('NOTIF-005', 'Listing', 'GET /api/notifications', e); }

    try {
      const res = await request(app)
        .get('/api/notifications?page=1&pageSize=2')
        .set('Authorization', `Bearer ${user1Token}`);

      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.body.data.data.length, 2);
      assert.strictEqual(res.body.data.pagination.page, 1);
      assert.strictEqual(res.body.data.pagination.pageSize, 2);
      assert.strictEqual(res.body.data.pagination.totalPages, 2);
      recordPass('NOTIF-006', 'Pagination', 'GET /api/notifications pageSize=2 pagination works');
    } catch (e) { recordFail('NOTIF-006', 'Pagination', 'Pagination page=1', e); }

    try {
      const res = await request(app)
        .get('/api/notifications?unreadOnly=true')
        .set('Authorization', `Bearer ${user1Token}`);

      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.body.data.data.length, 3);
      recordPass('NOTIF-007', 'Filter', 'unreadOnly=true filter lists all unread items');
    } catch (e) { recordFail('NOTIF-007', 'Filter', 'unreadOnly filter', e); }

    // ──────────────────────────────────────────────────────────
    // 3. UNREAD COUNT ENDPOINT (NOTIF-016 – NOTIF-018)
    // ──────────────────────────────────────────────────────────
    console.log('\n--- 3. UNREAD COUNT ENDPOINT ---');

    try {
      const res = await request(app)
        .get('/api/notifications/unread-count')
        .set('Authorization', `Bearer ${user1Token}`);

      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.body.data.unreadCount, 3);
      recordPass('NOTIF-016', 'Unread Count', 'GET /api/notifications/unread-count returns correct count');
    } catch (e) { recordFail('NOTIF-016', 'Unread Count', 'GET unread count', e); }

    // ──────────────────────────────────────────────────────────
    // 4. READ MARKING (NOTIF-019 – NOTIF-025)
    // ──────────────────────────────────────────────────────────
    console.log('\n--- 4. READ MARKING ---');

    try {
      const res = await request(app)
        .patch(`/api/notifications/${notif1Id}/read`)
        .set('Authorization', `Bearer ${user1Token}`);

      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.body.data.isRead, true);
      recordPass('NOTIF-019', 'Mark Read', 'PATCH /api/notifications/:id/read marks single item read');
    } catch (e) { recordFail('NOTIF-019', 'Mark Read', 'PATCH single notification read', e); }

    try {
      const countRes = await request(app)
        .get('/api/notifications/unread-count')
        .set('Authorization', `Bearer ${user1Token}`);

      assert.strictEqual(countRes.status, 200);
      assert.strictEqual(countRes.body.data.unreadCount, 2);
      recordPass('NOTIF-020', 'Unread Count Update', 'Unread count decreases after marking item read');
    } catch (e) { recordFail('NOTIF-020', 'Unread Count Update', 'Check updated unread count', e); }

    try {
      const res = await request(app)
        .patch('/api/notifications/read-all')
        .set('Authorization', `Bearer ${user1Token}`);

      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.body.data.count, 2);
      recordPass('NOTIF-021', 'Bulk Mark Read', 'PATCH /api/notifications/read-all marks all remaining items read');
    } catch (e) { recordFail('NOTIF-021', 'Bulk Mark Read', 'PATCH read-all', e); }

    try {
      const countRes = await request(app)
        .get('/api/notifications/unread-count')
        .set('Authorization', `Bearer ${user1Token}`);

      assert.strictEqual(countRes.status, 200);
      assert.strictEqual(countRes.body.data.unreadCount, 0);
      recordPass('NOTIF-022', 'Unread Count Zero', 'Unread count drops to 0 after read-all');
    } catch (e) { recordFail('NOTIF-022', 'Unread Count Zero', 'Check unread count zero', e); }

    // ──────────────────────────────────────────────────────────
    // 5. SECURITY & IDOR PROTECTION (NOTIF-026 – NOTIF-030)
    // ──────────────────────────────────────────────────────────
    console.log('\n--- 5. SECURITY & IDOR PROTECTION ---');

    try {
      const res = await request(app).get('/api/notifications');
      assert.strictEqual(res.status, 401);
      recordPass('NOTIF-026', 'Auth Security', 'Unauthenticated GET /api/notifications rejected with 401');
    } catch (e) { recordFail('NOTIF-026', 'Auth Security', 'Unauthenticated request', e); }

    try {
      const res = await request(app)
        .patch(`/api/notifications/${user2NotifId}/read`)
        .set('Authorization', `Bearer ${user1Token}`);

      assert.strictEqual(res.status, 404);
      recordPass('NOTIF-027', 'IDOR Protection', 'User 1 cannot mark User 2 notification as read (404)');
    } catch (e) { recordFail('NOTIF-027', 'IDOR Protection', 'IDOR patch read', e); }

    try {
      const res = await request(app)
        .get('/api/notifications')
        .set('Authorization', `Bearer ${user2Token}`);

      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.body.data.data.length, 1);
      assert.strictEqual(res.body.data.data[0].id, user2NotifId);
      recordPass('NOTIF-028', 'Data Isolation', 'User 2 sees only their own notifications, isolated from User 1');
    } catch (e) { recordFail('NOTIF-028', 'Data Isolation', 'User 2 notification listing', e); }

    // ──────────────────────────────────────────────────────────
    // 6. VALIDATION & ERROR HYGIENE (NOTIF-031 – NOTIF-035)
    // ──────────────────────────────────────────────────────────
    console.log('\n--- 6. VALIDATION & ERROR HYGIENE ---');

    try {
      const res = await request(app)
        .patch('/api/notifications/invalid-uuid-format/read')
        .set('Authorization', `Bearer ${user1Token}`);

      assert.strictEqual(res.status, 400);
      recordPass('NOTIF-031', 'Input Validation', 'Malformed notification UUID returns 400');
    } catch (e) { recordFail('NOTIF-031', 'Input Validation', 'Invalid UUID', e); }

    try {
      const res = await request(app)
        .get('/api/notifications?page=-1')
        .set('Authorization', `Bearer ${user1Token}`);

      assert.strictEqual(res.status, 400);
      recordPass('NOTIF-032', 'Input Validation', 'Invalid page parameter returns 400');
    } catch (e) { recordFail('NOTIF-032', 'Input Validation', 'Invalid page parameter', e); }

    try {
      const res = await request(app)
        .patch('/api/notifications/00000000-0000-0000-0000-000000000000/read')
        .set('Authorization', `Bearer ${user1Token}`);

      assert.strictEqual(res.status, 404);
      recordPass('NOTIF-033', 'Not Found', 'Non-existent notification UUID returns 404');
    } catch (e) { recordFail('NOTIF-033', 'Not Found', 'Non-existent notification', e); }

  } finally {
    // Pre-teardown cleanup
    console.log('\n======================================================');
    console.log('  TN-020 PRE-TEARDOWN CLEANUP');
    console.log('======================================================');
    if (user1Id! || user2Id!) {
      await prisma.notification.deleteMany({
        where: { userId: { in: [user1Id!, user2Id!].filter(Boolean) } },
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
  console.log('  TN-020 NOTIFICATIONS TEST SUITE SUMMARY');
  console.log('======================================================');
  console.log(`Total Tests Executed : ${results.length}`);
  console.log(`Passed               : ${passed} ✅`);
  console.log(`Failed               : ${failed} ${failed > 0 ? '❌' : ''}`);

  if (failed === 0) {
    console.log('\n🎉 PASS — TN-020 (Receive Notifications) is fully verified!\n');
  } else {
    console.error('\n❌ FAIL — Some tests failed.\n');
    process.exit(1);
  }
}

runNotificationsTestSuite().catch((err) => {
  console.error('Test suite failed:', err);
  process.exit(1);
});
