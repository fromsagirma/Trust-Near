import React, { useState } from "react";
import { Image, Upload, X, CheckCircle2, AlertCircle, Loader2 } from "lucide-react";
import { updateBusinessPhotos, uploadPhoto } from "../../api/ownerApi";

export default function PhotosSection({ business, onSaved }) {
  const [photos, setPhotos] = useState(business.photos || []);
  const [newFiles, setNewFiles] = useState([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);

  const handleFileSelect = (e) => {
    const files = Array.from(e.target.files);
    if (files.length === 0) return;

    const previews = files.map((file) => ({
      file,
      previewUrl: URL.createObjectURL(file),
      isNew: true,
    }));
    setNewFiles((prev) => [...prev, ...previews]);
    setSaved(false);
  };

  const removeExistingPhoto = (index) => {
    setPhotos((prev) => prev.filter((_, i) => i !== index));
    setSaved(false);
  };

  const removeNewPhoto = (index) => {
    setNewFiles((prev) => prev.filter((_, i) => i !== index));
    setSaved(false);
  };

  const handleSave = async () => {
    setError("");
    setSaving(true);
    try {
      const existingUrls = photos
        .map((p) => (typeof p === "string" ? p : p.url || p.previewUrl))
        .filter((u) => u && !u.startsWith("blob:"));

      const newUploadPromises = newFiles.map((item) => uploadPhoto(item.file));
      const newlyUploadedUrls = (await Promise.all(newUploadPromises)).filter(Boolean);

      const allUrls = [...existingUrls, ...newlyUploadedUrls];

      const updated = await updateBusinessPhotos(business.id, allUrls);
      setPhotos(allUrls);
      setNewFiles([]);
      onSaved(updated?.data || updated || { ...business, photos: allUrls });
      setSaved(true);
    } catch (err) {
      setError(err.message || "Couldn't save photos");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="section-card">
      <div className="section-header">
        <span className="section-title">
          <Image className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
          <span>Listing Photos</span>
        </span>
      </div>

      <div className="space-y-4">
        <div>
          <label className="form-label">Upload Showcase Photos</label>
          <input
            type="file"
            accept="image/*"
            multiple
            onChange={handleFileSelect}
            className="text-xs text-slate-600 dark:text-slate-300 file:mr-3 file:py-2 file:px-3.5 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-blue-50 dark:file:bg-slate-800 file:text-blue-700 dark:file:text-blue-400 hover:file:bg-blue-100 dark:hover:file:bg-slate-700 cursor-pointer"
          />
        </div>

        {(photos.length > 0 || newFiles.length > 0) && (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 pt-1">
            {photos.map((photo, index) => (
              <div
                key={`existing-${index}`}
                className="relative group rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 aspect-video shadow-sm"
              >
                <img
                  src={photo.url || photo.previewUrl}
                  alt={`Business photo ${index + 1}`}
                  className="w-full h-full object-cover"
                />
                <button
                  type="button"
                  onClick={() => removeExistingPhoto(index)}
                  className="absolute top-1.5 right-1.5 bg-slate-900/80 hover:bg-rose-600 text-white rounded-lg p-1 transition-colors"
                  aria-label="Remove photo"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
            {newFiles.map((photo, index) => (
              <div
                key={`new-${index}`}
                className="relative group rounded-xl overflow-hidden border border-blue-500/50 bg-slate-100 dark:bg-slate-800 aspect-video ring-2 ring-blue-500/20"
              >
                <img
                  src={photo.previewUrl}
                  alt={`New photo ${index + 1}`}
                  className="w-full h-full object-cover"
                />
                <button
                  type="button"
                  onClick={() => removeNewPhoto(index)}
                  className="absolute top-1.5 right-1.5 bg-slate-900/80 hover:bg-rose-600 text-white rounded-lg p-1 transition-colors"
                  aria-label="Remove photo"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        )}

        {error && (
          <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/70 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-xs flex items-center gap-2">
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
                <span>Saving photos...</span>
              </>
            ) : (
              <span>Save Photos</span>
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
    </div>
  );
}
