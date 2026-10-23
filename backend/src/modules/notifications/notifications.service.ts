import { NotificationType } from '@prisma/client';
import { prisma } from '../../config/db';
import { ListNotificationsQuery } from './notifications.validation';

export class NotificationsService {
  /**
   * Helper method to dispatch and persist a system notification to a target user.
   */
  static async createNotification(
    userId: string,
    type: NotificationType,
    payload: Record<string, any>
  ) {
    return prisma.notification.create({
      data: {
        userId,
        type,
        payload,
      },
    });
  }

  /**
   * Retrieve paginated notifications for the authenticated user.
   */
  static async getUserNotifications(userId: string, query: ListNotificationsQuery) {
    const { page, pageSize, unreadOnly } = query;
    const validPage = Math.max(1, page);
    const validPageSize = Math.max(1, Math.min(50, pageSize));
    const skip = (validPage - 1) * validPageSize;

    const whereClause: any = {
      userId,
      ...(unreadOnly ? { isRead: false } : {}),
    };

    const [notifications, total, unreadCount] = await Promise.all([
      prisma.notification.findMany({
        where: whereClause,
        orderBy: { createdAt: 'desc' },
        skip,
        take: validPageSize,
      }),
      prisma.notification.count({ where: whereClause }),
      prisma.notification.count({ where: { userId, isRead: false } }),
    ]);

    const totalPages = Math.ceil(total / validPageSize);

    return {
      data: notifications,
      unreadCount,
      pagination: {
        page: validPage,
        pageSize: validPageSize,
        total,
        totalPages,
      },
    };
  }

  /**
   * Mark a single notification as read for the authenticated user.
   */
  static async markAsRead(notificationId: string, userId: string) {
    const notification = await prisma.notification.findUnique({
      where: { id: notificationId },
    });

    if (!notification) {
      throw { status: 404, message: 'Notification not found' };
    }

    if (notification.userId !== userId) {
      throw { status: 404, message: 'Notification not found' };
    }

    if (notification.isRead) {
      return notification;
    }

    return prisma.notification.update({
      where: { id: notificationId },
      data: { isRead: true },
    });
  }

  /**
   * Mark all notifications for the authenticated user as read.
   */
  static async markAllAsRead(userId: string) {
    const result = await prisma.notification.updateMany({
      where: { userId, isRead: false },
      data: { isRead: true },
    });

    return { count: result.count };
  }

  /**
   * Get unread notification count for the authenticated user.
   */
  static async getUnreadCount(userId: string) {
    const count = await prisma.notification.count({
      where: { userId, isRead: false },
    });

    return { unreadCount: count };
  }
}
