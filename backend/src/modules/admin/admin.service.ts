/**
 * TN-022 — Admin Business Approval Service
 */
import { AdminTargetType, AdminActionType, BusinessStatus } from '@prisma/client';
import { prisma } from '../../config/db';
import { AppError } from '../auth/auth.service';

/**
 * Stub notification handler for TN-020.
 * Called after transaction commits to notify submitter of decision.
 */
export const notifyBusinessDecision = (
  businessId: string,
  decision: 'published' | 'rejected',
  reason?: string | null
): void => {
  // TODO TN-020: Wire up to real notification service when TN-020 is implemented
  console.log(
    `[NOTIFICATION STUB] Business ${businessId} decision: ${decision}${
      reason ? ` (Reason: ${reason})` : ''
    }`
  );
};

interface RawPendingBusiness {
  id: string;
  name: string;
  category_id: number;
  category_name: string | null;
  landmark_description: string;
  lat: number;
  lng: number;
  submitted_by: string;
  submitter_name: string | null;
  owner_id: string | null;
  phone: string | null;
  avg_rating: number | null;
  review_count: number | null;
  created_at: Date;
  status: string;
}

export class AdminService {
  /**
   * Retrieves business listings for admin review queue filtered by status.
   */
  static async getPendingBusinesses(page = 1, pageSize = 20, statusFilter?: string) {
    try {
      const validPage = Math.max(1, page);
      const validPageSize = Math.max(1, Math.min(100, pageSize));
      const offset = (validPage - 1) * validPageSize;

      let targetStatus: BusinessStatus | null = null;
      if (statusFilter === 'pending') {
        targetStatus = BusinessStatus.pending;
      } else if (statusFilter === 'approved' || statusFilter === 'published') {
        targetStatus = BusinessStatus.published;
      } else if (statusFilter === 'rejected') {
        targetStatus = BusinessStatus.rejected;
      } else if (statusFilter === 'all' || !statusFilter) {
        targetStatus = null;
      }

      let total = 0;
      let rows: RawPendingBusiness[] = [];

      if (targetStatus !== null) {
        const totalCountResult = await prisma.$queryRaw<[{ count: bigint }]>`
          SELECT COUNT(*)::bigint AS count
          FROM businesses
          WHERE status = ${targetStatus}::"BusinessStatus"
        `;
        total = Number(totalCountResult[0]?.count ?? 0);

        rows = await prisma.$queryRaw<RawPendingBusiness[]>`
          SELECT 
            b.id,
            b.name,
            b.category_id,
            c.name AS category_name,
            b.landmark_description,
            ST_Y(b.location::geometry)::float8 AS lat,
            ST_X(b.location::geometry)::float8 AS lng,
            b.submitted_by,
            u.display_name AS submitter_name,
            b.owner_id,
            b.phone,
            b.avg_rating::float8 AS avg_rating,
            b.review_count,
            b.created_at,
            b.status::text AS status
          FROM businesses b
          LEFT JOIN categories c ON b.category_id = c.id
          LEFT JOIN users u ON b.submitted_by = u.id
          WHERE b.status = ${targetStatus}::"BusinessStatus"
          ORDER BY b.created_at DESC
          LIMIT ${validPageSize} OFFSET ${offset}
        `;
      } else {
        const totalCountResult = await prisma.$queryRaw<[{ count: bigint }]>`
          SELECT COUNT(*)::bigint AS count
          FROM businesses
        `;
        total = Number(totalCountResult[0]?.count ?? 0);

        rows = await prisma.$queryRaw<RawPendingBusiness[]>`
          SELECT 
            b.id,
            b.name,
            b.category_id,
            c.name AS category_name,
            b.landmark_description,
            ST_Y(b.location::geometry)::float8 AS lat,
            ST_X(b.location::geometry)::float8 AS lng,
            b.submitted_by,
            u.display_name AS submitter_name,
            b.owner_id,
            b.phone,
            b.avg_rating::float8 AS avg_rating,
            b.review_count,
            b.created_at,
            b.status::text AS status
          FROM businesses b
          LEFT JOIN categories c ON b.category_id = c.id
          LEFT JOIN users u ON b.submitted_by = u.id
          ORDER BY b.created_at DESC
          LIMIT ${validPageSize} OFFSET ${offset}
        `;
      }

      const businesses = rows.map((r) => ({
        id: r.id,
        name: r.name,
        categoryId: r.category_id,
        category: r.category_name ? r.category_name.charAt(0).toUpperCase() + r.category_name.slice(1) : 'General',
        landmarkDescription: r.landmark_description,
        location: {
          lat: r.lat,
          lng: r.lng,
        },
        phone: r.phone || null,
        avgRating: r.avg_rating || 5.0,
        reviewCount: r.review_count || 0,
        submittedBy: r.submitter_name || 'Community Member',
        ownerId: r.owner_id,
        createdAt: r.created_at.toISOString(),
        status: r.status === 'published' ? 'published' : r.status,
      }));

      return {
        businesses,
        page: validPage,
        pageSize: validPageSize,
        total,
      };
    } catch (err: unknown) {
      if (err instanceof AppError) throw err;
      console.error('[AdminService] getPendingBusinesses error:', err);
      throw new AppError('Failed to fetch business listings.', 500);
    }
  }

  /**
   * Approves a pending business listing.
   */
  static async approveBusiness(adminId: string, businessId: string) {
    try {
      const business = await prisma.business.findUnique({
        where: { id: businessId },
        select: { id: true, status: true },
      });

      if (!business) {
        throw new AppError('Business not found.', 404);
      }

      if (business.status !== BusinessStatus.pending) {
        throw new AppError(
          `Business is already ${business.status}.`,
          409
        );
      }

      await prisma.$transaction(
        async (tx) => {
          await tx.business.update({
            where: { id: businessId },
            data: {
              status: BusinessStatus.published,
            },
          });

          await tx.adminAction.create({
            data: {
              adminId,
              targetType: AdminTargetType.business,
              targetId: businessId,
              action: AdminActionType.approve,
              reason: null,
            },
          });
        },
        { maxWait: 10000, timeout: 20000 }
      );

      notifyBusinessDecision(businessId, 'published');

      return {
        id: businessId,
        status: BusinessStatus.published,
      };
    } catch (err: unknown) {
      if (err instanceof AppError) throw err;
      console.error('[AdminService] approveBusiness error:', err);
      throw new AppError('Failed to approve business.', 500);
    }
  }

  /**
   * Rejects a pending business listing.
   */
  static async rejectBusiness(
    adminId: string,
    businessId: string,
    reason?: string | null
  ) {
    try {
      const business = await prisma.business.findUnique({
        where: { id: businessId },
        select: { id: true, status: true },
      });

      if (!business) {
        throw new AppError('Business not found.', 404);
      }

      if (business.status !== BusinessStatus.pending) {
        throw new AppError(
          `Business was already ${business.status}.`,
          409
        );
      }

      const formattedReason = reason?.trim() ? reason.trim() : null;

      await prisma.$transaction(
        async (tx) => {
          await tx.business.update({
            where: { id: businessId },
            data: {
              status: BusinessStatus.rejected,
            },
          });

          await tx.adminAction.create({
            data: {
              adminId,
              targetType: AdminTargetType.business,
              targetId: businessId,
              action: AdminActionType.reject,
              reason: formattedReason,
            },
          });
        },
        { maxWait: 10000, timeout: 20000 }
      );

      notifyBusinessDecision(businessId, 'rejected', formattedReason);

      return {
        id: businessId,
        status: BusinessStatus.rejected,
      };
    } catch (err: unknown) {
      if (err instanceof AppError) throw err;
      console.error('[AdminService] rejectBusiness error:', err);
      throw new AppError('Failed to reject business.', 500);
    }
  }

  /**
   * Retrieves registered users for admin governance.
   */
  static async getUsers(options: {
    page?: number;
    pageSize?: number;
    search?: string;
    role?: string;
    status?: string;
  }) {
    try {
      const page = Math.max(1, options.page || 1);
      const pageSize = Math.max(1, Math.min(100, options.pageSize || 50));
      const skip = (page - 1) * pageSize;

      const where: any = {};

      if (options.status === 'banned') {
        where.isDeleted = true;
      } else if (options.status === 'active') {
        where.isDeleted = false;
      }

      if (options.role && options.role !== 'all') {
        const mappedRole = options.role === 'consumer' ? 'user' : options.role;
        where.role = mappedRole;
      }

      if (options.search && options.search.trim()) {
        const term = options.search.trim();
        where.OR = [
          { displayName: { contains: term, mode: 'insensitive' } },
          { email: { contains: term, mode: 'insensitive' } },
        ];
      }

      const [total, users] = await Promise.all([
        prisma.user.count({ where }),
        prisma.user.findMany({
          where,
          select: {
            id: true,
            displayName: true,
            email: true,
            role: true,
            isDeleted: true,
            createdAt: true,
          },
          orderBy: { createdAt: 'desc' },
          skip,
          take: pageSize,
        }),
      ]);

      const formattedUsers = users.map((u) => ({
        id: u.id,
        displayName: u.displayName,
        email: u.email,
        role: u.role === 'user' ? 'consumer' : u.role,
        status: u.isDeleted ? 'banned' : 'active',
        createdAt: u.createdAt.toISOString(),
      }));

      return {
        users: formattedUsers,
        total,
        page,
        pageSize,
      };
    } catch (err: unknown) {
      if (err instanceof AppError) throw err;
      console.error('[AdminService] getUsers error:', err);
      throw new AppError('Failed to fetch users list.', 500);
    }
  }

  /**
   * Updates user role.
   */
  static async updateUserRole(adminId: string, userId: string, newRole: string) {
    try {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { id: true, role: true },
      });

      if (!user) {
        throw new AppError('User not found.', 404);
      }

      const dbRole = (newRole === 'consumer' ? 'user' : newRole) as any;

      const updated = await prisma.user.update({
        where: { id: userId },
        data: { role: dbRole },
        select: {
          id: true,
          displayName: true,
          email: true,
          role: true,
          isDeleted: true,
          updatedAt: true,
        },
      });

      return {
        id: updated.id,
        displayName: updated.displayName,
        email: updated.email,
        role: updated.role === 'user' ? 'consumer' : updated.role,
        status: updated.isDeleted ? 'banned' : 'active',
      };
    } catch (err: unknown) {
      if (err instanceof AppError) throw err;
      console.error('[AdminService] updateUserRole error:', err);
      throw new AppError('Failed to update user role.', 500);
    }
  }

  /**
   * Toggles user ban status (account suspension).
   */
  static async toggleUserBan(adminId: string, userId: string, isBanned: boolean, reason?: string) {
    try {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { id: true, isDeleted: true },
      });

      if (!user) {
        throw new AppError('User not found.', 404);
      }

      const updated = await prisma.user.update({
        where: { id: userId },
        data: {
          isDeleted: isBanned,
          deletedAt: isBanned ? new Date() : null,
        },
        select: {
          id: true,
          displayName: true,
          email: true,
          role: true,
          isDeleted: true,
        },
      });

      return {
        id: updated.id,
        displayName: updated.displayName,
        email: updated.email,
        role: updated.role === 'user' ? 'consumer' : updated.role,
        status: updated.isDeleted ? 'banned' : 'active',
        banReason: isBanned ? (reason || 'Abuse of community guidelines') : undefined,
      };
    } catch (err: unknown) {
      if (err instanceof AppError) throw err;
      console.error('[AdminService] toggleUserBan error:', err);
      throw new AppError('Failed to toggle user ban status.', 500);
    }
  }
}

