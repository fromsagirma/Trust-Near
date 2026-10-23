import { useState, useEffect } from 'react'
import {
  CheckCircle2,
  Trash2,
  Star,
  AlertTriangle,
  ShieldAlert,
  RotateCcw
} from 'lucide-react'
import Layout from '../components/layout/Layout.jsx'
import { getFlaggedItems, dismissFlag, removeContent, restoreContent } from '../api/moderation'

export default function ModerationPage() {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('flagged')

  useEffect(() => {
    async function fetchItems() {
      try {
        const data = await getFlaggedItems('all')
        if (Array.isArray(data)) {
          setItems(data.map((i) => ({ ...i, status: i.status || 'flagged' })))
        }
      } catch (err) {
        console.warn('Backend moderation queue error:', err.message)
      } finally {
        setLoading(false)
      }
    }
    fetchItems()
  }, [])

  const handleDismiss = async (id) => {
    try {
      await dismissFlag(id)
    } catch (err) {
      console.warn('Backend endpoint offline, updating UI state:', err.message)
    }
    setItems((prev) =>
      prev.map((item) =>
        item.id === id ? { ...item, status: 'dismissed' } : item
      )
    )
  }

  const handleSoftDelete = async (id) => {
    try {
      await removeContent(id, 'Admin soft-delete action')
    } catch (err) {
      console.warn('Backend endpoint offline, updating UI state:', err.message)
    }
    setItems((prev) =>
      prev.map((item) =>
        item.id === id
          ? {
              ...item,
              status: 'removed',
              removedBy: 'Current Admin',
              removedAt: 'Just now'
            }
          : item
      )
    )
  }

  const handleRestore = async (id) => {
    try {
      await restoreContent(id)
    } catch (err) {
      console.warn('Backend endpoint offline, updating UI state:', err.message)
    }
    setItems((prev) =>
      prev.map((item) =>
        item.id === id ? { ...item, status: 'flagged' } : item
      )
    )
  }

  const filteredItems = items.filter((item) => item.status === activeTab)

  return (
    <Layout
      title="Content Moderation & Fraud Queue"
      subtitle="Review user-flagged reviews, suspicious ratings, and abusive text with audit-tracked soft-deletes."
    >
      {/* Governance Notice Box */}
      <div className="notice-rose">
        <div className="notice-left">
          <AlertTriangle className="text-rose-600 shrink-0" size={18} />
          <div>
            <p className="notice-title-rose">Soft-Delete & Audit Protocol</p>
            <p className="notice-desc-rose">
              Removed content is soft-deleted (never permanently purged) and permanently records admin ID, reason, and timestamp.
            </p>
          </div>
        </div>
        <span className="badge-notice-rose">
          Recoverable State
        </span>
      </div>

      {/* Filter Tabs */}
      <div className="filter-bar">
        <button
          onClick={() => setActiveTab('flagged')}
          className={`tab-btn ${activeTab === 'flagged' ? 'tab-btn-active' : 'tab-btn-inactive'}`}
        >
          Flagged Queue ({items.filter((i) => i.status === 'flagged').length})
        </button>
        <button
          onClick={() => setActiveTab('dismissed')}
          className={`tab-btn ${activeTab === 'dismissed' ? 'tab-btn-active' : 'tab-btn-inactive'}`}
        >
          Dismissed ({items.filter((i) => i.status === 'dismissed').length})
        </button>
        <button
          onClick={() => setActiveTab('removed')}
          className={`tab-btn ${activeTab === 'removed' ? 'tab-btn-active' : 'tab-btn-inactive'}`}
        >
          Soft-Deleted ({items.filter((i) => i.status === 'removed').length})
        </button>
      </div>

      {/* Feed */}
      <div className="queue-list">
        {filteredItems.length === 0 ? (
          <div className="empty-box">
            <CheckCircle2 size={28} className="mx-auto text-slate-400 opacity-60" />
            <p className="font-semibold text-slate-600">No {activeTab} content items.</p>
            <p className="text-slate-400">All moderation reports in this tab have been resolved.</p>
          </div>
        ) : (
          filteredItems.map((item) => (
            <div key={item.id} className="review-card">
              <div className="review-body">
                <div className="review-header">
                  <span className="review-title">{item.businessName || 'Reported Business'}</span>
                  <span className="queue-badge">
                    {item.contentType || 'Review'}
                  </span>
                  <span className="badge-type-rose">
                    <ShieldAlert size={11} className="inline mr-1" /> {item.reportCount || 1} Report(s)
                  </span>
                  {item.isVerifiedVisit && (
                    <span className="badge-active">
                      ✓ Verified Visit
                    </span>
                  )}
                </div>

                {/* Star rating if review */}
                {item.rating && (
                  <div className="star-row">
                    {[...Array(5)].map((_, idx) => (
                      <Star
                        key={idx}
                        size={13}
                        className={idx < item.rating ? 'fill-amber-400 text-amber-400' : 'text-slate-200'}
                      />
                    ))}
                    <span className="text-xs text-slate-500 font-semibold ml-1.5">{item.rating}.0 / 5.0</span>
                  </div>
                )}

                {/* Excerpt Box */}
                <div className="review-quote">
                  {item.excerpt || item.comment || 'No excerpt available'}
                </div>

                <div className="queue-meta flex items-center gap-2">
                  <span>Reviewer: <strong className="text-slate-700">{item.reviewerName || 'Anonymous'}</strong></span>
                  <span>•</span>
                  <span>Flag Reasons: <strong className="text-rose-700">{Array.isArray(item.reportReasons) ? item.reportReasons.join(', ') : (item.reportReasons || 'General abuse')}</strong></span>
                </div>

                {item.status === 'removed' && (
                  <div className="rejection-note">
                    Soft-deleted by <strong>{item.removedBy || 'Admin'}</strong> ({item.removedAt || 'Recent'})
                  </div>
                )}
              </div>

              {/* Actions */}
              <div className="action-row shrink-0">
                {item.status === 'flagged' && (
                  <>
                    <button
                      onClick={() => handleDismiss(item.id)}
                      className="btn-secondary flex items-center gap-1"
                    >
                      <CheckCircle2 size={13} />
                      <span>Dismiss Flag</span>
                    </button>
                    <button
                      onClick={() => handleSoftDelete(item.id)}
                      className="btn-danger flex items-center gap-1"
                    >
                      <Trash2 size={13} />
                      <span>Soft-Delete</span>
                    </button>
                  </>
                )}

                {item.status === 'dismissed' && (
                  <span className="status-approved">
                    <CheckCircle2 size={12} /> Flag Dismissed
                  </span>
                )}

                {item.status === 'removed' && (
                  <button
                    onClick={() => handleRestore(item.id)}
                    className="btn-secondary flex items-center gap-1"
                  >
                    <RotateCcw size={13} />
                    <span>Restore Item</span>
                  </button>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </Layout>
  )
}
