import { Prisma } from '@prisma/client';
import { prisma } from '../../config/db';
import { RecommendationQuery } from './discovery.validation';

export class DiscoveryService {
  /**
   * Get personalized business recommendations for an authenticated user.
   */
  static async getPersonalizedRecommendations(userId: string, query: RecommendationQuery) {
    const { lat, lng, radius, limit, categoryId } = query;

    // 1. Fetch user's category affinity (categories from high-rated reviews & favorites)
    const [userHighReviews, userFavorites, userConnections] = await Promise.all([
      prisma.review.findMany({
        where: { userId, rating: { gte: 4 }, isDeleted: false },
        select: { business: { select: { categoryId: true } } },
      }),
      prisma.favorite.findMany({
        where: { userId },
        select: { business: { select: { categoryId: true } } },
      }),
      prisma.connection.findMany({
        where: {
          OR: [
            { requesterId: userId, status: 'accepted' },
            { addresseeId: userId, status: 'accepted' },
          ],
        },
        select: { requesterId: true, addresseeId: true },
      }),
    ]);

    const favoriteCategoryIds = new Set<number>();
    for (const r of userHighReviews) {
      if (r.business?.categoryId) favoriteCategoryIds.add(r.business.categoryId);
    }
    for (const f of userFavorites) {
      if (f.business?.categoryId) favoriteCategoryIds.add(f.business.categoryId);
    }

    // Extract friend IDs
    const friendIds = userConnections.map((c) =>
      c.requesterId === userId ? c.addresseeId : c.requesterId
    );

    // Fetch friend high-rated business IDs
    let friendRecommendedBizIds = new Set<string>();
    if (friendIds.length > 0) {
      const friendReviews = await prisma.review.findMany({
        where: {
          userId: { in: friendIds },
          rating: { gte: 4 },
          isDeleted: false,
        },
        select: { businessId: true },
      });
      for (const fr of friendReviews) {
        friendRecommendedBizIds.add(fr.businessId);
      }
    }

    // 2. Fetch candidate businesses within PostGIS radius
    const categoryClause = categoryId
      ? Prisma.sql`AND category_id = ${Number(categoryId)}::smallint`
      : Prisma.empty;

    let rawCandidates = await prisma.$queryRaw<any[]>`
      SELECT
        id,
        name,
        category_id AS "categoryId",
        description,
        landmark_description AS "landmarkDescription",
        phone,
        hours,
        avg_rating AS "avgRating",
        review_count AS "reviewCount",
        ST_Distance(
          location,
          ST_SetSRID(ST_MakePoint(${lng}::float8, ${lat}::float8), 4326)::geography
        )::float8 AS "distanceMeters"
      FROM businesses
      WHERE status = 'published'::"BusinessStatus"
        AND ST_DWithin(
          location,
          ST_SetSRID(ST_MakePoint(${lng}::float8, ${lat}::float8), 4326)::geography,
          ${radius}::float8
        )
        ${categoryClause}
    `;

    if (!rawCandidates || rawCandidates.length === 0) {
      rawCandidates = await prisma.$queryRaw<any[]>`
        SELECT
          id,
          name,
          category_id AS "categoryId",
          description,
          landmark_description AS "landmarkDescription",
          phone,
          hours,
          avg_rating AS "avgRating",
          review_count AS "reviewCount",
          ST_Distance(
            location,
            ST_SetSRID(ST_MakePoint(${lng}::float8, ${lat}::float8), 4326)::geography
          )::float8 AS "distanceMeters"
        FROM businesses
        WHERE status = 'published'::"BusinessStatus"
          ${categoryClause}
        ORDER BY avg_rating DESC
        LIMIT 20
      `;
    }

    if (!rawCandidates || rawCandidates.length === 0) {
      return { data: [], total: 0 };
    }

    // Fetch categories lookup for name
    const categories = await prisma.category.findMany();
    const categoryMap = new Map<number, string>();
    for (const c of categories) {
      categoryMap.set(c.id, c.name);
    }

    // Fetch photo for each business
    const bizIds = rawCandidates.map((c) => c.id);
    const photos = await prisma.businessPhoto.findMany({
      where: { businessId: { in: bizIds } },
      orderBy: { sortOrder: 'asc' },
    });
    const photoMap = new Map<string, string[]>();
    for (const p of photos) {
      if (!photoMap.has(p.businessId)) photoMap.set(p.businessId, []);
      photoMap.get(p.businessId)!.push(p.url);
    }

    // 3. Compute hybrid recommendation score for each business
    const scoredList = rawCandidates.map((b) => {
      const avgRating = Number(b.avgRating) || 0;
      const distance = Number(b.distanceMeters) || 0;
      const isFavCat = favoriteCategoryIds.has(b.categoryId);
      const isFriendRec = friendRecommendedBizIds.has(b.id);

      // Scoring formula: rating (40%) + category affinity (30%) + friend signal (20%) + proximity (10%)
      let score = avgRating * 0.4;
      const matchReasons: string[] = [];

      if (isFavCat) {
        score += 1.5;
        matchReasons.push('Matches your category preferences');
      }
      if (isFriendRec) {
        score += 1.0;
        matchReasons.push('Highly rated by your connections');
      }
      if (distance <= 1000) {
        score += 0.5;
        matchReasons.push('Very close to your current location');
      }
      if (avgRating >= 4.5) {
        matchReasons.push('Top-rated business');
      }

      if (matchReasons.length === 0) {
        matchReasons.push('Recommended nearby business');
      }

      return {
        id: b.id,
        name: b.name,
        categoryId: b.categoryId,
        categoryName: categoryMap.get(b.categoryId) || 'General',
        description: b.description ?? null,
        landmarkDescription: b.landmarkDescription,
        phone: b.phone ?? null,
        hours: b.hours ?? null,
        avgRating: Math.round(avgRating * 10) / 10,
        reviewCount: Number(b.reviewCount) || 0,
        distanceMeters: Math.round(distance * 100) / 100,
        photos: photoMap.get(b.id) || [],
        matchReasons,
        score: Math.round(score * 100) / 100,
      };
    });

    // Sort by recommendation score descending, then proximity ascending
    scoredList.sort((a, b) => b.score - a.score || a.distanceMeters - b.distanceMeters);

    const paginated = scoredList.slice(0, limit);

    return {
      data: paginated,
      total: scoredList.length,
    };
  }

  /**
   * Public cold-start recommendation feed for unauthenticated guests.
   */
  static async getPublicRecommendations(query: RecommendationQuery) {
    const { lat, lng, radius, limit, categoryId } = query;

    const categoryClause = categoryId
      ? Prisma.sql`AND category_id = ${Number(categoryId)}::smallint`
      : Prisma.empty;

    let rawCandidates = await prisma.$queryRaw<any[]>`
      SELECT
        id,
        name,
        category_id AS "categoryId",
        description,
        landmark_description AS "landmarkDescription",
        phone,
        hours,
        avg_rating AS "avgRating",
        review_count AS "reviewCount",
        ST_Distance(
          location,
          ST_SetSRID(ST_MakePoint(${lng}::float8, ${lat}::float8), 4326)::geography
        )::float8 AS "distanceMeters"
      FROM businesses
      WHERE status = 'published'::"BusinessStatus"
        AND ST_DWithin(
          location,
          ST_SetSRID(ST_MakePoint(${lng}::float8, ${lat}::float8), 4326)::geography,
          ${radius}::float8
        )
        ${categoryClause}
      ORDER BY avg_rating DESC, "distanceMeters" ASC
      LIMIT ${limit}::int
    `;

    if (!rawCandidates || rawCandidates.length === 0) {
      rawCandidates = await prisma.$queryRaw<any[]>`
        SELECT
          id,
          name,
          category_id AS "categoryId",
          description,
          landmark_description AS "landmarkDescription",
          phone,
          hours,
          avg_rating AS "avgRating",
          review_count AS "reviewCount",
          ST_Distance(
            location,
            ST_SetSRID(ST_MakePoint(${lng}::float8, ${lat}::float8), 4326)::geography
          )::float8 AS "distanceMeters"
        FROM businesses
        WHERE status = 'published'::"BusinessStatus"
          ${categoryClause}
        ORDER BY avg_rating DESC
        LIMIT ${limit}::int
      `;
    }

    if (!rawCandidates || rawCandidates.length === 0) {
      return { data: [], total: 0 };
    }

    const categories = await prisma.category.findMany();
    const categoryMap = new Map<number, string>();
    for (const c of categories) {
      categoryMap.set(c.id, c.name);
    }

    const data = rawCandidates.map((b) => ({
      id: b.id,
      name: b.name,
      categoryId: b.categoryId,
      categoryName: categoryMap.get(b.categoryId) || 'General',
      description: b.description ?? null,
      landmarkDescription: b.landmarkDescription,
      phone: b.phone ?? null,
      hours: b.hours ?? null,
      avgRating: Math.round(Number(b.avgRating) * 10) / 10,
      reviewCount: Number(b.reviewCount) || 0,
      distanceMeters: Math.round(Number(b.distanceMeters) * 100) / 100,
      matchReasons: ['Top-rated nearby spot'],
    }));

    return {
      data,
      total: data.length,
    };
  }
}
