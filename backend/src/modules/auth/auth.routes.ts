import { Router } from 'express';
import { AuthController } from './auth.controller';
import { authenticate } from '../../middleware/auth';
import {
  loginRateLimiter,
  forgotPasswordRateLimiter,
  registerRateLimiter,
  resetPasswordRateLimiter,
  refreshRateLimiter,
} from '../../middleware/rateLimiter';

const router = Router();

// Rate Limited Public Authentication Endpoints — NFR 7.3
router.post('/register', registerRateLimiter, AuthController.register);
router.post('/login', loginRateLimiter, AuthController.login);
router.post('/refresh', refreshRateLimiter, AuthController.refresh);
router.post('/logout', AuthController.logout);
router.post('/forgot-password', forgotPasswordRateLimiter, AuthController.forgotPassword);
router.post('/reset-password', resetPasswordRateLimiter, AuthController.resetPassword);

// Protected Authentication Endpoints
router.get('/me', authenticate, AuthController.getMe);
router.post('/change-password', authenticate, AuthController.changePassword);

export default router;
