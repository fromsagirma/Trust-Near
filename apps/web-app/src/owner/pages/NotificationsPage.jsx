import React, { useEffect, useState, useCallback } from "react";
import {
  Bell,
  CheckCheck,
  Star,
  ShieldCheck,
  Heart,
  Store,
  Loader2,
  AlertCircle,
  RefreshCw,
  MessageSquare,
  User,
} from "lucide-react";
import { getNotifications, markNotificationRead } from "../api/ownerApi";

const TYPE_CONFIG = {
  review_reply: {
    icon: MessageSquare,
    bgLight: "bg-blue-50 text-blue-600 border-blue-200",
    bgDark: "dark:bg-blue-950/60 dark:text-blue-400 dark:border-blue-800/60",
  },
  claim_approved: {
    icon: ShieldCheck,
    bgLight: "bg-emerald-50 text-emerald-600 border-emerald-200",
    bgDark: "dark:bg-emerald-950/60 dark:text-emerald-400 dark:border-emerald-800/60",
  },
  claim_rejected: {
    icon: AlertCircle,
    bgLight: "bg-rose-50 text-rose-600 border-rose-200",
    bgDark: "dark:bg-rose-950/60 dark:text-rose-400 dark:border-rose-800/60",
  },
  connection_request: {
    icon: User,
    bgLight: "bg-purple-50 text-purple-600 border-purple-200",
    bgDark: "dark:bg-purple-950/60 dark:text-purple-400 dark:border-purple-800/60",
  },
  review: {
    icon: Star,
    bgLight: "bg-amber-50 text-amber-600 border-amber-200",
    bgDark: "dark:bg-amber-950/60 dark:text-amber-400 dark:border-amber-800/60",
  },
  verification: {
    icon: ShieldCheck,
    bgLight: "bg-emerald-50 text-emerald-600 border-emerald-200",
    bgDark: "dark:bg-emerald-950/60 dark:text-emerald-400 dark:border-emerald-800/60",
  },
  favorite: {
    icon: Heart,
    bgLight: "bg-rose-50 text-rose-600 border-rose-200",
    bgDark: "dark:bg-rose-950/60 dark:text-rose-400 dark:border-rose-800/60",
  },
  listing: {
    icon: Store,
    bgLight: "bg-blue-50 text-blue-600 border-blue-200",
    bgDark: "dark:bg-blue-950/60 dark:text-blue-400 dark:border-blue-800/60",
  },
  default: {
    icon: Bell,
    bgLight: "bg-slate-100 text-slate-600 border-slate-200",
    bgDark: "dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700",
  },
};

function getConfig(type) {
  return TYPE_CONFIG[type] || TYPE_CONFIG.default;
}

function parseMessage(n) {
  if (n.message) return n.message;
  if (n.description) return n.description;
  if (n.payload) {
    try {
      const p = typeof n.payload === "string" ? JSON.parse(n.payload) : n.payload;
      if (p.message) return p.message;
      if (n.type === "review_reply") return `New reply on review for "${p.businessName || "your business"}"`;
      if (n.type === "claim_approved") return `🎉 Your claim for "${p.businessName || "your business"}" was Approved!`;
      if (n.type === "claim_rejected") return `⚠️ Claim rejected: ${p.rejectionReason || "Verification check failed"}`;
      return `Update regarding ${p.businessName || "your business"}`;
    } catch {
      return "New notification";
    }
  }
  return n.title || "New notification";
}

function formatDate(iso) {
  const d = new Date(iso || Date.now());
  const now = new Date();
  const isToday = d.toDateString() === now.toDateString();
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  const isYesterday = d.toDateString() === yesterday.toDateString();
  if (isToday) return "Today";
  if (isYesterday) return "Yesterday";
  return d.toLocaleDateString("en-US", { month: "long", day: "numeric" });
}

function timeAgo(iso) {
  const diff = Date.now() - new Date(iso || Date.now()).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

function groupByDate(notifications) {
  const groups = {};
  notifications.forEach((n) => {
    const label = formatDate(n.createdAt);
    if (!groups[label]) groups[label] = [];
    groups[label].push(n);
  });
  return groups;
}

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const result = await getNotifications();
      const list =
        result?.data?.notifications ||
        result?.notifications ||
        result?.data ||
        (Array.isArray(result) ? result : []);
      setNotifications(Array.isArray(list) ? list : []);
    } catch (err) {
      setError(err.message || "Couldn't load notifications");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const handleMarkRead = async (notif) => {
    if (notif.isRead || notif.read) return;
    setNotifications((prev) =>
      prev.map((n) => (n.id === notif.id ? { ...n, isRead: true, read: true } : n))
    );
    try {
      await markNotificationRead(notif.id);
    } catch {
      setNotifications((prev) =>
        prev.map((n) => (n.id === notif.id ? { ...n, isRead: false, read: false } : n))
      );
    }
  };

  const handleMarkAllRead = async () => {
    const unread = notifications.filter((n) => !n.isRead && !n.read);
    if (unread.length === 0) return;
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true, read: true })));
    await Promise.allSettled(unread.map((n) => markNotificationRead(n.id)));
  };

  const unreadCount = notifications.filter((n) => !n.isRead && !n.read).length;
  const grouped = groupByDate(notifications);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-72 gap-4">
        <div className="w-12 h-12 rounded-2xl flex items-center justify-center bg-blue-50 dark:bg-blue-950/50 border border-blue-200 dark:border-blue-800">
          <Loader2 className="w-6 h-6 animate-spin text-blue-600 dark:text-blue-400" />
        </div>
        <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">Loading notifications…</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-2xl p-6 text-center space-y-3 max-w-md mx-auto bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800">
        <AlertCircle className="w-8 h-8 text-rose-500 mx-auto" />
        <p className="text-sm font-bold text-rose-700 dark:text-rose-300">Unable to load notifications</p>
        <p className="text-xs text-rose-600 dark:text-rose-400">{error}</p>
        <button
          type="button"
          onClick={load}
          className="btn-secondary inline-flex mt-2"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Try again</span>
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-2xl space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-extrabold tracking-tight text-slate-900 dark:text-white">
            Notifications
          </h2>
          <p className="text-sm text-slate-600 dark:text-slate-400 mt-0.5">
            {unreadCount > 0 ? (
              <span>
                You have{" "}
                <span className="text-blue-600 dark:text-blue-400 font-bold">
                  {unreadCount} unread
                </span>{" "}
                notification{unreadCount !== 1 ? "s" : ""}
              </span>
            ) : (
              "You're all caught up ✓"
            )}
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <button
            type="button"
            onClick={load}
            className="topbar-control-btn"
            title="Refresh notifications"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
          {unreadCount > 0 && (
            <button
              type="button"
              onClick={handleMarkAllRead}
              className="btn-secondary"
            >
              <CheckCheck className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              <span>Mark all read</span>
            </button>
          )}
        </div>
      </div>

      {/* Empty State */}
      {notifications.length === 0 ? (
        <div className="empty-box py-16 space-y-3">
          <div className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
            <Bell className="w-7 h-7 text-slate-400 dark:text-slate-500" />
          </div>
          <p className="text-sm font-bold text-slate-700 dark:text-slate-300">No notifications yet</p>
          <p className="text-xs text-slate-500 dark:text-slate-400 max-w-xs mx-auto">
            Activity like reviews, claims, and customer saves will appear here.
          </p>
        </div>
      ) : (
        /* Grouped Notification List */
        <div className="space-y-5">
          {Object.entries(grouped).map(([dateLabel, items]) => (
            <div key={dateLabel}>
              {/* Date Group Header */}
              <div className="flex items-center gap-3 mb-2.5">
                <span className="text-[11px] font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400 whitespace-nowrap">
                  {dateLabel}
                </span>
                <div className="flex-1 h-px bg-slate-200 dark:bg-slate-800" />
                <span className="text-[11px] text-slate-400 dark:text-slate-500 whitespace-nowrap">
                  {items.length} item{items.length !== 1 ? "s" : ""}
                </span>
              </div>

              {/* Items Container */}
              <div className="rounded-2xl overflow-hidden bg-white dark:bg-[#101726] border border-slate-200/90 dark:border-slate-800 shadow-sm divide-y divide-slate-100 dark:divide-slate-800/80">
                {items.map((item, idx) => {
                  const isUnread = !item.isRead && !item.read;
                  const cfg = getConfig(item.type);
                  const Icon = cfg.icon;
                  return (
                    <div
                      key={item.id}
                      onClick={() => handleMarkRead(item)}
                      className={`flex items-start gap-3.5 p-4 sm:p-5 transition-colors cursor-pointer slide-in-up ${
                        isUnread
                          ? "bg-blue-50/50 dark:bg-blue-950/25 hover:bg-blue-50 dark:hover:bg-blue-950/40"
                          : "hover:bg-slate-50/80 dark:hover:bg-slate-800/40"
                      }`}
                      style={{ animationDelay: `${idx * 40}ms` }}
                    >
                      {/* Icon */}
                      <div
                        className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5 border ${cfg.bgLight} ${cfg.bgDark}`}
                      >
                        <Icon className="w-5 h-5" />
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <p
                            className={`text-sm font-bold leading-snug ${
                              isUnread
                                ? "text-slate-900 dark:text-white"
                                : "text-slate-700 dark:text-slate-300"
                            }`}
                          >
                            {item.title || "Notification"}
                          </p>
                          <span className="text-[11px] text-slate-400 dark:text-slate-500 whitespace-nowrap flex-shrink-0 mt-0.5 font-medium">
                            {timeAgo(item.createdAt)}
                          </span>
                        </div>
                        <p className="text-xs text-slate-600 dark:text-slate-300 mt-1 leading-relaxed">
                          {parseMessage(item)}
                        </p>
                        {isUnread && (
                          <p className="text-[10px] text-blue-600 dark:text-blue-400 mt-1.5 font-bold">
                            Click to mark as read
                          </p>
                        )}
                      </div>

                      {/* Unread dot */}
                      {isUnread && (
                        <span className="w-2.5 h-2.5 rounded-full self-center flex-shrink-0 bg-blue-600 dark:bg-blue-400" />
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
