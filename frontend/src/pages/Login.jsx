import React, { useState } from "react";
import { Lock, User, KeyRound, AlertCircle, Sparkles } from "lucide-react";
import { apiRequest, setToken, setCurrentUser } from "../api/client.js";

export default function Login({ onLoginSuccess }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleSubmit = async (e) => {
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

  const handleQuickLogin = (u, p) => {
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
          maxWidth: "460px",
          padding: "2.5rem",
          position: "relative",
          zIndex: 1,
          borderRadius: "20px",
          border: "1px solid var(--border-color)",
          boxShadow: "0 20px 45px -10px rgba(0, 0, 0, 0.08), 0 0 0 1px rgba(0, 0, 0, 0.04)",
        }}
      >
        <div style={{ textAlign: "center", marginBottom: "2rem" }}>
          <div
            style={{
              width: "56px",
              height: "56px",
              borderRadius: "16px",
              background: "linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)",
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              color: "white",
              marginBottom: "1rem",
              boxShadow: "0 8px 24px rgba(79, 70, 229, 0.45)",
            }}
          >
            <Lock size={28} />
          </div>
          <h2 style={{ fontSize: "1.65rem", fontWeight: 800, marginBottom: "0.35rem", letterSpacing: "-0.02em" }}>
            Đăng Nhập Cổng Nội Bộ
          </h2>
          <p style={{ color: "var(--text-muted)", fontSize: "0.875rem" }}>
            Hệ thống Quản lý Khách sạn & Đặt phòng Trực tuyến e-Hotel
          </p>
        </div>

        {error && (
          <div
            style={{
              padding: "0.875rem 1rem",
              borderRadius: "10px",
              background: "rgba(239, 68, 68, 0.08)",
              border: "1px solid rgba(239, 68, 68, 0.25)",
              color: "#dc2626",
              marginBottom: "1.5rem",
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

        <form onSubmit={handleSubmit}>
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

        {/* Quick autofill buttons for testing */}
        <div style={{ marginTop: "2rem", paddingTop: "1.25rem", borderTop: "1px solid var(--border-color)" }}>
          <p style={{ fontSize: "0.75rem", color: "var(--text-dim)", textTransform: "uppercase", fontWeight: 700, letterSpacing: "0.06em", marginBottom: "0.75rem", display: "flex", alignItems: "center", gap: "0.4rem" }}>
            <Sparkles size={14} color="#818cf8" /> Tài khoản kiểm thử nhanh (1-Click):
          </p>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "0.6rem" }}>
            <button
              type="button"
              className="btn btn-secondary"
              style={{
                padding: "0.45rem 0.5rem",
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
                padding: "0.45rem 0.5rem",
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
                padding: "0.45rem 0.5rem",
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
