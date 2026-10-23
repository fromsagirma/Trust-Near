/**
 * TN-016 — Business Claiming Service
 */
import { AdminTargetType, AdminActionType, ClaimStatus, BusinessStatus } from '@prisma/client';
import { prisma } from '../../config/db';
import { AppError } from '../auth/auth.service';

/**
 * Stub notification handler for TN-020.
 * Called after transaction commits to notify claimant of decision.
 */
export const notifyClaimDecision = (
  claimId: string,
  decision: 'approved' | 'rejected',
  reason?: string | null
): void => {
  // TODO TN-020: Wire up to real notification service when TN-020 is implemented
  console.log(
    `[NOTIFICATION STUB] Business claim ${claimId} decision: ${decision}${
      reason ? ` (Reason: ${reason})` : ''
    }`
  );
};

export class ClaimService {
  /**
   * POST /api/businesses/:id/claim — Submits a claim for an unowned published business.
   */
  static async submitClaim(
    claimantId: string,
    businessId: string,
    verificationInfo?: Record<string, any>
  ) {
    try {
      // 1. Business must exist
      const business = await prisma.business.findUnique({
        where: { id: businessId },
        select: { id: true, status: true, ownerId: true },
      });

      if (!business) {
        throw new AppError('Business not found.', 404);
      }

      // 2. Business must be published
      if (business.status !== BusinessStatus.published) {
        throw new AppError('Business is not published and cannot be claimed.', 400);
      }

      // 3 & 4. Business must not already have an owner / claimant must not already own it
      if (business.ownerId !== null) {
        if (business.ownerId === claimantId) {
          throw new AppError('You already own this business.', 409);
        }
        throw new AppError('Business already has an assigned owner.', 409);
      }

      // 5. Claimant must not already have a pending claim for this business
      const existingPendingClaim = await prisma.businessClaim.findFirst({
        where: {
          businessId,
          claimantId,
          status: ClaimStatus.pending,
        },
        select: { id: true },
      });

      if (existingPendingClaim) {
        throw new AppError('You already have a pending claim for this business.', 409);
      }

      // 6. Create pending claim record
      const claim = await prisma.businessClaim.create({
        data: {
          businessId,
          claimantId,
          verificationInfo: verificationInfo ?? {},
          status: ClaimStatus.pending,
        },
        select: {
          id: true,
          businessId: true,
          status: true,
          createdAt: true,
        },
      });

      return {
        id: claim.id,
        businessId: claim.businessId,
        status: claim.status,
      };
    } catch (err: unknown) {
      if (err instanceof AppError) throw err;
      console.error('[ClaimService] submitClaim error:', err);
      throw new AppError('Failed to submit business claim.', 500);
    }
  }

  /**
   * GET /api/businesses/:id/claim-status — Check current user's claim status for a business.
   */
  static async getClaimStatus(userId: string, businessId: string) {
    try {
      const business = await prisma.business.findUnique({
        where: { id: businessId },
        select: { id: true, ownerId: true, status: true },
      });

      if (!business) {
        throw new AppError('Business not found.', 404);
      }

      if (business.status === 'pending') {
        return {
          status: 'pending',
          isOwner: business.ownerId === userId,
        };
      }

      if (business.ownerId === userId && business.status === 'published') {
        return {
          status: 'approved',
          isOwner: true,
        };
      }

      const latestClaim = await prisma.businessClaim.findFirst({
        where: {
          businessId,
          claimantId: userId,
        },
        orderBy: {
          createdAt: 'desc',
        },
        select: {
          id: true,
          status: true,
          rejectionReason: true,
          createdAt: true,
        },
      });

      if (!latestClaim) {
        return {
          status: 'none',
        };
      }

      return {
        id: latestClaim.id,
        status: latestClaim.status,
        reason: latestClaim.rejectionReason ?? undefined,
        createdAt: latestClaim.createdAt.toISOString(),
      };
    } catch (err: unknown) {
      if (err instanceof AppError) throw err;
      console.error('[ClaimService] getClaimStatus error:', err);
      throw new AppError('Failed to fetch claim status.', 500);
    }
  }

  /**
   * GET /api/admin/claims/pending — Retrieves pending business claims for admin review queue.
   */
  static async getPendingClaims(page = 1, pageSize = 20, statusFilter?: string) {
    try {
      const validPage = Math.max(1, page);
      const validPageSize = Math.max(1, Math.min(100, pageSize));
      const offset = (validPage - 1) * validPageSize;

      const where: any = {};
      if (statusFilter === 'pending') {
        where.status = ClaimStatus.pending;
      } else if (statusFilter === 'approved') {
        where.status = ClaimStatus.approved;
      } else if (statusFilter === 'rejected') {
        where.status = ClaimStatus.rejected;
      }

      const total = await prisma.businessClaim.count({ where });

      const claimsQuery = await prisma.businessClaim.findMany({
        where,
        include: {
          business: {
            select: {
              id: true,
              name: true,
            },
          },
          claimant: {
            select: {
              id: true,
              displayName: true,
              email: true,
              phone: true,
            },
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
        skip: offset,
        take: validPageSize,
      });

      const claims = claimsQuery.map((c) => ({
        id: c.id,
        businessId: c.businessId,
        business: {
          id: c.business.id,
          name: c.business.name,
        },
        claimantId: c.claimantId,
        claimant: {
          id: c.claimant.id,
          displayName: c.claimant.displayName,
          email: c.claimant.email,
          phone: c.claimant.phone,
        },
        verificationInfo: c.verificationInfo,
        status: c.status,
        createdAt: c.createdAt.toISOString(),
      }));

      return {
        claims,
        page: validPage,
        pageSize: validPageSize,
        total,
      };
    } catch (err: unknown) {
      if (err instanceof AppError) throw err;
      console.error('[ClaimService] getPendingClaims error:', err);
      throw new AppError('Failed to fetch pending claims.', 500);
    }
  }

  /**
   * PATCH /api/admin/claims/:claimId/approve — Atomically approves a pending claim and assigns ownerId.
   */
  static async approveClaim(adminId: string, claimId: string) {
    try {
      const result = await prisma.$transaction(
        async (tx) => {
          // 1. Re-read claim
          const claim = await tx.businessClaim.findUnique({
            where: { id: claimId },
            select: { id: true, businessId: true, claimantId: true, status: true },
          });

          if (!claim) {
            throw new AppError('Claim not found.', 404);
          }

          if (claim.status !== ClaimStatus.pending) {
            throw new AppError(`Claim is already ${claim.status}.`, 409);
          }

          // 2. Re-read business
          const business = await tx.business.findUnique({
            where: { id: claim.businessId },
            select: { id: true, status: true, ownerId: true },
          });

          if (!business) {
            throw new AppError('Business not found.', 404);
          }

          if (business.status !== BusinessStatus.published) {
            throw new AppError('Business is not published and cannot be claimed.', 409);
          }

          if (business.ownerId !== null) {
            throw new AppError('Business already has an assigned owner.', 409);
          }

          // 3. Set business.ownerId = claimantId
          await tx.business.update({
            where: { id: claim.businessId },
            data: {
              ownerId: claim.claimantId,
            },
          });

          // Promote claimant role to business_owner if user / guest_promoted
          const claimantUser = await tx.user.findUnique({
            where: { id: claim.claimantId },
            select: { id: true, role: true },
          });
          if (
            claimantUser &&
            (claimantUser.role === 'user' || claimantUser.role === 'guest_promoted')
          ) {
            await tx.user.update({
              where: { id: claim.claimantId },
              data: { role: 'business_owner' },
            });
          }

          // 4. Update claim.status = approved, reviewedAt, reviewedBy
          const updatedClaim = await tx.businessClaim.update({
            where: { id: claimId },
            data: {
              status: ClaimStatus.approved,
              reviewedAt: new Date(),
              reviewedBy: adminId,
            },
            select: {
              id: true,
              businessId: true,
              claimantId: true,
              status: true,
            },
          });

          // 5. Create admin_actions audit record
          await tx.adminAction.create({
            data: {
              adminId,
              targetType: AdminTargetType.claim,
              targetId: claimId,
              action: AdminActionType.approve,
              reason: null,
            },
          });

          return updatedClaim;
        },
        { maxWait: 10000, timeout: 20000 }
      );

      notifyClaimDecision(claimId, 'approved');

      return {
        id: result.id,
        businessId: result.businessId,
        claimantId: result.claimantId,
        status: result.status,
      };
    } catch (err: unknown) {
      if (err instanceof AppError) throw err;
      console.error('[ClaimService] approveClaim error:', err);
      throw new AppError('Failed to approve business claim.', 500);
    }
  }

  /**
   * PATCH /api/admin/claims/:claimId/reject — Atomically rejects a pending claim with optional reason.
   */
  static async rejectClaim(
    adminId: string,
    claimId: string,
    reason?: string | null
  ) {
    try {
      const formattedReason = reason?.trim() ? reason.trim() : null;

      const result = await prisma.$transaction(
        async (tx) => {
          // 1. Re-read claim
          const claim = await tx.businessClaim.findUnique({
            where: { id: claimId },
            select: { id: true, businessId: true, status: true },
          });

          if (!claim) {
            throw new AppError('Claim not found.', 404);
          }

          if (claim.status !== ClaimStatus.pending) {
            throw new AppError(`Claim is already ${claim.status}.`, 409);
          }

          // 2. Update claim.status = rejected, reviewedAt, reviewedBy, rejectionReason
          const updatedClaim = await tx.businessClaim.update({
            where: { id: claimId },
            data: {
              status: ClaimStatus.rejected,
              rejectionReason: formattedReason,
              reviewedAt: new Date(),
              reviewedBy: adminId,
            },
            select: {
              id: true,
              status: true,
              rejectionReason: true,
            },
          });

          // 3. Create admin_actions audit record
          await tx.adminAction.create({
            data: {
              adminId,
              targetType: AdminTargetType.claim,
              targetId: claimId,
              action: AdminActionType.reject,
              reason: formattedReason,
            },
          });

          return updatedClaim;
        },
        { maxWait: 10000, timeout: 20000 }
      );

      notifyClaimDecision(claimId, 'rejected', formattedReason);

      return {
        id: result.id,
        status: result.status,
      };
    } catch (err: unknown) {
      if (err instanceof AppError) throw err;
      console.error('[ClaimService] rejectClaim error:', err);
      throw new AppError('Failed to reject business claim.', 500);
    }
  }
}
