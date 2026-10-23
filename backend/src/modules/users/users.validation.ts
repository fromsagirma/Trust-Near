import { z } from 'zod';

export const updateProfileSchema = z.object({
  displayName: z.string().min(1).max(80).optional(),
  phone: z.string().max(32).optional().nullable(),
  profilePhotoUrl: z.string().optional().nullable(),
  languagePref: z.string().optional().nullable(),
}).refine(data => Object.keys(data).length > 0, {
  message: 'At least one profile field must be provided',
});

export const deleteAccountSchema = z.object({
  password: z.string().min(1, 'Password is required to confirm account deletion'),
});

export const updateLocationSettingsSchema = z.object({
  city: z.string().min(1).max(100).optional(),
  lat: z.number().min(-90).max(90).optional(),
  lng: z.number().min(-180).max(180).optional(),
  radiusKm: z.number().positive().max(100).optional(),
}).refine(data => Object.keys(data).length > 0, {
  message: 'At least one location setting field must be provided',
});

export const updateNotificationSettingsSchema = z.object({
  pushNotificationsEnabled: z.boolean().optional(),
  emailUpdatesEnabled: z.boolean().optional(),
}).refine(data => Object.keys(data).length > 0, {
  message: 'At least one notification setting field must be provided',
});


