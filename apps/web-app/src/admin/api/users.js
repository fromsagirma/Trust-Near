import apiClient from './client'

// TN-002 / TN-010 — Admin: User Governance & Account Safety
// GET /api/admin/users
export async function getUsers(params = {}) {
  try {
    const query = new URLSearchParams()
    if (params.search) query.append('search', params.search)
    if (params.role && params.role !== 'all') query.append('role', params.role)
    if (params.status && params.status !== 'all') query.append('status', params.status)
    query.append('page', params.page || 1)
    query.append('pageSize', params.pageSize || 100)

    const queryString = query.toString() ? `?${query.toString()}` : ''
    const res = await apiClient.get(`/admin/users${queryString}`)
    const users = res.data?.users || res.data || []
    return Array.isArray(users) ? users : []
  } catch (err) {
    console.error('Failed to fetch live users from backend:', err.message)
    return []
  }
}

// PATCH /api/admin/users/:id/role
export async function updateUserRole(userId, role) {
  const mappedRole = role === 'consumer' ? 'user' : role
  const res = await apiClient.patch(`/admin/users/${userId}/role`, { role: mappedRole })
  return res.data || res
}

// POST /api/admin/users/:id/ban
export async function toggleUserBan(userId, isBanned, reason) {
  const res = await apiClient.post(`/admin/users/${userId}/ban`, { isBanned, reason })
  return res.data || res
}
