import React, { useState, useEffect } from "react";
import { MapPin, CheckCircle2, AlertCircle, Loader2 } from "lucide-react";
import { updateBusiness } from "../../api/ownerApi";
import MapLocationPicker from "./MapLocationPicker";

export default function LocationSection({ business, onSaved }) {
  const [form, setForm] = useState({
    lat: business.location?.lat ?? business.lat ?? null,
    lng: business.location?.lng ?? business.lng ?? null,
    landmark: business.landmarkDescription || business.landmark || "",
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    setForm({
      lat: business.location?.lat ?? business.lat ?? null,
      lng: business.location?.lng ?? business.lng ?? null,
      landmark: business.landmarkDescription || business.landmark || "",
    });
    setSaved(false);
  }, [business]);

  const handleCoordinatesChange = (lat, lng) => {
    setForm((prev) => ({ ...prev, lat, lng }));
    setSaved(false);
  };

  const handleSave = async () => {
    if (form.lat === null || form.lng === null) {
      setError("Set coordinates from the map or manual entry first");
      return;
    }
    if (!form.landmark?.trim()) {
      setError("Landmark description is required for local discovery");
      return;
    }
    setError("");
    setSaving(true);
    try {
      const res = await updateBusiness(business.id, {
        landmark: form.landmark,
        landmarkDescription: form.landmark,
      });
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
          <MapPin className="w-4 h-4 text-blue-600 dark:text-blue-400" />
          <span>Location & Coordinates</span>
        </span>
      </div>

      <div className="space-y-4">
        {/* Map Picker Component */}
        <MapLocationPicker
          lat={form.lat}
          lng={form.lng}
          onChange={handleCoordinatesChange}
        />

        <div>
          <label className="form-label">Landmark Description</label>
          <input
            type="text"
            value={form.landmark}
            onChange={(e) => {
              setForm((prev) => ({ ...prev, landmark: e.target.value }));
              setSaved(false);
            }}
            className="input w-full"
            placeholder='e.g. "Behind St. Gabriel church, blue gate"'
          />
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 font-medium">
            Describe it the way you'd give directions locally — this shows wherever a formal street address normally would.
          </p>
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
              <span>Save Location</span>
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
