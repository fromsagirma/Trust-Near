import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import {
  Users,
  Store,
  MessageSquare,
  Clock,
  ArrowRight,
  CheckCircle2,
  AlertTriangle,
  MapPin,
} from 'lucide-react'
import Layout from '../components/layout/Layout.jsx'
import { getPendingListings } from '../api/listings'
import { getFlaggedItems } from '../api/moderation'
import { getCategories } from '../api/categories'
import { getAnalyticsOverview } from '../api/analytics'

export default function OverviewPage() {
  const [pendingListings, setPendingListings] = useState([])
  const [flaggedItems, setFlaggedItems] = useState([])
  const [categories, setCategories] = useState([])
  const [analytics, setAnalytics] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchData() {
      try {
        const [listings, flags, cats, analyticsData] = await Promise.allSettled([
          getPendingListings(),
          getFlaggedItems(),
          getCategories(),
          getAnalyticsOverview(),
        ])
        if (listings.status === 'fulfilled' && Array.isArray(listings.value)) {
          setPendingListings(listings.value.filter((l) => l.status === 'pending'))
        }
        if (flags.status === 'fulfilled' && Array.isArray(flags.value)) {
          setFlaggedItems(flags.value.filter((f) => f.status === 'flagged' || f.status === 'pending'))
        }
        if (cats.status === 'fulfilled' && Array.isArray(cats.value)) {
          setCategories(cats.value)
        }
        if (analyticsData.status === 'fulfilled' && analyticsData.value) {
          setAnalytics(analyticsData.value)
        }
      } catch (err) {
        console.error('Failed to fetch overview data:', err)
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [])

  return (
    <Layout
      title="Overview"
      subtitle="Live snapshot of governance queues and database records."
    >
      {/* KPI Cards */}
      <div className="grid-4">
        <div className="kpi-card">
          <div>
            <p className="kpi-label">Active Categories</p>
            <p className="kpi-value">{categories.length > 0 ? categories.length : '—'}</p>
            <p className="kpi-sub">Database classifications</p>
          </div>
          <div className="kpi-icon-blue">
            <Users size={22} />
          </div>
        </div>

        <div className="kpi-card">
          <div>
            <p className="kpi-label">Pending Approvals</p>
            <p className="kpi-value kpi-amber">{pendingListings.length}</p>
            <p className="kpi-sub kpi-sub-amber">Queue submissions</p>
          </div>
          <div className="kpi-icon-amber">
            <Clock size={22} />
          </div>
        </div>

        <div className="kpi-card">
          <div>
            <p className="kpi-label">Moderation Flags</p>
            <p className="kpi-value">{flaggedItems.length}</p>
            <p className="kpi-sub">Reported items</p>
          </div>
          <div className="kpi-icon-sky">
            <MessageSquare size={22} />
          </div>
        </div>

        <div className="kpi-card">
          <div>
            <p className="kpi-label">System Status</p>
            <p className="kpi-value text-emerald-600 text-lg">Online</p>
            <p className="kpi-sub text-emerald-600">Connected to Cloud API</p>
          </div>
          <div className="kpi-icon-green">
            <Store size={22} />
          </div>
        </div>
      </div>

      {/* 2-Column Split: Pending Submissions & Governance Activity */}
      <div className="grid-2">
        {/* Pending Submissions Queue */}
        <div className="section-card">
          <div className="section-header">
            <div>
              <h2 className="section-title">
                <Clock size={16} className="text-amber-500" />
                Pending Business Approvals
              </h2>
              <p className="section-subtitle">Live submissions from PostgreSQL database</p>
            </div>
            <Link to="/admin/approvals" className="view-all-link">
              <span>View All</span>
              <ArrowRight size={14} />
            </Link>
          </div>

          <div className="queue-list">
            {pendingListings.length === 0 ? (
              <div className="empty-box">
                <CheckCircle2 size={24} className="mx-auto text-emerald-500 opacity-60" />
                <p>Queue clean. No pending business submissions awaiting review.</p>
              </div>
            ) : (
              pendingListings.slice(0, 3).map((biz) => (
                <div key={biz.id} className="queue-item">
                  <div className="queue-info">
                    <div className="queue-name">
                      <span>{biz.name}</span>
                      <span className="queue-badge">{biz.category}</span>
                    </div>
                    <p className="queue-landmark">
                      <MapPin size={13} className="shrink-0" />
                      <span>{biz.landmarkDescription || 'No landmark specified'}</span>
                    </p>
                    <p className="queue-meta">
                      Submitted by: <strong className="text-slate-700">{biz.submittedBy || 'User'}</strong>
                    </p>
                  </div>
                  <Link to="/admin/approvals" className="btn-approve">
                    Review
                  </Link>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Flagged Content & Moderation Activity */}
        <div className="section-card">
          <div className="section-header">
            <div>
              <h2 className="section-title">
                <AlertTriangle size={16} className="text-rose-500" />
                Recent Moderation Flags
              </h2>
              <p className="section-subtitle">Live community reports awaiting action</p>
            </div>
            <Link to="/admin/moderation" className="view-all-link">
              <span>View All</span>
              <ArrowRight size={14} />
            </Link>
          </div>

          <div className="queue-list">
            {flaggedItems.length === 0 ? (
              <div className="empty-box">
                <CheckCircle2 size={24} className="mx-auto text-emerald-500 opacity-60" />
                <p>No active moderation flags. Platform is clean.</p>
              </div>
            ) : (
              flaggedItems.slice(0, 3).map((item) => (
                <div key={item.id} className="queue-item">
                  <div className="queue-info">
                    <div className="queue-name">
                      <span>{item.businessName || 'Reported Item'}</span>
                      <span className="badge-type-rose">
                        {item.contentType || 'Content'}
                      </span>
                    </div>
                    <p className="excerpt-text">
                      {item.excerpt || 'Flagged content excerpt'}
                    </p>
                    <p className="queue-meta">
                      Reports: <strong className="text-rose-600">{item.reportCount || 1} user flag(s)</strong>
                    </p>
                  </div>
                  <Link to="/admin/moderation" className="btn-secondary">
                    Inspect
                  </Link>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </Layout>
  )
}
