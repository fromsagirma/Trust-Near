import apiClient from './client'

// TN-020 — User & System Notifications
export async function getNotifications(params = {}) {
  try {
    const res = await apiClient.get('/notifications')
    return res.data?.data || res.data || []
  } catch (err) {
    return []
  }
}

export async function getUnreadNotificationCount() {
  try {
    const res = await apiClient.get('/notifications/unread-count')
    return res.data?.unreadCount || res.unreadCount || 0
  } catch {
    return 0
  }
}

export async function markNotificationAsRead(id) {
  try {
    const res = await apiClient.patch(`/notifications/${id}/read`)
    return res.data || res
  } catch {
    return null
  }
}

export async function markAllNotificationsAsRead() {
  try {
    const res = await apiClient.patch('/notifications/read-all')
    return res.data || res
  } catch {
    return null
  }
}

// Aggregated Admin Governance Alerts
export async function getAdminAlerts() {
  try {
    const [listingsRes, modRes, claimsRes] = await Promise.allSettled([
      apiClient.get('/admin/businesses/pending'),
      apiClient.get('/admin/moderation/queue'),
      apiClient.get('/admin/claims/pending'),
    ])

    const pendingListings = listingsRes.status === 'fulfilled' ? (listingsRes.value.data?.businesses || listingsRes.value.data || []) : []
    const pendingReports = modRes.status === 'fulfilled' ? (modRes.value.data?.reports || modRes.value.data || []) : []
    const pendingClaims = claimsRes.status === 'fulfilled' ? (claimsRes.value.data?.claims || claimsRes.value.data || []) : []

    const alerts = []

    if (pendingListings.length > 0) {
      alerts.push({
        id: 'alert-approvals',
        title: `${pendingListings.length} Business Submission(s)`,
        desc: 'New listings awaiting publication review',
        link: '/admin/approvals',
        type: 'approval',
        count: pendingListings.length,
      })
    }

    if (pendingReports.length > 0) {
      alerts.push({
        id: 'alert-moderation',
        title: `${pendingReports.length} Content Moderation Flag(s)`,
        desc: 'User-reported reviews requiring inspection',
        link: '/admin/moderation',
        type: 'moderation',
        count: pendingReports.length,
      })
    }

    if (pendingClaims.length > 0) {
      alerts.push({
        id: 'alert-claims',
        title: `${pendingClaims.length} Ownership Claim(s)`,
        desc: 'Business ownership verification requests',
        link: '/admin/claims',
        type: 'claim',
        count: pendingClaims.length,
      })
    }

    return {
      alerts,
      totalAlerts: pendingListings.length + pendingReports.length + pendingClaims.length,
    }
  } catch (err) {
    return { alerts: [], totalAlerts: 0 }
  }
}
