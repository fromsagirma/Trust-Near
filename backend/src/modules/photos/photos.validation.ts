import { z } from 'zod';

export const addPhotoSchema = z.object({
  url: z
    .string({ message: 'Photo URL is required' })
    .trim()
    .url({ message: 'Invalid photo URL format' })
    .max(2048, 'Photo URL cannot exceed 2048 characters'),
  sortOrder: z.preprocess(
    (val) => (val === undefined || val === '' ? 0 : Number(val)),
    z
      .number({ message: 'Sort order must be a number' })
      .int({ message: 'Sort order must be an integer' })
      .min(0, 'Sort order cannot be negative')
      .default(0)
  ),
});

export const updatePhotoSchema = z.object({
  url: z
    .string()
    .trim()
    .url({ message: 'Invalid photo URL format' })
    .max(2048, 'Photo URL cannot exceed 2048 characters')
    .optional(),
  sortOrder: z
    .number({ message: 'Sort order must be a number' })
    .int({ message: 'Sort order must be an integer' })
    .min(0, 'Sort order cannot be negative')
    .optional(),
});

export const reorderPhotosSchema = z.object({
  photos: z
    .array(
      z.object({
        id: z.string().uuid({ message: 'Invalid photo ID format in reorder list' }),
        sortOrder: z
          .number({ message: 'Sort order must be a number' })
          .int({ message: 'Sort order must be an integer' })
          .min(0, 'Sort order cannot be negative'),
      })
    )
    .min(1, 'Photos reorder array cannot be empty'),
});

export const businessIdParamSchema = z.object({
  businessId: z.string().uuid({ message: 'Invalid business ID format' }),
});

export const photoIdParamSchema = z.object({
  photoId: z.string().uuid({ message: 'Invalid photo ID format' }),
});

export const businessAndPhotoIdParamSchema = z.object({
  businessId: z.string().uuid({ message: 'Invalid business ID format' }),
  photoId: z.string().uuid({ message: 'Invalid photo ID format' }),
});

export type AddPhotoInput = z.infer<typeof addPhotoSchema>;
export type UpdatePhotoInput = z.infer<typeof updatePhotoSchema>;
export type ReorderPhotosInput = z.infer<typeof reorderPhotosSchema>;
