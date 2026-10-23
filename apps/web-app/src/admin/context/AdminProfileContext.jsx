import { createContext, useContext, useState, useEffect } from 'react'
import apiClient from '../api/client'

const DEFAULT_PROFILE = {
  id: 'adm-001',
  name: 'Fira (Lead Admin)',
  email: 'fira@trustnear.et',
  phone: '+251 91 100 2233',
  role: 'Seed Admin',
  roleDescription: 'Full system privileges & Fast-Path auto-publish clearance.',
  avatarUrl: '',
  theme: 'light',
  language: 'English',
  twoFactorEnabled: true,
  emailAlerts: true,
  createdAt: '2026-01-10T08:00:00Z',
  lastLogin: '2026-08-17T07:15:00Z',
}

const AdminProfileContext = createContext(null)

export function AdminProfileProvider({ children }) {
  const [profile, setProfile] = useState(() => {
    try {
      const stored = localStorage.getItem('tn_admin_profile')
      if (stored) {
        const parsed = JSON.parse(stored)
        return { ...DEFAULT_PROFILE, ...parsed }
      }
    } catch (err) {
      console.error('Failed to load stored profile:', err)
    }
    return DEFAULT_PROFILE
  })

  // Synchronize <html>, <body>, and localStorage with theme state
  useEffect(() => {
    const isDark = profile.theme === 'dark'
    if (isDark) {
      document.documentElement.classList.add('dark')
      document.body.classList.add('dark')
    } else {
      document.documentElement.classList.remove('dark')
      document.body.classList.remove('dark')
    }

    try {
      localStorage.setItem('tn_admin_profile', JSON.stringify(profile))
    } catch (err) {
      console.error('Failed to save profile to localStorage:', err)
    }
  }, [profile.theme, profile])

  // Attempt to fetch current logged-in user profile from backend on mount
  useEffect(() => {
    async function loadLiveUserProfile() {
      const token = localStorage.getItem('token') || localStorage.getItem('trustnear_admin_token')
      if (!token) return

      try {
        const res = await apiClient.get('/auth/me')
        const user = res.data?.user || res.data || res
        if (user && user.displayName) {
          setProfile((prev) => ({
            ...prev,
            id: user.id || prev.id,
            name: user.displayName,
            email: user.email || prev.email,
            phone: user.phone || prev.phone,
            role: user.role === 'seed_admin' ? 'Seed Admin' : (user.role === 'admin' ? 'Admin' : prev.role),
            avatarUrl: user.profilePhotoUrl || prev.avatarUrl,
            language: user.languagePref === 'am' ? 'Amharic' : 'English',
          }))
        }
      } catch {
        // Silent catch: if offline or guest, use stored profile
      }
    }
    loadLiveUserProfile()
  }, [])

  const updateProfile = async (newValues) => {
    setProfile((prev) => ({ ...prev, ...newValues }))

    // If connected to backend, optionally sync display name / language
    const token = localStorage.getItem('token') || localStorage.getItem('trustnear_admin_token')
    if (token) {
      try {
        await apiClient.patch('/users/me', {
          displayName: newValues.name,
          phone: newValues.phone,
          languagePref: newValues.language === 'Amharic' ? 'am' : 'en',
        })
      } catch (e) {
        console.warn('Backend user profile sync skipped:', e.message)
      }
    }
  }

  const setTheme = (theme) => {
    const isDark = theme === 'dark'
    if (isDark) {
      document.documentElement.classList.add('dark')
      document.body.classList.add('dark')
    } else {
      document.documentElement.classList.remove('dark')
      document.body.classList.remove('dark')
    }
    setProfile((prev) => {
      const updated = { ...prev, theme }
      try {
        localStorage.setItem('tn_admin_profile', JSON.stringify(updated))
      } catch (e) {
        console.error(e)
      }
      return updated
    })
  }

  const toggleTheme = () => {
    const nextTheme = profile.theme === 'dark' ? 'light' : 'dark'
    setTheme(nextTheme)
  }

  const updatePassword = async (currentPass, newPass) => {
    if (!newPass || newPass.length < 6) {
      throw new Error('New password must be at least 6 characters.')
    }
    return { success: true }
  }

  return (
    <AdminProfileContext.Provider
      value={{
        profile,
        updateProfile,
        setTheme,
        toggleTheme,
        updatePassword,
      }}
    >
      {children}
    </AdminProfileContext.Provider>
  )
}

export function useAdminProfile() {
  const context = useContext(AdminProfileContext)
  if (!context) {
    throw new Error('useAdminProfile must be used within an AdminProfileProvider')
  }
  return context
}
