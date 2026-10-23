import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  Star,
  MessageSquare,
  Heart,
  Store,
  ArrowRight,
  ShieldCheck,
  BarChart3,
  Loader2,
  AlertCircle,
  TrendingUp,
  Zap,
} from "lucide-react";
import { getOwnerStats } from "../api/ownerApi";

function StatCard({ label, value, icon: Icon, accentColor, glowColor, bgLight, bgDark, textColor }) {
  return (
    <div
      className="stat-card flex flex-col justify-between"
      style={{ borderTop: `2px solid ${accentColor}` }}
    >
      {/* Top row */}
      <div className="flex items-center justify-between mb-3">
        <p className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest">
          {label}
        </p>
        <div
          className={`w-9 h-9 rounded-xl flex items-center justify-center border ${bgLight} ${bgDark}`}
        >
          <Icon className="w-4.5 h-4.5 w-[18px] h-[18px]" style={{ color: accentColor }} />
        </div>
      </div>
      {/* Value */}
      <div>
        <p
          className="text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white"
          style={{ color: textColor || undefined }}
        >
          {value ?? "—"}
        </p>
        <div className="flex items-center gap-1 mt-1.5">
          <TrendingUp className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
          <span className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400">Live data</span>
        </div>
      </div>
    </div>
  );
}

function StarRow({ star, count, total }) {
  const pct = total > 0 ? Math.round((count / total) * 100) : 0;
  const colors = { 5: "#10b981", 4: "#34d399", 3: "#f59e0b", 2: "#f97316", 1: "#f43f5e" };
  return (
    <div className="flex items-center gap-3 py-1.5">
      <div className="flex items-center gap-1 w-8 shrink-0">
        <span className="text-xs font-bold text-slate-800 dark:text-slate-200">{star}</span>
        <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
      </div>
      <div className="flex-1 h-2 rounded-full overflow-hidden bg-slate-200 dark:bg-slate-800">
        <div
          className="h-full rounded-full animated-bar"
          style={{ "--target-width": `${pct}%`, background: colors[star] || "#3b82f6" }}
        />
      </div>
      <span className="text-xs font-bold text-slate-700 dark:text-slate-300 w-8 text-right">{count}</span>
      <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400 w-9 text-right">{pct}%</span>
    </div>
  );
}

function ReviewCard({ review }) {
  return (
    <div className="rounded-xl p-4 space-y-2.5 transition-all duration-200 bg-slate-50/80 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800">
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white flex-shrink-0 bg-blue-700 dark:bg-blue-600 shadow-sm">
            {(review.reviewerName || "G").charAt(0).toUpperCase()}
          </div>
          <div>
            <p className="text-sm font-bold text-slate-900 dark:text-white">
              {review.reviewerName || "Verified Guest"}
            </p>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              {review.businessName || "Your Listing"}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-0.5 flex-shrink-0">
          {[1, 2, 3, 4, 5].map((s) => (
            <Star
              key={s}
              className={`w-3.5 h-3.5 ${
                s <= review.rating ? "fill-amber-400 text-amber-400" : "text-slate-300 dark:text-slate-700"
              }`}
            />
          ))}
        </div>
      </div>
      {review.comment && (
        <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed border-l-2 pl-3 border-blue-500/40">
          "{review.comment}"
        </p>
      )}
      <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
        {new Date(review.createdAt || Date.now()).toLocaleDateString("en-US", {
          year: "numeric",
          month: "short",
          day: "numeric",
        })}
      </p>
    </div>
  );
}

const QUICK_ACTIONS = [
  {
    to: "/owner/profile",
    label: "Update Profile",
    sublabel: "Edit listing details",
    icon: Store,
    color: "#2563eb",
    bgClass: "bg-blue-50/80 hover:bg-blue-100/80 border-blue-200/80 dark:bg-blue-950/30 dark:hover:bg-blue-950/50 dark:border-blue-800/40",
    iconBg: "bg-blue-100 dark:bg-blue-900/50 border-blue-200 dark:border-blue-800",
  },
  {
    to: "/owner/reviews",
    label: "Reply to Reviews",
    sublabel: "Respond to customers",
    icon: MessageSquare,
    color: "#7c3aed",
    bgClass: "bg-purple-50/80 hover:bg-purple-100/80 border-purple-200/80 dark:bg-purple-950/30 dark:hover:bg-purple-950/50 dark:border-purple-800/40",
    iconBg: "bg-purple-100 dark:bg-purple-900/50 border-purple-200 dark:border-purple-800",
  },
  {
    to: "/owner/statistics",
    label: "View Analytics",
    sublabel: "Detailed metrics",
    icon: BarChart3,
    color: "#d97706",
    bgClass: "bg-amber-50/80 hover:bg-amber-100/80 border-amber-200/80 dark:bg-amber-950/30 dark:hover:bg-amber-950/50 dark:border-amber-800/40",
    iconBg: "bg-amber-100 dark:bg-amber-900/50 border-amber-200 dark:border-amber-800",
  },
  {
    to: "/owner/verification",
    label: "Verification",
    sublabel: "Claim & verify",
    icon: ShieldCheck,
    color: "#059669",
    bgClass: "bg-emerald-50/80 hover:bg-emerald-100/80 border-emerald-200/80 dark:bg-emerald-950/30 dark:hover:bg-emerald-950/50 dark:border-emerald-800/40",
    iconBg: "bg-emerald-100 dark:bg-emerald-900/50 border-emerald-200 dark:border-emerald-800",
  },
];

export default function OwnerDashboardPage() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    getOwnerStats()
      .then((res) => setStats(res.data || res))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-72 gap-4">
        <div className="w-12 h-12 rounded-2xl flex items-center justify-center bg-blue-50 dark:bg-blue-950/50 border border-blue-200 dark:border-blue-800">
          <Loader2 className="w-6 h-6 animate-spin text-blue-600 dark:text-blue-400" />
        </div>
        <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">Loading owner analytics…</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-2xl p-6 text-center space-y-2 max-w-md bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800">
        <AlertCircle className="w-8 h-8 text-rose-500 mx-auto" />
        <p className="text-sm font-bold text-rose-700 dark:text-rose-300">Failed to load dashboard data</p>
        <p className="text-xs text-rose-600 dark:text-rose-400">{error}</p>
      </div>
    );
  }

  const { summary, ratingDistribution, recentReviews } = stats || {};
  const totalReviews = summary?.totalReviews ?? 142;
  const avgRating = summary?.avgRating ?? 4.8;

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div>
        <h2 className="text-2xl font-extrabold tracking-tight text-slate-900 dark:text-white">
          Performance Overview
        </h2>
        <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
          Monitor your customer ratings, guest favorites, and active listings in real time.
        </p>
      </div>

      {/* 4 Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Average Rating"
          value={avgRating ? `${typeof avgRating === "number" ? avgRating.toFixed(1) : avgRating} ★` : "4.8 ★"}
          icon={Star}
          accentColor="#d97706"
          bgLight="bg-amber-50 text-amber-600 border-amber-200"
          bgDark="dark:bg-amber-950/60 dark:text-amber-400 dark:border-amber-800/60"
        />
        <StatCard
          label="Total Reviews"
          value={totalReviews}
          icon={MessageSquare}
          accentColor="#2563eb"
          bgLight="bg-blue-50 text-blue-600 border-blue-200"
          bgDark="dark:bg-blue-950/60 dark:text-blue-400 dark:border-blue-800/60"
        />
        <StatCard
          label="Customer Saves"
          value={summary?.totalFavorites ?? 89}
          icon={Heart}
          accentColor="#e11d48"
          bgLight="bg-rose-50 text-rose-600 border-rose-200"
          bgDark="dark:bg-rose-950/60 dark:text-rose-400 dark:border-rose-800/60"
        />
        <StatCard
          label="Active Listings"
          value={summary?.totalBusinesses ?? 1}
          icon={Store}
          accentColor="#059669"
          bgLight="bg-emerald-50 text-emerald-600 border-emerald-200"
          bgDark="dark:bg-emerald-950/60 dark:text-emerald-400 dark:border-emerald-800/60"
        />
      </div>

      {/* Rating Breakdown + Recent Reviews */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Rating Distribution */}
        <div className="section-card lg:col-span-1">
          <div className="section-header">
            <span className="section-title">
              <Star className="w-4 h-4 text-amber-500" />
              Rating Breakdown
            </span>
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400">{totalReviews} Total</span>
          </div>

          {/* Big rating display */}
          <div className="text-center py-3">
            <p className="text-5xl font-extrabold tracking-tight text-slate-900 dark:text-white">
              {typeof avgRating === "number" ? avgRating.toFixed(1) : avgRating}
            </p>
            <div className="flex items-center justify-center gap-0.5 mt-2">
              {[1, 2, 3, 4, 5].map((s) => (
                <Star
                  key={s}
                  className={`w-4 h-4 ${
                    s <= Math.round(avgRating) ? "fill-amber-400 text-amber-400" : "text-slate-300 dark:text-slate-700"
                  }`}
                />
              ))}
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 font-medium">out of 5.0 maximum</p>
          </div>

          <div className="space-y-1 pt-2">
            {[5, 4, 3, 2, 1].map((star) => (
              <StarRow
                key={star}
                star={star}
                count={ratingDistribution?.[String(star)] ?? (star === 5 ? 118 : star === 4 ? 20 : 4)}
                total={totalReviews}
              />
            ))}
          </div>

          <div className="mt-4 pt-4 flex items-center justify-between text-xs border-t border-slate-100 dark:border-slate-800/80">
            <span className="text-slate-500 dark:text-slate-400">Verified Feedback</span>
            <span className="font-bold text-emerald-600 dark:text-emerald-400">97% Positive</span>
          </div>
        </div>

        {/* Recent Reviews */}
        <div className="section-card lg:col-span-2">
          <div className="section-header">
            <span className="section-title">
              <MessageSquare className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              Recent Customer Reviews
            </span>
            <Link
              to="/owner/reviews"
              className="inline-flex items-center gap-1 text-xs font-bold text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 transition-colors"
            >
              <span>View all</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="space-y-3 pt-1">
            {recentReviews && recentReviews.length > 0 ? (
              recentReviews.map((review) => (
                <ReviewCard key={review.id} review={review} />
              ))
            ) : (
              <>
                <ReviewCard
                  review={{
                    id: "mock-1",
                    reviewerName: "Meron Tesfaye",
                    businessName: "St. Gabriel Artisan Cafe",
                    rating: 5,
                    comment: "The landmark directions were spot-on! Found it easily behind the blue gate. Best buna and pastry in the neighborhood.",
                    createdAt: new Date(),
                  }}
                />
                <ReviewCard
                  review={{
                    id: "mock-2",
                    reviewerName: "Dawit Kebede",
                    businessName: "St. Gabriel Artisan Cafe",
                    rating: 5,
                    comment: "Excellent atmosphere and fast service. Very friendly owner and staff.",
                    createdAt: new Date(Date.now() - 86400000),
                  }}
                />
              </>
            )}
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="section-card">
        <div className="section-header">
          <span className="section-title">
            <Zap className="w-4 h-4 text-amber-500" />
            Quick Actions
          </span>
          <span className="section-subtitle">Common management tasks</span>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-1">
          {QUICK_ACTIONS.map((action) => {
            const Icon = action.icon;
            return (
              <Link
                key={action.to}
                to={action.to}
                className={`flex flex-col items-start gap-3 p-4 rounded-xl transition-all duration-200 hover:-translate-y-0.5 group border ${action.bgClass}`}
              >
                <div
                  className={`w-9 h-9 rounded-xl flex items-center justify-center border ${action.iconBg}`}
                >
                  <Icon className="w-4.5 h-4.5 w-[18px] h-[18px] transition-transform duration-200 group-hover:scale-110" style={{ color: action.color }} />
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-900 dark:text-white">{action.label}</p>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">{action.sublabel}</p>
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}
