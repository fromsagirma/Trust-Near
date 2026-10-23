import { z } from 'zod';

export const registerSchema = z
  .object({
    displayName: z.string().min(1, 'Display name is required').max(100),
    email: z.string().email('Invalid email address').optional().or(z.literal('')),
    phone: z.string().optional().or(z.literal('')),
    password: z.string().min(6, 'Password must be at least 6 characters long'),
  })
  .refine((data) => (data.email && data.email.trim().length > 0) || (data.phone && data.phone.trim().length > 0), {
    message: 'Either email or phone number is required for registration.',
    path: ['email'],
  });

export const loginSchema = z
  .object({
    email: z.string().optional(),
    phone: z.string().optional(),
    emailOrPhone: z.string().optional(),
    password: z.string().min(1, 'Password is required'),
  })
  .refine(
    (data) =>
      (data.email && data.email.trim().length > 0) ||
      (data.phone && data.phone.trim().length > 0) ||
      (data.emailOrPhone && data.emailOrPhone.trim().length > 0),
    {
      message: 'Email or phone number is required to log in.',
      path: ['emailOrPhone'],
    }
  );

export const refreshTokenSchema = z.object({
  refreshToken: z.string().min(1, 'Refresh token is required.'),
});

export const forgotPasswordSchema = z
  .object({
    email: z.string().optional(),
    phone: z.string().optional(),
    identifier: z.string().optional(),
  })
  .refine(
    (data) =>
      (data.email && data.email.trim().length > 0) ||
      (data.phone && data.phone.trim().length > 0) ||
      (data.identifier && data.identifier.trim().length > 0),
    {
      message: 'Email, phone, or account identifier is required.',
      path: ['identifier'],
    }
  );

export const resetPasswordSchema = z.object({
  token: z.string().min(1, 'Reset token is required.'),
  newPassword: z.string().min(6, 'New password must be at least 6 characters long'),
});

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required.'),
  newPassword: z.string().min(6, 'New password must be at least 6 characters long.'),
});
