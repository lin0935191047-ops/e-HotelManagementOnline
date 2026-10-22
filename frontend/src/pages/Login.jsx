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
    <div style={{ minHeight: "85vh", display: "flex", alignItems: "center", justifyContent: "center", padding: "1.5rem" }}>
      <div className="glass-card" style={{ width: "100%", maxWidth: "440px", padding: "2.25rem" }}>
        <div style={{ textAlign: "center", marginBottom: "2rem" }}>
          <div
            style={{
              width: "52px",
              height: "52px",
              borderRadius: "14px",
              background: "var(--primary-gradient)",
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              color: "white",
              marginBottom: "1rem",
              boxShadow: "0 8px 24px rgba(99, 102, 241, 0.35)",
            }}
          >
            <Lock size={26} />
          </div>
          <h2 style={{ fontSize: "1.5rem", fontWeight: 700, marginBottom: "0.25rem" }}>Đăng Nhập Hệ Thống</h2>
          <p style={{ color: "var(--text-muted)", fontSize: "0.875rem" }}>
            Hệ thống Quản lý Khách sạn & Đặt phòng Trực tuyến e-Hotel
          </p>
        </div>

        {error && (
          <div
            style={{
              padding: "0.875rem",
              borderRadius: "8px",
              background: "rgba(239, 68, 68, 0.15)",
              border: "1px solid rgba(239, 68, 68, 0.3)",
              color: "#fca5a5",
              marginBottom: "1.25rem",
              fontSize: "0.875rem",
              display: "flex",
              alignItems: "center",
              gap: "0.5rem",
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
              <User size={18} style={{ position: "absolute", left: "12px", top: "50%", transform: "translateY(-50%)", color: "var(--text-dim)" }} />
              <input
                type="text"
                required
                className="form-input"
                style={{ paddingLeft: "2.5rem" }}
                placeholder="Nhập tên đăng nhập..."
                value={username}
                onChange={(e) => setUsername(e.target.value)}
              />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Mật khẩu</label>
            <div style={{ position: "relative" }}>
              <KeyRound size={18} style={{ position: "absolute", left: "12px", top: "50%", transform: "translateY(-50%)", color: "var(--text-dim)" }} />
              <input
                type="password"
                required
                className="form-input"
                style={{ paddingLeft: "2.5rem" }}
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
            style={{ width: "100%", marginTop: "0.75rem", padding: "0.75rem" }}
          >
            {loading ? "Đang xác thực..." : "Đăng Nhập"}
          </button>
        </form>

        {/* Quick autofill buttons for testing */}
        <div style={{ marginTop: "2rem", paddingTop: "1.25rem", borderTop: "1px solid var(--border-color)" }}>
          <p style={{ fontSize: "0.75rem", color: "var(--text-dim)", textTransform: "uppercase", fontWeight: 600, letterSpacing: "0.05em", marginBottom: "0.75rem", display: "flex", alignItems: "center", gap: "0.35rem" }}>
            <Sparkles size={14} color="#6366f1" /> Điền nhanh tài khoản mẫu:
          </p>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "0.5rem" }}>
            <button
              type="button"
              className="btn btn-secondary"
              style={{ padding: "0.4rem 0.5rem", fontSize: "0.75rem" }}
              onClick={() => handleQuickLogin("admin", "Admin@123")}
            >
              ADMIN
            </button>
            <button
              type="button"
              className="btn btn-secondary"
              style={{ padding: "0.4rem 0.5rem", fontSize: "0.75rem" }}
              onClick={() => handleQuickLogin("manager", "Manager@123")}
            >
              MANAGER
            </button>
            <button
              type="button"
              className="btn btn-secondary"
              style={{ padding: "0.4rem 0.5rem", fontSize: "0.75rem" }}
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
