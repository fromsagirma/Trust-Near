import React, { useState } from "react";
import { ArrowRight, ArrowLeft, AlertCircle, MapPin } from "lucide-react";
import MapLocationPicker from "./MapLocationPicker";

export default function LocationStep({ data, onChange, onNext, onBack }) {
  const [errors, setErrors] = useState({});

  const handleCoordinatesChange = (lat, lng) => {
    onChange({ lat, lng });
    setErrors((prev) => ({ ...prev, gps: undefined }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const newErrors = {};
    if (data.lat === null || data.lng === null)
      newErrors.gps = "Set coordinates from the map or manual entry first";
    if (!data.landmark?.trim())
      newErrors.landmark = "Landmark description is required";

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }
    setErrors({});
    onNext();
  };

  return (
    <form onSubmit={handleSubmit} className="section-card space-y-5">
      <div>
        <label className="form-label mb-2 flex items-center gap-1.5">
          <MapPin className="w-4 h-4 text-blue-600 dark:text-blue-400" />
          <span>Location & GPS Coordinates *</span>
        </label>
        
        {/* Interactive Map Picker & Manual Coordinates */}
        <MapLocationPicker
          lat={data.lat}
          lng={data.lng}
          onChange={handleCoordinatesChange}
        />

        {errors.gps && (
          <p className="text-xs text-rose-500 dark:text-rose-400 mt-2 flex items-center gap-1 font-medium">
            <AlertCircle className="w-3.5 h-3.5" />
            <span>{errors.gps}</span>
          </p>
        )}
      </div>

      <div>
        <label className="form-label">Landmark Description *</label>
        <input
          type="text"
          value={data.landmark || ""}
          onChange={(e) => {
            onChange({ landmark: e.target.value });
            setErrors((prev) => ({ ...prev, landmark: undefined }));
          }}
          className={`input w-full ${errors.landmark ? "border-rose-500 ring-1 ring-rose-500" : ""}`}
          placeholder='e.g. "Behind St. Gabriel church, 50m from Total station, blue gate"'
          required
        />
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 font-medium">
          Describe it the way you'd give directions locally — this shows wherever a formal street address normally would.
        </p>
        {errors.landmark && (
          <p className="text-xs text-rose-500 dark:text-rose-400 mt-1.5 flex items-center gap-1 font-medium">
            <AlertCircle className="w-3.5 h-3.5" />
            <span>{errors.landmark}</span>
          </p>
        )}
      </div>

      <div className="flex items-center justify-between pt-2">
        <button type="button" onClick={onBack} className="btn-secondary">
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back</span>
        </button>
        <button type="submit" className="btn-primary">
          <span>Next: Hours</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </div>
    </form>
  );
}
