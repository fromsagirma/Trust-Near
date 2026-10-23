import { prisma } from '../../config/db';
import { AddPhotoInput, UpdatePhotoInput, ReorderPhotosInput } from './photos.validation';

export class PhotosService {
  /**
   * Helper to verify business existence and ownership/authorization.
   * Throws 404 if business does not exist or user is not authorized (IDOR protection).
   */
  private static async verifyBusinessOwnership(
    businessId: string,
    userId: string,
    userRole?: string
  ) {
    const business = await prisma.business.findUnique({
      where: { id: businessId },
      select: { id: true, ownerId: true, submittedBy: true },
    });

    if (!business) {
      throw { status: 404, message: 'Business not found' };
    }

    const isAdmin = userRole === 'admin' || userRole === 'seed_admin';
    const isOwner = business.ownerId === userId || business.submittedBy === userId;

    if (!isAdmin && !isOwner) {
      throw { status: 403, message: 'You are not authorized to modify photos for this business' };
    }

    return business;
  }

  /**
   * Add a new photo to a business listing.
   */
  static async addBusinessPhoto(
    userId: string,
    userRole: string | undefined,
    businessId: string,
    data: AddPhotoInput
  ) {
    await this.verifyBusinessOwnership(businessId, userId, userRole);

    // Enforce max 10 photos per business rule
    const existingCount = await prisma.businessPhoto.count({
      where: { businessId },
    });

    if (existingCount >= 10) {
      throw { status: 400, message: 'Maximum limit of 10 photos per business reached' };
    }

    const photo = await prisma.businessPhoto.create({
      data: {
        businessId,
        url: data.url,
        sortOrder: data.sortOrder ?? existingCount,
      },
    });

    return photo;
  }

  /**
   * Public list of photos for a business sorted deterministically.
   */
  static async getBusinessPhotos(businessId: string) {
    const business = await prisma.business.findUnique({
      where: { id: businessId },
      select: { id: true },
    });

    if (!business) {
      throw { status: 404, message: 'Business not found' };
    }

    const photos = await prisma.businessPhoto.findMany({
      where: { businessId },
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
    });

    return photos;
  }

  /**
   * Update photo metadata (URL, sort order).
   */
  static async updateBusinessPhoto(
    userId: string,
    userRole: string | undefined,
    businessId: string,
    photoId: string,
    data: UpdatePhotoInput
  ) {
    await this.verifyBusinessOwnership(businessId, userId, userRole);

    const existingPhoto = await prisma.businessPhoto.findUnique({
      where: { id: photoId },
    });

    if (!existingPhoto || existingPhoto.businessId !== businessId) {
      throw { status: 404, message: 'Photo not found for this business' };
    }

    const updated = await prisma.businessPhoto.update({
      where: { id: photoId },
      data: {
        ...(data.url !== undefined ? { url: data.url } : {}),
        ...(data.sortOrder !== undefined ? { sortOrder: data.sortOrder } : {}),
      },
    });

    return updated;
  }

  /**
   * Delete a single business photo.
   */
  static async deleteBusinessPhoto(
    userId: string,
    userRole: string | undefined,
    businessId: string,
    photoId: string
  ) {
    await this.verifyBusinessOwnership(businessId, userId, userRole);

    const existingPhoto = await prisma.businessPhoto.findUnique({
      where: { id: photoId },
    });

    if (!existingPhoto || existingPhoto.businessId !== businessId) {
      throw { status: 404, message: 'Photo not found for this business' };
    }

    await prisma.businessPhoto.delete({
      where: { id: photoId },
    });

    return { id: photoId, deleted: true };
  }

  /**
   * Reorder business photos in batch transaction.
   */
  static async reorderBusinessPhotos(
    userId: string,
    userRole: string | undefined,
    businessId: string,
    data: ReorderPhotosInput
  ) {
    await this.verifyBusinessOwnership(businessId, userId, userRole);

    const photoIds = data.photos.map((p) => p.id);
    const existingPhotos = await prisma.businessPhoto.findMany({
      where: { businessId, id: { in: photoIds } },
    });

    if (existingPhotos.length !== photoIds.length) {
      throw { status: 400, message: 'One or more photo IDs do not belong to this business' };
    }

    await prisma.$transaction(
      data.photos.map((p) =>
        prisma.businessPhoto.update({
          where: { id: p.id },
          data: { sortOrder: p.sortOrder },
        })
      )
    );

    return await this.getBusinessPhotos(businessId);
  }
}
