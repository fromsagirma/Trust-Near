import apiClient from './client'

// TN-011 — Admin: Business Claim Review & Verification
export async function getClaims(status = 'all') {
  try {
    const res = await apiClient.get(`/admin/claims?status=${status}`)
    const claims = res.data?.claims || res.data || []
    if (Array.isArray(claims)) {
      return claims.map((c) => ({
        id: c.id,
        businessId: c.businessId,
        businessName: c.business?.name || c.businessName || 'Claimed Business',
        claimantId: c.claimantId,
        claimantName: c.claimant?.displayName || c.claimantName || 'Business Owner',
        claimantPhone: c.claimant?.phone || c.verificationInfo?.contactPhone || 'Phone on file',
        proofUrl: c.verificationInfo?.documentUrl || c.proofUrl || null,
        verificationInfo: c.verificationInfo || {},
        status: c.status || 'pending',
        rejectionReason: c.rejectionReason,
        createdAt: c.createdAt,
      }))
    }
    return []
  } catch (err) {
    console.error('Failed to fetch claims:', err.message)
    return []
  }
}

export async function approveClaim(claimId) {
  try {
    const res = await apiClient.patch(`/admin/claims/${claimId}/approve`)
    return res.data || res
  } catch (err) {
    console.error('Approve claim failed:', err.message)
    throw err
  }
}

export async function rejectClaim(claimId, reason) {
  try {
    const res = await apiClient.patch(`/admin/claims/${claimId}/reject`, { reason })
    return res.data || res
  } catch (err) {
    console.error('Reject claim failed:', err.message)
    throw err
  }
}
