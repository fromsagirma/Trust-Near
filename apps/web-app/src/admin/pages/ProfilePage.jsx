import { useState, useEffect } from 'react'
import {
  User,
  Shield,
  Sparkles,
  Sun,
  Moon,
  Lock,
  CheckCircle2,
  AlertCircle,
  ShieldCheck,
  LogOut,
} from 'lucide-react'
import Layout from '../components/layout/Layout.jsx'
import { useAdminProfile } from '../context/AdminProfileContext.jsx'

export default function ProfilePage() {
  const { profile, updateProfile, setTheme, updatePassword } = useAdminProfile()

  // Form states
  const [name, setName] = useState(profile.name)
  const [email, setEmail] = useState(profile.email)
  const [phone, setPhone] = useState(profile.phone || '')
  const [language, setLanguage] = useState(profile.language || 'English')
  const [avatarUrl, setAvatarUrl] = useState(profile.avatarUrl || '')
  const [emailAlerts, setEmailAlerts] = useState(profile.emailAlerts ?? true)
  const [twoFactor, setTwoFactor] = useState(profile.twoFactorEnabled ?? true)

  // Keep local form state in sync if profile changes
  useEffect(() => {
    setName(profile.name)
    setEmail(profile.email)
    setPhone(profile.phone || '')
    setLanguage(profile.language || 'English')
    setAvatarUrl(profile.avatarUrl || '')
    setEmailAlerts(profile.emailAlerts ?? true)
    setTwoFactor(profile.twoFactorEnabled ?? true)
  }, [profile])

  // Feedback messages
  const [profileMsg, setProfileMsg] = useState(null)
  const [passwordMsg, setPasswordMsg] = useState(null)
  const [showLogoutModal, setShowLogoutModal] = useState(false)

  // Password fields
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')

  const handleSaveProfile = (e) => {
    e.preventDefault()
    updateProfile({
      name: name.trim(),
      email: email.trim(),
      phone: phone.trim(),
      language,
      avatarUrl: avatarUrl.trim(),
      emailAlerts,
      twoFactorEnabled: twoFactor,
    })
    setProfileMsg({ type: 'success', text: 'Admin profile updated successfully!' })
    setTimeout(() => setProfileMsg(null), 4000)
  }

  const handlePasswordUpdate = async (e) => {
    e.preventDefault()
    if (!currentPassword) {
      setPasswordMsg({ type: 'error', text: 'Please enter your current password.' })
      return
    }
    if (newPassword.length < 6) {
      setPasswordMsg({ type: 'error', text: 'New password must be at least 6 characters long.' })
      return
    }
    if (newPassword !== confirmPassword) {
      setPasswordMsg({ type: 'error', text: 'New passwords do not match.' })
      return
    }

    try {
      await updatePassword(currentPassword, newPassword)
      setPasswordMsg({ type: 'success', text: 'Password successfully updated!' })
      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
      setTimeout(() => setPasswordMsg(null), 4000)
    } catch (err) {
      setPasswordMsg({ type: 'error', text: err.message })
    }
  }

  const handleLogout = () => {
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    localStorage.removeItem('trustnear_token')
    localStorage.removeItem('trustnear_admin_profile')
    window.location.href = '/login'
  }

  const isDark = profile.theme === 'dark'

  return (
    <Layout
      title="Admin Profile & Settings"
      subtitle="Manage your identity credentials, theme preferences, language, and security access."
    >
      {/* Profile Overview Card */}
      <div className="section-card">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-5">
          <div className="flex items-center gap-4">
            <div className="relative group shrink-0">
              {profile.avatarUrl ? (
                <img
                  src={profile.avatarUrl}
                  alt={profile.name}
                  className="w-16 h-16 rounded-full object-cover border-2 border-emerald-500 shadow-sm"
                />
              ) : (
                <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center font-display font-bold text-2xl border-2 border-emerald-500 shadow-sm dark:bg-emerald-950 dark:text-emerald-300">
                  {profile.name ? profile.name[0].toUpperCase() : 'A'}
                </div>
              )}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-display text-lg font-bold text-slate-900 dark:text-white">{profile.name}</h2>
                <span className="badge-admin flex items-center gap-1">
                  <Sparkles size={11} /> {profile.role}
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{profile.email}</p>
              <p className="text-[11px] text-emerald-700 dark:text-emerald-400 font-medium mt-1">
                Admin ID: <strong className="font-mono">{profile.id.toUpperCase()}</strong> • Active Session
              </p>
            </div>
          </div>

          <div className="action-row flex-wrap">
            <button
              type="button"
              onClick={() => setShowLogoutModal(true)}
              className="btn-reject"
              title="Sign out of admin session"
            >
              <LogOut size={13} />
              <span>Log Out</span>
            </button>

            <span className="badge-active">
              <CheckCircle2 size={11} /> Verified Admin Status
            </span>
          </div>
        </div>
      </div>

      {/* 2-Column Grid: Profile Info & Interface Preferences */}
      <div className="grid-2">
        {/* Column 1: Personal Details Form */}
        <div className="section-card">
          <div className="section-header">
            <div>
              <h3 className="section-title">
                <User size={16} className="text-emerald-600" />
                Personal Information
              </h3>
              <p className="section-subtitle">Update your display name, contact email, and avatar</p>
            </div>
          </div>

          {profileMsg && (
            <div className={profileMsg.type === 'success' ? 'alert-success' : 'alert-error'}>
              {profileMsg.type === 'success' ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
              <span>{profileMsg.text}</span>
            </div>
          )}

          <form onSubmit={handleSaveProfile} className="space-y-4">
            <div className="form-group">
              <label className="form-label">Full Name *</label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="input w-full"
              />
            </div>

            <div className="form-group">
              <label className="form-label">Official Admin Email *</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="input w-full"
              />
            </div>

            <div className="form-group">
              <label className="form-label">Contact Phone Number</label>
              <input
                type="tel"
                placeholder="+251 91 100 2233"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="input w-full"
              />
            </div>

            <div className="form-group">
              <label className="form-label">Profile Picture URL</label>
              <input
                type="url"
                placeholder="https://images.unsplash.com/... or paste image URL"
                value={avatarUrl}
                onChange={(e) => setAvatarUrl(e.target.value)}
                className="input w-full"
              />
              <p className="text-[11px] text-slate-400 mt-1">Leave empty to use initial avatar.</p>
            </div>

            <div className="form-group">
              <label className="form-label">Language Preference</label>
              <select
                value={language}
                onChange={(e) => setLanguage(e.target.value)}
                className="select w-full"
              >
                <option value="English">English (Default)</option>
                <option value="Amharic">Amharic (አማርኛ)</option>
                <option value="Oromo">Afaan Oromoo</option>
              </select>
            </div>

            <div className="pt-2">
              <button type="submit" className="btn-primary w-full justify-center">
                Save Profile Changes
              </button>
            </div>
          </form>
        </div>

        {/* Column 2: Appearance & Security Controls */}
        <div className="space-y-6">
          {/* Appearance & Theme Selection */}
          <div className="section-card">
            <div className="section-header">
              <div>
                <h3 className="section-title">
                  <Sun size={16} className="text-amber-500" />
                  Appearance & Theme
                </h3>
                <p className="section-subtitle">Click to switch immediately between light and dark modes</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 pt-1">
              <button
                type="button"
                onClick={() => setTheme('light')}
                className={`p-4 rounded-xl border text-left transition-all cursor-pointer ${
                  !isDark
                    ? 'border-emerald-500 bg-emerald-50/40 dark:bg-emerald-950/20 shadow-sm ring-2 ring-emerald-500/20'
                    : 'border-slate-200 bg-white hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:hover:bg-slate-800/60'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="w-8 h-8 rounded-lg bg-amber-100 text-amber-600 flex items-center justify-center">
                    <Sun size={18} />
                  </div>
                  {!isDark && (
                    <span className="badge-active text-[10px]">
                      Active
                    </span>
                  )}
                </div>
                <p className="text-xs font-bold text-slate-900 dark:text-white">Light Mode</p>
                <p className="text-[11px] text-slate-500 mt-0.5">Standard crisp interface</p>
              </button>

              <button
                type="button"
                onClick={() => setTheme('dark')}
                className={`p-4 rounded-xl border text-left transition-all cursor-pointer ${
                  isDark
                    ? 'border-emerald-500 bg-emerald-950/40 shadow-sm ring-2 ring-emerald-500/20'
                    : 'border-slate-200 bg-white hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:hover:bg-slate-800/60'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="w-8 h-8 rounded-lg bg-indigo-950 text-indigo-400 flex items-center justify-center">
                    <Moon size={18} />
                  </div>
                  {isDark && (
                    <span className="badge-active text-[10px]">
                      Active
                    </span>
                  )}
                </div>
                <p className="text-xs font-bold text-slate-900 dark:text-white">Dark Mode</p>
                <p className="text-[11px] text-slate-500 mt-0.5">High-contrast night view</p>
              </button>
            </div>
          </div>

          {/* Security & Password Update */}
          <div className="section-card">
            <div className="section-header">
              <div>
                <h3 className="section-title">
                  <Lock size={16} className="text-rose-500" />
                  Security & Password
                </h3>
                <p className="section-subtitle">Manage administrative password and two-factor authentication</p>
              </div>
            </div>

            {passwordMsg && (
              <div className={passwordMsg.type === 'success' ? 'alert-success' : 'alert-error'}>
                {passwordMsg.type === 'success' ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
                <span>{passwordMsg.text}</span>
              </div>
            )}

            <form onSubmit={handlePasswordUpdate} className="space-y-3">
              <div className="form-group">
                <label className="form-label">Current Password *</label>
                <input
                  type="password"
                  placeholder="••••••••"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  className="input w-full"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="form-group">
                  <label className="form-label">New Password *</label>
                  <input
                    type="password"
                    placeholder="Min 6 chars"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="input w-full"
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Confirm New Password *</label>
                  <input
                    type="password"
                    placeholder="Repeat password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="input w-full"
                  />
                </div>
              </div>

              <div className="pt-2">
                <button type="submit" className="btn-secondary w-full justify-center">
                  Update Password
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>

      {/* Logout Confirmation Modal */}
      {showLogoutModal && (
        <div className="modal-overlay">
          <div className="modal-card">
            <h3 className="modal-title">Confirm Sign Out</h3>
            <p className="modal-body">
              Are you sure you want to sign out of your administrative session? You will need your credentials to log back in.
            </p>
            <div className="modal-actions">
              <button
                type="button"
                onClick={() => setShowLogoutModal(false)}
                className="btn-secondary"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleLogout}
                className="btn-danger flex items-center gap-1.5"
              >
                <LogOut size={13} />
                <span>Log Out</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </Layout>
  )
}
