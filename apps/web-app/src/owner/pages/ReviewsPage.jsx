import React, { useEffect, useState, useCallback } from "react";
import { Link } from "react-router-dom";
import { MessageSquare, Star, Loader2, AlertCircle, PlusCircle, Store, Check } from "lucide-react";
import {
  getMyBusinesses,
  getMyBusiness,
  getBusinessReviews,
  getSelectedBusinessId,
  setSelectedBusinessId,
} from "../api/ownerApi";
import ReviewCard from "../components/ReviewCard";

export default function ReviewsPage() {
  const [businesses, setBusinesses] = useState([]);
  const [business, setBusiness] = useState(null);
  const [reviews, setReviews] = useState([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState("");

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
      const result = await getBusinessReviews(biz.id, 1);
      const list =
        result?.data?.reviews ||
        result?.reviews ||
        result?.data ||
        (Array.isArray(result) ? result : []);
      setReviews(list);
      setHasMore(Boolean(result.hasMore || result?.data?.hasMore));
      setError("");
    } catch (err) {
      setError(err.message || "Couldn't load reviews");
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

  const loadMore = async () => {
    if (!business?.id) return;
    setLoadingMore(true);
    const nextPage = page + 1;
    try {
      const result = await getBusinessReviews(business.id, nextPage);
      const list =
        result?.data?.reviews ||
        result?.reviews ||
        result?.data ||
        (Array.isArray(result) ? result : []);
      setReviews((prev) => [...prev, ...list]);
      setHasMore(Boolean(result.hasMore || result?.data?.hasMore));
      setPage(nextPage);
    } catch (err) {
      setError(err.message || "Couldn't load more reviews");
    } finally {
      setLoadingMore(false);
    }
  };

  const handleReviewUpdated = (updatedReview) => {
    setReviews((prev) =>
      prev.map((r) => (r.id === updatedReview.id ? updatedReview : r))
    );
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-4">
        <div className="w-12 h-12 rounded-2xl flex items-center justify-center bg-blue-50 dark:bg-blue-950/50 border border-blue-200 dark:border-blue-800">
          <Loader2 className="w-6 h-6 animate-spin text-blue-600 dark:text-blue-400" />
        </div>
        <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">Loading reviews…</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-2xl p-6 text-center space-y-3 max-w-md mx-auto bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800">
        <AlertCircle className="w-8 h-8 text-rose-500 mx-auto" />
        <p className="text-sm font-bold text-rose-700 dark:text-rose-300">Unable to load reviews</p>
        <p className="text-xs text-rose-600 dark:text-rose-400">{error}</p>
      </div>
    );
  }

  if (!business) {
    return (
      <div className="empty-box max-w-lg p-10 space-y-4 mx-auto">
        <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
          <MessageSquare className="w-8 h-8 text-slate-400 dark:text-slate-500" />
        </div>
        <p className="text-base font-bold text-slate-900 dark:text-white">No Registered Business Found</p>
        <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto">
          Add your business listing first to start collecting ratings and responding to customer reviews.
        </p>
        <Link to="/owner/onboarding" className="btn-primary inline-flex">
          <PlusCircle className="w-4 h-4" />
          <span>Add Business Listing</span>
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-2xl space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-2xl font-extrabold tracking-tight text-slate-900 dark:text-white">
            Customer Reviews
          </h2>
          <p className="text-sm text-slate-600 dark:text-slate-400 mt-0.5">
            <span className="text-blue-600 dark:text-blue-400 font-bold">{reviews.length}</span> review{reviews.length !== 1 ? "s" : ""} for{" "}
            <span className="text-slate-900 dark:text-white font-bold">{business.name}</span>
          </p>
        </div>
        {/* Star summary */}
        <div className="flex items-center gap-2 px-3 py-2 rounded-xl flex-shrink-0 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60">
          <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
          <span className="text-sm font-bold text-amber-700 dark:text-amber-300">
            {business.avgRating ? Number(business.avgRating).toFixed(1) : "—"}
          </span>
        </div>
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

      {reviews.length === 0 ? (
        <div className="empty-box p-10 space-y-3">
          <div className="w-12 h-12 rounded-2xl flex items-center justify-center mx-auto bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
            <MessageSquare className="w-6 h-6 text-slate-400 dark:text-slate-500" />
          </div>
          <p className="text-sm font-bold text-slate-700 dark:text-slate-300">No reviews yet</p>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Reviews from verified neighborhood customers will appear here.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {reviews.map((r) => (
            <ReviewCard
              key={r.id}
              review={r}
              onReviewUpdated={handleReviewUpdated}
            />
          ))}

          {hasMore && (
            <div className="text-center pt-2">
              <button
                type="button"
                onClick={loadMore}
                disabled={loadingMore}
                className="btn-secondary text-xs"
              >
                {loadingMore ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Loading more…</span>
                  </>
                ) : (
                  <span>Load more reviews</span>
                )}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
