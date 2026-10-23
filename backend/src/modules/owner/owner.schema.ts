/**
 * TN-009 — Business Owner Listing Validation Schemas (Zod)
 */
import { z } from 'zod';

export const ownerBusinessParamsSchema = z.object({
  id: z.string().uuid({ message: 'Invalid business ID format. Must be a valid UUID.' }),
});

export type OwnerBusinessParams = z.infer<typeof ownerBusinessParamsSchema>;

export const updateBusinessSchema = z
  .object({
    name: z
      .string({ error: 'Name must be a string.' })
      .min(1, 'Business name cannot be blank.')
      .refine((s) => s.trim().length > 0, {
        message: 'Business name cannot be blank.',
      })
      .max(150, 'Business name cannot exceed 150 characters.')
      .optional(),

    categoryId: z
      .number({ error: 'Category ID must be a positive integer.' })
      .int('Category ID must be an integer.')
      .positive('Category ID must be a positive number.')
      .max(32767, 'Category ID is out of range.')
      .optional(),

    description: z
      .string({ error: 'Description must be a string.' })
      .max(2000, 'Description cannot exceed 2000 characters.')
      .optional(),

    landmarkDescription: z
      .string({ error: 'Landmark description must be a string.' })
      .min(1, 'Landmark description cannot be blank.')
      .refine((s) => s.trim().length > 0, {
        message: 'Landmark description cannot be blank.',
      })
      .max(500, 'Landmark description cannot exceed 500 characters.')
      .optional(),

    phone: z
      .string({ error: 'Phone must be a string.' })
      .max(32, 'Phone number cannot exceed 32 characters.')
      .refine((val) => /^[+0-9\s\-()]+$/.test(val), {
        message: 'Invalid phone number format.',
      })
      .optional(),

    hours: z
      .record(z.string(), z.unknown(), { error: 'Hours must be a valid JSON object.' })
      .refine((val) => typeof val === 'object' && val !== null && !Array.isArray(val), {
        message: 'Hours must be a valid JSON object.',
      })
      .optional(),
  })
  .strip();

export type UpdateBusinessInput = z.infer<typeof updateBusinessSchema>;

export const updatePhotosSchema = z
  .object({
    photoUrls: z
      .array(
        z.string({ error: 'Photo URL must be a string.' }).url({ message: 'Invalid photo URL.' }),
        { error: 'photoUrls must be an array of URL strings.' }
      )
      .max(10, { message: 'Too many photos. Maximum is 10.' }),
  })
  .strip();

export type UpdatePhotosInput = z.infer<typeof updatePhotosSchema>;

export const replyToReviewParamsSchema = z.object({
  reviewId: z.string().uuid({ message: 'Invalid review ID format. Must be a valid UUID.' }),
});

export type ReplyToReviewParams = z.infer<typeof replyToReviewParamsSchema>;

export const replyToReviewBodySchema = z
  .object({
    reply: z
      .string({ error: 'Reply must be a string.' })
      .min(1, 'Reply content cannot be blank.')
      .refine((s) => s.trim().length > 0, {
        message: 'Reply content cannot be blank.',
      })
      .max(2000, 'Reply cannot exceed 2000 characters.'),
  })
  .strip();

export type ReplyToReviewBody = z.infer<typeof replyToReviewBodySchema>;

