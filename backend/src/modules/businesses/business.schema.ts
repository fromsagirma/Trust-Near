/**
 * TN-006 / TN-007 — Business Listing Validation Schema (Zod v4 compatible)
 *
 * Intentionally omits submittedBy, ownerId, and status.
 * Zod strips unknown keys by default, so any client-supplied
 * values for those fields are silently discarded before the
 * service layer is ever reached.
 *
 * Zod v4 API notes:
 *   - Custom error messages use `error:` (not `required_error:` / `invalid_type_error:`)
 *   - z.record() requires two type arguments: z.record(keySchema, valueSchema)
 */
import { z } from 'zod';

export const createBusinessSchema = z.object({
  name: z
    .string()
    .min(1, 'Business name is required.')
    .refine((s) => s.trim().length > 0, {
      message: 'Business name cannot be blank.',
    }),

  // categoryId is SmallInt (Int @db.SmallInt) in the Prisma schema — max 32767
  categoryId: z
    .number({ error: 'Category ID must be a positive integer.' })
    .int('Category ID must be an integer.')
    .positive('Category ID must be a positive number.')
    .max(32767, 'Category ID is out of range.'),

  location: z.object({
    lat: z
      .number({ error: 'Latitude must be a number.' })
      .min(-90, 'Latitude must be between -90 and 90.')
      .max(90, 'Latitude must be between -90 and 90.'),
    lng: z
      .number({ error: 'Longitude must be a number.' })
      .min(-180, 'Longitude must be between -180 and 180.')
      .max(180, 'Longitude must be between -180 and 180.'),
  }),

  landmarkDescription: z
    .string()
    .min(1, 'Landmark description is required.')
    .refine((s) => s.trim().length > 0, {
      message: 'Landmark description cannot be blank.',
    }),

  description: z.string().optional(),
  phone: z.string().optional(),

  // Accept any JSON object; detailed hour-slot validation deferred to a later ticket.
  hours: z.record(z.string(), z.unknown()).optional(),

  // Already-uploaded URLs only — no file-upload logic in this ticket.
  photoUrls: z.array(z.string()).optional(),
});

export type CreateBusinessInput = z.infer<typeof createBusinessSchema>;

export const nearbyQuerySchema = z.object({
  lat: z.preprocess(
    (val) => (val === undefined || val === '' ? undefined : Number(val)),
    z
      .number({ error: 'Latitude is required and must be a number.' })
      .min(-90, 'Latitude must be between -90 and 90.')
      .max(90, 'Latitude must be between -90 and 90.')
  ),
  lng: z.preprocess(
    (val) => (val === undefined || val === '' ? undefined : Number(val)),
    z
      .number({ error: 'Longitude is required and must be a number.' })
      .min(-180, 'Longitude must be between -180 and 180.')
      .max(180, 'Longitude must be between -180 and 180.')
  ),
  radius: z.preprocess(
    (val) => (val === undefined || val === '' ? undefined : Number(val)),
    z
      .number({ error: 'Radius is required and must be a number.' })
      .min(100, 'Radius must be at least 100 meters.')
      .max(100000, 'Radius must not exceed 100,000 meters.')
  ),
  sort: z.preprocess(
    (val) => (val === undefined || val === '' ? 'distance' : val),
    z.enum(['distance', 'rating'], {
      error: 'Sort must be one of: distance, rating.',
    })
  ),
  page: z.preprocess(
    (val) => (val === undefined || val === '' ? 1 : Number(val)),
    z
      .number({ error: 'Page must be a positive integer.' })
      .int('Page must be a positive integer.')
      .positive('Page must be a positive integer.')
  ),
  pageSize: z.preprocess(
    (val) => (val === undefined || val === '' ? 20 : Number(val)),
    z
      .number({ error: 'PageSize must be a positive integer.' })
      .int('PageSize must be a positive integer.')
      .positive('PageSize must be a positive integer.')
      .transform((v) => Math.min(v, 50))
  ),
  name: z.preprocess(
    (val) => {
      if (val === undefined || val === null) return undefined;
      if (typeof val === 'string') {
        const trimmed = val.trim();
        return trimmed.length > 0 ? trimmed : undefined;
      }
      return val;
    },
    z
      .string({ error: 'Name must be a string.' })
      .max(200, 'Search name must not exceed 200 characters.')
      .optional()
  ),
  categoryId: z.preprocess(
    (val) => (val === undefined || val === '' ? undefined : Number(val)),
    z
      .number({ error: 'Category ID must be a positive integer.' })
      .int('Category ID must be an integer.')
      .positive('Category ID must be a positive number.')
      .max(32767, 'Category ID is out of range.')
      .optional()
  ),
  minRating: z.preprocess(
    (val) => (val === undefined || val === '' ? undefined : Number(val)),
    z
      .number({ error: 'Minimum rating must be a number.' })
      .min(0, 'Minimum rating must be between 0 and 5.')
      .max(5, 'Minimum rating must be between 0 and 5.')
      .optional()
  ),
});

export type NearbyQueryInput = z.infer<typeof nearbyQuerySchema>;

export const getBusinessDetailsParamsSchema = z.object({
  id: z.string().uuid({ message: 'Invalid business ID format. Must be a valid UUID.' }),
});

export type GetBusinessDetailsParams = z.infer<typeof getBusinessDetailsParamsSchema>;



