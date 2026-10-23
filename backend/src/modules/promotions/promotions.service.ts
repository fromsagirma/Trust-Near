import { prisma } from '../../config/db';
import { CreatePromotionInput, ListPromotionsQuery } from './promotions.validation';

export class PromotionsService {
  /**
   * Business owner purchases/creates a promotion for a published owned business.
   */
  static async createPromotion(
    purchasedBy: string,
    businessId: string,
    data: CreatePromotionInput,
    userRole?: string
  ) {
    const business = await prisma.business.findUnique({
      where: { id: businessId },
    });

    if (!business) {
      throw { status: 404, message: 'Business not found' };
    }

    if (business.status !== 'published') {
      throw { status: 400, message: 'Promotions can only be created for published businesses' };
    }

    const isAdmin = userRole === 'admin' || userRole === 'seed_admin';
    if (!isAdmin && business.ownerId !== purchasedBy) {
      throw { status: 403, message: 'You do not own this business' };
    }

    const startDate = new Date(data.startDate);
    const endDate = new Date(data.endDate);

    const promotion = await prisma.promotion.create({
      data: {
        businessId,
        purchasedBy,
        title: data.title,
        description: data.description ?? null,
        startDate,
        endDate,
        status: 'active',
      },
      include: {
        business: {
          select: {
            id: true,
            name: true,
            categoryId: true,
          },
        },
      },
    });

    return promotion;
  }

  /**
   * List promotions owned by the authenticated business owner.
   */
  static async getOwnerPromotions(purchasedBy: string, query: ListPromotionsQuery) {
    const { page, pageSize, status } = query;
    const validPage = Math.max(1, page);
    const validPageSize = Math.max(1, Math.min(50, pageSize));
    const skip = (validPage - 1) * validPageSize;

    const whereClause: any = {
      purchasedBy,
      ...(status ? { status } : {}),
    };

    const [promotions, total] = await Promise.all([
      prisma.promotion.findMany({
        where: whereClause,
        include: {
          business: {
            select: {
              id: true,
              name: true,
              categoryId: true,
              landmarkDescription: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: validPageSize,
      }),
      prisma.promotion.count({ where: whereClause }),
    ]);

    const totalPages = Math.ceil(total / validPageSize);

    return {
      data: promotions,
      pagination: {
        page: validPage,
        pageSize: validPageSize,
        total,
        totalPages,
      },
    };
  }

  /**
   * Public list of currently active promoted placements.
   */
  static async getActivePromotions(query: ListPromotionsQuery) {
    const { page, pageSize } = query;
    const validPage = Math.max(1, page);
    const validPageSize = Math.max(1, Math.min(50, pageSize));
    const skip = (validPage - 1) * validPageSize;

    const now = new Date();

    const whereClause: any = {
      status: 'active',
      startDate: { lte: now },
      endDate: { gte: now },
      business: {
        status: 'published',
      },
    };

    const [promotions, total] = await Promise.all([
      prisma.promotion.findMany({
        where: whereClause,
        include: {
          business: {
            select: {
              id: true,
              name: true,
              categoryId: true,
              description: true,
              landmarkDescription: true,
              phone: true,
              hours: true,
              avgRating: true,
              reviewCount: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: validPageSize,
      }),
      prisma.promotion.count({ where: whereClause }),
    ]);

    const totalPages = Math.ceil(total / validPageSize);

    return {
      data: promotions,
      pagination: {
        page: validPage,
        pageSize: validPageSize,
        total,
        totalPages,
      },
    };
  }

  /**
   * Cancel an active promotion.
   */
  static async cancelPromotion(promotionId: string, purchasedBy: string, userRole?: string) {
    const promotion = await prisma.promotion.findUnique({
      where: { id: promotionId },
    });

    if (!promotion) {
      throw { status: 404, message: 'Promotion not found' };
    }

    const isAdmin = userRole === 'admin' || userRole === 'seed_admin';
    if (!isAdmin && promotion.purchasedBy !== purchasedBy) {
      throw { status: 404, message: 'Promotion not found' };
    }

    if (promotion.status === 'cancelled') {
      return promotion;
    }

    const updated = await prisma.promotion.update({
      where: { id: promotionId },
      data: { status: 'cancelled' },
    });

    return updated;
  }

  /**
   * Admin list of all promotions across the platform.
   */
  static async adminListPromotions(query: ListPromotionsQuery) {
    const { page, pageSize, status } = query;
    const validPage = Math.max(1, page);
    const validPageSize = Math.max(1, Math.min(50, pageSize));
    const skip = (validPage - 1) * validPageSize;

    const whereClause: any = status ? { status } : {};

    const [promotions, total] = await Promise.all([
      prisma.promotion.findMany({
        where: whereClause,
        include: {
          business: {
            select: {
              id: true,
              name: true,
              categoryId: true,
            },
          },
          buyer: {
            select: {
              id: true,
              displayName: true,
              email: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: validPageSize,
      }),
      prisma.promotion.count({ where: whereClause }),
    ]);

    const totalPages = Math.ceil(total / validPageSize);

    return {
      data: promotions,
      pagination: {
        page: validPage,
        pageSize: validPageSize,
        total,
        totalPages,
      },
    };
  }
}
