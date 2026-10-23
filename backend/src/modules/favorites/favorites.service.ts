import { prisma } from '../../config/db';
import { ActivityType, Prisma } from '@prisma/client';
import { ActivityService } from '../activity/activity.service';

export class FavoritesService {
  static async addFavorite(businessId: string, userId: string) {
    const business = await prisma.business.findUnique({ where: { id: businessId } });
    if (!business) {
      throw { status: 404, message: 'Business not found' };
    }
    if (business.status !== 'published') {
      throw { status: 400, message: 'Cannot favorite a business that is not published' };
    }

    try {
      const favorite = await prisma.favorite.create({
        data: { userId, businessId },
      });

      try {
        await ActivityService.logActivity({
          userId,
          activityType: ActivityType.place_saved,
          title: `Saved ${business.name}`,
          subtitle: 'Added to your saved places list',
          businessId,
        });
      } catch (_) {
        // Non-blocking activity log failure
      }

      return favorite;
    } catch (err: any) {
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
        throw { status: 409, message: 'Business is already in your favorites' };
      }
      throw err;
    }
  }

  static async removeFavorite(businessId: string, userId: string) {
    try {
      await prisma.favorite.delete({
        where: { userId_businessId: { userId, businessId } },
      });

      try {
        await ActivityService.logActivity({
          userId,
          activityType: ActivityType.place_unsaved,
          title: `Unsaved place`,
          subtitle: 'Removed from your saved places list',
          businessId,
        });
      } catch (_) {
        // Non-blocking activity log failure
      }

      return { message: 'Removed from favorites' };
    } catch (err: any) {
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2025') {
        throw { status: 404, message: 'Favorite not found' };
      }
      throw err;
    }
  }

  static async listFavorites(userId: string, page: number, pageSize: number) {
    const [items, total] = await prisma.$transaction([
      prisma.favorite.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: { business: true },
      }),
      prisma.favorite.count({ where: { userId } }),
    ]);

    return {
      items,
      pagination: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) },
    };
  }
}
