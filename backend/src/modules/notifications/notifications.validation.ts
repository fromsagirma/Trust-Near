import { z } from 'zod';

export const listNotificationsQuerySchema = z.object({
  page: z.preprocess(
    (val) => (val === undefined || val === '' ? 1 : Number(val)),
    z.number().int().positive().default(1)
  ),
  pageSize: z.preprocess(
    (val) => (val === undefined || val === '' ? 20 : Number(val)),
    z.number().int().positive().max(50).default(20)
  ),
  unreadOnly: z.preprocess(
    (val) => {
      if (val === 'true' || val === true || val === '1' || val === 1) return true;
      if (val === 'false' || val === false || val === '0' || val === 0) return false;
      return undefined;
    },
    z.boolean().optional()
  ),
});

export const notificationIdParamSchema = z.object({
  notificationId: z.string().uuid({ message: 'Invalid notification ID format' }),
});

export type ListNotificationsQuery = z.infer<typeof listNotificationsQuerySchema>;
