import React from "react";

const statusStyles = {
  approved: "bg-emerald-950/80 text-emerald-300 border-emerald-800/80",
  pending: "bg-amber-950/80 text-amber-300 border-amber-800/80",
  rejected: "bg-rose-950/80 text-rose-300 border-rose-800/80",
  none: "bg-slate-800 text-slate-400 border-slate-700",
};

const statusLabels = {
  approved: "Verified ✓",
  pending: "Pending Review",
  rejected: "Rejected",
  none: "Not Verified",
};

export default function ClaimStatusBadge({ status = "none" }) {
  const style = statusStyles[status] || statusStyles.none;
  const label = statusLabels[status] || statusLabels.none;

  return (
    <span
      className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold border shadow-sm ${style}`}
    >
      {label}
    </span>
  );
}
