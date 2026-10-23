import request from 'supertest';
import app from '../../../server';
import jwt from 'jsonwebtoken';
import { Role } from '@prisma/client';

const JWT_SECRET = process.env.JWT_SECRET || 'trustnear-secret-key';

const generateTestToken = (userId = '00000000-0000-0000-0000-000000000001', role: Role = Role.user) => {
  return jwt.sign({ id: userId, role }, JWT_SECRET, { expiresIn: '1h' });
};

describe('Cloudinary Upload Module — TN-011', () => {
  const token = generateTestToken();

  describe('GET /api/upload/signature', () => {
    it('should reject unauthenticated request with 401', async () => {
      const res = await request(app).get('/api/upload/signature');
      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });

    it('should return signature or 503 if Cloudinary credentials not configured', async () => {
      const res = await request(app)
        .get('/api/upload/signature')
        .set('Authorization', `Bearer ${token}`);

      if (res.status === 503) {
        expect(res.body.error || res.body.message).toContain('Cloudinary is not configured');
      } else {
        expect(res.status).toBe(200);
        expect(res.body.data.signature).toBeDefined();
        expect(res.body.data.timestamp).toBeDefined();
      }
    });
  });

  describe('POST /api/upload', () => {
    it('should reject unauthenticated request with 401', async () => {
      const res = await request(app).post('/api/upload');
      expect(res.status).toBe(401);
    });

    it('should return 400 when no file is uploaded', async () => {
      const res = await request(app)
        .post('/api/upload')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(400);
      expect(res.body.error).toContain('No image file uploaded');
    });
  });

  describe('POST /api/upload/multiple', () => {
    it('should reject unauthenticated request with 401', async () => {
      const res = await request(app).post('/api/upload/multiple');
      expect(res.status).toBe(401);
    });

    it('should return 400 when no files are uploaded', async () => {
      const res = await request(app)
        .post('/api/upload/multiple')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(400);
      expect(res.body.error).toContain('No image files uploaded');
    });
  });
});
