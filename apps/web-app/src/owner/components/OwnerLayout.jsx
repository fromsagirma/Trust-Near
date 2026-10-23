import React, { useState } from "react";
import { Outlet, useNavigate } from "react-router-dom";
import OwnerSidebar from "./OwnerSidebar";
import OwnerTopbar from "./OwnerTopbar";
import LogoutModal from "./LogoutModal";
import { useAuth } from "../context/AuthContext";
import "../styles/index.css";

export default function OwnerLayout() {
  const [logoutModalOpen, setLogoutModalOpen] = useState(false);
  const { logout } = useAuth();
  const navigate = useNavigate();

  const handleConfirmLogout = () => {
    setLogoutModalOpen(false);
    logout();
    navigate("/login");
  };

  return (
    <div className="app">
      <OwnerSidebar onOpenLogoutModal={() => setLogoutModalOpen(true)} />
      <div className="main">
        <OwnerTopbar onOpenLogoutModal={() => setLogoutModalOpen(true)} />
        <main className="main-content">
          <Outlet />
        </main>
      </div>

      {/* Confirmation Modal */}
      <LogoutModal
        isOpen={logoutModalOpen}
        onClose={() => setLogoutModalOpen(false)}
        onConfirm={handleConfirmLogout}
      />
    </div>
  );
}
