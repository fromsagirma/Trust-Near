import { useState, useEffect } from 'react'
import {
  Users,
  CheckCircle2,
  Ban
} from 'lucide-react'
import Layout from '../components/layout/Layout.jsx'
import { getUsers, updateUserRole, toggleUserBan } from '../api/users'

export default function UsersPage() {
  const [users, setUsers] = useState([])
  const [searchQuery, setSearchQuery] = useState('')
  const [roleFilter, setRoleFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState('all')
  const [banningUser, setBanningUser] = useState(null)
  const [banReason, setBanReason] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchUsers() {
      try {
        const data = await getUsers({ pageSize: 100 })
        if (Array.isArray(data)) {
          setUsers(data)
        }
      } catch (err) {
        console.warn('Backend users endpoint offline, initialized with empty state:', err.message)
      } finally {
        setLoading(false)
      }
    }
    fetchUsers()
  }, [])

  const handleRoleChange = async (userId, newRole) => {
    try {
      await updateUserRole(userId, newRole)
    } catch (err) {
      console.warn('Backend endpoint offline, updating UI state:', err.message)
    }
    setUsers((prev) =>
      prev.map((u) => (u.id === userId ? { ...u, role: newRole } : u))
    )
  }

  const handleOpenBan = (user) => {
    setBanningUser(user)
    setBanReason('')
  }

  const handleConfirmBan = async () => {
    if (!banningUser) return
    const isCurrentlyBanned = banningUser.status === 'banned'
    const newStatus = isCurrentlyBanned ? 'active' : 'banned'
    const reason = isCurrentlyBanned ? '' : (banReason || 'Abuse of community guidelines')

    try {
      await toggleUserBan(banningUser.id, newStatus === 'banned', reason)
    } catch (err) {
      console.warn('Backend endpoint offline, updating UI state:', err.message)
    }

    setUsers((prev) =>
      prev.map((u) =>
        u.id === banningUser.id ? { ...u, status: newStatus, banReason: reason } : u
      )
    )
    setBanningUser(null)
    setBanReason('')
  }

  const filteredUsers = users.filter((u) => {
    const matchesSearch =
      (u.displayName || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (u.email || '').toLowerCase().includes(searchQuery.toLowerCase())

    const matchesRole =
      roleFilter === 'all' ||
      (roleFilter === 'admin' && (u.role === 'admin' || u.role === 'seed_admin')) ||
      u.role === roleFilter

    const matchesStatus =
      statusFilter === 'all' || u.status === statusFilter

    return matchesSearch && matchesRole && matchesStatus
  })

  return (
    <Layout
      title="User Governance & Account Safety"
      subtitle="Manage user permissions, identity roles, and account safety actions across TrustNear."
    >
      {/* Search & Filter Bar */}
      <div className="section-header">
        <div className="search flex-1 max-w-sm">
          <input
            type="text"
            placeholder="Search by name or email..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="input w-full"
          />
        </div>

        <div className="action-row flex-wrap">
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            className="select"
          >
            <option value="all">All Roles</option>
            <option value="consumer">Consumer</option>
            <option value="business_owner">Business Owner</option>
            <option value="admin">Admins</option>
          </select>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="select"
          >
            <option value="all">All Statuses</option>
            <option value="active">Active</option>
            <option value="banned">Banned</option>
          </select>
        </div>
      </div>

      {/* Users Table */}
      <div className="table-container">
        <table className="admin-table">
          <thead>
            <tr>
              <th className="table-th">User Profile</th>
              <th className="table-th">Role</th>
              <th className="table-th">Status</th>
              <th className="table-th">Registered Date</th>
              <th className="table-th-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredUsers.length === 0 ? (
              <tr>
                <td colSpan={5} className="table-empty">
                  <Users size={28} className="mx-auto mb-2 opacity-50 text-slate-400" />
                  <p className="font-semibold text-slate-600">No registered users in registry.</p>
                  <p className="text-slate-400">User accounts will appear here once registered.</p>
                </td>
              </tr>
            ) : (
              filteredUsers.map((user) => (
                <tr key={user.id} className="table-row">
                  <td className="table-td">
                    <div className="action-row">
                      <div className="avatar">
                        {(user.displayName || user.email || 'U')[0].toUpperCase()}
                      </div>
                      <div className="user-info">
                        <p className="user-name">{user.displayName || 'User'}</p>
                        <p className="user-email">{user.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="table-td">
                    <select
                      value={user.role}
                      onChange={(e) => handleRoleChange(user.id, e.target.value)}
                      className="role-select"
                    >
                      <option value="consumer">Consumer</option>
                      <option value="business_owner">Business Owner</option>
                      <option value="admin">Admin</option>
                      <option value="seed_admin">Seed Admin</option>
                    </select>
                  </td>
                  <td className="table-td">
                    {user.status === 'banned' ? (
                      <span className="badge-banned">
                        <Ban size={10} /> Banned
                      </span>
                    ) : (
                      <span className="badge-active">
                        <CheckCircle2 size={10} /> Active
                      </span>
                    )}
                  </td>
                  <td className="table-td text-mono">
                    {user.createdAt ? new Date(user.createdAt).toLocaleDateString() : 'N/A'}
                  </td>
                  <td className="table-td text-right">
                    <button
                      onClick={() => handleOpenBan(user)}
                      className={user.status === 'banned' ? 'btn-link-action' : 'btn-link-danger'}
                    >
                      {user.status === 'banned' ? 'Unban' : 'Suspend'}
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Ban Modal */}
      {banningUser && (
        <div className="modal-overlay">
          <div className="modal-card">
            <h3 className="modal-title">
              {banningUser.status === 'banned' ? 'Unban User Account' : 'Suspend User Account'}
            </h3>
            <p className="modal-body">
              Are you sure you want to {banningUser.status === 'banned' ? 'lift suspension for' : 'suspend'}{' '}
              <strong>{banningUser.displayName || banningUser.email}</strong>?
            </p>

            {banningUser.status !== 'banned' && (
              <textarea
                value={banReason}
                onChange={(e) => setBanReason(e.target.value)}
                placeholder="Reason for suspension (e.g. repeated fake review postings)..."
                rows={3}
                className="textarea"
              />
            )}

            <div className="modal-actions">
              <button
                onClick={() => setBanningUser(null)}
                className="btn-secondary"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmBan}
                className={banningUser.status === 'banned' ? 'btn-primary' : 'btn-danger'}
              >
                {banningUser.status === 'banned' ? 'Confirm Unban' : 'Confirm Suspension'}
              </button>
            </div>
          </div>
        </div>
      )}
    </Layout>
  )
}
