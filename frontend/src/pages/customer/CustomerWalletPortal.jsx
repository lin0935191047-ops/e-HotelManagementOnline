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
  Filter,
  Ban,
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
  const [transactions, setTransactions] = useState([]);
  const [autoDebitStatus, setAutoDebitStatus] = useState(null);
  const [debts, setDebts] = useState([]);
  const [refunds, setRefunds] = useState([]);
  const [debtFilter, setDebtFilter] = useState("ALL"); // 'ALL' | 'UNPAID' | 'OVERDUE' | 'PAID'
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
  const [disableLoading, setDisableLoading] = useState(false);

  // Fetch full customer data
  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Batch load customer data
      const [walletRes, autoDebitRes, debtsRes, refundsRes, txRes] = await Promise.all([
        apiRequest("/api/wallet/my-wallet").catch(() => null),
        apiRequest("/api/auto-debit/my-status").catch(() => null),
        apiRequest("/api/auto-debit/debts/my-debts").catch(() => ({ data: { debts: [] } })),
        apiRequest("/api/wallet/refunds/my-refunds").catch(() => ({ data: { refunds: [] } })),
        apiRequest("/api/wallet/transactions").catch(() => ({ data: { transactions: [] } })),
      ]);

      if (walletRes && walletRes.data) {
        setWallet(walletRes.data);
      }
      if (autoDebitRes && autoDebitRes.data) {
        setAutoDebitStatus(autoDebitRes.data);
      }
      if (debtsRes && debtsRes.data) {
        const debtsList = Array.isArray(debtsRes.data)
          ? debtsRes.data
          : debtsRes.data.debts || [];
        setDebts(debtsList);
      }
      if (refundsRes && refundsRes.data) {
        const refundsList = Array.isArray(refundsRes.data)
          ? refundsRes.data
          : refundsRes.data.refunds || [];
        setRefunds(refundsList);
      }
      if (txRes && txRes.data) {
        const txList = Array.isArray(txRes.data)
          ? txRes.data
          : txRes.data.transactions || [];
        setTransactions(txList);
      } else if (walletRes?.data?.recentTransactions) {
        setTransactions(walletRes.data.recentTransactions);
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
      await apiRequest("/api/wallet/top-up", {
        method: "POST",
        body: JSON.stringify({
          amount: Number(topUpAmount),
          paymentMethod: topUpBank,
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

  // Disable / Revoke Auto-Debit
  const handleDisableAutoDebit = async () => {
    try {
      setDisableLoading(true);
      setError(null);
      const res = await apiRequest("/api/auto-debit/revoke", {
        method: "POST",
      });
      setSuccessMsg(
        res?.message || "Đã tắt dịch vụ Auto-Debit và thu hồi thỏa thuận thành công."
      );
      setIsTermsOpen(false);
      fetchData();
      setTimeout(() => setSuccessMsg(null), 5000);
    } catch (err) {
      setError(err.message || "Lỗi khi tắt Auto-Debit.");
    } finally {
      setDisableLoading(false);
    }
  };

  // Submit Consent
  const handleConsentSubmit = async (agreed) => {
    if (!agreed) {
      return handleDisableAutoDebit();
    }
    try {
      setError(null);
      await apiRequest("/api/auto-debit/consent", {
        method: "POST",
        body: JSON.stringify({
          consent: agreed,
          agreedTermsVersion: termsData?.termsVersion || "v1.0",
        }),
      });

      setSuccessMsg("Bạn đã đồng ý và ký thỏa thuận dịch vụ Auto-Debit thành công!");
      setIsTermsOpen(false);
      fetchData();
      setTimeout(() => setSuccessMsg(null), 5000);
    } catch (err) {
      setError(err.message);
    }
  };

  // Process Debt Payment via BR-01
  const handlePayDebt = async (debtIdentifier) => {
    try {
      setProcessingDebtId(debtIdentifier);
      setError(null);
      const res = await apiRequest(`/api/auto-debit/debts/${debtIdentifier}/process`, {
        method: "POST",
      });

      setSuccessMsg(res?.message || `Đã thanh toán thành công công nợ ${debtIdentifier} từ số dư ví!`);
      fetchData();
      setTimeout(() => setSuccessMsg(null), 5000);
    } catch (err) {
      setError(err.message);
    } finally {
      setProcessingDebtId(null);
    }
  };

  const displayTransactions =
    transactions.length > 0
      ? transactions
      : wallet?.transactions || wallet?.recentTransactions || [];

  // Derived Auto-Debit states (compatible with all API response shapes)
  const isAutoDebitActive =
    autoDebitStatus?.autoDebitStatus === "ACTIVE" ||
    autoDebitStatus?.setting?.isActive === true ||
    autoDebitStatus?.setting?.status === "ACTIVE";

  const isAutoDebitPending =
    autoDebitStatus?.autoDebitStatus === "PENDING_ADMIN" ||
    autoDebitStatus?.setting?.status === "PENDING_ADMIN";

  const isAutoDebitPaused =
    autoDebitStatus?.autoDebitStatus === "PAUSED" ||
    autoDebitStatus?.setting?.status === "PAUSED";

  const isAutoDebitDisabled =
    autoDebitStatus?.autoDebitStatus === "DISABLED" ||
    autoDebitStatus?.setting?.status === "DISABLED";

  const isConsented =
    autoDebitStatus?.latestConsent?.isActive === true ||
    autoDebitStatus?.consent?.status === "CONSENTED" ||
    autoDebitStatus?.consent?.isActive === true;

  const consentVersion =
    autoDebitStatus?.latestConsent?.termsVersion ||
    autoDebitStatus?.consent?.agreedTermsVersion ||
    autoDebitStatus?.consent?.termsVersion ||
    null;

  const consentedAt =
    autoDebitStatus?.latestConsent?.agreedAt ||
    autoDebitStatus?.consent?.consentedAt ||
    autoDebitStatus?.consent?.agreedAt ||
    null;

  // Debts statistics
  const unpaidDebts = debts.filter(
    (d) => d.status === "UNPAID" || d.status === "OVERDUE" || d.status === "PENDING"
  );
  const unpaidDebtsCount = unpaidDebts.length;
  const totalUnpaidAmount = unpaidDebts.reduce(
    (sum, d) => sum + (Number(d.amount) - Number(d.paidAmount || 0)),
    0
  );

  const filteredDebts = debts.filter((d) => {
    if (debtFilter === "ALL") return true;
    if (debtFilter === "UNPAID") return d.status === "UNPAID" || d.status === "PENDING";
    if (debtFilter === "OVERDUE") return d.status === "OVERDUE";
    if (debtFilter === "PAID") return d.status === "PAID";
    return true;
  });

  // Refunds statistics
  const totalRefundAmount = refunds.reduce((sum, r) => sum + Number(r.amount || 0), 0);

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
                  <code style={{ background: "rgba(0,0,0,0.35)", padding: "2px 8px", borderRadius: "6px", fontWeight: 700, color: "#a5b4fc" }}>
                    {wallet?.walletNumber || wallet?.walletId || "WAL-20261123-XDFP"}
                  </code>
                  {totalUnpaidAmount > 0 && (
                    <span
                      style={{
                        marginLeft: "0.75rem",
                        padding: "2px 8px",
                        borderRadius: "12px",
                        background: "rgba(239, 68, 68, 0.25)",
                        border: "1px solid rgba(239, 68, 68, 0.4)",
                        color: "#fca5a5",
                        fontSize: "0.75rem",
                        fontWeight: 700,
                      }}
                    >
                      Dư nợ cần trả: {formatCurrency(totalUnpaidAmount)}
                    </span>
                  )}
                </p>
              </div>
            </div>

            <div style={{ marginTop: "1.25rem" }}>
              <div style={{ fontSize: "0.8125rem", color: "rgba(255, 255, 255, 0.7)", textTransform: "uppercase", letterSpacing: "0.06em", fontWeight: 600 }}>
                Số Dư Khả Dụng Hiện Tại
              </div>
              <div style={{ fontSize: "2.4rem", fontWeight: 900, color: "#ffffff", letterSpacing: "-0.02em", marginTop: "0.2rem" }}>
                {wallet ? formatCurrency(wallet.balance) : "0 ₫"}
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

              {isAutoDebitActive ? (
                <div style={{ display: "inline-flex", alignItems: "center", gap: "0.5rem" }}>
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
                    <ShieldCheck size={14} /> AUTO-DEBIT: BẬT
                  </span>
                  <button
                    type="button"
                    onClick={handleDisableAutoDebit}
                    disabled={disableLoading}
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "0.25rem",
                      padding: "0.32rem 0.65rem",
                      borderRadius: "20px",
                      background: "rgba(239, 68, 68, 0.25)",
                      border: "1px solid rgba(239, 68, 68, 0.5)",
                      color: "#fca5a5",
                      fontSize: "0.72rem",
                      fontWeight: 700,
                      cursor: disableLoading ? "not-allowed" : "pointer",
                      transition: "all 0.2s",
                    }}
                    title="Tắt dịch vụ Auto-Debit ngay"
                  >
                    <Ban size={12} /> {disableLoading ? "Đang tắt..." : "TẮT"}
                  </button>
                </div>
              ) : isAutoDebitPending ? (
                <span
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "0.35rem",
                    padding: "0.35rem 0.75rem",
                    borderRadius: "20px",
                    background: "rgba(245, 158, 11, 0.2)",
                    border: "1px solid rgba(245, 158, 11, 0.4)",
                    color: "#fcd34d",
                    fontSize: "0.75rem",
                    fontWeight: 700,
                  }}
                >
                  <Clock size={14} /> AUTO-DEBIT: CHỜ ADMIN DUYỆT
                </span>
              ) : isAutoDebitPaused ? (
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
                  AUTO-DEBIT: TẠM DỪNG
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
          <span>Lịch Sử Giao Dịch Ví ({displayTransactions.length})</span>
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
          <span>
            Quản Lý Công Nợ ({unpaidDebtsCount > 0 ? unpaidDebtsCount : debts.length})
          </span>
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

          {displayTransactions.length === 0 ? (
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
                    <th style={{ textAlign: "right" }}>Biến Động</th>
                    <th style={{ textAlign: "right" }}>Số Dư Sau GD</th>
                  </tr>
                </thead>
                <tbody>
                  {displayTransactions.map((tx) => {
                    const isPlus =
                      tx.type === "TOP_UP" ||
                      tx.type === "TOP_UP_MOCK" ||
                      tx.type === "REFUND";
                    return (
                      <tr key={tx.id || tx.transactionNo}>
                        <td style={{ fontWeight: 700, fontFamily: "monospace", fontSize: "0.8125rem" }}>
                          {tx.transactionNo || tx.txId || `WTX-${tx.id}`}
                        </td>
                        <td style={{ fontSize: "0.8125rem", color: "var(--text-dim)" }}>
                          {formatDateTimeDisplay(tx.createdAt)}
                        </td>
                        <td>
                          {(tx.type === "TOP_UP" || tx.type === "TOP_UP_MOCK") && (
                            <span style={{ display: "inline-flex", alignItems: "center", gap: "0.25rem", padding: "0.25rem 0.5rem", borderRadius: "6px", background: "rgba(16, 185, 129, 0.12)", color: "#059669", fontWeight: 700, fontSize: "0.75rem" }}>
                              <ArrowUpRight size={14} /> NẠP TIỀN
                            </span>
                          )}
                          {tx.type === "AUTO_DEBIT_SERVICE" && (
                            <span style={{ display: "inline-flex", alignItems: "center", gap: "0.25rem", padding: "0.25rem 0.5rem", borderRadius: "6px", background: "rgba(59, 130, 246, 0.12)", color: "#2563eb", fontWeight: 700, fontSize: "0.75rem" }}>
                              <ArrowDownLeft size={14} /> TRỪ DỊCH VỤ (BR-02)
                            </span>
                          )}
                          {(tx.type === "AUTO_DEBIT_DEBT" || tx.type === "AUTO_DEBIT") && (
                            <span style={{ display: "inline-flex", alignItems: "center", gap: "0.25rem", padding: "0.25rem 0.5rem", borderRadius: "6px", background: "rgba(99, 102, 241, 0.12)", color: "#4f46e5", fontWeight: 700, fontSize: "0.75rem" }}>
                              <ArrowDownLeft size={14} /> TRẢ CÔNG NỢ (BR-01)
                            </span>
                          )}
                          {tx.type === "REFUND" && (
                            <span style={{ display: "inline-flex", alignItems: "center", gap: "0.25rem", padding: "0.25rem 0.5rem", borderRadius: "6px", background: "rgba(147, 51, 234, 0.12)", color: "#7e22ce", fontWeight: 700, fontSize: "0.75rem" }}>
                              <RotateCcw size={14} /> HOÀN TIỀN VÀO VÍ
                            </span>
                          )}
                          {!["TOP_UP", "TOP_UP_MOCK", "AUTO_DEBIT_SERVICE", "AUTO_DEBIT_DEBT", "AUTO_DEBIT", "REFUND"].includes(tx.type) && (
                            <span style={{ display: "inline-flex", alignItems: "center", gap: "0.25rem", padding: "0.25rem 0.5rem", borderRadius: "6px", background: "rgba(100, 116, 139, 0.12)", color: "#475569", fontWeight: 700, fontSize: "0.75rem" }}>
                              {tx.type}
                            </span>
                          )}
                        </td>
                        <td style={{ fontSize: "0.875rem" }}>
                          {tx.description}
                          {tx.referenceId && (
                            <div style={{ fontSize: "0.75rem", color: "var(--text-dim)", fontFamily: "monospace", marginTop: "2px" }}>
                              Ref: {tx.referenceId}
                            </div>
                          )}
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
                {isConsented ? (
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
                <span style={{ fontWeight: 600 }}>{consentVersion || "Chưa có"}</span>
              </div>

              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "0.75rem 0", borderBottom: "1px solid var(--border-color)" }}>
                <span style={{ fontSize: "0.875rem", color: "var(--text-dim)" }}>Thời điểm ký kết:</span>
                <span style={{ fontWeight: 600 }}>
                  {consentedAt ? formatDateTimeDisplay(consentedAt) : "---"}
                </span>
              </div>

              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", paddingTop: "0.75rem" }}>
                <span style={{ fontSize: "0.875rem", color: "var(--text-dim)" }}>Kích hoạt hệ thống (Admin):</span>
                {isAutoDebitActive ? (
                  <span style={{ color: "#059669", fontWeight: 700 }}>ĐANG BẬT TỰ ĐỘNG TRỪ (ACTIVE)</span>
                ) : isAutoDebitPending ? (
                  <span style={{ color: "#d97706", fontWeight: 700 }}>CHỜ ADMIN KÍCH HOẠT</span>
                ) : isAutoDebitPaused ? (
                  <span style={{ color: "#6b7280", fontWeight: 700 }}>TẠM DỪNG (PAUSED)</span>
                ) : isAutoDebitDisabled ? (
                  <span style={{ color: "#dc2626", fontWeight: 700 }}>ĐÃ TẮT (DISABLED)</span>
                ) : (
                  <span style={{ color: "#6b7280", fontWeight: 700 }}>CHƯA KÍCH HOẠT</span>
                )}
              </div>
            </div>

            <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap" }}>
              <button
                type="button"
                className="btn btn-primary"
                onClick={handleOpenTerms}
                style={{ flex: 1, padding: "0.75rem" }}
              >
                <FileText size={16} />
                <span>Xem & Ký Điều Khoản Auto-Debit</span>
              </button>

              {(isConsented || isAutoDebitActive || isAutoDebitPending) && (
                <button
                  type="button"
                  className="btn btn-secondary"
                  disabled={disableLoading}
                  onClick={handleDisableAutoDebit}
                  style={{
                    color: "#dc2626",
                    borderColor: "rgba(239, 68, 68, 0.4)",
                    background: "rgba(239, 68, 68, 0.06)",
                    padding: "0.75rem 1.25rem",
                    fontWeight: 700,
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "0.45rem",
                    cursor: disableLoading ? "not-allowed" : "pointer",
                  }}
                  title="Tắt tính năng Auto-Debit và thu hồi thỏa thuận"
                >
                  <Ban size={16} />
                  <span>{disableLoading ? "Đang tắt..." : "Tắt Auto-Debit (Thu Hồi Ký)"}</span>
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
          {/* Header & Quick Stats */}
          <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "space-between", alignItems: "center", gap: "1rem", marginBottom: "1.5rem" }}>
            <div>
              <h3 style={{ fontSize: "1.15rem", fontWeight: 800, margin: 0 }}>Quản Lý Công Nợ Khách Hàng (FEAT-13.4)</h3>
              <p style={{ fontSize: "0.8125rem", color: "var(--text-muted)", margin: "0.25rem 0 0 0" }}>
                Theo dõi và quyết toán các khoản nợ lưu trú hoặc dịch vụ phòng. Bạn có thể thanh toán chủ động bất cứ lúc nào qua ví nội bộ hoặc chờ hệ thống tự động khấu trừ qua Auto-Debit (BR-01).
              </p>
            </div>

            {/* Quick Stats Pill */}
            <div style={{ display: "flex", gap: "1rem" }}>
              <div
                style={{
                  padding: "0.6rem 1rem",
                  borderRadius: "12px",
                  background: totalUnpaidAmount > 0 ? "rgba(239, 68, 68, 0.08)" : "rgba(16, 185, 129, 0.08)",
                  border: `1px solid ${totalUnpaidAmount > 0 ? "rgba(239, 68, 68, 0.25)" : "rgba(16, 185, 129, 0.25)"}`,
                }}
              >
                <div style={{ fontSize: "0.7rem", color: "var(--text-dim)", textTransform: "uppercase", fontWeight: 700 }}>
                  Tổng Công Nợ Chưa Trả
                </div>
                <div style={{ fontSize: "1.2rem", fontWeight: 800, color: totalUnpaidAmount > 0 ? "#dc2626" : "#059669" }}>
                  {formatCurrency(totalUnpaidAmount)}
                </div>
              </div>

              <div
                style={{
                  padding: "0.6rem 1rem",
                  borderRadius: "12px",
                  background: "rgba(79, 70, 229, 0.08)",
                  border: "1px solid rgba(79, 70, 229, 0.25)",
                }}
              >
                <div style={{ fontSize: "0.7rem", color: "var(--text-dim)", textTransform: "uppercase", fontWeight: 700 }}>
                  Khoản Chờ Quyết Toán
                </div>
                <div style={{ fontSize: "1.2rem", fontWeight: 800, color: "#4f46e5" }}>
                  {unpaidDebtsCount} khoản
                </div>
              </div>
            </div>
          </div>

          {/* Filter Bar */}
          <div style={{ display: "flex", gap: "0.5rem", marginBottom: "1.25rem", flexWrap: "wrap", alignItems: "center" }}>
            <span style={{ fontSize: "0.8125rem", color: "var(--text-dim)", fontWeight: 600, marginRight: "0.25rem" }}>
              Lọc theo trạng thái:
            </span>
            {[
              { id: "ALL", label: `Tất cả (${debts.length})` },
              { id: "UNPAID", label: `Chờ thanh toán (${debts.filter((d) => d.status === "UNPAID" || d.status === "PENDING").length})` },
              { id: "OVERDUE", label: `Quá hạn (${debts.filter((d) => d.status === "OVERDUE").length})` },
              { id: "PAID", label: `Đã thanh toán (${debts.filter((d) => d.status === "PAID").length})` },
            ].map((f) => (
              <button
                key={f.id}
                type="button"
                className={`btn btn-secondary ${debtFilter === f.id ? "btn-primary" : ""}`}
                onClick={() => setDebtFilter(f.id)}
                style={{ fontSize: "0.78rem", padding: "0.35rem 0.75rem", borderRadius: "8px" }}
              >
                {f.label}
              </button>
            ))}
          </div>

          {filteredDebts.length === 0 ? (
            <div style={{ padding: "3rem", textAlign: "center", color: "var(--text-muted)" }}>
              <CheckCircle2 size={42} style={{ margin: "0 auto 1rem", opacity: 0.35, color: "#10b981" }} />
              <p style={{ fontWeight: 600, fontSize: "0.95rem" }}>
                {debtFilter === "ALL"
                  ? "Tuyệt vời! Bạn không có khoản công nợ nào trên hệ thống."
                  : "Không có khoản công nợ nào trong bộ lọc này."}
              </p>
            </div>
          ) : (
            <div style={{ overflowX: "auto" }}>
              <table className="custom-table" style={{ width: "100%" }}>
                <thead>
                  <tr>
                    <th>Mã Công Nợ</th>
                    <th>Nội Dung & Lý Do</th>
                    <th>Loại Nợ</th>
                    <th>Hạn Quyết Toán</th>
                    <th style={{ textAlign: "right" }}>Số Tiền Nợ</th>
                    <th style={{ textAlign: "center" }}>Trạng Thái</th>
                    <th style={{ textAlign: "right" }}>Quyết Toán (BR-01)</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredDebts.map((d) => {
                    const isDueOrPending =
                      d.status === "UNPAID" || d.status === "OVERDUE" || d.status === "PENDING";
                    const isOverdue = d.status === "OVERDUE" || (isDueOrPending && new Date(d.dueDate) < new Date());
                    const remainingAmount = Number(d.amount) - (Number(d.paidAmount) || 0);
                    const canAfford = wallet && Number(wallet.balance) >= remainingAmount;
                    const debtIdKey = d.debtCode || d.debtId || d.id;

                    return (
                      <tr key={debtIdKey}>
                        <td style={{ fontWeight: 700, fontFamily: "monospace", fontSize: "0.8125rem" }}>
                          {d.debtCode || `DBT-${d.debtId || d.id}`}
                        </td>
                        <td style={{ fontSize: "0.875rem" }}>
                          <div style={{ fontWeight: 600, color: "var(--text-main)" }}>
                            {d.note ||
                              (d.type === "BOOKING_BALANCE"
                                ? "Quyết toán tiền phòng còn lại"
                                : "Chi phí dịch vụ phòng")}
                          </div>
                          <div style={{ display: "flex", gap: "0.5rem", marginTop: "4px" }}>
                            {d.bookingId && (
                              <span style={{ fontSize: "0.72rem", padding: "1px 6px", borderRadius: "4px", background: "rgba(79, 70, 229, 0.1)", color: "#4f46e5" }}>
                                Booking #{d.bookingId}
                              </span>
                            )}
                            {d.ticketId && (
                              <span style={{ fontSize: "0.72rem", padding: "1px 6px", borderRadius: "4px", background: "rgba(16, 185, 129, 0.1)", color: "#059669" }}>
                                Phiếu DV: {d.ticketId}
                              </span>
                            )}
                          </div>
                        </td>
                        <td>
                          {d.type === "BOOKING_BALANCE" ? (
                            <span style={{ padding: "0.2rem 0.5rem", borderRadius: "6px", background: "rgba(59, 130, 246, 0.12)", color: "#2563eb", fontWeight: 700, fontSize: "0.75rem" }}>
                              TIỀN PHÒNG
                            </span>
                          ) : (
                            <span style={{ padding: "0.2rem 0.5rem", borderRadius: "6px", background: "rgba(245, 158, 11, 0.12)", color: "#d97706", fontWeight: 700, fontSize: "0.75rem" }}>
                              DỊCH VỤ PHÒNG
                            </span>
                          )}
                        </td>
                        <td style={{ fontSize: "0.8125rem" }}>
                          <div>{formatDateTimeDisplay(d.dueDate)}</div>
                          {isDueOrPending && (
                            <span
                              style={{
                                fontSize: "0.7rem",
                                fontWeight: 700,
                                color: isOverdue ? "#dc2626" : "#d97706",
                              }}
                            >
                              {isOverdue ? "⚠ Đã quá hạn" : "⏱ Đang chờ thu"}
                            </span>
                          )}
                        </td>
                        <td style={{ textAlign: "right" }}>
                          <div style={{ fontWeight: 800, color: "#dc2626", fontSize: "0.9375rem" }}>
                            {formatCurrency(d.amount)}
                          </div>
                          {d.paidAmount > 0 && (
                            <div style={{ fontSize: "0.72rem", color: "#059669", fontWeight: 600 }}>
                              Đã trả: {formatCurrency(d.paidAmount)}
                            </div>
                          )}
                        </td>
                        <td style={{ textAlign: "center" }}>
                          {d.status === "PAID" && (
                            <span style={{ padding: "0.25rem 0.6rem", borderRadius: "6px", background: "rgba(16, 185, 129, 0.12)", color: "#059669", fontWeight: 700, fontSize: "0.75rem", display: "inline-flex", alignItems: "center", gap: "0.25rem" }}>
                              <CheckCircle2 size={13} /> ĐÃ THANH TOÁN
                            </span>
                          )}
                          {(d.status === "UNPAID" || d.status === "PENDING") && !isOverdue && (
                            <span style={{ padding: "0.25rem 0.6rem", borderRadius: "6px", background: "rgba(245, 158, 11, 0.12)", color: "#d97706", fontWeight: 700, fontSize: "0.75rem", display: "inline-flex", alignItems: "center", gap: "0.25rem" }}>
                              <Clock size={13} /> CHỜ THANH TOÁN
                            </span>
                          )}
                          {isOverdue && d.status !== "PAID" && d.status !== "CANCELLED" && (
                            <span style={{ padding: "0.25rem 0.6rem", borderRadius: "6px", background: "rgba(239, 68, 68, 0.12)", color: "#dc2626", fontWeight: 700, fontSize: "0.75rem", display: "inline-flex", alignItems: "center", gap: "0.25rem" }}>
                              <AlertTriangle size={13} /> QUÁ HẠN (OVERDUE)
                            </span>
                          )}
                          {d.status === "CANCELLED" && (
                            <span style={{ padding: "0.25rem 0.6rem", borderRadius: "6px", background: "rgba(100, 116, 139, 0.12)", color: "#64748b", fontWeight: 700, fontSize: "0.75rem" }}>
                              ĐÃ HỦY
                            </span>
                          )}
                        </td>
                        <td style={{ textAlign: "right" }}>
                          {isDueOrPending ? (
                            canAfford ? (
                              <button
                                type="button"
                                className="btn btn-primary"
                                disabled={processingDebtId === debtIdKey}
                                onClick={() => handlePayDebt(debtIdKey)}
                                style={{
                                  fontSize: "0.75rem",
                                  padding: "0.45rem 0.85rem",
                                  background: "linear-gradient(135deg, #4f46e5 0%, #4338ca 100%)",
                                  fontWeight: 700,
                                }}
                              >
                                {processingDebtId === debtIdKey ? "Đang xử lý..." : "Trả qua Ví (BR-01)"}
                              </button>
                            ) : (
                              <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: "0.2rem" }}>
                                <button
                                  type="button"
                                  className="btn btn-secondary"
                                  onClick={() => {
                                    setTopUpAmount(Math.max(500000, remainingAmount - Number(wallet?.balance || 0)));
                                    setIsTopUpOpen(true);
                                  }}
                                  style={{
                                    fontSize: "0.72rem",
                                    padding: "0.3rem 0.65rem",
                                    color: "#dc2626",
                                    borderColor: "rgba(239, 68, 68, 0.35)",
                                    background: "rgba(239, 68, 68, 0.05)",
                                    fontWeight: 700,
                                  }}
                                  title="Số dư ví không đủ để tự động khấu trừ theo nguyên tắc All-or-Nothing"
                                >
                                  + Nạp thiếu {formatCurrency(remainingAmount - Number(wallet?.balance || 0))}
                                </button>
                                <span style={{ fontSize: "0.68rem", color: "#dc2626", fontStyle: "italic" }}>
                                  Thiếu số dư ví
                                </span>
                              </div>
                            )
                          ) : (
                            <span style={{ fontSize: "0.75rem", color: "#059669", fontWeight: 600 }}>
                              ✓ Đã quyết toán
                            </span>
                          )}
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

      {/* TAB 4: Refunds */}
      {activeTab === "refunds" && (
        <div className="glass-card" style={{ padding: "1.5rem", borderRadius: "16px" }}>
          {/* Header & Stats Banner */}
          <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "space-between", alignItems: "center", gap: "1rem", marginBottom: "1.5rem" }}>
            <div>
              <h3 style={{ fontSize: "1.15rem", fontWeight: 800, margin: 0 }}>Lịch Sử Tiền Hoàn Trả (Refund Records FEAT-13.6)</h3>
              <p style={{ fontSize: "0.8125rem", color: "var(--text-muted)", margin: "0.25rem 0 0 0" }}>
                Chính sách bảo đảm: Tiền hoàn trả từ các đơn hủy phòng hoặc điều chỉnh dịch vụ được cộng trực tiếp vào ví nội bộ 100%, bảo toàn số dư và có thể sử dụng ngay lập tức.
              </p>
            </div>

            {/* Refund Total Summary Badge */}
            <div
              style={{
                padding: "0.6rem 1.25rem",
                borderRadius: "12px",
                background: "rgba(147, 51, 234, 0.08)",
                border: "1px solid rgba(147, 51, 234, 0.25)",
                display: "flex",
                flexDirection: "column",
                alignItems: "flex-end",
              }}
            >
              <div style={{ fontSize: "0.7rem", color: "var(--text-dim)", textTransform: "uppercase", fontWeight: 700 }}>
                Tổng Tiền Đã Hoàn Trả Vào Ví
              </div>
              <div style={{ fontSize: "1.25rem", fontWeight: 900, color: "#7e22ce" }}>
                +{formatCurrency(totalRefundAmount)}
              </div>
            </div>
          </div>

          {refunds.length === 0 ? (
            <div style={{ padding: "3rem", textAlign: "center", color: "var(--text-muted)" }}>
              <RotateCcw size={40} style={{ margin: "0 auto 1rem", opacity: 0.3 }} />
              <p style={{ fontWeight: 600, fontSize: "0.95rem" }}>
                Chưa có khoản tiền hoàn nào được ghi nhận trên ví của bạn.
              </p>
            </div>
          ) : (
            <div style={{ overflowX: "auto" }}>
              <table className="custom-table" style={{ width: "100%" }}>
                <thead>
                  <tr>
                    <th>Mã Hoàn Tiền</th>
                    <th>Thời Điểm Hoàn</th>
                    <th>Lý Do Hoàn Tiền</th>
                    <th>Mã Giao Dịch Gốc</th>
                    <th style={{ textAlign: "right" }}>Số Tiền Hoàn</th>
                    <th style={{ textAlign: "center" }}>Trạng Thái</th>
                  </tr>
                </thead>
                <tbody>
                  {refunds.map((r) => (
                    <tr key={r.id || r.refundCode}>
                      <td style={{ fontWeight: 700, fontFamily: "monospace", fontSize: "0.8125rem" }}>
                        {r.refundCode || `RFD-${r.refundId || r.id}`}
                      </td>
                      <td style={{ fontSize: "0.8125rem", color: "var(--text-dim)" }}>
                        {formatDateTimeDisplay(r.processedAt || r.createdAt)}
                      </td>
                      <td style={{ fontSize: "0.875rem" }}>
                        <div style={{ fontWeight: 600, color: "var(--text-main)" }}>{r.reason}</div>
                        {r.processedBy && (
                          <div style={{ fontSize: "0.72rem", color: "var(--text-dim)", marginTop: "2px" }}>
                            Xử lý bởi: {r.processedBy}
                          </div>
                        )}
                      </td>
                      <td style={{ fontFamily: "monospace", fontSize: "0.8125rem", color: "var(--text-dim)" }}>
                        {r.originalTx?.transactionNo || r.originalTransactionId || "---"}
                      </td>
                      <td style={{ textAlign: "right", fontWeight: 800, color: "#7e22ce", fontSize: "0.9375rem" }}>
                        +{formatCurrency(r.amount)}
                      </td>
                      <td style={{ textAlign: "center" }}>
                        <span style={{ padding: "0.25rem 0.6rem", borderRadius: "6px", background: "rgba(147, 51, 234, 0.12)", color: "#7e22ce", fontWeight: 700, fontSize: "0.75rem", display: "inline-flex", alignItems: "center", gap: "0.25rem" }}>
                          <CheckCircle2 size={13} /> {r.status === "COMPLETED" ? "HOÀN TẤT VÀO VÍ" : r.status}
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
        <div
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 9999,
            backgroundColor: "rgba(15, 23, 42, 0.65)",
            backdropFilter: "blur(8px)",
            WebkitBackdropFilter: "blur(8px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "1rem",
            overflowY: "auto",
            animation: "fadeIn 0.2s cubic-bezier(0.16, 1, 0.3, 1)",
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget && !topUpLoading) setIsTopUpOpen(false);
          }}
        >
          <div
            className="glass-card"
            style={{
              width: "100%",
              maxWidth: "500px",
              background: "#ffffff",
              borderRadius: "20px",
              border: "1px solid var(--border-color)",
              boxShadow: "0 25px 60px -15px rgba(0, 0, 0, 0.25), 0 0 0 1px rgba(0, 0, 0, 0.05)",
              overflow: "hidden",
              animation: "slideUp 0.25s cubic-bezier(0.16, 1, 0.3, 1)",
              display: "flex",
              flexDirection: "column",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div
              style={{
                background: "linear-gradient(135deg, #064e3b 0%, #047857 50%, #059669 100%)",
                color: "#ffffff",
                padding: "1.25rem 1.75rem",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                position: "relative",
                overflow: "hidden",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", position: "relative", zIndex: 1 }}>
                <div
                  style={{
                    width: "42px",
                    height: "42px",
                    borderRadius: "12px",
                    background: "rgba(255, 255, 255, 0.2)",
                    backdropFilter: "blur(4px)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: "#ffffff",
                  }}
                >
                  <CreditCard size={22} />
                </div>
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                    <h3 style={{ fontSize: "1.15rem", fontWeight: 800, margin: 0 }}>Nạp Tiền Giả Lập Vào Ví</h3>
                    <span
                      style={{
                        fontSize: "0.65rem",
                        padding: "0.15rem 0.5rem",
                        borderRadius: "6px",
                        background: "rgba(255, 255, 255, 0.2)",
                        color: "#ffffff",
                        fontWeight: 700,
                      }}
                    >
                      MOCK SANDBOX
                    </span>
                  </div>
                  <p style={{ fontSize: "0.78rem", color: "rgba(255, 255, 255, 0.8)", margin: "0.15rem 0 0 0" }}>
                    Nạp thử nghiệm số dư vào ví nội bộ tức thì
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsTopUpOpen(false)}
                disabled={topUpLoading}
                style={{
                  background: "rgba(255, 255, 255, 0.15)",
                  border: "none",
                  borderRadius: "10px",
                  padding: "0.45rem",
                  color: "#ffffff",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  transition: "background 0.15s ease",
                }}
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleTopUpSubmit} style={{ padding: "1.5rem" }}>
              <div style={{ marginBottom: "1.25rem" }}>
                <label style={{ display: "block", fontSize: "0.75rem", fontWeight: 800, color: "#475569", textTransform: "uppercase", marginBottom: "0.5rem" }}>
                  1. Chọn mức nạp nhanh
                </label>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "0.5rem" }}>
                  {[500000, 1000000, 2000000, 5000000, 10000000, 20000000].map((amt) => {
                    const isSelected = topUpAmount === amt;
                    return (
                      <button
                        key={amt}
                        type="button"
                        onClick={() => setTopUpAmount(amt)}
                        style={{
                          padding: "0.6rem 0.25rem",
                          fontSize: "0.78rem",
                          fontWeight: 700,
                          borderRadius: "10px",
                          border: isSelected ? "2px solid #059669" : "1px solid #cbd5e1",
                          background: isSelected ? "#ecfdf5" : "#ffffff",
                          color: isSelected ? "#065f46" : "#334155",
                          cursor: "pointer",
                          transition: "all 0.15s ease",
                        }}
                      >
                        {formatCurrency(amt)}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div style={{ marginBottom: "1.25rem" }}>
                <label style={{ display: "block", fontSize: "0.75rem", fontWeight: 800, color: "#475569", textTransform: "uppercase", marginBottom: "0.4rem" }}>
                  2. Số tiền nạp tùy chỉnh (VND) *
                </label>
                <input
                  type="number"
                  min="10000"
                  max="100000000"
                  step="10000"
                  required
                  value={topUpAmount}
                  onChange={(e) => setTopUpAmount(Number(e.target.value))}
                  className="form-input"
                  style={{
                    fontSize: "1.1rem",
                    fontWeight: 800,
                    color: "#065f46",
                    background: "#f8fafc",
                    borderColor: "#a7f3d0",
                  }}
                />
              </div>

              <div style={{ marginBottom: "1.25rem" }}>
                <label style={{ display: "block", fontSize: "0.75rem", fontWeight: 800, color: "#475569", textTransform: "uppercase", marginBottom: "0.4rem" }}>
                  3. Cổng ngân hàng giả lập
                </label>
                <select
                  value={topUpBank}
                  onChange={(e) => setTopUpBank(e.target.value)}
                  className="form-select"
                  style={{ fontWeight: 600 }}
                >
                  <option value="NCB">Ngân hàng Quốc Dân (NCB Sandbox)</option>
                  <option value="VCB">Vietcombank (VCB Sandbox)</option>
                  <option value="MB">MBBank (MB Sandbox)</option>
                  <option value="TCB">Techcombank (TCB Sandbox)</option>
                  <option value="ACB">ACB Sandbox</option>
                </select>
              </div>

              <div style={{ marginBottom: "1.5rem" }}>
                <label style={{ display: "block", fontSize: "0.75rem", fontWeight: 800, color: "#475569", textTransform: "uppercase", marginBottom: "0.4rem" }}>
                  4. Ghi chú giao dịch
                </label>
                <input
                  type="text"
                  placeholder="VD: Nạp ví thanh toán dịch vụ nghỉ dưỡng..."
                  value={topUpNote}
                  onChange={(e) => setTopUpNote(e.target.value)}
                  className="form-input"
                />
              </div>

              <div style={{ display: "flex", gap: "0.75rem" }}>
                <button
                  type="button"
                  onClick={() => setIsTopUpOpen(false)}
                  disabled={topUpLoading}
                  className="btn btn-secondary"
                  style={{ flex: 1, padding: "0.75rem", fontWeight: 700 }}
                >
                  Hủy Bỏ
                </button>
                <button
                  type="submit"
                  disabled={topUpLoading}
                  className="btn btn-primary"
                  style={{
                    flex: 1,
                    padding: "0.75rem",
                    background: "linear-gradient(135deg, #059669 0%, #047857 100%)",
                    fontWeight: 800,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: "0.5rem",
                    boxShadow: "0 4px 12px rgba(5, 150, 105, 0.35)",
                  }}
                >
                  <CreditCard size={18} />
                  <span>{topUpLoading ? "Đang nạp tiền..." : "Xác Nhận Nạp"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: Auto-Debit Terms Reader & Consent */}
      {isTermsOpen && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 9999,
            backgroundColor: "rgba(15, 23, 42, 0.65)",
            backdropFilter: "blur(8px)",
            WebkitBackdropFilter: "blur(8px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "1rem",
            overflowY: "auto",
            animation: "fadeIn 0.2s cubic-bezier(0.16, 1, 0.3, 1)",
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget) setIsTermsOpen(false);
          }}
        >
          <div
            className="glass-card"
            style={{
              width: "100%",
              maxWidth: "720px",
              maxHeight: "90vh",
              background: "#ffffff",
              borderRadius: "20px",
              border: "1px solid var(--border-color)",
              boxShadow: "0 25px 60px -15px rgba(0, 0, 0, 0.25), 0 0 0 1px rgba(0, 0, 0, 0.05)",
              overflow: "hidden",
              display: "flex",
              flexDirection: "column",
              animation: "slideUp 0.25s cubic-bezier(0.16, 1, 0.3, 1)",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header Modal */}
            <div
              style={{
                background: "linear-gradient(135deg, #1e1b4b 0%, #312e81 50%, #4338ca 100%)",
                color: "#ffffff",
                padding: "1.25rem 1.75rem",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                position: "relative",
                overflow: "hidden",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "0.85rem", position: "relative", zIndex: 1 }}>
                <div
                  style={{
                    width: "44px",
                    height: "44px",
                    borderRadius: "12px",
                    background: "rgba(255, 255, 255, 0.15)",
                    backdropFilter: "blur(6px)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: "#ffffff",
                    boxShadow: "0 4px 12px rgba(0, 0, 0, 0.15)",
                  }}
                >
                  <ShieldCheck size={24} />
                </div>
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                    <h3 style={{ fontSize: "1.15rem", fontWeight: 800, margin: 0 }}>
                      Điều Khoản Dịch Vụ Auto-Debit ({termsData?.termsVersion || "v1.0"})
                    </h3>
                    <span
                      style={{
                        fontSize: "0.65rem",
                        padding: "0.15rem 0.5rem",
                        borderRadius: "6px",
                        background: "rgba(245, 158, 11, 0.2)",
                        color: "#fef3c7",
                        border: "1px solid rgba(245, 158, 11, 0.35)",
                        fontWeight: 700,
                      }}
                    >
                      THỎA THUẬN PHÁP LÝ
                    </span>
                  </div>
                  <p style={{ fontSize: "0.78rem", color: "rgba(255, 255, 255, 0.75)", margin: "0.15rem 0 0 0" }}>
                    Quy định trừ ví tự động & bảo toàn số dư theo SRS e-Hotel
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setIsTermsOpen(false)}
                style={{
                  background: "rgba(255, 255, 255, 0.12)",
                  border: "none",
                  borderRadius: "10px",
                  padding: "0.5rem",
                  color: "#ffffff",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  transition: "background 0.15s ease",
                }}
                onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(255, 255, 255, 0.22)")}
                onMouseLeave={(e) => (e.currentTarget.style.background = "rgba(255, 255, 255, 0.12)")}
                title="Đóng (Esc)"
              >
                <X size={18} />
              </button>
            </div>

            {/* Content Điều Khoản */}
            <div
              style={{
                padding: "1.5rem",
                overflowY: "auto",
                flex: 1,
                backgroundColor: "#f8fafc",
              }}
            >
              {termsLoading ? (
                <div style={{ padding: "3rem 0", textAlign: "center", color: "#64748b" }}>
                  Đang tải nội dung điều khoản...
                </div>
              ) : (
                <div
                  style={{
                    backgroundColor: "#ffffff",
                    border: "1px solid #e2e8f0",
                    borderRadius: "12px",
                    padding: "1.5rem",
                    color: "#334155",
                    fontSize: "0.875rem",
                    lineHeight: "1.75",
                    whiteSpace: "pre-line",
                    boxShadow: "0 2px 8px rgba(0, 0, 0, 0.04)",
                  }}
                >
                  {termsData?.termsText}
                </div>
              )}
            </div>

            {/* Footer Modal */}
            <div
              style={{
                backgroundColor: "#ffffff",
                borderTop: "1px solid #e2e8f0",
                padding: "1rem 1.75rem",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: "1rem",
              }}
            >
              <span style={{ fontSize: "0.78rem", color: "#64748b", lineHeight: 1.4 }}>
                Bằng việc bấm xác nhận, bạn chấp thuận quy chế trừ ví tự động của e-Hotel.
              </span>
              <div style={{ display: "flex", gap: "0.5rem", flexShrink: 0 }}>
                {isConsented && (
                  <button
                    type="button"
                    onClick={handleDisableAutoDebit}
                    disabled={disableLoading}
                    className="btn btn-secondary"
                    style={{
                      padding: "0.55rem 1rem",
                      fontWeight: 600,
                      fontSize: "0.875rem",
                      color: "#dc2626",
                      borderColor: "rgba(239, 68, 68, 0.4)",
                      display: "flex",
                      alignItems: "center",
                      gap: "0.35rem",
                    }}
                  >
                    <Ban size={16} />
                    <span>{disableLoading ? "Đang tắt..." : "Thu Hồi Ký"}</span>
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setIsTermsOpen(false)}
                  className="btn btn-secondary"
                  style={{ padding: "0.55rem 1rem", fontWeight: 600, fontSize: "0.875rem" }}
                >
                  Đóng
                </button>
                <button
                  type="button"
                  onClick={() => handleConsentSubmit(true)}
                  className="btn btn-primary"
                  style={{
                    padding: "0.55rem 1.25rem",
                    background: "linear-gradient(135deg, #4338ca 0%, #312e81 100%)",
                    fontWeight: 700,
                    fontSize: "0.875rem",
                    display: "flex",
                    alignItems: "center",
                    gap: "0.45rem",
                    boxShadow: "0 4px 12px rgba(67, 56, 202, 0.35)",
                  }}
                >
                  <ShieldCheck size={18} />
                  <span>Tôi Đồng Ý Ký Chấp Thuận</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
