import React, { useState, useEffect } from "react";
import { Clock, CheckCircle2, AlertCircle, Loader2 } from "lucide-react";
import { updateBusiness } from "../../api/ownerApi";

const days = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday",
];
const defaultDayHours = { open: "09:00", close: "18:00", closed: false };

export default function HoursSection({ business, onSaved }) {
  const [hours, setHours] = useState(() => {
    if (business.hours && Object.keys(business.hours).length > 0)
      return business.hours;
    const initial = {};
    days.forEach((day) => {
      initial[day] = { ...defaultDayHours };
    });
    return initial;
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (business.hours && Object.keys(business.hours).length > 0) {
      setHours(business.hours);
    } else {
      const initial = {};
      days.forEach((day) => {
        initial[day] = { ...defaultDayHours };
      });
      setHours(initial);
    }
    setSaved(false);
  }, [business]);

  const updateDay = (day, field, value) => {
    setHours((prev) => ({ ...prev, [day]: { ...prev[day], [field]: value } }));
    setSaved(false);
  };

  const handleSave = async () => {
    setError("");
    setSaving(true);
    try {
      const res = await updateBusiness(business.id, { hours });
      const updated = res?.data || res;
      onSaved(updated);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err) {
      setError(err.message || "Couldn't save changes");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="section-card">
      <div className="section-header">
        <span className="section-title">
          <Clock className="w-4 h-4 text-amber-500" />
          <span>Operating Hours</span>
        </span>
      </div>

      <div className="space-y-2.5">
        {days.map((day) => (
          <div key={day} className="flex flex-wrap items-center gap-3 text-xs py-1.5 border-b border-slate-100 dark:border-slate-800/60 last:border-0">
            <span className="w-24 shrink-0 text-slate-800 dark:text-slate-200 font-bold">{day}</span>

            <label className="flex items-center gap-1.5 text-slate-600 dark:text-slate-400 cursor-pointer font-medium">
              <input
                type="checkbox"
                checked={hours[day]?.closed || false}
                onChange={(e) => updateDay(day, "closed", e.target.checked)}
                className="rounded border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-blue-600 focus:ring-blue-500"
              />
              <span>Closed</span>
            </label>

            {!hours[day]?.closed && (
              <div className="flex items-center gap-2">
                <input
                  type="time"
                  value={hours[day]?.open || "09:00"}
                  onChange={(e) => updateDay(day, "open", e.target.value)}
                  className="input !w-auto !py-1 !px-2"
                />
                <span className="text-slate-400 dark:text-slate-500 font-bold">–</span>
                <input
                  type="time"
                  value={hours[day]?.close || "18:00"}
                  onChange={(e) => updateDay(day, "close", e.target.value)}
                  className="input !w-auto !py-1 !px-2"
                />
              </div>
            )}
          </div>
        ))}
      </div>

      {error && (
        <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/70 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-xs flex items-center gap-2 mt-3">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <div className="flex items-center gap-3 pt-2">
        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          className="btn-primary"
        >
          {saving ? (
            <>
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              <span>Saving...</span>
            </>
          ) : (
            <span>Save Hours</span>
          )}
        </button>
        {saved && (
          <span className="inline-flex items-center gap-1 text-xs text-emerald-600 dark:text-emerald-400 font-bold">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>Saved ✓</span>
          </span>
        )}
      </div>
    </div>
  );
}
