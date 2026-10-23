import React, { useEffect, useState, useCallback } from "react";
import { Link } from "react-router-dom";
import {
  ShieldCheck,
  Clock,
  AlertCircle,
  Phone,
  Upload,
  CheckCircle2,
  Loader2,
  PlusCircle,
  Store,
  Check,
} from "lucide-react";
import {
  getMyBusinesses,
  getMyBusiness,
  submitClaim,
  getClaimStatus,
  getSelectedBusinessId,
  setSelectedBusinessId,
} from "../api/ownerApi";

export default function VerificationPage() {
  const [businesses, setBusinesses] = useState([]);
  const [business, setBusiness] = useState(null);
  const [claim, setClaim] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");

  const [phone, setPhone] = useState("");
  const [proofFile, setProofFile] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const allBiz = await getMyBusinesses();
      setBusinesses(allBiz);

      const biz = await getMyBusiness();
      if (!biz || !biz.id) {
        setBusiness(null);
        setLoading(false);
        return;
      }
      setBusiness(biz);
      const status = await getClaimStatus(biz.id);
      setClaim(status?.data || status);
      setLoadError("");
    } catch (err) {
      setLoadError(err.message || "Couldn't load verification status");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
    const handleBizChange = () => load();
    window.addEventListener("trustnear:businessChanged", handleBizChange);
    return () => window.removeEventListener("trustnear:businessChanged", handleBizChange);
  }, [load]);

  const handleSelectBusiness = (id) => {
    setSelectedBusinessId(id);
    load();
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!phone.trim() && !proofFile) {
      setSubmitError("Provide a matching phone number or a proof photo");
      return;
    }
    setSubmitError("");
    setSubmitting(true);
    try {
      const result = await submitClaim(business.id, { phone });
      setClaim(result);
    } catch (err) {
      setSubmitError(err.message || "Couldn't submit claim");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-3 text-slate-500">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600 dark:text-blue-400" />
        <p className="text-xs font-semibold">Loading verification status...</p>
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="rounded-2xl border border-rose-200 dark:border-rose-800 bg-rose-50 dark:bg-rose-950/60 p-6 text-center space-y-2">
        <AlertCircle className="w-8 h-8 text-rose-500 mx-auto" />
        <p className="text-sm font-bold text-rose-700 dark:text-rose-200">Unable to load verification</p>
        <p className="text-xs text-rose-600 dark:text-rose-400">{loadError}</p>
      </div>
    );
  }

  if (!business) {
    return (
      <div className="empty-box max-w-xl p-8 space-y-4">
        <ShieldCheck className="w-10 h-10 text-slate-400 dark:text-slate-600 mx-auto" />
        <p className="text-base font-bold text-slate-900 dark:text-white">No Registered Business Found</p>
        <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto">
          Add your business listing first to start the verification process and earn the verified checkmark badge.
        </p>
        <div className="pt-2">
          <Link to="/owner/onboarding" className="btn-primary inline-flex">
            <PlusCircle className="w-4 h-4" />
            <span>Add Business Listing</span>
          </Link>
        </div>
      </div>
    );
  }

  const status =
    business?.status === "pending"
      ? "pending"
      : claim?.status === "approved" && business?.status === "published"
      ? "approved"
      : claim?.status === "pending"
      ? "pending"
      : claim?.status === "rejected"
      ? "rejected"
      : "none";

  return (
    <div className="max-w-xl space-y-6">
      <div>
        <h2 className="text-2xl font-extrabold tracking-tight text-slate-900 dark:text-white">
          Business Verification
        </h2>
        <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
          Verify ownership of <span className="text-slate-900 dark:text-white font-bold">{business.name}</span> to receive the verified badge.
        </p>
      </div>

      {/* Multi-business selector tabs */}
      {businesses.length > 1 && (
        <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
          {businesses.map((biz) => {
            const isSelected = biz.id === business.id;
            return (
              <button
                key={biz.id}
                type="button"
                onClick={() => handleSelectBusiness(biz.id)}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer border ${
                  isSelected
                    ? "bg-blue-600 text-white border-blue-600 shadow-sm ring-2 ring-blue-500/20"
                    : "bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700"
                }`}
              >
                <Store className={`w-3.5 h-3.5 ${isSelected ? "text-white" : "text-blue-600 dark:text-blue-400"}`} />
                <span>{biz.name}</span>
                {isSelected && <Check className="w-3.5 h-3.5" />}
              </button>
            );
          })}
        </div>
      )}

      {status === "approved" && (
        <div className="section-card border-emerald-300 dark:border-emerald-800/70 bg-emerald-50/80 dark:bg-emerald-950/40 !p-6 space-y-2">
          <div className="flex items-center gap-2.5 text-emerald-700 dark:text-emerald-400">
            <CheckCircle2 className="w-5 h-5" />
            <p className="text-sm font-bold">Listing Verified</p>
          </div>
          <p className="text-xs text-emerald-800 dark:text-emerald-300/80 leading-relaxed font-medium">
            Your ownership of this listing has been confirmed by the TrustNear admin team. Your verified badge is live on your public listing.
          </p>
        </div>
      )}

      {status === "pending" && (
        <div className="section-card border-amber-300 dark:border-amber-800/70 bg-amber-50/80 dark:bg-amber-950/40 !p-6 space-y-2">
          <div className="flex items-center gap-2.5 text-amber-700 dark:text-amber-400">
            <Clock className="w-5 h-5" />
            <p className="text-sm font-bold">Verification Pending Review</p>
          </div>
          <p className="text-xs text-amber-800 dark:text-amber-300/80 leading-relaxed font-medium">
            Your verification claim was submitted and is currently being reviewed by a neighborhood moderator.
          </p>
        </div>
      )}

      {(status === "none" || status === "rejected") && (
        <form onSubmit={handleSubmit} className="section-card space-y-4">
          <div className="section-header">
            <div>
              <span className="section-title">
                <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                <span>Claim Ownership</span>
              </span>
              <p className="section-subtitle mt-0.5">
                Submit proof that you own or operate this business
              </p>
            </div>
          </div>

          <div>
            <label className="form-label">Contact Phone Number</label>
            <div className="relative">
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+251 91 100 2233"
                className="input pl-10"
              />
              <Phone className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            </div>
          </div>

          <div>
            <label className="form-label">Proof Document or Photo (Optional)</label>
            <div className="p-4 rounded-xl border border-dashed border-slate-300 dark:border-slate-700 text-center space-y-2">
              <Upload className="w-6 h-6 text-slate-400 mx-auto" />
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Upload trade license, storefront sign photo, or business card
              </p>
              <input
                type="file"
                accept="image/*,.pdf"
                onChange={(e) => setProofFile(e.target.files[0])}
                className="text-xs text-slate-600 dark:text-slate-300 file:mr-2 file:py-1 file:px-2.5 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-blue-50 dark:file:bg-slate-800 file:text-blue-700 dark:file:text-blue-400 cursor-pointer"
              />
            </div>
          </div>

          {submitError && (
            <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{submitError}</span>
            </div>
          )}

          <div className="pt-2">
            <button
              type="submit"
              disabled={submitting}
              className="btn-primary w-full py-3 text-sm font-bold"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Submitting Verification Claim...</span>
                </>
              ) : (
                <span>Submit Verification Claim</span>
              )}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
