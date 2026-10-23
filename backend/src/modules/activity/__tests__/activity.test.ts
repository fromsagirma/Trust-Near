import request from 'supertest';
import app from '../../../server';
import { prisma } from '../../../config/db';

describe('User Activity Feed & Log Endpoints', () => {
  const testEmail = `activitytest_${Date.now()}@example.com`;
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
        displayName: 'Activity Tester',
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
      await prisma.userActivity.deleteMany({ where: { userId } });
      await prisma.user.delete({ where: { id: userId } }).catch(() => {});
    }
    await prisma.$disconnect();
  });

  describe('GET /api/users/me/activity', () => {
    it('should return empty activity feed for new user', async () => {
      const res = await request(app)
        .get('/api/users/me/activity')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data.data)).toBe(true);
      expect(res.body.data.pagination).toBeDefined();
    });

    it('should reject unauthenticated access', async () => {
      const res = await request(app).get('/api/users/me/activity');
      expect(res.status).toBe(401);
    });
  });

  describe('POST /api/users/me/activity/visit', () => {
    it('should return 400 when businessId is missing', async () => {
      const res = await request(app)
        .post('/api/users/me/activity/visit')
        .set('Authorization', `Bearer ${authToken}`)
        .send({});

      expect(res.status).toBe(400);
    });
  });

  describe('GET /api/users/me/activity/stats', () => {
    it('should return activity stats object with numbers', async () => {
      const res = await request(app)
        .get('/api/users/me/activity/stats')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(typeof res.body.data.savedPlaces).toBe('number');
      expect(typeof res.body.data.reviews).toBe('number');
      expect(typeof res.body.data.recentlyVisited).toBe('number');
    });
  });
});
