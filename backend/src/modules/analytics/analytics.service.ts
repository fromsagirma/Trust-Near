import { prisma } from '../../config/db';
import { AnalyticsQuery, AnalyticsFilteredListQuery } from './analytics.validation';


export class AnalyticsService {
  private static getTimeframeDate(timeframe: string): Date | null {
    if (timeframe === 'all') return null;
    const now = new Date();
    let days = 30;
    if (timeframe === '7d') days = 7;
    if (timeframe === '90d') days = 90;
    return new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
  }

  static async getPlatformOverview(query: AnalyticsQuery) {
    const startDate = this.getTimeframeDate(query.timeframe);
    const dateFilter = startDate ? { gte: startDate } : undefined;

    const [
      totalUsers,
      usersByRoleRaw,
      newUsersInPeriod,
      totalBusinesses,
      businessesByStatusRaw,
      newBusinessesInPeriod,
      totalReviews,
      verifiedReviewsCount,
      avgRatingResult,
      totalReports,
      totalClaims,
      claimsByStatusRaw,
    ] = await Promise.all([
      prisma.user.count({ where: { isDeleted: false } }),
      prisma.user.groupBy({
        by: ['role'],
        where: { isDeleted: false },
        _count: { id: true },
      }),
      prisma.user.count({
        where: {
          isDeleted: false,
          ...(dateFilter ? { createdAt: dateFilter } : {}),
        },
      }),
      prisma.business.count(),
      prisma.business.groupBy({
        by: ['status'],
        _count: { id: true },
      }),
      prisma.business.count({
        where: dateFilter ? { createdAt: dateFilter } : {},
      }),
      prisma.review.count({ where: { isDeleted: false } }),
      prisma.review.count({ where: { isDeleted: false, isVerified: true } }),
      prisma.review.aggregate({
        where: { isDeleted: false },
        _avg: { rating: true },
      }),
      prisma.reviewReport.count(),
      prisma.businessClaim.count(),
      prisma.businessClaim.groupBy({
        by: ['status'],
        _count: { id: true },
      }),
    ]);

    // Format user role distribution
    const usersByRole = {
      users: 0,
      businessOwners: 0,
      admins: 0,
    };
    for (const item of usersByRoleRaw) {
      if (item.role === 'user') usersByRole.users = item._count.id;
      else if (item.role === 'business_owner') usersByRole.businessOwners = item._count.id;
      else if (item.role === 'admin' || item.role === 'seed_admin') {
        usersByRole.admins += item._count.id;
      }
    }

    // Format business status distribution
    const businessesByStatus = {
      published: 0,
      pending: 0,
      rejected: 0,
    };
    for (const item of businessesByStatusRaw) {
      if (item.status === 'published') businessesByStatus.published = item._count.id;
      else if (item.status === 'pending') businessesByStatus.pending = item._count.id;
      else if (item.status === 'rejected') businessesByStatus.rejected = item._count.id;
    }

    // Format claim status distribution
    const claimsByStatus = {
      pending: 0,
      approved: 0,
      rejected: 0,
    };
    for (const item of claimsByStatusRaw) {
      if (item.status === 'pending') claimsByStatus.pending = item._count.id;
      else if (item.status === 'approved') claimsByStatus.approved = item._count.id;
      else if (item.status === 'rejected') claimsByStatus.rejected = item._count.id;
    }

    const averageRating = avgRatingResult._avg.rating
      ? Math.round(Number(avgRatingResult._avg.rating) * 100) / 100
      : 0;

    return {
      timeframe: query.timeframe,
      users: {
        total: totalUsers,
        newInPeriod: newUsersInPeriod,
        byRole: usersByRole,
      },
      businesses: {
        total: totalBusinesses,
        newInPeriod: newBusinessesInPeriod,
        byStatus: businessesByStatus,
      },
      reviews: {
        total: totalReviews,
        verified: verifiedReviewsCount,
        averageRating,
        totalReports,
      },
      claims: {
        total: totalClaims,
        byStatus: claimsByStatus,
      },
    };
  }

  static async getCategoryDistribution() {
    const categories = await prisma.category.findMany({
      include: {
        _count: {
          select: { businesses: true },
        },
      },
      orderBy: { id: 'asc' },
    });

    const distribution = categories.map((c) => ({
      id: c.id,
      name: c.name,
      businessCount: c._count.businesses,
    }));

    const totalBusinesses = distribution.reduce((sum, item) => sum + item.businessCount, 0);

    return {
      categories: distribution,
      totalBusinesses,
    };
  }

  /**
   * UC-023: Retrieve top-rated businesses list filterable by category and city/landmark.
   */
  static async getTopRatedBusinesses(query: AnalyticsFilteredListQuery) {
    const where: any = {
      status: 'published',
    };

    if (query.categoryId) {
      where.categoryId = query.categoryId;
    }

    if (query.city && query.city.trim()) {
      const cityPattern = query.city.trim();
      where.OR = [
        { landmarkDescription: { contains: cityPattern, mode: 'insensitive' } },
        { description: { contains: cityPattern, mode: 'insensitive' } },
      ];
    }

    const businesses = await prisma.business.findMany({
      where,
      select: {
        id: true,
        name: true,
        categoryId: true,
        landmarkDescription: true,
        avgRating: true,
        reviewCount: true,
        ownerId: true,
        category: {
          select: { id: true, name: true },
        },
      },
      orderBy: [
        { avgRating: 'desc' },
        { reviewCount: 'desc' },
        { id: 'asc' },
      ],
      take: query.limit || 10,
    });

    return businesses.map((b) => ({
      id: b.id,
      name: b.name,
      category: b.category,
      landmarkDescription: b.landmarkDescription,
      avgRating: Number(b.avgRating),
      reviewCount: b.reviewCount,
      ownerId: b.ownerId,
    }));
  }

  /**
   * UC-023: Retrieve most-viewed / most-engaged businesses list filterable by category and city/landmark.
   */
  static async getMostViewedBusinesses(query: AnalyticsFilteredListQuery) {
    const where: any = {
      status: 'published',
    };

    if (query.categoryId) {
      where.categoryId = query.categoryId;
    }

    if (query.city && query.city.trim()) {
      const cityPattern = query.city.trim();
      where.OR = [
        { landmarkDescription: { contains: cityPattern, mode: 'insensitive' } },
        { description: { contains: cityPattern, mode: 'insensitive' } },
      ];
    }

    const businesses = await prisma.business.findMany({
      where,
      select: {
        id: true,
        name: true,
        categoryId: true,
        landmarkDescription: true,
        avgRating: true,
        reviewCount: true,
        category: {
          select: { id: true, name: true },
        },
      },
      orderBy: [
        { reviewCount: 'desc' },
        { avgRating: 'desc' },
        { id: 'asc' },
      ],
      take: query.limit || 10,
    });

    return businesses.map((b) => ({
      id: b.id,
      name: b.name,
      category: b.category,
      landmarkDescription: b.landmarkDescription,
      avgRating: Number(b.avgRating),
      reviewCount: b.reviewCount,
    }));
  }
}

