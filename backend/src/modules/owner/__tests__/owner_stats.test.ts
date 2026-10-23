import request from 'supertest';
import app from '../../../server';
import { prisma } from '../../../config/db';

describe('GET /api/owner/stats Integration Tests', () => {
  jest.setTimeout(60000);

  const ts = Date.now();
  const testEmail = `ownerstats${ts}@example.com`;
  const testPassword = 'OldPassword123!';

  let ownerToken: string;
  let ownerId: string;
  let businessId: string;

  beforeAll(async () => {
    await request(app)
      .post('/api/auth/register')
      .send({ displayName: 'Stats Owner', email: testEmail, password: testPassword });

    const loginRes = await request(app)
      .post('/api/auth/login')
      .send({ emailOrPhone: testEmail, password: testPassword });

    if (!loginRes.body.data?.user?.id) {
      throw new Error('Setup failed: ' + JSON.stringify(loginRes.body));
    }
    ownerId = loginRes.body.data.user.id;

    await prisma.user.update({ where: { id: ownerId }, data: { role: 'business_owner' } });

    const ownerLoginRes = await request(app)
      .post('/api/auth/login')
      .send({ emailOrPhone: testEmail, password: testPassword });
    ownerToken = ownerLoginRes.body.data.accessToken;

    const rows = await prisma.$queryRaw<any[]>`
      INSERT INTO businesses (name, category_id, landmark_description, location, submitted_by, owner_id, status, avg_rating, review_count, created_at, updated_at)
      VALUES ('Stats Test Biz', 1, 'Landmark', ST_SetSRID(ST_MakePoint(35.0,31.0),4326), ${ownerId}::uuid, ${ownerId}::uuid, 'published', 0, 0, NOW(), NOW())
      RETURNING id
    `;
    businessId = rows[0].id;
  });

  afterAll(async () => {
    if (businessId) {
      await prisma.review.deleteMany({ where: { businessId } }).catch(() => {});
      await prisma.business.deleteMany({ where: { id: businessId } }).catch(() => {});
    }
    if (ownerId) {
      await prisma.refreshToken.deleteMany({ where: { userId: ownerId } }).catch(() => {});
      await prisma.user.deleteMany({ where: { id: ownerId } }).catch(() => {});
    }
  });

  it('returns 401 without token', async () => {
    const res = await request(app).get('/api/owner/stats');
    expect(res.status).toBe(401);
  });

  it('returns correct shape for authenticated owner', async () => {
    const res = await request(app)
      .get('/api/owner/stats')
      .set('Authorization', `Bearer ${ownerToken}`);
    expect(res.status).toBe(200);
    expect(res.body.data).toHaveProperty('summary');
    expect(res.body.data).toHaveProperty('ratingDistribution');
    expect(res.body.data).toHaveProperty('recentReviews');
    const { summary, ratingDistribution } = res.body.data;
    expect(summary).toHaveProperty('totalBusinesses');
    expect(summary).toHaveProperty('totalReviews');
    expect(summary).toHaveProperty('avgRating');
    expect(summary).toHaveProperty('totalFavorites');
    expect(typeof summary.avgRating).toBe('number');
    expect(['1','2','3','4','5'].every(k => k in ratingDistribution)).toBe(true);
  });

  it('returns totalBusinesses >= 1', async () => {
    const res = await request(app)
      .get('/api/owner/stats')
      .set('Authorization', `Bearer ${ownerToken}`);
    expect(res.status).toBe(200);
    expect(res.body.data.summary.totalBusinesses).toBeGreaterThanOrEqual(1);
  });
});