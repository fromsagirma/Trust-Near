// TrustNear Mock Storage & Simulated Backend Database
// Covers all core use cases: UC-006 (Seeding), UC-011 (Claims), UC-021 (Moderation), UC-022 (Approvals), UC-025 (Analytics)

const INITIAL_LISTINGS = [
  {
    id: 'l1',
    name: 'Yod Abyssinia Cultural Restaurant',
    category: 'Restaurants',
    landmarkDescription: 'Bole sub-city, behind the yellow Total Energies station, 50m off the main ring road',
    submittedBy: 'owner_kal (Kal Kassa)',
    status: 'pending',
    createdAt: '2026-08-14T10:30:00Z',
    phone: '+251 91 122 3344',
  },
  {
    id: 'l2',
    name: "Kaldi's Corner Cafe",
    category: 'Cafes & Pastry',
    landmarkDescription: 'Directly across from Edna Mall cinema entrance, beside the blue iron gate',
    submittedBy: 'user_selam (Selamawit B.)',
    status: 'pending',
    createdAt: '2026-08-15T08:15:00Z',
    phone: '+251 91 234 5678',
  },
  {
    id: 'l3',
    name: 'Sheger Traditional Guesthouse',
    category: 'Hotels & Guesthouses',
    landmarkDescription: 'Behind St. Gabriel Hospital, right turn after the red grocery kiosk',
    submittedBy: 'user_natnael (Natnael T.)',
    status: 'pending',
    createdAt: '2026-08-15T14:40:00Z',
    phone: '+251 91 345 6789',
  },
  {
    id: 'l4',
    name: 'Kazanchis ICT & Smartphone Repair',
    category: 'Electronics & Gadgets',
    landmarkDescription: 'Kazanchis commercial corridor, next to Intercontinental Hotel, 2nd floor Room 204',
    submittedBy: 'owner_yared (Yared M.)',
    status: 'pending',
    createdAt: '2026-08-16T09:20:00Z',
    phone: '+251 91 456 7890',
  },
  {
    id: 'l5',
    name: 'Bole Medhanealem Pastry & Bakery',
    category: 'Cafes & Pastry',
    landmarkDescription: 'Behind Medhanealem Cathedral mall, beside Lion International Bank branch',
    submittedBy: 'owner_meron (Meron Haile)',
    status: 'approved',
    createdAt: '2026-08-10T11:00:00Z',
    approvedBy: 'Admin Fira',
    approvedAt: '2026-08-11T09:10:00Z',
  },
  {
    id: 'l6',
    name: 'Unverified Electronics Wholesaler',
    category: 'Electronics & Gadgets',
    landmarkDescription: 'Around Merkato general market, somewhere near Military Tera',
    submittedBy: 'anon_user_99',
    status: 'rejected',
    createdAt: '2026-08-12T16:00:00Z',
    rejectionReason: 'Landmark address is too vague without landmark photos or verified street intersection.',
    rejectedBy: 'Admin Fira',
    rejectedAt: '2026-08-13T10:00:00Z',
  },
]

const INITIAL_MODERATION = [
  {
    id: 'f1',
    contentType: 'Review',
    status: 'flagged',
    businessName: 'Lucy Lounge & Restaurant',
    excerpt: '"This place is a complete scam, they charged double and staff were aggressive! Never step foot here!!!" (Identical review text submitted 6 times within 10 minutes across 3 different accounts)',
    reportCount: 4,
    reviewerName: 'user_dawit92',
    rating: 1,
    isVerifiedVisit: true,
    reportReasons: ['Spam / Repeated Text', 'Suspicious Rating Attack', 'Competitor Sabotage'],
    reportedAt: '2026-08-15T18:30:00Z',
  },
  {
    id: 'f2',
    contentType: 'Image',
    status: 'flagged',
    businessName: 'Zebib Traditional Restaurant',
    excerpt: 'Uploaded business storefront image appears to be an unrelated electronics billboard and lacks physical landmark signage.',
    reportCount: 2,
    reviewerName: 'consumer_tigist',
    rating: null,
    isVerifiedVisit: false,
    reportReasons: ['Mismatched Category / Irrelevant Media'],
    reportedAt: '2026-08-15T21:10:00Z',
  },
  {
    id: 'f3',
    contentType: 'Duplicate Listing',
    status: 'flagged',
    businessName: 'Millennium Cafe & Restaurant',
    excerpt: 'Listing submission matches the exact GPS coordinates and landmark description of an already-verified listing (#l2).',
    reportCount: 3,
    reviewerName: 'system_heuristic_bot',
    rating: null,
    isVerifiedVisit: false,
    reportReasons: ['Duplicate Listing Submission', 'Location Conflict'],
    reportedAt: '2026-08-16T07:45:00Z',
  },
  {
    id: 'f4',
    contentType: 'Review',
    excerpt: '"The food arrived 15 minutes late during Friday peak rush, but overall the tibs was flavorful."',
    reportCount: 1,
    businessName: 'Habesha Traditional Kitchen',
    reviewerName: 'user_tadesse',
    rating: 3,
    isVerifiedVisit: true,
    reportReasons: ['Unsubstantiated claim'],
    status: 'dismissed',
    dismissedBy: 'Admin Fira',
    dismissedAt: '2026-08-15T11:20:00Z',
  },
  {
    id: 'f5',
    contentType: 'Review',
    excerpt: '"[Profanity and abusive derogatory language directed at restaurant manager]"',
    reportCount: 7,
    businessName: 'Abyssinia Club & Grill',
    reviewerName: 'spammer_bot_88',
    rating: 1,
    isVerifiedVisit: false,
    reportReasons: ['Abusive / Harassing Language', 'Profanity Violation'],
    status: 'removed',
    removedBy: 'Admin Fira',
    removedAt: '2026-08-14T15:00:00Z',
    softDeleteReason: 'Violation of Community Guideline Section 4.2 (Abusive Language Policy).',
  },
]

const INITIAL_CLAIMS = [
  {
    id: 'c1',
    businessId: 'l1',
    businessName: 'Yod Abyssinia Cultural Restaurant',
    claimantName: 'Kal Kassa',
    claimantPhone: '+251 91 122 3344',
    claimantEmail: 'kal@abyssiniacuisine.com',
    userName: 'owner_kal',
    registrationNumber: 'TIN-ET-98234710',
    notes: 'I am the managing partner of Yod Abyssinia. Attached is our City Administration Trade & Industry Bureau license.',
    proofUrl: 'https://images.unsplash.com/photo-1554469384-e58fac16e23a?auto=format&fit=crop&w=600&q=80',
    status: 'pending',
    submittedAt: '2026-08-15T12:00:00Z',
  },
  {
    id: 'c2',
    businessId: 'l4',
    businessName: 'Kazanchis ICT & Smartphone Repair',
    claimantName: 'Yared Mengistu',
    claimantPhone: '+251 91 456 7890',
    claimantEmail: 'yared.ict@gmail.com',
    userName: 'owner_yared',
    registrationNumber: 'TIN-ET-66442299',
    notes: 'Official shop lease agreement and business registration license copy attached.',
    proofUrl: 'https://images.unsplash.com/photo-1554469384-e58fac16e23a?auto=format&fit=crop&w=600&q=80',
    status: 'pending',
    submittedAt: '2026-08-16T10:15:00Z',
  },
  {
    id: 'c3',
    businessId: 'l3',
    businessName: 'Sheger Traditional Guesthouse',
    claimantName: 'Natnael Tesfaye',
    claimantPhone: '+251 91 345 6789',
    claimantEmail: 'natnael.t@outlook.com',
    userName: 'user_natnael',
    registrationNumber: 'TIN-ET-44332211',
    proofUrl: 'https://images.unsplash.com/photo-1554469384-e58fac16e23a?auto=format&fit=crop&w=600&q=80',
    status: 'approved',
    submittedAt: '2026-08-12T14:30:00Z',
    reviewedBy: 'Admin Fira',
    reviewedAt: '2026-08-13T09:00:00Z',
  },
  {
    id: 'c4',
    businessId: 'l5',
    businessName: 'Bole Medhanealem Pastry & Bakery',
    claimantName: 'Meron Haile',
    claimantPhone: '+251 91 155 6677',
    claimantEmail: 'meron.pastry@gmail.com',
    userName: 'owner_meron',
    registrationNumber: 'TIN-ET-11223344',
    proofUrl: 'https://images.unsplash.com/photo-1554469384-e58fac16e23a?auto=format&fit=crop&w=600&q=80',
    status: 'rejected',
    rejectionReason: 'Attached business license document expired in December 2025. Please provide renewed 2026 certification.',
    submittedAt: '2026-08-11T16:00:00Z',
    reviewedBy: 'Admin Fira',
    reviewedAt: '2026-08-12T11:30:00Z',
  },
]

const INITIAL_USERS = [
  {
    id: 'u1',
    displayName: 'Fira (Lead Admin)',
    email: 'fira@trustnear.et',
    role: 'seed_admin',
    status: 'active',
    createdAt: '2026-01-10T08:00:00Z',
    listingsCreated: 42,
    reviewsCount: 15,
  },
  {
    id: 'u2',
    displayName: 'Kal Kassa',
    email: 'kal@abyssiniacuisine.com',
    role: 'business_owner',
    status: 'active',
    createdAt: '2026-02-14T10:30:00Z',
    listingsCreated: 2,
    reviewsCount: 8,
  },
  {
    id: 'u3',
    displayName: 'Selamawit Bekele',
    email: 'selam.b@gmail.com',
    role: 'consumer',
    status: 'active',
    createdAt: '2026-03-01T15:00:00Z',
    listingsCreated: 1,
    reviewsCount: 34,
  },
  {
    id: 'u4',
    displayName: 'Natnael Tesfaye',
    email: 'natnael.t@outlook.com',
    role: 'consumer',
    status: 'active',
    createdAt: '2026-03-12T11:45:00Z',
    listingsCreated: 1,
    reviewsCount: 19,
  },
  {
    id: 'u5',
    displayName: 'Meron Haile',
    email: 'meron.pastry@gmail.com',
    role: 'business_owner',
    status: 'active',
    createdAt: '2026-04-05T09:20:00Z',
    listingsCreated: 1,
    reviewsCount: 12,
  },
  {
    id: 'u6',
    displayName: 'Yared Mengistu',
    email: 'yared.ict@gmail.com',
    role: 'business_owner',
    status: 'active',
    createdAt: '2026-05-18T14:10:00Z',
    listingsCreated: 1,
    reviewsCount: 5,
  },
  {
    id: 'u7',
    displayName: 'Toxic Spammer Account',
    email: 'fake_bot_882@tempmail.com',
    role: 'consumer',
    status: 'banned',
    banReason: 'System Heuristic Trigger: 8 duplicate abusive 1-star reviews posted in under 3 minutes.',
    bannedBy: 'Admin Fira',
    createdAt: '2026-06-20T16:00:00Z',
    listingsCreated: 0,
    reviewsCount: 8,
  },
]

const INITIAL_CATEGORIES = [
  { id: 'cat-1', name: 'Restaurants', slug: 'restaurants', description: 'Traditional Ethiopian cultural food, modern dining, and family eateries', count: 124, isActive: true },
  { id: 'cat-2', name: 'Cafes & Pastry', slug: 'cafes', description: 'Buna coffee ceremonies, modern espresso cafes, pastries, and bakeries', count: 86, isActive: true },
  { id: 'cat-3', name: 'Hotels & Guesthouses', slug: 'hotels', description: 'Accommodations, tourist lodges, and budget guesthouses', count: 45, isActive: true },
  { id: 'cat-4', name: 'Electronics & Gadgets', slug: 'electronics', description: 'Smartphone retailers, computer hardware, and repair services', count: 62, isActive: true },
  { id: 'cat-5', name: 'Fashion & Boutiques', slug: 'fashion', description: 'Habesha kemis, leather goods, contemporary fashion, and footwear', count: 39, isActive: true },
  { id: 'cat-6', name: 'Automotive & Repair', slug: 'automotive', description: 'Mechanic workshops, auto parts, tire service, and car washes', count: 28, isActive: true },
  { id: 'cat-7', name: 'Healthcare & Pharmacies', slug: 'healthcare', description: 'Medical clinics, diagnostic laboratories, and local pharmacies', count: 33, isActive: true },
]

const INITIAL_ANALYTICS = {
  monthlyGrowth: '+14.2%',
  verifiedVisitRate: '94.8%',
  avgRating: '4.65',
  turnaroundTime: '1.8 hrs',
  totalUsers: '1,248',
  publishedListings: '342',
  communityReviews: '2,890',
  categoryStats: [
    { name: 'Restaurants', percent: 36, count: 124 },
    { name: 'Cafes & Pastry', percent: 25, count: 86 },
    { name: 'Electronics & Gadgets', percent: 18, count: 62 },
    { name: 'Hotels & Guesthouses', percent: 13, count: 45 },
    { name: 'Fashion & Boutiques', percent: 8, count: 28 },
  ],
  topBusinesses: [
    { id: 'b1', name: 'Yod Abyssinia Cultural Restaurant', category: 'Restaurants', landmark: 'Bole, near yellow Total station', rating: 4.8, reviewCount: 142, isOwnerVerified: true },
    { id: 'b2', name: 'Bole Medhanealem Pastry & Bakery', category: 'Cafes & Pastry', landmark: 'Behind Medhanealem Cathedral mall', rating: 4.7, reviewCount: 98, isOwnerVerified: true },
    { id: 'b3', name: "Kaldi's Corner Cafe", category: 'Cafes & Pastry', landmark: 'Across from Edna Mall cinema entrance', rating: 4.6, reviewCount: 186, isOwnerVerified: false },
    { id: 'b4', name: 'Sheger Traditional Guesthouse', category: 'Hotels & Guesthouses', landmark: 'Behind St. Gabriel Hospital', rating: 4.5, reviewCount: 54, isOwnerVerified: true },
  ]
}

function getStored(key, fallback) {
  try {
    const item = localStorage.getItem(key)
    if (!item) {
      localStorage.setItem(key, JSON.stringify(fallback))
      return fallback
    }
    return JSON.parse(item)
  } catch {
    return fallback
  }
}

function setStored(key, data) {
  try {
    localStorage.setItem(key, JSON.stringify(data))
  } catch (err) {
    console.error('Storage error:', err)
  }
}

export const mockDb = {
  getListings: () => getStored('tn_admin_listings', INITIAL_LISTINGS),
  saveListings: (data) => setStored('tn_admin_listings', data),

  getModeration: () => getStored('tn_admin_moderation', INITIAL_MODERATION),
  saveModeration: (data) => setStored('tn_admin_moderation', data),

  getClaims: () => getStored('tn_admin_claims', INITIAL_CLAIMS),
  saveClaims: (data) => setStored('tn_admin_claims', data),

  getUsers: () => getStored('tn_admin_users', INITIAL_USERS),
  saveUsers: (data) => setStored('tn_admin_users', data),

  getCategories: () => getStored('tn_admin_categories', INITIAL_CATEGORIES),
  saveCategories: (data) => setStored('tn_admin_categories', data),

  getAnalytics: () => getStored('tn_admin_analytics', INITIAL_ANALYTICS),
}
