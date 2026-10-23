import { z } from 'zod';

const locationObjectSchema = z.object({
  lat: z
    .number({ message: 'Latitude must be a number' })
    .min(-90, 'Latitude must be between -90 and 90')
    .max(90, 'Latitude must be between -90 and 90'),
  lng: z
    .number({ message: 'Longitude must be a number' })
    .min(-180, 'Longitude must be between -180 and 180')
    .max(180, 'Longitude must be between -180 and 180'),
});

export const rateBusinessSchema = z.object({
  rating: z
    .number({ message: 'Rating is required' })
    .int('Rating must be an integer')
    .min(1, 'Rating must be at least 1')
    .max(5, 'Rating cannot exceed 5'),
  comment: z
    .string()
    .trim()
    .max(2000, 'Comment cannot exceed 2000 characters')
    .optional()
    .nullable(),
  location: locationObjectSchema.optional().nullable(),
  lat: z
    .number({ message: 'Latitude must be a number' })
    .min(-90, 'Latitude must be between -90 and 90')
    .max(90, 'Latitude must be between -90 and 90')
    .optional()
    .nullable(),
  lng: z
    .number({ message: 'Longitude must be a number' })
    .min(-180, 'Longitude must be between -180 and 180')
    .max(180, 'Longitude must be between -180 and 180')
    .optional()
    .nullable(),
});

export const updateReviewSchema = z
  .object({
    rating: z
      .number({ message: 'Rating must be a number' })
      .int('Rating must be an integer')
      .min(1, 'Rating must be at least 1')
      .max(5, 'Rating cannot exceed 5')
      .optional(),
    comment: z
      .string()
      .trim()
      .max(2000, 'Comment cannot exceed 2000 characters')
      .optional()
      .nullable(),
    location: locationObjectSchema.optional().nullable(),
    lat: z
      .number({ message: 'Latitude must be a number' })
      .min(-90, 'Latitude must be between -90 and 90')
      .max(90, 'Latitude must be between -90 and 90')
      .optional()
      .nullable(),
    lng: z
      .number({ message: 'Longitude must be a number' })
      .min(-180, 'Longitude must be between -180 and 180')
      .max(180, 'Longitude must be between -180 and 180')
      .optional()
      .nullable(),
  })
  .refine(
    (data) =>
      data.rating !== undefined ||
      data.comment !== undefined ||
      data.location !== undefined ||
      data.lat !== undefined ||
      data.lng !== undefined,
    {
      message: 'At least one field (rating, comment, or location) must be provided for update',
    }
  );

export const verifyVisitSchema = z
  .object({
    location: locationObjectSchema.optional().nullable(),
    lat: z
      .number({ message: 'Latitude must be a number' })
      .min(-90, 'Latitude must be between -90 and 90')
      .max(90, 'Latitude must be between -90 and 90')
      .optional()
      .nullable(),
    lng: z
      .number({ message: 'Longitude must be a number' })
      .min(-180, 'Longitude must be between -180 and 180')
      .max(180, 'Longitude must be between -180 and 180')
      .optional()
      .nullable(),
  })
  .refine(
    (data) => {
      if (data.location && typeof data.location.lat === 'number' && typeof data.location.lng === 'number') {
        return true;
      }
      if (typeof data.lat === 'number' && typeof data.lng === 'number') {
        return true;
      }
      return false;
    },
    {
      message: 'Valid coordinates (lat and lng, or location: { lat, lng }) are required',
    }
  );

export const businessIdParamSchema = z.object({
  businessId: z.string().uuid({ message: 'Invalid business ID format' }),
});

export const reviewIdParamSchema = z.object({
  reviewId: z.string().uuid({ message: 'Invalid review ID format' }),
});

export const businessAndReviewIdParamSchema = z.object({
  businessId: z.string().uuid({ message: 'Invalid business ID format' }),
  reviewId: z.string().uuid({ message: 'Invalid review ID format' }),
});

export const reportReviewSchema = z.object({
  reason: z.enum(['fake', 'abusive', 'spam', 'other'], {
    message: 'Reason is required and must be one of: fake, abusive, spam, other',
  }),
});

export const listReviewsQuerySchema = z.object({
  page: z.preprocess(
    (val) => (val === undefined || val === '' ? 1 : Number(val)),
    z.number().int().positive().default(1)
  ),
  pageSize: z.preprocess(
    (val) => (val === undefined || val === '' ? 20 : Number(val)),
    z.number().int().positive().max(50).default(20)
  ),
  sort: z.preprocess(
    (val) => (val === undefined || val === '' ? 'newest' : val),
    z.enum(['newest', 'oldest', 'highest', 'lowest', 'verified']).default('newest')
  ),
  verifiedOnly: z.preprocess(
    (val) => {
      if (val === 'true' || val === true || val === '1' || val === 1) return true;
      if (val === 'false' || val === false || val === '0' || val === 0) return false;
      return undefined;
    },
    z.boolean().optional()
  ),
});

export type RateBusinessInput = z.infer<typeof rateBusinessSchema>;
export type UpdateReviewInput = z.infer<typeof updateReviewSchema>;
export type VerifyVisitInput = z.infer<typeof verifyVisitSchema>;
export type ListReviewsQuery = z.infer<typeof listReviewsQuerySchema>;



