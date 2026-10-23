import { useState, useEffect } from 'react'
import {
  Store,
  Search,
  MapPin,
  Star,
  CheckCircle2,
  Clock,
  XCircle,
  ShieldCheck,
  Building2,
  Phone,
} from 'lucide-react'
import Layout from '../components/layout/Layout.jsx'
import { getAllBusinesses } from '../api/listings'
import { getCategories } from '../api/categories'

export default function BusinessesPage() {
  const [businesses, setBusinesses] = useState([])
  const [categories, setCategories] = useState([])
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('all')
  const [selectedStatus, setSelectedStatus] = useState('all')
  const [selectedOwnership, setSelectedOwnership] = useState('all')
  const [loading, setLoading] = useState(true)
  const [selectedBusiness, setSelectedBusiness] = useState(null)

  useEffect(() => {
    async function loadData() {
      try {
        const [bizList, catList] = await Promise.allSettled([
          getAllBusinesses({ pageSize: 100 }),
          getCategories(),
        ])

        const loadedCategories = (catList.status === 'fulfilled' && Array.isArray(catList.value))
          ? catList.value
          : []
        setCategories(loadedCategories)

        // Build category resolution map: id -> name, slug -> name
        const catMap = new Map()
        for (const c of loadedCategories) {
          if (c.id !== undefined) catMap.set(String(c.id), c.name)
          if (c.slug) catMap.set(c.slug.toLowerCase(), c.name)
          if (c.name) catMap.set(c.name.toLowerCase(), c.name)
        }

        if (bizList.status === 'fulfilled' && Array.isArray(bizList.value)) {
          const enrichedBusinesses = bizList.value.map((b) => {
            let resolvedCatName = 'General'
            if (b.categoryId && catMap.has(String(b.categoryId))) {
              resolvedCatName = catMap.get(String(b.categoryId))
            } else if (typeof b.category === 'string' && catMap.has(b.category.toLowerCase())) {
              resolvedCatName = catMap.get(b.category.toLowerCase())
            } else if (typeof b.category === 'string' && b.category.trim()) {
              resolvedCatName = b.category
            }

            return {
              ...b,
              category: resolvedCatName,
              categoryId: b.categoryId ? String(b.categoryId) : null,
            }
          })
          setBusinesses(enrichedBusinesses)
        }
      } catch (err) {
        console.error('Failed to load businesses registry:', err)
      } finally {
        setLoading(false)
      }
    }
    loadData()
  }, [])

  const filteredBusinesses = businesses.filter((biz) => {
    const matchesSearch =
      (biz.name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (biz.landmarkDescription || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (biz.submittedBy || '').toLowerCase().includes(searchQuery.toLowerCase())

    const matchesCategory =
      selectedCategory === 'all' ||
      String(biz.categoryId) === String(selectedCategory) ||
      (biz.category || '').toLowerCase() === String(selectedCategory).toLowerCase() ||
      categories.some(
        (c) =>
          String(c.id) === String(selectedCategory) &&
          (c.name.toLowerCase() === (biz.category || '').toLowerCase() ||
            (c.slug && c.slug.toLowerCase() === (biz.category || '').toLowerCase()))
      )

    const matchesStatus =
      selectedStatus === 'all' ||
      biz.status === selectedStatus ||
      (selectedStatus === 'published' && (biz.status === 'published' || biz.status === 'approved'))

    const matchesOwnership =
      selectedOwnership === 'all' ||
      (selectedOwnership === 'claimed' ? biz.isClaimed : !biz.isClaimed)

    return matchesSearch && matchesCategory && matchesStatus && matchesOwnership
  })

  const totalCount = businesses.length
  const publishedCount = businesses.filter((b) => b.status === 'published' || b.status === 'approved').length
  const claimedCount = businesses.filter((b) => b.isClaimed).length
  const pendingCount = businesses.filter((b) => b.status === 'pending').length

  return (
    <Layout
      title="Businesses Directory Registry"
      subtitle="Complete database catalog of all published, pending, and claimed businesses on TrustNear."
    >
      {/* KPI Summary Cards */}
      <div className="grid-4">
        <div className="kpi-card">
          <div>
            <p className="kpi-label">Total Listings</p>
            <p className="kpi-value">{totalCount}</p>
            <p className="kpi-sub">Total database records</p>
          </div>
          <div className="kpi-icon-blue">
            <Building2 size={22} />
          </div>
        </div>

        <div className="kpi-card">
          <div>
            <p className="kpi-label">Published & Live</p>
            <p className="kpi-value text-emerald-600">{publishedCount}</p>
            <p className="kpi-sub">Active in user search</p>
          </div>
          <div className="kpi-icon-green">
            <Store size={22} />
          </div>
        </div>

        <div className="kpi-card">
          <div>
            <p className="kpi-label">Verified Owners</p>
            <p className="kpi-value text-sky-600">{claimedCount}</p>
            <p className="kpi-sub">Claimed & managed</p>
          </div>
          <div className="kpi-icon-sky">
            <ShieldCheck size={22} />
          </div>
        </div>

        <div className="kpi-card">
          <div>
            <p className="kpi-label">Pending Reviews</p>
            <p className="kpi-value kpi-amber">{pendingCount}</p>
            <p className="kpi-sub kpi-sub-amber">Awaiting approval</p>
          </div>
          <div className="kpi-icon-amber">
            <Clock size={22} />
          </div>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="filter-bar flex-wrap gap-3">
        <div className="search flex-1 min-w-[240px]">
          <Search size={16} className="search-icon" />
          <input
            type="text"
            placeholder="Search by business name, landmark, or submitter..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="input pl-9 w-full"
          />
        </div>

        <div className="action-row flex-wrap">
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="select"
          >
            <option value="all">All Categories</option>
            {categories.map((c) => (
              <option key={c.id || c.name} value={String(c.id || c.name)}>
                {c.name}
              </option>
            ))}
          </select>

          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="select"
          >
            <option value="all">All Statuses</option>
            <option value="published">Published</option>
            <option value="pending">Pending</option>
            <option value="rejected">Rejected</option>
          </select>

          <select
            value={selectedOwnership}
            onChange={(e) => setSelectedOwnership(e.target.value)}
            className="select"
          >
            <option value="all">All Ownership</option>
            <option value="claimed">Claimed (Owner)</option>
            <option value="unclaimed">Unclaimed (Community)</option>
          </select>
        </div>
      </div>

      {/* Results Header */}
      <div className="results-header">
        <span>Showing {filteredBusinesses.length} of {totalCount} businesses</span>
        {(searchQuery || selectedCategory !== 'all' || selectedStatus !== 'all' || selectedOwnership !== 'all') && (
          <button
            onClick={() => {
              setSearchQuery('')
              setSelectedCategory('all')
              setSelectedStatus('all')
              setSelectedOwnership('all')
            }}
            className="btn-link-action"
          >
            Clear Filters
          </button>
        )}
      </div>

      {/* Businesses Grid / List */}
      <div className="queue-list">
        {filteredBusinesses.length === 0 ? (
          <div className="empty-box">
            <Store size={32} className="mx-auto text-slate-400 opacity-60" />
            <p className="font-semibold text-slate-600">No businesses match your search filters.</p>
            <p className="text-slate-400 text-xs">Try adjusting your category or keyword filters.</p>
          </div>
        ) : (
          filteredBusinesses.map((biz) => (
            <div key={biz.id} className="listing-row">
              <div className="listing-info">
                {/* Name & Chips */}
                <div className="queue-name flex-wrap">
                  <span>{biz.name}</span>
                  <span className="queue-badge capitalize">{biz.category}</span>

                  {(biz.status === 'published' || biz.status === 'approved') && (
                    <span className="status-approved">
                      <CheckCircle2 size={12} /> Published
                    </span>
                  )}
                  {biz.status === 'pending' && (
                    <span className="badge-type-amber">
                      <Clock size={12} /> Pending
                    </span>
                  )}
                  {biz.status === 'rejected' && (
                    <span className="status-rejected">
                      <XCircle size={12} /> Rejected
                    </span>
                  )}

                  {biz.isClaimed ? (
                    <span className="verified-owner-badge">
                      <ShieldCheck size={12} /> Verified Owner
                    </span>
                  ) : (
                    <span className="badge-unclaimed">
                      Unclaimed
                    </span>
                  )}
                </div>

                {/* Landmark Address & Phone */}
                <div className="queue-landmark flex-wrap">
                  <p className="flex items-center gap-1">
                    <MapPin size={13} className="shrink-0" />
                    <span>{biz.landmarkDescription || 'No landmark specified'}</span>
                  </p>
                  {biz.phone && (
                    <p className="flex items-center gap-1 text-slate-400">
                      <Phone size={13} className="shrink-0" />
                      <span>{biz.phone}</span>
                    </p>
                  )}
                </div>

                {/* Meta Submitter & Date */}
                <p className="listing-submitter">
                  Submitted by: <strong>{biz.submittedBy}</strong>
                  {biz.createdAt && (
                    <span className="text-slate-400 ml-2">
                      • {new Date(biz.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                    </span>
                  )}
                </p>
              </div>

              {/* Right Rating Column & Inspect Button */}
              <div className="action-row shrink-0">
                <div className="text-right">
                  <p className="rating-badge">
                    <Star size={13} className="fill-amber-400 text-amber-400" />
                    {biz.avgRating || '5.0'}
                  </p>
                  <p className="text-mono">
                    {biz.reviewCount || 0} reviews
                  </p>
                </div>

                <button
                  onClick={() => setSelectedBusiness(biz)}
                  className="btn-secondary"
                >
                  Details
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Business Details Modal */}
      {selectedBusiness && (
        <div className="modal-overlay">
          <div className="modal-card">
            <div className="section-header">
              <div>
                <h3 className="modal-title">{selectedBusiness.name}</h3>
                <span className="queue-badge capitalize mt-1">{selectedBusiness.category}</span>
              </div>
              <span className="rating-badge">
                <Star size={14} className="fill-amber-400 text-amber-400" />
                {selectedBusiness.avgRating || '5.0'} ({selectedBusiness.reviewCount || 0} reviews)
              </span>
            </div>

            <div className="modal-body">
              <div>
                <span className="form-label">Landmark Address:</span>
                <p className="queue-landmark">
                  <MapPin size={14} className="shrink-0" />
                  {selectedBusiness.landmarkDescription || 'No landmark specified'}
                </p>
              </div>

              <div className="modal-grid">
                <div>
                  <span className="form-label">Publication Status:</span>
                  <p className="font-bold capitalize">
                    {selectedBusiness.status}
                  </p>
                </div>
                <div>
                  <span className="form-label">Ownership Status:</span>
                  <p className="font-bold">
                    {selectedBusiness.isClaimed ? '✓ Claimed (Assigned Owner)' : 'Unclaimed Community Listing'}
                  </p>
                </div>
              </div>

              <div>
                <span className="form-label">Submitted By:</span>
                <p>{selectedBusiness.submittedBy}</p>
              </div>

              {selectedBusiness.rejectionReason && (
                <div className="rejection-note">
                  <strong>Rejection Reason:</strong> {selectedBusiness.rejectionReason}
                </div>
              )}
            </div>

            <div className="modal-actions">
              <button
                onClick={() => setSelectedBusiness(null)}
                className="btn-secondary w-full"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </Layout>
  )
}
