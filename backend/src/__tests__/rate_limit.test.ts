import assert from 'assert';
// @ts-ignore
import request from 'supertest';
import express, { Response } from 'express';
import { createRateLimiter } from '../middleware/rateLimiter';
import { sendSuccess } from '../utils/response';

// Standalone Express App for Rate Limiting QA Verification
const rateApp = express();
rateApp.use(express.json());
rateApp.set('trust proxy', true);

// Configure test rate limiters with small windows & limits for fast testing
const testLoginLimiter = createRateLimiter({
  windowMs: 1000, // 1 second window for fast reset testing
  max: 3,
  message: 'Too many login attempts. Please try again later.',
  keyPrefix: 'test_login',
});

const testForgotLimiter = createRateLimiter({
  windowMs: 1000,
  max: 2,
  message: 'Too many password reset requests. Please try again later.',
  keyPrefix: 'test_forgot',
});

const testRegisterLimiter = createRateLimiter({
  windowMs: 1000,
  max: 2,
  message: 'Too many registration requests.',
  keyPrefix: 'test_reg',
});

const testResetLimiter = createRateLimiter({
  windowMs: 1000,
  max: 2,
  message: 'Too many reset attempts.',
  keyPrefix: 'test_reset',
});

const testRefreshLimiter = createRateLimiter({
  windowMs: 1000,
  max: 2,
  message: 'Too many refresh token requests.',
  keyPrefix: 'test_refresh',
});

rateApp.post('/api/auth/login', testLoginLimiter, (_req, res: Response) => {
  return sendSuccess(res, { login: true }, 'Login test handler');
});

rateApp.post('/api/auth/forgot-password', testForgotLimiter, (_req, res: Response) => {
  return sendSuccess(res, { forgot: true }, 'Forgot password handler');
});

rateApp.post('/api/auth/register', testRegisterLimiter, (_req, res: Response) => {
  return sendSuccess(res, { register: true }, 'Register handler');
});

rateApp.post('/api/auth/reset-password', testResetLimiter, (_req, res: Response) => {
  return sendSuccess(res, { reset: true }, 'Reset password handler');
});

rateApp.post('/api/auth/refresh', testRefreshLimiter, (_req, res: Response) => {
  return sendSuccess(res, { refresh: true }, 'Refresh handler');
});

async function runRateLimitTests() {
  console.log('===========================================================');
  console.log('⏱️ NFR 7.3 Rate Limiting Automated Verification Suite');
  console.log('===========================================================\n');

  try {
    // ----------------------------------------------------
    // LOGIN RATE LIMITING (RATE-001 to RATE-004)
    // ----------------------------------------------------
    console.log('1️⃣ Testing Login Rate Limiting (RATE-001 to RATE-004)...');
    const ip1 = '192.168.1.100';

    // RATE-001: Login requests below rate limit (limit = 3)
    const req1 = await request(rateApp).post('/api/auth/login').set('X-Forwarded-For', ip1);
    assert.strictEqual(req1.status, 200);

    const req2 = await request(rateApp).post('/api/auth/login').set('X-Forwarded-For', ip1);
    assert.strictEqual(req2.status, 200);

    const req3 = await request(rateApp).post('/api/auth/login').set('X-Forwarded-For', ip1);
    assert.strictEqual(req3.status, 200);
    console.log('   ✅ RATE-001: Login below rate limit passed.');

    // RATE-002 & RATE-003: Exceeding rate limit returns HTTP 429
    const req4 = await request(rateApp).post('/api/auth/login').set('X-Forwarded-For', ip1);
    assert.strictEqual(req4.status, 429);
    assert.strictEqual(req4.body.success, false);
    assert.ok(req4.body.error.includes('Too many login attempts'));
    console.log('   ✅ RATE-002 & RATE-003: Exceeding limit returns HTTP 429 Too Many Requests.');

    // Security Test: Changing request body/email/phone does NOT bypass IP rate limit
    const reqBypass = await request(rateApp).post('/api/auth/login').set('X-Forwarded-For', ip1).send({
      email: 'attacker_changing_email@example.com',
      phone: '+251999999999',
    });
    assert.strictEqual(reqBypass.status, 429);
    console.log('   ✅ SECURITY: Changing body/email/phone cannot bypass IP-bucketed rate limiter.');

    // RATE-004: Rate limit resets after window expiration (1000ms)
    await new Promise((resolve) => setTimeout(resolve, 1100));
    const reqReset = await request(rateApp).post('/api/auth/login').set('X-Forwarded-For', ip1);
    assert.strictEqual(reqReset.status, 200);
    console.log('   ✅ RATE-004: Rate limit resets after configured window expiration.');

    // ----------------------------------------------------
    // FORGOT PASSWORD RATE LIMITING (RATE-005 to RATE-007)
    // ----------------------------------------------------
    console.log('\n2️⃣ Testing Forgot Password Rate Limiting (RATE-005 to RATE-007)...');
    const ip2 = '192.168.1.101';

    // RATE-005: Below limit (limit = 2)
    const fp1 = await request(rateApp).post('/api/auth/forgot-password').set('X-Forwarded-For', ip2);
    assert.strictEqual(fp1.status, 200);
    const fp2 = await request(rateApp).post('/api/auth/forgot-password').set('X-Forwarded-For', ip2);
    assert.strictEqual(fp2.status, 200);
    console.log('   ✅ RATE-005: Forgot-password below rate limit passed.');

    // RATE-006 & RATE-007: Exceeding limit returns 429
    const fp3 = await request(rateApp).post('/api/auth/forgot-password').set('X-Forwarded-For', ip2);
    assert.strictEqual(fp3.status, 429);
    assert.ok(fp3.body.error.includes('Too many password reset requests'));
    console.log('   ✅ RATE-006 & RATE-007: Forgot-password returns HTTP 429 after exceeding limit.');

    // ----------------------------------------------------
    // REGISTER RATE LIMITING (RATE-008)
    // ----------------------------------------------------
    console.log('\n3️⃣ Testing Register Rate Limiting (RATE-008)...');
    const ip3 = '192.168.1.102';

    await request(rateApp).post('/api/auth/register').set('X-Forwarded-For', ip3);
    await request(rateApp).post('/api/auth/register').set('X-Forwarded-For', ip3);
    const regExceed = await request(rateApp).post('/api/auth/register').set('X-Forwarded-For', ip3);
    assert.strictEqual(regExceed.status, 429);
    console.log('   ✅ RATE-008: Register rate limiting returns HTTP 429 after limit.');

    // ----------------------------------------------------
    // RESET PASSWORD RATE LIMITING (RATE-009)
    // ----------------------------------------------------
    console.log('\n4️⃣ Testing Reset Password Rate Limiting (RATE-009)...');
    const ip4 = '192.168.1.103';

    await request(rateApp).post('/api/auth/reset-password').set('X-Forwarded-For', ip4);
    await request(rateApp).post('/api/auth/reset-password').set('X-Forwarded-For', ip4);
    const resetExceed = await request(rateApp).post('/api/auth/reset-password').set('X-Forwarded-For', ip4);
    assert.strictEqual(resetExceed.status, 429);
    console.log('   ✅ RATE-009: Reset-password rate limiting returns HTTP 429 after limit.');

    // ----------------------------------------------------
    // REFRESH TOKEN RATE LIMITING (RATE-010)
    // ----------------------------------------------------
    console.log('\n5️⃣ Testing Refresh Token Rate Limiting (RATE-010)...');
    const ip5 = '192.168.1.104';

    await request(rateApp).post('/api/auth/refresh').set('X-Forwarded-For', ip5);
    await request(rateApp).post('/api/auth/refresh').set('X-Forwarded-For', ip5);
    const refreshExceed = await request(rateApp).post('/api/auth/refresh').set('X-Forwarded-For', ip5);
    assert.strictEqual(refreshExceed.status, 429);
    console.log('   ✅ RATE-010: Refresh-token rate limiting returns HTTP 429 after limit.');

    console.log('\n🎉 ALL 10 RATE LIMITING AUTOMATED TESTS PASSED SUCCESSFULLY! 🚀');
  } catch (err) {
    console.error('\n❌ Rate limit test failure:', err);
    process.exit(1);
  }
}

runRateLimitTests();
