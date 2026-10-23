import React, { useState } from "react";
import { Send, Loader2, AlertCircle } from "lucide-react";
import { replyToReview } from "../api/ownerApi";

export default function ReplyBox({ review, onReplied }) {
  const [replyText, setReplyText] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!replyText.trim()) {
      setError("Reply cannot be empty");
      return;
    }
    setError("");
    setSubmitting(true);
    try {
      const updated = await replyToReview(review.id, replyText);
      onReplied(updated);
    } catch (err) {
      setError(err.message || "Couldn't send reply");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="mt-3 pl-3.5 border-l-2 border-slate-700 space-y-2.5"
    >
      <textarea
        value={replyText}
        onChange={(e) => setReplyText(e.target.value)}
        rows={2}
        placeholder="Write a public response to your guest..."
        className="textarea"
      />
      {error && (
        <div className="flex items-center gap-1.5 text-xs text-rose-400">
          <AlertCircle className="w-3.5 h-3.5" />
          <span>{error}</span>
        </div>
      )}
      <div className="flex items-center gap-2">
        <button
          type="submit"
          disabled={submitting}
          className="btn-primary"
        >
          {submitting ? (
            <>
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              <span>Sending...</span>
            </>
          ) : (
            <>
              <Send className="w-3.5 h-3.5" />
              <span>Post Reply</span>
            </>
          )}
        </button>
      </div>
    </form>
  );
}
