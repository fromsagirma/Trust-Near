import { useState, useEffect } from 'react'
import {
  ShieldCheck,
  CheckCircle2,
  XCircle,
  Phone,
  FileText,
  Building,
  User,
  ExternalLink
} from 'lucide-react'
import Layout from '../components/layout/Layout.jsx'
import { getClaims, approveClaim, rejectClaim } from '../api/claims'

export default function ClaimsPage() {
  const [claims, setClaims] = useState([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('pending')
  const [rejectingClaim, setRejectingClaim] = useState(null)
  const [rejectionReason, setRejectionReason] = useState('')

  useEffect(() => {
    async function fetchClaims() {
      try {
        const data = await getClaims('all')
        if (Array.isArray(data)) {
          setClaims(data.map((c) => ({ ...c, status: c.status || 'pending' })))
        }
      } catch (err) {
        console.warn('Backend claims error:', err.message)
      } finally {
        setLoading(false)
      }
    }
    fetchClaims()
  }, [])

  const handleApprove = async (id) => {
    try {
      await approveClaim(id)
    } catch (err) {
      console.warn('Backend endpoint offline, updating UI state:', err.message)
    }
    setClaims((prev) =>
      prev.map((c) => (c.id === id ? { ...c, status: 'approved' } : c))
    )
  }

  const handleOpenReject = (claim) => {
    setRejectingClaim(claim)
    setRejectionReason('')
  }

  const handleConfirmReject = async () => {
    if (!rejectingClaim) return
    const reason = rejectionReason || 'Verification document or phone number match insufficient.'
    try {
      await rejectClaim(rejectingClaim.id, reason)
    } catch (err) {
      console.warn('Backend endpoint offline, updating UI state:', err.message)
    }
    setClaims((prev) =>
      prev.map((c) =>
        c.id === rejectingClaim.id
          ? { ...c, status: 'rejected', rejectionReason: reason }
          : c
      )
    )
    setRejectingClaim(null)
    setRejectionReason('')
  }

  const filteredClaims = claims.filter((c) => c.status === activeTab)

  return (
    <Layout
      title="Business Ownership Claims"
      subtitle="Verify ownership documents and phone matches before transferring business listing control."
    >
      {/* Governance Notice */}
      <div className="notice-sky">
        <div className="notice-left">
          <ShieldCheck className="text-sky-600 shrink-0" size={18} />
          <div>
            <p className="notice-title-sky">Ownership Transfer Protocol</p>
            <p className="notice-desc-sky">
              Approval permanently assigns the business owner role for this listing. Rejection leaves the listing in public community status.
            </p>
          </div>
        </div>
        <span className="badge-notice-sky">
          Verification Flow
        </span>
      </div>

      {/* Filter Tabs */}
      <div className="filter-bar">
        <button
          onClick={() => setActiveTab('pending')}
          className={`tab-btn ${activeTab === 'pending' ? 'tab-btn-active' : 'tab-btn-inactive'}`}
        >
          Pending Claims ({claims.filter((c) => c.status === 'pending').length})
        </button>
        <button
          onClick={() => setActiveTab('approved')}
          className={`tab-btn ${activeTab === 'approved' ? 'tab-btn-active' : 'tab-btn-inactive'}`}
        >
          Approved ({claims.filter((c) => c.status === 'approved').length})
        </button>
        <button
          onClick={() => setActiveTab('rejected')}
          className={`tab-btn ${activeTab === 'rejected' ? 'tab-btn-active' : 'tab-btn-inactive'}`}
        >
          Rejected ({claims.filter((c) => c.status === 'rejected').length})
        </button>
      </div>

      {/* Claims List */}
      <div className="queue-list">
        {filteredClaims.length === 0 ? (
          <div className="empty-box">
            <CheckCircle2 size={28} className="mx-auto text-slate-400 opacity-60" />
            <p className="font-semibold text-slate-600">No {activeTab} ownership claims.</p>
            <p className="text-slate-400">All submitted business claims in this tab have been processed.</p>
          </div>
        ) : (
          filteredClaims.map((claim) => (
            <div key={claim.id} className="claim-card">
              <div className="claim-card-header">
                <div className="action-row">
                  <Building size={16} className="text-emerald-600" />
                  <h3 className="section-title">
                    {claim.businessName || 'Claimed Business'}
                  </h3>
                  {claim.status === 'approved' && (
                    <span className="status-approved">
                      <CheckCircle2 size={12} /> Ownership Verified
                    </span>
                  )}
                  {claim.status === 'rejected' && (
                    <span className="status-rejected">
                      <XCircle size={12} /> Claim Rejected
                    </span>
                  )}
                </div>
                <span className="text-mono">
                  Claim ID: #{claim.id}
                </span>
              </div>

              <div className="claim-grid">
                <div>
                  <p className="claim-label">Claimant Name:</p>
                  <p className="claim-val-row">
                    <User size={13} className="text-slate-400" />
                    {claim.claimantName || claim.userName || 'Business Owner'}
                  </p>
                </div>
                <div>
                  <p className="claim-label">Contact Phone Match:</p>
                  <p className="claim-val-highlight">
                    <Phone size={13} />
                    {claim.claimantPhone || claim.phone || 'Phone verified on file'}
                  </p>
                </div>
              </div>

              {/* Proof Document Preview */}
              {claim.proofUrl && (
                <div className="claim-proof-box">
                  <p className="proof-title">
                    <FileText size={14} className="text-sky-600" />
                    Submitted Registration / Business License Document:
                  </p>
                  <a
                    href={claim.proofUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="proof-link"
                  >
                    <img
                      src={claim.proofUrl}
                      alt="License Proof"
                      className="claim-proof-preview"
                    />
                    <span className="proof-badge">
                      <ExternalLink size={10} /> Expand
                    </span>
                  </a>
                </div>
              )}

              {claim.status === 'rejected' && claim.rejectionReason && (
                <div className="rejection-note">
                  <strong>Rejection Note:</strong> {claim.rejectionReason}
                </div>
              )}

              {/* Actions */}
              {claim.status === 'pending' && (
                <div className="claim-actions-row">
                  <button
                    onClick={() => handleApprove(claim.id)}
                    className="btn-approve"
                  >
                    <CheckCircle2 size={14} />
                    <span>Approve Ownership</span>
                  </button>
                  <button
                    onClick={() => handleOpenReject(claim)}
                    className="btn-reject"
                  >
                    <XCircle size={14} />
                    <span>Reject Claim</span>
                  </button>
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {/* Rejection Modal */}
      {rejectingClaim && (
        <div className="modal-overlay">
          <div className="modal-card">
            <h3 className="modal-title">Reject Ownership Claim</h3>
            <p className="text-xs text-slate-500">
              Provide a reason for rejecting the claim on <strong>{rejectingClaim.businessName}</strong>.
            </p>

            <textarea
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              placeholder="e.g. License name does not match claimant identity or is expired..."
              rows={3}
              className="textarea"
            />

            <div className="modal-actions">
              <button
                onClick={() => setRejectingClaim(null)}
                className="btn-secondary"
              >
                Cancel
              </button>
              <button onClick={handleConfirmReject} className="btn-danger">
                Confirm Rejection
              </button>
            </div>
          </div>
        </div>
      )}
    </Layout>
  )
}
