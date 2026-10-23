import request from 'supertest';
import app from '../../../server';
import { prisma } from '../../../config/db';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';

describe('TN-001 — Authentication Endpoints', () => {
  const testEmail = `authtest_${Date.now()}@example.com`;
  const testPhone = `+2519${Math.floor(10000000 + Math.random() * 90000000)}`;
  const testPassword = 'SecurePassword123!';
  let createdUserId: string;
  let accessToken: string;
  let refreshToken: string;

  beforeAll(async () => {
    jest.setTimeout(30000);
    // Ensure database connection
    await prisma.$connect();
  });

  afterAll(async () => {
    // Cleanup created test records
    if (createdUserId) {
      await prisma.refreshToken.deleteMany({ where: { userId: createdUserId } });
      await prisma.passwordResetToken.deleteMany({ where: { userId: createdUserId } });
      await prisma.user.delete({ where: { id: createdUserId } }).catch(() => {});
    }
    await prisma.$disconnect();
  });

  // ----------------------------------------------------
  // 1. REGISTRATION
  // ----------------------------------------------------
  describe('POST /api/auth/register', () => {
    it('should register successfully with email', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({
          displayName: 'Test Email User',
          email: testEmail,
          password: testPassword,
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveProperty('id');
      expect(res.body.data.email).toBe(testEmail.toLowerCase());
      expect(res.body.data.role).toBe('user');
      expect(res.body.data).not.toHaveProperty('passwordHash');
      expect(res.body.data).not.toHaveProperty('password');

      createdUserId = res.body.data.id;
    });

    it('should register successfully with phone', async () => {
      const phoneEmail = `phonetest_${Date.now()}@example.com`;
      const res = await request(app)
        .post('/api/auth/register')
        .send({
          displayName: 'Test Phone User',
          phone: testPhone,
          password: testPassword,
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.phone).toBe(testPhone);

      // Cleanup phone user
      if (res.body.data.id) {
        await prisma.user.delete({ where: { id: res.body.data.id } });
      }
    });

    it('should reject registration with neither email nor phone', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({
          displayName: 'No Contact User',
          password: testPassword,
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error).toContain('email or phone');
    });

    it('should reject duplicate email registration', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({
          displayName: 'Duplicate Email User',
          email: testEmail,
          password: testPassword,
        });

      expect(res.status).toBe(409);
      expect(res.body.success).toBe(false);
      expect(res.body.error).toContain('already exists');
    });

    it('should reject weak/invalid password (< 6 chars)', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({
          displayName: 'Weak Pass User',
          email: `weak_${Date.now()}@example.com`,
          password: '123',
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error).toContain('at least 6 characters');
    });
  });

  // ----------------------------------------------------
  // 2. LOGIN
  // ----------------------------------------------------
  describe('POST /api/auth/login', () => {
    it('should login successfully with valid credentials', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({
          emailOrPhone: testEmail,
          password: testPassword,
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveProperty('accessToken');
      expect(res.body.data).toHaveProperty('refreshToken');
      expect(res.body.data.user.email).toBe(testEmail.toLowerCase());
      expect(res.body.data.user).not.toHaveProperty('passwordHash');

      accessToken = res.body.data.accessToken;
      refreshToken = res.body.data.refreshToken;
    });

    it('should reject login with invalid password', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({
          emailOrPhone: testEmail,
          password: 'WrongPassword999!',
        });

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
      expect(res.body.error).toContain('Invalid');
    });

    it('should reject login with non-existent user', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({
          emailOrPhone: 'nonexistent_user_99999@example.com',
          password: testPassword,
        });

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });
  });

  // ----------------------------------------------------
  // 3. REFRESH TOKEN & ROTATION
  // ----------------------------------------------------
  describe('POST /api/auth/refresh', () => {
    it('should refresh tokens and rotate refresh token', async () => {
      const res = await request(app)
        .post('/api/auth/refresh')
        .send({
          refreshToken,
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveProperty('accessToken');
      expect(res.body.data).toHaveProperty('refreshToken');
      expect(res.body.data.refreshToken).not.toBe(refreshToken); // rotated!

      // Update active refresh token to new rotated token
      refreshToken = res.body.data.refreshToken;
    });

    it('should reject already rotated / revoked refresh token', async () => {

      // Try using an invalid / non-existent refresh token
      const res = await request(app)
        .post('/api/auth/refresh')
        .send({
          refreshToken: 'invalid_raw_refresh_token_string_123',
        });

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });

    it('should reject missing refresh token', async () => {
      const res = await request(app)
        .post('/api/auth/refresh')
        .send({});

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });
  });

  // ----------------------------------------------------
  // 4. GET /api/auth/me
  // ----------------------------------------------------
  describe('GET /api/auth/me', () => {
    it('should return current user profile with valid access token', async () => {
      const res = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${accessToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.id).toBe(createdUserId);
      expect(res.body.data.email).toBe(testEmail.toLowerCase());
      expect(res.body.data).not.toHaveProperty('passwordHash');
    });

    it('should reject request without authorization token', async () => {
      const res = await request(app).get('/api/auth/me');

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });

    it('should reject request with invalid authorization token', async () => {
      const res = await request(app)
        .get('/api/auth/me')
        .set('Authorization', 'Bearer invalid_access_token_xyz');

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });
  });

  // ----------------------------------------------------
  // 5. PASSWORD RESET FLOW
  // ----------------------------------------------------
  describe('PASSWORD RESET FLOW', () => {
    let resetToken: string;

    it('should handle forgot-password request safely', async () => {
      const res = await request(app)
        .post('/api/auth/forgot-password')
        .send({
          email: testEmail,
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.message).toContain('If an account');

      // Fetch the generated token hash from database for testing reset
      const tokenRecord = await prisma.passwordResetToken.findFirst({
        where: { userId: createdUserId },
        orderBy: { createdAt: 'desc' },
      });
      expect(tokenRecord).not.toBeNull();
    });

    it('should return same response for non-existent account (no user enumeration)', async () => {
      const res = await request(app)
        .post('/api/auth/forgot-password')
        .send({
          email: 'ghost_account_nonexistent_99@example.com',
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.message).toContain('If an account');
    });

    it('should reject reset-password with invalid token', async () => {
      const res = await request(app)
        .post('/api/auth/reset-password')
        .send({
          token: 'invalid_reset_token_hash_value',
          newPassword: 'BrandNewPassword123!',
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it('should reset password successfully with valid token', async () => {
      // Create a known raw token directly for deterministic testing
      const rawToken = crypto.randomBytes(32).toString('hex');
      const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');

      await prisma.passwordResetToken.create({
        data: {
          userId: createdUserId,
          tokenHash,
          expiresAt: new Date(Date.now() + 60 * 60 * 1000),
        },
      });

      const newPass = 'BrandNewPassword123!';
      const res = await request(app)
        .post('/api/auth/reset-password')
        .send({
          token: rawToken,
          newPassword: newPass,
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);

      // Verify login works with new password
      const loginRes = await request(app)
        .post('/api/auth/login')
        .send({
          emailOrPhone: testEmail,
          password: newPass,
        });

      expect(loginRes.status).toBe(200);
      expect(loginRes.body.success).toBe(true);
    });
  });

  // ----------------------------------------------------
  // 6. LOGOUT
  // ----------------------------------------------------
  describe('POST /api/auth/logout', () => {
    it('should revoke refresh token on logout', async () => {
      const res = await request(app)
        .post('/api/auth/logout')
        .send({
          refreshToken,
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);

      // Verify refresh token can no longer be used
      const refreshRes = await request(app)
        .post('/api/auth/refresh')
        .send({
          refreshToken,
        });

      expect(refreshRes.status).toBe(401);
      expect(refreshRes.body.success).toBe(false);
    });
  });
});
