import { z } from 'zod';

export const analyticsQuerySchema = z.object({
  timeframe: z
    .preprocess(
      (val) => (val === undefined || val === '' ? '30d' : val),
      z.enum(['7d', '30d', '90d', 'all'])
    )
    .default('30d'),
});

export type AnalyticsQuery = z.infer<typeof analyticsQuerySchema>;

export const analyticsFilteredListQuerySchema = z.object({
  categoryId: z.coerce.number().int().positive().optional(),
  city: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(50).default(10),
});

export type AnalyticsFilteredListQuery = z.infer<typeof analyticsFilteredListQuerySchema>;

