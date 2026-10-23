import request from 'supertest';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import app from '../../../server';
import { prisma } from '../../../config/db';

const JWT_SECRET = process.env.JWT_SECRET || 'trustnear-secret-key';

const makeToken = (id: string, role: string) =>
  jwt.sign({ id, role }, JWT_SECRET, { expiresIn: '1h' });

describe('Reviews Module — Sprint 1', () => {
  jest.setTimeout(30000);
  let testCategoryId: number;
  let ownerId: string;
  let ownerToken: string;
  let reviewerId: string;
  let reviewerToken: string;
  let businessId: string;

  beforeAll(async () => {
    await prisma.$connect();

    const passwordHash = await bcrypt.hash('TestPassword123!', 4);
    const ts = Date.now();

    // 1. Create a Category
    const cat = await prisma.category.create({
      data: { name: `Test Category ${ts}` },
    });
    testCategoryId = cat.id;

    // 2. Create Business Owner
    const owner = await prisma.user.create({
      data: {
        displayName: 'Test Owner',
        email: `owner_${ts}@test.com`,
        passwordHash,
        role: 'business_owner',
      },
    });
    ownerId = owner.id;
    ownerToken = makeToken(ownerId, 'business_owner');

    // 3. Create Reviewer
    const reviewer = await prisma.user.create({
      data: {
        displayName: 'Test Reviewer',
        email: `reviewer_${ts}@test.com`,
        passwordHash,
        role: 'user',
      },
    });
    reviewerId = reviewer.id;
    reviewerToken = makeToken(reviewerId, 'user');

    // 4. Create Business via POST endpoint to correctly setup geography field
    const bizResponse = await request(app)
      .post('/api/businesses')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({
        name: `Test Business ${ts}`,
        categoryId: testCategoryId,
        location: { lat: 9.03, lng: 38.74 },
        landmarkDescription: 'Around Bole Medhanialem',
      });

    expect(bizResponse.status).toBe(201);
    businessId = bizResponse.body.data.id;

    // Sprint 3: Explicitly set status to published to allow ratings
    await prisma.business.update({
      where: { id: businessId },
      data: { status: 'published' },
    });
  });

  afterAll(async () => {
    // Teardown reviews
    await prisma.review.deleteMany({
      where: { businessId },
    });

    // Teardown business
    if (businessId) {
      await prisma.businessPhoto.deleteMany({ where: { businessId } });
      await prisma.business.deleteMany({ where: { id: businessId } });
    }

    // Teardown category
    if (testCategoryId) {
      await prisma.category.delete({ where: { id: testCategoryId } }).catch(() => {});
    }

    // Teardown users
    const userIds = [ownerId, reviewerId].filter(Boolean);
    if (userIds.length > 0) {
      await prisma.user.deleteMany({ where: { id: { in: userIds } } });
    }

    await prisma.$disconnect();
  });

  describe('POST /api/businesses/:businessId/reviews', () => {
    it('should rate a business successfully (Sprint 1 path)', async () => {
      const res = await request(app)
        .post(`/api/businesses/${businessId}/reviews`)
        .set('Authorization', `Bearer ${reviewerToken}`)
        .send({
          rating: 4,
          comment: 'Good coffee',
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.rating).toBe(4);
      expect(res.body.data.comment).toBe('Good coffee');
      expect(res.body.data.businessId).toBe(businessId);
      expect(res.body.data.userId).toBe(reviewerId);
    });

    it('should update the existing review in-place on second POST', async () => {
      // 1. Submit rating update
      const res = await request(app)
        .post(`/api/businesses/${businessId}/reviews`)
        .set('Authorization', `Bearer ${reviewerToken}`)
        .send({
          rating: 2,
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.rating).toBe(2);
      expect(res.body.data.comment).toBe('Good coffee');

      // 2. Query DB directly to verify ONLY one row exists for this combination
      const reviews = await prisma.review.findMany({
        where: { businessId, userId: reviewerId },
      });
      expect(reviews.length).toBe(1);
      expect(reviews[0].rating).toBe(2);
    });

    it('should reject invalid ratings', async () => {
      const cases = [
        { payload: { rating: 0 }, expectedError: 'Rating must be at least 1' },
        { payload: { rating: 6 }, expectedError: 'Rating cannot exceed 5' },
        { payload: { rating: 3.5 }, expectedError: 'Expected integer' },
        { payload: { rating: 5, comment: 'a'.repeat(2001) }, expectedError: 'String must contain at most 2000' },
      ];

      for (const c of cases) {
        const res = await request(app)
          .post(`/api/businesses/${businessId}/reviews`)
          .set('Authorization', `Bearer ${reviewerToken}`)
          .send(c.payload);

        expect(res.status).toBe(400);
        expect(res.body.success).toBe(false);
      }
    });

    it('should return 404 for a non-existent business', async () => {
      const nonExistentId = '11111111-2222-4333-8444-555555555555';
      const res = await request(app)
        .post(`/api/businesses/${nonExistentId}/reviews`)
        .set('Authorization', `Bearer ${reviewerToken}`)
        .send({
          rating: 3,
        });

      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
      expect(res.body.error).toContain('Business not found');
    });

    it('should return 401 if unauthenticated', async () => {
      const res = await request(app)
        .post(`/api/businesses/${businessId}/reviews`)
        .send({
          rating: 3,
        });

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });
  });

  describe('GET /api/businesses/:businessId/reviews/me', () => {
    it('should retrieve the user\'s review successfully', async () => {
      const res = await request(app)
        .get(`/api/businesses/${businessId}/reviews/me`)
        .set('Authorization', `Bearer ${reviewerToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.rating).toBe(2);
      expect(res.body.data.businessId).toBe(businessId);
      expect(res.body.data.userId).toBe(reviewerId);
    });

    it('should return 404 if the user has no review', async () => {
      // Create a clean user who has not rated the business
      const cleanUser = await prisma.user.create({
        data: {
          displayName: 'Clean User',
          email: `clean_${Date.now()}@test.com`,
          passwordHash: 'dummyhash',
          role: 'user',
        },
      });
      const cleanToken = makeToken(cleanUser.id, 'user');

      try {
        const res = await request(app)
          .get(`/api/businesses/${businessId}/reviews/me`)
          .set('Authorization', `Bearer ${cleanToken}`);

        expect(res.status).toBe(404);
        expect(res.body.success).toBe(false);
        expect(res.body.error).toContain('No review found');
      } finally {
        await prisma.user.delete({ where: { id: cleanUser.id } }).catch(() => {});
      }
    });

    it('should return 401 if unauthenticated', async () => {
      const res = await request(app)
        .get(`/api/businesses/${businessId}/reviews/me`);

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });
  });

  describe('Sprint 2 — Aggregate Recalculation and Deletion', () => {
    let tempBusinessId: string;

    beforeAll(async () => {
      // Create a fresh business for Sprint 2 tests
      const bizResponse = await request(app)
        .post('/api/businesses')
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({
          name: `Sprint 2 Business ${Date.now()}`,
          categoryId: testCategoryId,
          location: { lat: 9.03, lng: 38.74 },
          landmarkDescription: 'Sprint 2 test location',
        });
      tempBusinessId = bizResponse.body.data.id;

      // Sprint 3: Explicitly set status to published to allow ratings
      await prisma.business.update({
        where: { id: tempBusinessId },
        data: { status: 'published' },
      });
    });

    afterAll(async () => {
      if (tempBusinessId) {
        await prisma.review.deleteMany({ where: { businessId: tempBusinessId } });
        await prisma.businessPhoto.deleteMany({ where: { businessId: tempBusinessId } });
        await prisma.business.deleteMany({ where: { id: tempBusinessId } });
      }
    });

    it('should update avgRating and reviewCount correctly on fresh rating', async () => {
      // 1. Submit rating of 5
      const res = await request(app)
        .post(`/api/businesses/${tempBusinessId}/reviews`)
        .set('Authorization', `Bearer ${reviewerToken}`)
        .send({ rating: 5, comment: 'Awesome!' });

      expect(res.status).toBe(201);

      // 2. Fetch business and check aggregate integrity
      const biz = await prisma.business.findUnique({
        where: { id: tempBusinessId },
      });
      expect(Number(biz?.avgRating)).toBe(5.0);
      expect(biz?.reviewCount).toBe(1);
    });

    it('should update avgRating and preserve reviewCount on re-rating', async () => {
      // 1. Submit rating update of 3
      const res = await request(app)
        .post(`/api/businesses/${tempBusinessId}/reviews`)
        .set('Authorization', `Bearer ${reviewerToken}`)
        .send({ rating: 3 });

      expect(res.status).toBe(200);

      // 2. Fetch business and check aggregate integrity
      const biz = await prisma.business.findUnique({
        where: { id: tempBusinessId },
      });
      expect(Number(biz?.avgRating)).toBe(3.0);
      expect(biz?.reviewCount).toBe(1);
    });

    it('should decrease reviewCount and recalculate avgRating on DELETE', async () => {
      // 1. Delete review
      const res = await request(app)
        .delete(`/api/businesses/${tempBusinessId}/reviews`)
        .set('Authorization', `Bearer ${reviewerToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);

      // 2. Fetch business and check aggregate integrity (should drop to 0)
      const biz = await prisma.business.findUnique({
        where: { id: tempBusinessId },
      });
      expect(Number(biz?.avgRating)).toBe(0.0);
      expect(biz?.reviewCount).toBe(0);
    });

    it('should return 404 when deleting an already deleted or non-existent review', async () => {
      // Try to delete again
      const res = await request(app)
        .delete(`/api/businesses/${tempBusinessId}/reviews`)
        .set('Authorization', `Bearer ${reviewerToken}`);

      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
      expect(res.body.error).toContain('No review found to delete');
    });
  });

  describe('Sprint 3 — Business Rules & Validation Hardening', () => {
    let pendingBusinessId: string;

    beforeAll(async () => {
      // Create a pending business for testing
      const bizResponse = await request(app)
        .post('/api/businesses')
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({
          name: `Pending Business ${Date.now()}`,
          categoryId: testCategoryId,
          location: { lat: 9.03, lng: 38.74 },
          landmarkDescription: 'Sprint 3 pending test location',
        });
      pendingBusinessId = bizResponse.body.data.id;
    });

    afterAll(async () => {
      if (pendingBusinessId) {
        await prisma.review.deleteMany({ where: { businessId: pendingBusinessId } });
        await prisma.businessPhoto.deleteMany({ where: { businessId: pendingBusinessId } });
        await prisma.business.deleteMany({ where: { id: pendingBusinessId } });
      }
    });

    it('should reject rating a business that is pending', async () => {
      const res = await request(app)
        .post(`/api/businesses/${pendingBusinessId}/reviews`)
        .set('Authorization', `Bearer ${reviewerToken}`)
        .send({ rating: 4, comment: 'Nice place but pending' });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error).toContain('Cannot review a business that is not published');
    });

    it('should allow deleting a review even if the business status is rejected (exemption check)', async () => {
      // 1. Submit rating to the published businessId (established in Sprint 1 setup)
      const rateRes = await request(app)
        .post(`/api/businesses/${businessId}/reviews`)
        .set('Authorization', `Bearer ${reviewerToken}`)
        .send({ rating: 5, comment: 'Great!' });
      expect(rateRes.status).toBe(200);

      // 2. Reject the business directly in DB
      await prisma.business.update({
        where: { id: businessId },
        data: { status: 'rejected' },
      });

      try {
        // 3. Try to delete the review
        const deleteRes = await request(app)
          .delete(`/api/businesses/${businessId}/reviews`)
          .set('Authorization', `Bearer ${reviewerToken}`);

        expect(deleteRes.status).toBe(200);
        expect(deleteRes.body.success).toBe(true);
      } finally {
        // Restore status to published for cleanup/other tests
        await prisma.business.update({
          where: { id: businessId },
          data: { status: 'published' },
        }).catch(() => {});
      }
    });

    it('should attribute the review to the authenticated user even if a spoofed userId is sent in request body', async () => {
      const spoofedUserId = '00000000-0000-0000-0000-000000008888';
      
      const res = await request(app)
        .post(`/api/businesses/${businessId}/reviews`)
        .set('Authorization', `Bearer ${reviewerToken}`)
        .send({
          rating: 3,
          comment: 'Spoofed attempt',
          userId: spoofedUserId,
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.userId).toBe(reviewerId);
      expect(res.body.data.userId).not.toBe(spoofedUserId);
    });
  });
});
