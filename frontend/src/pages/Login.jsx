import React, { useState } from "react";
import { Lock, User, KeyRound, AlertCircle, Sparkles, UserPlus, Phone, Mail, CreditCard, CheckCircle2 } from "lucide-react";
import { apiRequest, setToken, setCurrentUser } from "../api/client.js";

export default function Login({ onLoginSuccess }) {
  const [isRegisterMode, setIsRegisterMode] = useState(false);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [cccd, setCccd] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);

  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    try {
      setLoading(true);
      setError(null);
      const res = await apiRequest("/api/auth/login", {
        method: "POST",
        body: JSON.stringify({ username, password }),
      });

      setToken(res.data.token);
      setCurrentUser(res.data.user);
      onLoginSuccess(res.data.user);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleRegisterSubmit = async (e) => {
    e.preventDefault();
    try {
      setLoading(true);
      setError(null);
      await apiRequest("/api/auth/register", {
        method: "POST",
        body: JSON.stringify({
          username,
          password,
          fullName,
          phone,
          email: email || undefined,
          cccd: cccd || undefined,
        }),
      });

      // Auto login after successful registration
      const loginRes = await apiRequest("/api/auth/login", {
        method: "POST",
        body: JSON.stringify({ username, password }),
      });

      setToken(loginRes.data.token);
      setCurrentUser(loginRes.data.user);
      onLoginSuccess(loginRes.data.user);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleQuickLogin = (u, p) => {
    setIsRegisterMode(false);
    setUsername(u);
    setPassword(p);
  };

  return (
    <div
      style={{
        minHeight: "85vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "1.5rem",
        position: "relative",
      }}
    >
      {/* Decorative ambient background orb */}
      <div
        style={{
          position: "absolute",
          width: "400px",
          height: "400px",
          borderRadius: "50%",
          background: "radial-gradient(circle, rgba(99, 102, 241, 0.08) 0%, transparent 70%)",
          filter: "blur(40px)",
          pointerEvents: "none",
        }}
      />

      <div
        className="glass-card"
        style={{
          width: "100%",
          maxWidth: "480px",
          padding: "2.25rem",
          position: "relative",
          zIndex: 1,
          borderRadius: "20px",
          border: "1px solid var(--border-color)",
          boxShadow: "0 20px 45px -10px rgba(0, 0, 0, 0.08), 0 0 0 1px rgba(0, 0, 0, 0.04)",
        }}
      >
        <div style={{ textAlign: "center", marginBottom: "1.5rem" }}>
          <div
            style={{
              width: "52px",
              height: "52px",
              borderRadius: "16px",
              background: isRegisterMode
                ? "linear-gradient(135deg, #059669 0%, #10b981 100%)"
                : "linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)",
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              color: "white",
              marginBottom: "0.75rem",
              boxShadow: isRegisterMode
                ? "0 8px 24px rgba(16, 185, 129, 0.4)"
                : "0 8px 24px rgba(79, 70, 229, 0.45)",
            }}
          >
            {isRegisterMode ? <UserPlus size={26} /> : <Lock size={26} />}
          </div>
          <h2 style={{ fontSize: "1.5rem", fontWeight: 800, marginBottom: "0.25rem", letterSpacing: "-0.02em" }}>
            {isRegisterMode ? "Đăng Ký Tài Khoản Khách Hàng" : "Đăng Nhập Hệ Thống e-Hotel"}
          </h2>
          <p style={{ color: "var(--text-muted)", fontSize: "0.8125rem" }}>
            {isRegisterMode
              ? "Tự động kích hoạt Ví Điện Tử & dịch vụ Auto-Debit thanh toán nhanh"
              : "Hệ thống Quản lý Khách sạn & Đặt phòng Trực tuyến e-Hotel"}
          </p>
        </div>

        {/* Toggle Mode */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: "0.5rem",
            background: "var(--bg-secondary)",
            padding: "4px",
            borderRadius: "12px",
            marginBottom: "1.5rem",
          }}
        >
          <button
            type="button"
            className={`btn ${!isRegisterMode ? "btn-primary" : "btn-secondary"}`}
            onClick={() => {
              setIsRegisterMode(false);
              setError(null);
            }}
            style={{ fontSize: "0.8125rem", padding: "0.5rem", borderRadius: "8px" }}
          >
            Đăng Nhập
          </button>
          <button
            type="button"
            className={`btn ${isRegisterMode ? "btn-primary" : "btn-secondary"}`}
            onClick={() => {
              setIsRegisterMode(true);
              setError(null);
            }}
            style={{ fontSize: "0.8125rem", padding: "0.5rem", borderRadius: "8px" }}
          >
            Đăng Ký Khách Hàng
          </button>
        </div>

        {error && (
          <div
            style={{
              padding: "0.875rem 1rem",
              borderRadius: "10px",
              background: "rgba(239, 68, 68, 0.08)",
              border: "1px solid rgba(239, 68, 68, 0.25)",
              color: "#dc2626",
              marginBottom: "1.25rem",
              fontSize: "0.875rem",
              display: "flex",
              alignItems: "center",
              gap: "0.6rem",
            }}
          >
            <AlertCircle size={18} />
            <span>{error}</span>
          </div>
        )}

        {successMsg && (
          <div
            style={{
              padding: "0.875rem 1rem",
              borderRadius: "10px",
              background: "rgba(16, 185, 129, 0.08)",
              border: "1px solid rgba(16, 185, 129, 0.25)",
              color: "#059669",
              marginBottom: "1.25rem",
              fontSize: "0.875rem",
              display: "flex",
              alignItems: "center",
              gap: "0.6rem",
            }}
          >
            <CheckCircle2 size={18} />
            <span>{successMsg}</span>
          </div>
        )}

        {!isRegisterMode ? (
          /* FORM ĐĂNG NHẬP */
          <form onSubmit={handleLoginSubmit}>
            <div className="form-group">
              <label className="form-label">Tên đăng nhập</label>
              <div style={{ position: "relative" }}>
                <User size={18} style={{ position: "absolute", left: "14px", top: "50%", transform: "translateY(-50%)", color: "var(--text-dim)" }} />
                <input
                  type="text"
                  required
                  className="form-input"
                  style={{ paddingLeft: "2.75rem", paddingRight: "1rem" }}
                  placeholder="Nhập tên đăng nhập..."
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Mật khẩu</label>
              <div style={{ position: "relative" }}>
                <KeyRound size={18} style={{ position: "absolute", left: "14px", top: "50%", transform: "translateY(-50%)", color: "var(--text-dim)" }} />
                <input
                  type="password"
                  required
                  className="form-input"
                  style={{ paddingLeft: "2.75rem", paddingRight: "1rem" }}
                  placeholder="Nhập mật khẩu..."
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
            </div>

            <button
              type="submit"
              className="btn btn-primary"
              disabled={loading}
              style={{ width: "100%", marginTop: "0.75rem", padding: "0.85rem", fontSize: "0.9375rem" }}
            >
              {loading ? "Đang xác thực..." : "Đăng Nhập"}
            </button>
          </form>
        ) : (
          /* FORM ĐĂNG KÝ KHÁCH HÀNG */
          <form onSubmit={handleRegisterSubmit}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
              <div className="form-group">
                <label className="form-label">Tên đăng nhập *</label>
                <input
                  type="text"
                  required
                  className="form-input"
                  placeholder="VD: minh_anh"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Mật khẩu *</label>
                <input
                  type="password"
                  required
                  className="form-input"
                  placeholder="Tối thiểu 6 ký tự"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Họ và tên khách hàng *</label>
              <input
                type="text"
                required
                className="form-input"
                placeholder="VD: Nguyễn Minh Anh"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
              />
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
              <div className="form-group">
                <label className="form-label">Số điện thoại *</label>
                <input
                  type="tel"
                  required
                  className="form-input"
                  placeholder="VD: 0912345678"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                />
              </div>

              <div className="form-group">
                <label className="form-label">CCCD / CMND</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="VD: 001200000001"
                  value={cccd}
                  onChange={(e) => setCccd(e.target.value)}
                />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Email</label>
              <input
                type="email"
                className="form-input"
                placeholder="VD: minhanh@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>

            <button
              type="submit"
              className="btn btn-primary"
              disabled={loading}
              style={{ width: "100%", marginTop: "0.75rem", padding: "0.85rem", fontSize: "0.9375rem", background: "#059669" }}
            >
              {loading ? "Đang khởi tạo ví & đăng ký..." : "Hoàn Tất Đăng Ký & Mở Ví"}
            </button>
          </form>
        )}

        {/* Quick autofill buttons for testing */}
        <div style={{ marginTop: "1.75rem", paddingTop: "1.25rem", borderTop: "1px solid var(--border-color)" }}>
          <p style={{ fontSize: "0.75rem", color: "var(--text-dim)", textTransform: "uppercase", fontWeight: 700, letterSpacing: "0.06em", marginBottom: "0.75rem", display: "flex", alignItems: "center", gap: "0.4rem" }}>
            <Sparkles size={14} color="#818cf8" /> Tài khoản kiểm thử nhanh (1-Click):
          </p>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "0.5rem" }}>
            <button
              type="button"
              className="btn btn-secondary"
              style={{
                padding: "0.45rem 0.4rem",
                fontSize: "0.75rem",
                fontWeight: 700,
                color: "#e11d48",
                borderColor: "rgba(225, 29, 72, 0.25)",
                background: "rgba(225, 29, 72, 0.06)",
              }}
              onClick={() => handleQuickLogin("admin", "Admin@123")}
            >
              ADMIN
            </button>
            <button
              type="button"
              className="btn btn-secondary"
              style={{
                padding: "0.45rem 0.4rem",
                fontSize: "0.75rem",
                fontWeight: 700,
                color: "#2563eb",
                borderColor: "rgba(37, 99, 235, 0.25)",
                background: "rgba(37, 99, 235, 0.06)",
              }}
              onClick={() => handleQuickLogin("manager", "Manager@123")}
            >
              MANAGER
            </button>
            <button
              type="button"
              className="btn btn-secondary"
              style={{
                padding: "0.45rem 0.4rem",
                fontSize: "0.75rem",
                fontWeight: 700,
                color: "#059669",
                borderColor: "rgba(5, 150, 105, 0.25)",
                background: "rgba(5, 150, 105, 0.06)",
              }}
              onClick={() => handleQuickLogin("sale", "Sale@123")}
            >
              SALE
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
