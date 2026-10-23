import { Prisma } from '@prisma/client';

/**
 * Shared Business Rating Aggregate Recalculation Helper
 * Used by both TN-012 (Reviews Module) and TN-021 (Admin Moderation Module)
 * to guarantee identical calculations, rounding precision (1 decimal place),
 * and transaction atomicity.
 *
 * @param tx Prisma transaction client
 * @param businessId Target business ID
 */
export async function recalculateBusinessAggregate(
  tx: Prisma.TransactionClient,
  businessId: string
): Promise<{ avgRating: number; reviewCount: number }> {
  const aggregateResult = await tx.review.aggregate({
    where: {
      businessId,
      isDeleted: false,
    },
    _avg: {
      rating: true,
    },
    _count: {
      id: true,
    },
  });

  const reviewCount = aggregateResult._count.id;
  const avgRating =
    aggregateResult._avg.rating !== null
      ? Math.round(aggregateResult._avg.rating * 10) / 10
      : 0;

  await tx.business.update({
    where: { id: businessId },
    data: {
      avgRating,
      reviewCount,
    },
  });

  return { avgRating, reviewCount };
}
