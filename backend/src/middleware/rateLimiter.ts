import rateLimit from 'express-rate-limit';
import { Request, Response } from 'express';
import { sendError } from '../utils/response';

/**
 * Creates a rate limiter instance with custom error handler and IP tracking — NFR 7.3
 */
export const createRateLimiter = (options: {
  windowMs?: number;
  max?: number;
  message?: string;
  keyPrefix?: string;
}) => {
  const windowMs = options.windowMs || 15 * 60 * 1000; // 15 mins default
  const max = options.max !== undefined ? options.max : 5;

  return rateLimit({
    windowMs,
    limit: max,
    standardHeaders: true, // Return RateLimit-* headers
    legacyHeaders: false, // Disable X-RateLimit-* headers
    skip: () => process.env.DISABLE_RATE_LIMITING === 'true',
    handler: (_req: Request, res: Response) => {
      return sendError(
        res,
        options.message || 'Too many requests. Please try again later.',
        429
      );
    },
    keyGenerator: (req: Request) => {
      const userId = (req as any).user?.id;
      if (userId) {
        return `${options.keyPrefix || 'rl'}_user_${userId}`;
      }
      const clientIp =
        (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ||
        req.ip ||
        req.socket.remoteAddress ||
        '127.0.0.1';
      return `${options.keyPrefix || 'rl'}_${clientIp}`;
    },
  });
};

// Login Rate Limiter (Brute-force & Credential Stuffing Protection)
export const loginRateLimiter = createRateLimiter({
  windowMs: process.env.RATE_LIMIT_LOGIN_WINDOW_MS
    ? parseInt(process.env.RATE_LIMIT_LOGIN_WINDOW_MS, 10)
    : 15 * 60 * 1000,
  max: process.env.RATE_LIMIT_LOGIN_MAX
    ? parseInt(process.env.RATE_LIMIT_LOGIN_MAX, 10)
    : 5,
  message: 'Too many login attempts. Please try again after 15 minutes.',
  keyPrefix: 'login',
});

// Forgot Password Rate Limiter (SMS/Email Spam & Token Reset Spam Protection)
export const forgotPasswordRateLimiter = createRateLimiter({
  windowMs: process.env.RATE_LIMIT_FORGOT_PASS_WINDOW_MS
    ? parseInt(process.env.RATE_LIMIT_FORGOT_PASS_WINDOW_MS, 10)
    : 15 * 60 * 1000,
  max: process.env.RATE_LIMIT_FORGOT_PASS_MAX
    ? parseInt(process.env.RATE_LIMIT_FORGOT_PASS_MAX, 10)
    : 3,
  message: 'Too many password reset requests. Please try again later.',
  keyPrefix: 'forgot_pass',
});

// Registration Rate Limiter (Bot Account Creation Protection)
export const registerRateLimiter = createRateLimiter({
  windowMs: process.env.RATE_LIMIT_REGISTER_WINDOW_MS
    ? parseInt(process.env.RATE_LIMIT_REGISTER_WINDOW_MS, 10)
    : 60 * 60 * 1000,
  max: process.env.RATE_LIMIT_REGISTER_MAX
    ? parseInt(process.env.RATE_LIMIT_REGISTER_MAX, 10)
    : 5,
  message: 'Too many account registrations from this IP address. Please try again later.',
  keyPrefix: 'register',
});

// Reset Password Rate Limiter (Token Brute-force Protection)
export const resetPasswordRateLimiter = createRateLimiter({
  windowMs: process.env.RATE_LIMIT_RESET_PASS_WINDOW_MS
    ? parseInt(process.env.RATE_LIMIT_RESET_PASS_WINDOW_MS, 10)
    : 15 * 60 * 1000,
  max: process.env.RATE_LIMIT_RESET_PASS_MAX
    ? parseInt(process.env.RATE_LIMIT_RESET_PASS_MAX, 10)
    : 5,
  message: 'Too many reset attempts. Please try again later.',
  keyPrefix: 'reset_pass',
});

// Refresh Token Rate Limiter (Token Flooding Protection)
export const refreshRateLimiter = createRateLimiter({
  windowMs: process.env.RATE_LIMIT_REFRESH_WINDOW_MS
    ? parseInt(process.env.RATE_LIMIT_REFRESH_WINDOW_MS, 10)
    : 15 * 60 * 1000,
  max: process.env.RATE_LIMIT_REFRESH_MAX
    ? parseInt(process.env.RATE_LIMIT_REFRESH_MAX, 10)
    : 10,
  message: 'Too many refresh token requests. Please try again later.',
  keyPrefix: 'refresh',
});

// Review Report Rate Limiter (TN-013 — Basic Abuse Protection)
export const reportRateLimiter = createRateLimiter({
  windowMs: process.env.RATE_LIMIT_REPORT_WINDOW_MS
    ? parseInt(process.env.RATE_LIMIT_REPORT_WINDOW_MS, 10)
    : 60 * 60 * 1000, // 1 hour
  max: process.env.RATE_LIMIT_REPORT_MAX
    ? parseInt(process.env.RATE_LIMIT_REPORT_MAX, 10)
    : 10,
  message: 'Too many report submissions. Please try again later.',
  keyPrefix: 'report',
});

