import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Check, Loader2, AlertCircle, X } from "lucide-react";
import { createBusiness } from "../../api/ownerApi";

export default function PhotosStep({ data, onChange, onBack }) {
  const navigate = useNavigate();
  const [error, setError] = useState("");
  const [submitError, setSubmitError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleFileSelect = (e) => {
    const files = Array.from(e.target.files);
    if (files.length === 0) return;

    const previews = files.map((file) => ({
      file,
      previewUrl: URL.createObjectURL(file),
    }));

    onChange({ photos: [...data.photos, ...previews] });
    setError("");
  };

  const removePhoto = (index) => {
    const updated = data.photos.filter((_, i) => i !== index);
    onChange({ photos: updated });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (data.photos.length === 0) {
      setError("Add at least one photo before submitting");
      return;
    }

    setSubmitting(true);
    setSubmitError("");
    try {
      await createBusiness(data);
      navigate("/owner");
    } catch (err) {
      setSubmitError(err.message || "Something went wrong. Try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="section-card space-y-4">
      <div>
        <label className="form-label">Business Showcase Photos</label>
        <input
          type="file"
          accept="image/*"
          multiple
          onChange={handleFileSelect}
          className="text-xs text-slate-600 dark:text-slate-300 file:mr-3 file:py-2 file:px-3.5 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-blue-50 dark:file:bg-slate-800 file:text-blue-700 dark:file:text-blue-400 hover:file:bg-blue-100 dark:hover:file:bg-slate-700 cursor-pointer"
        />
        {error && (
          <p className="text-xs text-rose-500 dark:text-rose-400 mt-1.5 flex items-center gap-1 font-medium">
            <AlertCircle className="w-3.5 h-3.5" />
            <span>{error}</span>
          </p>
        )}
      </div>

      {data.photos.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {data.photos.map((photo, index) => (
            <div
              key={index}
              className="relative group rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 aspect-video shadow-sm"
            >
              <img
                src={photo.previewUrl}
                alt={`Business photo ${index + 1}`}
                className="w-full h-full object-cover"
              />
              <button
                type="button"
                onClick={() => removePhoto(index)}
                className="absolute top-1.5 right-1.5 bg-slate-900/80 hover:bg-rose-600 text-white rounded-lg p-1 transition-colors"
                aria-label="Remove photo"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}

      {submitError && (
        <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/70 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          <span>{submitError}</span>
        </div>
      )}

      <div className="flex items-center justify-between pt-2">
        <button
          type="button"
          onClick={onBack}
          className="btn-secondary"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back</span>
        </button>
        <button
          type="submit"
          disabled={submitting}
          className="btn-primary"
        >
          {submitting ? (
            <>
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              <span>Submitting listing...</span>
            </>
          ) : (
            <>
              <Check className="w-3.5 h-3.5" />
              <span>Publish Listing</span>
            </>
          )}
        </button>
      </div>
    </form>
  );
}
