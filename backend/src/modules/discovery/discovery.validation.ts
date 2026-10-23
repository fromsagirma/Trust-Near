import { z } from 'zod';

export const recommendationQuerySchema = z.object({
  lat: z.preprocess(
    (val) => (val === undefined || val === '' ? 9.0 : Number(val)),
    z
      .number({ message: 'Latitude must be a number' })
      .min(-90, 'Latitude must be between -90 and 90')
      .max(90, 'Latitude must be between -90 and 90')
      .default(9.0)
  ),
  lng: z.preprocess(
    (val) => (val === undefined || val === '' ? 38.78 : Number(val)),
    z
      .number({ message: 'Longitude must be a number' })
      .min(-180, 'Longitude must be between -180 and 180')
      .max(180, 'Longitude must be between -180 and 180')
      .default(38.78)
  ),
  radius: z.preprocess(
    (val) => (val === undefined || val === '' ? 5000 : Number(val)),
    z
      .number({ message: 'Radius must be a number' })
      .min(100, 'Radius must be at least 100 meters')
      .max(50000, 'Radius cannot exceed 50000 meters')
      .default(5000)
  ),
  limit: z.preprocess(
    (val) => (val === undefined || val === '' ? 10 : Number(val)),
    z
      .number({ message: 'Limit must be a number' })
      .int()
      .positive()
      .max(50)
      .default(10)
  ),
  categoryId: z.preprocess(
    (val) => (val === undefined || val === '' ? undefined : Number(val)),
    z.number().int().positive().optional()
  ),
});

export type RecommendationQuery = z.infer<typeof recommendationQuerySchema>;
