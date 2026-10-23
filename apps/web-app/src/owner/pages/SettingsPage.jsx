import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  User,
  Sun,
  Moon,
  Lock,
  LogOut,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Eye,
  EyeOff,
  Phone,
} from "lucide-react";
import { updateProfile, changePassword, uploadPhoto } from "../api/ownerApi";
import { useAuth } from "../context/AuthContext";
import LogoutModal from "../components/LogoutModal";

export default function SettingsPage() {
  const navigate = useNavigate();
  const { user: storedUser, updateUser, logout } = useAuth();

  // Personal Information States
  const [displayName, setDisplayName] = useState(storedUser?.displayName || "");
  const [email] = useState(storedUser?.email || "");
  const [phone, setPhone] = useState(storedUser?.phone || "");
  const [profilePhotoUrl, setProfilePhotoUrl] = useState(storedUser?.profilePhotoUrl || "");
  const [photoUploading, setPhotoUploading] = useState(false);

  const [profileSaving, setProfileSaving] = useState(false);
  const [profileError, setProfileError] = useState("");
  const [profileSaved, setProfileSaved] = useState(false);

  const handlePhotoUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setPhotoUploading(true);
    setProfileError("");
    try {
      const uploadedUrl = await uploadPhoto(file);
      if (uploadedUrl) {
        setProfilePhotoUrl(uploadedUrl);
        const res = await updateProfile({ profilePhotoUrl: uploadedUrl });
        const updated = res?.data || res;
        if (updated && typeof updated === "object") {
          updateUser(updated);
        }
        setProfileSaved(true);
        setTimeout(() => setProfileSaved(false), 3500);
      }
    } catch (err) {
      setProfileError(err.message || "Failed to upload profile photo");
    } finally {
      setPhotoUploading(false);
    }
  };

  // Appearance & Theme State
  const [theme, setTheme] = useState(() => localStorage.getItem("theme") || "dark");

  useEffect(() => {
    const isDark = theme === "dark";
    const root = document.documentElement;
    if (isDark) {
      root.classList.add("dark");
      root.classList.remove("light");
    } else {
      root.classList.remove("dark");
      root.classList.add("light");
    }
    localStorage.setItem("theme", theme);
  }, [theme]);

  // Security & Password States
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showCurrentPw, setShowCurrentPw] = useState(false);
  const [showNewPw, setShowNewPw] = useState(false);
  const [passwordSaving, setPasswordSaving] = useState(false);
  const [passwordError, setPasswordError] = useState("");
  const [passwordSaved, setPasswordSaved] = useState(false);

  const [logoutModalOpen, setLogoutModalOpen] = useState(false);

  const handleProfileSave = async (e) => {
    e.preventDefault();
    if (!displayName.trim()) {
      setProfileError("Display name cannot be empty");
      return;
    }
    setProfileError("");
    setProfileSaving(true);
    try {
      const res = await updateProfile({
        displayName: displayName.trim(),
        phone: phone.trim() || undefined,
      });
      const updated = res?.data || res;
      if (updated && typeof updated === "object") {
        updateUser(updated);
      }
      setProfileSaved(true);
      setTimeout(() => setProfileSaved(false), 3500);
    } catch (err) {
      setProfileError(err.message || "Couldn't update profile");
    } finally {
      setProfileSaving(false);
    }
  };

  const handlePasswordSave = async (e) => {
    e.preventDefault();
    if (!currentPassword) {
      setPasswordError("Current password is required");
      return;
    }
    if (newPassword.length < 6) {
      setPasswordError("New password must be at least 6 characters");
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError("New passwords do not match");
      return;
    }

    setPasswordError("");
    setPasswordSaving(true);
    try {
      await changePassword(currentPassword, newPassword);
      setPasswordSaved(true);
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setTimeout(() => setPasswordSaved(false), 3500);
    } catch (err) {
      setPasswordError(err.message || "Couldn't change password");
    } finally {
      setPasswordSaving(false);
    }
  };

  const handleConfirmLogout = () => {
    setLogoutModalOpen(false);
    logout();
    navigate("/login");
  };

  const initial = (storedUser?.displayName || "O").charAt(0).toUpperCase();

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* ─────────────────────────────────────────────────────────────
          1. TOP USER IDENTITY HEADER BANNER
      ───────────────────────────────────────────────────────────── */}
      <div className="section-card !p-5 sm:!p-6 flex items-center justify-between gap-4">
        {/* Left: Avatar + Details */}
        <div className="flex items-center gap-4 min-w-0">
          <div className="relative flex-shrink-0 group">
            {profilePhotoUrl ? (
              <img
                src={profilePhotoUrl}
                alt={storedUser?.displayName || "Profile"}
                className="w-14 h-14 rounded-2xl object-cover shadow-md border border-slate-200 dark:border-slate-700"
              />
            ) : (
              <div className="w-14 h-14 rounded-2xl flex items-center justify-center text-xl font-extrabold text-white bg-blue-700 dark:bg-blue-600 shadow-md">
                {initial}
              </div>
            )}
            <label
              className="absolute inset-0 rounded-2xl bg-black/40 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer text-[10px] font-bold"
              title="Change profile photo"
            >
              {photoUploading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Change"}
              <input
                type="file"
                accept="image/*"
                onChange={handlePhotoUpload}
                className="hidden"
                disabled={photoUploading}
              />
            </label>
            <span className="absolute -bottom-1 -right-1 w-4 h-4 bg-emerald-500 rounded-full ring-2 ring-white dark:ring-[#101726]" />
          </div>

          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-lg sm:text-xl font-extrabold text-slate-900 dark:text-white tracking-tight truncate">
                {storedUser?.displayName || "Business Owner"}
              </h2>
              <span className="px-2.5 py-0.5 rounded-md text-[10px] font-extrabold uppercase tracking-wider bg-amber-100 text-amber-800 dark:bg-amber-950/70 dark:text-amber-300 border border-amber-300 dark:border-amber-800">
                Business Owner
              </span>
            </div>
          </div>
        </div>

        {/* Right: Log Out Button */}
        <div className="flex items-center flex-shrink-0">
          <button
            type="button"
            onClick={() => setLogoutModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 border border-rose-200 dark:border-rose-800/60 transition-colors cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Log Out</span>
          </button>
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────────
          2. MAIN 2-COLUMN SETTINGS GRID
      ───────────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* ── LEFT COLUMN: Personal Information (7 Cols) ── */}
        <div className="lg:col-span-7">
          <form onSubmit={handleProfileSave} className="section-card space-y-4">
            <div className="section-header">
              <div>
                <span className="section-title">
                  <User className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                  <span>Personal Information</span>
                </span>
                <p className="section-subtitle mt-0.5">
                  Update your display name and contact phone number
                </p>
              </div>
            </div>

            <div>
              <label className="form-label">Full Name *</label>
              <input
                type="text"
                value={displayName}
                onChange={(e) => {
                  setDisplayName(e.target.value);
                  setProfileSaved(false);
                }}
                className="input"
                placeholder="e.g. Abebe Balcha"
                required
              />
            </div>

            <div>
              <label className="form-label">Official Owner Email *</label>
              <input
                type="email"
                value={email}
                disabled
                className="input bg-slate-100 dark:bg-slate-900/50 opacity-70 cursor-not-allowed"
              />
            </div>

            <div>
              <label className="form-label">Contact Phone Number</label>
              <div className="relative">
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => {
                    setPhone(e.target.value);
                    setProfileSaved(false);
                  }}
                  className="input pl-10"
                  placeholder="+251 91 100 2233"
                />
                <Phone className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              </div>
            </div>

            {profileError && (
              <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>{profileError}</span>
              </div>
            )}

            {profileSaved && (
              <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 text-xs flex items-center gap-2 font-bold">
                <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
                <span>Profile changes saved successfully!</span>
              </div>
            )}

            <div className="pt-2">
              <button
                type="submit"
                disabled={profileSaving}
                className="btn-primary w-full py-3 text-sm font-bold"
              >
                {profileSaving ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Saving Profile Changes...</span>
                  </>
                ) : (
                  <span>Save Profile Changes</span>
                )}
              </button>
            </div>
          </form>
        </div>

        {/* ── RIGHT COLUMN: Appearance & Security (5 Cols) ── */}
        <div className="lg:col-span-5 space-y-6">
          {/* 1. Appearance & Theme Card */}
          <div className="section-card space-y-4">
            <div className="section-header">
              <div>
                <span className="section-title">
                  <Sun className="w-4 h-4 text-amber-500" />
                  <span>Appearance & Theme</span>
                </span>
                <p className="section-subtitle mt-0.5">
                  Click to switch immediately between light and dark modes
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 pt-1">
              {/* Light Mode Card */}
              <button
                type="button"
                onClick={() => setTheme("light")}
                className={`flex flex-col items-start p-4 rounded-2xl border text-left transition-all duration-200 cursor-pointer relative ${
                  theme === "light"
                    ? "bg-blue-50/70 border-blue-600 dark:bg-blue-950/40 ring-2 ring-blue-500/20"
                    : "bg-slate-50/70 dark:bg-slate-900/50 border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700"
                }`}
              >
                {theme === "light" && (
                  <span className="absolute top-3 right-3 px-2 py-0.5 rounded-full text-[9px] font-extrabold uppercase tracking-wider bg-blue-600 text-white">
                    ACTIVE
                  </span>
                )}
                <div className="w-9 h-9 rounded-xl flex items-center justify-center bg-amber-100 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 mb-3 border border-amber-200 dark:border-amber-800">
                  <Sun className="w-5 h-5" />
                </div>
                <p className="text-xs font-bold text-slate-900 dark:text-white">
                  Light Mode
                </p>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 leading-snug">
                  Standard crisp interface
                </p>
              </button>

              {/* Dark Mode Card */}
              <button
                type="button"
                onClick={() => setTheme("dark")}
                className={`flex flex-col items-start p-4 rounded-2xl border text-left transition-all duration-200 cursor-pointer relative ${
                  theme === "dark"
                    ? "bg-blue-50/70 border-blue-600 dark:bg-blue-950/40 ring-2 ring-blue-500/20"
                    : "bg-slate-50/70 dark:bg-slate-900/50 border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700"
                }`}
              >
                {theme === "dark" && (
                  <span className="absolute top-3 right-3 px-2 py-0.5 rounded-full text-[9px] font-extrabold uppercase tracking-wider bg-blue-600 text-white">
                    ACTIVE
                  </span>
                )}
                <div className="w-9 h-9 rounded-xl flex items-center justify-center bg-slate-200 dark:bg-slate-800 text-slate-800 dark:text-slate-200 mb-3 border border-slate-300 dark:border-slate-700">
                  <Moon className="w-5 h-5" />
                </div>
                <p className="text-xs font-bold text-slate-900 dark:text-white">
                  Dark Mode
                </p>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 leading-snug">
                  High-contrast night view
                </p>
              </button>
            </div>
          </div>

          {/* 2. Security & Password Card */}
          <form onSubmit={handlePasswordSave} className="section-card space-y-4">
            <div className="section-header">
              <div>
                <span className="section-title">
                  <Lock className="w-4 h-4 text-rose-500" />
                  <span>Security & Password</span>
                </span>
                <p className="section-subtitle mt-0.5">
                  Manage account password and credential security
                </p>
              </div>
            </div>

            <div>
              <label className="form-label">Current Password *</label>
              <div className="relative">
                <input
                  type={showCurrentPw ? "text" : "password"}
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  className="input pr-10"
                  placeholder="••••••••"
                  autoComplete="current-password"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowCurrentPw((p) => !p)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
                >
                  {showCurrentPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="form-label">New Password *</label>
                <div className="relative">
                  <input
                    type={showNewPw ? "text" : "password"}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="input pr-10"
                    placeholder="Min 6 chars"
                    autoComplete="new-password"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPw((p) => !p)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
                  >
                    {showNewPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="form-label">Confirm New Password *</label>
                <input
                  type={showNewPw ? "text" : "password"}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="input"
                  placeholder="Repeat password"
                  autoComplete="new-password"
                  required
                />
              </div>
            </div>

            {passwordError && (
              <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>{passwordError}</span>
              </div>
            )}

            {passwordSaved && (
              <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 text-xs flex items-center gap-2 font-bold">
                <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
                <span>Password updated successfully!</span>
              </div>
            )}

            <div className="pt-2">
              <button
                type="submit"
                disabled={passwordSaving}
                className="btn-secondary w-full py-2.5 text-xs font-bold"
              >
                {passwordSaving ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Updating Password...</span>
                  </>
                ) : (
                  <span>Update Password</span>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* Logout Confirmation Modal */}
      <LogoutModal
        isOpen={logoutModalOpen}
        onClose={() => setLogoutModalOpen(false)}
        onConfirm={handleConfirmLogout}
      />
    </div>
  );
}
