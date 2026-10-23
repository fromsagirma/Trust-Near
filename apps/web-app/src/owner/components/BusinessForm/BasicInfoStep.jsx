import React, { useState } from "react";
import { ArrowRight, AlertCircle, Phone, Store } from "lucide-react";

const categories = ["restaurant", "cafe", "bar", "hotel", "guesthouse", "retail", "services", "other"];

export default function BasicInfoStep({ data, onChange, onNext }) {
  const [errors, setErrors] = useState({});

  const handleSubmit = (e) => {
    e.preventDefault();
    const newErrors = {};
    if (!data.name?.trim()) newErrors.name = "Business name is required";
    if (!data.category) newErrors.category = "Select a category";

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }
    setErrors({});
    onNext();
  };

  return (
    <form onSubmit={handleSubmit} className="section-card space-y-4">
      <div>
        <label className="form-label">Business Name *</label>
        <input
          type="text"
          value={data.name || ""}
          onChange={(e) => onChange({ name: e.target.value })}
          className={`input w-full ${errors.name ? "border-rose-500 ring-1 ring-rose-500" : ""}`}
          placeholder="e.g. Habesha Artisan Cafe"
          required
        />
        {errors.name && (
          <p className="text-xs text-rose-500 dark:text-rose-400 mt-1.5 flex items-center gap-1 font-medium">
            <AlertCircle className="w-3.5 h-3.5" />
            <span>{errors.name}</span>
          </p>
        )}
      </div>

      <div>
        <label className="form-label">Category *</label>
        <select
          value={data.category || ""}
          onChange={(e) => onChange({ category: e.target.value })}
          className={`input w-full ${errors.category ? "border-rose-500 ring-1 ring-rose-500" : ""}`}
          required
        >
          <option value="" className="bg-white dark:bg-slate-900 text-slate-500 dark:text-slate-400">
            Select a category
          </option>
          {categories.map((cat) => (
            <option key={cat} value={cat} className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100">
              {cat.charAt(0).toUpperCase() + cat.slice(1)}
            </option>
          ))}
        </select>
        {errors.category && (
          <p className="text-xs text-rose-500 dark:text-rose-400 mt-1.5 flex items-center gap-1 font-medium">
            <AlertCircle className="w-3.5 h-3.5" />
            <span>{errors.category}</span>
          </p>
        )}
      </div>

      <div>
        <label className="form-label">Business Phone Number (Public Listing)</label>
        <div className="relative">
          <input
            type="tel"
            value={data.phone || ""}
            onChange={(e) => onChange({ phone: e.target.value })}
            className="input w-full pl-10"
            placeholder="e.g. +251 91 100 2233"
          />
          <Phone className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
        </div>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 font-medium">
          Displayed publicly on this specific listing so local customers can call for inquiries or orders.
        </p>
      </div>

      <div>
        <label className="form-label">Description & Neighborhood Story</label>
        <textarea
          value={data.description || ""}
          onChange={(e) => onChange({ description: e.target.value })}
          rows={3}
          className="textarea w-full"
          placeholder="What makes this spot special for local residents?"
        />
      </div>

      <div className="flex justify-end pt-2">
        <button type="submit" className="btn-primary">
          <span>Next: Location</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </div>
    </form>
  );
}
