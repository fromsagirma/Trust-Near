import assert from 'assert';
// @ts-ignore
import request from 'supertest';
import jwt from 'jsonwebtoken';
import app from '../../../server';
import { Role } from '@prisma/client';

const JWT_SECRET = process.env.JWT_SECRET || 'trustnear-secret-key';

const generateTestToken = (userId = '00000000-0000-0000-0000-000000000001', role: Role = Role.user) => {
  return jwt.sign({ id: userId, role }, JWT_SECRET, { expiresIn: '1h' });
};

interface QAResult {
  id: string;
  category: string;
  name: string;
  status: 'PASS' | 'FAIL';
  details?: string;
}

const results: QAResult[] = [];

function recordPass(id: string, category: string, name: string) {
  results.push({ id, category, name, status: 'PASS' });
  console.log(`  ✅ [PASS] ${id}: ${name}`);
}

function recordFail(id: string, category: string, name: string, error: any) {
  results.push({ id, category, name, status: 'FAIL', details: error.message });
  console.error(`  ❌ [FAIL] ${id}: ${name} — ${error.message}`);
}

async function runUploadTests() {
  console.log('===========================================================');
  console.log('🖼️ TrustNear TN-011 Cloudinary Upload Module Test Suite');
  console.log('===========================================================');

  const token = generateTestToken();

  // Test 1: GET /api/upload/signature without auth
  try {
    const res = await request(app).get('/api/upload/signature');
    assert.strictEqual(res.status, 401);
    assert.strictEqual(res.body.success, false);
    recordPass('UPL-001', 'Auth Guard', 'Reject signature request without JWT token');
  } catch (e: any) {
    recordFail('UPL-001', 'Auth Guard', 'Reject signature request without JWT token', e);
  }

  // Test 2: GET /api/upload/signature with valid token
  try {
    const res = await request(app)
      .get('/api/upload/signature')
      .set('Authorization', `Bearer ${token}`);

    if (res.status === 503) {
      const errMsg = res.body.error || res.body.message || '';
      assert.ok(errMsg.includes('Cloudinary is not configured'));
      recordPass('UPL-002', 'Signature Endpoint', 'Handled unconfigured Cloudinary credentials with 503');
    } else {
      assert.strictEqual(res.status, 200);
      assert.ok(res.body.data.signature);
      assert.ok(res.body.data.timestamp);
      recordPass('UPL-002', 'Signature Endpoint', 'Generated Cloudinary upload signature');
    }
  } catch (e: any) {
    recordFail('UPL-002', 'Signature Endpoint', 'Generated Cloudinary upload signature', e);
  }

  // Test 3: POST /api/upload without auth
  try {
    const res = await request(app).post('/api/upload');
    assert.strictEqual(res.status, 401);
    recordPass('UPL-003', 'Auth Guard', 'Reject single upload request without JWT token');
  } catch (e: any) {
    recordFail('UPL-003', 'Auth Guard', 'Reject single upload request without JWT token', e);
  }

  // Test 4: POST /api/upload without file
  try {
    const res = await request(app)
      .post('/api/upload')
      .set('Authorization', `Bearer ${token}`);
    assert.strictEqual(res.status, 400);
    const errMsg = res.body.error || res.body.message || '';
    assert.ok(errMsg.includes('No image file uploaded'));
    recordPass('UPL-004', 'Upload Validation', 'Return 400 when no file is uploaded');
  } catch (e: any) {
    recordFail('UPL-004', 'Upload Validation', 'Return 400 when no file is uploaded', e);
  }

  // Test 5: POST /api/upload/multiple without files
  try {
    const res = await request(app)
      .post('/api/upload/multiple')
      .set('Authorization', `Bearer ${token}`);
    assert.strictEqual(res.status, 400);
    const errMsg = res.body.error || res.body.message || '';
    assert.ok(errMsg.includes('No image files uploaded'));
    recordPass('UPL-005', 'Multiple Upload Validation', 'Return 400 when no files are uploaded');
  } catch (e: any) {
    recordFail('UPL-005', 'Multiple Upload Validation', 'Return 400 when no files are uploaded', e);
  }

  // Test 6: POST /api/upload with non-image file
  try {
    const res = await request(app)
      .post('/api/upload')
      .set('Authorization', `Bearer ${token}`)
      .attach('file', Buffer.from('dummy text content'), {
        filename: 'test.txt',
        contentType: 'text/plain',
      });

    // Multer fileFilter or controller returns 400 / Error
    assert.strictEqual(res.status, 400);
    recordPass('UPL-006', 'File MIME Validation', 'Reject non-image file uploads with 400');
  } catch (e: any) {
    recordFail('UPL-006', 'File MIME Validation', 'Reject non-image file uploads with 400', e);
  }

  console.log('===========================================================');
  const passed = results.filter((r) => r.status === 'PASS').length;
  const failed = results.filter((r) => r.status === 'FAIL').length;
  console.log(`Summary: Total: ${results.length} | Passed: ${passed} | Failed: ${failed}`);
  console.log('===========================================================');

  if (failed > 0) {
    process.exit(1);
  }
}

runUploadTests().catch((err) => {
  console.error('Test runner failed:', err);
  process.exit(1);
});
