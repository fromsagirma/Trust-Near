import apiClient from './client'

// TN-022 — Admin: Business Listing Approval
// GET /api/admin/businesses?status=all|pending|approved|rejected
export async function getPendingListings(status = 'all') {
  try {
    const endpoint = status === 'all'
      ? '/admin/businesses?status=all'
      : `/admin/businesses/${status}`

    const res = await apiClient.get(endpoint)
    const businesses = res.data?.businesses || res.data || res.businesses || []
    return businesses.map((b) => ({
      id: b.id,
      name: b.name,
      categoryId: b.categoryId || b.category_id || (typeof b.category === 'object' ? b.category?.id : null),
      category: typeof b.category === 'object' ? (b.category?.name || 'General') : (b.category || 'General'),
      landmarkDescription: b.landmarkDescription || b.landmark_description || 'No landmark specified',
      submittedBy: b.submittedBy || b.submitted_by || 'User',
      status: (b.status === 'published' || b.status === 'approved') ? 'approved' : (b.status || 'pending'),
      rejectionReason: b.rejectionReason || null,
      createdAt: b.createdAt || b.created_at,
    }))
  } catch (err) {
    console.error('Failed to fetch live businesses from backend:', err.message)
    return []
  }
}

// Full Platform Directory Registry
// Aggregates admin queue and platform directory to display all listings
export async function getAllBusinesses(params = {}) {
  try {
    const query = new URLSearchParams()
    if (params.status && params.status !== 'all') query.append('status', params.status)
    if (params.category && params.category !== 'all') query.append('category', params.category)
    if (params.search) query.append('search', params.search)
    query.append('page', params.page || 1)
    query.append('pageSize', params.pageSize || 100)

    const queryString = query.toString() ? `?${query.toString()}` : '?status=all'
    const [adminRes, publicRes] = await Promise.allSettled([
      apiClient.get(`/admin/businesses${queryString}`),
      apiClient.get('/businesses/nearby?lat=9.03&lng=38.74&radius=50000&pageSize=50'),
    ])

    const adminList = adminRes.status === 'fulfilled' ? (adminRes.value.data?.businesses || adminRes.value.data || []) : []
    const publicList = publicRes.status === 'fulfilled' ? (publicRes.value.data?.data || publicRes.value.data || []) : []

    const map = new Map()
    for (const b of adminList) {
      if (b && b.id) {
        const catId = b.categoryId || b.category_id || (typeof b.category === 'object' ? b.category?.id : null)
        map.set(b.id, {
          id: b.id,
          name: b.name,
          categoryId: catId,
          category: typeof b.category === 'object' ? (b.category?.name || 'General') : (b.category || 'General'),
          landmarkDescription: b.landmarkDescription || b.landmark_description || 'No landmark specified',
          phone: b.phone || 'No phone listed',
          avgRating: b.avgRating || b.avg_rating || 5.0,
          reviewCount: b.reviewCount || b.review_count || 0,
          submittedBy: b.submittedBy || b.submitted_by || 'Community Member',
          ownerId: b.ownerId || b.owner_id || null,
          isClaimed: Boolean(b.ownerId || b.owner_id),
          status: (b.status === 'approved' || b.status === 'published') ? 'published' : (b.status || 'published'),
          rejectionReason: b.rejectionReason || null,
          createdAt: b.createdAt || b.created_at,
        })
      }
    }

    for (const b of publicList) {
      if (b && b.id && !map.has(b.id)) {
        const catId = b.categoryId || b.category_id || (typeof b.category === 'object' ? b.category?.id : null)
        map.set(b.id, {
          id: b.id,
          name: b.name,
          categoryId: catId,
          category: typeof b.category === 'object' ? (b.category?.name || 'General') : (b.category || 'General'),
          landmarkDescription: b.landmarkDescription || b.landmark_description || 'No landmark specified',
          phone: b.phone || 'No phone listed',
          avgRating: b.avgRating || b.avg_rating || 5.0,
          reviewCount: b.reviewCount || b.review_count || 0,
          submittedBy: b.submittedBy || b.submitted_by || 'Community Member',
          ownerId: b.ownerId || b.owner_id || null,
          isClaimed: Boolean(b.ownerId || b.owner_id),
          status: 'published',
          rejectionReason: null,
          createdAt: b.createdAt || b.created_at,
        })
      }
    }

    return Array.from(map.values())
  } catch (err) {
    console.error('Failed to fetch businesses registry:', err.message)
    return []
  }
}

// PATCH /api/admin/businesses/:id/approve
export async function approveListing(listingId) {
  const res = await apiClient.patch(`/admin/businesses/${listingId}/approve`)
  return res.data || res
}

// PATCH /api/admin/businesses/:id/reject
export async function rejectListing(listingId, reason) {
  const res = await apiClient.patch(`/admin/businesses/${listingId}/reject`, { reason })
  return res.data || res
}

// Seeding fast-path (TN-006 / UC-006): listings created by seed_admin auto-publish
export async function createSeedListing(listingPayload) {
  const res = await apiClient.post('/businesses', listingPayload)
  return res.data || res
}
