import assert from 'assert';
// @ts-ignore
import request from 'supertest';
import express, { Response } from 'express';
import app from '../server';
import { prisma } from '../config/db';
import { authenticate, authorize, AuthRequest } from '../middleware/auth';
import { checkOwnership, requireOwnership } from '../middleware/ownership';
import { createRateLimiter } from '../middleware/rateLimiter';
import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import { Role } from '@prisma/client';

const JWT_SECRET = process.env.JWT_SECRET || 'trustnear-secret-key';

// Disable rate limiting during heavy DB tests so they do not hit default IP limits
process.env.DISABLE_RATE_LIMITING = 'true';

// Mounting mock RBAC & Ownership testing routes on app for test suite
app.get('/api/test/user-endpoint', authenticate, authorize(Role.user), (req: AuthRequest, res: Response) => {
  res.json({ success: true, message: 'User granted' });
});

app.get('/api/test/owner-endpoint', authenticate, authorize(Role.business_owner), (req: AuthRequest, res: Response) => {
  res.json({ success: true, message: 'Owner granted' });
});

app.get('/api/test/admin-endpoint', authenticate, authorize(Role.admin), (req: AuthRequest, res: Response) => {
  res.json({ success: true, message: 'Admin granted' });
});

app.get('/api/test/seed-admin-endpoint', authenticate, authorize(Role.seed_admin), (req: AuthRequest, res: Response) => {
  res.json({ success: true, message: 'Seed Admin granted' });
});

const mockBizStore: Record<string, { id: string; ownerId: string }> = {
  'biz-uuid-1': { id: 'biz-uuid-1', ownerId: 'owner-uuid-1' },
  'biz-uuid-2': { id: 'biz-uuid-2', ownerId: 'owner-uuid-2' },
};

app.patch(
  '/api/test/businesses/:id',
  authenticate,
  authorize(Role.business_owner, Role.admin),
  requireOwnership((req: AuthRequest) => mockBizStore[req.params.id]?.ownerId),
  (req: AuthRequest, res: Response) => {
    res.json({ success: true, message: 'Business updated' });
  }
);

interface TestResult {
  id: string;
  name: string;
  category: string;
  status: 'PASS' | 'FAIL';
  error?: string;
}

const testResults: TestResult[] = [];

function recordTest(id: string, name: string, category: string, fn: () => Promise<void> | void) {
  return async () => {
    try {
      await fn();
      testResults.push({ id, name, category, status: 'PASS' });
      console.log(`  ✅ [PASS] ${id}: ${name}`);
    } catch (err: any) {
      testResults.push({ id, name, category, status: 'FAIL', error: err.message || String(err) });
      console.error(`  ❌ [FAIL] ${id}: ${name} — ${err.message}`);
    }
  };
}

async function runQASuite() {
  console.log('===========================================================');
  console.log('🔒 TrustNear Security, Auth, RBAC & Rate Limiting Test Suite');
  console.log('===========================================================\n');

  const createdUserIds: string[] = [];

  const trackUser = (id: string) => {
    if (id && !createdUserIds.includes(id)) {
      createdUserIds.push(id);
    }
  };

  const testEmail1 = `qa_email1_${Date.now()}@example.com`;
  const testPhone1 = `+2519${Math.floor(10000000 + Math.random() * 90000000)}`;
  const testPassword = 'SecurePassword123!';
  let tokenUserA: string = '';
  let refreshTokenA: string = '';
  let userIdA: string = '';

  try {
    // ============================================================
    // PHASE 2 — AUTHENTICATION TESTS (REGISTER, LOGIN, ME)
    // ============================================================
    console.log('--- PHASE 2: AUTHENTICATION TESTS ---');

    await recordTest('AUTH-001', 'Register using a valid email', 'Authentication', async () => {
      const res = await request(app).post('/api/auth/register').send({
        displayName: 'QA Valid Email User',
        email: testEmail1,
        password: testPassword,
      });
      assert.strictEqual(res.status, 201);
      assert.strictEqual(res.body.success, true);
      assert.ok(res.body.data.id);
      assert.strictEqual(res.body.data.email, testEmail1.toLowerCase());
      assert.strictEqual(res.body.data.role, 'user');
      assert.strictEqual(res.body.data.password, undefined);
      assert.strictEqual(res.body.data.passwordHash, undefined);
      userIdA = res.body.data.id;
      trackUser(userIdA);
    })();

    await recordTest('AUTH-002', 'Register using a valid phone', 'Authentication', async () => {
      const phone = `+2519${Math.floor(10000000 + Math.random() * 90000000)}`;
      const res = await request(app).post('/api/auth/register').send({
        displayName: 'QA Valid Phone User',
        phone,
        password: testPassword,
      });
      assert.strictEqual(res.status, 201);
      assert.strictEqual(res.body.success, true);
      assert.strictEqual(res.body.data.phone, phone);
      trackUser(res.body.data.id);
    })();

    await recordTest('AUTH-003', 'Register using both email and phone', 'Authentication', async () => {
      const email = `qa_both_${Date.now()}@example.com`;
      const phone = `+2519${Math.floor(10000000 + Math.random() * 90000000)}`;
      const res = await request(app).post('/api/auth/register').send({
        displayName: 'QA Both Contact User',
        email,
        phone,
        password: testPassword,
      });
      assert.strictEqual(res.status, 201);
      assert.strictEqual(res.body.data.email, email.toLowerCase());
      assert.strictEqual(res.body.data.phone, phone);
      trackUser(res.body.data.id);
    })();

    await recordTest('AUTH-004', 'Register without email AND phone', 'Authentication', async () => {
      const res = await request(app).post('/api/auth/register').send({
        displayName: 'No Contact User',
        password: testPassword,
      });
      assert.strictEqual(res.status, 400);
      assert.strictEqual(res.body.success, false);
    })();

    await recordTest('AUTH-005', 'Register with invalid email format', 'Authentication', async () => {
      const res = await request(app).post('/api/auth/register').send({
        displayName: 'Invalid Email User',
        email: 'not-an-email',
        password: testPassword,
      });
      assert.strictEqual(res.status, 400);
    })();

    await recordTest('AUTH-006', 'Register with missing password', 'Authentication', async () => {
      const res = await request(app).post('/api/auth/register').send({
        displayName: 'No Pass User',
        email: `nopass_${Date.now()}@example.com`,
      });
      assert.strictEqual(res.status, 400);
    })();

    await recordTest('AUTH-007', 'Register with weak password (<6 chars)', 'Authentication', async () => {
      const res = await request(app).post('/api/auth/register').send({
        displayName: 'Weak Pass User',
        email: `weak_${Date.now()}@example.com`,
        password: '123',
      });
      assert.strictEqual(res.status, 400);
    })();

    await recordTest('AUTH-008', 'Register without displayName', 'Authentication', async () => {
      const res = await request(app).post('/api/auth/register').send({
        email: `nodisplay_${Date.now()}@example.com`,
        password: testPassword,
      });
      assert.strictEqual(res.status, 400);
    })();

    await recordTest('AUTH-009', 'Register with duplicate email', 'Authentication', async () => {
      const res = await request(app).post('/api/auth/register').send({
        displayName: 'Dup Email User',
        email: testEmail1,
        password: testPassword,
      });
      assert.strictEqual(res.status, 409);
    })();

    await recordTest('AUTH-010', 'Register with duplicate phone', 'Authentication', async () => {
      const phone = `+2519${Math.floor(10000000 + Math.random() * 90000000)}`;
      const r1 = await request(app).post('/api/auth/register').send({
        displayName: 'Phone 1',
        phone,
        password: testPassword,
      });
      trackUser(r1.body.data.id);

      const r2 = await request(app).post('/api/auth/register').send({
        displayName: 'Phone 2',
        phone,
        password: testPassword,
      });
      assert.strictEqual(r2.status, 409);
    })();

    await recordTest('AUTH-011', 'Register with case variations of same email', 'Authentication', async () => {
      const upperEmail = testEmail1.toUpperCase();
      const res = await request(app).post('/api/auth/register').send({
        displayName: 'Upper Email User',
        email: upperEmail,
        password: testPassword,
      });
      assert.strictEqual(res.status, 409);
    })();

    await recordTest('AUTH-012', 'Inspect database after registration (bcrypt hash)', 'Authentication', async () => {
      const dbUser = await prisma.user.findUnique({ where: { id: userIdA } });
      assert.ok(dbUser, 'User not found in DB');
      assert.notStrictEqual(dbUser.passwordHash, testPassword);
      assert.ok(dbUser.passwordHash.startsWith('$2a$') || dbUser.passwordHash.startsWith('$2b$'), 'Not a valid bcrypt hash');
    })();

    await recordTest('AUTH-013', 'Inspect registration response for sensitive fields', 'Authentication', async () => {
      const res = await request(app).post('/api/auth/register').send({
        displayName: 'Clean Response User',
        email: `clean_${Date.now()}@example.com`,
        password: testPassword,
      });
      trackUser(res.body.data.id);
      assert.strictEqual(res.body.data.password, undefined);
      assert.strictEqual(res.body.data.passwordHash, undefined);
      assert.strictEqual(res.body.data.refreshToken, undefined);
    })();

    await recordTest('AUTH-014', 'Login with valid email and password', 'Authentication', async () => {
      const res = await request(app).post('/api/auth/login').send({
        emailOrPhone: testEmail1,
        password: testPassword,
      });
      assert.strictEqual(res.status, 200);
      assert.ok(res.body.data.accessToken);
      assert.ok(res.body.data.refreshToken);
      tokenUserA = res.body.data.accessToken;
      refreshTokenA = res.body.data.refreshToken;
    })();

    await recordTest('AUTH-015', 'Login with valid phone and password', 'Authentication', async () => {
      const phone = `+2519${Math.floor(10000000 + Math.random() * 90000000)}`;
      const reg = await request(app).post('/api/auth/register').send({
        displayName: 'Phone Login User',
        phone,
        password: testPassword,
      });
      trackUser(reg.body.data.id);

      const res = await request(app).post('/api/auth/login').send({
        emailOrPhone: phone,
        password: testPassword,
      });
      assert.strictEqual(res.status, 200);
      assert.ok(res.body.data.accessToken);
    })();

    await recordTest('AUTH-016', 'Login with incorrect password', 'Authentication', async () => {
      const res = await request(app).post('/api/auth/login').send({
        emailOrPhone: testEmail1,
        password: 'WrongPassword999!',
      });
      assert.strictEqual(res.status, 401);
    })();

    await recordTest('AUTH-017', 'Login with nonexistent email', 'Authentication', async () => {
      const res = await request(app).post('/api/auth/login').send({
        emailOrPhone: 'ghost_email_9999@example.com',
        password: testPassword,
      });
      assert.strictEqual(res.status, 401);
    })();

    await recordTest('AUTH-018', 'Login with nonexistent phone', 'Authentication', async () => {
      const res = await request(app).post('/api/auth/login').send({
        emailOrPhone: '+251999999999',
        password: testPassword,
      });
      assert.strictEqual(res.status, 401);
    })();

    await recordTest('AUTH-019', 'Login without identifier', 'Authentication', async () => {
      const res = await request(app).post('/api/auth/login').send({
        password: testPassword,
      });
      assert.strictEqual(res.status, 400);
    })();

    await recordTest('AUTH-020', 'Login without password', 'Authentication', async () => {
      const res = await request(app).post('/api/auth/login').send({
        emailOrPhone: testEmail1,
      });
      assert.strictEqual(res.status, 400);
    })();

    await recordTest('AUTH-021', 'Decode access JWT and verify minimal payload', 'Authentication', async () => {
      const decoded: any = jwt.verify(tokenUserA, JWT_SECRET);
      assert.strictEqual(decoded.id, userIdA);
      assert.strictEqual(decoded.role, 'user');
      assert.ok(decoded.exp, 'Expiration missing in JWT');
      assert.strictEqual(decoded.password, undefined);
      assert.strictEqual(decoded.passwordHash, undefined);
    })();

    await recordTest('AUTH-022', 'Call GET /api/auth/me with valid access token', 'Authentication', async () => {
      const res = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${tokenUserA}`);
      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.body.data.id, userIdA);
    })();

    await recordTest('AUTH-023', 'Call /me without token', 'Authentication', async () => {
      const res = await request(app).get('/api/auth/me');
      assert.strictEqual(res.status, 401);
    })();

    await recordTest('AUTH-024', 'Call /me with malformed token', 'Authentication', async () => {
      const res = await request(app)
        .get('/api/auth/me')
        .set('Authorization', 'Bearer not-a-valid-jwt');
      assert.strictEqual(res.status, 401);
    })();

    await recordTest('AUTH-025', 'Call /me with invalid JWT signature', 'Authentication', async () => {
      const fakeToken = jwt.sign({ id: userIdA, role: 'user' }, 'WRONG_SECRET');
      const res = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${fakeToken}`);
      assert.strictEqual(res.status, 401);
    })();

    await recordTest('AUTH-026', 'Call /me with expired JWT', 'Authentication', async () => {
      const expiredToken = jwt.sign({ id: userIdA, role: 'user' }, JWT_SECRET, { expiresIn: '-1s' });
      const res = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${expiredToken}`);
      assert.strictEqual(res.status, 401);
    })();

    await recordTest('AUTH-027', 'Call /me with tampered JWT payload', 'Authentication', async () => {
      const parts = tokenUserA.split('.');
      const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString());
      payload.role = 'admin';
      const tamperedPayload = Buffer.from(JSON.stringify(payload)).toString('base64url');
      const tamperedToken = `${parts[0]}.${tamperedPayload}.${parts[2]}`;

      const res = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${tamperedToken}`);
      assert.strictEqual(res.status, 401);
    })();

    await recordTest('AUTH-028', 'Verify /me response contains no sensitive secrets', 'Authentication', async () => {
      const res = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${tokenUserA}`);
      assert.strictEqual(res.body.data.password, undefined);
      assert.strictEqual(res.body.data.passwordHash, undefined);
      assert.strictEqual(res.body.data.refreshToken, undefined);
      assert.strictEqual(res.body.data.tokenHash, undefined);
    })();

    // ============================================================
    // PHASE 3 — REFRESH TOKEN TESTS
    // ============================================================
    console.log('\n--- PHASE 3: REFRESH TOKEN TESTS ---');

    let tokenB_refresh: string = '';

    await recordTest('AUTH-029', 'Login and obtain Refresh Token A', 'Refresh Token', async () => {
      const res = await request(app).post('/api/auth/login').send({
        emailOrPhone: testEmail1,
        password: testPassword,
      });
      assert.strictEqual(res.status, 200);
      tokenB_refresh = res.body.data.refreshToken;
      assert.ok(tokenB_refresh);
    })();

    let tokenC_refresh: string = '';
    await recordTest('AUTH-030', 'Use Refresh Token A (generates new pair)', 'Refresh Token', async () => {
      const res = await request(app).post('/api/auth/refresh').send({
        refreshToken: tokenB_refresh,
      });
      assert.strictEqual(res.status, 200);
      assert.ok(res.body.data.accessToken);
      assert.ok(res.body.data.refreshToken);
      assert.notStrictEqual(res.body.data.refreshToken, tokenB_refresh);
      tokenC_refresh = res.body.data.refreshToken;
    })();

    await recordTest('AUTH-031', 'Try to use Refresh Token A AGAIN after rotation (Re-use Protection)', 'Refresh Token', async () => {
      const res = await request(app).post('/api/auth/refresh').send({
        refreshToken: tokenB_refresh,
      });
      assert.strictEqual(res.status, 401);
      assert.strictEqual(res.body.success, false);
    })();

    await recordTest('AUTH-032', 'Use new Refresh Token B (rotated token)', 'Refresh Token', async () => {
      const res = await request(app).post('/api/auth/refresh').send({
        refreshToken: tokenC_refresh,
      });
      assert.strictEqual(res.status, 200);
      assert.ok(res.body.data.accessToken);
    })();

    await recordTest('AUTH-033', 'Use an invalid random refresh token', 'Refresh Token', async () => {
      const res = await request(app).post('/api/auth/refresh').send({
        refreshToken: 'invalid_random_refresh_token_999',
      });
      assert.strictEqual(res.status, 401);
    })();

    await recordTest('AUTH-034', 'Use an expired refresh token', 'Refresh Token', async () => {
      const expiredRaw = crypto.randomBytes(32).toString('hex');
      const hash = crypto.createHash('sha256').update(expiredRaw).digest('hex');
      await prisma.refreshToken.create({
        data: {
          userId: userIdA,
          tokenHash: hash,
          expiresAt: new Date(Date.now() - 1000),
        },
      });

      const res = await request(app).post('/api/auth/refresh').send({
        refreshToken: expiredRaw,
      });
      assert.strictEqual(res.status, 401);
    })();

    await recordTest('AUTH-035', 'Use a revoked refresh token', 'Refresh Token', async () => {
      const revokedRaw = crypto.randomBytes(32).toString('hex');
      const hash = crypto.createHash('sha256').update(revokedRaw).digest('hex');
      await prisma.refreshToken.create({
        data: {
          userId: userIdA,
          tokenHash: hash,
          expiresAt: new Date(Date.now() + 60000),
          revokedAt: new Date(),
        },
      });

      const res = await request(app).post('/api/auth/refresh').send({
        refreshToken: revokedRaw,
      });
      assert.strictEqual(res.status, 401);
    })();

    await recordTest('AUTH-036', 'Tamper with refresh token', 'Refresh Token', async () => {
      const res = await request(app).post('/api/auth/refresh').send({
        refreshToken: tokenC_refresh + '_tampered',
      });
      assert.strictEqual(res.status, 401);
    })();

    await recordTest('AUTH-037', 'Inspect DB: Refresh token stored as hash (raw not in DB)', 'Refresh Token', async () => {
      const record = await prisma.refreshToken.findFirst({ where: { userId: userIdA } });
      assert.ok(record);
      assert.notStrictEqual(record.tokenHash, tokenC_refresh);
      assert.strictEqual(record.tokenHash.length, 64);
    })();

    // ============================================================
    // PHASE 4 — LOGOUT TESTS
    // ============================================================
    console.log('\n--- PHASE 4: LOGOUT TESTS ---');

    let logoutRefreshToken: string = '';
    await recordTest('AUTH-038', 'Login to obtain refresh token for logout test', 'Logout', async () => {
      const res = await request(app).post('/api/auth/login').send({
        emailOrPhone: testEmail1,
        password: testPassword,
      });
      assert.strictEqual(res.status, 200);
      logoutRefreshToken = res.body.data.refreshToken;
    })();

    await recordTest('AUTH-039', 'Logout using the refresh token', 'Logout', async () => {
      const res = await request(app).post('/api/auth/logout').send({
        refreshToken: logoutRefreshToken,
      });
      assert.strictEqual(res.status, 200);
    })();

    await recordTest('AUTH-040', 'Try using same refresh token after logout', 'Logout', async () => {
      const res = await request(app).post('/api/auth/refresh').send({
        refreshToken: logoutRefreshToken,
      });
      assert.strictEqual(res.status, 401);
    })();

    await recordTest('AUTH-041', 'Inspect DB: Verify refresh token revoked after logout', 'Logout', async () => {
      const hash = crypto.createHash('sha256').update(logoutRefreshToken).digest('hex');
      const record = await prisma.refreshToken.findUnique({ where: { tokenHash: hash } });
      assert.ok(record);
      assert.ok(record.revokedAt);
    })();

    await recordTest('AUTH-042', 'Logout with invalid token does not crash server', 'Logout', async () => {
      const res = await request(app).post('/api/auth/logout').send({
        refreshToken: 'invalid_token_123',
      });
      assert.strictEqual(res.status, 200);
    })();

    // ============================================================
    // PHASE 5 — PASSWORD RESET TESTS
    // ============================================================
    console.log('\n--- PHASE 5: PASSWORD RESET TESTS ---');

    await recordTest('AUTH-043', 'Forgot password using existing account', 'Password Reset', async () => {
      const res = await request(app).post('/api/auth/forgot-password').send({
        email: testEmail1,
      });
      assert.strictEqual(res.status, 200);
      assert.ok(res.body.message.includes('If an account'));
    })();

    await recordTest('AUTH-044', 'Forgot password using nonexistent account (no account enumeration)', 'Password Reset', async () => {
      const res = await request(app).post('/api/auth/forgot-password').send({
        email: 'nonexistent_account_999@example.com',
      });
      assert.strictEqual(res.status, 200);
      assert.ok(res.body.message.includes('If an account'));
    })();

    let rawResetToken: string = '';
    await recordTest('AUTH-045', 'Generate reset token and inspect database storage (hashed)', 'Password Reset', async () => {
      rawResetToken = crypto.randomBytes(32).toString('hex');
      const tokenHash = crypto.createHash('sha256').update(rawResetToken).digest('hex');
      await prisma.passwordResetToken.create({
        data: {
          userId: userIdA,
          tokenHash,
          expiresAt: new Date(Date.now() + 60 * 60 * 1000),
        },
      });

      const dbRecord = await prisma.passwordResetToken.findUnique({ where: { tokenHash } });
      assert.ok(dbRecord);
      assert.strictEqual(dbRecord.tokenHash, tokenHash);
      assert.notStrictEqual(dbRecord.tokenHash, rawResetToken);
    })();

    await recordTest('AUTH-047', 'Reset password using invalid token', 'Password Reset', async () => {
      const res = await request(app).post('/api/auth/reset-password').send({
        token: 'invalid_reset_token_string',
        newPassword: 'BrandNewPassword123!',
      });
      assert.strictEqual(res.status, 400);
    })();

    await recordTest('AUTH-048', 'Reset password using expired token', 'Password Reset', async () => {
      const expRaw = crypto.randomBytes(32).toString('hex');
      const expHash = crypto.createHash('sha256').update(expRaw).digest('hex');
      await prisma.passwordResetToken.create({
        data: {
          userId: userIdA,
          tokenHash: expHash,
          expiresAt: new Date(Date.now() - 1000),
        },
      });

      const res = await request(app).post('/api/auth/reset-password').send({
        token: expRaw,
        newPassword: 'BrandNewPassword123!',
      });
      assert.strictEqual(res.status, 400);
    })();

    const newPass = 'BrandNewPassword123!';
    await recordTest('AUTH-046', 'Reset password using valid token', 'Password Reset', async () => {
      const res = await request(app).post('/api/auth/reset-password').send({
        token: rawResetToken,
        newPassword: newPass,
      });
      assert.strictEqual(res.status, 200);
    })();

    await recordTest('AUTH-049', 'Reuse reset token after successful reset', 'Password Reset', async () => {
      const res = await request(app).post('/api/auth/reset-password').send({
        token: rawResetToken,
        newPassword: 'AnotherNewPassword123!',
      });
      assert.strictEqual(res.status, 400);
    })();

    await recordTest('AUTH-050', 'Login with old password after reset fails', 'Password Reset', async () => {
      const res = await request(app).post('/api/auth/login').send({
        emailOrPhone: testEmail1,
        password: testPassword,
      });
      assert.strictEqual(res.status, 401);
    })();

    await recordTest('AUTH-051', 'Login with new password after reset succeeds', 'Password Reset', async () => {
      const res = await request(app).post('/api/auth/login').send({
        emailOrPhone: testEmail1,
        password: newPass,
      });
      assert.strictEqual(res.status, 200);
    })();

    await recordTest('AUTH-052', 'Verify password remains bcrypt hashed in DB after reset', 'Password Reset', async () => {
      const dbUser = await prisma.user.findUnique({ where: { id: userIdA } });
      assert.ok(dbUser);
      assert.notStrictEqual(dbUser.passwordHash, newPass);
      assert.ok(dbUser.passwordHash.startsWith('$2a$') || dbUser.passwordHash.startsWith('$2b$'));
    })();

    await recordTest('AUTH-053', 'Verify old refresh tokens revoked after password reset', 'Password Reset', async () => {
      const activeTokens = await prisma.refreshToken.findMany({
        where: { userId: userIdA, revokedAt: null },
      });
      assert.strictEqual(activeTokens.length, 1);
    })();

    // ============================================================
    // PHASE 6 & 7 — AUTHORIZATION & RBAC TESTS
    // ============================================================
    console.log('\n--- PHASE 6 & 7: AUTHORIZATION & RBAC TESTS ---');

    const validUserUuid = crypto.randomUUID();
    const validOwnerUuid = crypto.randomUUID();
    const validAdminUuid = crypto.randomUUID();
    const validSeedAdminUuid = crypto.randomUUID();

    const tUser = jwt.sign({ id: validUserUuid, role: Role.user }, JWT_SECRET, { expiresIn: '15m' });
    const tOwner = jwt.sign({ id: validOwnerUuid, role: Role.business_owner }, JWT_SECRET, { expiresIn: '15m' });
    const tAdmin = jwt.sign({ id: validAdminUuid, role: Role.admin }, JWT_SECRET, { expiresIn: '15m' });
    const tSeedAdmin = jwt.sign({ id: validSeedAdminUuid, role: Role.seed_admin }, JWT_SECRET, { expiresIn: '15m' });

    await recordTest('RBAC-001', 'authenticate(): Valid access token reaches req.user', 'RBAC', async () => {
      const res = await request(app)
        .get('/api/test/user-endpoint')
        .set('Authorization', `Bearer ${tUser}`);
      assert.strictEqual(res.status, 200);
    })();

    await recordTest('RBAC-008', 'User role accesses user-authorized endpoint -> 200 OK', 'RBAC', async () => {
      const res = await request(app)
        .get('/api/test/user-endpoint')
        .set('Authorization', `Bearer ${tUser}`);
      assert.strictEqual(res.status, 200);
    })();

    await recordTest('RBAC-009', 'User role accesses business-owner endpoint -> 403 Forbidden', 'RBAC', async () => {
      const res = await request(app)
        .get('/api/test/owner-endpoint')
        .set('Authorization', `Bearer ${tUser}`);
      assert.strictEqual(res.status, 403);
    })();

    await recordTest('RBAC-010', 'User role accesses admin endpoint -> 403 Forbidden', 'RBAC', async () => {
      const res = await request(app)
        .get('/api/test/admin-endpoint')
        .set('Authorization', `Bearer ${tUser}`);
      assert.strictEqual(res.status, 403);
    })();

    await recordTest('RBAC-011', 'User role accesses seed-admin endpoint -> 403 Forbidden', 'RBAC', async () => {
      const res = await request(app)
        .get('/api/test/seed-admin-endpoint')
        .set('Authorization', `Bearer ${tUser}`);
      assert.strictEqual(res.status, 403);
    })();

    await recordTest('RBAC-012', 'Business owner accesses business-owner endpoint -> 200 OK', 'RBAC', async () => {
      const res = await request(app)
        .get('/api/test/owner-endpoint')
        .set('Authorization', `Bearer ${tOwner}`);
      assert.strictEqual(res.status, 200);
    })();

    await recordTest('RBAC-013', 'Business owner accesses admin endpoint -> 403 Forbidden', 'RBAC', async () => {
      const res = await request(app)
        .get('/api/test/admin-endpoint')
        .set('Authorization', `Bearer ${tOwner}`);
      assert.strictEqual(res.status, 403);
    })();

    await recordTest('RBAC-014', 'Admin accesses admin endpoint -> 200 OK', 'RBAC', async () => {
      const res = await request(app)
        .get('/api/test/admin-endpoint')
        .set('Authorization', `Bearer ${tAdmin}`);
      assert.strictEqual(res.status, 200);
    })();

    await recordTest('RBAC-015', 'Normal user accesses admin endpoint -> 403 Forbidden', 'RBAC', async () => {
      const res = await request(app)
        .get('/api/test/admin-endpoint')
        .set('Authorization', `Bearer ${tUser}`);
      assert.strictEqual(res.status, 403);
    })();

    await recordTest('RBAC-016', 'Seed admin accesses seed-admin endpoint -> 200 OK', 'RBAC', async () => {
      const res = await request(app)
        .get('/api/test/seed-admin-endpoint')
        .set('Authorization', `Bearer ${tSeedAdmin}`);
      assert.strictEqual(res.status, 200);
    })();

    await recordTest('RBAC-017', 'Seed admin permissions are not unrestricted (accessing user route -> 403)', 'RBAC', async () => {
      const res = await request(app)
        .get('/api/test/user-endpoint')
        .set('Authorization', `Bearer ${tSeedAdmin}`);
      assert.strictEqual(res.status, 403);
    })();

    // ============================================================
    // PHASE 8 & 9 — ROLE ESCALATION & MASS ASSIGNMENT TESTS
    // ============================================================
    console.log('\n--- PHASE 8 & 9: ROLE ESCALATION & MASS ASSIGNMENT ---');

    await recordTest('RBAC-018', 'Attempt registering with role=admin in payload -> MUST remain user', 'Mass Assignment', async () => {
      const res = await request(app).post('/api/auth/register').send({
        displayName: 'Attacker Admin',
        email: `attacker_admin_${Date.now()}@example.com`,
        password: testPassword,
        role: 'admin',
      });
      assert.strictEqual(res.status, 201);
      assert.strictEqual(res.body.data.role, 'user');
      trackUser(res.body.data.id);
    })();

    await recordTest('RBAC-019', 'Attempt registering with role=seed_admin in payload -> MUST remain user', 'Mass Assignment', async () => {
      const res = await request(app).post('/api/auth/register').send({
        displayName: 'Attacker Seed Admin',
        email: `attacker_seed_${Date.now()}@example.com`,
        password: testPassword,
        role: 'seed_admin',
      });
      assert.strictEqual(res.status, 201);
      assert.strictEqual(res.body.data.role, 'user');
      trackUser(res.body.data.id);
    })();

    await recordTest('RBAC-MASS', 'Attempt mass assignment with isAdmin: true, isVerified: true', 'Mass Assignment', async () => {
      const res = await request(app).post('/api/auth/register').send({
        displayName: 'Mass Assignment Attacker',
        email: `mass_${Date.now()}@example.com`,
        password: testPassword,
        role: 'admin',
        isAdmin: true,
        isVerified: true,
      });
      assert.strictEqual(res.status, 201);
      assert.strictEqual(res.body.data.role, 'user');
      assert.strictEqual(res.body.data.isAdmin, undefined);
      trackUser(res.body.data.id);
    })();

    await recordTest('RBAC-022', 'Modify JWT payload manually from role=user to role=admin -> 401', 'Role Escalation', async () => {
      const parts = tUser.split('.');
      const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString());
      payload.role = 'admin';
      const tamperedPayload = Buffer.from(JSON.stringify(payload)).toString('base64url');
      const tamperedToken = `${parts[0]}.${tamperedPayload}.${parts[2]}`;

      const res = await request(app)
        .get('/api/test/admin-endpoint')
        .set('Authorization', `Bearer ${tamperedToken}`);
      assert.strictEqual(res.status, 401);
    })();

    // ============================================================
    // PHASE 10 & 11 — OWNERSHIP & IDOR TESTS
    // ============================================================
    console.log('\n--- PHASE 10 & 11: OWNERSHIP & IDOR TESTS ---');

    const tOwner1 = jwt.sign({ id: 'owner-uuid-1', role: Role.business_owner }, JWT_SECRET, { expiresIn: '15m' });
    const tOwner2 = jwt.sign({ id: 'owner-uuid-2', role: Role.business_owner }, JWT_SECRET, { expiresIn: '15m' });

    await recordTest('OWN-001', 'User A (Owner) accesses/updates Business A -> 200 Allowed', 'Ownership', async () => {
      const res = await request(app)
        .patch('/api/test/businesses/biz-uuid-1')
        .set('Authorization', `Bearer ${tOwner1}`);
      assert.strictEqual(res.status, 200);
    })();

    await recordTest('OWN-004', 'User A (Owner) accesses/updates Business B -> 403 Forbidden (IDOR Blocked)', 'Ownership', async () => {
      const res = await request(app)
        .patch('/api/test/businesses/biz-uuid-2')
        .set('Authorization', `Bearer ${tOwner1}`);
      assert.strictEqual(res.status, 403);
    })();

    await recordTest('OWN-ADMIN', 'Admin accesses/updates Business A -> 200 Allowed (Admin Bypass)', 'Ownership', async () => {
      const res = await request(app)
        .patch('/api/test/businesses/biz-uuid-1')
        .set('Authorization', `Bearer ${tAdmin}`);
      assert.strictEqual(res.status, 200);
    })();

    // ============================================================
    // PHASE 12 & 13 — 401 VS 403 & SENSITIVE DATA EXPOSURE
    // ============================================================
    console.log('\n--- PHASE 12 & 13: 401 VS 403 & SENSITIVE DATA EXPOSURE ---');

    await recordTest('PHASE-12-401', 'Unauthenticated request returns 401', 'HTTP Status', async () => {
      const res = await request(app).get('/api/auth/me');
      assert.strictEqual(res.status, 401);
    })();

    await recordTest('PHASE-12-403', 'Authenticated request with forbidden role returns 403', 'HTTP Status', async () => {
      const res = await request(app)
        .get('/api/test/admin-endpoint')
        .set('Authorization', `Bearer ${tUser}`);
      assert.strictEqual(res.status, 403);
    })();

    await recordTest('PHASE-13-EXPOSURE', 'Auth responses never expose DB connection strings or JWT secrets', 'Security', async () => {
      const res = await request(app).post('/api/auth/login').send({
        emailOrPhone: testEmail1,
        password: newPass,
      });
      const str = JSON.stringify(res.body);
      assert.strictEqual(str.includes(JWT_SECRET), false);
      assert.strictEqual(str.includes('postgresql://'), false);
    })();

    // ============================================================
    // RATE LIMITING TESTS (RATE-001 to RATE-010) — NFR 7.3
    // ============================================================
    console.log('\n--- NFR 7.3 RATE LIMITING TESTS (RATE-001 to RATE-010) ---');

    // Enable rate limiters specifically for these tests
    process.env.DISABLE_RATE_LIMITING = 'false';

    const rateApp = express();
    rateApp.use(express.json());
    rateApp.set('trust proxy', true);

    const testLoginLimiter = createRateLimiter({ windowMs: 1000, max: 3, keyPrefix: 'rl_qa_login' });
    const testForgotLimiter = createRateLimiter({ windowMs: 1000, max: 2, keyPrefix: 'rl_qa_forgot' });
    const testRegLimiter = createRateLimiter({ windowMs: 1000, max: 2, keyPrefix: 'rl_qa_reg' });
    const testResetLimiter = createRateLimiter({ windowMs: 1000, max: 2, keyPrefix: 'rl_qa_reset' });
    const testRefreshLimiter = createRateLimiter({ windowMs: 1000, max: 2, keyPrefix: 'rl_qa_refresh' });

    rateApp.post('/api/auth/login', testLoginLimiter, (_req, res) => res.json({ success: true }));
    rateApp.post('/api/auth/forgot-password', testForgotLimiter, (_req, res) => res.json({ success: true }));
    rateApp.post('/api/auth/register', testRegLimiter, (_req, res) => res.json({ success: true }));
    rateApp.post('/api/auth/reset-password', testResetLimiter, (_req, res) => res.json({ success: true }));
    rateApp.post('/api/auth/refresh', testRefreshLimiter, (_req, res) => res.json({ success: true }));

    const rateIp = '10.0.0.99';

    await recordTest('RATE-001', 'Login requests below rate limit are accepted', 'Rate Limiting', async () => {
      const r1 = await request(rateApp).post('/api/auth/login').set('X-Forwarded-For', rateIp);
      const r2 = await request(rateApp).post('/api/auth/login').set('X-Forwarded-For', rateIp);
      const r3 = await request(rateApp).post('/api/auth/login').set('X-Forwarded-For', rateIp);
      assert.strictEqual(r1.status, 200);
      assert.strictEqual(r2.status, 200);
      assert.strictEqual(r3.status, 200);
    })();

    await recordTest('RATE-002', 'Login request exceeding rate limit returns 429', 'Rate Limiting', async () => {
      const r4 = await request(rateApp).post('/api/auth/login').set('X-Forwarded-For', rateIp);
      assert.strictEqual(r4.status, 429);
    })();

    await recordTest('RATE-003', 'Login returns HTTP 429 Too Many Requests response payload', 'Rate Limiting', async () => {
      const r5 = await request(rateApp).post('/api/auth/login').set('X-Forwarded-For', rateIp);
      assert.strictEqual(r5.status, 429);
      assert.strictEqual(r5.body.success, false);
      assert.ok(r5.body.error.includes('Too many'));
    })();

    await recordTest('RATE-004', 'Login rate limit resets after configured window expiration', 'Rate Limiting', async () => {
      await new Promise((resolve) => setTimeout(resolve, 1100)); // Wait for 1s window reset
      const rReset = await request(rateApp).post('/api/auth/login').set('X-Forwarded-For', rateIp);
      assert.strictEqual(rReset.status, 200);
    })();

    const rateIp2 = '10.0.0.100';
    await recordTest('RATE-005', 'Forgot-password below rate limit is accepted', 'Rate Limiting', async () => {
      const r1 = await request(rateApp).post('/api/auth/forgot-password').set('X-Forwarded-For', rateIp2);
      const r2 = await request(rateApp).post('/api/auth/forgot-password').set('X-Forwarded-For', rateIp2);
      assert.strictEqual(r1.status, 200);
      assert.strictEqual(r2.status, 200);
    })();

    await recordTest('RATE-006', 'Forgot-password exceeding rate limit returns 429', 'Rate Limiting', async () => {
      const r3 = await request(rateApp).post('/api/auth/forgot-password').set('X-Forwarded-For', rateIp2);
      assert.strictEqual(r3.status, 429);
    })();

    await recordTest('RATE-007', 'Forgot-password returns HTTP 429 response', 'Rate Limiting', async () => {
      const r4 = await request(rateApp).post('/api/auth/forgot-password').set('X-Forwarded-For', rateIp2);
      assert.strictEqual(r4.status, 429);
      assert.strictEqual(r4.body.success, false);
    })();

    const rateIp3 = '10.0.0.101';
    await recordTest('RATE-008', 'Register rate limiting returns 429 when limit exceeded', 'Rate Limiting', async () => {
      await request(rateApp).post('/api/auth/register').set('X-Forwarded-For', rateIp3);
      await request(rateApp).post('/api/auth/register').set('X-Forwarded-For', rateIp3);
      const rExceed = await request(rateApp).post('/api/auth/register').set('X-Forwarded-For', rateIp3);
      assert.strictEqual(rExceed.status, 429);
    })();

    const rateIp4 = '10.0.0.102';
    await recordTest('RATE-009', 'Reset-password rate limiting returns 429 when limit exceeded', 'Rate Limiting', async () => {
      await request(rateApp).post('/api/auth/reset-password').set('X-Forwarded-For', rateIp4);
      await request(rateApp).post('/api/auth/reset-password').set('X-Forwarded-For', rateIp4);
      const rExceed = await request(rateApp).post('/api/auth/reset-password').set('X-Forwarded-For', rateIp4);
      assert.strictEqual(rExceed.status, 429);
    })();

    const rateIp5 = '10.0.0.103';
    await recordTest('RATE-010', 'Refresh-token rate limiting returns 429 when limit exceeded', 'Rate Limiting', async () => {
      await request(rateApp).post('/api/auth/refresh').set('X-Forwarded-For', rateIp5);
      await request(rateApp).post('/api/auth/refresh').set('X-Forwarded-For', rateIp5);
      const rExceed = await request(rateApp).post('/api/auth/refresh').set('X-Forwarded-For', rateIp5);
      assert.strictEqual(rExceed.status, 429);
    })();

    console.log('\n===========================================================');
    console.log('📊 QA VERIFICATION SUMMARY');
    console.log('===========================================================');

    const total = testResults.length;
    const passed = testResults.filter((t) => t.status === 'PASS').length;
    const failed = testResults.filter((t) => t.status === 'FAIL').length;

    console.log(`Total Tests Executed : ${total}`);
    console.log(`Passed               : ${passed} ✅`);
    console.log(`Failed               : ${failed} ❌`);

    if (failed > 0) {
      console.error('\n❌ FAILED TESTS DETAILED REPORT:');
      testResults
        .filter((t) => t.status === 'FAIL')
        .forEach((t) => {
          console.error(`  - ${t.id} (${t.name}): ${t.error}`);
        });
      process.exit(1);
    } else {
      console.log('\n🎉 PASS — TN-001 and TN-TECH-005 are fully verified with 100% test pass rate!');
    }
  } catch (globalErr) {
    console.error('\n💥 Unexpected global error during test execution:', globalErr);
    process.exit(1);
  } finally {
    for (const uid of createdUserIds) {
      await prisma.refreshToken.deleteMany({ where: { userId: uid } }).catch(() => {});
      await prisma.passwordResetToken.deleteMany({ where: { userId: uid } }).catch(() => {});
      await prisma.user.delete({ where: { id: uid } }).catch(() => {});
    }
    await prisma.$disconnect();
  }
}

runQASuite();
