import React, { useState, useEffect, useRef, useCallback } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import {
  Sun,
  Moon,
  Bell,
  Settings,
  User,
  LogOut,
  ChevronDown,
  CheckCheck,
  Check,
  Star,
  ShieldCheck,
  Heart,
  Store,
  ExternalLink,
  MessageSquare,
  AlertCircle,
  Plus,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import {
  getNotifications,
  markNotificationRead,
  getMyBusinesses,
  getSelectedBusinessId,
  setSelectedBusinessId,
} from "../api/ownerApi";

// Map API notification types to icons + colors (light and dark friendly)
const TYPE_MAP = {
  review_reply: {
    icon: MessageSquare,
    bgLight: "bg-blue-50 text-blue-600 border-blue-200",
    bgDark: "dark:bg-blue-950/60 dark:text-blue-400 dark:border-blue-800/60",
  },
  claim_approved: {
    icon: ShieldCheck,
    bgLight: "bg-emerald-50 text-emerald-600 border-emerald-200",
    bgDark: "dark:bg-emerald-950/60 dark:text-emerald-400 dark:border-emerald-800/60",
  },
  claim_rejected: {
    icon: AlertCircle,
    bgLight: "bg-rose-50 text-rose-600 border-rose-200",
    bgDark: "dark:bg-rose-950/60 dark:text-rose-400 dark:border-rose-800/60",
  },
  connection_request: {
    icon: User,
    bgLight: "bg-purple-50 text-purple-600 border-purple-200",
    bgDark: "dark:bg-purple-950/60 dark:text-purple-400 dark:border-purple-800/60",
  },
  review: {
    icon: Star,
    bgLight: "bg-amber-50 text-amber-600 border-amber-200",
    bgDark: "dark:bg-amber-950/60 dark:text-amber-400 dark:border-amber-800/60",
  },
  verification: {
    icon: ShieldCheck,
    bgLight: "bg-emerald-50 text-emerald-600 border-emerald-200",
    bgDark: "dark:bg-emerald-950/60 dark:text-emerald-400 dark:border-emerald-800/60",
  },
  favorite: {
    icon: Heart,
    bgLight: "bg-rose-50 text-rose-600 border-rose-200",
    bgDark: "dark:bg-rose-950/60 dark:text-rose-400 dark:border-rose-800/60",
  },
  listing: {
    icon: Store,
    bgLight: "bg-blue-50 text-blue-600 border-blue-200",
    bgDark: "dark:bg-blue-950/60 dark:text-blue-400 dark:border-blue-800/60",
  },
  default: {
    icon: Bell,
    bgLight: "bg-slate-100 text-slate-600 border-slate-200",
    bgDark: "dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700",
  },
};

function getTypeConfig(type) {
  return TYPE_MAP[type] || TYPE_MAP.default;
}

function parseNotifMessage(n) {
  if (n.message) return n.message;
  if (n.description) return n.description;
  if (n.payload) {
    try {
      const p = typeof n.payload === "string" ? JSON.parse(n.payload) : n.payload;
      if (p.message) return p.message;
      if (n.type === "review_reply") return `New reply on review for "${p.businessName || "your business"}"`;
      if (n.type === "claim_approved") return `Your claim for "${p.businessName || "your business"}" was approved!`;
      if (n.type === "claim_rejected") return `Claim rejected: ${p.rejectionReason || "Verification check failed"}`;
      return `Update regarding ${p.businessName || "your business"}`;
    } catch {
      return "New notification";
    }
  }
  return n.title || "New notification";
}

function timeAgo(dateStr) {
  const now = Date.now();
  const then = new Date(dateStr || Date.now()).getTime();
  const diff = now - then;
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

// Page title map by pathname
const PAGE_TITLES = {
  "/owner": { title: "Business Dashboard", subtitle: "Monitor your performance & reviews" },
  "/owner/onboarding": { title: "Add Business", subtitle: "Register a new listing" },
  "/owner/profile": { title: "Business Profile", subtitle: "Manage your listing details" },
  "/owner/verification": { title: "Verification", subtitle: "Claim & verify your business" },
  "/owner/reviews": { title: "Customer Reviews", subtitle: "Read & reply to feedback" },
  "/owner/notifications": { title: "Notifications", subtitle: "Stay updated on activity" },
  "/owner/statistics": { title: "Statistics", subtitle: "Analytics & performance metrics" },
  "/owner/settings": { title: "Account Settings", subtitle: "Manage your credentials & session" },
};

export default function OwnerTopbar({ onOpenLogoutModal }) {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const initial = (user?.displayName || "O").charAt(0).toUpperCase();

  const pageInfo = PAGE_TITLES[location.pathname] || {
    title: "Owner Portal",
    subtitle: "Manage your business listing",
  };

  // Dark/Light Theme state with robust DOM synchronization
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

  // Dropdown States
  const [notifOpen, setNotifOpen] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);
  const [bizDropdownOpen, setBizDropdownOpen] = useState(false);
  const notifRef = useRef(null);
  const accountRef = useRef(null);
  const bizRef = useRef(null);

  // Multi-business state
  const [businesses, setBusinesses] = useState([]);
  const [selectedBizId, setSelectedBizIdState] = useState(getSelectedBusinessId());

  const loadBusinesses = useCallback(async () => {
    try {
      const list = await getMyBusinesses();
      setBusinesses(list);
      const currentId = getSelectedBusinessId();
      if (!currentId && list.length > 0) {
        setSelectedBusinessId(list[0].id);
        setSelectedBizIdState(list[0].id);
      } else {
        setSelectedBizIdState(currentId);
      }
    } catch (e) {
      console.warn("Could not load businesses:", e);
    }
  }, []);

  useEffect(() => {
    loadBusinesses();
    const handleBizChange = (e) => {
      setSelectedBizIdState(e?.detail?.businessId || getSelectedBusinessId());
      loadBusinesses();
    };
    window.addEventListener("trustnear:businessChanged", handleBizChange);
    return () => window.removeEventListener("trustnear:businessChanged", handleBizChange);
  }, [loadBusinesses]);

  const activeBusiness =
    businesses.find((b) => b.id === selectedBizId) || businesses[0] || null;

  // Real notifications from API
  const [notifications, setNotifications] = useState([]);
  const [notifLoading, setNotifLoading] = useState(false);

  const fetchNotifications = useCallback(async () => {
    setNotifLoading(true);
    try {
      const res = await getNotifications();
      const list =
        res?.data?.notifications ||
        res?.notifications ||
        res?.data ||
        (Array.isArray(res) ? res : []);
      setNotifications(Array.isArray(list) ? list : []);
    } catch {
      // silently fail
    } finally {
      setNotifLoading(false);
    }
  }, []);

  // Fetch on mount
  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  // Refresh when notification dropdown opens
  const handleOpenNotif = () => {
    setNotifOpen((prev) => {
      const next = !prev;
      if (next) fetchNotifications();
      return next;
    });
    setAccountOpen(false);
    setBizDropdownOpen(false);
  };

  const unreadCount = notifications.filter((n) => !n.isRead && !n.read).length;

  const handleMarkRead = async (notif) => {
    if (notif.isRead || notif.read) return;
    setNotifications((prev) =>
      prev.map((n) => (n.id === notif.id ? { ...n, isRead: true, read: true } : n))
    );
    try {
      await markNotificationRead(notif.id);
    } catch {
      setNotifications((prev) =>
        prev.map((n) => (n.id === notif.id ? { ...n, isRead: false, read: false } : n))
      );
    }
  };

  const markAllAsRead = async () => {
    const unread = notifications.filter((n) => !n.isRead && !n.read);
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true, read: true })));
    await Promise.allSettled(unread.map((n) => markNotificationRead(n.id)));
  };

  // Close on outside click / Escape
  useEffect(() => {
    function handleClickOutside(e) {
      if (notifRef.current && !notifRef.current.contains(e.target)) setNotifOpen(false);
      if (accountRef.current && !accountRef.current.contains(e.target)) setAccountOpen(false);
      if (bizRef.current && !bizRef.current.contains(e.target)) setBizDropdownOpen(false);
    }
    function handleKeyDown(e) {
      if (e.key === "Escape") {
        setNotifOpen(false);
        setAccountOpen(false);
        setBizDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  return (
    <header className="topbar">
      {/* Left: Dynamic Page Context & Active Business Selector */}
      <div className="topbar-left flex items-center gap-3">
        <div className="topbar-icon">
          <Store className="w-5 h-5 stroke-[2]" />
        </div>
        <div>
          <div className="page-title">{pageInfo.title}</div>
          <div className="page-subtitle">{pageInfo.subtitle}</div>
        </div>

        {/* Business Selector Pill */}
        {businesses.length > 0 && (
          <div className="relative ml-2 sm:ml-4" ref={bizRef}>
            <button
              type="button"
              onClick={() => {
                setBizDropdownOpen((p) => !p);
                setNotifOpen(false);
                setAccountOpen(false);
              }}
              className="flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-bold bg-slate-100 hover:bg-slate-200/80 dark:bg-slate-900/90 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800 transition-all text-slate-800 dark:text-slate-200 cursor-pointer shadow-sm"
              title="Switch Active Business"
            >
              <Store className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400 flex-shrink-0" />
              <span className="max-w-[120px] sm:max-w-[180px] truncate">
                {activeBusiness?.name || "Select Business"}
              </span>
              {businesses.length > 1 && (
                <span className="px-1.5 py-0.5 rounded-md text-[9px] font-extrabold bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                  {businesses.length}
                </span>
              )}
              <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
            </button>

            {/* Dropdown Menu */}
            {bizDropdownOpen && (
              <div className="scale-in absolute left-0 mt-2 w-72 sm:w-80 rounded-2xl z-50 overflow-hidden text-left bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 shadow-2xl divide-y divide-slate-100 dark:divide-slate-800/60">
                <div className="p-3 bg-slate-50/80 dark:bg-slate-900/60 flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-900 dark:text-white">Your Establishments</span>
                  <Link
                    to="/owner/onboarding"
                    onClick={() => setBizDropdownOpen(false)}
                    className="inline-flex items-center gap-1 text-[11px] font-bold text-blue-600 dark:text-blue-400 hover:underline"
                  >
                    <Plus className="w-3 h-3" />
                    <span>Add New</span>
                  </Link>
                </div>
                <div className="max-h-60 overflow-y-auto p-1.5 space-y-1">
                  {businesses.map((biz) => {
                    const isSelected = biz.id === (activeBusiness?.id);
                    return (
                      <button
                        key={biz.id}
                        type="button"
                        onClick={() => {
                          setSelectedBusinessId(biz.id);
                          setSelectedBizIdState(biz.id);
                          setBizDropdownOpen(false);
                        }}
                        className={`w-full flex items-center justify-between p-2.5 rounded-xl text-left transition-colors cursor-pointer ${
                          isSelected
                            ? "bg-blue-50 dark:bg-blue-950/50 text-blue-700 dark:text-blue-300 font-bold"
                            : "hover:bg-slate-50 dark:hover:bg-slate-800/50 text-slate-700 dark:text-slate-300 font-medium"
                        }`}
                      >
                        <div className="min-w-0 pr-2">
                          <p className="text-xs truncate">{biz.name}</p>
                          <p className="text-[10px] text-slate-400 dark:text-slate-500 capitalize">
                            {biz.category?.name || "Business"} • {biz.status}
                          </p>
                        </div>
                        {isSelected && <Check className="w-4 h-4 text-blue-600 dark:text-blue-400 flex-shrink-0" />}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Right Controls */}
      <div className="topbar-right">
        {/* 1. Theme Toggle */}
        <button
          type="button"
          onClick={() => setTheme((p) => (p === "dark" ? "light" : "dark"))}
          className="topbar-control-btn"
          title={`Switch to ${theme === "dark" ? "Light" : "Dark"} Mode`}
          aria-label="Toggle theme"
        >
          {theme === "dark" ? (
            <Sun className="w-4 h-4 text-amber-400" />
          ) : (
            <Moon className="w-4 h-4 text-slate-600" />
          )}
        </button>

        {/* 2. Notifications Bell */}
        <div className="relative" ref={notifRef}>
          <button
            type="button"
            onClick={handleOpenNotif}
            className="topbar-control-btn"
            title="Notifications"
            aria-label="View notifications"
            aria-expanded={notifOpen}
          >
            <Bell className={`w-4 h-4 ${unreadCount > 0 ? "text-blue-600 dark:text-blue-400" : ""}`} />
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 flex h-4 min-w-[1rem] items-center justify-center rounded-full px-1 text-[9px] font-bold text-white bg-blue-600 notif-pulse">
                {unreadCount > 9 ? "9+" : unreadCount}
              </span>
            )}
          </button>

          {/* Notifications Dropdown Panel */}
          {notifOpen && (
            <div className="scale-in absolute right-0 mt-2.5 w-80 sm:w-96 rounded-2xl z-50 overflow-hidden text-left bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 shadow-2xl">
              {/* Header */}
              <div className="flex items-center justify-between px-4 py-3.5 border-b border-slate-100 dark:border-slate-800/80 bg-slate-50/70 dark:bg-slate-900/50">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold text-slate-900 dark:text-white">
                    Notifications
                  </span>
                  {unreadCount > 0 && (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold text-blue-700 dark:text-blue-300 bg-blue-100 dark:bg-blue-950 border border-blue-200 dark:border-blue-800">
                      {unreadCount} new
                    </span>
                  )}
                </div>
                {unreadCount > 0 && (
                  <button
                    type="button"
                    onClick={markAllAsRead}
                    className="inline-flex items-center gap-1 text-[11px] font-bold text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 transition-colors"
                  >
                    <CheckCheck className="w-3.5 h-3.5" />
                    <span>Mark all read</span>
                  </button>
                )}
              </div>

              {/* Notification List */}
              <div className="max-h-80 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800/60">
                {notifLoading ? (
                  <div className="py-8 text-center text-xs text-slate-500">Loading…</div>
                ) : notifications.length === 0 ? (
                  <div className="py-10 text-center space-y-2">
                    <Bell className="w-7 h-7 text-slate-400 dark:text-slate-600 mx-auto" />
                    <p className="text-xs font-medium text-slate-600 dark:text-slate-400">You're all caught up!</p>
                  </div>
                ) : (
                  notifications.slice(0, 6).map((n) => {
                    const cfg = getTypeConfig(n.type);
                    const Icon = cfg.icon;
                    const isUnread = !n.isRead && !n.read;
                    return (
                      <div
                        key={n.id}
                        onClick={() => handleMarkRead(n)}
                        className={`p-3.5 flex items-start gap-3 transition-colors cursor-pointer ${
                          isUnread
                            ? "bg-blue-50/50 dark:bg-blue-950/25 hover:bg-blue-50 dark:hover:bg-blue-950/40"
                            : "hover:bg-slate-50 dark:hover:bg-slate-800/40"
                        }`}
                      >
                        <div
                          className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 border ${cfg.bgLight} ${cfg.bgDark}`}
                        >
                          <Icon className="w-4 h-4" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-1 mb-0.5">
                            <p className={`text-xs font-bold truncate ${isUnread ? "text-slate-900 dark:text-white" : "text-slate-700 dark:text-slate-300"}`}>
                              {n.title || "Notification"}
                            </p>
                            <span className="text-[10px] text-slate-400 dark:text-slate-500 whitespace-nowrap">
                              {timeAgo(n.createdAt)}
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-600 dark:text-slate-300 line-clamp-2 leading-relaxed">
                            {parseNotifMessage(n)}
                          </p>
                        </div>
                        {isUnread && (
                          <span className="w-2 h-2 rounded-full self-center flex-shrink-0 bg-blue-600 dark:bg-blue-400 shadow-sm" />
                        )}
                      </div>
                    );
                  })
                )}
              </div>

              {/* Footer */}
              <div className="p-2.5 text-center border-t border-slate-100 dark:border-slate-800/80 bg-slate-50/50 dark:bg-slate-900/40">
                <Link
                  to="/owner/notifications"
                  onClick={() => setNotifOpen(false)}
                  className="inline-flex items-center justify-center gap-1.5 text-xs font-bold text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 py-1 transition-colors"
                >
                  <span>View all notifications</span>
                  <ExternalLink className="w-3 h-3" />
                </Link>
              </div>
            </div>
          )}
        </div>

        {/* 3. Settings Shortcut */}
        <Link
          to="/owner/settings"
          className="topbar-control-btn"
          title="Account Settings"
          aria-label="Account Settings"
        >
          <Settings className="w-4 h-4" />
        </Link>

        {/* 4. Account Dropdown */}
        <div className="relative ml-1" ref={accountRef}>
          <button
            type="button"
            onClick={() => {
              setAccountOpen((p) => !p);
              setNotifOpen(false);
            }}
            className="flex items-center gap-2 py-1 px-2 rounded-xl cursor-pointer bg-slate-100 hover:bg-slate-200 dark:bg-slate-800/80 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 transition-all duration-200"
            aria-label="Account menu"
            aria-expanded={accountOpen}
          >
            <div className="w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold text-white bg-blue-700 dark:bg-blue-600 shadow-sm">
              {initial}
            </div>
            <span className="hidden sm:block text-xs font-bold text-slate-800 dark:text-slate-200 max-w-28 truncate">
              {user?.displayName || "Owner"}
            </span>
            <ChevronDown className={`w-3.5 h-3.5 text-slate-500 transition-transform duration-200 ${accountOpen ? "rotate-180" : ""}`} />
          </button>

          {/* Account Dropdown Panel */}
          {accountOpen && (
            <div className="scale-in absolute right-0 mt-2.5 w-60 rounded-2xl p-1.5 z-50 text-left bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 shadow-2xl">
              {/* User Identity */}
              <div className="px-3.5 py-3 border-b border-slate-100 dark:border-slate-800/80">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center text-base font-bold text-white mb-2 bg-blue-700 dark:bg-blue-600 shadow-sm">
                  {initial}
                </div>
                <p className="text-sm font-bold text-slate-900 dark:text-white truncate">
                  {user?.displayName || "Business Owner"}
                </p>
                <p className="text-[11px] font-bold mt-0.5 text-amber-600 dark:text-amber-400">
                  Business Owner
                </p>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate mt-0.5">
                  {user?.email || user?.phone || "owner@trustnear.com"}
                </p>
              </div>

              {/* Nav Items */}
              <div className="py-1 space-y-0.5 mt-1">
                <Link
                  to="/owner/profile"
                  onClick={() => setAccountOpen(false)}
                  className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-semibold text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800/70 transition-colors"
                >
                  <User className="w-4 h-4 text-slate-400 dark:text-slate-500" />
                  <span>Profile</span>
                </Link>
                <Link
                  to="/owner/settings"
                  onClick={() => setAccountOpen(false)}
                  className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-semibold text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800/70 transition-colors"
                >
                  <Settings className="w-4 h-4 text-slate-400 dark:text-slate-500" />
                  <span>Settings</span>
                </Link>
              </div>

              {/* Logout */}
              <div className="pt-1 mt-0.5 border-t border-slate-100 dark:border-slate-800/80">
                <button
                  type="button"
                  onClick={() => {
                    setAccountOpen(false);
                    if (onOpenLogoutModal) onOpenLogoutModal();
                  }}
                  className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-bold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors text-left cursor-pointer"
                >
                  <LogOut className="w-4 h-4" />
                  <span>Log Out</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
