import React, { useState } from "react";
import { Star, MessageSquare, CornerDownRight } from "lucide-react";
import ReplyBox from "./ReplyBox";

export default function ReviewCard({ review, onReviewUpdated }) {
  const [showReplyBox, setShowReplyBox] = useState(false);
  const replyContent = review.ownerReply || review.reply;
  const hasReply = Boolean(replyContent);
  const reviewerName =
    review.user?.displayName ||
    review.userName ||
    review.reviewerName ||
    "Verified Customer";

  const handleReplied = (updated) => {
    onReviewUpdated(updated);
    setShowReplyBox(false);
  };

  return (
    <div className="section-card !p-5 space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div>
          <span className="text-sm font-bold text-slate-900 dark:text-white tracking-tight">
            {reviewerName}
          </span>
          <div className="flex items-center gap-0.5 mt-1">
            {[1, 2, 3, 4, 5].map((s) => (
              <Star
                key={s}
                className={`w-3.5 h-3.5 ${
                  s <= review.rating
                    ? "fill-amber-400 text-amber-400"
                    : "text-slate-300 dark:text-slate-700"
                }`}
              />
            ))}
          </div>
        </div>
        <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">
          {new Date(review.createdAt || Date.now()).toLocaleDateString("en-US", {
            year: "numeric",
            month: "short",
            day: "numeric",
          })}
        </span>
      </div>

      {review.comment && (
        <p className="text-sm text-slate-700 dark:text-slate-200 leading-relaxed">
          "{review.comment}"
        </p>
      )}

      {hasReply ? (
        <div className="mt-3 pl-3.5 border-l-2 border-blue-600 bg-blue-50/70 dark:bg-blue-950/30 p-3 rounded-r-xl space-y-1">
          <p className="text-xs font-bold text-blue-700 dark:text-blue-300 flex items-center gap-1.5">
            <CornerDownRight className="w-3.5 h-3.5" />
            <span>Owner Response</span>
          </p>
          <p className="text-xs sm:text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
            {replyContent}
          </p>
        </div>
      ) : showReplyBox ? (
        <ReplyBox review={review} onReplied={handleReplied} />
      ) : (
        <div className="pt-2 border-t border-slate-100 dark:border-slate-800/80">
          <button
            type="button"
            onClick={() => setShowReplyBox(true)}
            className="inline-flex items-center gap-1.5 text-xs font-bold text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 transition-colors"
          >
            <MessageSquare className="w-3.5 h-3.5" />
            <span>Reply to customer</span>
          </button>
        </div>
      )}
    </div>
  );
}
