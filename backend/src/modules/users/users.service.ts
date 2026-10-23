import bcrypt from 'bcryptjs';
import { prisma } from '../../config/db';

export class UsersService {
  static async getProfile(userId: string) {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user || user.isDeleted) {
      throw { status: 404, message: 'User not found' };
    }
    const { passwordHash, ...safeUser } = user;
    return safeUser;
  }

  static async updateProfile(
    userId: string,
    data: {
      displayName?: string;
      phone?: string | null;
      profilePhotoUrl?: string | null;
      languagePref?: string | null;
    }
  ) {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user || user.isDeleted) {
      throw { status: 404, message: 'User not found' };
    }
    const updatePayload: any = {};
    if (data.displayName !== undefined) updatePayload.displayName = data.displayName;
    if (data.phone !== undefined) updatePayload.phone = data.phone;
    if (data.profilePhotoUrl !== undefined) updatePayload.profilePhotoUrl = data.profilePhotoUrl;
    if (data.languagePref !== undefined && data.languagePref !== null) {
      const lang = data.languagePref.toLowerCase().trim();
      if (['en', 'am', 'om'].includes(lang)) {
        updatePayload.languagePref = lang;
      }
    }

    const updated = await prisma.user.update({
      where: { id: userId },
      data: { ...updatePayload, updatedAt: new Date() },
    });
    const { passwordHash, ...safeUser } = updated;
    return safeUser;
  }

  static async deleteAccount(userId: string, password: string) {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user || user.isDeleted) {
      throw { status: 404, message: 'User not found' };
    }

    const isValid = await bcrypt.compare(password, user.passwordHash);
    if (!isValid) {
      throw { status: 401, message: 'Incorrect password — account deletion not confirmed' };
    }

    await prisma.$transaction([
      prisma.user.update({
        where: { id: userId },
        data: {
          isDeleted: true,
          deletedAt: new Date(),
          displayName: 'Deleted User',
          email: null,
          phone: null,
          profilePhotoUrl: null,
        },
      }),
      prisma.refreshToken.updateMany({
        where: { userId, revokedAt: null },
        data: { revokedAt: new Date() },
      }),
    ]);

    return { message: 'Account deleted successfully' };
  }

  static async getLocationSettings(userId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        defaultCity: true,
        defaultLat: true,
        defaultLng: true,
        searchRadiusKm: true,
      },
    });

    if (!user) {
      throw { status: 404, message: 'User not found' };
    }

    return {
      city: user.defaultCity || 'Addis Ababa',
      lat: user.defaultLat ?? 9.03,
      lng: user.defaultLng ?? 38.74,
      radiusKm: user.searchRadiusKm ?? 2.4,
    };
  }

  static async updateLocationSettings(
    userId: string,
    data: { city?: string; lat?: number; lng?: number; radiusKm?: number }
  ) {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user || user.isDeleted) {
      throw { status: 404, message: 'User not found' };
    }

    const updated = await prisma.user.update({
      where: { id: userId },
      data: {
        ...(data.city !== undefined ? { defaultCity: data.city } : {}),
        ...(data.lat !== undefined ? { defaultLat: data.lat } : {}),
        ...(data.lng !== undefined ? { defaultLng: data.lng } : {}),
        ...(data.radiusKm !== undefined ? { searchRadiusKm: data.radiusKm } : {}),
        updatedAt: new Date(),
      },
      select: {
        defaultCity: true,
        defaultLat: true,
        defaultLng: true,
        searchRadiusKm: true,
      },
    });

    return {
      city: updated.defaultCity || 'Addis Ababa',
      lat: updated.defaultLat ?? 9.03,
      lng: updated.defaultLng ?? 38.74,
      radiusKm: updated.searchRadiusKm ?? 2.4,
    };
  }

  static async getNotificationSettings(userId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        pushNotificationsEnabled: true,
        emailUpdatesEnabled: true,
      },
    });

    if (!user) {
      throw { status: 404, message: 'User not found' };
    }

    return {
      pushNotificationsEnabled: user.pushNotificationsEnabled,
      emailUpdatesEnabled: user.emailUpdatesEnabled,
    };
  }

  static async updateNotificationSettings(
    userId: string,
    data: { pushNotificationsEnabled?: boolean; emailUpdatesEnabled?: boolean }
  ) {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user || user.isDeleted) {
      throw { status: 404, message: 'User not found' };
    }

    const updated = await prisma.user.update({
      where: { id: userId },
      data: {
        ...(data.pushNotificationsEnabled !== undefined
          ? { pushNotificationsEnabled: data.pushNotificationsEnabled }
          : {}),
        ...(data.emailUpdatesEnabled !== undefined
          ? { emailUpdatesEnabled: data.emailUpdatesEnabled }
          : {}),
        updatedAt: new Date(),
      },
      select: {
        pushNotificationsEnabled: true,
        emailUpdatesEnabled: true,
      },
    });

    return {
      pushNotificationsEnabled: updated.pushNotificationsEnabled,
      emailUpdatesEnabled: updated.emailUpdatesEnabled,
    };
  }
}

