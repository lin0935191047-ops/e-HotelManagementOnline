import React, { useState, useEffect } from "react";
import {
  LogOut,
  Hotel,
  Shield,
  Settings,
  Calendar,
  UserCheck,
  Bed,
  LogIn,
  LayoutDashboard,
  Search,
} from "lucide-react";
import { getCurrentUser, setCurrentUser, setToken, apiRequest } from "./api/client.js";
import Login from "./pages/Login.jsx";
import UserManagement from "./pages/admin/UserManagement.jsx";
import ManagerSetup from "./pages/manager/ManagerSetup.jsx";
import RoomCatalog from "./pages/customer/RoomCatalog.jsx";
import BookingLookupModal from "./pages/customer/BookingLookupModal.jsx";
import SaleOperation from "./pages/operation/SaleOperation.jsx";

export default function App() {
  const [user, setUser] = useState(getCurrentUser());
  const [activeTab, setActiveTab] = useState("users");
  // Chế độ xem: "catalog" (Cổng đặt phòng khách hàng) hoặc "portal" (Phân hệ nhân viên/login)
  const [currentView, setCurrentView] = useState("catalog");
  const [isGlobalLookupOpen, setIsGlobalLookupOpen] = useState(false);

  const handleLogout = async () => {
    try {
      await apiRequest("/api/auth/logout", { method: "POST" });
    } catch {
      // Bỏ qua lỗi mạng khi logout
    } finally {
      setToken(null);
      setCurrentUser(null);
      setUser(null);
      setCurrentView("catalog");
    }
  };

  const handleLoginSuccess = (loggedInUser) => {
    setUser(loggedInUser);
    setCurrentView("portal");
    if (loggedInUser.role === "ADMIN") setActiveTab("users");
    else if (loggedInUser.role === "MANAGER") setActiveTab("setup");
    else if (loggedInUser.role === "SALE") setActiveTab("operation");
  };

  // Kiểm tra phiên đăng nhập tự động mỗi 2 phút
  useEffect(() => {
    if (!user) return;
    const interval = setInterval(async () => {
      try {
        await apiRequest("/api/auth/me");
      } catch (err) {
        if (err.status === 401) {
          handleLogout();
        }
      }
    }, 120000);

    return () => clearInterval(interval);
  }, [user]);

  return (
    <div className="app-container">
      {/* Navigation Header */}
      <nav className="navbar">
        <div
          className="brand-badge"
          style={{ cursor: "pointer" }}
          onClick={() => setCurrentView("catalog")}
        >
          <div className="brand-logo">
            <Hotel size={22} />
          </div>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "0.45rem" }}>
              <div className="brand-title">e-Hotel Luxury Resort</div>
              <span style={{ fontSize: "0.65rem", padding: "0.15rem 0.5rem", borderRadius: "6px", background: "rgba(245, 158, 11, 0.15)", color: "#fbbf24", border: "1px solid rgba(245, 158, 11, 0.3)", fontWeight: 700, letterSpacing: "0.05em" }}>5★ LUXURY</span>
            </div>
            <div
              style={{
                fontSize: "0.7rem",
                color: "var(--text-dim)",
                textTransform: "uppercase",
                letterSpacing: "0.06em",
              }}
            >
              Hệ Thống Đặt Phòng & Quản Lý Trực Tuyến
            </div>
          </div>
        </div>

        {/* Action Buttons in Navbar */}
        <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
          {/* Nút xem Cổng Đặt Phòng Khách Hàng */}
          <button
            type="button"
            className={`btn ${currentView === "catalog" ? "btn-primary" : "btn-secondary"}`}
            onClick={() => setCurrentView("catalog")}
            style={{ fontSize: "0.8125rem", padding: "0.5rem 1rem" }}
          >
            <Bed size={16} />
            <span>Cổng Đặt Phòng</span>
          </button>

          {/* Nút tra cứu nhanh đơn đặt phòng */}
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => setIsGlobalLookupOpen(true)}
            style={{ fontSize: "0.8125rem", padding: "0.5rem 1rem" }}
          >
            <Search size={16} />
            <span>Tra Cứu Đơn</span>
          </button>

          {user ? (
            <div className="user-badge">
              <button
                type="button"
                className={`btn ${currentView === "portal" ? "btn-primary" : "btn-secondary"}`}
                onClick={() => setCurrentView("portal")}
                style={{ fontSize: "0.8125rem", padding: "0.5rem 1rem" }}
              >
                <LayoutDashboard size={16} />
                <span>Bảng Quản Trị</span>
              </button>

              <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
                <div
                  style={{
                    width: "36px",
                    height: "36px",
                    borderRadius: "50%",
                    background: "linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontWeight: 800,
                    fontSize: "0.875rem",
                    color: "#ffffff",
                    boxShadow: "0 2px 8px rgba(79, 70, 229, 0.4)",
                  }}
                >
                  {user.fullName ? user.fullName[0].toUpperCase() : "U"}
                </div>
                <div style={{ textAlign: "right" }}>
                  <div style={{ fontSize: "0.875rem", fontWeight: 700, color: "var(--text-main)" }}>{user.fullName}</div>
                  <div style={{ display: "flex", justifyContent: "flex-end", marginTop: "2px" }}>
                    <span className={`role-tag ${user.role.toLowerCase()}`}>{user.role}</span>
                  </div>
                </div>
              </div>

              <button className="btn btn-secondary" onClick={handleLogout} title="Đăng xuất">
                <LogOut size={16} />
                <span>Đăng Xuất</span>
              </button>
            </div>
          ) : currentView === "catalog" ? (
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => setCurrentView("portal")}
              style={{ fontSize: "0.8125rem", padding: "0.5rem 1rem" }}
            >
              <LogIn size={16} />
              <span>Đăng Nhập Nội Bộ</span>
            </button>
          ) : (
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => setCurrentView("catalog")}
              style={{ fontSize: "0.8125rem", padding: "0.5rem 1rem" }}
            >
              <Bed size={16} />
              <span>Xem Cổng Khách Hàng</span>
            </button>
          )}
        </div>
      </nav>

      {/* Main Content Area */}
      <main style={{ flex: 1 }}>
        {currentView === "catalog" ? (
          <RoomCatalog
            onNavigateToLogin={() => setCurrentView("portal")}
            onSelectRoomForBooking={(item) => {
              // Sẵn sàng liên kết vào giỏ hàng FEAT-07
              console.log("Selected room for booking:", item);
            }}
          />
        ) : !user ? (
          <Login onLoginSuccess={handleLoginSuccess} />
        ) : user.role === "ADMIN" ? (
          <UserManagement currentLoggedUser={user} />
        ) : user.role === "MANAGER" ? (
          <ManagerSetup />
        ) : (
          <SaleOperation />
        )}
      </main>

      {/* Footer */}
      <footer
        style={{
          padding: "1.25rem 2rem",
          borderTop: "1px solid var(--border-color)",
          background: "rgba(10, 13, 20, 0.95)",
          color: "var(--text-dim)",
          fontSize: "0.8125rem",
          display: "flex",
          flexWrap: "wrap",
          justifyContent: "space-between",
          alignItems: "center",
          gap: "1rem",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
          <span style={{ display: "inline-block", width: "8px", height: "8px", borderRadius: "50%", background: "#10b981", boxShadow: "0 0 8px #10b981" }}></span>
          <span>Hệ thống trực tuyến thời gian thực • Node.js v24 + PostgreSQL + Prisma ORM</span>
        </div>
        <div>
          © 2026 e-Hotel System — Decoupled Modular Monolith Architecture
        </div>
      </footer>

      {/* Modal Tra Cứu & Hủy Đơn Đặt Phòng Toàn Cục (FEAT-08) */}
      <BookingLookupModal
        isOpen={isGlobalLookupOpen}
        onClose={() => setIsGlobalLookupOpen(false)}
      />
    </div>
  );
}
