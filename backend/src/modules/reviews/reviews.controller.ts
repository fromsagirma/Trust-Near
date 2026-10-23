import { Request, Response } from 'express';
import { AuthRequest } from '../../middleware/auth';
import { ReviewsService } from './reviews.service';
import {
  rateBusinessSchema,
  updateReviewSchema,
  verifyVisitSchema,
  businessIdParamSchema,
  reviewIdParamSchema,
  businessAndReviewIdParamSchema,
  reportReviewSchema,
  listReviewsQuerySchema,
} from './reviews.validation';
import { sendSuccess, sendError } from '../../utils/response';

function sanitizeReview(review: any) {
  if (!review) return null;
  return {
    id: review.id,
    businessId: review.businessId,
    userId: review.userId,
    rating: review.rating,
    comment: review.comment ?? null,
    isVerified: review.isVerified ?? false,
    ownerReply: review.ownerReply ?? null,
    ownerRepliedAt: review.ownerRepliedAt ?? null,
    createdAt: review.createdAt,
    updatedAt: review.updatedAt,
  };
}

export class ReviewsController {
  static async rate(req: AuthRequest, res: Response) {
    const paramsParsed = businessIdParamSchema.safeParse(req.params);
    if (!paramsParsed.success) {
      const issue = paramsParsed.error.issues[0]?.message ?? 'Invalid business ID format';
      return sendError(res, issue, 400, paramsParsed.error.flatten());
    }

    const parsed = rateBusinessSchema.safeParse(req.body);
    if (!parsed.success) {
      const issue = parsed.error.issues[0]?.message ?? 'Validation failed';
      return sendError(res, issue, 400, parsed.error.flatten());
    }
    try {
      const { review, isCreated, distanceMeters } = await ReviewsService.rateBusiness(
        paramsParsed.data.businessId,
        req.user!.id,
        parsed.data
      );
      const sanitized = sanitizeReview(review);
      const responsePayload = {
        ...sanitized,
        ...(distanceMeters !== null && distanceMeters !== undefined
          ? { distanceMeters: Math.round(distanceMeters * 100) / 100 }
          : {}),
      };
      return sendSuccess(
        res,
        responsePayload,
        isCreated ? 'Review created' : 'Review updated',
        isCreated ? 201 : 200
      );
    } catch (err: any) {
      const status = typeof err.status === 'number' ? err.status : 500;
      const message = status === 500 ? 'Internal server error' : (err.message ?? 'Failed to save review');
      return sendError(res, message, status);
    }
  }

  static async update(req: AuthRequest, res: Response) {
    const paramsParsed = businessAndReviewIdParamSchema.safeParse(req.params);
    if (!paramsParsed.success) {
      const issue = paramsParsed.error.issues[0]?.message ?? 'Invalid parameter format';
      return sendError(res, issue, 400, paramsParsed.error.flatten());
    }

    const parsed = updateReviewSchema.safeParse(req.body);
    if (!parsed.success) {
      const issue = parsed.error.issues[0]?.message ?? 'Validation failed';
      return sendError(res, issue, 400, parsed.error.flatten());
    }
    try {
      const { review, distanceMeters } = await ReviewsService.updateReviewById(
        paramsParsed.data.businessId,
        paramsParsed.data.reviewId,
        req.user!.id,
        parsed.data
      );
      const sanitized = sanitizeReview(review);
      const responsePayload = {
        ...sanitized,
        ...(distanceMeters !== null && distanceMeters !== undefined
          ? { distanceMeters: Math.round(distanceMeters * 100) / 100 }
          : {}),
      };
      return sendSuccess(res, responsePayload, 'Review updated', 200);
    } catch (err: any) {
      const status = typeof err.status === 'number' ? err.status : 500;
      const message = status === 500 ? 'Internal server error' : (err.message ?? 'Failed to update review');
      return sendError(res, message, status);
    }
  }

  static async verifyVisit(req: AuthRequest, res: Response) {
    const businessParam = businessIdParamSchema.safeParse(req.params);
    if (!businessParam.success) {
      const issue = businessParam.error.issues[0]?.message ?? 'Invalid business ID format';
      return sendError(res, issue, 400, businessParam.error.flatten());
    }

    let reviewId: string | undefined = undefined;
    if (req.params.reviewId) {
      const reviewParam = reviewIdParamSchema.safeParse(req.params);
      if (!reviewParam.success) {
        const issue = reviewParam.error.issues[0]?.message ?? 'Invalid review ID format';
        return sendError(res, issue, 400, reviewParam.error.flatten());
      }
      reviewId = reviewParam.data.reviewId;
    }

    const bodyParsed = verifyVisitSchema.safeParse(req.body);
    if (!bodyParsed.success) {
      const issue = bodyParsed.error.issues[0]?.message ?? 'Invalid location coordinates';
      return sendError(res, issue, 400, bodyParsed.error.flatten());
    }

    const coords = ReviewsService.extractCoordinates(bodyParsed.data);
    if (!coords) {
      return sendError(res, 'Valid coordinates (lat and lng) are required', 400);
    }

    try {
      const result = await ReviewsService.verifyReviewVisit(
        businessParam.data.businessId,
        req.user!.id,
        coords,
        reviewId
      );

      const message = result.isVerified
        ? 'Verified visit badge earned successfully'
        : 'Visit could not be verified: location is outside verification radius';

      return sendSuccess(
        res,
        {
          isVerified: result.isVerified,
          distanceMeters: result.distanceMeters,
          thresholdMeters: result.thresholdMeters,
          review: sanitizeReview(result.review),
        },
        message,
        200
      );
    } catch (err: any) {
      const status = typeof err.status === 'number' ? err.status : 500;
      const message = status === 500 ? 'Internal server error' : (err.message ?? 'Failed to verify visit');
      return sendError(res, message, status);
    }
  }

  static async getBusinessReviews(req: Request, res: Response) {
    const paramsParsed = businessIdParamSchema.safeParse(req.params);
    if (!paramsParsed.success) {
      const issue = paramsParsed.error.issues[0]?.message ?? 'Invalid business ID format';
      return sendError(res, issue, 400, paramsParsed.error.flatten());
    }

    const queryParsed = listReviewsQuerySchema.safeParse(req.query);
    if (!queryParsed.success) {
      const issue = queryParsed.error.issues[0]?.message ?? 'Invalid query parameters';
      return sendError(res, issue, 400, queryParsed.error.flatten());
    }

    try {
      const result = await ReviewsService.getBusinessReviews(
        paramsParsed.data.businessId,
        queryParsed.data
      );
      return sendSuccess(res, result, 'Reviews retrieved successfully', 200);
    } catch (err: any) {
      const status = typeof err.status === 'number' ? err.status : 500;
      const message = status === 500 ? 'Internal server error' : (err.message ?? 'Failed to retrieve reviews');
      return sendError(res, message, status);
    }
  }

  static async getMine(req: AuthRequest, res: Response) {
    const paramsParsed = businessIdParamSchema.safeParse(req.params);
    if (!paramsParsed.success) {
      const issue = paramsParsed.error.issues[0]?.message ?? 'Invalid business ID format';
      return sendError(res, issue, 400, paramsParsed.error.flatten());
    }
    try {
      const review = await ReviewsService.getMyReview(paramsParsed.data.businessId, req.user!.id);
      return sendSuccess(res, sanitizeReview(review), 'Review retrieved', 200);
    } catch (err: any) {
      const status = typeof err.status === 'number' ? err.status : 500;
      const message = status === 500 ? 'Internal server error' : (err.message ?? 'Failed to retrieve review');
      return sendError(res, message, status);
    }
  }

  static async deleteMine(req: AuthRequest, res: Response) {
    const paramsParsed = businessIdParamSchema.safeParse(req.params);
    if (!paramsParsed.success) {
      const issue = paramsParsed.error.issues[0]?.message ?? 'Invalid business ID format';
      return sendError(res, issue, 400, paramsParsed.error.flatten());
    }
    try {
      const result = await ReviewsService.deleteMyReview(paramsParsed.data.businessId, req.user!.id);
      return sendSuccess(res, result, 'Review deleted', 200);
    } catch (err: any) {
      const status = typeof err.status === 'number' ? err.status : 500;
      const message = status === 500 ? 'Internal server error' : (err.message ?? 'Failed to delete review');
      return sendError(res, message, status);
    }
  }

  static async deleteById(req: AuthRequest, res: Response) {
    const paramsParsed = businessAndReviewIdParamSchema.safeParse(req.params);
    if (!paramsParsed.success) {
      const issue = paramsParsed.error.issues[0]?.message ?? 'Invalid parameter format';
      return sendError(res, issue, 400, paramsParsed.error.flatten());
    }
    try {
      const result = await ReviewsService.deleteReviewById(
        paramsParsed.data.businessId,
        paramsParsed.data.reviewId,
        req.user!.id
      );
      return sendSuccess(res, result, 'Review deleted', 200);
    } catch (err: any) {
      const status = typeof err.status === 'number' ? err.status : 500;
      const message = status === 500 ? 'Internal server error' : (err.message ?? 'Failed to delete review');
      return sendError(res, message, status);
    }
  }

  static async report(req: AuthRequest, res: Response) {
    try {
      const paramsParsed = reviewIdParamSchema.safeParse(req.params);
      if (!paramsParsed.success) {
        const issue = paramsParsed.error.issues[0]?.message ?? 'Invalid review ID format';
        return sendError(res, issue, 400, paramsParsed.error.flatten());
      }

      const bodyParsed = reportReviewSchema.safeParse(req.body);
      if (!bodyParsed.success) {
        const issue = bodyParsed.error.issues[0]?.message ?? 'Invalid report reason';
        return sendError(res, issue, 400, bodyParsed.error.flatten());
      }

      const result = await ReviewsService.reportReview(
        paramsParsed.data.reviewId,
        req.user!.id,
        bodyParsed.data.reason
      );

      return sendSuccess(res, result, 'Report submitted successfully', 201);
    } catch (err: any) {
      const status = typeof err.status === 'number' ? err.status : 500;
      const message = status === 500 ? 'Internal server error' : (err.message ?? 'Failed to submit report');
      return sendError(res, message, status);
    }
  }
}


