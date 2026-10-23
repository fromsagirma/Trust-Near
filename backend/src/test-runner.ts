import assert from 'assert';
import request from 'supertest';
import app from './server';
import { prisma } from './config/db';
import { checkOwnership } from './middleware/ownership';
import crypto from 'crypto';

async function runTests() {
  console.log('🧪 Starting TrustNear TN-001 & TN-TECH-005 Verification Suite...\n');

  const testEmail = `verification_${Date.now()}@example.com`;
  const testPhone = `+2519${Math.floor(10000000 + Math.random() * 90000000)}`;
  const testPassword = 'Password123!';
  let createdUserId: string = '';
  let accessToken: string = '';
  let refreshToken: string = '';

  try {
    // ----------------------------------------------------
    // 1. REGISTRATION TESTS
    // ----------------------------------------------------
    console.log('1️⃣ Testing Registration...');

    // Successful registration with email
    const regRes = await request(app).post('/api/auth/register').send({
      displayName: 'Verify User',
      email: testEmail,
      password: testPassword,
    });
    assert.strictEqual(regRes.status, 201, `Expected 201, got ${regRes.status}`);
    assert.strictEqual(regRes.body.success, true);
    assert.strictEqual(regRes.body.data.email, testEmail.toLowerCase());
    assert.strictEqual(regRes.body.data.role, 'user');
    assert.strictEqual(regRes.body.data.passwordHash, undefined);
    createdUserId = regRes.body.data.id;
    console.log('   ✅ Register with email passed.');

    // Registration with neither email nor phone -> 400
    const noContactRes = await request(app).post('/api/auth/register').send({
      displayName: 'No Contact User',
      password: testPassword,
    });
    assert.strictEqual(noContactRes.status, 400);
    console.log('   ✅ Register without email/phone rejected (400).');

    // Duplicate email -> 409
    const dupRes = await request(app).post('/api/auth/register').send({
      displayName: 'Duplicate User',
      email: testEmail,
      password: testPassword,
    });
    assert.strictEqual(dupRes.status, 409);
    console.log('   ✅ Duplicate email rejected (409).');

    // Weak password -> 400
    const weakRes = await request(app).post('/api/auth/register').send({
      displayName: 'Weak User',
      email: `weak_${Date.now()}@example.com`,
      password: '123',
    });
    assert.strictEqual(weakRes.status, 400);
    console.log('   ✅ Weak password rejected (400).');

    // ----------------------------------------------------
    // 2. LOGIN TESTS
    // ----------------------------------------------------
    console.log('\n2️⃣ Testing Login...');

    // Successful login
    const loginRes = await request(app).post('/api/auth/login').send({
      emailOrPhone: testEmail,
      password: testPassword,
    });
    assert.strictEqual(loginRes.status, 200);
    assert.strictEqual(loginRes.body.success, true);
    assert.ok(loginRes.body.data.accessToken, 'Access token missing');
    assert.ok(loginRes.body.data.refreshToken, 'Refresh token missing');
    accessToken = loginRes.body.data.accessToken;
    refreshToken = loginRes.body.data.refreshToken;
    console.log('   ✅ Login with valid credentials passed.');

    // Invalid password -> 401
    const invalidPassRes = await request(app).post('/api/auth/login').send({
      emailOrPhone: testEmail,
      password: 'WrongPassword!',
    });
    assert.strictEqual(invalidPassRes.status, 401);
    console.log('   ✅ Login with wrong password rejected (401).');

    // Non-existent user -> 401
    const ghostRes = await request(app).post('/api/auth/login').send({
      emailOrPhone: 'ghost_user_9999@example.com',
      password: testPassword,
    });
    assert.strictEqual(ghostRes.status, 401);
    console.log('   ✅ Login with non-existent user rejected (401).');

    // ----------------------------------------------------
    // 3. REFRESH TOKEN ROTATION TESTS
    // ----------------------------------------------------
    console.log('\n3️⃣ Testing Refresh Token Rotation...');

    const refreshRes = await request(app).post('/api/auth/refresh').send({
      refreshToken,
    });
    assert.strictEqual(refreshRes.status, 200);
    assert.ok(refreshRes.body.data.accessToken);
    assert.ok(refreshRes.body.data.refreshToken);
    assert.notStrictEqual(refreshRes.body.data.refreshToken, refreshToken, 'Token was not rotated');
    refreshToken = refreshRes.body.data.refreshToken; // update to new rotated token
    console.log('   ✅ Refresh token rotation passed.');

    // Revoked token reuse attempt -> 401
    const reusedRes = await request(app).post('/api/auth/refresh').send({
      refreshToken: 'stale_or_invalid_token',
    });
    assert.strictEqual(reusedRes.status, 401);
    console.log('   ✅ Invalid refresh token rejected (401).');

    // ----------------------------------------------------
    // 4. GET /api/auth/me (PROTECTED ROUTE)
    // ----------------------------------------------------
    console.log('\n4️⃣ Testing GET /api/auth/me...');

    const meRes = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${accessToken}`);
    assert.strictEqual(meRes.status, 200);
    assert.strictEqual(meRes.body.data.id, createdUserId);
    console.log('   ✅ Protected GET /me with valid token passed.');

    const noAuthRes = await request(app).get('/api/auth/me');
    assert.strictEqual(noAuthRes.status, 401);
    console.log('   ✅ GET /me without token rejected (401).');

    // ----------------------------------------------------
    // 5. PASSWORD RESET TESTS
    // ----------------------------------------------------
    console.log('\n5️⃣ Testing Password Reset Flow...');

    const forgotRes = await request(app).post('/api/auth/forgot-password').send({
      email: testEmail,
    });
    assert.strictEqual(forgotRes.status, 200);
    console.log('   ✅ Forgot-password request handled safely (200).');

    // Reset password with valid token
    const rawResetToken = crypto.randomBytes(32).toString('hex');
    const tokenHash = crypto.createHash('sha256').update(rawResetToken).digest('hex');

    await prisma.passwordResetToken.create({
      data: {
        userId: createdUserId,
        tokenHash,
        expiresAt: new Date(Date.now() + 60 * 60 * 1000),
      },
    });

    const newPass = 'UpdatedPassword99!';
    const resetRes = await request(app).post('/api/auth/reset-password').send({
      token: rawResetToken,
      newPassword: newPass,
    });
    assert.strictEqual(resetRes.status, 200);
    console.log('   ✅ Password reset with valid token passed.');

    // Verify login with new password
    const newLoginRes = await request(app).post('/api/auth/login').send({
      emailOrPhone: testEmail,
      password: newPass,
    });
    assert.strictEqual(newLoginRes.status, 200);
    console.log('   ✅ Login with new password passed.');

    // ----------------------------------------------------
    // 6. LOGOUT TESTS
    // ----------------------------------------------------
    console.log('\n6️⃣ Testing Logout...');

    const logoutRes = await request(app).post('/api/auth/logout').send({
      refreshToken,
    });
    assert.strictEqual(logoutRes.status, 200);
    console.log('   ✅ Logout request passed.');

    // ----------------------------------------------------
    // 7. RESOURCE OWNERSHIP UNIT CHECKS (TN-TECH-005)
    // ----------------------------------------------------
    console.log('\n7️⃣ Testing Resource Ownership Logic (TN-TECH-005)...');

    assert.strictEqual(checkOwnership('user-1', 'user-1', 'user'), true);
    assert.strictEqual(checkOwnership('user-1', 'user-2', 'user'), false);
    assert.strictEqual(checkOwnership('user-1', 'admin-id', 'admin'), true);
    assert.strictEqual(checkOwnership(null, 'user-1', 'user'), false);
    console.log('   ✅ Ownership checks logic passed.');

    console.log('\n🎉 ALL SECURITY & VERIFICATION TESTS PASSED SUCCESSFULLY! 🚀');
  } catch (err) {
    console.error('\n❌ Test failure:', err);
    process.exit(1);
  } finally {
    if (createdUserId) {
      await prisma.refreshToken.deleteMany({ where: { userId: createdUserId } });
      await prisma.passwordResetToken.deleteMany({ where: { userId: createdUserId } });
      await prisma.user.delete({ where: { id: createdUserId } }).catch(() => {});
    }
    await prisma.$disconnect();
  }
}

runTests();
