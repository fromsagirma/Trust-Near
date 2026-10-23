import request from 'supertest';
import app from '../../../server';
import { prisma } from '../../../config/db';

describe('GET /api/businesses/:id/claim-status Integration Tests', () => {
  jest.setTimeout(60000);

  const claimantEmail = `claimant_${Date.now()}@example.com`;
  const adminEmail = `claimadmin_${Date.now()}@example.com`;
  const testPassword = 'Password123!';

  let claimantId: string;
  let claimantToken: string;
  let adminId: string;
  let adminToken: string;
  let businessId: string;
  let categoryId: number;

  beforeAll(async () => {
    // 1. Get or create category
    let cats = await prisma.$queryRaw<any[]>`SELECT id FROM categories LIMIT 1`;
    if (!cats || cats.length === 0) {
      cats = await prisma.$queryRaw<any[]>`
        INSERT INTO categories (name) VALUES (${'TestCat_' + Date.now()}) RETURNING id
      `;
    }
    categoryId = cats[0].id;

    // 2. Register claimant user
    const claimantReg = await request(app)
      .post('/api/auth/register')
      .send({ displayName: 'Claimant User', email: claimantEmail, password: testPassword });
    
    const claimantLogin = await request(app)
      .post('/api/auth/login')
      .send({ emailOrPhone: claimantEmail, password: testPassword });
    
    claimantId = claimantLogin.body.data.user.id;
    claimantToken = claimantLogin.body.data.accessToken;

    // 3. Register admin user
    const adminReg = await request(app)
      .post('/api/auth/register')
      .send({ displayName: 'Claim Admin', email: adminEmail, password: testPassword });
    
    adminId = adminReg.body.data.id;
    await prisma.user.update({ where: { id: adminId }, data: { role: 'admin' } });

    const adminLogin = await request(app)
      .post('/api/auth/login')
      .send({ emailOrPhone: adminEmail, password: testPassword });
    
    adminToken = adminLogin.body.data.accessToken;

    // 4. Create unowned published business
    const bizRows = await prisma.$queryRaw<any[]>`
      INSERT INTO businesses (name, category_id, landmark_description, location, status, submitted_by, created_at, updated_at)
      VALUES ('Claim Status Cafe', ${categoryId}, 'Near City Park', ST_SetSRID(ST_MakePoint(38.74, 9.03), 4326), 'published', ${claimantId}::uuid, NOW(), NOW())
      RETURNING id
    `;
    businessId = bizRows[0].id;
  });

  afterAll(async () => {
    if (businessId) {
      await prisma.businessClaim.deleteMany({ where: { businessId } });
      await prisma.business.delete({ where: { id: businessId } }).catch(() => {});
    }
    if (claimantId) {
      await prisma.user.delete({ where: { id: claimantId } }).catch(() => {});
    }
    if (adminId) {
      await prisma.user.delete({ where: { id: adminId } }).catch(() => {});
    }
    await prisma.$disconnect();
  });

  it('should return status: "none" when no claim exists', async () => {
    const res = await request(app)
      .get(`/api/businesses/${businessId}/claim-status`)
      .set('Authorization', `Bearer ${claimantToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.status).toBe('none');
  });

  it('should return status: "pending" after claim submission', async () => {
    // Submit claim
    const claimRes = await request(app)
      .post(`/api/businesses/${businessId}/claim`)
      .set('Authorization', `Bearer ${claimantToken}`)
      .send({ verificationInfo: { phone: '+251911000000' } });

    expect(claimRes.status).toBe(201);

    // Check status
    const statusRes = await request(app)
      .get(`/api/businesses/${businessId}/claim-status`)
      .set('Authorization', `Bearer ${claimantToken}`);

    expect(statusRes.status).toBe(200);
    expect(statusRes.body.success).toBe(true);
    expect(statusRes.body.data.status).toBe('pending');
  });

  it('should return status: "rejected" with reason after rejection', async () => {
    // Get pending claim ID
    const pendingRes = await request(app)
      .get('/api/admin/claims/pending')
      .set('Authorization', `Bearer ${adminToken}`);

    const claim = pendingRes.body.data.claims.find((c: any) => c.businessId === businessId);
    expect(claim).toBeDefined();

    // Reject claim
    const rejectRes = await request(app)
      .patch(`/api/admin/claims/${claim.id}/reject`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ reason: 'Invalid phone number proof provided' });

    expect(rejectRes.status).toBe(200);

    // Check status
    const statusRes = await request(app)
      .get(`/api/businesses/${businessId}/claim-status`)
      .set('Authorization', `Bearer ${claimantToken}`);

    expect(statusRes.status).toBe(200);
    expect(statusRes.body.success).toBe(true);
    expect(statusRes.body.data.status).toBe('rejected');
    expect(statusRes.body.data.reason).toBe('Invalid phone number proof provided');
  });
});
