// auth/LoginPage.jsx
import React, { useState } from "react";
import { useNavigate, useLocation, Link } from "react-router-dom";
import {
  MapPin,
  Eye,
  EyeOff,
  AlertCircle,
  CheckCircle2,
  Loader2,
} from "lucide-react";

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || "https://trust-near.onrender.com/api";

export default function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [fieldErrors, setFieldErrors] = useState({});
  const [serverError, setServerError] = useState("");
  const [loading, setLoading] = useState(false);

  // Success message passed from registration redirect
  const successMessage = location.state?.message || "";

  const validateForm = () => {
    const errors = {};
    const emailTrimmed = email.trim();
    if (!emailTrimmed) {
      errors.email = "Email is required";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailTrimmed)) {
      errors.email = "Please enter a valid email address";
    }

    if (!password) {
      errors.password = "Password is required";
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setServerError("");

    if (!validateForm()) {
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), password }),
      });

      const body = await res.json().catch(() => ({}));

      if (!res.ok || !body.success) {
        throw new Error(
          body.message ||
            (res.status === 401
              ? "Invalid email or password. Please check your credentials."
              : "Unable to log in. Please try again.")
        );
      }

      // Store auth session
      if (body.data?.accessToken) {
        localStorage.setItem("token", body.data.accessToken);
      }
      if (body.data?.refreshToken) {
        localStorage.setItem("refreshToken", body.data.refreshToken);
      }
      if (body.data?.user) {
        localStorage.setItem("user", JSON.stringify(body.data.user));
      }

      // Role-based redirection:
      // admin/seed_admin -> /admin
      // business_owner -> /owner
      // user -> /
      const role = body.data?.user?.role;
      if (role === "admin" || role === "seed_admin") {
        navigate("/admin");
      } else if (role === "business_owner" || role === "owner") {
        navigate("/owner");
      } else {
        navigate("/");
      }

    } catch (err) {
      const isFetchFailure =
        err.name === "TypeError" ||
        err.message?.includes("Failed to fetch") ||
        err.message?.includes("NetworkError");

      setServerError(
        isFetchFailure
          ? "Cannot connect to the server. The live backend instance may be waking up from sleep (~30s). Please try clicking Sign In again."
          : err.message || "A network error occurred. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="min-h-screen text-slate-100 flex flex-col justify-center py-12 sm:px-6 lg:px-8"
      style={{ backgroundColor: "#1e293b" }}
    >
      <div className="sm:mx-auto sm:w-full sm:max-w-md px-4">
        {/* Brand Header */}
        <Link
          to="/"
          className="flex items-center justify-center gap-2 group focus:outline-none mb-6"
          aria-label="TrustNear Home"
        >
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center text-white shadow-lg"
            style={{ backgroundColor: "#1E40AF" }}
          >
            <MapPin className="w-5 h-5 text-white stroke-[2.4]" />
          </div>
          <div className="flex flex-col text-left">
            <span className="text-2xl font-black tracking-tight text-white">
              Trust<span style={{ color: "#F59E0B" }}>Near</span>
            </span>
          </div>
        </Link>

        <div className="text-center mb-8">
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            Welcome back
          </h1>
          <p className="mt-1 text-sm text-slate-300">
            Sign in to access your TrustNear account
          </p>
        </div>
      </div>

      <div className="sm:mx-auto sm:w-full sm:max-w-md px-4">
        <div
          className="rounded-2xl border border-slate-700/80 p-6 sm:p-8 shadow-2xl"
          style={{ backgroundColor: "#243347" }}
        >
          {/* Flash Success Message */}
          {successMessage && (
            <div
              className="mb-5 p-3.5 rounded-xl bg-emerald-950/80 border border-emerald-700/80 text-emerald-200 text-xs sm:text-sm flex items-start gap-2.5 shadow-sm"
              role="status"
            >
              <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
              <span>{successMessage}</span>
            </div>
          )}

          {/* Server Error Alert */}
          {serverError && (
            <div
              className="mb-5 p-3.5 rounded-xl bg-rose-950/80 border border-rose-700/80 text-rose-200 text-xs sm:text-sm flex items-start gap-2.5 shadow-sm"
              role="alert"
            >
              <AlertCircle className="w-4 h-4 text-rose-400 flex-shrink-0 mt-0.5" />
              <span>{serverError}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4" noValidate>
            {/* Email Field */}
            <div>
              <label
                htmlFor="login-email"
                className="block text-xs font-semibold text-slate-200 mb-1.5"
              >
                Email address
              </label>
              <input
                id="login-email"
                type="email"
                name="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  if (fieldErrors.email) {
                    setFieldErrors((prev) => ({ ...prev, email: null }));
                  }
                }}
                className={`w-full rounded-lg border bg-slate-800/90 px-3.5 py-2.5 text-sm text-white placeholder:text-slate-400 outline-none transition-colors ${
                  fieldErrors.email
                    ? "border-rose-500 ring-1 ring-rose-500"
                    : "border-slate-600/80 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                }`}
                placeholder="name@example.com"
                aria-invalid={!!fieldErrors.email}
                aria-describedby={
                  fieldErrors.email ? "login-email-error" : undefined
                }
              />
              {fieldErrors.email && (
                <p
                  id="login-email-error"
                  className="mt-1.5 text-xs text-rose-400 font-medium"
                >
                  {fieldErrors.email}
                </p>
              )}
            </div>

            {/* Password Field */}
            <div>
              <label
                htmlFor="login-password"
                className="block text-xs font-semibold text-slate-200 mb-1.5"
              >
                Password
              </label>

              <div className="relative">
                <input
                  id="login-password"
                  type={showPassword ? "text" : "password"}
                  name="password"
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    if (fieldErrors.password) {
                      setFieldErrors((prev) => ({ ...prev, password: null }));
                    }
                  }}
                  className={`w-full rounded-lg border bg-slate-800/90 pr-10 px-3.5 py-2.5 text-sm text-white placeholder:text-slate-400 outline-none transition-colors ${
                    fieldErrors.password
                      ? "border-rose-500 ring-1 ring-rose-500"
                    : "border-slate-600/80 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                  }`}
                  placeholder="••••••••"
                  aria-invalid={!!fieldErrors.password}
                  aria-describedby={
                    fieldErrors.password ? "login-password-error" : undefined
                  }
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200 focus:outline-none p-1"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? (
                    <EyeOff className="w-4 h-4" />
                  ) : (
                    <Eye className="w-4 h-4" />
                  )}
                </button>
              </div>
              {fieldErrors.password && (
                <p
                  id="login-password-error"
                  className="mt-1.5 text-xs text-rose-400 font-medium"
                >
                  {fieldErrors.password}
                </p>
              )}
            </div>

            {/* Submit Button */}
            <div className="pt-2">
              <button
                type="submit"
                disabled={loading}
                className="w-full inline-flex items-center justify-center gap-2 py-3 px-4 rounded-xl font-bold text-white shadow-lg text-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                style={{ backgroundColor: "#1E40AF", color: "#ffffff" }}
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Signing in...</span>
                  </>
                ) : (
                  <span>Sign In</span>
                )}
              </button>
            </div>
          </form>

          {/* Switch to Register */}
          <div className="mt-6 pt-5 border-t border-slate-700/80 text-center">
            <p className="text-xs sm:text-sm text-slate-300">
              Don't have an account?{" "}
              <Link
                to="/register"
                className="font-bold hover:underline"
                style={{ color: "#F59E0B" }}
              >
                Create an account
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
