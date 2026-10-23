import apiClient from './client'

// TN-021 — Admin: Content Moderation & Soft-Delete Workflow
// GET /api/admin/moderation?status=all|pending|dismissed|removed
export async function getFlaggedItems(status = 'all') {
  try {
    const endpoint = status === 'all'
      ? '/admin/moderation?status=all'
      : `/admin/moderation/${status}`

    const res = await apiClient.get(endpoint)
    const reports = res.data?.reports || res.data || []
    return reports.map((r) => ({
      id: r.id,
      contentType: r.reviewId ? 'Review' : 'Content',
      status: r.status === 'pending' ? 'flagged' : (r.status || 'flagged'),
      businessName: r.review?.business?.name || 'Reported Business',
      excerpt: r.review?.comment || r.reason || 'Flagged content excerpt',
      reportCount: 1,
      reviewerName: r.review?.user?.displayName || 'User',
      rating: r.review?.rating || null,
      isVerifiedVisit: r.review?.isVerified || false,
      reportReasons: [r.reason || 'Flagged for review'],
      reportedAt: r.createdAt,
      softDeleteReason: r.reason || 'Soft-deleted by Admin',
      removedBy: 'Admin',
      removedAt: r.updatedAt || r.createdAt,
    }))
  } catch (err) {
    console.error('Failed to fetch live moderation reports from backend:', err.message)
    return []
  }
}

// PATCH /api/admin/moderation/:reportId/dismiss
export async function dismissFlag(itemId) {
  const res = await apiClient.patch(`/admin/moderation/${itemId}/dismiss`)
  return res.data || res
}

// PATCH /api/admin/moderation/:reportId/remove
export async function removeContent(itemId, reason) {
  const res = await apiClient.patch(`/admin/moderation/${itemId}/remove`, { reason })
  return res.data || res
}

// PATCH /api/admin/moderation/:reportId/restore
export async function restoreContent(itemId) {
  const res = await apiClient.patch(`/admin/moderation/${itemId}/restore`)
  return res.data || res
}
