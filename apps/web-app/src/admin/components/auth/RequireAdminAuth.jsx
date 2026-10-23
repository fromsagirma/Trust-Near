import React from "react";
import { Navigate, Outlet } from "react-router-dom";

export default function RequireAdminAuth() {
  const token = localStorage.getItem("token") || localStorage.getItem("trustnear_token");
  const user = JSON.parse(localStorage.getItem("user") || "null");

  // If no auth token or user is stored, redirect to login
  if (!token && !user) {
    return <Navigate to="/login" replace />;
  }

  // Check user role strictly
  if (user && user.role) {
    // If business owner tries to access admin panel, redirect to owner portal
    if (user.role === "business_owner" || user.role === "owner") {
      return <Navigate to="/owner" replace />;
    }
    // Only admins allowed in admin panel
    const isAdmin = user.role === "admin" || user.role === "seed_admin";
    if (!isAdmin) {
      return <Navigate to="/" replace />;
    }
  }

  return <Outlet />;
}
