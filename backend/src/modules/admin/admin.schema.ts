/**
 * TN-022 — Admin Business Approval Schemas
 */
import { z } from 'zod';

export const businessIdParamSchema = z.object({
  id: z.string().uuid({ message: 'Invalid business ID format. Must be a valid UUID.' }),
});

export const rejectBusinessSchema = z.object({
  reason: z
    .string()
    .max(500, 'Rejection reason cannot exceed 500 characters.')
    .optional(),
});

export const pendingQuerySchema = z.object({
  page: z
    .string()
    .optional()
    .transform((val) => {
      if (!val) return 1;
      const parsed = parseInt(val, 10);
      return isNaN(parsed) || parsed < 1 ? 1 : parsed;
    }),
  pageSize: z
    .string()
    .optional()
    .transform((val) => {
      if (!val) return 20;
      const parsed = parseInt(val, 10);
      return isNaN(parsed) || parsed < 1 ? 20 : Math.min(parsed, 100);
    }),
  status: z.string().optional(),
});

export type RejectBusinessInput = z.infer<typeof rejectBusinessSchema>;

export const userIdParamSchema = z.object({
  id: z.string().uuid({ message: 'Invalid user ID format. Must be a valid UUID.' }),
});

export const usersQuerySchema = z.object({
  page: z
    .string()
    .optional()
    .transform((val) => {
      if (!val) return 1;
      const parsed = parseInt(val, 10);
      return isNaN(parsed) || parsed < 1 ? 1 : parsed;
    }),
  pageSize: z
    .string()
    .optional()
    .transform((val) => {
      if (!val) return 50;
      const parsed = parseInt(val, 10);
      return isNaN(parsed) || parsed < 1 ? 50 : Math.min(parsed, 100);
    }),
  search: z.string().optional(),
  role: z.string().optional(),
  status: z.string().optional(),
});

export const updateUserRoleSchema = z.object({
  role: z.enum(['user', 'consumer', 'business_owner', 'admin', 'seed_admin', 'guest_promoted']),
});

export const toggleUserBanSchema = z.object({
  isBanned: z.boolean().optional(),
  reason: z.string().max(500, 'Ban reason cannot exceed 500 characters.').optional(),
});

