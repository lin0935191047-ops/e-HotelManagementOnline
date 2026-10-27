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
            <div className="brand-title">e-Hotel Management</div>
            <div
              style={{
                fontSize: "0.7rem",
                color: "var(--text-dim)",
                textTransform: "uppercase",
                letterSpacing: "0.05em",
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

              <div style={{ textAlign: "right" }}>
                <div style={{ fontSize: "0.875rem", fontWeight: 600 }}>{user.fullName}</div>
                <div style={{ display: "flex", justifyContent: "flex-end", marginTop: "2px" }}>
                  <span className={`role-tag ${user.role.toLowerCase()}`}>{user.role}</span>
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
          <div
            style={{ maxWidth: "800px", margin: "4rem auto", textAlign: "center", padding: "2rem" }}
            className="glass-card"
          >
            <Calendar size={48} color="#10b981" style={{ margin: "0 auto 1rem" }} />
            <h2 style={{ fontSize: "1.5rem", fontWeight: 700, marginBottom: "0.5rem" }}>
              Operation Module (SALE)
            </h2>
            <p style={{ color: "var(--text-muted)", marginBottom: "1.5rem" }}>
              Bạn đang đăng nhập với vai trò <strong>SALE</strong>. Bạn có quyền vận hành Đặt phòng, Check-in, Dịch vụ, Check-out và Báo cáo.
            </p>
            <div
              style={{
                padding: "1rem",
                borderRadius: "8px",
                background: "rgba(16, 185, 129, 0.1)",
                color: "#6ee7b7",
                fontSize: "0.875rem",
              }}
            >
              🛡️ Quy tắc Strict Disjoint RBAC: Tài khoản SALE không có quyền truy cập vào chức năng Quản lý người dùng của ADMIN hay Cấu hình của MANAGER.
            </div>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer
        style={{
          padding: "1.25rem 2rem",
          textAlign: "center",
          borderTop: "1px solid var(--border-color)",
          color: "var(--text-dim)",
          fontSize: "0.8125rem",
        }}
      >
        © 2026 e-Hotel System — Decoupled Modular Monolith (Node.js + Express + Prisma + React SPA)
      </footer>

      {/* Modal Tra Cứu & Hủy Đơn Đặt Phòng Toàn Cục (FEAT-08) */}
      <BookingLookupModal
        isOpen={isGlobalLookupOpen}
        onClose={() => setIsGlobalLookupOpen(false)}
      />
    </div>
  );
}
