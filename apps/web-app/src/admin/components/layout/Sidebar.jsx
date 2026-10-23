import { NavLink, Link } from 'react-router-dom'
import {
  LayoutGrid,
  Store,
  Building2,
  Flag,
  ShieldCheck,
  BarChart3,
  Users,
  Layers,
  MapPin,
} from 'lucide-react'
import { pages } from '../../pageConfig'
import { useAdminProfile } from '../../context/AdminProfileContext.jsx'

const ICONS = { LayoutGrid, Store, Building2, Flag, ShieldCheck, BarChart3, Users, Layers }

export default function Sidebar() {
  const { profile } = useAdminProfile()

  return (
    <aside className="sidebar">
      <div>
        <Link
          to="/"
          className="brand group focus:outline-none mb-2"
          title="Back to TrustNear Homepage"
        >
          <div className="w-10 h-10 rounded-xl flex items-center justify-center shadow-md flex-shrink-0 transition-transform duration-200 group-hover:scale-105 bg-emerald-600 text-white">
            <MapPin className="w-5 h-5 text-white stroke-[2.5]" />
          </div>
          <div>
            <div className="text-base font-extrabold tracking-tight leading-tight text-slate-900 dark:text-white">
              Trust<span className="text-amber-500">Near</span>
            </div>
            <div className="text-[10px] font-bold tracking-widest uppercase text-slate-400 dark:text-slate-500">
              Admin Governance
            </div>
          </div>
        </Link>

        <p className="nav-label">Core Moderation Queues</p>
        <nav className="nav">
          {pages.map((page) => {
            const Icon = ICONS[page.icon] || Store
            return (
              <NavLink
                key={page.id}
                to={page.path}
                end={page.path === '/admin'}
                className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
              >
                <Icon size={16} />
                {page.navLabel}
              </NavLink>
            )
          })}
        </nav>
      </div>

      <NavLink
        to="/admin/profile"
        title="Admin Profile & Settings"
        className={({ isActive }) => `sidebar-footer-btn ${isActive ? 'active' : ''}`}
      >
        {profile.avatarUrl ? (
          <img src={profile.avatarUrl} alt={profile.name} className="avatar-img" />
        ) : (
          <div className="avatar">{profile.name ? profile.name[0].toUpperCase() : 'F'}</div>
        )}
        <div className="user-info">
          <p className="user-name">{profile.name}</p>
          <p className="user-email">{profile.email}</p>
        </div>
      </NavLink>
    </aside>
  )
}
