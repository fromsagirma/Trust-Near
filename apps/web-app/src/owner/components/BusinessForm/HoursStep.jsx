import React, { useState } from "react";
import { ArrowRight, ArrowLeft } from "lucide-react";

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

export default function HoursStep({ data, onChange, onNext, onBack }) {
  const [hours, setHours] = useState(() => {
    if (data.hours && Object.keys(data.hours).length > 0) return data.hours;
    const initial = {};
    days.forEach((day) => {
      initial[day] = { ...defaultDayHours };
    });
    return initial;
  });

  const updateDay = (day, field, value) => {
    const updated = { ...hours, [day]: { ...hours[day], [field]: value } };
    setHours(updated);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onChange({ hours });
    onNext();
  };

  return (
    <form onSubmit={handleSubmit} className="section-card space-y-4">
      <div>
        <label className="form-label">Operating Hours</label>
        <div className="space-y-2.5 pt-1">
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
      </div>

      <div className="flex items-center justify-between pt-2">
        <button
          type="button"
          onClick={onBack}
          className="btn-secondary"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back</span>
        </button>
        <button type="submit" className="btn-primary">
          <span>Next: Photos</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </div>
    </form>
  );
}
