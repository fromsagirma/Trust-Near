/**
 * TN-006 / TN-007 — Business Service
 *
 * Key design decisions:
 *
 * 1. The `location` column is NOT NULL in the DB with no default, so we cannot
 *    do a two-step "INSERT row then UPDATE geography". Instead we embed the
 *    geography directly inside the INSERT using a single $queryRaw statement.
 *    ST_MakePoint(longitude, latitude) is the correct coordinate order per PostGIS.
 *
 * 2. If photoUrls are provided, photos are written in the same $transaction as
 *    the business INSERT. A failure in the photo write causes the entire
 *    transaction — including the business INSERT — to roll back, ensuring
 *    no partial rows are ever committed.
 *
 * 3. submittedBy, ownerId, and status are ALWAYS computed here from the
 *    authenticated user's id and role. They are never read from the request body.
 */
import { ActivityType, Prisma, Role } from '@prisma/client';
import { prisma } from '../../config/db';
import { AppError } from '../auth/auth.service';
import type { CreateBusinessInput, NearbyQueryInput } from './business.schema';
import { ActivityService } from '../activity/activity.service';

/** Shape of the raw rows returned by the businesses INSERT ... RETURNING clause. */
interface RawBusinessRow {
  id: string;
  name: string;
  status: string;
  submitted_by: string;
  owner_id: string | null;
  category_id: number;
  created_at: Date;
}

interface RawNearbyBusinessRow {
  id: string;
  name: string;
  category_id: number;
  category_name: string;
  description: string | null;
  landmark_description: string;
  phone: string | null;
  hours: any;
  avg_rating: any;
  review_count: number;
  lat: number;
  lng: number;
  image_url: string | null;
  distanceMeters: number;
}

export class BusinessService {
  private static spatialIndexEnsured = false;

  public static async ensureSpatialIndex() {
    if (this.spatialIndexEnsured) return;
    try {
      await prisma.$executeRawUnsafe(
        'CREATE INDEX IF NOT EXISTS businesses_location_idx ON businesses USING GIST (location);'
      );
      this.spatialIndexEnsured = true;
    } catch (err) {
      console.warn('[BusinessService] Spatial index check warning:', err);
    }
  }

  /**
   * Searches for published businesses near a specified coordinate — TN-003 / TN-004.
   * Supports optional filtering by name (partial match), categoryId, and minRating.
   *
   * @param query Validated Zod query parameters (lat, lng, radius, sort, page, pageSize, name, categoryId, minRating)
   */
  static async getNearbyBusinesses(query: NearbyQueryInput) {
    try {
      await this.ensureSpatialIndex();

      const {
        lat,
        lng,
        radius,
        sort = 'distance',
        page = 1,
        pageSize = 20,
        name,
        categoryId,
        minRating,
      } = query;

      // ── Category existence validation (if categoryId is provided) ─────────────
      if (categoryId !== undefined) {
        const category = await prisma.category.findUnique({
          where: { id: categoryId },
          select: { id: true },
        });
        if (!category) {
          throw new AppError(
            `Category with ID ${categoryId} does not exist.`,
            400
          );
        }
      }

      const validPage = Math.max(1, page);
      const validPageSize = Math.max(1, Math.min(50, pageSize));
      const offset = (validPage - 1) * validPageSize;

      // ── Build additive WHERE conditions ──────────────────────────────────────
      const whereConditions: Prisma.Sql[] = [
        Prisma.sql`b.status = 'published'::"BusinessStatus"`,
        Prisma.sql`ST_DWithin(
          b.location,
          ST_SetSRID(ST_MakePoint(${lng}::float8, ${lat}::float8), 4326)::geography,
          ${radius}::float8
        )`,
      ];

      if (name) {
        const namePattern = `%${name}%`;
        whereConditions.push(
          Prisma.sql`(b.name ILIKE ${namePattern} OR b.landmark_description ILIKE ${namePattern})`
        );
      }

      if (categoryId !== undefined) {
        whereConditions.push(
          Prisma.sql`b.category_id = ${categoryId}::smallint`
        );
      }

      if (minRating !== undefined) {
        whereConditions.push(
          Prisma.sql`b.avg_rating >= ${minRating}::numeric`
        );
      }

      const whereClause = Prisma.join(whereConditions, ' AND ');

      // ── 1. Count query for pagination (published status + spatial radius + search filters) ─
      const countResult = await prisma.$queryRaw<[{ count: bigint }]>`
        SELECT COUNT(*)::bigint AS count
        FROM businesses b
        JOIN categories c ON b.category_id = c.id
        WHERE ${whereClause}
      `;
      const total = Number(countResult[0]?.count ?? 0);

      if (total === 0) {
        return {
          data: [],
          pagination: {
            page: validPage,
            pageSize: validPageSize,
            total: 0,
            totalPages: 0,
          },
        };
      }

      // ── 2. Geospatial search & distance query ────────────────────────────────
      // Spatial ordering / tie-breaker logic:
      // sort=rating: avg_rating DESC, "distanceMeters" ASC, id ASC
      // sort=distance: "distanceMeters" ASC, created_at DESC, id ASC
      let rows: RawNearbyBusinessRow[];

      if (sort === 'rating') {
        rows = await prisma.$queryRaw<RawNearbyBusinessRow[]>`
          SELECT
            b.id,
            b.name,
            b.category_id,
            c.name AS category_name,
            b.description,
            b.landmark_description,
            b.phone,
            b.hours,
            b.avg_rating,
            b.review_count,
            ST_Y(b.location::geometry)::float8 AS lat,
            ST_X(b.location::geometry)::float8 AS lng,
            (
              SELECT bp.url
              FROM business_photos bp
              WHERE bp.business_id = b.id
              ORDER BY bp.sort_order ASC
              LIMIT 1
            ) AS image_url,
            ST_Distance(
              b.location,
              ST_SetSRID(ST_MakePoint(${lng}::float8, ${lat}::float8), 4326)::geography
            )::float8 AS "distanceMeters"
          FROM businesses b
          JOIN categories c ON b.category_id = c.id
          WHERE ${whereClause}
          ORDER BY b.avg_rating DESC, "distanceMeters" ASC, b.id ASC
          LIMIT ${validPageSize}::int OFFSET ${offset}::int
        `;
      } else {
        rows = await prisma.$queryRaw<RawNearbyBusinessRow[]>`
          SELECT
            b.id,
            b.name,
            b.category_id,
            c.name AS category_name,
            b.description,
            b.landmark_description,
            b.phone,
            b.hours,
            b.avg_rating,
            b.review_count,
            ST_Y(b.location::geometry)::float8 AS lat,
            ST_X(b.location::geometry)::float8 AS lng,
            (
              SELECT bp.url
              FROM business_photos bp
              WHERE bp.business_id = b.id
              ORDER BY bp.sort_order ASC
              LIMIT 1
            ) AS image_url,
            ST_Distance(
              b.location,
              ST_SetSRID(ST_MakePoint(${lng}::float8, ${lat}::float8), 4326)::geography
            )::float8 AS "distanceMeters"
          FROM businesses b
          JOIN categories c ON b.category_id = c.id
          WHERE ${whereClause}
          ORDER BY "distanceMeters" ASC, b.created_at DESC, b.id ASC
          LIMIT ${validPageSize}::int OFFSET ${offset}::int
        `;
      }

      // ── 3. Format public fields only ─────────────────────────────────────────
      const data = rows.map((row) => ({
        id: row.id,
        name: row.name,
        categoryId: row.category_id,
        categoryName: row.category_name,
        landmarkDescription: row.landmark_description,
        description: row.description ?? null,
        phone: row.phone ?? null,
        hours: row.hours ?? null,
        location: {
          lat: Number(row.lat),
          lng: Number(row.lng),
        },
        imageUrl: row.image_url ?? null,
        distanceMeters: Math.round(row.distanceMeters * 100) / 100,
        rating: Number(row.avg_rating ?? 0),
        reviewCount: Number(row.review_count ?? 0),
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
    } catch (err: unknown) {
      if (err instanceof AppError) throw err;
      console.error('[BusinessService] getNearbyBusinesses error:', err);
      throw new AppError('Failed to search nearby businesses.', 500);
    }
  }

  /**
   * Creates a new business listing — TN-006, TN-007.
   *
   * @param userId  Authenticated user's id (always used as submittedBy)
   * @param role    Authenticated user's role (drives ownerId + status)
   * @param data    Validated, Zod-parsed request body (no injected fields)
   */
  static async createBusiness(
    userId: string,
    role: Role,
    data: CreateBusinessInput
  ) {
    try {
      // ── 1. Validate that the category exists ──────────────────────────────────
      if (!data.categoryId || data.categoryId < 1 || data.categoryId > 32767) {
        throw new AppError(
          `Category with ID ${data.categoryId} does not exist.`,
          400
        );
      }

      const category = await prisma.category.findUnique({
        where: { id: data.categoryId },
        select: { id: true },
      });
      if (!category) {
        throw new AppError(
          `Category with ID ${data.categoryId} does not exist.`,
          400
        );
      }

    // ── 2. Derive server-side-only fields ─────────────────────────────────────
    //    These are computed from the JWT payload — never from req.body.
    const submittedBy = userId;
    const ownerId: string | null =
      role === Role.business_owner ? userId : null;
    const status: 'pending' | 'published' =
      role === Role.seed_admin ? 'published' : 'pending';

    // ── 3. Prepare values ─────────────────────────────────────────────────────
    const name = data.name.trim();
    const landmarkDescription = data.landmarkDescription.trim();
    const { lat, lng } = data.location;
    const { categoryId } = data;
    const description = data.description ?? null;
    const phone = data.phone ?? null;
    // Serialise hours to JSON string for ::jsonb cast (null → SQL NULL)
    const hoursJson =
      data.hours !== undefined ? JSON.stringify(data.hours) : null;
    const photoUrls = data.photoUrls ?? [];

    // ── 4. Atomic transaction ─────────────────────────────────────────────────
    const business = await prisma.$transaction(async (tx) => {
        /**
         * Step A — INSERT business row.
         *
         * The geography column is NOT NULL, so we must provide it in the same
         * statement rather than in a subsequent UPDATE.
         * Coordinate order for ST_MakePoint is (longitude, latitude).
         */
        const rows = await tx.$queryRaw<RawBusinessRow[]>`
          INSERT INTO businesses (
            name,
            category_id,
            description,
            landmark_description,
            location,
            phone,
            hours,
            status,
            submitted_by,
            owner_id,
            updated_at
          ) VALUES (
            ${name},
            ${categoryId}::smallint,
            ${description}::text,
            ${landmarkDescription}::text,
            ST_SetSRID(ST_MakePoint(${lng}::float8, ${lat}::float8), 4326)::geography,
            ${phone}::varchar(32),
            ${hoursJson}::jsonb,
            ${status}::"BusinessStatus",
            ${submittedBy}::uuid,
            ${ownerId}::uuid,
            NOW()
          )
          RETURNING
            id,
            name,
            status,
            submitted_by,
            owner_id,
            category_id,
            created_at
        `;

        const created = rows[0];
        if (!created) {
          throw new Error('Business INSERT returned no rows.');
        }

        /**
         * Step B — INSERT photo rows (if provided).
         *
         * This is the second database write that makes the $transaction
         * necessary: a failure here rolls back Step A, leaving no orphaned
         * business row in the database.
         */
        if (photoUrls.length > 0) {
          await tx.businessPhoto.createMany({
            data: photoUrls.map((url, sortOrder) => ({
              businessId: created.id,
              url,
              sortOrder,
            })),
          });
        }

        return created;
      },
      { maxWait: 10000, timeout: 20000 }
    );

      try {
        await ActivityService.logActivity({
          userId,
          activityType: ActivityType.listing_created,
          title: `Created listing for ${business.name}`,
          subtitle: landmarkDescription || 'Submitted business listing',
          businessId: business.id,
        });
      } catch (_) {
        // Non-blocking activity log failure
      }

      // ── 5. Return safe, public fields only ───────────────────────────────────
      return {
        id: business.id,
        name: business.name,
        status: business.status as 'pending' | 'published' | 'rejected',
        submittedBy: business.submitted_by,
        ownerId: business.owner_id,
        categoryId: business.category_id,
        createdAt: business.created_at,
      };
    } catch (err: unknown) {
      // Re-throw known AppErrors (e.g. category-not-found) unchanged.
      if (err instanceof AppError) throw err;

      // Do not expose raw Prisma / database details to callers.
      console.error('[BusinessService] createBusiness error:', err);
      throw new AppError(
        'Failed to create business listing. Please try again later.',
        500
      );
    }
  }

  /**
   * Retrieves full public details of a published business by ID — TN-008.
   * Only businesses with status = 'published' are returned.
   * If not found or status != 'published', throws AppError 404.
   */
  static async getBusinessDetails(id: string) {
    try {
      const rows = await prisma.$queryRaw<any[]>`
        SELECT 
          b.id,
          b.name,
          b.description,
          b.landmark_description AS "landmarkDescription",
          ST_Y(b.location::geometry)::float8 AS lat,
          ST_X(b.location::geometry)::float8 AS lng,
          b.phone,
          b.hours,
          b.avg_rating AS "avgRating",
          b.review_count AS "reviewCount",
          b.category_id AS "categoryId",
          c.name AS "categoryName"
        FROM businesses b
        JOIN categories c ON b.category_id = c.id
        WHERE b.id = ${id}::uuid AND b.status = 'published'::"BusinessStatus"
      `;

      if (!rows || rows.length === 0) {
        throw new AppError('Business not found.', 404);
      }

      const row = rows[0];

      // Fetch associated business photos ordered by sortOrder ASC
      const photos = await prisma.businessPhoto.findMany({
        where: { businessId: id },
        select: {
          id: true,
          url: true,
          sortOrder: true,
        },
        orderBy: { sortOrder: 'asc' },
      });

      return {
        id: row.id,
        name: row.name,
        category: {
          id: row.categoryId,
          name: row.categoryName,
        },
        description: row.description ?? null,
        landmarkDescription: row.landmarkDescription,
        location: {
          lat: Number(row.lat),
          lng: Number(row.lng),
        },
        hours: row.hours ?? null,
        phone: row.phone ?? null,
        photos: photos.map((p) => ({
          id: p.id,
          url: p.url,
          sortOrder: p.sortOrder,
        })),
        rating: Number(row.avgRating ?? 0),
        reviewCount: Number(row.reviewCount ?? 0),
      };
    } catch (err: unknown) {
      if (err instanceof AppError) throw err;
      console.error('[BusinessService] getBusinessDetails error:', err);
      throw new AppError('Failed to retrieve business details.', 500);
    }
  }

  /**
   * Returns all categories for the public lookup endpoint with listing counts.
   */
  static async getCategories() {
    try {
      const categories = await prisma.category.findMany({
        select: {
          id: true,
          name: true,
          isActive: true,
          _count: {
            select: { businesses: true },
          },
        },
        orderBy: { id: 'asc' },
      });

      return categories.map((c) => ({
        id: c.id,
        name: c.name,
        count: c._count.businesses,
        isActive: c.isActive,
      }));
    } catch (err: unknown) {
      console.error('[BusinessService] getCategories error:', err);
      throw new AppError('Failed to retrieve categories.', 500);
    }
  }

  /**
   * Updates an existing category (name / isActive status).
   */
  static async updateCategory(id: number, data: { name?: string; isActive?: boolean }) {
    try {
      const updateData: any = {};
      if (data.name && typeof data.name === 'string') {
        updateData.name = data.name.trim().toLowerCase();
      }
      if (typeof data.isActive === 'boolean') {
        updateData.isActive = data.isActive;
      }
      return await prisma.category.update({
        where: { id },
        data: updateData,
      });
    } catch (err: unknown) {
      if (err instanceof AppError) throw err;
      console.error('[BusinessService] updateCategory error:', err);
      throw new AppError('Failed to update category.', 500);
    }
  }

  /**
   * Creates a new business category.
   */
  static async createCategory(name: string) {
    try {
      const formattedName = name.trim().toLowerCase();
      const existing = await prisma.category.findUnique({
        where: { name: formattedName },
      });
      if (existing) {
        return existing;
      }
      return await prisma.category.create({
        data: { name: formattedName },
      });
    } catch (err: unknown) {
      console.error('[BusinessService] createCategory error:', err);
      throw new AppError('Failed to create category.', 500);
    }
  }

  /**
   * Deletes a category by ID.
   */
  static async deleteCategory(id: number) {
    try {
      await prisma.business.deleteMany({
        where: { categoryId: id },
      });
      return await prisma.category.delete({
        where: { id },
      });
    } catch (err: unknown) {
      if (err instanceof AppError) throw err;
      console.error('[BusinessService] deleteCategory error:', err);
      throw new AppError('Failed to delete category.', 500);
    }
  }
}

