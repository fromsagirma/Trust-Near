/**
 * TN-021 — Admin Content Moderation Schemas
 */
import { z } from 'zod';

export const reportIdParamSchema = z.object({
  reportId: z.string().uuid({ message: 'Invalid report ID format. Must be a valid UUID.' }),
});

export const removeReportSchema = z.object({
  reason: z
    .string()
    .max(500, 'Moderation reason cannot exceed 500 characters.')
    .optional(),
});

export const moderationQueueQuerySchema = z.object({
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
      return isNaN(parsed) || parsed < 1 ? 20 : Math.min(parsed, 50);
    }),
  sortBy: z
    .enum(['recency', 'volume'])
    .optional()
    .default('recency'),
  status: z.string().optional(),
});

export type RemoveReportInput = z.infer<typeof removeReportSchema>;
