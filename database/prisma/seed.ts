import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.join(__dirname, '../../backend/.env') });

const connectionString = process.env.DATABASE_URL || 'postgresql://postgres:1234@localhost:5432/trust_near';
const adapter = new PrismaPg({ connectionString });
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log('🌱 Starting TrustNear Database Seeding...\n');

  // 1. Seed Categories (lookup table)
  const categoryNames = ['restaurant', 'cafe', 'bar', 'hotel', 'guesthouse', 'services', 'retail', 'other'];

  for (const name of categoryNames) {
    await prisma.category.upsert({
      where: { name },
      update: {},
      create: { name },
    });
  }
  console.log(`✅ Seeded ${categoryNames.length} categories.`);

  const restaurantCategory = await prisma.category.findUnique({ where: { name: 'restaurant' } });
  const cafeCategory = await prisma.category.findUnique({ where: { name: 'cafe' } });

  if (!restaurantCategory || !cafeCategory) {
    throw new Error('Category seeding failed — categories not found after upsert.');
  }

  // 2. Seed Users
  // Simple bcrypt pre-computed hashes for 'Password123!'
  const sampleHash = '$2a$10$wT2M1J3v0hV5l8R8y5n5ue7.vK4W8p9Q1r2s3t4u5v6w7x8y9z012';

  const admin = await prisma.user.upsert({
    where: { email: 'admin@trustnear.com' },
    update: {},
    create: {
      email: 'admin@trustnear.com',
      displayName: 'System Admin',
      passwordHash: sampleHash,
      role: 'seed_admin',
      languagePref: 'en',
    },
  });
  console.log(`✅ Seed Admin created:          ${admin.email}`);

  const owner = await prisma.user.upsert({
    where: { email: 'owner@trustnear.com' },
    update: {},
    create: {
      email: 'owner@trustnear.com',
      displayName: 'Abebe Bikila',
      passwordHash: sampleHash,
      role: 'business_owner',
      languagePref: 'am',
    },
  });
  console.log(`✅ Business Owner created:      ${owner.email}`);

  const regularUser = await prisma.user.upsert({
    where: { email: 'user@trustnear.com' },
    update: {},
    create: {
      email: 'user@trustnear.com',
      displayName: 'Tigist Alemu',
      passwordHash: sampleHash,
      role: 'user',
      languagePref: 'am',
    },
  });
  console.log(`✅ Regular User created:        ${regularUser.email}`);

  // 3. Seed Businesses (via Raw SQL for PostGIS Unsupported location column)
  const b1Id = '11111111-1111-4111-a111-111111111111';
  const b2Id = '22222222-2222-4222-a222-222222222222';

  await prisma.$executeRaw`
    INSERT INTO businesses (
      id, name, category_id, description, landmark_description, location, phone, hours, status, submitted_by, owner_id, avg_rating, review_count, created_at, updated_at
    ) VALUES (
      ${b1Id}::uuid,
      'Lucy Traditional Ethiopian Restaurant',
      ${restaurantCategory.id},
      'Authentic Ethiopian dining with live traditional coffee ceremony.',
      'Behind St. Gabriel Church, opposite the blue gate',
      ST_SetSRID(ST_MakePoint(38.7612, 9.0102), 4326)::geography,
      '+251911223344',
      '{"monday":{"open":"08:00","close":"22:00"}}'::jsonb,
      'published'::"BusinessStatus",
      ${admin.id}::uuid,
      ${owner.id}::uuid,
      4.8,
      1,
      NOW(),
      NOW()
    ) ON CONFLICT (id) DO NOTHING;
  `;

  await prisma.businessPhoto.create({
    data: {
      businessId: b1Id,
      url: 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=800&q=80&fm=webp',
      sortOrder: 0,
    },
  });
  console.log(`✅ Business 1 created:          Lucy Traditional Ethiopian Restaurant`);

  await prisma.$executeRaw`
    INSERT INTO businesses (
      id, name, category_id, description, landmark_description, location, phone, hours, status, submitted_by, owner_id, avg_rating, review_count, created_at, updated_at
    ) VALUES (
      ${b2Id}::uuid,
      'Abyssinia Specialty Cafe',
      ${cafeCategory.id},
      'Freshly roasted Yirgacheffe and Sidamo single-origin coffee.',
      'Next to National Bank building, 2nd floor above Pharmacie',
      ST_SetSRID(ST_MakePoint(38.7580, 9.0150), 4326)::geography,
      '+251922334455',
      '{"monday":{"open":"07:00","close":"20:00"}}'::jsonb,
      'published'::"BusinessStatus",
      ${admin.id}::uuid,
      ${owner.id}::uuid,
      4.6,
      0,
      NOW(),
      NOW()
    ) ON CONFLICT (id) DO NOTHING;
  `;

  await prisma.businessPhoto.create({
    data: {
      businessId: b2Id,
      url: 'https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb?w=800&q=80&fm=webp',
      sortOrder: 0,
    },
  });
  console.log(`✅ Business 2 created:          Abyssinia Specialty Cafe`);

  // 4. Seed Review
  await prisma.review.create({
    data: {
      businessId: b1Id,
      userId: regularUser.id,
      rating: 5,
      comment: 'Best traditional food in town! Amazing coffee ceremony, highly recommend.',
      isVerified: true,
      ownerReply: 'Thank you so much for your kind words! We look forward to welcoming you again.',
      ownerRepliedAt: new Date(),
      sentiment: 'positive',
    },
  });
  console.log(`✅ Sample review created with owner reply.`);

  // 5. Seed Notification
  await prisma.notification.create({
    data: {
      userId: regularUser.id,
      type: 'review_reply',
      payload: {
        businessId: b1Id,
        businessName: 'Lucy Traditional Ethiopian Restaurant',
        replyPreview: 'Thank you so much for your kind words!',
      },
      isRead: false,
    },
  });
  console.log(`✅ Sample notification created.`);

  console.log('\n🎉 TrustNear database seeding completed successfully!');
  console.log('\n📋 Seed Accounts:');
  console.log('   admin@trustnear.com  → password: Password123!  (seed_admin)');
  console.log('   owner@trustnear.com  → password: Password123!  (business_owner)');
  console.log('   user@trustnear.com   → password: Password123!   (user)');
}

main()
  .catch((e) => {
    console.error('❌ Error seeding database:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
