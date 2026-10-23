/**
 * TrustNear — Full QA Test Suite for TN-016 (Business Claiming)
 * Test Specification: CLM-001 through CLM-063
 *
 * Sections:
 *   1. Claim Creation          CLM-001 – CLM-015
 *   2. Access Control           CLM-016 – CLM-022
 *   3. Pending Queue            CLM-023 – CLM-030
 *   4. Approval Flow            CLM-031 – CLM-040
 *   5. Rejection Flow           CLM-041 – CLM-048
 *   6. Transaction & Concurrency CLM-049 – CLM-054
 *   7. Security & Error Hygiene CLM-055 – CLM-060
 *   8. Notification & Details   CLM-061 – CLM-063
 */
import assert from 'assert';
// @ts-ignore
import request from 'supertest';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import app from '../../../server';
import { prisma } from '../../../config/db';
import { ClaimStatus, BusinessStatus, AdminTargetType, AdminActionType } from '@prisma/client';

const JWT_SECRET = process.env.JWT_SECRET || 'trustnear-secret-key';
const makeToken = (id: string, role: string, expiresIn: any = '1h') =>
  jwt.sign({ id, role }, JWT_SECRET, { expiresIn } as jwt.SignOptions);

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

// ─── Notification capture helper ──────────────────────────────────────────────
const captureStubLogs = async (fn: () => Promise<void>): Promise<string[]> => {
  const logs: string[] = [];
  const origLog = console.log;
  console.log = (...args: any[]) => {
    const msg = args.join(' ');
    if (msg.includes('[NOTIFICATION STUB]')) logs.push(msg);
    origLog(...args);
  };
  try {
    await fn();
  } finally {
    console.log = origLog;
  }
  return logs;
};

// ─── Shared state ─────────────────────────────────────────────────────────────
let testCategoryId = 0;
let user1Id = '', user1Token = '';
let user2Id = '', user2Token = '';
let ownerId = '', ownerToken = '';
let adminId = '', adminToken = '';
let admin2Id = '', admin2Token = '';
let seedAdminId = '', seedAdminToken = '';

const createdBusinessIds: string[] = [];
const createdUserIds: string[] = [];
const createdClaimIds: string[] = [];

// ─── Helpers ──────────────────────────────────────────────────────────────────
const FAKE_UUID_A = '99999999-9999-4999-a999-999999999999';
const FAKE_UUID_B = '88888888-8888-4888-a888-888888888888';

async function createTestBusiness(opts: {
  status?: BusinessStatus;
  ownerId?: string | null;
  submittedBy?: string;
}): Promise<string> {
  const submitter = opts.submittedBy ?? user1Id;
  const status = opts.status ?? BusinessStatus.published;
  const bizOwner = opts.ownerId ?? null;

  const rows = await prisma.$queryRaw<[{ id: string }]>`
    INSERT INTO businesses (
      name, category_id, landmark_description, location, status, submitted_by, owner_id, updated_at
    ) VALUES (
      ${`TN016 Biz ${Date.now()}_${Math.random().toString(36).substring(2, 7)}`},
      ${testCategoryId}::smallint,
      'Near Mexico Square, commercial center',
      ST_SetSRID(ST_MakePoint(38.75, 9.01), 4326)::geography,
      ${status}::"BusinessStatus",
      ${submitter}::uuid,
      ${bizOwner ? bizOwner : null}::uuid,
      NOW()
    ) RETURNING id
  `;
  const id = rows[0].id;
  createdBusinessIds.push(id);
  return id;
}

// ─── Main Runner ──────────────────────────────────────────────────────────────
async function runAllClaimTests() {
  console.log('===========================================================');
  console.log('🛡️  TrustNear TN-016 Business Claiming QA Suite CLM-001 – CLM-063');
  console.log('===========================================================\n');

  // ── SETUP ────────────────────────────────────────────────────────────────────
  await prisma.$connect();
  const passwordHash = await bcrypt.hash('Test!123', 4);
  const ts = Date.now();

  const cat = await prisma.category.create({
    data: { name: `ClaimCat_${ts}_${Math.random().toString(36).substring(2, 6)}` },
  });
  testCategoryId = cat.id;

  const u1 = await prisma.user.create({
    data: { displayName: 'Claimant One', email: `claimant1_${ts}@test.com`, phone: `+251911${Math.floor(100000 + Math.random()*900000)}`, passwordHash, role: 'user' },
  });
  user1Id = u1.id; createdUserIds.push(user1Id); user1Token = makeToken(user1Id, 'user');

  const u2 = await prisma.user.create({
    data: { displayName: 'Claimant Two', email: `claimant2_${ts}@test.com`, phone: `+251912${Math.floor(100000 + Math.random()*900000)}`, passwordHash, role: 'user' },
  });
  user2Id = u2.id; createdUserIds.push(user2Id); user2Token = makeToken(user2Id, 'user');

  const o = await prisma.user.create({
    data: { displayName: 'Existing Owner', email: `owner_${ts}@test.com`, phone: `+251913${Math.floor(100000 + Math.random()*900000)}`, passwordHash, role: 'business_owner' },
  });
  ownerId = o.id; createdUserIds.push(ownerId); ownerToken = makeToken(ownerId, 'business_owner');

  const a1 = await prisma.user.create({
    data: { displayName: 'Claims Admin 1', email: `claimadmin1_${ts}@test.com`, passwordHash, role: 'admin' },
  });
  adminId = a1.id; createdUserIds.push(adminId); adminToken = makeToken(adminId, 'admin');

  const a2 = await prisma.user.create({
    data: { displayName: 'Claims Admin 2', email: `claimadmin2_${ts}@test.com`, passwordHash, role: 'admin' },
  });
  admin2Id = a2.id; createdUserIds.push(admin2Id); admin2Token = makeToken(admin2Id, 'admin');

  const sa = await prisma.user.create({
    data: { displayName: 'Claims SeedAdmin', email: `claimseed_${ts}@test.com`, passwordHash, role: 'seed_admin' },
  });
  seedAdminId = sa.id; createdUserIds.push(seedAdminId); seedAdminToken = makeToken(seedAdminId, 'seed_admin');

  try {
    // ══════════════════════════════════════════════════════════════════════
    // 1. CLAIM CREATION (CLM-001 – CLM-015)
    // ══════════════════════════════════════════════════════════════════════
    console.log('--- 1. CLAIM CREATION TESTS ---');

    let claimBiz1 = await createTestBusiness({ status: BusinessStatus.published, ownerId: null });
    let createdClaim1Id = '';

    // CLM-001: authenticated user submits valid claim
    try {
      const res = await request(app)
        .post(`/api/businesses/${claimBiz1}/claim`)
        .set('Authorization', `Bearer ${user1Token}`)
        .send({ verificationInfo: { licenseNumber: 'BL-12345', documents: ['doc1.pdf'] } });

      assert.strictEqual(res.status, 201);
      assert.strictEqual(res.body.success, true);
      assert.strictEqual(res.body.data.businessId, claimBiz1);
      assert.strictEqual(res.body.data.status, 'pending');
      assert.ok(res.body.data.id);
      createdClaim1Id = res.body.data.id;
      createdClaimIds.push(createdClaim1Id);

      const dbClaim = await prisma.businessClaim.findUnique({ where: { id: createdClaim1Id } });
      assert.ok(dbClaim);
      assert.strictEqual(dbClaim.claimantId, user1Id);
      assert.strictEqual(dbClaim.status, ClaimStatus.pending);

      recordPass('CLM-001', 'Claim Creation', 'authenticated user submits valid claim -> 201');
    } catch (e) { recordFail('CLM-001', 'Claim Creation', 'authenticated user submits valid claim', e); }

    // CLM-002: unauthenticated user receives 401
    try {
      const res = await request(app).post(`/api/businesses/${claimBiz1}/claim`).send({});
      assert.strictEqual(res.status, 401);
      recordPass('CLM-002', 'Claim Creation', 'unauthenticated user receives 401');
    } catch (e) { recordFail('CLM-002', 'Claim Creation', 'unauthenticated user receives 401', e); }

    // CLM-003: invalid business UUID returns 400
    try {
      const res = await request(app)
        .post('/api/businesses/not-a-valid-uuid/claim')
        .set('Authorization', `Bearer ${user1Token}`)
        .send({});
      assert.strictEqual(res.status, 400);
      assert.ok(!JSON.stringify(res.body).toLowerCase().includes('prisma'));
      recordPass('CLM-003', 'Claim Creation', 'invalid business UUID returns 400');
    } catch (e) { recordFail('CLM-003', 'Claim Creation', 'invalid business UUID returns 400', e); }

    // CLM-004: nonexistent business returns 404
    try {
      const res = await request(app)
        .post(`/api/businesses/${FAKE_UUID_A}/claim`)
        .set('Authorization', `Bearer ${user1Token}`)
        .send({});
      assert.strictEqual(res.status, 404);
      recordPass('CLM-004', 'Claim Creation', 'nonexistent business returns 404');
    } catch (e) { recordFail('CLM-004', 'Claim Creation', 'nonexistent business returns 404', e); }

    // CLM-005: unpublished business cannot be claimed (pending or rejected)
    try {
      const pendingBiz = await createTestBusiness({ status: BusinessStatus.pending, ownerId: null });
      const res = await request(app)
        .post(`/api/businesses/${pendingBiz}/claim`)
        .set('Authorization', `Bearer ${user1Token}`)
        .send({});
      assert.strictEqual(res.status, 400);
      assert.ok(res.body.error.toLowerCase().includes('not published'));
      recordPass('CLM-005', 'Claim Creation', 'unpublished business cannot be claimed -> 400');
    } catch (e) { recordFail('CLM-005', 'Claim Creation', 'unpublished business cannot be claimed', e); }

    // CLM-006: published unowned business can be claimed
    try {
      const claimBiz2 = await createTestBusiness({ status: BusinessStatus.published, ownerId: null });
      const res = await request(app)
        .post(`/api/businesses/${claimBiz2}/claim`)
        .set('Authorization', `Bearer ${user2Token}`)
        .send({});
      assert.strictEqual(res.status, 201);
      assert.strictEqual(res.body.data.businessId, claimBiz2);
      createdClaimIds.push(res.body.data.id);
      recordPass('CLM-006', 'Claim Creation', 'published unowned business can be claimed -> 201');
    } catch (e) { recordFail('CLM-006', 'Claim Creation', 'published unowned business can be claimed', e); }

    // CLM-007: owner cannot claim their own already-owned business
    try {
      const ownedBiz = await createTestBusiness({ status: BusinessStatus.published, ownerId: ownerId });
      const res = await request(app)
        .post(`/api/businesses/${ownedBiz}/claim`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({});
      assert.strictEqual(res.status, 409);
      assert.ok(res.body.error.toLowerCase().includes('already own'));
      recordPass('CLM-007', 'Claim Creation', 'owner cannot claim their own already-owned business -> 409');
    } catch (e) { recordFail('CLM-007', 'Claim Creation', 'owner cannot claim own business', e); }

    // CLM-008: already-owned business returns 409 for another user
    try {
      const ownedBiz = await createTestBusiness({ status: BusinessStatus.published, ownerId: ownerId });
      const res = await request(app)
        .post(`/api/businesses/${ownedBiz}/claim`)
        .set('Authorization', `Bearer ${user1Token}`)
        .send({});
      assert.strictEqual(res.status, 409);
      assert.ok(res.body.error.toLowerCase().includes('already has an assigned owner') || res.body.error.toLowerCase().includes('owner'));
      recordPass('CLM-008', 'Claim Creation', 'already-owned business returns 409');
    } catch (e) { recordFail('CLM-008', 'Claim Creation', 'already-owned business returns 409', e); }

    // CLM-009: duplicate pending claim returns 409
    try {
      const res = await request(app)
        .post(`/api/businesses/${claimBiz1}/claim`)
        .set('Authorization', `Bearer ${user1Token}`)
        .send({});
      assert.strictEqual(res.status, 409);
      assert.ok(res.body.error.toLowerCase().includes('pending claim'));
      recordPass('CLM-009', 'Claim Creation', 'duplicate pending claim returns 409');
    } catch (e) { recordFail('CLM-009', 'Claim Creation', 'duplicate pending claim returns 409', e); }

    // CLM-010: approved claim cannot be duplicated once business is owned
    try {
      const approvedBiz = await createTestBusiness({ status: BusinessStatus.published, ownerId: user2Id });
      const res = await request(app)
        .post(`/api/businesses/${approvedBiz}/claim`)
        .set('Authorization', `Bearer ${user1Token}`)
        .send({});
      assert.strictEqual(res.status, 409);
      recordPass('CLM-010', 'Claim Creation', 'approved/owned business claim cannot be duplicated -> 409');
    } catch (e) { recordFail('CLM-010', 'Claim Creation', 'approved claim duplication prevented', e); }

    // CLM-011: rejected claim can be resubmitted if unowned
    try {
      const resubBiz = await createTestBusiness({ status: BusinessStatus.published, ownerId: null });
      // Create and reject a claim directly
      const prevClaim = await prisma.businessClaim.create({
        data: {
          businessId: resubBiz,
          claimantId: user1Id,
          status: ClaimStatus.rejected,
          rejectionReason: 'Previous document blurry',
          reviewedBy: adminId,
          reviewedAt: new Date(),
        },
      });
      createdClaimIds.push(prevClaim.id);

      // Now submit fresh claim
      const res = await request(app)
        .post(`/api/businesses/${resubBiz}/claim`)
        .set('Authorization', `Bearer ${user1Token}`)
        .send({ verificationInfo: { fixed: true } });
      assert.strictEqual(res.status, 201);
      assert.strictEqual(res.body.data.status, 'pending');
      createdClaimIds.push(res.body.data.id);
      recordPass('CLM-011', 'Claim Creation', 'rejected claim can be resubmitted fresh -> 201');
    } catch (e) { recordFail('CLM-011', 'Claim Creation', 'rejected claim resubmitted', e); }

    // CLM-012: client cannot spoof claimantId
    try {
      const spoofBiz = await createTestBusiness({ status: BusinessStatus.published, ownerId: null });
      const res = await request(app)
        .post(`/api/businesses/${spoofBiz}/claim`)
        .set('Authorization', `Bearer ${user1Token}`)
        .send({ claimantId: user2Id, claimant_id: user2Id });
      assert.strictEqual(res.status, 201);
      const dbClaim = await prisma.businessClaim.findUnique({ where: { id: res.body.data.id } });
      assert.strictEqual(dbClaim?.claimantId, user1Id, 'Claimant is always from JWT user');
      assert.notStrictEqual(dbClaim?.claimantId, user2Id, 'Spoofed claimant was rejected');
      createdClaimIds.push(res.body.data.id);
      recordPass('CLM-012', 'Claim Creation', 'client cannot spoof claimantId');
    } catch (e) { recordFail('CLM-012', 'Claim Creation', 'client cannot spoof claimantId', e); }

    // CLM-013: client cannot spoof ownerId
    try {
      const spoofBiz = await createTestBusiness({ status: BusinessStatus.published, ownerId: null });
      const res = await request(app)
        .post(`/api/businesses/${spoofBiz}/claim`)
        .set('Authorization', `Bearer ${user1Token}`)
        .send({ ownerId: user1Id });
      assert.strictEqual(res.status, 201);
      const dbBiz = await prisma.business.findUnique({ where: { id: spoofBiz } });
      assert.strictEqual(dbBiz?.ownerId, null, 'Business owner remains unassigned upon submission');
      createdClaimIds.push(res.body.data.id);
      recordPass('CLM-013', 'Claim Creation', 'client cannot spoof ownerId on creation');
    } catch (e) { recordFail('CLM-013', 'Claim Creation', 'client cannot spoof ownerId', e); }

    // CLM-014: client cannot spoof status (e.g. approved)
    try {
      const spoofBiz = await createTestBusiness({ status: BusinessStatus.published, ownerId: null });
      const res = await request(app)
        .post(`/api/businesses/${spoofBiz}/claim`)
        .set('Authorization', `Bearer ${user1Token}`)
        .send({ status: 'approved' });
      assert.strictEqual(res.status, 201);
      const dbClaim = await prisma.businessClaim.findUnique({ where: { id: res.body.data.id } });
      assert.strictEqual(dbClaim?.status, ClaimStatus.pending, 'Status is forced to pending');
      createdClaimIds.push(res.body.data.id);
      recordPass('CLM-014', 'Claim Creation', 'client cannot spoof status (remains pending)');
    } catch (e) { recordFail('CLM-014', 'Claim Creation', 'client cannot spoof status', e); }

    // CLM-015: malformed request body handled cleanly
    try {
      const cleanBiz = await createTestBusiness({ status: BusinessStatus.published, ownerId: null });
      const res = await request(app)
        .post(`/api/businesses/${cleanBiz}/claim`)
        .set('Authorization', `Bearer ${user1Token}`)
        .send('not-json');
      // Express body parser or handler handles non-breaking payload
      assert.ok([201, 400].includes(res.status));
      recordPass('CLM-015', 'Claim Creation', 'malformed request handled cleanly without server crash');
    } catch (e) { recordFail('CLM-015', 'Claim Creation', 'malformed request handled cleanly', e); }

    // ══════════════════════════════════════════════════════════════════════
    // 2. ACCESS CONTROL (CLM-016 – CLM-022)
    // ══════════════════════════════════════════════════════════════════════
    console.log('\n--- 2. ACCESS CONTROL TESTS ---');

    // CLM-016: normal user cannot access pending claims -> 403
    try {
      const res = await request(app)
        .get('/api/admin/claims/pending')
        .set('Authorization', `Bearer ${user1Token}`);
      assert.strictEqual(res.status, 403);
      recordPass('CLM-016', 'Access Control', 'normal user cannot access pending claims -> 403');
    } catch (e) { recordFail('CLM-016', 'Access Control', 'normal user cannot access pending claims', e); }

    // CLM-017: normal user cannot approve claims -> 403
    try {
      const res = await request(app)
        .patch(`/api/admin/claims/${FAKE_UUID_A}/approve`)
        .set('Authorization', `Bearer ${user1Token}`);
      assert.strictEqual(res.status, 403);
      recordPass('CLM-017', 'Access Control', 'normal user cannot approve claims -> 403');
    } catch (e) { recordFail('CLM-017', 'Access Control', 'normal user cannot approve claims', e); }

    // CLM-018: normal user cannot reject claims -> 403
    try {
      const res = await request(app)
        .patch(`/api/admin/claims/${FAKE_UUID_A}/reject`)
        .set('Authorization', `Bearer ${user1Token}`)
        .send({});
      assert.strictEqual(res.status, 403);
      recordPass('CLM-018', 'Access Control', 'normal user cannot reject claims -> 403');
    } catch (e) { recordFail('CLM-018', 'Access Control', 'normal user cannot reject claims', e); }

    // CLM-019: admin can access pending claims -> 200
    try {
      const res = await request(app)
        .get('/api/admin/claims/pending')
        .set('Authorization', `Bearer ${adminToken}`);
      assert.strictEqual(res.status, 200);
      assert.ok(Array.isArray(res.body.data.claims));
      recordPass('CLM-019', 'Access Control', 'admin can access pending claims -> 200');
    } catch (e) { recordFail('CLM-019', 'Access Control', 'admin can access pending claims', e); }

    // CLM-020: seed_admin can access pending claims -> 200
    try {
      const res = await request(app)
        .get('/api/admin/claims/pending')
        .set('Authorization', `Bearer ${seedAdminToken}`);
      assert.strictEqual(res.status, 200);
      recordPass('CLM-020', 'Access Control', 'seed_admin can access pending claims -> 200');
    } catch (e) { recordFail('CLM-020', 'Access Control', 'seed_admin can access pending claims', e); }

    // CLM-021: invalid JWT returns 401
    try {
      const badToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.invalid.signature';
      const [r1, r2, r3] = await Promise.all([
        request(app).get('/api/admin/claims/pending').set('Authorization', `Bearer ${badToken}`),
        request(app).patch(`/api/admin/claims/${FAKE_UUID_A}/approve`).set('Authorization', `Bearer ${badToken}`),
        request(app).patch(`/api/admin/claims/${FAKE_UUID_A}/reject`).set('Authorization', `Bearer ${badToken}`).send({}),
      ]);
      assert.strictEqual(r1.status, 401);
      assert.strictEqual(r2.status, 401);
      assert.strictEqual(r3.status, 401);
      recordPass('CLM-021', 'Access Control', 'invalid JWT returns 401 on all admin claim endpoints');
    } catch (e) { recordFail('CLM-021', 'Access Control', 'invalid JWT returns 401', e); }

    // CLM-022: expired JWT returns 401
    try {
      const expiredToken = makeToken(adminId, 'admin', '-10s');
      const res = await request(app)
        .get('/api/admin/claims/pending')
        .set('Authorization', `Bearer ${expiredToken}`);
      assert.strictEqual(res.status, 401);
      assert.ok(res.body.error.toLowerCase().includes('expired'));
      recordPass('CLM-022', 'Access Control', 'expired JWT returns 401');
    } catch (e) { recordFail('CLM-022', 'Access Control', 'expired JWT returns 401', e); }

    // ══════════════════════════════════════════════════════════════════════
    // 3. PENDING QUEUE (CLM-023 – CLM-030)
    // ══════════════════════════════════════════════════════════════════════
    console.log('\n--- 3. PENDING QUEUE TESTS ---');

    // Create 1 pending, 1 approved, 1 rejected claim for filtering test
    const filterBiz1 = await createTestBusiness({ status: BusinessStatus.published, ownerId: null });
    const filterBiz2 = await createTestBusiness({ status: BusinessStatus.published, ownerId: null });
    const filterBiz3 = await createTestBusiness({ status: BusinessStatus.published, ownerId: null });

    const cPending = await prisma.businessClaim.create({
      data: { businessId: filterBiz1, claimantId: user1Id, status: ClaimStatus.pending },
    });
    const cApproved = await prisma.businessClaim.create({
      data: { businessId: filterBiz2, claimantId: user1Id, status: ClaimStatus.approved, reviewedBy: adminId, reviewedAt: new Date() },
    });
    const cRejected = await prisma.businessClaim.create({
      data: { businessId: filterBiz3, claimantId: user1Id, status: ClaimStatus.rejected, reviewedBy: adminId, reviewedAt: new Date(), rejectionReason: 'Invalid docs' },
    });
    createdClaimIds.push(cPending.id, cApproved.id, cRejected.id);

    // CLM-023: returns only pending claims
    try {
      const res = await request(app)
        .get('/api/admin/claims/pending?pageSize=100')
        .set('Authorization', `Bearer ${adminToken}`);
      assert.strictEqual(res.status, 200);
      const claimItems: any[] = res.body.data.claims;
      const statuses = claimItems.map((c) => c.status);
      assert.ok(statuses.every((s) => s === 'pending'), 'All returned claims must have status = pending');
      recordPass('CLM-023', 'Pending Queue', 'returns only pending claims');
    } catch (e) { recordFail('CLM-023', 'Pending Queue', 'returns only pending claims', e); }

    // CLM-024: excludes approved claims
    try {
      const res = await request(app)
        .get('/api/admin/claims/pending?pageSize=100')
        .set('Authorization', `Bearer ${adminToken}`);
      const ids = res.body.data.claims.map((c: any) => c.id);
      assert.ok(!ids.includes(cApproved.id), 'Approved claim is excluded');
      recordPass('CLM-024', 'Pending Queue', 'excludes approved claims');
    } catch (e) { recordFail('CLM-024', 'Pending Queue', 'excludes approved claims', e); }

    // CLM-025: excludes rejected claims
    try {
      const res = await request(app)
        .get('/api/admin/claims/pending?pageSize=100')
        .set('Authorization', `Bearer ${adminToken}`);
      const ids = res.body.data.claims.map((c: any) => c.id);
      assert.ok(!ids.includes(cRejected.id), 'Rejected claim is excluded');
      recordPass('CLM-025', 'Pending Queue', 'excludes rejected claims');
    } catch (e) { recordFail('CLM-025', 'Pending Queue', 'excludes rejected claims', e); }

    // CLM-026: pagination works (page and pageSize)
    try {
      const p1 = await request(app)
        .get('/api/admin/claims/pending?page=1&pageSize=2')
        .set('Authorization', `Bearer ${adminToken}`);
      assert.strictEqual(p1.status, 200);
      assert.strictEqual(p1.body.data.page, 1);
      assert.strictEqual(p1.body.data.pageSize, 2);
      assert.ok(p1.body.data.claims.length <= 2);
      assert.ok(p1.body.data.total >= 1);
      recordPass('CLM-026', 'Pending Queue', 'pagination works with page and pageSize');
    } catch (e) { recordFail('CLM-026', 'Pending Queue', 'pagination works', e); }

    // CLM-027: pageSize maximum is enforced (clamped to 100)
    try {
      const res = await request(app)
        .get('/api/admin/claims/pending?pageSize=500')
        .set('Authorization', `Bearer ${adminToken}`);
      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.body.data.pageSize, 100, 'PageSize clamped to max 100');
      recordPass('CLM-027', 'Pending Queue', 'pageSize maximum is enforced (clamped to 100)');
    } catch (e) { recordFail('CLM-027', 'Pending Queue', 'pageSize maximum clamped', e); }

    // CLM-028: ordering is correct (oldest first by createdAt ASC)
    try {
      const res = await request(app)
        .get('/api/admin/claims/pending?pageSize=100')
        .set('Authorization', `Bearer ${adminToken}`);
      const claims = res.body.data.claims;
      if (claims.length >= 2) {
        for (let i = 0; i < claims.length - 1; i++) {
          const t1 = new Date(claims[i].createdAt).getTime();
          const t2 = new Date(claims[i + 1].createdAt).getTime();
          assert.ok(t1 <= t2, `Claim ${i} is older or equal to ${i+1}`);
        }
      }
      recordPass('CLM-028', 'Pending Queue', 'ordering is correct (oldest pending claims first)');
    } catch (e) { recordFail('CLM-028', 'Pending Queue', 'ordering is correct', e); }

    // CLM-029: business information is included
    try {
      const res = await request(app)
        .get('/api/admin/claims/pending?pageSize=20')
        .set('Authorization', `Bearer ${adminToken}`);
      const item = res.body.data.claims.find((c: any) => c.id === cPending.id);
      assert.ok(item, 'Pending test claim found');
      assert.ok(item.business, 'business object present');
      assert.strictEqual(item.business.id, filterBiz1);
      assert.ok(item.business.name);
      recordPass('CLM-029', 'Pending Queue', 'business information is included in queue item');
    } catch (e) { recordFail('CLM-029', 'Pending Queue', 'business information is included', e); }

    // CLM-030: sensitive claimant fields are not exposed (no passwordHash or tokens)
    try {
      const res = await request(app)
        .get('/api/admin/claims/pending?pageSize=20')
        .set('Authorization', `Bearer ${adminToken}`);
      const jsonStr = JSON.stringify(res.body).toLowerCase();
      assert.ok(!jsonStr.includes('passwordhash'), 'No passwordHash exposed');
      assert.ok(!jsonStr.includes('refreshtoken'), 'No refreshToken exposed');
      assert.ok(!jsonStr.includes('token_hash'), 'No token_hash exposed');
      const item = res.body.data.claims[0];
      if (item && item.claimant) {
        assert.ok(item.claimant.id);
        assert.ok(item.claimant.displayName);
      }
      recordPass('CLM-030', 'Pending Queue', 'sensitive claimant fields (passwordHash, tokens) are never exposed');
    } catch (e) { recordFail('CLM-030', 'Pending Queue', 'sensitive claimant fields not exposed', e); }

    // ══════════════════════════════════════════════════════════════════════
    // 4. APPROVAL FLOW (CLM-031 – CLM-040)
    // ══════════════════════════════════════════════════════════════════════
    console.log('\n--- 4. APPROVAL FLOW TESTS ---');

    const appBiz = await createTestBusiness({ status: BusinessStatus.published, ownerId: null });
    const appClaim = await prisma.businessClaim.create({
      data: { businessId: appBiz, claimantId: user1Id, status: ClaimStatus.pending },
    });
    createdClaimIds.push(appClaim.id);

    // CLM-031: admin successfully approves pending claim
    let approveRes: any;
    try {
      approveRes = await request(app)
        .patch(`/api/admin/claims/${appClaim.id}/approve`)
        .set('Authorization', `Bearer ${adminToken}`);
      assert.strictEqual(approveRes.status, 200);
      assert.strictEqual(approveRes.body.success, true);
      assert.strictEqual(approveRes.body.data.id, appClaim.id);
      assert.strictEqual(approveRes.body.data.status, 'approved');
      recordPass('CLM-031', 'Approval Flow', 'admin successfully approves pending claim -> 200');
    } catch (e) { recordFail('CLM-031', 'Approval Flow', 'admin approves pending claim', e); }

    // CLM-032: approval assigns business.ownerId correctly
    try {
      const dbBiz = await prisma.business.findUnique({ where: { id: appBiz } });
      assert.strictEqual(dbBiz?.ownerId, user1Id, 'business.ownerId set to claimantId');
      recordPass('CLM-032', 'Approval Flow', 'approval assigns business.ownerId correctly');
    } catch (e) { recordFail('CLM-032', 'Approval Flow', 'approval assigns business.ownerId', e); }

    // CLM-033: approval changes claim status to approved
    try {
      const dbClaim = await prisma.businessClaim.findUnique({ where: { id: appClaim.id } });
      assert.strictEqual(dbClaim?.status, ClaimStatus.approved);
      recordPass('CLM-033', 'Approval Flow', 'approval changes claim status to approved in DB');
    } catch (e) { recordFail('CLM-033', 'Approval Flow', 'approval changes claim status to approved', e); }

    // CLM-034: reviewedBy comes from JWT admin
    try {
      const dbClaim = await prisma.businessClaim.findUnique({ where: { id: appClaim.id } });
      assert.strictEqual(dbClaim?.reviewedBy, adminId, 'reviewedBy matches JWT admin ID');
      recordPass('CLM-034', 'Approval Flow', 'reviewedBy comes from JWT admin');
    } catch (e) { recordFail('CLM-034', 'Approval Flow', 'reviewedBy comes from JWT admin', e); }

    // CLM-035: reviewedAt is recorded
    try {
      const dbClaim = await prisma.businessClaim.findUnique({ where: { id: appClaim.id } });
      assert.ok(dbClaim?.reviewedAt instanceof Date, 'reviewedAt is recorded timestamp');
      recordPass('CLM-035', 'Approval Flow', 'reviewedAt is recorded');
    } catch (e) { recordFail('CLM-035', 'Approval Flow', 'reviewedAt is recorded', e); }

    // CLM-036: approval creates audit record
    try {
      const audit = await prisma.adminAction.findFirst({
        where: { targetId: appClaim.id, action: AdminActionType.approve, targetType: AdminTargetType.claim },
      });
      assert.ok(audit, 'AdminAction audit record found for claim approval');
      assert.strictEqual(audit.adminId, adminId);
      assert.strictEqual(audit.targetType, 'claim');
      recordPass('CLM-036', 'Approval Flow', 'approval creates audit record in admin_actions');
    } catch (e) { recordFail('CLM-036', 'Approval Flow', 'approval creates audit record', e); }

    // CLM-037: approving already-approved claim returns 409
    try {
      const res = await request(app)
        .patch(`/api/admin/claims/${appClaim.id}/approve`)
        .set('Authorization', `Bearer ${adminToken}`);
      assert.strictEqual(res.status, 409);
      assert.ok(res.body.error.toLowerCase().includes('approved'));
      recordPass('CLM-037', 'Approval Flow', 'approving already-approved claim returns 409');
    } catch (e) { recordFail('CLM-037', 'Approval Flow', 'approving already-approved claim returns 409', e); }

    // CLM-038: approving rejected claim returns 409
    try {
      const rejBiz = await createTestBusiness({ status: BusinessStatus.published, ownerId: null });
      const rejClaim = await prisma.businessClaim.create({
        data: { businessId: rejBiz, claimantId: user1Id, status: ClaimStatus.rejected, reviewedBy: adminId, reviewedAt: new Date() },
      });
      createdClaimIds.push(rejClaim.id);

      const res = await request(app)
        .patch(`/api/admin/claims/${rejClaim.id}/approve`)
        .set('Authorization', `Bearer ${adminToken}`);
      assert.strictEqual(res.status, 409);
      assert.ok(res.body.error.toLowerCase().includes('rejected'));
      recordPass('CLM-038', 'Approval Flow', 'approving rejected claim returns 409');
    } catch (e) { recordFail('CLM-038', 'Approval Flow', 'approving rejected claim returns 409', e); }

    // CLM-039: approving nonexistent claim returns 404
    try {
      const res = await request(app)
        .patch(`/api/admin/claims/${FAKE_UUID_A}/approve`)
        .set('Authorization', `Bearer ${adminToken}`);
      assert.strictEqual(res.status, 404);
      recordPass('CLM-039', 'Approval Flow', 'approving nonexistent claim returns 404');
    } catch (e) { recordFail('CLM-039', 'Approval Flow', 'approving nonexistent claim returns 404', e); }

    // CLM-040: approval does not allow ownerId spoofing via request body
    try {
      const spoofAppBiz = await createTestBusiness({ status: BusinessStatus.published, ownerId: null });
      const spoofAppClaim = await prisma.businessClaim.create({
        data: { businessId: spoofAppBiz, claimantId: user1Id, status: ClaimStatus.pending },
      });
      createdClaimIds.push(spoofAppClaim.id);

      const res = await request(app)
        .patch(`/api/admin/claims/${spoofAppClaim.id}/approve`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ ownerId: user2Id, claimantId: user2Id });
      assert.strictEqual(res.status, 200);

      const dbBiz = await prisma.business.findUnique({ where: { id: spoofAppBiz } });
      assert.strictEqual(dbBiz?.ownerId, user1Id, 'Assigned owner is claimantId from claim record, not body');
      recordPass('CLM-040', 'Approval Flow', 'approval does not allow ownerId spoofing from request body');
    } catch (e) { recordFail('CLM-040', 'Approval Flow', 'approval does not allow ownerId spoofing', e); }

    // ══════════════════════════════════════════════════════════════════════
    // 5. REJECTION FLOW (CLM-041 – CLM-048)
    // ══════════════════════════════════════════════════════════════════════
    console.log('\n--- 5. REJECTION FLOW TESTS ---');

    const REJECT_REASON = 'Provided tax identification document does not match business registration.';
    const rejBiz2 = await createTestBusiness({ status: BusinessStatus.published, ownerId: null });
    const rejClaim2 = await prisma.businessClaim.create({
      data: { businessId: rejBiz2, claimantId: user1Id, status: ClaimStatus.pending },
    });
    createdClaimIds.push(rejClaim2.id);

    // CLM-041: admin successfully rejects pending claim
    try {
      const res = await request(app)
        .patch(`/api/admin/claims/${rejClaim2.id}/reject`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ reason: REJECT_REASON });
      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.body.success, true);
      assert.strictEqual(res.body.data.id, rejClaim2.id);
      assert.strictEqual(res.body.data.status, 'rejected');
      recordPass('CLM-041', 'Rejection Flow', 'admin successfully rejects pending claim -> 200');
    } catch (e) { recordFail('CLM-041', 'Rejection Flow', 'admin rejects pending claim', e); }

    // CLM-042: rejection changes status to rejected
    try {
      const dbClaim = await prisma.businessClaim.findUnique({ where: { id: rejClaim2.id } });
      assert.strictEqual(dbClaim?.status, ClaimStatus.rejected);
      recordPass('CLM-042', 'Rejection Flow', 'rejection changes claim status to rejected in DB');
    } catch (e) { recordFail('CLM-042', 'Rejection Flow', 'rejection changes status to rejected', e); }

    // CLM-043: rejection does not assign business.ownerId
    try {
      const dbBiz = await prisma.business.findUnique({ where: { id: rejBiz2 } });
      assert.strictEqual(dbBiz?.ownerId, null, 'business.ownerId remains null upon claim rejection');
      recordPass('CLM-043', 'Rejection Flow', 'rejection does not assign business.ownerId');
    } catch (e) { recordFail('CLM-043', 'Rejection Flow', 'rejection does not assign ownerId', e); }

    // CLM-044: rejection records reviewer
    try {
      const dbClaim = await prisma.businessClaim.findUnique({ where: { id: rejClaim2.id } });
      assert.strictEqual(dbClaim?.reviewedBy, adminId);
      assert.ok(dbClaim?.reviewedAt instanceof Date);
      recordPass('CLM-044', 'Rejection Flow', 'rejection records reviewer admin and timestamp');
    } catch (e) { recordFail('CLM-044', 'Rejection Flow', 'rejection records reviewer', e); }

    // CLM-045: rejection records reason where applicable
    try {
      const dbClaim = await prisma.businessClaim.findUnique({ where: { id: rejClaim2.id } });
      assert.strictEqual(dbClaim?.rejectionReason, REJECT_REASON);
      recordPass('CLM-045', 'Rejection Flow', 'rejection records reason properly');
    } catch (e) { recordFail('CLM-045', 'Rejection Flow', 'rejection records reason', e); }

    // CLM-046: rejection creates audit record
    try {
      const audit = await prisma.adminAction.findFirst({
        where: { targetId: rejClaim2.id, action: AdminActionType.reject, targetType: AdminTargetType.claim },
      });
      assert.ok(audit, 'Audit log found for rejection');
      assert.strictEqual(audit.adminId, adminId);
      assert.strictEqual(audit.reason, REJECT_REASON);
      recordPass('CLM-046', 'Rejection Flow', 'rejection creates audit record with reason');
    } catch (e) { recordFail('CLM-046', 'Rejection Flow', 'rejection creates audit record', e); }

    // CLM-047: rejecting approved claim returns 409
    try {
      const res = await request(app)
        .patch(`/api/admin/claims/${appClaim.id}/reject`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ reason: 'Try to reject approved' });
      assert.strictEqual(res.status, 409);
      assert.ok(res.body.error.toLowerCase().includes('approved'));
      recordPass('CLM-047', 'Rejection Flow', 'rejecting approved claim returns 409');
    } catch (e) { recordFail('CLM-047', 'Rejection Flow', 'rejecting approved claim returns 409', e); }

    // CLM-048: rejecting already-rejected claim returns 409
    try {
      const res = await request(app)
        .patch(`/api/admin/claims/${rejClaim2.id}/reject`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ reason: 'Try to reject again' });
      assert.strictEqual(res.status, 409);
      assert.ok(res.body.error.toLowerCase().includes('rejected'));
      recordPass('CLM-048', 'Rejection Flow', 'rejecting already-rejected claim returns 409');
    } catch (e) { recordFail('CLM-048', 'Rejection Flow', 'rejecting already-rejected claim returns 409', e); }

    // ══════════════════════════════════════════════════════════════════════
    // 6. TRANSACTION / CONCURRENCY (CLM-049 – CLM-054)
    // ══════════════════════════════════════════════════════════════════════
    console.log('\n--- 6. TRANSACTION & CONCURRENCY TESTS ---');

    // CLM-049: approval transaction rolls back if ownership update fails
    try {
      const txFailBiz = await createTestBusiness({ status: BusinessStatus.published, ownerId: null });
      const txFailClaim = await prisma.businessClaim.create({
        data: { businessId: txFailBiz, claimantId: user1Id, status: ClaimStatus.pending },
      });
      createdClaimIds.push(txFailClaim.id);

      const original = prisma.$transaction.bind(prisma);
      prisma.$transaction = (async (arg: any, opts?: any) => {
        if (typeof arg === 'function') {
          return original(async (tx: any) => {
            const proxied = new Proxy(tx, {
              get(target, prop, recv) {
                if (prop === 'business') {
                  return {
                    ...target.business,
                    update: async () => {
                      throw new Error('Simulated business update error in tx');
                    },
                  };
                }
                return Reflect.get(target, prop, recv);
              },
            });
            return arg(proxied);
          }, opts);
        }
        return original(arg, opts);
      }) as any;

      const res = await request(app)
        .patch(`/api/admin/claims/${txFailClaim.id}/approve`)
        .set('Authorization', `Bearer ${adminToken}`);

      prisma.$transaction = original;

      assert.strictEqual(res.status, 500);
      const dbClaim = await prisma.businessClaim.findUnique({ where: { id: txFailClaim.id } });
      assert.strictEqual(dbClaim?.status, ClaimStatus.pending, 'Claim rolled back to pending');
      const dbBiz = await prisma.business.findUnique({ where: { id: txFailBiz } });
      assert.strictEqual(dbBiz?.ownerId, null, 'Business owner unchanged');
      recordPass('CLM-049', 'Transaction / Concurrency', 'approval transaction rolls back if ownership update fails');
    } catch (e) { recordFail('CLM-049', 'Transaction / Concurrency', 'approval rolls back on update fail', e); }

    // CLM-050: approval transaction rolls back if audit creation fails
    try {
      const auditFailBiz = await createTestBusiness({ status: BusinessStatus.published, ownerId: null });
      const auditFailClaim = await prisma.businessClaim.create({
        data: { businessId: auditFailBiz, claimantId: user1Id, status: ClaimStatus.pending },
      });
      createdClaimIds.push(auditFailClaim.id);

      const original = prisma.$transaction.bind(prisma);
      prisma.$transaction = (async (arg: any, opts?: any) => {
        if (typeof arg === 'function') {
          return original(async (tx: any) => {
            const proxied = new Proxy(tx, {
              get(target, prop, recv) {
                if (prop === 'adminAction') {
                  return {
                    ...target.adminAction,
                    create: async () => {
                      throw new Error('Simulated audit write failure');
                    },
                  };
                }
                return Reflect.get(target, prop, recv);
              },
            });
            return arg(proxied);
          }, opts);
        }
        return original(arg, opts);
      }) as any;

      const res = await request(app)
        .patch(`/api/admin/claims/${auditFailClaim.id}/approve`)
        .set('Authorization', `Bearer ${adminToken}`);

      prisma.$transaction = original;

      assert.strictEqual(res.status, 500);
      const dbClaim = await prisma.businessClaim.findUnique({ where: { id: auditFailClaim.id } });
      assert.strictEqual(dbClaim?.status, ClaimStatus.pending, 'Claim rolled back to pending');
      const dbBiz = await prisma.business.findUnique({ where: { id: auditFailBiz } });
      assert.strictEqual(dbBiz?.ownerId, null, 'Business owner unchanged');
      recordPass('CLM-050', 'Transaction / Concurrency', 'approval transaction rolls back if audit creation fails');
    } catch (e) { recordFail('CLM-050', 'Transaction / Concurrency', 'approval rolls back on audit fail', e); }

    // CLM-051: competing claims cannot both become approved (atomic conflict)
    try {
      const raceBiz = await createTestBusiness({ status: BusinessStatus.published, ownerId: null });
      const claimA = await prisma.businessClaim.create({
        data: { businessId: raceBiz, claimantId: user1Id, status: ClaimStatus.pending },
      });
      const claimB = await prisma.businessClaim.create({
        data: { businessId: raceBiz, claimantId: user2Id, status: ClaimStatus.pending },
      });
      createdClaimIds.push(claimA.id, claimB.id);

      // Admin 1 approves claimA
      const resA = await request(app)
        .patch(`/api/admin/claims/${claimA.id}/approve`)
        .set('Authorization', `Bearer ${adminToken}`);
      assert.strictEqual(resA.status, 200);

      // Admin 2 attempts to approve claimB for the same business
      const resB = await request(app)
        .patch(`/api/admin/claims/${claimB.id}/approve`)
        .set('Authorization', `Bearer ${admin2Token}`);
      assert.strictEqual(resB.status, 409, 'Competing claim approval returns 409 Conflict');
      assert.ok(resB.body.error.toLowerCase().includes('owner'));

      recordPass('CLM-051', 'Transaction / Concurrency', 'competing claims cannot both become approved (first wins, second gets 409)');
    } catch (e) { recordFail('CLM-051', 'Transaction / Concurrency', 'competing claims conflict handled', e); }

    // CLM-052: business can never end with two owners
    try {
      const singleOwnerBiz = await createTestBusiness({ status: BusinessStatus.published, ownerId: user1Id });
      const claimX = await prisma.businessClaim.create({
        data: { businessId: singleOwnerBiz, claimantId: user2Id, status: ClaimStatus.pending },
      });
      createdClaimIds.push(claimX.id);

      const res = await request(app)
        .patch(`/api/admin/claims/${claimX.id}/approve`)
        .set('Authorization', `Bearer ${adminToken}`);
      assert.strictEqual(res.status, 409);

      const dbBiz = await prisma.business.findUnique({ where: { id: singleOwnerBiz } });
      assert.strictEqual(dbBiz?.ownerId, user1Id, 'Original owner strictly preserved');
      recordPass('CLM-052', 'Transaction / Concurrency', 'business owner strictly cannot be overwritten by pending claim approval');
    } catch (e) { recordFail('CLM-052', 'Transaction / Concurrency', 'single owner invariant preserved', e); }

    // CLM-053: failed approval leaves claim pending
    try {
      const failLeaveBiz = await createTestBusiness({ status: BusinessStatus.pending, ownerId: null }); // unpublished
      const failLeaveClaim = await prisma.businessClaim.create({
        data: { businessId: failLeaveBiz, claimantId: user1Id, status: ClaimStatus.pending },
      });
      createdClaimIds.push(failLeaveClaim.id);

      const res = await request(app)
        .patch(`/api/admin/claims/${failLeaveClaim.id}/approve`)
        .set('Authorization', `Bearer ${adminToken}`);
      assert.strictEqual(res.status, 409);

      const dbClaim = await prisma.businessClaim.findUnique({ where: { id: failLeaveClaim.id } });
      assert.strictEqual(dbClaim?.status, ClaimStatus.pending, 'Claim remains in pending state');
      recordPass('CLM-053', 'Transaction / Concurrency', 'failed approval leaves claim pending');
    } catch (e) { recordFail('CLM-053', 'Transaction / Concurrency', 'failed approval leaves claim pending', e); }

    // CLM-054: failed approval leaves business owner unchanged
    try {
      const unchangedBiz = await createTestBusiness({ status: BusinessStatus.published, ownerId: null });
      const unchangedClaim = await prisma.businessClaim.create({
        data: { businessId: unchangedBiz, claimantId: user1Id, status: ClaimStatus.pending },
      });
      createdClaimIds.push(unchangedClaim.id);

      // Trigger failure with simulated error
      const original = prisma.$transaction.bind(prisma);
      prisma.$transaction = (async () => {
        throw new Error('Forced failure');
      }) as any;

      await request(app)
        .patch(`/api/admin/claims/${unchangedClaim.id}/approve`)
        .set('Authorization', `Bearer ${adminToken}`);

      prisma.$transaction = original;

      const dbBiz = await prisma.business.findUnique({ where: { id: unchangedBiz } });
      assert.strictEqual(dbBiz?.ownerId, null, 'ownerId is null (unchanged)');
      recordPass('CLM-054', 'Transaction / Concurrency', 'failed approval leaves business owner unchanged');
    } catch (e) { recordFail('CLM-054', 'Transaction / Concurrency', 'failed approval leaves business owner unchanged', e); }

    // ══════════════════════════════════════════════════════════════════════
    // 7. SECURITY & ERROR HYGIENE (CLM-055 – CLM-060)
    // ══════════════════════════════════════════════════════════════════════
    console.log('\n--- 7. SECURITY & ERROR HYGIENE TESTS ---');

    // CLM-055: SQL injection-style input is handled safely
    try {
      const sqlBiz = await createTestBusiness({ status: BusinessStatus.published, ownerId: null });
      const res = await request(app)
        .post(`/api/businesses/${sqlBiz}/claim`)
        .set('Authorization', `Bearer ${user1Token}`)
        .send({ verificationInfo: { note: "'; DROP TABLE businesses; --" } });
      assert.strictEqual(res.status, 201);
      const dbBizCount = await prisma.business.count();
      assert.ok(dbBizCount > 0, 'Database tables intact after SQL injection test payload');
      createdClaimIds.push(res.body.data.id);
      recordPass('CLM-055', 'Security & Error Hygiene', 'SQL injection payload handled safely via parameterized queries');
    } catch (e) { recordFail('CLM-055', 'Security & Error Hygiene', 'SQL injection payload handled safely', e); }

    // CLM-056: no Prisma stack trace is returned
    try {
      const res = await request(app)
        .post('/api/businesses/bad-id-format/claim')
        .set('Authorization', `Bearer ${user1Token}`)
        .send({});
      assert.strictEqual(res.status, 400);
      const str = JSON.stringify(res.body).toLowerCase();
      assert.ok(!str.includes('prisma'), 'No prisma in response');
      assert.ok(!str.includes('postgresql'), 'No postgresql in response');
      recordPass('CLM-056', 'Security & Error Hygiene', 'no Prisma / PostgreSQL stack traces exposed');
    } catch (e) { recordFail('CLM-056', 'Security & Error Hygiene', 'no Prisma stack trace returned', e); }

    // CLM-057: no passwordHash is exposed in claim detail or list
    try {
      const res = await request(app)
        .get('/api/admin/claims/pending?pageSize=50')
        .set('Authorization', `Bearer ${adminToken}`);
      const bodyStr = JSON.stringify(res.body);
      assert.ok(!bodyStr.includes('passwordHash'), 'No passwordHash in pending queue body');
      assert.ok(!bodyStr.includes('password_hash'), 'No password_hash in pending queue body');
      recordPass('CLM-057', 'Security & Error Hygiene', 'no passwordHash is exposed anywhere in claim responses');
    } catch (e) { recordFail('CLM-057', 'Security & Error Hygiene', 'no passwordHash exposed', e); }

    // CLM-058: admin identity cannot be spoofed via request body
    try {
      const spoofAdminBiz = await createTestBusiness({ status: BusinessStatus.published, ownerId: null });
      const spoofAdminClaim = await prisma.businessClaim.create({
        data: { businessId: spoofAdminBiz, claimantId: user1Id, status: ClaimStatus.pending },
      });
      createdClaimIds.push(spoofAdminClaim.id);

      const res = await request(app)
        .patch(`/api/admin/claims/${spoofAdminClaim.id}/approve`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ adminId: admin2Id, reviewedBy: admin2Id });
      assert.strictEqual(res.status, 200);

      const audit = await prisma.adminAction.findFirst({ where: { targetId: spoofAdminClaim.id, action: 'approve' } });
      assert.strictEqual(audit?.adminId, adminId, 'Audit log adminId is bound to JWT identity');
      assert.notStrictEqual(audit?.adminId, admin2Id, 'Spoofed adminId was ignored');
      recordPass('CLM-058', 'Security & Error Hygiene', 'admin identity cannot be spoofed in audit log');
    } catch (e) { recordFail('CLM-058', 'Security & Error Hygiene', 'admin identity cannot be spoofed', e); }

    // CLM-059: invalid claim IDs are validated (UUID param validation)
    try {
      const [rApprove, rReject] = await Promise.all([
        request(app).patch('/api/admin/claims/invalid-uuid/approve').set('Authorization', `Bearer ${adminToken}`),
        request(app).patch('/api/admin/claims/invalid-uuid/reject').set('Authorization', `Bearer ${adminToken}`).send({}),
      ]);
      assert.strictEqual(rApprove.status, 400);
      assert.strictEqual(rReject.status, 400);
      recordPass('CLM-059', 'Security & Error Hygiene', 'invalid claim IDs return 400 Bad Request');
    } catch (e) { recordFail('CLM-059', 'Security & Error Hygiene', 'invalid claim IDs validated', e); }

    // CLM-060: invalid pagination parameters are handled gracefully
    try {
      const res = await request(app)
        .get('/api/admin/claims/pending?page=-5&pageSize=-10')
        .set('Authorization', `Bearer ${adminToken}`);
      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.body.data.page, 1, 'Negative page defaulted to 1');
      assert.strictEqual(res.body.data.pageSize, 20, 'Negative pageSize defaulted to 20');
      recordPass('CLM-060', 'Security & Error Hygiene', 'invalid pagination parameters handled safely with defaults');
    } catch (e) { recordFail('CLM-060', 'Security & Error Hygiene', 'invalid pagination handled gracefully', e); }

    // ══════════════════════════════════════════════════════════════════════
    // 8. NOTIFICATION & BUSINESS DETAILS INTEGRATION (CLM-061 – CLM-063)
    // ══════════════════════════════════════════════════════════════════════
    console.log('\n--- 8. NOTIFICATION & INTEGRATION TESTS ---');

    // CLM-061: notification stub called on approve
    try {
      const notifBiz = await createTestBusiness({ status: BusinessStatus.published, ownerId: null });
      const notifClaim = await prisma.businessClaim.create({
        data: { businessId: notifBiz, claimantId: user1Id, status: ClaimStatus.pending },
      });
      createdClaimIds.push(notifClaim.id);

      const logs = await captureStubLogs(async () => {
        await request(app)
          .patch(`/api/admin/claims/${notifClaim.id}/approve`)
          .set('Authorization', `Bearer ${adminToken}`);
      });
      assert.ok(logs.length > 0, 'Notification stub was called on approve');
      assert.ok(logs[0].includes(notifClaim.id), 'Claim ID logged in stub');
      assert.ok(logs[0].includes('approved'), 'Decision approved logged');
      recordPass('CLM-061', 'Notification & Integration', 'notification stub called on approve with correct claimId and decision');
    } catch (e) { recordFail('CLM-061', 'Notification & Integration', 'notification stub called on approve', e); }

    // CLM-062: notification stub called on reject with reason
    try {
      const notifBiz = await createTestBusiness({ status: BusinessStatus.published, ownerId: null });
      const notifClaim = await prisma.businessClaim.create({
        data: { businessId: notifBiz, claimantId: user1Id, status: ClaimStatus.pending },
      });
      createdClaimIds.push(notifClaim.id);

      const rejReason = 'Document was expired.';
      const logs = await captureStubLogs(async () => {
        await request(app)
          .patch(`/api/admin/claims/${notifClaim.id}/reject`)
          .set('Authorization', `Bearer ${adminToken}`)
          .send({ reason: rejReason });
      });
      assert.ok(logs.length > 0, 'Notification stub was called on reject');
      assert.ok(logs[0].includes(notifClaim.id), 'Claim ID logged in stub');
      assert.ok(logs[0].includes('rejected'), 'Decision rejected logged');
      assert.ok(logs[0].includes(rejReason), 'Rejection reason logged');
      recordPass('CLM-062', 'Notification & Integration', 'notification stub called on reject with reason');
    } catch (e) { recordFail('CLM-062', 'Notification & Integration', 'notification stub called on reject', e); }

    // CLM-063: business details reflect new owner after claim approved
    try {
      const intBiz = await createTestBusiness({ status: BusinessStatus.published, ownerId: null });
      const intClaim = await prisma.businessClaim.create({
        data: { businessId: intBiz, claimantId: user2Id, status: ClaimStatus.pending },
      });
      createdClaimIds.push(intClaim.id);

      await request(app)
        .patch(`/api/admin/claims/${intClaim.id}/approve`)
        .set('Authorization', `Bearer ${adminToken}`);

      // Verify user role is promoted in DB
      const dbClaimant = await prisma.user.findUnique({ where: { id: user2Id } });
      assert.strictEqual(dbClaimant?.role, 'business_owner', 'Claimant role promoted to business_owner');

      // Verify via owner endpoint (TN-009) that the claimant can now manage business as owner
      const promotedOwnerToken = makeToken(user2Id, 'business_owner');
      const ownerRes = await request(app)
        .get(`/api/owner/businesses/${intBiz}`)
        .set('Authorization', `Bearer ${promotedOwnerToken}`);
      assert.strictEqual(ownerRes.status, 200, 'Claimant can now manage business as owner');
      assert.strictEqual(ownerRes.body.data.id, intBiz);

      recordPass('CLM-063', 'Notification & Integration', 'business ownership seamlessly integrates with TN-009 owner management');
    } catch (e) { recordFail('CLM-063', 'Notification & Integration', 'owner integration verified', e); }

  } finally {
    // ── CLEANUP ──────────────────────────────────────────────────────────────────
    console.log('\n🧹 Cleaning up test data...');
    try {
      if (createdClaimIds.length > 0) {
        await prisma.adminAction.deleteMany({
          where: { targetId: { in: createdClaimIds } },
        });
        await prisma.businessClaim.deleteMany({
          where: { id: { in: createdClaimIds } },
        });
      }
      if (createdBusinessIds.length > 0) {
        await prisma.adminAction.deleteMany({
          where: { targetId: { in: createdBusinessIds } },
        });
        await prisma.businessPhoto.deleteMany({
          where: { businessId: { in: createdBusinessIds } },
        });
        await prisma.businessClaim.deleteMany({
          where: { businessId: { in: createdBusinessIds } },
        });
        await prisma.business.deleteMany({
          where: { id: { in: createdBusinessIds } },
        });
      }
      if (createdUserIds.length > 0) {
        await prisma.refreshToken.deleteMany({
          where: { userId: { in: createdUserIds } },
        });
        await prisma.user.deleteMany({
          where: { id: { in: createdUserIds } },
        });
      }
      if (testCategoryId > 0) {
        await prisma.category.deleteMany({
          where: { id: testCategoryId },
        });
      }
    } catch (cleanupErr) {
      console.error('Cleanup error:', cleanupErr);
    }
    await prisma.$disconnect();
  }

  // ── SUMMARY ──────────────────────────────────────────────────────────────────
  console.log('\n===========================================================');
  console.log('📊 TN-016 QA VERIFICATION SUMMARY  CLM-001 – CLM-063');
  console.log('===========================================================');
  const catSummary = new Map<string, { pass: number; fail: number }>();
  for (const r of results) {
    const s = catSummary.get(r.category) || { pass: 0, fail: 0 };
    if (r.status === 'PASS') s.pass++;
    else s.fail++;
    catSummary.set(r.category, s);
  }
  for (const [cat, s] of catSummary.entries()) {
    console.log(`  ${s.fail === 0 ? '✅' : '❌'} ${cat.padEnd(28)} ${s.pass}/${s.pass + s.fail}`);
  }
  const totalPassed = results.filter((r) => r.status === 'PASS').length;
  const totalFailed = results.filter((r) => r.status === 'FAIL').length;
  console.log('-----------------------------------------------------------');
  console.log(`Total Tests Executed : ${results.length}`);
  console.log(`Passed               : ${totalPassed} ✅`);
  console.log(`Failed               : ${totalFailed} ❌`);

  if (totalFailed > 0) {
    console.error('\n❌ FAILED TESTS:');
    for (const r of results.filter((r) => r.status === 'FAIL')) {
      console.error(`  - ${r.id} (${r.category}): ${r.name} -> ${r.details}`);
    }
    process.exit(1);
  } else {
    console.log('\n🎉 PASS — TN-016 Business Claiming is fully verified (CLM-001 – CLM-063)!');
  }
}

runAllClaimTests().catch((err) => {
  console.error('Fatal error running claim tests:', err);
  process.exit(1);
});
