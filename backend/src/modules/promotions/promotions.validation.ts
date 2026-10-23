import { z } from 'zod';

export const createPromotionSchema = z
  .object({
    title: z
      .string({ message: 'Title is required' })
      .trim()
      .min(1, 'Title cannot be empty')
      .max(150, 'Title cannot exceed 150 characters'),
    description: z.string().trim().optional().nullable(),
    startDate: z
      .string({ message: 'Start date is required' })
      .refine((val) => !isNaN(Date.parse(val)), { message: 'Invalid start date format' }),
    endDate: z
      .string({ message: 'End date is required' })
      .refine((val) => !isNaN(Date.parse(val)), { message: 'Invalid end date format' }),
  })
  .refine(
    (data) => {
      const start = new Date(data.startDate);
      const end = new Date(data.endDate);
      return end >= start;
    },
    {
      message: 'End date must be greater than or equal to start date',
      path: ['endDate'],
    }
  );

export const listPromotionsQuerySchema = z.object({
  page: z.preprocess(
    (val) => (val === undefined || val === '' ? 1 : Number(val)),
    z.number().int().positive().default(1)
  ),
  pageSize: z.preprocess(
    (val) => (val === undefined || val === '' ? 20 : Number(val)),
    z.number().int().positive().max(50).default(20)
  ),
  status: z.preprocess(
    (val) => (val === undefined || val === '' ? undefined : val),
    z.enum(['active', 'expired', 'cancelled']).optional()
  ),
});

export const promotionIdParamSchema = z.object({
  promotionId: z.string().uuid({ message: 'Invalid promotion ID format' }),
});

export const businessIdParamSchema = z.object({
  businessId: z.string().uuid({ message: 'Invalid business ID format' }),
});

export type CreatePromotionInput = z.infer<typeof createPromotionSchema>;
export type ListPromotionsQuery = z.infer<typeof listPromotionsQuerySchema>;
