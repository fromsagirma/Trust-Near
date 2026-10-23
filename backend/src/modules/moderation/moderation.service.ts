/**
 * TN-021 — Admin Content Moderation Service
 */
import { AdminTargetType, AdminActionType, ReportStatus } from '@prisma/client';
import { prisma } from '../../config/db';
import { AppError } from '../auth/auth.service';
import { recalculateBusinessAggregate } from '../../utils/aggregate';

/**
 * Stub notification handler for TN-020.
 * Called after transaction commits to notify relevant parties of moderation decision.
 */
export const notifyReviewModerationDecision = (
  reviewId: string,
  decision: 'dismissed' | 'removed',
  reason?: string | null
): void => {
  // TODO TN-020: Wire up to real notification service when TN-020 is implemented
  console.log(
    `[NOTIFICATION STUB] Moderation decision for review ${reviewId}: ${decision}${
      reason ? ` (Reason: ${reason})` : ''
    }`
  );
};

export class ModerationService {
  /**
   * Retrieves pending content moderation queue for admin review.
   * Default sort: recency (createdAt descending).
   */
  static async getModerationQueue(
    page = 1,
    pageSize = 20,
    sortBy: 'recency' | 'volume' = 'recency',
    statusFilter?: string
  ) {
    try {
      const validPage = Math.max(1, page);
      const validPageSize = Math.max(1, Math.min(50, pageSize));
      const offset = (validPage - 1) * validPageSize;

      const where: any = {};
      if (statusFilter === 'dismissed') {
        where.status = ReportStatus.dismissed;
      } else if (statusFilter === 'removed') {
        where.status = ReportStatus.removed;
      } else if (statusFilter === 'pending' || statusFilter === 'flagged') {
        where.status = ReportStatus.pending;
      }

      const total = await prisma.reviewReport.count({ where });

      const reportsQuery = await prisma.reviewReport.findMany({
        where,
        include: {
          review: {
            select: {
              id: true,
              rating: true,
              comment: true,
              businessId: true,
              userId: true,
              isVerified: true,
              isDeleted: true,
              createdAt: true,
              business: {
                select: { id: true, name: true },
              },
              user: {
                select: { id: true, displayName: true },
              },
            },
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
        skip: offset,
        take: validPageSize,
      });

      // Generic targetType pattern allowing future expansion (e.g. image, business)
      const reports = reportsQuery.map((r) => ({
        id: r.id,
        targetType: 'review',
        reviewId: r.reviewId,
        reporterId: r.reporterId,
        reason: r.reason,
        status: r.status,
        autoFlagged: r.autoFlagged,
        autoFlagReason: r.autoFlagReason,
        createdAt: r.createdAt.toISOString(),
        review: r.review
          ? {
              id: r.review.id,
              rating: r.review.rating,
              comment: r.review.comment,
              businessId: r.review.businessId,
              userId: r.review.userId,
              isVerified: r.review.isVerified,
              isDeleted: r.review.isDeleted,
              createdAt: r.review.createdAt.toISOString(),
              business: r.review.business,
              user: r.review.user,
            }
          : null,
      }));

      return {
        reports,
        page: validPage,
        pageSize: validPageSize,
        total,
      };
    } catch (err: unknown) {
      if (err instanceof AppError) throw err;
      console.error('[ModerationService] getModerationQueue error:', err);
      throw new AppError('Failed to fetch moderation queue.', 500);
    }
  }

  /**
   * Dismisses a pending report.
   * Does NOT alter the underlying review.
   */
  static async dismissReport(adminId: string, reportId: string) {
    try {
      const report = await prisma.reviewReport.findUnique({
        where: { id: reportId },
        select: { id: true, reviewId: true, status: true },
      });

      if (!report) {
        throw new AppError('Report not found.', 404);
      }

      if (report.status !== ReportStatus.pending) {
        throw new AppError(`Report is already ${report.status}.`, 409);
      }

      await prisma.$transaction(
        async (tx) => {
          await tx.reviewReport.update({
            where: { id: reportId },
            data: {
              status: ReportStatus.dismissed,
            },
          });

          await tx.adminAction.create({
            data: {
              adminId,
              targetType: AdminTargetType.review,
              targetId: report.reviewId,
              action: AdminActionType.dismiss,
              reason: null,
            },
          });
        },
        { maxWait: 10000, timeout: 20000 }
      );

      notifyReviewModerationDecision(report.reviewId, 'dismissed');

      return {
        id: reportId,
        status: ReportStatus.dismissed,
      };
    } catch (err: unknown) {
      if (err instanceof AppError) throw err;
      console.error('[ModerationService] dismissReport error:', err);
      throw new AppError('Failed to dismiss report.', 500);
    }
  }

  /**
   * Action a report by soft-deleting the underlying review and recalculating business ratings.
   */
  static async removeReport(
    adminId: string,
    reportId: string,
    reason?: string | null
  ) {
    try {
      const report = await prisma.reviewReport.findUnique({
        where: { id: reportId },
        select: {
          id: true,
          reviewId: true,
          status: true,
          review: {
            select: {
              id: true,
              businessId: true,
            },
          },
        },
      });

      if (!report) {
        throw new AppError('Report not found.', 404);
      }

      if (report.status !== ReportStatus.pending) {
        throw new AppError(`Report is already ${report.status}.`, 409);
      }

      const formattedReason = reason?.trim() ? reason.trim() : null;

      await prisma.$transaction(
        async (tx) => {
          // 1. Soft-delete the underlying review
          await tx.review.update({
            where: { id: report.reviewId },
            data: {
              isDeleted: true,
            },
          });

          // 2. Set report status to removed
          await tx.reviewReport.update({
            where: { id: reportId },
            data: {
              status: ReportStatus.removed,
            },
          });

          // 3. Recalculate the business avgRating and reviewCount excluding deleted reviews using shared helper
          await recalculateBusinessAggregate(tx, report.review.businessId);

          // 4. Write admin_actions audit log entry pointing at the review
          await tx.adminAction.create({
            data: {
              adminId,
              targetType: AdminTargetType.review,
              targetId: report.reviewId,
              action: AdminActionType.remove,
              reason: formattedReason,
            },
          });
        },
        { maxWait: 10000, timeout: 20000 }
      );

      notifyReviewModerationDecision(report.reviewId, 'removed', formattedReason);

      return {
        id: reportId,
        status: ReportStatus.removed,
      };
    } catch (err: unknown) {
      if (err instanceof AppError) throw err;
      console.error('[ModerationService] removeReport error:', err);
      throw new AppError('Failed to remove reported content.', 500);
    }
  }

  /**
   * Restores a soft-deleted review & report, returning it to pending queue state and recalculating ratings.
   */
  static async restoreReport(adminId: string, reportId: string) {
    try {
      const report = await prisma.reviewReport.findUnique({
        where: { id: reportId },
        select: {
          id: true,
          reviewId: true,
          status: true,
          review: {
            select: {
              id: true,
              businessId: true,
            },
          },
        },
      });

      if (!report) {
        throw new AppError('Report not found.', 404);
      }

      await prisma.$transaction(
        async (tx) => {
          // 1. Un-delete (restore) the underlying review
          await tx.review.update({
            where: { id: report.reviewId },
            data: {
              isDeleted: false,
            },
          });

          // 2. Reset report status to pending
          await tx.reviewReport.update({
            where: { id: reportId },
            data: {
              status: ReportStatus.pending,
            },
          });

          // 3. Recalculate business avgRating & reviewCount
          await recalculateBusinessAggregate(tx, report.review.businessId);

          // 4. Audit log entry
          await tx.adminAction.create({
            data: {
              adminId,
              targetType: AdminTargetType.review,
              targetId: report.reviewId,
              action: AdminActionType.edit,
              reason: 'Restored content by admin',
            },
          });
        },
        { maxWait: 10000, timeout: 20000 }
      );

      return {
        id: reportId,
        status: ReportStatus.pending,
      };
    } catch (err: unknown) {
      if (err instanceof AppError) throw err;
      console.error('[ModerationService] restoreReport error:', err);
      throw new AppError('Failed to restore reported content.', 500);
    }
  }

  /**
   * Post-MVP Automated Moderation Heuristics (UC-013).
   * Analyzes review submission for burst rates and duplicate comment text.
   * Auto-flags suspicious reviews by creating an autoFlagged ReviewReport entry.
   */
  static async runAutomatedHeuristics(
    reviewId: string,
    userId: string,
    comment?: string | null
  ): Promise<{ autoFlagged: boolean; reason?: string }> {
    try {
      const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000);
      let autoFlagged = false;
      let autoFlagReason = '';

      // Heuristic 1: Rate limit per user (more than 3 reviews in 10 minutes)
      const recentReviewCount = await prisma.review.count({
        where: {
          userId,
          createdAt: { gte: tenMinutesAgo },
          isDeleted: false,
        },
      });

      if (recentReviewCount > 3) {
        autoFlagged = true;
        autoFlagReason = 'User rate limit exceeded (more than 3 reviews submitted in 10 minutes)';
      }

      // Heuristic 2: Duplicate or near-duplicate text detection (if comment >= 10 chars)
      if (!autoFlagged && comment && comment.trim().length >= 10) {
        const duplicateReview = await prisma.review.findFirst({
          where: {
            id: { not: reviewId },
            isDeleted: false,
            comment: { equals: comment.trim(), mode: 'insensitive' },
          },
          select: { id: true },
        });

        if (duplicateReview) {
          autoFlagged = true;
          autoFlagReason = 'Duplicate or near-duplicate review text detected';
        }
      }

      if (autoFlagged) {
        const existingReport = await prisma.reviewReport.findFirst({
          where: { reviewId, autoFlagged: true },
        });

        if (!existingReport) {
          await prisma.reviewReport.create({
            data: {
              reviewId,
              reporterId: userId,
              reason: 'spam',
              status: ReportStatus.pending,
              autoFlagged: true,
              autoFlagReason,
            },
          });
        }
      }

      return { autoFlagged, reason: autoFlagReason || undefined };
    } catch (err) {
      console.warn('[ModerationService] Automated heuristics check error:', err);
      return { autoFlagged: false };
    }
  }
}

