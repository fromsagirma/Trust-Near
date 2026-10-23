import React from "react";
import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function RequireOwnerAuth() {
  const { user } = useAuth();
  const token = localStorage.getItem("token") || localStorage.getItem("trustnear_token");

  // If no auth token or user is stored, redirect to login
  if (!token && !user) {
    return <Navigate to="/login" replace />;
  }

  // Check user role strictly
  const effectiveUser = user || JSON.parse(localStorage.getItem("user") || "null");
  if (effectiveUser && effectiveUser.role) {
    // If admin tries to access owner page, redirect to admin panel
    if (effectiveUser.role === "admin" || effectiveUser.role === "seed_admin") {
      return <Navigate to="/admin" replace />;
    }
    // Only business owners allowed in owner portal
    const isOwner =
      effectiveUser.role === "business_owner" || effectiveUser.role === "owner";
    if (!isOwner) {
      return <Navigate to="/" replace />;
    }
  }

  return <Outlet />;
}
