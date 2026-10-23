import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { prisma } from '../../config/db';
import { Role } from '@prisma/client';

const JWT_SECRET = process.env.JWT_SECRET || 'trustnear-secret-key';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '15m';
const REFRESH_TOKEN_EXPIRY_DAYS = 7;

export class AppError extends Error {
  statusCode: number;

  constructor(message: string, statusCode: number) {
    super(message);
    this.statusCode = statusCode;
    Object.setPrototypeOf(this, AppError.prototype);
  }
}

/**
 * Returns a safe user object without passwordHash or internal sensitive data.
 */
export const getSafeUser = (user: any) => {
  return {
    id: user.id,
    displayName: user.displayName,
    email: user.email,
    phone: user.phone,
    role: user.role,
    languagePref: user.languagePref,
    profilePhotoUrl: user.profilePhotoUrl,
    createdAt: user.createdAt,
  };
};

/**
 * Hashes raw token using SHA-256 for secure database storage.
 */
const hashToken = (token: string): string => {
  return crypto.createHash('sha256').update(token).digest('hex');
};

/**
 * Generates a short-lived Access Token (~15 mins).
 */
export const generateAccessToken = (user: { id: string; role: Role }): string => {
  return jwt.sign(
    {
      id: user.id,
      role: user.role,
    },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES_IN as any }
  );
};

export class AuthService {
  /**
   * Register a new user — TN-001
   */
  static async register(data: {
    displayName: string;
    email?: string;
    phone?: string;
    password: string;
  }) {
    const email = data.email && data.email.trim().length > 0 ? data.email.trim().toLowerCase() : null;
    const phone = data.phone && data.phone.trim().length > 0 ? data.phone.trim() : null;

    if (!email && !phone) {
      throw new AppError('Either email or phone number is required for registration.', 400);
    }

    // Check duplicate email
    if (email) {
      const existingEmailUser = await prisma.user.findUnique({
        where: { email },
      });
      if (existingEmailUser && !existingEmailUser.isDeleted) {
        throw new AppError('An account with this email address already exists.', 409);
      }
    }

    // Check duplicate phone
    if (phone) {
      const existingPhoneUser = await prisma.user.findUnique({
        where: { phone },
      });
      if (existingPhoneUser && !existingPhoneUser.isDeleted) {
        throw new AppError('An account with this phone number already exists.', 409);
      }
    }

    // Hash password with bcrypt
    const passwordHash = await bcrypt.hash(data.password, 10);

    // Create user with default 'user' role
    const newUser = await prisma.user.create({
      data: {
        displayName: data.displayName.trim(),
        email: email || undefined,
        phone: phone || undefined,
        passwordHash,
        role: Role.user,
      },
    });

    return getSafeUser(newUser);
  }

  /**
   * Login user — TN-001
   */
  static async login(data: {
    email?: string;
    phone?: string;
    emailOrPhone?: string;
    password: string;
  }) {
    const identifier = (data.emailOrPhone || data.email || data.phone || '').trim();

    if (!identifier) {
      throw new AppError('Email or phone number is required.', 400);
    }

    // Find user by email or phone
    const user = await prisma.user.findFirst({
      where: {
        OR: [
          { email: identifier.toLowerCase() },
          { phone: identifier },
        ],
        isDeleted: false,
      },
    });

    if (!user) {
      throw new AppError('Invalid email/phone or password.', 401);
    }

    // Compare password hash
    const isPasswordValid = await bcrypt.compare(data.password, user.passwordHash);
    if (!isPasswordValid) {
      throw new AppError('Invalid email/phone or password.', 401);
    }

    // Generate short-lived access token
    const accessToken = generateAccessToken(user);

    // Generate random secure refresh token
    const rawRefreshToken = crypto.randomBytes(32).toString('hex');
    const tokenHash = hashToken(rawRefreshToken);
    const expiresAt = new Date(Date.now() + REFRESH_TOKEN_EXPIRY_DAYS * 24 * 60 * 60 * 1000);

    // Store hashed refresh token in database
    await prisma.refreshToken.create({
      data: {
        userId: user.id,
        tokenHash,
        expiresAt,
      },
    });

    return {
      accessToken,
      refreshToken: rawRefreshToken,
      user: getSafeUser(user),
    };
  }

  /**
   * Refresh Token Rotation — TN-001
   */
  static async refreshTokens(rawRefreshToken: string) {
    if (!rawRefreshToken || typeof rawRefreshToken !== 'string') {
      throw new AppError('Refresh token is required.', 401);
    }

    const tokenHash = hashToken(rawRefreshToken);

    // Find token record
    const tokenRecord = await prisma.refreshToken.findUnique({
      where: { tokenHash },
      include: { user: true },
    });

    if (!tokenRecord) {
      throw new AppError('Invalid or unrecognized refresh token.', 401);
    }

    // Check revocation
    if (tokenRecord.revokedAt) {
      throw new AppError('Refresh token has been revoked.', 401);
    }

    // Check expiration
    if (tokenRecord.expiresAt < new Date()) {
      throw new AppError('Refresh token has expired. Please log in again.', 401);
    }

    // Verify user status
    if (!tokenRecord.user || tokenRecord.user.isDeleted) {
      throw new AppError('User account associated with this token no longer exists.', 401);
    }

    // ROTATE REFRESH TOKEN: Revoke old token
    await prisma.refreshToken.update({
      where: { id: tokenRecord.id },
      data: { revokedAt: new Date() },
    });

    // Generate new refresh token
    const newRawRefreshToken = crypto.randomBytes(32).toString('hex');
    const newTokenHash = hashToken(newRawRefreshToken);
    const newExpiresAt = new Date(Date.now() + REFRESH_TOKEN_EXPIRY_DAYS * 24 * 60 * 60 * 1000);

    // Store new hashed refresh token
    await prisma.refreshToken.create({
      data: {
        userId: tokenRecord.userId,
        tokenHash: newTokenHash,
        expiresAt: newExpiresAt,
      },
    });

    // Generate new access token
    const accessToken = generateAccessToken(tokenRecord.user);

    return {
      accessToken,
      refreshToken: newRawRefreshToken,
    };
  }

  /**
   * Logout user — TN-001 (Revokes current refresh token)
   */
  static async logout(rawRefreshToken?: string, userId?: string) {
    if (rawRefreshToken) {
      const tokenHash = hashToken(rawRefreshToken);
      await prisma.refreshToken.updateMany({
        where: { tokenHash, revokedAt: null },
        data: { revokedAt: new Date() },
      });
    } else if (userId) {
      // Revoke all active refresh tokens for user
      await prisma.refreshToken.updateMany({
        where: { userId, revokedAt: null },
        data: { revokedAt: new Date() },
      });
    }

    return { message: 'Logged out successfully.' };
  }

  /**
   * Request Password Reset — TN-001
   */
  static async forgotPassword(identifier: string) {
    const cleanIdentifier = identifier.trim();

    const user = await prisma.user.findFirst({
      where: {
        OR: [
          { email: cleanIdentifier.toLowerCase() },
          { phone: cleanIdentifier },
        ],
        isDeleted: false,
      },
    });

    // Security best practice: Do not expose whether an account exists
    const genericResponse = {
      message: 'If an account with that email or phone number exists, password reset instructions have been sent.',
    };

    if (!user) {
      return genericResponse;
    }

    // Generate secure reset token
    const rawResetToken = crypto.randomBytes(32).toString('hex');
    const tokenHash = hashToken(rawResetToken);
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour expiration

    await prisma.passwordResetToken.create({
      data: {
        userId: user.id,
        tokenHash,
        expiresAt,
      },
    });

    // Integration Point for Email / SMS Provider:
    // When an external email/SMS provider is connected, pass `rawResetToken` to send reset link
    console.log(`[AUTH INTEGRATION POINT] Password reset token generated for user ${user.id} (${user.email || user.phone})`);
    console.log(`[AUTH RESET TOKEN (DEV ONLY)]: ${rawResetToken}`);

    return genericResponse;
  }

  /**
   * Reset Password with token — TN-001
   */
  static async resetPassword(rawResetToken: string, newPassword: string) {
    const tokenHash = hashToken(rawResetToken);

    const tokenRecord = await prisma.passwordResetToken.findUnique({
      where: { tokenHash },
      include: { user: true },
    });

    if (!tokenRecord) {
      throw new AppError('Invalid or expired password reset token.', 400);
    }

    if (tokenRecord.usedAt) {
      throw new AppError('This password reset token has already been used.', 400);
    }

    if (tokenRecord.expiresAt < new Date()) {
      throw new AppError('Password reset token has expired.', 400);
    }

    if (!tokenRecord.user || tokenRecord.user.isDeleted) {
      throw new AppError('Associated user account was deleted.', 400);
    }

    // Hash new password
    const passwordHash = await bcrypt.hash(newPassword, 10);

    // Update user password
    await prisma.user.update({
      where: { id: tokenRecord.userId },
      data: { passwordHash },
    });

    // Mark reset token as used
    await prisma.passwordResetToken.update({
      where: { id: tokenRecord.id },
      data: { usedAt: new Date() },
    });

    // Revoke all existing active refresh tokens after password reset for security
    await prisma.refreshToken.updateMany({
      where: { userId: tokenRecord.userId, revokedAt: null },
      data: { revokedAt: new Date() },
    });

    return { message: 'Password has been reset successfully. Please log in with your new password.' };
  }

  /**
   * Get authenticated user profile — TN-001 (GET /me)
   */
  static async getMe(userId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user || user.isDeleted) {
      throw new AppError('User profile not found.', 404);
    }

    return getSafeUser(user);
  }

  /**
   * Change Password for authenticated user — TN-001 (POST /auth/change-password)
   */
  static async changePassword(userId: string, currentPassword: string, newPassword: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user || user.isDeleted) {
      throw new AppError('User profile not found.', 404);
    }

    if (!user.passwordHash) {
      throw new AppError('User account does not have a password set.', 400);
    }

    const isCurrentPasswordValid = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!isCurrentPasswordValid) {
      throw new AppError('Incorrect current password.', 400);
    }

    const passwordHash = await bcrypt.hash(newPassword, 10);

    await prisma.user.update({
      where: { id: userId },
      data: { passwordHash },
    });

    await prisma.refreshToken.updateMany({
      where: { userId, revokedAt: null },
      data: { revokedAt: new Date() },
    });

    return { message: 'Password updated successfully.' };
  }
}
