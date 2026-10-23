import React, { useEffect } from "react";
import { LogOut, X, AlertTriangle } from "lucide-react";

export default function LogoutModal({ isOpen, onClose, onConfirm }) {
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "Escape" && isOpen) onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 fade-in bg-slate-900/60 dark:bg-black/80 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="logout-modal-title"
      onClick={onClose}
    >
      <div
        className="scale-in w-full max-w-md p-7 space-y-6 text-left relative rounded-3xl bg-white dark:bg-[#101726] border border-slate-200 dark:border-slate-800 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0 bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800/60">
              <AlertTriangle className="w-5 h-5 text-rose-600 dark:text-rose-400 stroke-[2.2]" />
            </div>
            <div>
              <h3
                id="logout-modal-title"
                className="text-lg font-bold tracking-tight text-slate-900 dark:text-white"
              >
                Log out of TrustNear?
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Session termination confirmation</p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 bg-slate-100 dark:bg-slate-800 transition-colors flex-shrink-0"
            aria-label="Close dialog"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Message */}
        <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed border-l-2 border-rose-500/40 pl-3 font-medium">
          Are you sure you want to log out? You will need to sign in again to manage your business listing and reply to customer reviews.
        </p>

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-3 pt-1">
          <button
            type="button"
            onClick={onClose}
            className="btn-secondary px-5 py-2.5"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="btn-danger !bg-rose-600 hover:!bg-rose-700 active:!bg-rose-800 !text-white px-5 py-2.5 shadow-md"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Log Out</span>
          </button>
        </div>
      </div>
    </div>
  );
}
