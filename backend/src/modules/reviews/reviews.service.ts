import { prisma } from '../../config/db';
import { recalculateBusinessAggregate } from '../../utils/aggregate';
import { ActivityType, ReportReason, ReportStatus } from '@prisma/client';
import { ListReviewsQuery } from './reviews.validation';
import { ModerationService } from '../moderation/moderation.service';
import { ActivityService } from '../activity/activity.service';

export class ReviewsService {
  public static readonly MAX_VERIFIED_DISTANCE_METERS = 500;


  static extractCoordinates(data: {
    location?: { lat: number; lng: number } | null;
    lat?: number | null;
    lng?: number | null;
  }): { lat: number; lng: number } | null {
    if (
      data.location &&
      typeof data.location.lat === 'number' &&
      typeof data.location.lng === 'number'
    ) {
      return { lat: data.location.lat, lng: data.location.lng };
    }
    if (typeof data.lat === 'number' && typeof data.lng === 'number') {
      return { lat: data.lat, lng: data.lng };
    }
    return null;
  }

  static async calculateDistanceToBusiness(
    businessId: string,
    lat: number,
    lng: number
  ): Promise<number | null> {
    const rows = await prisma.$queryRaw<Array<{ distance_meters: number }>>`
      SELECT ST_Distance(
        location,
        ST_SetSRID(ST_MakePoint(${lng}::float8, ${lat}::float8), 4326)::geography
      ) AS distance_meters
      FROM businesses
      WHERE id = ${businessId}::uuid
    `;
    if (!rows || rows.length === 0 || rows[0].distance_meters === undefined) {
      return null;
    }
    return Number(rows[0].distance_meters);
  }

  static async rateBusiness(
    businessId: string,
    userId: string,
    data: {
      rating: number;
      comment?: string | null;
      location?: { lat: number; lng: number } | null;
      lat?: number | null;
      lng?: number | null;
    }
  ) {
    const business = await prisma.business.findUnique({ where: { id: businessId } });
    if (!business) {
      throw { status: 404, message: 'Business not found' };
    }
    if (business.status !== 'published') {
      throw { status: 400, message: 'Cannot review a business that is not published' };
    }
    if (business.ownerId && business.ownerId === userId) {
      throw { status: 403, message: 'Business owners cannot review their own business' };
    }

    const coords = this.extractCoordinates(data);
    let isVerified: boolean | undefined = undefined;
    let distanceMeters: number | null = null;

    if (coords) {
      distanceMeters = await this.calculateDistanceToBusiness(businessId, coords.lat, coords.lng);
      isVerified = distanceMeters !== null && distanceMeters <= this.MAX_VERIFIED_DISTANCE_METERS;
    }

    const result = await prisma.$transaction(
      async (tx) => {

        const existing = await tx.review.findUnique({
          where: { businessId_userId: { businessId, userId } },
        });

        const isCreated = !existing || existing.isDeleted;
        const finalIsVerified =
          isVerified !== undefined ? isVerified : (existing ? existing.isVerified : false);

        const review = await tx.review.upsert({
          where: { businessId_userId: { businessId, userId } },
          create: {
            businessId,
            userId,
            rating: data.rating,
            comment: data.comment ?? null,
            isVerified: finalIsVerified,
            isDeleted: false,
          },
          update: {
            rating: data.rating,
            ...(data.comment !== undefined ? { comment: data.comment } : {}),
            isVerified: finalIsVerified,
            isDeleted: false,
          },
        });

        await recalculateBusinessAggregate(tx, businessId);
        return { review, isCreated, distanceMeters, isVerified: finalIsVerified };
      },
      { maxWait: 10000, timeout: 20000 }
    );

    // Post-MVP Automated Moderation Heuristics (UC-013)
    await ModerationService.runAutomatedHeuristics(
      result.review.id,
      userId,
      data.comment
    );

    // Log Activity Feed Entry for Review Submission
    try {
      await ActivityService.logActivity({
        userId,
        activityType: ActivityType.review_submitted,
        title: `Rated ${business.name} ${data.rating} Stars`,
        subtitle: data.comment ? `"${data.comment}"` : 'Submitted a review',
        businessId,
        metadata: { rating: data.rating, isVerified: result.isVerified },
      });
    } catch (_) {
      // Non-blocking activity log failure
    }

    return result;
  }


  static async updateReviewById(
    businessId: string,
    reviewId: string,
    userId: string,
    data: {
      rating?: number;
      comment?: string | null;
      location?: { lat: number; lng: number } | null;
      lat?: number | null;
      lng?: number | null;
    }
  ) {
    const review = await prisma.review.findUnique({
      where: { id: reviewId },
    });

    if (!review || review.isDeleted || review.userId !== userId || review.businessId !== businessId) {
      throw { status: 404, message: 'Review not found' };
    }

    const business = await prisma.business.findUnique({ where: { id: businessId } });
    if (!business || business.status !== 'published') {
      throw { status: 400, message: 'Cannot review a business that is not published' };
    }

    const coords = this.extractCoordinates(data);
    let isVerified: boolean | undefined = undefined;
    let distanceMeters: number | null = null;

    if (coords) {
      distanceMeters = await this.calculateDistanceToBusiness(businessId, coords.lat, coords.lng);
      isVerified = distanceMeters !== null && distanceMeters <= this.MAX_VERIFIED_DISTANCE_METERS;
    }

    const result = await prisma.$transaction(
      async (tx) => {
        const updated = await tx.review.update({
          where: { id: reviewId },
          data: {
            ...(data.rating !== undefined ? { rating: data.rating } : {}),
            ...(data.comment !== undefined ? { comment: data.comment } : {}),
            ...(isVerified !== undefined ? { isVerified } : {}),
          },
        });

        await recalculateBusinessAggregate(tx, businessId);
        return { review: updated, distanceMeters };
      },
      { maxWait: 10000, timeout: 20000 }
    );

    // Post-MVP Automated Moderation Heuristics (UC-013)
    if (data.comment !== undefined) {
      await ModerationService.runAutomatedHeuristics(
        result.review.id,
        userId,
        data.comment
      );
    }

    return result;
  }


  static async verifyReviewVisit(
    businessId: string,
    userId: string,
    coords: { lat: number; lng: number },
    reviewId?: string
  ) {
    const business = await prisma.business.findUnique({ where: { id: businessId } });
    if (!business) {
      throw { status: 404, message: 'Business not found' };
    }
    if (business.status !== 'published') {
      throw { status: 400, message: 'Cannot verify visit for a business that is not published' };
    }
    if (business.ownerId && business.ownerId === userId) {
      throw { status: 403, message: 'Business owners cannot verify visits for their own business' };
    }

    const review = reviewId
      ? await prisma.review.findUnique({ where: { id: reviewId } })
      : await prisma.review.findUnique({ where: { businessId_userId: { businessId, userId } } });

    if (!review || review.isDeleted || review.userId !== userId || review.businessId !== businessId) {
      throw { status: 404, message: 'Review not found for this user and business' };
    }

    const distanceMeters = await this.calculateDistanceToBusiness(businessId, coords.lat, coords.lng);
    const isVerified = distanceMeters !== null && distanceMeters <= this.MAX_VERIFIED_DISTANCE_METERS;

    const updatedReview = await prisma.review.update({
      where: { id: review.id },
      data: { isVerified },
    });

    if (isVerified) {
      try {
        await ActivityService.logActivity({
          userId,
          activityType: ActivityType.place_visited,
          title: `Visited ${business.name}`,
          subtitle: business.landmarkDescription || 'Verified place visit',
          businessId,
          metadata: { distanceMeters },
        });
      } catch (_) {
        // Non-blocking activity log failure
      }
    }

    return {
      isVerified,
      distanceMeters: distanceMeters !== null ? Math.round(distanceMeters * 100) / 100 : null,
      thresholdMeters: this.MAX_VERIFIED_DISTANCE_METERS,
      review: updatedReview,
    };
  }

  static async getBusinessReviews(businessId: string, query: ListReviewsQuery) {
    const business = await prisma.business.findUnique({ where: { id: businessId } });
    if (!business) {
      throw { status: 404, message: 'Business not found' };
    }
    if (business.status !== 'published') {
      throw { status: 404, message: 'Business not found' };
    }

    const { page, pageSize, sort, verifiedOnly } = query;
    const validPage = Math.max(1, page);
    const validPageSize = Math.max(1, Math.min(50, pageSize));
    const skip = (validPage - 1) * validPageSize;

    const whereClause: any = {
      businessId,
      isDeleted: false,
      ...(verifiedOnly ? { isVerified: true } : {}),
    };

    let orderByClause: any = { createdAt: 'desc' };
    if (sort === 'oldest') {
      orderByClause = { createdAt: 'asc' };
    } else if (sort === 'highest') {
      orderByClause = { rating: 'desc' };
    } else if (sort === 'lowest') {
      orderByClause = { rating: 'asc' };
    } else if (sort === 'verified') {
      orderByClause = [{ isVerified: 'desc' }, { createdAt: 'desc' }];
    }

    const [reviews, total] = await Promise.all([
      prisma.review.findMany({
        where: whereClause,
        include: {
          user: {
            select: {
              id: true,
              displayName: true,
              profilePhotoUrl: true,
            },
          },
        },
        orderBy: orderByClause,
        skip,
        take: validPageSize,
      }),
      prisma.review.count({ where: whereClause }),
    ]);

    const data = reviews.map((r) => ({
      id: r.id,
      businessId: r.businessId,
      rating: r.rating,
      comment: r.comment ?? null,
      isVerified: r.isVerified,
      ownerReply: r.ownerReply ?? null,
      ownerRepliedAt: r.ownerRepliedAt ?? null,
      createdAt: r.createdAt,
      updatedAt: r.updatedAt,
      user: {
        id: r.user.id,
        displayName: r.user.displayName,
        profilePhotoUrl: r.user.profilePhotoUrl ?? null,
      },
    }));

    const totalPages = Math.ceil(total / validPageSize);

    return {
      data,
      pagination: {
        page: validPage,
        pageSize: validPageSize,
        total,
        totalPages,
      },
    };
  }

  static async getMyReview(businessId: string, userId: string) {
    const review = await prisma.review.findUnique({
      where: { businessId_userId: { businessId, userId } },
    });
    if (!review || review.isDeleted) {
      throw { status: 404, message: 'No review found' };
    }
    return review;
  }

  static async deleteMyReview(businessId: string, userId: string) {
    const existing = await prisma.review.findUnique({
      where: { businessId_userId: { businessId, userId } },
    });
    if (!existing || existing.isDeleted) {
      throw { status: 404, message: 'No review found to delete' };
    }

    return prisma.$transaction(
      async (tx) => {
        await tx.review.update({
          where: { businessId_userId: { businessId, userId } },
          data: { isDeleted: true },
        });
        await recalculateBusinessAggregate(tx, businessId);
        return { message: 'Review deleted' };
      },
      { maxWait: 10000, timeout: 20000 }
    );
  }

  static async deleteReviewById(businessId: string, reviewId: string, userId: string) {
    const review = await prisma.review.findUnique({
      where: { id: reviewId },
    });

    if (!review || review.isDeleted || review.userId !== userId || review.businessId !== businessId) {
      throw { status: 404, message: 'Review not found' };
    }

    return prisma.$transaction(
      async (tx) => {
        await tx.review.update({
          where: { id: reviewId },
          data: { isDeleted: true },
        });
        await recalculateBusinessAggregate(tx, businessId);
        return { message: 'Review deleted' };
      },
      { maxWait: 10000, timeout: 20000 }
    );
  }

  static async reportReview(reviewId: string, reporterId: string, reason: ReportReason) {
    const review = await prisma.review.findUnique({
      where: { id: reviewId },
    });

    if (!review || review.isDeleted) {
      throw { status: 404, message: 'Review not found' };
    }

    if (review.userId === reporterId) {
      throw { status: 403, message: 'You cannot report your own review' };
    }

    const existingPending = await prisma.reviewReport.findFirst({
      where: {
        reviewId,
        reporterId,
        status: ReportStatus.pending,
      },
    });

    if (existingPending) {
      throw { status: 409, message: 'A pending report for this review already exists' };
    }

    const report = await prisma.reviewReport.create({
      data: {
        reviewId,
        reporterId,
        reason,
        status: ReportStatus.pending,
        autoFlagged: false,
        autoFlagReason: null,
      },
    });

    return {
      id: report.id,
      reviewId: report.reviewId,
      status: report.status,
    };
  }
}


