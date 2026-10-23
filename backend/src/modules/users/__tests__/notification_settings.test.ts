import request from 'supertest';
import app from '../../../server';
import { prisma } from '../../../config/db';

describe('User Notification Settings Endpoints', () => {
  const testEmail = `nottest_${Date.now()}@example.com`;
  const testPassword = 'Password123!';
  let userId: string;
  let authToken: string;

  beforeAll(async () => {
    jest.setTimeout(30000);
    await prisma.$connect();

    // Register a test user
    const regRes = await request(app)
      .post('/api/auth/register')
      .send({
        displayName: 'Notification Tester',
        email: testEmail,
        password: testPassword,
      });

    if (regRes.status === 201 && regRes.body.data) {
      userId = regRes.body.data.id;
    }

    // Login to get access token
    const loginRes = await request(app)
      .post('/api/auth/login')
      .send({ emailOrPhone: testEmail, password: testPassword });

    if (loginRes.body && loginRes.body.data) {
      userId = loginRes.body.data.user.id;
      authToken = loginRes.body.data.accessToken;
    }
  });

  afterAll(async () => {
    if (userId) {
      await prisma.user.delete({ where: { id: userId } }).catch(() => {});
    }
    await prisma.$disconnect();
  });

  describe('GET /api/users/me/notification-settings', () => {
    it('should return default notification settings for new user', async () => {
      const res = await request(app)
        .get('/api/users/me/notification-settings')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.pushNotificationsEnabled).toBe(true);
      expect(res.body.data.emailUpdatesEnabled).toBe(true);
    });

    it('should reject unauthenticated access', async () => {
      const res = await request(app).get('/api/users/me/notification-settings');
      expect(res.status).toBe(401);
    });
  });

  describe('PATCH /api/users/me/notification-settings', () => {
    it('should update push and email preference flags', async () => {
      const res = await request(app)
        .patch('/api/users/me/notification-settings')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          pushNotificationsEnabled: false,
          emailUpdatesEnabled: true,
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.pushNotificationsEnabled).toBe(false);
      expect(res.body.data.emailUpdatesEnabled).toBe(true);
    });

    it('should reject empty update payload', async () => {
      const res = await request(app)
        .patch('/api/users/me/notification-settings')
        .set('Authorization', `Bearer ${authToken}`)
        .send({});

      expect(res.status).toBe(400);
    });
  });
});
