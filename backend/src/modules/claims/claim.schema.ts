/**
 * TN-016 — Business Claim Schemas
 */
import { z } from 'zod';

export const businessIdParamSchema = z.object({
  id: z.string().uuid({ message: 'Invalid business ID format. Must be a valid UUID.' }),
});

export const claimIdParamSchema = z.object({
  claimId: z.string().uuid({ message: 'Invalid claim ID format. Must be a valid UUID.' }),
});

export const createClaimSchema = z.object({
  verificationInfo: z.record(z.string(), z.any()).optional().default({}),
}).passthrough();

export const rejectClaimSchema = z.object({
  reason: z
    .string()
    .max(500, 'Rejection reason cannot exceed 500 characters.')
    .optional(),
});

export const pendingClaimsQuerySchema = z.object({
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
});

export type CreateClaimInput = z.infer<typeof createClaimSchema>;
export type RejectClaimInput = z.infer<typeof rejectClaimSchema>;
