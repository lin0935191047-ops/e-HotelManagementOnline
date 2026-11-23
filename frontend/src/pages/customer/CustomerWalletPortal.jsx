import React, { useState, useEffect } from "react";
import {
  Wallet,
  ArrowUpRight,
  ArrowDownLeft,
  RefreshCw,
  ShieldCheck,
  AlertCircle,
  CheckCircle2,
  Clock,
  CreditCard,
  FileText,
  X,
  ChevronRight,
  DollarSign,
  History,
  Sparkles,
  Plus,
  Lock,
  Unlock,
  AlertTriangle,
  Receipt,
  RotateCcw,
} from "lucide-react";
import { apiRequest } from "../../api/client.js";
import { formatDateTimeDisplay, formatDateShort } from "../../utils/date.js";

const formatCurrency = (amount) => {
  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
  }).format(amount || 0);
};

export default function CustomerWalletPortal({ currentLoggedUser }) {
  const [activeTab, setActiveTab] = useState("wallet"); // 'wallet' | 'autodebit' | 'debts' | 'refunds'
  const [wallet, setWallet] = useState(null);
  const [autoDebitStatus, setAutoDebitStatus] = useState(null);
  const [debts, setDebts] = useState([]);
  const [refunds, setRefunds] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);

  // Top-up Modal State
  const [isTopUpOpen, setIsTopUpOpen] = useState(false);
  const [topUpAmount, setTopUpAmount] = useState(1000000);
  const [topUpBank, setTopUpBank] = useState("NCB");
  const [topUpNote, setTopUpNote] = useState("");
  const [topUpLoading, setTopUpLoading] = useState(false);

  // Terms Modal State
  const [isTermsOpen, setIsTermsOpen] = useState(false);
  const [termsData, setTermsData] = useState(null);
  const [termsLoading, setTermsLoading] = useState(false);

  // Process Debt Loading
  const [processingDebtId, setProcessingDebtId] = useState(null);

  // Fetch full customer data
  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Batch load customer data
      const [walletRes, autoDebitRes, debtsRes, refundsRes] = await Promise.all([
        apiRequest("/api/wallet/my-wallet").catch(() => null),
        apiRequest("/api/auto-debit/my-status").catch(() => null),
        apiRequest("/api/auto-debit/debts/my-debts").catch(() => ({ data: [] })),
        apiRequest("/api/wallet/refunds/my-refunds").catch(() => ({ data: [] })),
      ]);

      if (walletRes && walletRes.data) {
        setWallet(walletRes.data);
      }
      if (autoDebitRes && autoDebitRes.data) {
        setAutoDebitStatus(autoDebitRes.data);
      }
      if (debtsRes && debtsRes.data) {
        setDebts(debtsRes.data);
      }
      if (refundsRes && refundsRes.data) {
        setRefunds(refundsRes.data);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Handle Mock Top-up
  const handleTopUpSubmit = async (e) => {
    e.preventDefault();
    try {
      setTopUpLoading(true);
      setError(null);
      const res = await apiRequest("/api/wallet/top-up", {
        method: "POST",
        body: JSON.stringify({
          amount: Number(topUpAmount),
          bankCode: topUpBank,
          note: topUpNote || `Nạp tiền qua ngân hàng giả lập ${topUpBank}`,
        }),
      });

      setSuccessMsg(`Nạp thành công ${formatCurrency(topUpAmount)} vào ví nội bộ!`);
      setIsTopUpOpen(false);
      setTopUpNote("");
      fetchData();
      setTimeout(() => setSuccessMsg(null), 5000);
    } catch (err) {
      setError(err.message);
    } finally {
      setTopUpLoading(false);
    }
  };

  // Open Terms Modal
  const handleOpenTerms = async () => {
    try {
      setIsTermsOpen(true);
      setTermsLoading(true);
      const res = await apiRequest("/api/auto-debit/terms");
      setTermsData(res.data);
    } catch (err) {
      setError(err.message);
    } finally {
      setTermsLoading(false);
    }
  };

  // Submit Consent
  const handleConsentSubmit = async (agreed) => {
    try {
      setError(null);
      await apiRequest("/api/auto-debit/consent", {
        method: "POST",
        body: JSON.stringify({
          consent: agreed,
          agreedTermsVersion: termsData?.termsVersion || "v1.0",
        }),
      });

      setSuccessMsg(
        agreed
          ? "Bạn đã đồng ý và ký thỏa thuận dịch vụ Auto-Debit thành công!"
          : "Đã thu hồi thỏa thuận dịch vụ Auto-Debit thành công."
      );
      setIsTermsOpen(false);
      fetchData();
      setTimeout(() => setSuccessMsg(null), 5000);
    } catch (err) {
      setError(err.message);
    }
  };

  // Process Debt Payment via BR-01
  const handlePayDebt = async (debtId) => {
    try {
      setProcessingDebtId(debtId);
      setError(null);
      await apiRequest(`/api/auto-debit/debts/${debtId}/process`, {
        method: "POST",
      });

      setSuccessMsg(`Đã thanh toán thành công công nợ ${debtId} từ số dư ví!`);
      fetchData();
      setTimeout(() => setSuccessMsg(null), 5000);
    } catch (err) {
      setError(err.message);
    } finally {
      setProcessingDebtId(null);
    }
  };

  const transactions = wallet?.transactions || [];

  return (
    <div style={{ maxWidth: "1200px", margin: "2rem auto", padding: "0 1.5rem" }}>
      {/* Toast Alerts */}
      {error && (
        <div
          style={{
            padding: "1rem 1.25rem",
            borderRadius: "12px",
            background: "rgba(239, 68, 68, 0.08)",
            border: "1px solid rgba(239, 68, 68, 0.25)",
            color: "#dc2626",
            marginBottom: "1.5rem",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
            <AlertCircle size={20} />
            <span style={{ fontSize: "0.875rem", fontWeight: 500 }}>{error}</span>
          </div>
          <button
            onClick={() => setError(null)}
            style={{ background: "transparent", border: "none", cursor: "pointer", color: "#dc2626" }}
          >
            <X size={18} />
          </button>
        </div>
      )}

      {successMsg && (
        <div
          style={{
            padding: "1rem 1.25rem",
            borderRadius: "12px",
            background: "rgba(16, 185, 129, 0.08)",
            border: "1px solid rgba(16, 185, 129, 0.25)",
            color: "#059669",
            marginBottom: "1.5rem",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
            <CheckCircle2 size={20} />
            <span style={{ fontSize: "0.875rem", fontWeight: 600 }}>{successMsg}</span>
          </div>
          <button
            onClick={() => setSuccessMsg(null)}
            style={{ background: "transparent", border: "none", cursor: "pointer", color: "#059669" }}
          >
            <X size={18} />
          </button>
        </div>
      )}

      {/* Header Banner: Wallet Overview */}
      <div
        className="glass-card"
        style={{
          padding: "2rem",
          borderRadius: "20px",
          background: "linear-gradient(135deg, #1e1b4b 0%, #312e81 50%, #4338ca 100%)",
          color: "white",
          marginBottom: "2rem",
          position: "relative",
          overflow: "hidden",
          boxShadow: "0 20px 40px -15px rgba(67, 56, 202, 0.4)",
        }}
      >
        {/* Ambient background decoration */}
        <div
          style={{
            position: "absolute",
            right: "-40px",
            bottom: "-40px",
            width: "250px",
            height: "250px",
            borderRadius: "50%",
            background: "radial-gradient(circle, rgba(255,255,255,0.12) 0%, transparent 70%)",
            pointerEvents: "none",
          }}
        />

        <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "space-between", alignItems: "center", gap: "1.5rem", position: "relative", zIndex: 1 }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "0.5rem" }}>
              <div
                style={{
                  width: "44px",
                  height: "44px",
                  borderRadius: "12px",
                  background: "rgba(255, 255, 255, 0.15)",
                  backdropFilter: "blur(10px)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Wallet size={24} color="#ffffff" />
              </div>
              <div>
                <h1 style={{ fontSize: "1.35rem", fontWeight: 800, margin: 0, letterSpacing: "-0.01em" }}>
                  Ví Điện Tử Nội Bộ e-Hotel
                </h1>
                <p style={{ fontSize: "0.8125rem", color: "rgba(255, 255, 255, 0.7)", margin: 0 }}>
                  Chủ tài khoản: <strong>{currentLoggedUser?.fullName}</strong> ({currentLoggedUser?.username}) • Mã ví:{" "}
                  <code style={{ background: "rgba(0,0,0,0.25)", padding: "2px 6px", borderRadius: "4px" }}>
                    {wallet?.walletId || "WAL-LOADING"}
                  </code>
                </p>
              </div>
            </div>

            <div style={{ marginTop: "1.25rem" }}>
              <div style={{ fontSize: "0.8125rem", color: "rgba(255, 255, 255, 0.7)", textTransform: "uppercase", letterSpacing: "0.06em", fontWeight: 600 }}>
                Số Dư Khả Dụng Hiện Tại
              </div>
              <div style={{ fontSize: "2.4rem", fontWeight: 900, color: "#ffffff", letterSpacing: "-0.02em", marginTop: "0.2rem" }}>
                {wallet ? formatCurrency(wallet.balance) : "---"}
              </div>
            </div>
          </div>

          <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: "0.75rem" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
              {wallet?.status === "ACTIVE" ? (
                <span
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "0.35rem",
                    padding: "0.35rem 0.75rem",
                    borderRadius: "20px",
                    background: "rgba(16, 185, 129, 0.2)",
                    border: "1px solid rgba(16, 185, 129, 0.4)",
                    color: "#6ee7b7",
                    fontSize: "0.75rem",
                    fontWeight: 700,
                  }}
                >
                  <Unlock size={14} /> VÍ HOẠT ĐỘNG
                </span>
              ) : (
                <span
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "0.35rem",
                    padding: "0.35rem 0.75rem",
                    borderRadius: "20px",
                    background: "rgba(239, 68, 68, 0.2)",
                    border: "1px solid rgba(239, 68, 68, 0.4)",
                    color: "#fca5a5",
                    fontSize: "0.75rem",
                    fontWeight: 700,
                  }}
                >
                  <Lock size={14} /> VÍ BỊ KHÓA
                </span>
              )}

              {autoDebitStatus?.setting?.isActive ? (
                <span
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "0.35rem",
                    padding: "0.35rem 0.75rem",
                    borderRadius: "20px",
                    background: "rgba(59, 130, 246, 0.2)",
                    border: "1px solid rgba(59, 130, 246, 0.4)",
                    color: "#93c5fd",
                    fontSize: "0.75rem",
                    fontWeight: 700,
                  }}
                >
                  <ShieldCheck size={14} /> AUTO-DEBIT: BẬT
                </span>
              ) : (
                <span
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "0.35rem",
                    padding: "0.35rem 0.75rem",
                    borderRadius: "20px",
                    background: "rgba(148, 163, 184, 0.2)",
                    border: "1px solid rgba(148, 163, 184, 0.4)",
                    color: "#cbd5e1",
                    fontSize: "0.75rem",
                    fontWeight: 700,
                  }}
                >
                  AUTO-DEBIT: TẮT
                </span>
              )}
            </div>

            <div style={{ display: "flex", gap: "0.75rem", marginTop: "0.5rem" }}>
              <button
                type="button"
                onClick={() => setIsTopUpOpen(true)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "0.5rem",
                  padding: "0.75rem 1.25rem",
                  borderRadius: "12px",
                  background: "#10b981",
                  color: "#ffffff",
                  fontWeight: 700,
                  fontSize: "0.875rem",
                  border: "none",
                  cursor: "pointer",
                  boxShadow: "0 4px 14px rgba(16, 185, 129, 0.4)",
                  transition: "all 0.2s",
                }}
              >
                <Plus size={18} />
                <span>Nạp Tiền Giả Lập</span>
              </button>

              <button
                type="button"
                onClick={fetchData}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  padding: "0.75rem",
                  borderRadius: "12px",
                  background: "rgba(255, 255, 255, 0.15)",
                  color: "#ffffff",
                  border: "1px solid rgba(255, 255, 255, 0.2)",
                  cursor: "pointer",
                  transition: "all 0.2s",
                }}
                title="Làm mới dữ liệu"
              >
                <RefreshCw size={18} className={loading ? "animate-spin" : ""} />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs Navigation */}
      <div
        style={{
          display: "flex",
          gap: "0.5rem",
          borderBottom: "1px solid var(--border-color)",
          marginBottom: "1.75rem",
          overflowX: "auto",
          paddingBottom: "2px",
        }}
      >
        <button
          className={`btn ${activeTab === "wallet" ? "btn-primary" : "btn-secondary"}`}
          onClick={() => setActiveTab("wallet")}
          style={{ display: "flex", alignItems: "center", gap: "0.5rem", borderRadius: "10px 10px 0 0" }}
        >
          <History size={16} />
          <span>Lịch Sử Giao Dịch Ví ({transactions.length})</span>
        </button>

        <button
          className={`btn ${activeTab === "autodebit" ? "btn-primary" : "btn-secondary"}`}
          onClick={() => setActiveTab("autodebit")}
          style={{ display: "flex", alignItems: "center", gap: "0.5rem", borderRadius: "10px 10px 0 0" }}
        >
          <ShieldCheck size={16} />
          <span>Cài Đặt Dịch Vụ Auto-Debit</span>
        </button>

        <button
          className={`btn ${activeTab === "debts" ? "btn-primary" : "btn-secondary"}`}
          onClick={() => setActiveTab("debts")}
          style={{ display: "flex", alignItems: "center", gap: "0.5rem", borderRadius: "10px 10px 0 0" }}
        >
          <Receipt size={16} />
          <span>Quản Lý Công Nợ ({debts.length})</span>
        </button>

        <button
          className={`btn ${activeTab === "refunds" ? "btn-primary" : "btn-secondary"}`}
          onClick={() => setActiveTab("refunds")}
          style={{ display: "flex", alignItems: "center", gap: "0.5rem", borderRadius: "10px 10px 0 0" }}
        >
          <RotateCcw size={16} />
          <span>Lịch Sử Hoàn Tiền ({refunds.length})</span>
        </button>
      </div>

      {/* TAB 1: Wallet Transactions */}
      {activeTab === "wallet" && (
        <div className="glass-card" style={{ padding: "1.5rem", borderRadius: "16px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.25rem" }}>
            <div>
              <h3 style={{ fontSize: "1.1rem", fontWeight: 700, margin: 0 }}>Nhật Ký Biến Động Số Dư (Audit Trail)</h3>
              <p style={{ fontSize: "0.8125rem", color: "var(--text-muted)", margin: "0.25rem 0 0 0" }}>
                Ghi nhận chi tiết mọi giao dịch nạp tiền, trừ tự động dịch vụ (BR-02), thanh toán công nợ (BR-01) và hoàn tiền.
              </p>
            </div>
          </div>

          {transactions.length === 0 ? (
            <div style={{ padding: "3rem", textAlign: "center", color: "var(--text-muted)" }}>
              <History size={40} style={{ margin: "0 auto 1rem", opacity: 0.3 }} />
              <p>Chưa có giao dịch nào được ghi nhận trên ví này.</p>
            </div>
          ) : (
            <div style={{ overflowX: "auto" }}>
              <table className="custom-table" style={{ width: "100%" }}>
                <thead>
                  <tr>
                    <th>Mã Giao Dịch</th>
                    <th>Thời Gian</th>
                    <th>Loại GD</th>
                    <th>Nội Dung Chi Tiết</th>
                    <th>Mã Tham Chiếu</th>
                    <th style={{ textAlign: "right" }}>Biến Động</th>
                    <th style={{ textAlign: "right" }}>Số Dư Sau GD</th>
                  </tr>
                </thead>
                <tbody>
                  {transactions.map((tx) => {
                    const isPlus = tx.type === "TOP_UP" || tx.type === "REFUND";
                    return (
                      <tr key={tx.id}>
                        <td style={{ fontWeight: 700, fontFamily: "monospace", fontSize: "0.8125rem" }}>
                          {tx.txId}
                        </td>
                        <td style={{ fontSize: "0.8125rem", color: "var(--text-dim)" }}>
                          {formatDateTimeDisplay(tx.createdAt)}
                        </td>
                        <td>
                          {tx.type === "TOP_UP" && (
                            <span style={{ display: "inline-flex", alignItems: "center", gap: "0.25rem", padding: "0.25rem 0.5rem", borderRadius: "6px", background: "rgba(16, 185, 129, 0.12)", color: "#059669", fontWeight: 700, fontSize: "0.75rem" }}>
                              <ArrowUpRight size={14} /> NẠP TIỀN
                            </span>
                          )}
                          {tx.type === "AUTO_DEBIT" && (
                            <span style={{ display: "inline-flex", alignItems: "center", gap: "0.25rem", padding: "0.25rem 0.5rem", borderRadius: "6px", background: "rgba(59, 130, 246, 0.12)", color: "#2563eb", fontWeight: 700, fontSize: "0.75rem" }}>
                              <ArrowDownLeft size={14} /> AUTO-DEBIT
                            </span>
                          )}
                          {tx.type === "REFUND" && (
                            <span style={{ display: "inline-flex", alignItems: "center", gap: "0.25rem", padding: "0.25rem 0.5rem", borderRadius: "6px", background: "rgba(147, 51, 234, 0.12)", color: "#7e22ce", fontWeight: 700, fontSize: "0.75rem" }}>
                              <RotateCcw size={14} /> HOÀN TIỀN
                            </span>
                          )}
                        </td>
                        <td style={{ fontSize: "0.875rem" }}>{tx.description}</td>
                        <td style={{ fontFamily: "monospace", fontSize: "0.8125rem", color: "var(--text-dim)" }}>
                          {tx.referenceId || "---"}
                        </td>
                        <td style={{ textAlign: "right", fontWeight: 800, fontSize: "0.9375rem", color: isPlus ? "#059669" : "#dc2626" }}>
                          {isPlus ? `+${formatCurrency(tx.amount)}` : `-${formatCurrency(tx.amount)}`}
                        </td>
                        <td style={{ textAlign: "right", fontWeight: 700, fontFamily: "monospace", fontSize: "0.875rem" }}>
                          {formatCurrency(tx.balanceAfter)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* TAB 2: Auto-Debit Settings */}
      {activeTab === "autodebit" && (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1.5rem" }}>
          {/* Box 1: Consent & Status */}
          <div className="glass-card" style={{ padding: "1.75rem", borderRadius: "16px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "1rem" }}>
              <div style={{ padding: "0.6rem", borderRadius: "12px", background: "rgba(79, 70, 229, 0.1)", color: "#4f46e5" }}>
                <ShieldCheck size={24} />
              </div>
              <h3 style={{ fontSize: "1.15rem", fontWeight: 800, margin: 0 }}>Trạng Thái Chấp Thuận Của Bạn</h3>
            </div>

            <div style={{ background: "var(--bg-secondary)", borderRadius: "12px", padding: "1.25rem", marginBottom: "1.25rem" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", paddingBottom: "0.75rem", borderBottom: "1px solid var(--border-color)" }}>
                <span style={{ fontSize: "0.875rem", color: "var(--text-dim)" }}>Ký thỏa thuận khách hàng:</span>
                {autoDebitStatus?.consent?.status === "CONSENTED" ? (
                  <span style={{ color: "#059669", fontWeight: 700, display: "flex", alignItems: "center", gap: "0.35rem" }}>
                    <CheckCircle2 size={16} /> ĐÃ KÝ CHẤP THUẬN
                  </span>
                ) : (
                  <span style={{ color: "#dc2626", fontWeight: 700, display: "flex", alignItems: "center", gap: "0.35rem" }}>
                    <AlertTriangle size={16} /> CHƯA KÝ / ĐÃ THU HỒI
                  </span>
                )}
              </div>

              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "0.75rem 0", borderBottom: "1px solid var(--border-color)" }}>
                <span style={{ fontSize: "0.875rem", color: "var(--text-dim)" }}>Phiên bản điều khoản ký:</span>
                <span style={{ fontWeight: 600 }}>{autoDebitStatus?.consent?.agreedTermsVersion || "Chưa có"}</span>
              </div>

              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "0.75rem 0", borderBottom: "1px solid var(--border-color)" }}>
                <span style={{ fontSize: "0.875rem", color: "var(--text-dim)" }}>Thời điểm ký kết:</span>
                <span style={{ fontWeight: 600 }}>
                  {autoDebitStatus?.consent?.consentedAt ? formatDateTimeDisplay(autoDebitStatus.consent.consentedAt) : "---"}
                </span>
              </div>

              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", paddingTop: "0.75rem" }}>
                <span style={{ fontSize: "0.875rem", color: "var(--text-dim)" }}>Kích hoạt hệ thống (Admin):</span>
                {autoDebitStatus?.setting?.isActive ? (
                  <span style={{ color: "#059669", fontWeight: 700 }}>ĐANG BẬT TỰ ĐỘNG TRỪ</span>
                ) : (
                  <span style={{ color: "#d97706", fontWeight: 700 }}>CHỜ ADMIN KÍCH HOẠT</span>
                )}
              </div>
            </div>

            <div style={{ display: "flex", gap: "0.75rem" }}>
              <button
                type="button"
                className="btn btn-primary"
                onClick={handleOpenTerms}
                style={{ flex: 1, padding: "0.75rem" }}
              >
                <FileText size={16} />
                <span>Xem & Ký Điều Khoản Auto-Debit</span>
              </button>

              {autoDebitStatus?.consent?.status === "CONSENTED" && (
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => handleConsentSubmit(false)}
                  style={{ color: "#dc2626", borderColor: "rgba(239, 68, 68, 0.3)" }}
                >
                  Thu Hồi Ký
                </button>
              )}
            </div>
          </div>

          {/* Box 2: Mechanics Explanation */}
          <div className="glass-card" style={{ padding: "1.75rem", borderRadius: "16px" }}>
            <h3 style={{ fontSize: "1.15rem", fontWeight: 800, marginBottom: "1rem" }}>
              Cơ Chế Trừ Tiền Tự Động (Auto-Debit SRS v1.0)
            </h3>

            <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
              <div style={{ display: "flex", gap: "0.75rem" }}>
                <div style={{ padding: "0.5rem", borderRadius: "8px", background: "rgba(16, 185, 129, 0.12)", color: "#059669", height: "fit-content" }}>
                  <Sparkles size={18} />
                </div>
                <div>
                  <h4 style={{ fontSize: "0.9375rem", fontWeight: 700, margin: 0 }}>Quy tắc BR-02: Dịch Vụ Phòng Hoàn Thành</h4>
                  <p style={{ fontSize: "0.8125rem", color: "var(--text-muted)", margin: "0.25rem 0 0 0" }}>
                    Khi bộ phận phục vụ giao món/dịch vụ hoàn tất (COMPLETED), nếu ví đủ tiền và tài khoản đã kích hoạt Auto-Debit, hệ thống tự động trừ tiền ngay tức thì. Phiếu dịch vụ được đánh dấu [ĐÃ THANH TOÁN], hóa đơn lúc Check-out tự động giảm trừ tương ứng, không bị thu trùng!
                  </p>
                </div>
              </div>

              <div style={{ display: "flex", gap: "0.75rem" }}>
                <div style={{ padding: "0.5rem", borderRadius: "8px", background: "rgba(59, 130, 246, 0.12)", color: "#2563eb", height: "fit-content" }}>
                  <Clock size={18} />
                </div>
                <div>
                  <h4 style={{ fontSize: "0.9375rem", fontWeight: 700, margin: 0 }}>Quy tắc BR-01: Quyết Toán Công Nợ Đến Hạn</h4>
                  <p style={{ fontSize: "0.8125rem", color: "var(--text-muted)", margin: "0.25rem 0 0 0" }}>
                    Các khoản nợ phòng hoặc dịch vụ chưa trả được hệ thống tự động quét và trừ từ ví khi đến hạn. Bạn cũng có thể bấm thanh toán chủ động bất kỳ lúc nào tại Tab "Quản Lý Công Nợ".
                  </p>
                </div>
              </div>

              <div style={{ display: "flex", gap: "0.75rem" }}>
                <div style={{ padding: "0.5rem", borderRadius: "8px", background: "rgba(239, 68, 68, 0.12)", color: "#dc2626", height: "fit-content" }}>
                  <ShieldCheck size={18} />
                </div>
                <div>
                  <h4 style={{ fontSize: "0.9375rem", fontWeight: 700, margin: 0 }}>Nguyên Tắc Bảo Toàn Số Dư (All-or-Nothing)</h4>
                  <p style={{ fontSize: "0.8125rem", color: "var(--text-muted)", margin: "0.25rem 0 0 0" }}>
                    Hệ thống TUYỆT ĐỐI KHÔNG trừ tiền một phần nếu ví thiếu số dư. Giao dịch sẽ hủy an toàn, bảo toàn 100% số dư còn lại của bạn và ghi nhận trạng thái nợ để bạn nạp thêm.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: Debts Management */}
      {activeTab === "debts" && (
        <div className="glass-card" style={{ padding: "1.5rem", borderRadius: "16px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.25rem" }}>
            <div>
              <h3 style={{ fontSize: "1.1rem", fontWeight: 700, margin: 0 }}>Danh Sách Công Nợ (Debt Folios)</h3>
              <p style={{ fontSize: "0.8125rem", color: "var(--text-muted)", margin: "0.25rem 0 0 0" }}>
                Theo dõi các khoản công nợ cần thanh toán. Hệ thống tự động khấu trừ qua Auto-Debit (BR-01) hoặc bạn có thể bấm thanh toán ngay bằng ví.
              </p>
            </div>
          </div>

          {debts.length === 0 ? (
            <div style={{ padding: "3rem", textAlign: "center", color: "var(--text-muted)" }}>
              <CheckCircle2 size={40} style={{ margin: "0 auto 1rem", opacity: 0.3, color: "#10b981" }} />
              <p>Tuyệt vời! Bạn không có khoản nợ nào cần thanh toán.</p>
            </div>
          ) : (
            <div style={{ overflowX: "auto" }}>
              <table className="custom-table" style={{ width: "100%" }}>
                <thead>
                  <tr>
                    <th>Mã Công Nợ</th>
                    <th>Lý Do Phát Sinh</th>
                    <th>Hạn Thanh Toán</th>
                    <th style={{ textAlign: "right" }}>Số Tiền Nợ</th>
                    <th style={{ textAlign: "center" }}>Trạng Thái</th>
                    <th style={{ textAlign: "right" }}>Thao Tác</th>
                  </tr>
                </thead>
                <tbody>
                  {debts.map((d) => (
                    <tr key={d.id}>
                      <td style={{ fontWeight: 700, fontFamily: "monospace", fontSize: "0.8125rem" }}>
                        {d.debtId}
                      </td>
                      <td style={{ fontSize: "0.875rem" }}>
                        {d.reason}
                        {d.bookingId && (
                          <div style={{ fontSize: "0.75rem", color: "var(--text-dim)", marginTop: "2px" }}>
                            Liên kết Booking #{d.bookingId}
                          </div>
                        )}
                      </td>
                      <td style={{ fontSize: "0.8125rem" }}>
                        {formatDateTimeDisplay(d.dueDate)}
                      </td>
                      <td style={{ textAlign: "right", fontWeight: 800, color: "#dc2626", fontSize: "0.9375rem" }}>
                        {formatCurrency(d.amount)}
                      </td>
                      <td style={{ textAlign: "center" }}>
                        {d.status === "PAID" && (
                          <span style={{ padding: "0.25rem 0.6rem", borderRadius: "6px", background: "rgba(16, 185, 129, 0.12)", color: "#059669", fontWeight: 700, fontSize: "0.75rem" }}>
                            ĐÃ THANH TOÁN
                          </span>
                        )}
                        {d.status === "PENDING" && (
                          <span style={{ padding: "0.25rem 0.6rem", borderRadius: "6px", background: "rgba(245, 158, 11, 0.12)", color: "#d97706", fontWeight: 700, fontSize: "0.75rem" }}>
                            CHỜ THANH TOÁN
                          </span>
                        )}
                        {d.status === "OVERDUE" && (
                          <span style={{ padding: "0.25rem 0.6rem", borderRadius: "6px", background: "rgba(239, 68, 68, 0.12)", color: "#dc2626", fontWeight: 700, fontSize: "0.75rem" }}>
                            QUÁ HẠN (OVERDUE)
                          </span>
                        )}
                        {d.status === "CANCELLED" && (
                          <span style={{ padding: "0.25rem 0.6rem", borderRadius: "6px", background: "rgba(100, 116, 139, 0.12)", color: "#64748b", fontWeight: 700, fontSize: "0.75rem" }}>
                            ĐÃ HỦY
                          </span>
                        )}
                      </td>
                      <td style={{ textAlign: "right" }}>
                        {(d.status === "PENDING" || d.status === "OVERDUE") && (
                          <button
                            type="button"
                            className="btn btn-primary"
                            disabled={processingDebtId === d.debtId || (wallet && wallet.balance < d.amount)}
                            onClick={() => handlePayDebt(d.debtId)}
                            style={{ fontSize: "0.75rem", padding: "0.4rem 0.8rem" }}
                            title={wallet && wallet.balance < d.amount ? "Số dư ví không đủ, vui lòng nạp thêm tiền" : "Thanh toán ngay"}
                          >
                            {processingDebtId === d.debtId ? "Đang xử lý..." : "Trả qua Ví (BR-01)"}
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* TAB 4: Refunds */}
      {activeTab === "refunds" && (
        <div className="glass-card" style={{ padding: "1.5rem", borderRadius: "16px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.25rem" }}>
            <div>
              <h3 style={{ fontSize: "1.1rem", fontWeight: 700, margin: 0 }}>Lịch Sử Tiền Hoàn Trả (Refund Records)</h3>
              <p style={{ fontSize: "0.8125rem", color: "var(--text-muted)", margin: "0.25rem 0 0 0" }}>
                Tiền hoàn trả từ các đơn hủy phòng hoặc điều chỉnh dịch vụ được cộng trực tiếp vào ví nội bộ 100%.
              </p>
            </div>
          </div>

          {refunds.length === 0 ? (
            <div style={{ padding: "3rem", textAlign: "center", color: "var(--text-muted)" }}>
              <RotateCcw size={40} style={{ margin: "0 auto 1rem", opacity: 0.3 }} />
              <p>Chưa có khoản tiền hoàn nào được ghi nhận.</p>
            </div>
          ) : (
            <div style={{ overflowX: "auto" }}>
              <table className="custom-table" style={{ width: "100%" }}>
                <thead>
                  <tr>
                    <th>Mã Hoàn Tiền</th>
                    <th>Thời Điểm Hoàn</th>
                    <th>Lý Do Hoàn</th>
                    <th>Mã Giao Dịch Gốc</th>
                    <th style={{ textAlign: "right" }}>Số Tiền Hoàn</th>
                    <th style={{ textAlign: "center" }}>Trạng Thái</th>
                  </tr>
                </thead>
                <tbody>
                  {refunds.map((r) => (
                    <tr key={r.id}>
                      <td style={{ fontWeight: 700, fontFamily: "monospace", fontSize: "0.8125rem" }}>
                        {r.refundId}
                      </td>
                      <td style={{ fontSize: "0.8125rem", color: "var(--text-dim)" }}>
                        {formatDateTimeDisplay(r.createdAt)}
                      </td>
                      <td style={{ fontSize: "0.875rem" }}>{r.reason}</td>
                      <td style={{ fontFamily: "monospace", fontSize: "0.8125rem", color: "var(--text-dim)" }}>
                        {r.originalTransactionId}
                      </td>
                      <td style={{ textAlign: "right", fontWeight: 800, color: "#7e22ce", fontSize: "0.9375rem" }}>
                        +{formatCurrency(r.amount)}
                      </td>
                      <td style={{ textAlign: "center" }}>
                        <span style={{ padding: "0.25rem 0.6rem", borderRadius: "6px", background: "rgba(147, 51, 234, 0.12)", color: "#7e22ce", fontWeight: 700, fontSize: "0.75rem" }}>
                          {r.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* MODAL: Mock Top-Up */}
      {isTopUpOpen && (
        <div className="fixed inset-0 z-50 bg-black bg-opacity-60 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <CreditCard className="w-5 h-5 text-emerald-400" />
                <h3 className="font-bold text-base">Nạp Tiền Giả Lập Vào Ví</h3>
              </div>
              <button
                onClick={() => setIsTopUpOpen(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleTopUpSubmit} className="p-6">
              <div className="mb-4">
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  Chọn mức nạp nhanh
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {[500000, 1000000, 2000000, 5000000, 10000000, 20000000].map((amt) => (
                    <button
                      key={amt}
                      type="button"
                      onClick={() => setTopUpAmount(amt)}
                      className={`py-2 text-xs font-bold rounded-lg border transition ${
                        topUpAmount === amt
                          ? "bg-emerald-50 border-emerald-500 text-emerald-700"
                          : "border-slate-200 hover:bg-slate-50 text-slate-700"
                      }`}
                    >
                      {formatCurrency(amt)}
                    </button>
                  ))}
                </div>
              </div>

              <div className="mb-4">
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  Số tiền nạp tùy chỉnh (VND)
                </label>
                <input
                  type="number"
                  min="10000"
                  max="100000000"
                  step="10000"
                  required
                  value={topUpAmount}
                  onChange={(e) => setTopUpAmount(Number(e.target.value))}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div className="mb-4">
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  Cổng ngân hàng giả lập
                </label>
                <select
                  value={topUpBank}
                  onChange={(e) => setTopUpBank(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                >
                  <option value="NCB">Ngân hàng Quốc Dân (NCB)</option>
                  <option value="VCB">Vietcombank (VCB)</option>
                  <option value="MB">MBBank (MB)</option>
                  <option value="TCB">Techcombank (TCB)</option>
                  <option value="ACB">ACB</option>
                </select>
              </div>

              <div className="mb-6">
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  Ghi chú nạp tiền
                </label>
                <input
                  type="text"
                  placeholder="VD: Nạp ví thanh toán dịch vụ nghỉ dưỡng..."
                  value={topUpNote}
                  onChange={(e) => setTopUpNote(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div className="flex space-x-2">
                <button
                  type="button"
                  onClick={() => setIsTopUpOpen(false)}
                  className="w-1/2 py-2.5 border border-slate-300 text-slate-700 text-sm font-bold rounded-lg hover:bg-slate-100 transition"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={topUpLoading}
                  className="w-1/2 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-bold rounded-lg transition shadow"
                >
                  {topUpLoading ? "Đang xử lý..." : "Xác Nhận Nạp"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: Auto-Debit Terms Reader & Consent */}
      {isTermsOpen && (
        <div className="fixed inset-0 z-50 bg-black bg-opacity-60 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <ShieldCheck className="w-5 h-5 text-indigo-400" />
                <h3 className="font-bold text-base">Điều Khoản Dịch Vụ Auto-Debit ({termsData?.termsVersion || "v1.0"})</h3>
              </div>
              <button
                onClick={() => setIsTermsOpen(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto flex-1 text-sm text-slate-800 leading-relaxed bg-slate-50">
              {termsLoading ? (
                <div className="py-8 text-center text-slate-500">Đang tải điều khoản...</div>
              ) : (
                <div className="whitespace-pre-line bg-white p-6 rounded-xl border border-slate-200 font-sans shadow-sm">
                  {termsData?.termsText}
                </div>
              )}
            </div>

            <div className="p-4 bg-white border-t border-slate-200 flex items-center justify-between">
              <span className="text-xs text-slate-500">
                Bằng việc bấm xác nhận, bạn chấp thuận quy chế trừ ví tự động của e-Hotel.
              </span>
              <div className="flex space-x-2">
                <button
                  type="button"
                  onClick={() => setIsTermsOpen(false)}
                  className="px-4 py-2 border border-slate-300 text-slate-700 text-sm font-bold rounded-lg hover:bg-slate-100"
                >
                  Đóng
                </button>
                <button
                  type="button"
                  onClick={() => handleConsentSubmit(true)}
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-bold rounded-lg shadow"
                >
                  Tôi Đồng Ý Ký Chấp Thuận
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
