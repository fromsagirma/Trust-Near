// @ts-ignore
import request from 'supertest';

import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import app from '../../../server';
import { prisma } from '../../../config/db';

const JWT_SECRET = process.env.JWT_SECRET || 'trustnear-secret-key';
const makeToken = (id: string, role: string) =>
  jwt.sign({ id, role }, JWT_SECRET, { expiresIn: '1h' });

describe('Favorites Module — Integration Tests', () => {
  jest.setTimeout(30000);
  let testCategoryId: number;
  let ownerId: string;
  let ownerToken: string;
  let userId: string;
  let userToken: string;
  
  let publishedBizId: string;
  let pendingBizId: string;
  let secondPublishedBizId: string;
  let thirdPublishedBizId: string;

  beforeAll(async () => {
    await prisma.$connect();

    const passwordHash = await bcrypt.hash('TestPassword123!', 4);
    const ts = Date.now();

    // 1. Create a Category
    const cat = await prisma.category.create({
      data: { name: `Fav Test Category ${ts}` },
    });
    testCategoryId = cat.id;

    // 2. Create Business Owner (to create businesses)
    const owner = await prisma.user.create({
      data: {
        displayName: 'Fav Test Owner',
        email: `fav_owner_${ts}@test.com`,
        passwordHash,
        role: 'business_owner',
      },
    });
    ownerId = owner.id;
    ownerToken = makeToken(ownerId, 'business_owner');

    // 3. Create User (to perform favoriting)
    const user = await prisma.user.create({
      data: {
        displayName: 'Fav Test User',
        email: `fav_user_${ts}@test.com`,
        passwordHash,
        role: 'user',
      },
    });
    userId = user.id;
    userToken = makeToken(userId, 'user');

    // Helper to create business
    const createBusiness = async (name: string, status: 'published' | 'pending') => {
      const res = await request(app)
        .post('/api/businesses')
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({
          name,
          categoryId: testCategoryId,
          location: { lat: 9.03, lng: 38.74 },
          landmarkDescription: 'Test Landmark',
        });
      expect(res.status).toBe(201);
      const bizId = res.body.data.id;
      if (status !== 'pending') {
        await prisma.business.update({
          where: { id: bizId },
          data: { status },
        });
      }
      return bizId;
    };

    // Create businesses
    publishedBizId = await createBusiness(`Pub Biz ${ts} 1`, 'published');
    pendingBizId = await createBusiness(`Pend Biz ${ts}`, 'pending');
    secondPublishedBizId = await createBusiness(`Pub Biz ${ts} 2`, 'published');
    thirdPublishedBizId = await createBusiness(`Pub Biz ${ts} 3`, 'published');
  });

  afterAll(async () => {
    // 1. Cleanup favorites
    await prisma.favorite.deleteMany({
      where: { userId },
    });

    // 2. Cleanup businesses
    const bizIds = [publishedBizId, pendingBizId, secondPublishedBizId, thirdPublishedBizId].filter(Boolean);
    if (bizIds.length > 0) {
      await prisma.businessPhoto.deleteMany({ where: { businessId: { in: bizIds } } });
      await prisma.business.deleteMany({ where: { id: { in: bizIds } } });
    }

    // 3. Cleanup category
    if (testCategoryId) {
      await prisma.category.delete({ where: { id: testCategoryId } }).catch(() => {});
    }

    // 4. Cleanup users
    const userIds = [ownerId, userId].filter(Boolean);
    if (userIds.length > 0) {
      await prisma.user.deleteMany({ where: { id: { in: userIds } } });
    }

    await prisma.$disconnect();
  });

  describe('Route Protection & Validation', () => {
    it('should return 401 when trying to favorite without a token', async () => {
      const res = await request(app).post(`/api/businesses/${publishedBizId}/favorite`);
      expect(res.status).toBe(401);
    });

    it('should return 401 when trying to remove favorite without a token', async () => {
      const res = await request(app).delete(`/api/businesses/${publishedBizId}/favorite`);
      expect(res.status).toBe(401);
    });

    it('should return 401 when trying to list favorites without a token', async () => {
      const res = await request(app).get('/api/users/me/favorites');
      expect(res.status).toBe(401);
    });

    it('should return 400 for invalid page / pageSize inputs', async () => {
      const res = await request(app)
        .get('/api/users/me/favorites?page=0&pageSize=999')
        .set('Authorization', `Bearer ${userToken}`);
      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });
  });

  describe('Adding Favorites', () => {
    it('should return 404 when trying to favorite a non-existent business', async () => {
      const fakeId = '00000000-0000-0000-0000-000000000000';
      const res = await request(app)
        .post(`/api/businesses/${fakeId}/favorite`)
        .set('Authorization', `Bearer ${userToken}`);
      expect(res.status).toBe(404);
    });

    it('should return 400 when trying to favorite a pending business', async () => {
      const res = await request(app)
        .post(`/api/businesses/${pendingBizId}/favorite`)
        .set('Authorization', `Bearer ${userToken}`);
      expect(res.status).toBe(400);
    });

    it('should successfully favorite a published business (201)', async () => {
      const res = await request(app)
        .post(`/api/businesses/${publishedBizId}/favorite`)
        .set('Authorization', `Bearer ${userToken}`);
      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.businessId).toBe(publishedBizId);
      expect(res.body.data.userId).toBe(userId);
    });

    it('should return 409 when trying to favorite the same business again', async () => {
      const res = await request(app)
        .post(`/api/businesses/${publishedBizId}/favorite`)
        .set('Authorization', `Bearer ${userToken}`);
      expect(res.status).toBe(409);
    });
  });

  describe('Removing Favorites', () => {
    it('Scenario A: should return 404 when removing a favorite that was never added', async () => {
      const res = await request(app)
        .delete(`/api/businesses/${secondPublishedBizId}/favorite`)
        .set('Authorization', `Bearer ${userToken}`);
      expect(res.status).toBe(404);
    });

    it('should successfully remove a favorite (200)', async () => {
      const res = await request(app)
        .delete(`/api/businesses/${publishedBizId}/favorite`)
        .set('Authorization', `Bearer ${userToken}`);
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.message).toBe('Removed from favorites');
    });

    it('Scenario B: should return 404 when removing an already removed favorite', async () => {
      const res = await request(app)
        .delete(`/api/businesses/${publishedBizId}/favorite`)
        .set('Authorization', `Bearer ${userToken}`);
      expect(res.status).toBe(404);
    });

    it('should allow removing a favorite even if the business is unpublished (exemption)', async () => {
      // 1. Add favorite on published business
      await request(app)
        .post(`/api/businesses/${secondPublishedBizId}/favorite`)
        .set('Authorization', `Bearer ${userToken}`);
      
      // 2. Unpublish business
      await prisma.business.update({
        where: { id: secondPublishedBizId },
        data: { status: 'pending' },
      });

      // 3. Remove favorite anyway
      const res = await request(app)
        .delete(`/api/businesses/${secondPublishedBizId}/favorite`)
        .set('Authorization', `Bearer ${userToken}`);
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });
  });

  describe('Listing & Pagination', () => {
    beforeAll(async () => {
      // Clear all favorites first
      await prisma.favorite.deleteMany({ where: { userId } });

      // Add three favorites back
      const addFav = async (bizId: string, secondsAgo: number) => {
        const fav = await prisma.favorite.create({
          data: {
            userId,
            businessId: bizId,
            createdAt: new Date(Date.now() - secondsAgo * 1000),
          },
        });
        return fav;
      };

      // Restoring businesses status to published if needed
      await prisma.business.updateMany({
        where: { id: { in: [publishedBizId, secondPublishedBizId, thirdPublishedBizId] } },
        data: { status: 'published' },
      });

      // Insert favorites with deterministic createdAt sequence:
      // Biz 3: created 10s ago (newest)
      // Biz 2: created 20s ago
      // Biz 1: created 30s ago (oldest)
      await addFav(thirdPublishedBizId, 10);
      await addFav(secondPublishedBizId, 20);
      await addFav(publishedBizId, 30);
    });

    it('should list all favorites with default pagination', async () => {
      const res = await request(app)
        .get('/api/users/me/favorites')
        .set('Authorization', `Bearer ${userToken}`);
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.items.length).toBe(3);
      expect(res.body.data.pagination.total).toBe(3);
      expect(res.body.data.pagination.page).toBe(1);
      expect(res.body.data.pagination.pageSize).toBe(10);
      expect(res.body.data.pagination.totalPages).toBe(1);

      // Verify desc order of business items (newest to oldest: 3 -> 2 -> 1)
      expect(res.body.data.items[0].businessId).toBe(thirdPublishedBizId);
      expect(res.body.data.items[1].businessId).toBe(secondPublishedBizId);
      expect(res.body.data.items[2].businessId).toBe(publishedBizId);
    });

    it('should handle pagination slice (page=2, pageSize=1)', async () => {
      const res = await request(app)
        .get('/api/users/me/favorites?page=2&pageSize=1')
        .set('Authorization', `Bearer ${userToken}`);
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.items.length).toBe(1);
      
      // Should be Biz 2 (since order is 3, 2, 1)
      expect(res.body.data.items[0].businessId).toBe(secondPublishedBizId);
      expect(res.body.data.pagination.total).toBe(3);
      expect(res.body.data.pagination.page).toBe(2);
      expect(res.body.data.pagination.pageSize).toBe(1);
      expect(res.body.data.pagination.totalPages).toBe(3);
    });
  });
});
