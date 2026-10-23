import request from 'supertest';
import app from '../../../server';
import { prisma } from '../../../config/db';

describe('POST /api/auth/change-password Integration Tests', () => {
  jest.setTimeout(60000);

  const testEmail = `pwdchange_${Date.now()}@example.com`;
  const initialPassword = 'OldPassword123!';
  const newPassword = 'NewPassword456!';

  let userId: string;
  let userToken: string;

  beforeAll(async () => {
    // 1. Register user
    await request(app)
      .post('/api/auth/register')
      .send({ displayName: 'Password User', email: testEmail, password: initialPassword });

    // 2. Login to get token
    const loginRes = await request(app)
      .post('/api/auth/login')
      .send({ emailOrPhone: testEmail, password: initialPassword });

    userId = loginRes.body.data.user.id;
    userToken = loginRes.body.data.accessToken;
  });

  afterAll(async () => {
    if (userId) {
      await prisma.refreshToken.deleteMany({ where: { userId } });
      await prisma.user.delete({ where: { id: userId } }).catch(() => {});
    }
  });

  it('should reject unauthenticated request with 401', async () => {
    const res = await request(app)
      .post('/api/auth/change-password')
      .send({ currentPassword: initialPassword, newPassword });

    expect(res.status).toBe(401);
  });

  it('should reject incorrect current password with 400', async () => {
    const res = await request(app)
      .post('/api/auth/change-password')
      .set('Authorization', `Bearer ${userToken}`)
      .send({ currentPassword: 'WrongPassword999!', newPassword });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.error).toContain('Incorrect current password.');
  });

  it('should successfully change password with correct current password', async () => {
    const res = await request(app)
      .post('/api/auth/change-password')
      .set('Authorization', `Bearer ${userToken}`)
      .send({ currentPassword: initialPassword, newPassword });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);

    // Verify login works with NEW password
    const newLoginRes = await request(app)
      .post('/api/auth/login')
      .send({ emailOrPhone: testEmail, password: newPassword });

    expect(newLoginRes.status).toBe(200);
    expect(newLoginRes.body.success).toBe(true);

    // Verify login fails with OLD password
    const oldLoginRes = await request(app)
      .post('/api/auth/login')
      .send({ emailOrPhone: testEmail, password: initialPassword });

    expect(oldLoginRes.status).toBe(401);
  });
});
