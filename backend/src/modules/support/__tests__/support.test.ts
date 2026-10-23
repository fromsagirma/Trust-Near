import request from 'supertest';
import app from '../../../server';
import { prisma } from '../../../config/db';

describe('Customer Support Ticket Endpoints', () => {
  const testEmail = `supporttest_${Date.now()}@example.com`;
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
        displayName: 'Support Tester',
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
      await prisma.supportTicket.deleteMany({ where: { userId } });
      await prisma.user.delete({ where: { id: userId } }).catch(() => {});
    }
    await prisma.$disconnect();
  });

  describe('POST /api/support/tickets', () => {
    it('should submit a new support ticket successfully', async () => {
      const res = await request(app)
        .post('/api/support/tickets')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          subject: 'App Feedback',
          message: 'Great app! Please add night mode support.',
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.id).toBeDefined();
      expect(res.body.data.subject).toBe('App Feedback');
      expect(res.body.data.message).toBe('Great app! Please add night mode support.');
      expect(res.body.data.status).toBe('pending');
    });

    it('should reject submission with missing or empty message', async () => {
      const res = await request(app)
        .post('/api/support/tickets')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ subject: 'No message' });

      expect(res.status).toBe(400);
    });

    it('should reject unauthenticated requests', async () => {
      const res = await request(app)
        .post('/api/support/tickets')
        .send({ message: 'Unauthenticated ticket' });

      expect(res.status).toBe(401);
    });
  });

  describe('GET /api/support/tickets', () => {
    it('should list submitted support tickets for user', async () => {
      const res = await request(app)
        .get('/api/support/tickets')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data.tickets)).toBe(true);
      expect(res.body.data.tickets.length).toBeGreaterThanOrEqual(1);
    });
  });
});
