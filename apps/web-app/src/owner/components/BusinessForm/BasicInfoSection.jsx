import React, { useState, useEffect } from "react";
import { Store, CheckCircle2, AlertCircle, Loader2, Phone } from "lucide-react";
import { updateBusiness } from "../../api/ownerApi";

const categories = ["restaurant", "cafe", "bar", "hotel", "guesthouse", "retail", "services", "other"];

export default function BasicInfoSection({ business, onSaved }) {
  const [form, setForm] = useState({
    name: business.name || "",
    category: business.category?.name || business.category || "",
    phone: business.phone || "",
    description: business.description || "",
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    setForm({
      name: business.name || "",
      category: business.category?.name || business.category || "",
      phone: business.phone || "",
      description: business.description || "",
    });
    setSaved(false);
  }, [business]);

  const handleChange = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    setSaved(false);
  };

  const handleSave = async () => {
    if (!form.name.trim() || !form.category) {
      setError("Business name and category are required");
      return;
    }
    setError("");
    setSaving(true);
    try {
      const res = await updateBusiness(business.id, form);
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
          <Store className="w-4 h-4 text-blue-600 dark:text-blue-400" />
          <span>Basic Information</span>
        </span>
      </div>

      <div className="space-y-4">
        <div>
          <label className="form-label">Business Name *</label>
          <input
            type="text"
            value={form.name}
            onChange={(e) => handleChange("name", e.target.value)}
            className="input w-full"
            placeholder="e.g. St. Gabriel Artisan Cafe"
            required
          />
        </div>

        <div>
          <label className="form-label">Category *</label>
          <select
            value={form.category}
            onChange={(e) => handleChange("category", e.target.value)}
            className="input w-full"
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
        </div>

        <div>
          <label className="form-label">Business Contact Phone (Public Listing)</label>
          <div className="relative">
            <input
              type="tel"
              value={form.phone}
              onChange={(e) => handleChange("phone", e.target.value)}
              className="input w-full pl-10"
              placeholder="e.g. +251 91 100 2233"
            />
            <Phone className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 font-medium">
            Displayed on your public storefront so customers can call this specific branch.
          </p>
        </div>

        <div>
          <label className="form-label">Description & Neighborhood Story</label>
          <textarea
            value={form.description}
            onChange={(e) => handleChange("description", e.target.value)}
            rows={3}
            className="textarea w-full"
            placeholder="Tell local residents what makes your spot unique..."
          />
        </div>

        {error && (
          <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/70 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <div className="flex items-center gap-3 pt-1">
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
              <span>Save Basic Info</span>
            )}
          </button>

          {saved && (
            <span className="inline-flex items-center gap-1 text-xs text-emerald-600 dark:text-emerald-400 font-bold">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Saved successfully</span>
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
