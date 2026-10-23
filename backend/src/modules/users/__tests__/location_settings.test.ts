import request from 'supertest';
import app from '../../../server';
import { prisma } from '../../../config/db';

describe('User Location Settings Endpoints', () => {
  const testEmail = `loctest_${Date.now()}@example.com`;
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
        displayName: 'Location Tester',
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

  describe('GET /api/users/me/location-settings', () => {
    it('should return default location settings for new user', async () => {
      const res = await request(app)
        .get('/api/users/me/location-settings')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.city).toBe('Addis Ababa');
      expect(res.body.data.radiusKm).toBe(2.4);
    });

    it('should reject unauthenticated access', async () => {
      const res = await request(app).get('/api/users/me/location-settings');
      expect(res.status).toBe(401);
    });
  });

  describe('PATCH /api/users/me/location-settings', () => {
    it('should update city and search radius', async () => {
      const res = await request(app)
        .patch('/api/users/me/location-settings')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          city: 'Hawassa',
          lat: 7.05,
          lng: 38.47,
          radiusKm: 5.0,
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.city).toBe('Hawassa');
      expect(res.body.data.lat).toBe(7.05);
      expect(res.body.data.lng).toBe(38.47);
      expect(res.body.data.radiusKm).toBe(5.0);
    });

    it('should reject invalid coordinates or negative radius', async () => {
      const res = await request(app)
        .patch('/api/users/me/location-settings')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          lat: 120, // Invalid latitude
          radiusKm: -1,
        });

      expect(res.status).toBe(400);
    });
  });
});
