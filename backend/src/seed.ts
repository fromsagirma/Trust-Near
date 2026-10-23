import {
  PrismaClient,
  ReportReason,
  ReportStatus,
  ClaimStatus,
  ConnectionStatus,
  PromotionStatus,
  NotificationType,
  AdminTargetType,
  AdminActionType,
  ActivityType,
  TicketStatus,
} from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import dotenv from 'dotenv';
import path from 'path';
import bcrypt from 'bcryptjs';

dotenv.config({ path: path.join(__dirname, '../.env') });

const connectionString =
  process.env.DATABASE_URL || 'postgresql://postgres:1234@localhost:5432/trust_near';
const adapter = new PrismaPg({ connectionString });
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log('🌱 Starting TrustNear Comprehensive Ethiopian Database Seeding...\n');

  // 1. Seed Categories (Lookup Table)
  const categoriesData = [
    { name: 'restaurant', label: 'Restaurant & Traditional Food' },
    { name: 'cafe', label: 'Café & Traditional Buna' },
    { name: 'bar', label: 'Tej Bet, Bar & Lounge' },
    { name: 'hotel', label: 'Hotel & Guesthouse' },
    { name: 'services', label: 'Automotive & Professional Services' },
    { name: 'retail', label: 'Supermarket, Boutique & Souvenir' },
    { name: 'pharmacy', label: 'Pharmacy & Health Clinic' },
    { name: 'other', label: 'General & Craft Workshop' },
  ];

  const categoryMap: Record<string, number> = {};
  for (const cat of categoriesData) {
    const created = await prisma.category.upsert({
      where: { name: cat.name },
      update: { isActive: true },
      create: { name: cat.name, isActive: true },
    });
    categoryMap[cat.name] = created.id;
  }
  console.log(`✅ Seeded ${Object.keys(categoryMap).length} Ethiopian business categories.`);

  // 2. Seed Users
  const passwordHash = await bcrypt.hash('Password123!', 10);

  const admin = await prisma.user.upsert({
    where: { email: 'admin@trustnear.com' },
    update: { passwordHash, role: 'seed_admin' },
    create: {
      email: 'admin@trustnear.com',
      phone: '+251911000001',
      displayName: 'System Admin (TrustNear)',
      passwordHash,
      role: 'seed_admin',
      languagePref: 'en',
      defaultCity: 'Addis Ababa',
      defaultLat: 9.03,
      defaultLng: 38.74,
      profilePhotoUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400&q=80',
    },
  });

  const secondaryAdmin = await prisma.user.upsert({
    where: { email: 'admin2@trustnear.com' },
    update: { passwordHash, role: 'admin' },
    create: {
      email: 'admin2@trustnear.com',
      phone: '+251911000002',
      displayName: 'Helen Mengistu (Moderation Lead)',
      passwordHash,
      role: 'admin',
      languagePref: 'am',
      defaultCity: 'Addis Ababa',
      defaultLat: 9.015,
      defaultLng: 38.76,
      profilePhotoUrl: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=400&q=80',
    },
  });

  const owner1 = await prisma.user.upsert({
    where: { email: 'owner@trustnear.com' },
    update: { passwordHash, role: 'business_owner' },
    create: {
      email: 'owner@trustnear.com',
      phone: '+251911223344',
      displayName: 'Abebe Bikila',
      passwordHash,
      role: 'business_owner',
      languagePref: 'am',
      defaultCity: 'Addis Ababa',
      defaultLat: 9.0305,
      defaultLng: 38.7516,
      profilePhotoUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&q=80',
    },
  });

  const owner2 = await prisma.user.upsert({
    where: { email: 'owner2@trustnear.com' },
    update: { passwordHash, role: 'business_owner' },
    create: {
      email: 'owner2@trustnear.com',
      phone: '+251911334455',
      displayName: 'Tigist Haile',
      passwordHash,
      role: 'business_owner',
      languagePref: 'am',
      defaultCity: 'Addis Ababa',
      defaultLat: 9.0012,
      defaultLng: 38.7845,
      profilePhotoUrl: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=400&q=80',
    },
  });

  const owner3 = await prisma.user.upsert({
    where: { email: 'owner3@trustnear.com' },
    update: { passwordHash, role: 'business_owner' },
    create: {
      email: 'owner3@trustnear.com',
      phone: '+251922334455',
      displayName: 'Dawit Kebede',
      passwordHash,
      role: 'business_owner',
      languagePref: 'am',
      defaultCity: 'Addis Ababa',
      defaultLat: 9.015,
      defaultLng: 38.762,
      profilePhotoUrl: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=400&q=80',
    },
  });

  const user1 = await prisma.user.upsert({
    where: { email: 'user@trustnear.com' },
    update: { passwordHash, role: 'user' },
    create: {
      email: 'user@trustnear.com',
      phone: '+251933112233',
      displayName: 'Mulugeta Tadesse',
      passwordHash,
      role: 'user',
      languagePref: 'am',
      defaultCity: 'Addis Ababa',
      defaultLat: 9.035,
      defaultLng: 38.752,
      profilePhotoUrl: 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=400&q=80',
    },
  });

  const user2 = await prisma.user.upsert({
    where: { email: 'user2@trustnear.com' },
    update: { passwordHash, role: 'user' },
    create: {
      email: 'user2@trustnear.com',
      phone: '+251944223344',
      displayName: 'Meron Worku',
      passwordHash,
      role: 'user',
      languagePref: 'en',
      defaultCity: 'Addis Ababa',
      defaultLat: 8.995,
      defaultLng: 38.771,
      profilePhotoUrl: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=400&q=80',
    },
  });

  const user3 = await prisma.user.upsert({
    where: { email: 'user3@trustnear.com' },
    update: { passwordHash, role: 'user' },
    create: {
      email: 'user3@trustnear.com',
      phone: '+251955334455',
      displayName: 'Yared Berhanu',
      passwordHash,
      role: 'user',
      languagePref: 'om',
      defaultCity: 'Addis Ababa',
      defaultLat: 9.041,
      defaultLng: 38.761,
      profilePhotoUrl: 'https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?w=400&q=80',
    },
  });

  const user4 = await prisma.user.upsert({
    where: { email: 'user4@trustnear.com' },
    update: { passwordHash, role: 'user' },
    create: {
      email: 'user4@trustnear.com',
      phone: '+251966445566',
      displayName: 'Bethlehem Assefa',
      passwordHash,
      role: 'user',
      languagePref: 'am',
      defaultCity: 'Addis Ababa',
      defaultLat: 9.018,
      defaultLng: 38.765,
      profilePhotoUrl: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=400&q=80',
    },
  });

  console.log(`✅ Seeded 9 Users (Admins, Verified Business Owners, and Consumers).`);

  // 3. Seed Businesses (Published, Pending Approval Queue, & Rejected)
  const businesses = [
    // ----------------- PUBLISHED BUSINESSES -----------------
    {
      id: '11111111-1111-4111-a111-111111111111',
      name: 'Tomoca Coffee (Piassa Branch)',
      categoryId: categoryMap['cafe'],
      description: 'The premier Italian-style coffee roaster in Addis Ababa founded in 1953. Famous for rich dark roast macchiato and export-grade coffee beans.',
      landmarkDescription: 'Piassa, opposite Taytu Hotel, 50m from the old General Post Office',
      lat: 9.0305,
      lng: 38.7516,
      phone: '+251911223344',
      status: 'published',
      submittedBy: admin.id,
      ownerId: owner1.id,
      avgRating: 4.9,
      reviewCount: 3,
      googlePlaceId: 'ChIJ_tomoca_piassa_001',
      photos: [
        'https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb?w=800&q=80&fm=webp',
        'https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?w=800&q=80&fm=webp',
      ],
    },
    {
      id: '22222222-2222-4222-a222-222222222222',
      name: 'Kategna Traditional Restaurant (Bole Medhanealem)',
      categoryId: categoryMap['restaurant'],
      description: 'Award-winning authentic Ethiopian restaurant serving traditional Beyaynetu fasting platter, spicy Doro Wot, and Special Kitfo with daily live buna ceremony.',
      landmarkDescription: 'Bole Medhanealem, next to Edna Mall, right across Harmony Hotel',
      lat: 9.0012,
      lng: 38.7845,
      phone: '+251911334455',
      status: 'published',
      submittedBy: admin.id,
      ownerId: owner1.id,
      avgRating: 4.8,
      reviewCount: 4,
      googlePlaceId: 'ChIJ_kategna_bole_002',
      photos: [
        'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=800&q=80&fm=webp',
        'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=800&q=80&fm=webp',
      ],
    },
    {
      id: '33333333-3333-4333-a333-333333333333',
      name: "Kaldi's Coffee (Bole Road Branch)",
      categoryId: categoryMap['cafe'],
      description: 'Popular Ethiopian café lounge providing specialty espresso drinks, iced caramel lattes, fresh pastries, and high-speed fiber internet.',
      landmarkDescription: 'Bole Road, in front of Friendship Business Center, 1st floor',
      lat: 8.9950,
      lng: 38.7712,
      phone: '+251911445566',
      status: 'published',
      submittedBy: admin.id,
      ownerId: owner2.id,
      avgRating: 4.6,
      reviewCount: 2,
      googlePlaceId: 'ChIJ_kaldis_bole_003',
      photos: [
        'https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?w=800&q=80&fm=webp',
      ],
    },
    {
      id: '44444444-4444-4444-a444-444444444444',
      name: 'Yod Abyssinia Cultural Restaurant',
      categoryId: categoryMap['restaurant'],
      description: 'Premier cultural dinner experience in Addis Ababa featuring nightly live ethnic dances, acoustic masenqo and krar music, and royal banquet platters.',
      landmarkDescription: 'Bole Hayahulet, 300 meters behind Millennium Hall',
      lat: 8.9915,
      lng: 38.7890,
      phone: '+251911556677',
      status: 'published',
      submittedBy: admin.id,
      ownerId: owner2.id,
      avgRating: 4.7,
      reviewCount: 2,
      googlePlaceId: 'ChIJ_yod_abyssinia_004',
      photos: [
        'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=800&q=80&fm=webp',
      ],
    },
    {
      id: '55555555-5555-4555-a555-555555555555',
      name: 'Abyssinia Specialty Bakery & Pastry',
      categoryId: categoryMap['cafe'],
      description: 'Freshly baked sourdough, traditional Ethiopian wheat dabo, French croissants, and custom celebration cakes made daily.',
      landmarkDescription: 'Kazanchis, next to Intercontinental Hotel, 2nd building from Total gas station',
      lat: 9.0150,
      lng: 38.7620,
      phone: '+251922334455',
      status: 'published',
      submittedBy: admin.id,
      ownerId: owner3.id,
      avgRating: 4.5,
      reviewCount: 1,
      googlePlaceId: 'ChIJ_abyssinia_bakery_005',
      photos: [
        'https://images.unsplash.com/photo-1509440159596-0249088772ff?w=800&q=80&fm=webp',
      ],
    },
    {
      id: '66666666-6666-4666-a666-666666666666',
      name: 'Bole Atlas Mini Supermarket',
      categoryId: categoryMap['retail'],
      description: 'Full-service grocery store providing freshly grounded Ethiopian spices, dairy products, organic coffee, and imported household goods.',
      landmarkDescription: 'Bole Atlas, near Morning Star Mall, behind the taxi tera',
      lat: 8.9995,
      lng: 38.7780,
      phone: '+251933445566',
      status: 'published',
      submittedBy: admin.id,
      ownerId: owner3.id,
      avgRating: 4.4,
      reviewCount: 1,
      googlePlaceId: 'ChIJ_atlas_supermarket_006',
      photos: [
        'https://images.unsplash.com/photo-1578916171728-46686eac8d58?w=800&q=80&fm=webp',
      ],
    },
    {
      id: '77777777-7777-4777-a777-777777777777',
      name: 'St. Gabriel Community Pharmacy',
      categoryId: categoryMap['pharmacy'] || categoryMap['services'],
      description: '24/7 prescription medications, baby formula, first aid supplies, and licensed pharmacist health consultations.',
      landmarkDescription: 'Sarbet, opposite St. Gabriel General Hospital main entrance gate',
      lat: 9.0020,
      lng: 38.7450,
      phone: '+251944556677',
      status: 'published',
      submittedBy: admin.id,
      ownerId: null,
      avgRating: 4.9,
      reviewCount: 1,
      googlePlaceId: 'ChIJ_st_gabriel_pharm_007',
      photos: [
        'https://images.unsplash.com/photo-1586015555751-63bb77f4322a?w=800&q=80&fm=webp',
      ],
    },
    {
      id: '88888888-8888-4888-a888-888888888888',
      name: 'Totot Traditional Kitfo House',
      categoryId: categoryMap['restaurant'],
      description: 'Legendary Gurage-style traditional Kitfo served in clay pots with Kocho, spiced butter (Niter Kibbeh), Ayib, and Gomen.',
      landmarkDescription: 'Gerji, near Imperial Hotel ring road exit, behind Total station',
      lat: 8.9870,
      lng: 38.8010,
      phone: '+251955667788',
      status: 'published',
      submittedBy: admin.id,
      ownerId: null,
      avgRating: 4.7,
      reviewCount: 1,
      googlePlaceId: 'ChIJ_totot_kitfo_008',
      photos: [
        'https://images.unsplash.com/photo-1544025162-d76694265947?w=800&q=80&fm=webp',
      ],
    },
    {
      id: '99999999-9999-4999-a999-999999999999',
      name: 'Fendika Cultural Center & Tej Bet',
      categoryId: categoryMap['bar'] || categoryMap['restaurant'],
      description: 'Historic cultural sanctuary, art gallery, and traditional Tej house hosting authentic live Azmari music, poetry, and cultural events.',
      landmarkDescription: 'Kazanchis, behind Flamingo Bar, near Zemen Bank headquarters',
      lat: 9.0180,
      lng: 38.7650,
      phone: '+251966778899',
      status: 'published',
      submittedBy: admin.id,
      ownerId: null,
      avgRating: 5.0,
      reviewCount: 2,
      googlePlaceId: 'ChIJ_fendika_kazanchis_009',
      photos: [
        'https://images.unsplash.com/photo-1514933651103-005eec06c04b?w=800&q=80&fm=webp',
      ],
    },

    // ----------------- PENDING BUSINESSES (FOR ADMIN APPROVAL QUEUE) -----------------
    {
      id: 'aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaaa',
      name: 'Addis Auto Diagnostics & Repair Hub',
      categoryId: categoryMap['services'],
      description: 'Computerized engine diagnostics, brake inspection, suspension repair, and original spare parts for Toyota, Hyundai, and Suzuki vehicles.',
      landmarkDescription: 'Mekanisa, near German Square roundabout, beside Commercial Bank of Ethiopia',
      lat: 8.9750,
      lng: 38.7320,
      phone: '+251977889900',
      status: 'pending',
      submittedBy: user1.id,
      ownerId: null,
      avgRating: 0.0,
      reviewCount: 0,
      googlePlaceId: 'ChIJ_mekanisa_auto_010',
      photos: [
        'https://images.unsplash.com/photo-1486006920555-c77dce18193b?w=800&q=80&fm=webp',
      ],
    },
    {
      id: 'bbbbbbbb-bbbb-4bbb-bbbb-bbbbbbbbbbbb',
      name: '4-Kilo Heritage Honey Wine & Tej House',
      categoryId: categoryMap['bar'],
      description: 'Authentic pure organic honey Tej served in traditional round glass Berele with roasted Kollo and spiced appetizers.',
      landmarkDescription: '4 Kilo, directly opposite Addis Ababa University main campus entrance gate',
      lat: 9.0410,
      lng: 38.7610,
      phone: '+251988990011',
      status: 'pending',
      submittedBy: user2.id,
      ownerId: null,
      avgRating: 0.0,
      reviewCount: 0,
      googlePlaceId: 'ChIJ_4kilo_tej_011',
      photos: [
        'https://images.unsplash.com/photo-1510812431401-41d2bd2722f3?w=800&q=80&fm=webp',
      ],
    },
    {
      id: 'eeeeeeee-eeee-4eee-aeee-eeeeeeeeeeee',
      name: 'Entoto View Traditional Eco-Lodge',
      categoryId: categoryMap['hotel'],
      description: 'Serene mountain eco-lodge overlooking Addis Ababa, featuring horseback riding, panoramic city viewpoints, and organic herbal tea.',
      landmarkDescription: 'Entoto Park Mountain Summit, near St. Mary Church gate',
      lat: 9.0820,
      lng: 38.7640,
      phone: '+251911998877',
      status: 'pending',
      submittedBy: user3.id,
      ownerId: null,
      avgRating: 0.0,
      reviewCount: 0,
      googlePlaceId: 'ChIJ_entoto_lodge_012',
      photos: [
        'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=800&q=80&fm=webp',
      ],
    },

    // ----------------- REJECTED BUSINESSES -----------------
    {
      id: 'cccccccc-cccc-4ccc-cccc-cccccccccccc',
      name: 'Mercato Unregistered Bulk Spice Stall',
      categoryId: categoryMap['retail'],
      description: 'Bulk traditional spice trading stall for Berbere and Mitmita.',
      landmarkDescription: 'Mercato, Military Tera (unverified alleyway)',
      lat: 9.0300,
      lng: 38.7380,
      phone: '+251900000001',
      status: 'rejected',
      submittedBy: user3.id,
      ownerId: null,
      avgRating: 0.0,
      reviewCount: 0,
      googlePlaceId: 'ChIJ_mercato_stall_013',
      photos: [
        'https://images.unsplash.com/photo-1596040033229-a9821ebd058d?w=800&q=80&fm=webp',
      ],
    },
    {
      id: 'dddddddd-dddd-4ddd-dddd-dddddddddddd',
      name: 'Gotera Duplicate Mobile Electronics',
      categoryId: categoryMap['retail'],
      description: 'Smartphone accessories and electronic repairs.',
      landmarkDescription: 'Gotera, next to Pepsi Factory gate',
      lat: 8.9800,
      lng: 38.7550,
      phone: '+251900000002',
      status: 'rejected',
      submittedBy: user4.id,
      ownerId: null,
      avgRating: 0.0,
      reviewCount: 0,
      googlePlaceId: 'ChIJ_gotera_elec_014',
      photos: [
        'https://images.unsplash.com/photo-1550009158-9ebf69173e03?w=800&q=80&fm=webp',
      ],
    },
  ];

  for (const b of businesses) {
    const hoursJson = JSON.stringify({
      monday: { open: '08:00', close: '22:00' },
      tuesday: { open: '08:00', close: '22:00' },
      wednesday: { open: '08:00', close: '22:00' },
      thursday: { open: '08:00', close: '22:00' },
      friday: { open: '08:00', close: '23:30' },
      saturday: { open: '08:00', close: '23:30' },
      sunday: { open: '09:00', close: '21:00' },
    });

    await prisma.$executeRawUnsafe(`
      INSERT INTO businesses (
        id, name, category_id, description, landmark_description, location, phone, hours, google_place_id, status, submitted_by, owner_id, avg_rating, review_count, created_at, updated_at
      ) VALUES (
        '${b.id}'::uuid,
        '${b.name.replace(/'/g, "''")}',
        ${b.categoryId},
        '${b.description.replace(/'/g, "''")}',
        '${b.landmarkDescription.replace(/'/g, "''")}',
        ST_SetSRID(ST_MakePoint(${b.lng}, ${b.lat}), 4326)::geography,
        '${b.phone}',
        '${hoursJson}'::jsonb,
        '${b.googlePlaceId}',
        '${b.status}'::"BusinessStatus",
        '${b.submittedBy}'::uuid,
        ${b.ownerId ? `'${b.ownerId}'::uuid` : 'NULL'},
        ${b.avgRating},
        ${b.reviewCount},
        NOW(),
        NOW()
      ) ON CONFLICT (id) DO UPDATE SET
        name = EXCLUDED.name,
        category_id = EXCLUDED.category_id,
        description = EXCLUDED.description,
        landmark_description = EXCLUDED.landmark_description,
        status = EXCLUDED.status,
        phone = EXCLUDED.phone,
        avg_rating = EXCLUDED.avg_rating,
        review_count = EXCLUDED.review_count;
    `);

    // 4. Seed Business Photos
    await prisma.businessPhoto.deleteMany({ where: { businessId: b.id } });
    for (let idx = 0; idx < b.photos.length; idx++) {
      await prisma.businessPhoto.create({
        data: {
          businessId: b.id,
          url: b.photos[idx],
          sortOrder: idx,
        },
      });
    }
  }

  console.log(`✅ Seeded ${businesses.length} Businesses (9 Published, 3 Pending Review Queue, 2 Rejected) with Business Photos.`);

  // 5. Seed Reviews
  const b1Id = '11111111-1111-4111-a111-111111111111'; // Tomoca
  const b2Id = '22222222-2222-4222-a222-222222222222'; // Kategna
  const b3Id = '33333333-3333-4333-a333-333333333333'; // Kaldis
  const b4Id = '44444444-4444-4444-a444-444444444444'; // Yod Abyssinia
  const b9Id = '99999999-9999-4999-a999-999999999999'; // Fendika

  const r1 = await prisma.review.upsert({
    where: { businessId_userId: { businessId: b1Id, userId: user1.id } },
    update: {},
    create: {
      businessId: b1Id,
      userId: user1.id,
      rating: 5,
      comment: 'Best traditional macchiato in Piassa! The coffee aroma and vintage atmosphere are unmatched.',
      isVerified: true,
      ownerReply: 'Ameseginalehu Mulugeta! We look forward to serving you fresh buna again soon.',
      ownerRepliedAt: new Date(),
      sentiment: 'positive',
    },
  });

  const r2 = await prisma.review.upsert({
    where: { businessId_userId: { businessId: b2Id, userId: user2.id } },
    update: {},
    create: {
      businessId: b2Id,
      userId: user2.id,
      rating: 5,
      comment: 'Outstanding Beyaynetu and Doro Wot! The landmark directions made finding the entrance so easy.',
      isVerified: true,
      ownerReply: 'Thank you Meron! We are thrilled you enjoyed the landmark directions and our traditional recipes.',
      ownerRepliedAt: new Date(),
      sentiment: 'positive',
    },
  });

  const r3 = await prisma.review.upsert({
    where: { businessId_userId: { businessId: b3Id, userId: user3.id } },
    update: {},
    create: {
      businessId: b3Id,
      userId: user3.id,
      rating: 4,
      comment: 'Great espresso and super fast WiFi for working. Clean seating area right along Bole Road.',
      isVerified: true,
      sentiment: 'positive',
    },
  });

  const r4 = await prisma.review.upsert({
    where: { businessId_userId: { businessId: b4Id, userId: user4.id } },
    update: {},
    create: {
      businessId: b4Id,
      userId: user4.id,
      rating: 5,
      comment: 'Incredible live tribal dance performances and massive cultural platters. A true gem in Addis!',
      isVerified: true,
      sentiment: 'positive',
    },
  });

  const r5 = await prisma.review.upsert({
    where: { businessId_userId: { businessId: b9Id, userId: user1.id } },
    update: {},
    create: {
      businessId: b9Id,
      userId: user1.id,
      rating: 5,
      comment: 'Unbelievable Ethiopian Jazz music performance on Friday night! Must visit in Kazanchis.',
      isVerified: true,
      sentiment: 'positive',
    },
  });

  // Flagged Review for Pending Moderation
  const rFlagged = await prisma.review.upsert({
    where: { businessId_userId: { businessId: b2Id, userId: user3.id } },
    update: {},
    create: {
      businessId: b2Id,
      userId: user3.id,
      rating: 1,
      comment: 'FAKE PLACE DO NOT GO CHEATERS VISIT WWW.SCAMLINK-ETHIOPIA.COM FOR FREE DISCOUNT COUPON 9999!',
      isVerified: false,
      sentiment: 'negative',
    },
  });

  // Dismissed Report Review
  const rDismissed = await prisma.review.upsert({
    where: { businessId_userId: { businessId: b1Id, userId: user4.id } },
    update: {},
    create: {
      businessId: b1Id,
      userId: user4.id,
      rating: 4,
      comment: 'Coffee was slightly cold on peak morning rush, but the staff replaced it immediately.',
      isVerified: true,
      sentiment: 'neutral',
    },
  });

  // Removed / Soft-deleted Review
  const rRemoved = await prisma.review.upsert({
    where: { businessId_userId: { businessId: b3Id, userId: user4.id } },
    update: {},
    create: {
      businessId: b3Id,
      userId: user4.id,
      rating: 1,
      comment: 'Abusive profane content containing illegal threats and vulgar language.',
      isVerified: false,
      isDeleted: true,
      sentiment: 'negative',
    },
  });

  console.log(`✅ Seeded Customer Reviews (Verified, Owner Replied, and Moderation Cases).`);

  // 6. Seed Review Moderation Reports (`review_reports`)
  await prisma.reviewReport.deleteMany({});
  
  // Pending Flagged Report
  await prisma.reviewReport.create({
    data: {
      reviewId: rFlagged.id,
      reporterId: user1.id,
      reason: ReportReason.spam,
      status: ReportStatus.pending,
      autoFlagged: true,
      autoFlagReason: 'Promotional scam link & duplicate coupon code detected',
    },
  });

  // Dismissed Report
  await prisma.reviewReport.create({
    data: {
      reviewId: rDismissed.id,
      reporterId: user2.id,
      reason: ReportReason.other,
      status: ReportStatus.dismissed,
      autoFlagged: false,
    },
  });

  // Removed Report
  await prisma.reviewReport.create({
    data: {
      reviewId: rRemoved.id,
      reporterId: user1.id,
      reason: ReportReason.abusive,
      status: ReportStatus.removed,
      autoFlagged: true,
      autoFlagReason: 'Profanity & harassment policy violation',
    },
  });

  console.log(`✅ Seeded Review Moderation Reports (Flagged Pending, Dismissed, and Removed).`);

  // 7. Seed Business Claims (`business_claims`)
  await prisma.businessClaim.deleteMany({});
  const b8Id = '88888888-8888-4888-a888-888888888888'; // Totot Kitfo (Unclaimed)
  const b7Id = '77777777-7777-4777-a777-777777777777'; // St. Gabriel Pharmacy (Unclaimed)
  const b9BizId = '99999999-9999-4999-a999-999999999999'; // Fendika

  // 1. Pending Claim (Needs Admin Approval)
  await prisma.businessClaim.create({
    data: {
      businessId: b8Id,
      claimantId: owner2.id,
      verificationInfo: {
        businessLicenseNumber: 'BL-ADDIS-2024-9988',
        tinNumber: 'TIN-9081726354',
        contactPhone: '+251955667788',
        documentUrl: 'https://images.unsplash.com/photo-1568992687947-868a62a9f521?w=800&q=80',
        businessRole: 'General Manager / Co-Founder',
      },
      status: ClaimStatus.pending,
    },
  });

  // 2. Pending Claim 2 (Needs Admin Approval)
  await prisma.businessClaim.create({
    data: {
      businessId: b9BizId,
      claimantId: owner3.id,
      verificationInfo: {
        businessLicenseNumber: 'BL-KAZANCHIS-2023-4411',
        tinNumber: 'TIN-4455667788',
        contactPhone: '+251966778899',
        documentUrl: 'https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?w=800&q=80',
        businessRole: 'Managing Director',
      },
      status: ClaimStatus.pending,
    },
  });

  // 3. Approved Claim
  await prisma.businessClaim.create({
    data: {
      businessId: b2Id,
      claimantId: owner1.id,
      verificationInfo: {
        businessLicenseNumber: 'BL-BOLE-2023-1122',
        tinNumber: 'TIN-1122334455',
        contactPhone: '+251911334455',
        documentUrl: 'https://images.unsplash.com/photo-1450133064473-71024230f91b?w=800&q=80',
      },
      status: ClaimStatus.approved,
      reviewedBy: admin.id,
      reviewedAt: new Date(),
    },
  });

  // 4. Rejected Claim
  await prisma.businessClaim.create({
    data: {
      businessId: b7Id,
      claimantId: user3.id,
      verificationInfo: {
        businessLicenseNumber: 'BL-INVALID-0000',
        tinNumber: 'TIN-00000000',
        contactPhone: '+251900000000',
      },
      status: ClaimStatus.rejected,
      reviewedBy: secondaryAdmin.id,
      reviewedAt: new Date(),
      rejectionReason: 'Business registration TIN and Trade Ministry license number could not be authenticated.',
    },
  });

  console.log(`✅ Seeded Business Claims (2 Pending Review Queue, 1 Approved, 1 Rejected).`);

  // 8. Seed Favorites (`favorites`)
  await prisma.favorite.deleteMany({});
  await prisma.favorite.createMany({
    data: [
      { userId: user1.id, businessId: b1Id },
      { userId: user1.id, businessId: b2Id },
      { userId: user2.id, businessId: b2Id },
      { userId: user2.id, businessId: b3Id },
      { userId: user3.id, businessId: b4Id },
      { userId: user4.id, businessId: b9Id },
    ],
  });
  console.log(`✅ Seeded User Favorites.`);

  // 9. Seed Connections (`connections`)
  await prisma.connection.deleteMany({});
  await prisma.connection.createMany({
    data: [
      { requesterId: user1.id, addresseeId: user2.id, status: ConnectionStatus.accepted, respondedAt: new Date() },
      { requesterId: user1.id, addresseeId: user3.id, status: ConnectionStatus.accepted, respondedAt: new Date() },
      { requesterId: user2.id, addresseeId: user4.id, status: ConnectionStatus.pending },
    ],
  });
  console.log(`✅ Seeded User Connections.`);

  // 10. Seed Promotions (`promotions`)
  await prisma.promotion.deleteMany({});
  const now = new Date();
  const nextMonth = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
  const pastMonth = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

  await prisma.promotion.createMany({
    data: [
      {
        businessId: b2Id,
        purchasedBy: owner1.id,
        title: '20% Off Weekend Traditional Family Feast',
        description: 'Enjoy a 20% discount on all Beyaynetu and Special Kitfo platters every Saturday & Sunday.',
        startDate: now,
        endDate: nextMonth,
        status: PromotionStatus.active,
      },
      {
        businessId: b1Id,
        purchasedBy: owner1.id,
        title: 'Free Macchiato with Coffee Bean Purchase',
        description: 'Get a complimentary freshly brewed macchiato when purchasing 1kg of roasted export beans.',
        startDate: now,
        endDate: nextMonth,
        status: PromotionStatus.active,
      },
      {
        businessId: b3Id,
        purchasedBy: owner2.id,
        title: 'Holiday Morning Pastry Combo Deal',
        description: 'Buy any large cappuccino and get a fresh butter croissant at 50% discount.',
        startDate: pastMonth,
        endDate: now,
        status: PromotionStatus.expired,
      },
    ],
  });
  console.log(`✅ Seeded Business Promotions.`);

  // 11. Seed Notifications (`notifications`)
  await prisma.notification.deleteMany({});
  await prisma.notification.createMany({
    data: [
      {
        userId: owner1.id,
        type: NotificationType.claim_approved,
        payload: {
          businessName: 'Kategna Traditional Restaurant',
          businessId: b2Id,
          approvedAt: now.toISOString(),
        },
        isRead: false,
      },
      {
        userId: owner1.id,
        type: NotificationType.review_reply,
        payload: {
          businessName: 'Tomoca Coffee (Piassa Branch)',
          replyText: 'A new 5-star review was submitted by Mulugeta Tadesse!',
          businessId: b1Id,
        },
        isRead: false,
      },
      {
        userId: owner1.id,
        type: NotificationType.review_reply,
        payload: {
          businessName: 'Kategna Traditional Restaurant',
          replyText: 'Meron Worku rated your restaurant 5 stars: "Outstanding Beyaynetu and Doro Wot!"',
          businessId: b2Id,
        },
        isRead: true,
      },
      {
        userId: owner2.id,
        type: NotificationType.claim_approved,
        payload: {
          businessName: "Kaldi's Coffee (Bole Road)",
          businessId: b3Id,
        },
        isRead: false,
      },
      {
        userId: owner3.id,
        type: NotificationType.review_reply,
        payload: {
          businessName: 'Abyssinia Specialty Bakery & Pastry',
          replyText: 'New 5-star customer review received.',
          businessId: '55555555-5555-4555-a555-555555555555',
        },
        isRead: false,
      },
      {
        userId: user1.id,
        type: NotificationType.review_reply,
        payload: {
          businessName: 'Tomoca Coffee (Piassa Branch)',
          replyText: 'Ameseginalehu Mulugeta! We look forward to serving you fresh buna again soon.',
          businessId: b1Id,
        },
        isRead: false,
      },
      {
        userId: user3.id,
        type: NotificationType.claim_rejected,
        payload: {
          businessName: 'St. Gabriel Community Pharmacy',
          rejectionReason: 'Business registration TIN could not be verified.',
        },
        isRead: false,
      },
    ],
  });
  console.log(`✅ Seeded System Notifications.`);

  // 12. Seed Admin Audit Actions (`admin_actions`)
  await prisma.adminAction.deleteMany({});
  await prisma.adminAction.createMany({
    data: [
      {
        adminId: admin.id,
        targetType: AdminTargetType.business,
        targetId: b1Id,
        action: AdminActionType.approve,
        reason: 'Verified landmark location and business registration details',
      },
      {
        adminId: admin.id,
        targetType: AdminTargetType.claim,
        targetId: b2Id,
        action: AdminActionType.approve,
        reason: 'Trade license TIN matched official registry',
      },
      {
        adminId: secondaryAdmin.id,
        targetType: AdminTargetType.review,
        targetId: rRemoved.id,
        action: AdminActionType.remove,
        reason: 'Removed due to vulgarity and community policy violations',
      },
    ],
  });
  console.log(`✅ Seeded Admin Audit Action Logs.`);

  // 13. Seed User Activities (`user_activities`)
  await prisma.userActivity.deleteMany({});
  await prisma.userActivity.createMany({
    data: [
      {
        userId: user1.id,
        businessId: b1Id,
        activityType: ActivityType.review_submitted,
        title: 'Reviewed Tomoca Coffee',
        subtitle: 'Rated 5 stars in Piassa',
      },
      {
        userId: user2.id,
        businessId: b2Id,
        activityType: ActivityType.place_visited,
        title: 'Visited Kategna Restaurant',
        subtitle: 'Checked in at Bole Medhanealem',
      },
      {
        userId: user1.id,
        businessId: b2Id,
        activityType: ActivityType.place_saved,
        title: 'Saved to Favorites',
        subtitle: 'Bookmarked Kategna Traditional Restaurant',
      },
    ],
  });
  console.log(`✅ Seeded User Activities.`);

  // 14. Seed Support Tickets (`support_tickets`)
  await prisma.supportTicket.deleteMany({});
  await prisma.supportTicket.createMany({
    data: [
      {
        userId: user1.id,
        subject: 'Inquiry about landmark update in Piassa',
        message: 'Could you update the landmark near Taytu Hotel as the old road construction has completed?',
        status: TicketStatus.pending,
      },
      {
        userId: owner2.id,
        subject: 'Business Claim Verification Follow-up',
        message: 'I have submitted my updated TIN license document for Totot Kitfo House.',
        status: TicketStatus.in_review,
      },
      {
        userId: user2.id,
        subject: 'Feedback on offline map navigation',
        message: 'The offline landmark directions for Bole Atlas worked flawlessly during internet disruption.',
        status: TicketStatus.resolved,
      },
    ],
  });
  console.log(`✅ Seeded Customer Support Tickets.`);

  console.log('\n================================================================');
  console.log('🎉 Full Ethiopian Database Seeding Completed Successfully Across All Tables!');
  console.log('================================================================');
  console.log('\n📋 Seed Login Credentials (Password for all accounts: Password123!):');
  console.log('   👨‍💼 Super Admin:            admin@trustnear.com');
  console.log('   👩‍💼 Moderation Admin:       admin2@trustnear.com');
  console.log('   🏪 Owner (Piassa & Bole):  owner@trustnear.com     (Abebe Bikila)');
  console.log('   🏪 Owner (Bole Road):      owner2@trustnear.com    (Tigist Haile)');
  console.log('   🏪 Owner (Kazanchis):      owner3@trustnear.com    (Dawit Kebede)');
  console.log('   👤 User 1 (Piassa):        user@trustnear.com      (Mulugeta Tadesse)');
  console.log('   👤 User 2 (Bole):          user2@trustnear.com     (Meron Worku)');
  console.log('   👤 User 3 (4 Kilo):        user3@trustnear.com     (Yared Berhanu)');
  console.log('   👤 User 4 (Kazanchis):     user4@trustnear.com     (Bethlehem Assefa)');
  console.log('================================================================\n');
}

main()
  .catch((e) => {
    console.error('❌ Error seeding database:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

