import React from "react";
import { CheckCircle2, AlertCircle, Star, MessageSquare, Bell } from "lucide-react";
import { markNotificationRead } from "../api/ownerApi";

const typeConfig = {
  claim_approved: {
    icon: CheckCircle2,
    bgLight: "bg-emerald-50 text-emerald-600 border-emerald-200",
    bgDark: "dark:bg-emerald-950/60 dark:text-emerald-400 dark:border-emerald-800/60",
  },
  claim_rejected: {
    icon: AlertCircle,
    bgLight: "bg-rose-50 text-rose-600 border-rose-200",
    bgDark: "dark:bg-rose-950/60 dark:text-rose-400 dark:border-rose-800/60",
  },
  new_review: {
    icon: Star,
    bgLight: "bg-amber-50 text-amber-600 border-amber-200",
    bgDark: "dark:bg-amber-950/60 dark:text-amber-400 dark:border-amber-800/60",
  },
  review_reply_needed: {
    icon: MessageSquare,
    bgLight: "bg-blue-50 text-blue-600 border-blue-200",
    bgDark: "dark:bg-blue-950/60 dark:text-blue-400 dark:border-blue-800/60",
  },
  default: {
    icon: Bell,
    bgLight: "bg-slate-100 text-slate-600 border-slate-200",
    bgDark: "dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700",
  },
};

export default function NotificationItem({ notification, onRead }) {
  const config = typeConfig[notification.type] || typeConfig.default;
  const Icon = config.icon;
  const isRead = Boolean(notification.isRead ?? notification.read);

  let displayMessage = notification.message;
  if (!displayMessage && notification.payload) {
    const p =
      typeof notification.payload === "string"
        ? JSON.parse(notification.payload)
        : notification.payload;
    if (notification.type === "review_reply") {
      displayMessage = `New reply on review for "${p.businessName || 'your business'}": "${p.replyText || ''}"`;
    } else if (notification.type === "claim_approved") {
      displayMessage = `🎉 Your ownership claim for "${p.businessName || 'your business'}" was Approved!`;
    } else if (notification.type === "claim_rejected") {
      displayMessage = `⚠️ Claim for "${p.businessName || 'business'}" rejected: ${p.rejectionReason || 'Verification check failed'}`;
    } else if (p.message) {
      displayMessage = p.message;
    } else {
      displayMessage = `Update regarding ${p.businessName || 'your business'}`;
    }
  }

  const handleClick = async () => {
    if (isRead) return;
    try {
      const updated = await markNotificationRead(notification.id);
      onRead(updated?.data || updated || { ...notification, isRead: true });
    } catch {
      onRead({ ...notification, isRead: true });
    }
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      className={`w-full text-left flex items-start gap-3.5 p-3.5 rounded-xl border transition-colors cursor-pointer ${
        isRead
          ? "border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-900/60 hover:bg-slate-100/70 dark:hover:bg-slate-800/50"
          : "border-blue-200 dark:border-blue-900/40 bg-blue-50/50 dark:bg-blue-950/20 hover:bg-blue-100/50 dark:hover:bg-blue-950/30"
      }`}
    >
      <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 border ${config.bgLight} ${config.bgDark}`}>
        <Icon className="w-4 h-4" />
      </div>

      <div className="flex-1 min-w-0">
        <p className={`text-xs sm:text-sm font-bold leading-snug ${isRead ? "text-slate-700 dark:text-slate-300" : "text-slate-900 dark:text-white"}`}>
          {displayMessage || "System Notification"}
        </p>
        <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 font-medium">
          {new Date(notification.createdAt || Date.now()).toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
            hour: "2-digit",
            minute: "2-digit",
          })}
        </p>
      </div>

      {!isRead && (
        <span className="w-2 h-2 rounded-full bg-blue-600 dark:bg-blue-400 shrink-0 mt-1.5" />
      )}
    </button>
  );
}
