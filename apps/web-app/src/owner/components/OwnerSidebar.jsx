import React from "react";
import { NavLink, Link } from "react-router-dom";
import {
  MapPin,
  LayoutDashboard,
  Store,
  User,
  ShieldCheck,
  MessageSquare,
  Bell,
  BarChart3,
  Settings,
  LogOut,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";

const navItems = [
  { to: "/owner", label: "Dashboard", icon: LayoutDashboard, end: true },
  { to: "/owner/onboarding", label: "Add Business", icon: Store },
  { to: "/owner/profile", label: "Business Profile", icon: User },
  { to: "/owner/verification", label: "Verification", icon: ShieldCheck },
  { to: "/owner/reviews", label: "Reviews", icon: MessageSquare },
  { to: "/owner/notifications", label: "Notifications", icon: Bell },
  { to: "/owner/statistics", label: "Statistics", icon: BarChart3 },
  { to: "/owner/settings", label: "Settings", icon: Settings },
];

export default function OwnerSidebar({ onOpenLogoutModal }) {
  const { user } = useAuth();
  const initial = (user?.displayName || "O").charAt(0).toUpperCase();

  return (
    <aside className="sidebar">
      {/* Top section: Brand + Nav */}
      <div className="overflow-hidden flex-1 flex flex-col">
        {/* Brand Header */}
        <Link
          to="/"
          className="brand group focus:outline-none"
          title="Back to TrustNear Homepage"
        >
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center shadow-md flex-shrink-0 transition-transform duration-200 group-hover:scale-105 bg-blue-700 text-white"
          >
            <MapPin className="w-5 h-5 text-white stroke-[2.5]" />
          </div>
          <div>
            <div className="text-base font-extrabold tracking-tight leading-tight text-slate-900 dark:text-white">
              Trust<span className="text-amber-500">Near</span>
            </div>
            <div className="text-[10px] font-bold tracking-widest uppercase text-slate-400 dark:text-slate-500">
              Owner Portal
            </div>
          </div>
        </Link>

        {/* Navigation */}
        <div className="nav-label">Management</div>
        <nav className="nav">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                className={({ isActive }) =>
                  `nav-link${isActive ? " active" : ""}`
                }
              >
                <Icon className="w-4 h-4 flex-shrink-0" />
                <span>{item.label}</span>
              </NavLink>
            );
          })}
        </nav>
      </div>

      {/* Bottom: User Card & Logout */}
      <div className="sidebar-footer">
        <div className="flex items-center min-w-0 flex-1">
          <div className="avatar">{initial}</div>
          <div className="user-info">
            <div className="user-name truncate">
              {user?.displayName || "Business Owner"}
            </div>
            <div className="user-email truncate">
              {user?.email || user?.phone || "owner@trustnear.com"}
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={onOpenLogoutModal}
          className="p-2 rounded-xl transition-all duration-200 cursor-pointer ml-1.5 flex-shrink-0 bg-slate-100 dark:bg-slate-800/80 hover:bg-rose-50 dark:hover:bg-rose-950/40 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 border border-slate-200 dark:border-slate-700"
          title="Log Out"
          aria-label="Log Out of Owner Portal"
        >
          <LogOut className="w-4 h-4" />
        </button>
      </div>
    </aside>
  );
}
