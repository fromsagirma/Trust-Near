import { useState, useEffect, useRef } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import {
  Search,
  Shield,
  Sparkles,
  Sun,
  Moon,
  Bell,
  Store,
  Flag,
  ShieldCheck,
  CheckCircle2,
  Users,
  Layers,
  X,
  ArrowRight,
} from 'lucide-react'
import { useAdminProfile } from '../../context/AdminProfileContext.jsx'
import { getAdminAlerts } from '../../api/notifications'
import { getAllBusinesses } from '../../api/listings'
import { getUsers } from '../../api/users'
import { getCategories } from '../../api/categories'

export default function Header({ title, subtitle }) {
  const { profile, setTheme } = useAdminProfile()
  const [alerts, setAlerts] = useState([])
  const [totalAlerts, setTotalAlerts] = useState(0)
  const [isOpen, setIsOpen] = useState(false)
  const dropdownRef = useRef(null)
  const searchRef = useRef(null)
  const navigate = useNavigate()
  const location = useLocation()

  // Global Header Search States
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState({ businesses: [], users: [], categories: [] })
  const [isSearchOpen, setIsSearchOpen] = useState(false)
  const [isSearching, setIsSearching] = useState(false)

  // Live Notifications
  useEffect(() => {
    async function fetchAlerts() {
      const data = await getAdminAlerts()
      setAlerts(data.alerts || [])
      setTotalAlerts(data.totalAlerts || 0)
    }
    fetchAlerts()
    const interval = setInterval(fetchAlerts, 30000)
    return () => clearInterval(interval)
  }, [])

  // Outside click handler for both notifications and search dropdown
  useEffect(() => {
    function handleClickOutside(e) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setIsOpen(false)
      }
      if (searchRef.current && !searchRef.current.contains(e.target)) {
        setIsSearchOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Debounced search across live resources
  useEffect(() => {
    const query = searchQuery.trim().toLowerCase()
    if (!query) {
      setSearchResults({ businesses: [], users: [], categories: [] })
      setIsSearchOpen(false)
      return
    }

    const timer = setTimeout(async () => {
      setIsSearching(true)
      try {
        const [bizList, userList, catList] = await Promise.allSettled([
          getAllBusinesses({ search: query }),
          getUsers({ search: query }),
          getCategories(),
        ])

        const matchedBusinesses = (bizList.status === 'fulfilled' && Array.isArray(bizList.value))
          ? bizList.value.filter((b) =>
              (b.name || '').toLowerCase().includes(query) ||
              (b.landmarkDescription || '').toLowerCase().includes(query) ||
              (b.category || '').toLowerCase().includes(query)
            ).slice(0, 4)
          : []

        const matchedUsers = (userList.status === 'fulfilled' && Array.isArray(userList.value))
          ? userList.value.filter((u) =>
              (u.displayName || u.name || '').toLowerCase().includes(query) ||
              (u.email || '').toLowerCase().includes(query) ||
              (u.role || '').toLowerCase().includes(query)
            ).slice(0, 3)
          : []

        const matchedCategories = (catList.status === 'fulfilled' && Array.isArray(catList.value))
          ? catList.value.filter((c) =>
              (c.name || '').toLowerCase().includes(query) ||
              (c.slug || '').toLowerCase().includes(query)
            ).slice(0, 3)
          : []

        setSearchResults({
          businesses: matchedBusinesses,
          users: matchedUsers,
          categories: matchedCategories,
        })
        setIsSearchOpen(true)
      } catch (err) {
        console.error('Header search error:', err)
      } finally {
        setIsSearching(false)
      }
    }, 200)

    return () => clearTimeout(timer)
  }, [searchQuery])

  const handleAlertClick = (link) => {
    setIsOpen(false)
    navigate(link)
  }

  const handleSearchSubmit = (e) => {
    if (e.key === 'Enter' && searchQuery.trim()) {
      setIsSearchOpen(false)
      // Navigate to businesses with query or keep in context
      navigate(`/admin/businesses`)
    }
  }

  const handleSelectResult = (path) => {
    setIsSearchOpen(false)
    setSearchQuery('')
    navigate(path)
  }

  const hasResults =
    searchResults.businesses.length > 0 ||
    searchResults.users.length > 0 ||
    searchResults.categories.length > 0

  return (
    <header className="topbar">
      <div className="topbar-left">
        <div className="topbar-icon">
          <Shield size={18} />
        </div>
        <div>
          <h1 className="page-title">{title}</h1>
          {subtitle && <p className="page-subtitle">{subtitle}</p>}
        </div>
      </div>

      <div className="topbar-right" ref={dropdownRef}>
        {/* Global Live Search Bar */}
        <div className="search relative" ref={searchRef}>
          <Search size={15} className="search-icon" />
          <input
            type="text"
            placeholder="Search listings, users, categories..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onFocus={() => searchQuery.trim() && setIsSearchOpen(true)}
            onKeyDown={handleSearchSubmit}
            className="search-input pr-7"
          />
          {searchQuery && (
            <button
              onClick={() => {
                setSearchQuery('')
                setIsSearchOpen(false)
              }}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
            >
              <X size={13} />
            </button>
          )}

          {/* Live Search Instant Results Dropdown */}
          {isSearchOpen && (
            <div className="absolute left-0 top-12 w-84 rounded-xl border border-slate-200 bg-white shadow-2xl p-3 space-y-3 z-50 dark:bg-slate-900 dark:border-slate-800 text-left">
              {!hasResults && !isSearching && (
                <div className="py-4 text-center text-xs text-slate-400">
                  No matching listings, users, or categories found.
                </div>
              )}

              {isSearching && (
                <div className="py-3 text-center text-xs text-slate-400">
                  Searching database...
                </div>
              )}

              {/* Businesses Matches */}
              {searchResults.businesses.length > 0 && (
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1 px-1">
                    Businesses & Listings
                  </p>
                  <div className="space-y-1">
                    {searchResults.businesses.map((biz) => (
                      <button
                        key={biz.id}
                        onClick={() => handleSelectResult('/admin/businesses')}
                        className="w-full p-2 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors flex items-center justify-between text-left group"
                      >
                        <div className="flex items-center gap-2 overflow-hidden">
                          <Store size={14} className="text-emerald-600 shrink-0" />
                          <div className="truncate text-xs">
                            <span className="font-semibold text-slate-800 dark:text-slate-100">{biz.name}</span>
                            <span className="text-slate-400 ml-1 text-[11px]">({biz.category})</span>
                          </div>
                        </div>
                        <ArrowRight size={12} className="opacity-0 group-hover:opacity-100 text-slate-400 shrink-0" />
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Users Matches */}
              {searchResults.users.length > 0 && (
                <div className="border-t border-slate-100 dark:border-slate-800 pt-2">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1 px-1">
                    User Accounts
                  </p>
                  <div className="space-y-1">
                    {searchResults.users.map((user) => (
                      <button
                        key={user.id}
                        onClick={() => handleSelectResult('/admin/users')}
                        className="w-full p-2 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors flex items-center justify-between text-left group"
                      >
                        <div className="flex items-center gap-2 overflow-hidden">
                          <Users size={14} className="text-sky-600 shrink-0" />
                          <div className="truncate text-xs">
                            <span className="font-semibold text-slate-800 dark:text-slate-100">{user.displayName || user.name || user.email}</span>
                            <span className="text-slate-400 ml-1 text-[11px]">({user.role})</span>
                          </div>
                        </div>
                        <ArrowRight size={12} className="opacity-0 group-hover:opacity-100 text-slate-400 shrink-0" />
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Categories Matches */}
              {searchResults.categories.length > 0 && (
                <div className="border-t border-slate-100 dark:border-slate-800 pt-2">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1 px-1">
                    Categories
                  </p>
                  <div className="space-y-1">
                    {searchResults.categories.map((cat) => (
                      <button
                        key={cat.id}
                        onClick={() => handleSelectResult('/admin/categories')}
                        className="w-full p-2 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors flex items-center justify-between text-left group"
                      >
                        <div className="flex items-center gap-2 overflow-hidden">
                          <Layers size={14} className="text-amber-600 shrink-0" />
                          <span className="text-xs font-semibold text-slate-800 dark:text-slate-100">{cat.name}</span>
                        </div>
                        <ArrowRight size={12} className="opacity-0 group-hover:opacity-100 text-slate-400 shrink-0" />
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Notification Bell */}
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className="notif-btn"
          title="Governance Notifications & Action Queue"
        >
          <Bell size={16} className="text-slate-600 dark:text-slate-300" />
          {totalAlerts > 0 && (
            <span className="notif-badge">
              {totalAlerts > 9 ? '9+' : totalAlerts}
            </span>
          )}
        </button>

        {/* Notifications Dropdown */}
        {isOpen && (
          <div className="notif-dropdown">
            <div className="section-header">
              <span className="section-title text-xs font-bold">Admin Action Queue</span>
              <span className="badge-active text-[10px]">{totalAlerts} Pending</span>
            </div>

            <div className="queue-list">
              {alerts.length === 0 ? (
                <div className="empty-box py-6">
                  <CheckCircle2 size={24} className="mx-auto text-emerald-500 opacity-80" />
                  <p className="font-semibold text-slate-700 dark:text-slate-300">All Queues Clear</p>
                  <p className="text-[11px] text-slate-400">No pending approvals or moderation flags.</p>
                </div>
              ) : (
                alerts.map((alert) => (
                  <button
                    key={alert.id}
                    onClick={() => handleAlertClick(alert.link)}
                    className="notif-item"
                  >
                    <div className="mt-0.5 shrink-0 text-emerald-600 dark:text-emerald-400">
                      {alert.type === 'approval' && <Store size={16} />}
                      {alert.type === 'moderation' && <Flag size={16} className="text-rose-500" />}
                      {alert.type === 'claim' && <ShieldCheck size={16} className="text-sky-500" />}
                    </div>
                    <div className="flex-1 text-xs">
                      <p className="font-bold text-slate-900 dark:text-white leading-tight">
                        {alert.title}
                      </p>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                        {alert.desc}
                      </p>
                    </div>
                  </button>
                ))
              )}
            </div>
          </div>
        )}

        {/* Quick Theme Toggle */}
        <button
          type="button"
          onClick={() => setTheme(profile.theme === 'dark' ? 'light' : 'dark')}
          className="theme-toggle-btn"
          title={`Switch to ${profile.theme === 'dark' ? 'Light' : 'Dark'} Mode`}
        >
          {profile.theme === 'dark' ? <Sun size={16} className="text-amber-400" /> : <Moon size={16} className="text-slate-600" />}
        </button>

        <Link to="/admin/profile" className="role-badge">
          <Sparkles size={12} className="role-icon" />
          <span>{profile.role || 'Seed Admin'}</span>
        </Link>
      </div>
    </header>
  )
}
