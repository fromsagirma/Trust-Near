import { prisma } from '../../config/db';
import { ActivityType } from '@prisma/client';

export interface LogActivityParams {
  userId: string;
  activityType: ActivityType;
  title: string;
  subtitle?: string | null;
  businessId?: string | null;
  metadata?: any;
}

export class ActivityService {
  /**
   * Record a new user activity in the database.
   */
  static async logActivity(params: LogActivityParams) {
    const { userId, activityType, title, subtitle, businessId, metadata } = params;

    return prisma.userActivity.create({
      data: {
        userId,
        activityType,
        title,
        subtitle: subtitle ?? null,
        businessId: businessId ?? null,
        metadata: metadata ?? {},
      },
    });
  }

  /**
   * Log a place visit explicitly by user.
   */
  static async logPlaceVisit(userId: string, businessId: string, location?: { lat: number; lng: number }) {
    const business = await prisma.business.findUnique({
      where: { id: businessId },
      select: { id: true, name: true, landmarkDescription: true },
    });

    if (!business) {
      throw { status: 404, message: 'Business not found' };
    }

    const title = `Visited ${business.name}`;
    const subtitle = business.landmarkDescription || 'Visited place';

    return this.logActivity({
      userId,
      activityType: ActivityType.place_visited,
      title,
      subtitle,
      businessId,
      metadata: location ? { location } : {},
    });
  }

  /**
   * Get paginated activities for the logged-in user, formatted for the Flutter ActivityScreen.
   */
  static async getUserActivities(userId: string, page: number = 1, pageSize: number = 20) {
    const validPage = Math.max(1, page);
    const validPageSize = Math.max(1, Math.min(50, pageSize));
    const skip = (validPage - 1) * validPageSize;

    const [activities, total] = await Promise.all([
      prisma.userActivity.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        skip,
        take: validPageSize,
        include: {
          business: {
            select: {
              id: true,
              name: true,
              landmarkDescription: true,
            },
          },
        },
      }),
      prisma.userActivity.count({ where: { userId } }),
    ]);

    const formattedData = activities.map((act) => {
      let icon = 'star_rounded';
      let iconColor = '#FFA000';

      switch (act.activityType) {
        case ActivityType.review_submitted:
          icon = 'star_rounded';
          iconColor = '#FFA000';
          break;
        case ActivityType.place_visited:
          icon = 'location_on_rounded';
          iconColor = '#5547E8';
          break;
        case ActivityType.place_saved:
          icon = 'bookmark_rounded';
          iconColor = '#10B981';
          break;
        case ActivityType.place_unsaved:
          icon = 'bookmark_border_rounded';
          iconColor = '#858B96';
          break;
        case ActivityType.listing_created:
          icon = 'add_business_rounded';
          iconColor = '#3B82F6';
          break;
      }

      return {
        id: act.id,
        type: act.activityType,
        icon,
        iconColor,
        title: act.title,
        subtitle: act.subtitle || '',
        time: this.formatTimeAgo(act.createdAt),
        createdAt: act.createdAt,
        businessId: act.businessId,
        businessName: act.business?.name || null,
        metadata: act.metadata,
      };
    });

    return {
      data: formattedData,
      pagination: {
        page: validPage,
        pageSize: validPageSize,
        total,
        totalPages: Math.ceil(total / validPageSize),
      },
    };
  }

  /**
   * Get user activity stats to populate ProfileScreen stat cards dynamically.
   */
  static async getUserActivityStats(userId: string) {
    const [savedPlacesCount, reviewsCount, recentlyVisitedCount] = await Promise.all([
      prisma.favorite.count({ where: { userId } }),
      prisma.review.count({ where: { userId, isDeleted: false } }),
      prisma.userActivity.count({
        where: {
          userId,
          activityType: ActivityType.place_visited,
        },
      }),
    ]);

    return {
      savedPlaces: savedPlacesCount,
      reviews: reviewsCount,
      recentlyVisited: recentlyVisitedCount,
    };
  }

  /**
   * Helper utility to format timestamp into human-readable relative time string.
   */
  private static formatTimeAgo(date: Date): string {
    const now = new Date();
    const seconds = Math.floor((now.getTime() - new Date(date).getTime()) / 1000);

    if (seconds < 60) return 'Just now';
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    if (days < 7) return `${days}d ago`;
    const weeks = Math.floor(days / 7);
    if (weeks < 4) return `${weeks}w ago`;
    const months = Math.floor(days / 30);
    return `${months}mo ago`;
  }
}
