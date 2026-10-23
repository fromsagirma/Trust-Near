import React, { useState, useEffect, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  MapPin,
  Menu,
  X,
  User,
  Store,
  LayoutDashboard,
  LogOut,
  ChevronDown,
  Shield,
} from "lucide-react";

function readStoredUser() {
  try {
    const raw = localStorage.getItem("user");
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export default function Navbar() {
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);
  const [user, setUser] = useState(readStoredUser);
  const accountRef = useRef(null);

  // Sync user from localStorage on route changes / focus
  useEffect(() => {
    const sync = () => setUser(readStoredUser());
    window.addEventListener("focus", sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener("focus", sync);
      window.removeEventListener("storage", sync);
    };
  }, []);

  // Close dropdown on outside click / Escape
  useEffect(() => {
    function handleClick(e) {
      if (accountRef.current && !accountRef.current.contains(e.target)) {
        setAccountOpen(false);
      }
    }
    function handleKey(e) {
      if (e.key === "Escape") setAccountOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    document.addEventListener("keydown", handleKey);
    return () => {
      document.removeEventListener("mousedown", handleClick);
      document.removeEventListener("keydown", handleKey);
    };
  }, []);

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("refreshToken");
    localStorage.removeItem("user");
    setUser(null);
    setAccountOpen(false);
    navigate("/");
  };

  const navLinks = [
    { name: "Home", href: "#home" },
    { name: "Features", href: "#features" },
    { name: "About", href: "#about" },
    { name: "Contact", href: "#contact" },
  ];

  const role = user?.role;
  const isOwner = role === "business_owner" || role === "owner";
  const isAdmin = role === "admin" || role === "seed_admin";
  const initial = (user?.displayName || "U").charAt(0).toUpperCase();

  return (
    <header className="sticky top-0 z-50 bg-white/95 backdrop-blur-md border-b border-slate-100 transition-all">
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        <div className="flex items-center justify-between h-16 sm:h-20">

          {/* Logo */}
          <Link
            to="/"
            className="flex items-center gap-2 group focus:outline-none"
            aria-label="TrustNear Home"
          >
            <div
              className="w-8 h-8 rounded-lg flex items-center justify-center text-white shadow-sm"
              style={{ backgroundColor: "#1E40AF" }}
            >
              <MapPin className="w-4 h-4 text-white stroke-[2.2]" />
            </div>
            <span className="text-xl font-bold tracking-tight text-slate-900">
              Trust<span style={{ color: "#F59E0B" }}>Near</span>
            </span>
          </Link>

          {/* Desktop Nav Links */}
          <nav className="hidden md:flex items-center gap-7">
            {navLinks.map((link) => (
              <a
                key={link.name}
                href={link.href}
                className="text-sm font-medium text-slate-500 hover:text-slate-900 transition-colors py-1"
              >
                {link.name}
              </a>
            ))}
          </nav>

          {/* Desktop Right Actions */}
          <div className="hidden md:flex items-center gap-3">
            {user ? (
              /* Logged-in account dropdown */
              <div className="relative" ref={accountRef}>
                <button
                  type="button"
                  onClick={() => setAccountOpen((p) => !p)}
                  className="flex items-center gap-2 px-3 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 hover:border-slate-300 transition-all duration-200 focus:outline-none shadow-sm"
                  aria-label="Account menu"
                  aria-expanded={accountOpen}
                >
                  <div
                    className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold text-white"
                    style={{ background: "linear-gradient(135deg,#1d4ed8,#4f46e5)" }}
                  >
                    {initial}
                  </div>
                  <span className="text-sm font-semibold text-slate-700 max-w-[120px] truncate">
                    {user.displayName || "Account"}
                  </span>
                  <ChevronDown
                    className={`w-3.5 h-3.5 text-slate-400 transition-transform duration-200 ${accountOpen ? "rotate-180" : ""}`}
                  />
                </button>

                {/* Account Dropdown */}
                {accountOpen && (
                  <div
                    className="scale-in absolute right-0 mt-2.5 w-56 rounded-2xl z-50 overflow-hidden text-left shadow-xl"
                    style={{
                      background: "#ffffff",
                      border: "1px solid #e2e8f0",
                      boxShadow: "0 20px 50px rgba(0,0,0,0.12), 0 4px 12px rgba(0,0,0,0.06)",
                    }}
                  >
                    {/* User identity */}
                    <div className="px-4 py-3" style={{ borderBottom: "1px solid #f1f5f9" }}>
                      <div
                        className="w-10 h-10 rounded-xl flex items-center justify-center text-base font-bold text-white mb-2"
                        style={{ background: "linear-gradient(135deg,#1d4ed8,#4f46e5)" }}
                      >
                        {initial}
                      </div>
                      <p className="text-sm font-bold text-slate-900 truncate">
                        {user.displayName || "User"}
                      </p>
                      <p className="text-[11px] font-semibold mt-0.5" style={{ color: "#F59E0B" }}>
                        {isAdmin ? "Admin" : isOwner ? "Business Owner" : "User"}
                      </p>
                      <p className="text-[10px] text-slate-400 truncate mt-0.5">
                        {user.email || user.phone || ""}
                      </p>
                    </div>

                    {/* Portal links strictly based on role */}
                    <div className="p-1.5 space-y-0.5">
                      {isOwner && (
                        <Link
                          to="/owner"
                          onClick={() => setAccountOpen(false)}
                          className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-50 transition-colors"
                        >
                          <Store className="w-4 h-4 text-blue-500" />
                          <span>Owner Portal</span>
                        </Link>
                      )}
                      {isAdmin && (
                        <Link
                          to="/admin"
                          onClick={() => setAccountOpen(false)}
                          className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-50 transition-colors"
                        >
                          <Shield className="w-4 h-4 text-purple-500" />
                          <span>Admin Panel</span>
                        </Link>
                      )}
                      {isOwner && (
                        <Link
                          to="/owner/settings"
                          onClick={() => setAccountOpen(false)}
                          className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-50 transition-colors"
                        >
                          <User className="w-4 h-4 text-slate-400" />
                          <span>Account Settings</span>
                        </Link>
                      )}
                    </div>

                    {/* Logout */}
                    <div className="p-1.5 pt-0" style={{ borderTop: "1px solid #f1f5f9" }}>
                      <button
                        type="button"
                        onClick={handleLogout}
                        className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-semibold text-rose-500 hover:text-rose-600 hover:bg-rose-50 transition-colors text-left cursor-pointer"
                      >
                        <LogOut className="w-4 h-4" />
                        <span>Log Out</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              /* Not logged in */
              <>
                <Link
                  to="/login"
                  className="text-sm font-medium text-slate-600 hover:text-slate-900 px-3.5 py-2 rounded-lg hover:bg-slate-100/70 transition-colors"
                >
                  Log In
                </Link>
                <Link
                  to="/register"
                  className="inline-flex items-center justify-center px-4 py-2 text-sm font-semibold text-white rounded-lg shadow-sm transition-all hover:opacity-90"
                  style={{ backgroundColor: "#F59E0B" }}
                >
                  Sign Up
                </Link>
              </>
            )}
          </div>

          {/* Mobile Menu Button */}
          <div className="flex md:hidden">
            <button
              type="button"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-100 focus:outline-none"
              aria-label="Toggle navigation menu"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu */}
      {mobileMenuOpen && (
        <div className="md:hidden bg-white border-b border-slate-200 px-4 pt-2 pb-5 space-y-3 shadow-lg">
          <nav className="flex flex-col space-y-1">
            {navLinks.map((link) => (
              <a
                key={link.name}
                href={link.href}
                onClick={() => setMobileMenuOpen(false)}
                className="px-3 py-2 rounded-md text-sm font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-50 transition-colors"
              >
                {link.name}
              </a>
            ))}
          </nav>

          <div className="pt-3 border-t border-slate-100 flex flex-col gap-2">
            {user ? (
              <>
                <div className="px-3 py-2">
                  <p className="text-sm font-bold text-slate-900">{user.displayName}</p>
                  <p className="text-xs text-slate-500">{user.email || user.phone}</p>
                </div>
                {isOwner && (
                  <Link
                    to="/owner"
                    onClick={() => setMobileMenuOpen(false)}
                    className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium text-blue-600 hover:bg-blue-50"
                  >
                    <Store className="w-4 h-4" />
                    <span>Owner Portal</span>
                  </Link>
                )}
                {isAdmin && (
                  <Link
                    to="/admin"
                    onClick={() => setMobileMenuOpen(false)}
                    className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium text-purple-600 hover:bg-purple-50"
                  >
                    <Shield className="w-4 h-4" />
                    <span>Admin Panel</span>
                  </Link>
                )}
                <button
                  type="button"
                  onClick={() => { handleLogout(); setMobileMenuOpen(false); }}
                  className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium text-rose-500 hover:bg-rose-50 text-left w-full"
                >
                  <LogOut className="w-4 h-4" />
                  <span>Log Out</span>
                </button>
              </>
            ) : (
              <>
                <Link
                  to="/login"
                  onClick={() => setMobileMenuOpen(false)}
                  className="w-full text-center py-2 text-sm font-medium text-slate-700 hover:text-slate-900 hover:bg-slate-50 rounded-lg transition-colors"
                >
                  Log In
                </Link>
                <Link
                  to="/register"
                  onClick={() => setMobileMenuOpen(false)}
                  className="w-full text-center py-2.5 text-sm font-semibold text-white rounded-lg shadow-sm"
                  style={{ backgroundColor: "#F59E0B" }}
                >
                  Sign Up
                </Link>
              </>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
