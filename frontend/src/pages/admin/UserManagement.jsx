import React, { useState, useEffect } from "react";
import {
  Users,
  UserPlus,
  Search,
  Filter,
  Edit2,
  Trash2,
  Shield,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Clock,
  X,
  CreditCard,
  ShieldCheck,
  PauseCircle,
  PlayCircle,
  Ban,
  RefreshCw,
  Wallet,
  Receipt,
  RotateCcw,
  DollarSign,
  Zap,
  CheckCircle2,
  Lock,
  Unlock,
} from "lucide-react";
import { apiRequest } from "../../api/client.js";
import { formatDateTimeDisplay } from "../../utils/date.js";

const formatCurrency = (amount) => {
  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
  }).format(amount || 0);
};

export default function UserManagement({ currentLoggedUser }) {
  const [adminTab, setAdminTab] = useState("users"); // "users" | "autoDebit" | "debts" | "refunds"

  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);

  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("");

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState("create"); // 'create' | 'edit'
  const [formData, setFormData] = useState({
    id: null,
    username: "",
    password: "",
    fullName: "",
    role: "SALE",
    isActive: true,
  });

  // Delete Confirm Modal
  const [userToDelete, setUserToDelete] = useState(null);

  // Auto-Debit Admin State (FEAT-13.3)
  const [autoDebitList, setAutoDebitList] = useState([]);
  const [autoDebitLoading, setAutoDebitLoading] = useState(false);
  const [autoDebitStatusFilter, setAutoDebitStatusFilter] = useState("");
  const [actionLoadingId, setActionLoadingId] = useState(null);

  // Debt Management State (FEAT-13.4)
  const [debtsList, setDebtsList] = useState([]);
  const [debtsLoading, setDebtsLoading] = useState(false);
  const [debtsFilter, setDebtsFilter] = useState("");
  const [debtsKeyword, setDebtsKeyword] = useState("");
  const [batchProcessing, setBatchProcessing] = useState(false);
  const [processingDebtKey, setProcessingDebtKey] = useState(null);

  // Refund Management State (FEAT-13.6)
  const [refundsList, setRefundsList] = useState([]);
  const [refundsLoading, setRefundsLoading] = useState(false);
  const [walletsList, setWalletsList] = useState([]);
  const [walletsLoading, setWalletsLoading] = useState(false);
  const [isRefundModalOpen, setIsRefundModalOpen] = useState(false);
  const [refundForm, setRefundForm] = useState({
    originalTxId: "",
    amount: "",
    reason: "",
  });
  const [refundableInfo, setRefundableInfo] = useState(null);
  const [checkingRefundable, setCheckingRefundable] = useState(false);
  const [submittingRefund, setSubmittingRefund] = useState(false);

  // Fetch users
  const fetchUsers = async () => {
    try {
      setLoading(true);
      setError(null);
      const params = new URLSearchParams();
      if (search) params.append("search", search);
      if (roleFilter) params.append("role", roleFilter);

      const res = await apiRequest(`/api/admin/users?${params.toString()}`);
      setUsers(res.data || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Fetch Auto-Debit requests
  const fetchAutoDebitList = async () => {
    try {
      setAutoDebitLoading(true);
      setError(null);
      const params = new URLSearchParams();
      if (autoDebitStatusFilter) params.append("status", autoDebitStatusFilter);
      const res = await apiRequest(`/api/auto-debit/admin/list?${params.toString()}`);
      if (res.success && res.data) {
        setAutoDebitList(res.data.requests || []);
      }
    } catch (err) {
      setError(err.message || "Không thể tải danh sách Auto-Debit.");
    } finally {
      setAutoDebitLoading(false);
    }
  };

  // Fetch All Debts (FEAT-13.4)
  const fetchDebtsList = async () => {
    try {
      setDebtsLoading(true);
      setError(null);
      const params = new URLSearchParams();
      if (debtsFilter) params.append("status", debtsFilter);
      if (debtsKeyword) params.append("keyword", debtsKeyword);
      const res = await apiRequest(`/api/auto-debit/debts/all?${params.toString()}`);
      if (res.success && res.data) {
        setDebtsList(res.data.debts || []);
      }
    } catch (err) {
      setError(err.message || "Không thể tải danh sách công nợ.");
    } finally {
      setDebtsLoading(false);
    }
  };

  // Fetch Refunds & Wallets (FEAT-13.6)
  const fetchRefundsAndWallets = async () => {
    try {
      setRefundsLoading(true);
      setWalletsLoading(true);
      setError(null);

      const [refundsRes, walletsRes] = await Promise.all([
        apiRequest("/api/wallet/refunds/history").catch(() => null),
        apiRequest("/api/wallet/admin/all").catch(() => null),
      ]);

      if (refundsRes?.success && refundsRes.data) {
        setRefundsList(refundsRes.data.refunds || []);
      }
      if (walletsRes?.success && walletsRes.data) {
        setWalletsList(walletsRes.data.wallets || []);
      }
    } catch (err) {
      setError(err.message || "Không thể tải danh sách hoàn tiền.");
    } finally {
      setRefundsLoading(false);
      setWalletsLoading(false);
    }
  };

  useEffect(() => {
    if (adminTab === "users") {
      fetchUsers();
    } else if (adminTab === "autoDebit") {
      fetchAutoDebitList();
    } else if (adminTab === "debts") {
      fetchDebtsList();
    } else if (adminTab === "refunds") {
      fetchRefundsAndWallets();
    }
  }, [adminTab, roleFilter, autoDebitStatusFilter, debtsFilter]);

  const handleUpdateAutoDebitStatus = async (userId, targetStatus) => {
    try {
      setActionLoadingId(userId);
      setError(null);
      setSuccessMsg(null);
      const res = await apiRequest(`/api/auto-debit/admin/${userId}/status`, {
        method: "PUT",
        body: JSON.stringify({ status: targetStatus }),
      });
      if (res.success) {
        setSuccessMsg(res.message || `Cập nhật trạng thái Auto-Debit thành ${targetStatus} thành công.`);
        fetchAutoDebitList();
      }
    } catch (err) {
      setError(err.message || "Lỗi cập nhật Auto-Debit.");
    } finally {
      setActionLoadingId(null);
    }
  };

  // Run Batch Sweep for BR-01
  const handleBatchSweep = async () => {
    try {
      setBatchProcessing(true);
      setError(null);
      setSuccessMsg(null);
      const res = await apiRequest("/api/auto-debit/debts/batch-process", {
        method: "POST",
      });
      if (res.success) {
        const d = res.data;
        setSuccessMsg(
          `Hoàn tất quét công nợ đến hạn (BR-01)! Đã quét: ${d.totalScanned || 0} khoản | Khấu trừ thành công: ${d.totalSuccess || 0} khoản | Tổng thu: ${formatCurrency(d.totalDeductedAmount || 0)}.`
        );
        fetchDebtsList();
      }
    } catch (err) {
      setError(err.message || "Lỗi trong quá trình quét công nợ tự động.");
    } finally {
      setBatchProcessing(false);
    }
  };

  // Collect individual debt via BR-01
  const handleCollectDebt = async (debtIdentifier) => {
    try {
      setProcessingDebtKey(debtIdentifier);
      setError(null);
      setSuccessMsg(null);
      const res = await apiRequest(`/api/auto-debit/debts/${debtIdentifier}/process`, {
        method: "POST",
      });
      if (res.success) {
        setSuccessMsg(res.message || `Khấu trừ thành công khoản nợ ${debtIdentifier} qua ví.`);
        fetchDebtsList();
      }
    } catch (err) {
      setError(err.message || "Không thể thực thi Auto-Debit cho khoản nợ này.");
    } finally {
      setProcessingDebtKey(null);
    }
  };

  // Check refundable transaction
  const handleCheckRefundable = async (txId) => {
    if (!txId) return;
    try {
      setCheckingRefundable(true);
      const res = await apiRequest(`/api/wallet/transactions/${txId}/refundable`);
      if (res.success && res.data) {
        setRefundableInfo(res.data);
        if (res.data.remainingRefundable > 0 && !refundForm.amount) {
          setRefundForm((prev) => ({ ...prev, amount: res.data.remainingRefundable }));
        }
      }
    } catch (err) {
      setRefundableInfo(null);
      setError(err.message || "Giao dịch không hợp lệ hoặc không thể hoàn.");
    } finally {
      setCheckingRefundable(false);
    }
  };

  // Submit Refund
  const handleSubmitRefund = async (e) => {
    e.preventDefault();
    try {
      setSubmittingRefund(true);
      setError(null);
      const res = await apiRequest("/api/wallet/refund", {
        method: "POST",
        body: JSON.stringify({
          originalTxId: Number(refundForm.originalTxId),
          amount: Number(refundForm.amount),
          reason: refundForm.reason,
        }),
      });

      if (res.success) {
        setSuccessMsg(res.message || "Thực hiện hoàn tiền vào ví khách hàng thành công!");
        setIsRefundModalOpen(false);
        setRefundForm({ originalTxId: "", amount: "", reason: "" });
        setRefundableInfo(null);
        fetchRefundsAndWallets();
        setTimeout(() => setSuccessMsg(null), 5000);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmittingRefund(false);
    }
  };

  // Lock / Unlock Wallet
  const handleToggleWalletLock = async (walletId, currentStatus) => {
    try {
      const nextStatus = currentStatus === "ACTIVE" ? "LOCKED" : "ACTIVE";
      const res = await apiRequest(`/api/wallet/admin/${walletId}/status`, {
        method: "PUT",
        body: JSON.stringify({ status: nextStatus }),
      });
      if (res.success) {
        setSuccessMsg(res.message || `Đã đổi trạng thái ví sang ${nextStatus}`);
        fetchRefundsAndWallets();
        setTimeout(() => setSuccessMsg(null), 4000);
      }
    } catch (err) {
      setError(err.message);
    }
  };

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    fetchUsers();
  };

  const openCreateModal = () => {
    setModalMode("create");
    setFormData({
      id: null,
      username: "",
      password: "",
      fullName: "",
      role: "SALE",
      isActive: true,
    });
    setIsModalOpen(true);
  };

  const openEditModal = (user) => {
    setModalMode("edit");
    setFormData({
      id: user.id,
      username: user.username,
      password: "",
      fullName: user.fullName,
      role: user.role,
      isActive: user.isActive,
    });
    setIsModalOpen(true);
  };

  const handleFormSubmit = async (e) => {
    e.preventDefault();
    try {
      setError(null);
      if (modalMode === "create") {
        await apiRequest("/api/admin/users", {
          method: "POST",
          body: JSON.stringify(formData),
        });
        setSuccessMsg(`Đã tạo tài khoản '${formData.username}' thành công!`);
      } else {
        await apiRequest(`/api/admin/users/${formData.id}`, {
          method: "PUT",
          body: JSON.stringify({
            fullName: formData.fullName,
            role: formData.role,
            isActive: formData.isActive,
            password: formData.password || undefined,
          }),
        });
        setSuccessMsg(`Đã cập nhật thông tin '${formData.username}' thành công!`);
      }

      setIsModalOpen(false);
      fetchUsers();
      setTimeout(() => setSuccessMsg(null), 4000);
    } catch (err) {
      setError(err.message);
    }
  };

  const confirmDelete = async () => {
    if (!userToDelete) return;
    try {
      setError(null);
      await apiRequest(`/api/admin/users/${userToDelete.id}`, {
        method: "DELETE",
      });
      setSuccessMsg(`Đã xóa tài khoản '${userToDelete.username}' thành công.`);
      setUserToDelete(null);
      fetchUsers();
      setTimeout(() => setSuccessMsg(null), 4000);
    } catch (err) {
      setError(err.message);
      setUserToDelete(null);
    }
  };

  const formatLastActive = (isoString) => {
    if (!isoString) return "Chưa cập nhật";
    return formatDateTimeDisplay(isoString);
  };

  return (
    <div style={{ maxWidth: "1240px", margin: "2rem auto", padding: "0 1.5rem" }}>
      {/* Header section */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "1.25rem", flexWrap: "wrap", gap: "1rem" }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "0.25rem" }}>
            <div style={{ padding: "0.5rem", borderRadius: "10px", background: "rgba(236, 72, 153, 0.15)", color: "#ec4899" }}>
              <Shield size={24} />
            </div>
            <h1 style={{ fontSize: "1.5rem", fontWeight: 800 }}>Trung Tâm Quản Trị Hệ Thống (ADMIN)</h1>
          </div>
          <p style={{ color: "var(--text-muted)", fontSize: "0.875rem" }}>
            Quản trị tài khoản, xét duyệt Auto-Debit, điều phối công nợ hệ thống và giám sát hoàn tiền ví nội bộ theo đặc tả SRS e-Hotel.
          </p>
        </div>

        {adminTab === "users" && (
          <button className="btn btn-primary" onClick={openCreateModal}>
            <UserPlus size={18} />
            <span>Thêm Người Dùng Mới</span>
          </button>
        )}
      </div>

      {/* Tabs navigation */}
      <div style={{ display: "flex", gap: "0.5rem", marginBottom: "1.5rem", borderBottom: "1px solid var(--border-color)", paddingBottom: "0.75rem", flexWrap: "wrap" }}>
        <button
          className={`btn ${adminTab === "users" ? "btn-primary" : "btn-secondary"}`}
          onClick={() => setAdminTab("users")}
          style={{ display: "inline-flex", alignItems: "center", gap: "0.5rem" }}
        >
          <Users size={16} />
          <span>1. Tài Khoản & Phân Quyền</span>
        </button>

        <button
          className={`btn ${adminTab === "autoDebit" ? "btn-primary" : "btn-secondary"}`}
          onClick={() => setAdminTab("autoDebit")}
          style={{ display: "inline-flex", alignItems: "center", gap: "0.5rem" }}
        >
          <CreditCard size={16} />
          <span>2. Xét Duyệt Auto-Debit (FEAT-13.3)</span>
        </button>

        <button
          className={`btn ${adminTab === "debts" ? "btn-primary" : "btn-secondary"}`}
          onClick={() => setAdminTab("debts")}
          style={{ display: "inline-flex", alignItems: "center", gap: "0.5rem" }}
        >
          <Receipt size={16} />
          <span>3. Quản Lý Công Nợ & Quét BR-01 (FEAT-13.4)</span>
        </button>

        <button
          className={`btn ${adminTab === "refunds" ? "btn-primary" : "btn-secondary"}`}
          onClick={() => setAdminTab("refunds")}
          style={{ display: "inline-flex", alignItems: "center", gap: "0.5rem" }}
        >
          <RotateCcw size={16} />
          <span>4. Quản Lý Hoàn Tiền Ví (FEAT-13.6)</span>
        </button>
      </div>

      {/* Notifications */}
      {error && (
        <div style={{ padding: "1rem", borderRadius: "8px", background: "rgba(239, 68, 68, 0.08)", border: "1px solid rgba(239, 68, 68, 0.25)", color: "#dc2626", marginBottom: "1.25rem", display: "flex", alignItems: "center", gap: "0.5rem" }}>
          <AlertTriangle size={18} />
          <span>{error}</span>
        </div>
      )}

      {successMsg && (
        <div style={{ padding: "1rem", borderRadius: "8px", background: "rgba(16, 185, 129, 0.08)", border: "1px solid rgba(16, 185, 129, 0.25)", color: "#059669", marginBottom: "1.25rem", display: "flex", alignItems: "center", gap: "0.5rem" }}>
          <CheckCircle size={18} />
          <span>{successMsg}</span>
        </div>
      )}

      {/* TAB 1: USERS MANAGEMENT */}
      {adminTab === "users" && (
        <>
          {/* Filter and Search Bar */}
          <div className="glass-card" style={{ padding: "1.25rem", marginBottom: "1.5rem", display: "flex", flexWrap: "wrap", justifyContent: "space-between", gap: "1rem" }}>
            <form onSubmit={handleSearchSubmit} style={{ display: "flex", gap: "0.5rem", flex: "1 1 300px" }}>
              <div style={{ position: "relative", width: "100%" }}>
                <Search size={18} style={{ position: "absolute", left: "12px", top: "50%", transform: "translateY(-50%)", color: "var(--text-dim)" }} />
                <input
                  type="text"
                  className="form-input"
                  style={{ paddingLeft: "2.5rem" }}
                  placeholder="Tìm theo tên đăng nhập hoặc họ tên..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
              <button type="submit" className="btn btn-secondary">
                Tìm kiếm
              </button>
            </form>

            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
              <span style={{ fontSize: "0.8125rem", color: "var(--text-dim)", fontWeight: 600 }}>Lọc vai trò:</span>
              {["", "ADMIN", "MANAGER", "SALE", "CUSTOMER"].map((r) => (
                <button
                  key={r}
                  className={`btn btn-secondary ${roleFilter === r ? "btn-primary" : ""}`}
                  style={{ padding: "0.4rem 0.8rem", fontSize: "0.8125rem" }}
                  onClick={() => setRoleFilter(r)}
                >
                  {r === "" ? "Tất cả" : r}
                </button>
              ))}
            </div>
          </div>

          {/* Users Table */}
          <div className="glass-card" style={{ overflow: "hidden" }}>
            {loading ? (
              <div style={{ padding: "3rem", textAlign: "center", color: "var(--text-muted)" }}>
                Đang tải dữ liệu danh sách người dùng...
              </div>
            ) : users.length === 0 ? (
              <div style={{ padding: "3rem", textAlign: "center", color: "var(--text-muted)" }}>
                Không tìm thấy người dùng nào phù hợp với điều kiện tìm kiếm.
              </div>
            ) : (
              <table className="custom-table">
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Tên người dùng</th>
                    <th>Họ và tên</th>
                    <th>Vai trò</th>
                    <th>Trạng thái</th>
                    <th>Hoạt động gần nhất</th>
                    <th style={{ textAlign: "right" }}>Thao tác</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((u) => (
                    <tr key={u.id}>
                      <td style={{ color: "var(--text-dim)", fontWeight: 600 }}>#{u.id}</td>
                      <td style={{ fontWeight: 600 }}>{u.username}</td>
                      <td>{u.fullName}</td>
                      <td>
                        <span className={`role-tag ${u.role.toLowerCase()}`}>{u.role}</span>
                      </td>
                      <td>
                        {u.isActive ? (
                          <span style={{ display: "inline-flex", alignItems: "center", gap: "0.35rem", color: "var(--success)", fontSize: "0.8125rem" }}>
                            <CheckCircle size={14} /> Hoạt động
                          </span>
                        ) : (
                          <span style={{ display: "inline-flex", alignItems: "center", gap: "0.35rem", color: "var(--danger)", fontSize: "0.8125rem" }}>
                            <XCircle size={14} /> Đã khóa
                          </span>
                        )}
                      </td>
                      <td style={{ color: "var(--text-muted)", fontSize: "0.8125rem" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "0.35rem" }}>
                          <Clock size={14} color="var(--text-dim)" />
                          {formatLastActive(u.lastActiveAt)}
                        </div>
                      </td>
                      <td style={{ textAlign: "right" }}>
                        <div style={{ display: "inline-flex", gap: "0.5rem" }}>
                          <button
                            className="btn btn-secondary btn-icon"
                            title="Chỉnh sửa thông tin"
                            onClick={() => openEditModal(u)}
                          >
                            <Edit2 size={16} />
                          </button>
                          <button
                            className="btn btn-danger btn-icon"
                            title="Xóa tài khoản"
                            disabled={u.id === currentLoggedUser?.id}
                            onClick={() => setUserToDelete(u)}
                            style={u.id === currentLoggedUser?.id ? { opacity: 0.4, cursor: "not-allowed" } : {}}
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </>
      )}

      {/* TAB 2: AUTO-DEBIT ADMIN MANAGEMENT */}
      {adminTab === "autoDebit" && (
        <>
          {/* Filter Bar */}
          <div className="glass-card" style={{ padding: "1.25rem", marginBottom: "1.5rem", display: "flex", flexWrap: "wrap", justifyContent: "space-between", alignItems: "center", gap: "1rem" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", flexWrap: "wrap" }}>
              <span style={{ fontSize: "0.8125rem", color: "var(--text-dim)", fontWeight: 600 }}>Trạng thái Auto-Debit:</span>
              {[
                { val: "", label: "Tất cả" },
                { val: "PENDING_ADMIN", label: "Chờ kích hoạt" },
                { val: "ACTIVE", label: "Đang hoạt động (BẬT)" },
                { val: "PAUSED", label: "Tạm dừng" },
                { val: "DISABLED", label: "Đã tắt" },
                { val: "NOT_ENABLED", label: "Chưa kích hoạt" },
              ].map((f) => (
                <button
                  key={f.val}
                  className={`btn btn-secondary ${autoDebitStatusFilter === f.val ? "btn-primary" : ""}`}
                  style={{ padding: "0.4rem 0.8rem", fontSize: "0.8125rem" }}
                  onClick={() => setAutoDebitStatusFilter(f.val)}
                >
                  {f.label}
                </button>
              ))}
            </div>

            <button
              className="btn btn-secondary"
              onClick={fetchAutoDebitList}
              disabled={autoDebitLoading}
              style={{ display: "inline-flex", alignItems: "center", gap: "0.45rem", fontSize: "0.8125rem" }}
            >
              <RefreshCw size={15} className={autoDebitLoading ? "animate-spin" : ""} />
              <span>Làm mới danh sách</span>
            </button>
          </div>

          {/* Auto-Debit Table */}
          <div className="glass-card" style={{ overflow: "hidden" }}>
            {autoDebitLoading ? (
              <div style={{ padding: "3rem", textAlign: "center", color: "var(--text-muted)" }}>
                Đang tải danh sách ủy quyền Auto-Debit...
              </div>
            ) : autoDebitList.length === 0 ? (
              <div style={{ padding: "3rem", textAlign: "center", color: "var(--text-muted)" }}>
                Không có yêu cầu hoặc tài khoản Auto-Debit nào trong danh mục này.
              </div>
            ) : (
              <table className="custom-table">
                <thead>
                  <tr>
                    <th>Khách hàng</th>
                    <th>Mã Ví & Số Dư</th>
                    <th>Cam Kết Điều Khoản</th>
                    <th>Trạng Thái Auto-Debit</th>
                    <th>Cập Nhật Lần Cuối</th>
                    <th style={{ textAlign: "right" }}>Thao Tác Quản Trị</th>
                  </tr>
                </thead>
                <tbody>
                  {autoDebitList.map((row) => {
                    const isProcessing = actionLoadingId === row.userId;
                    return (
                      <tr key={row.settingId || row.userId}>
                        <td>
                          <div style={{ fontWeight: 700, color: "var(--text-main)" }}>{row.fullName}</div>
                          <div style={{ fontSize: "0.75rem", color: "var(--text-dim)" }}>
                            username: <strong>{row.username}</strong> (ID: #{row.userId})
                          </div>
                        </td>

                        <td>
                          {row.walletNumber ? (
                            <div>
                              <div style={{ fontWeight: 700, fontFamily: "monospace", fontSize: "0.8125rem", color: "#4f46e5" }}>
                                {row.walletNumber}
                              </div>
                              <div style={{ fontSize: "0.875rem", fontWeight: 800, color: row.walletBalance > 0 ? "#059669" : "#dc2626" }}>
                                {formatCurrency(row.walletBalance)}
                              </div>
                            </div>
                          ) : (
                            <span style={{ fontSize: "0.75rem", color: "var(--text-dim)", fontStyle: "italic" }}>
                              Chưa khởi tạo ví
                            </span>
                          )}
                        </td>

                        <td>
                          {row.hasActiveConsent ? (
                            <div>
                              <span style={{ display: "inline-flex", alignItems: "center", gap: "0.3rem", color: "#059669", fontWeight: 700, fontSize: "0.75rem", background: "rgba(16, 185, 129, 0.12)", padding: "0.2rem 0.5rem", borderRadius: "6px" }}>
                                <ShieldCheck size={14} /> ĐÃ KÝ ({row.consentVersion || "v1.0"})
                              </span>
                              <div style={{ fontSize: "0.75rem", color: "var(--text-dim)", marginTop: "0.2rem" }}>
                                {formatDateTimeDisplay(row.consentDate)}
                              </div>
                            </div>
                          ) : (
                            <span style={{ display: "inline-flex", alignItems: "center", gap: "0.3rem", color: "#dc2626", fontWeight: 700, fontSize: "0.75rem", background: "rgba(239, 68, 68, 0.12)", padding: "0.2rem 0.5rem", borderRadius: "6px" }}>
                              <AlertTriangle size={14} /> CHƯA KÝ CAM KẾT
                            </span>
                          )}
                        </td>

                        <td>
                          {row.status === "ACTIVE" && (
                            <span style={{ display: "inline-flex", alignItems: "center", gap: "0.35rem", padding: "0.35rem 0.75rem", borderRadius: "999px", background: "rgba(16, 185, 129, 0.15)", color: "#059669", fontWeight: 700, fontSize: "0.75rem" }}>
                              <ShieldCheck size={14} /> BẬT (ACTIVE)
                            </span>
                          )}
                          {row.status === "PENDING_ADMIN" && (
                            <span style={{ display: "inline-flex", alignItems: "center", gap: "0.35rem", padding: "0.35rem 0.75rem", borderRadius: "999px", background: "rgba(245, 158, 11, 0.15)", color: "#d97706", fontWeight: 700, fontSize: "0.75rem" }}>
                              <Clock size={14} /> CHỜ KÍCH HOẠT
                            </span>
                          )}
                          {row.status === "PAUSED" && (
                            <span style={{ display: "inline-flex", alignItems: "center", gap: "0.35rem", padding: "0.35rem 0.75rem", borderRadius: "999px", background: "rgba(107, 114, 128, 0.15)", color: "#4b5563", fontWeight: 700, fontSize: "0.75rem" }}>
                              <PauseCircle size={14} /> TẠM DỪNG
                            </span>
                          )}
                          {row.status === "DISABLED" && (
                            <span style={{ display: "inline-flex", alignItems: "center", gap: "0.35rem", padding: "0.35rem 0.75rem", borderRadius: "999px", background: "rgba(239, 68, 68, 0.15)", color: "#dc2626", fontWeight: 700, fontSize: "0.75rem" }}>
                              <Ban size={14} /> ĐÃ TẮT
                            </span>
                          )}
                          {row.status === "NOT_ENABLED" && (
                            <span style={{ display: "inline-flex", alignItems: "center", gap: "0.35rem", padding: "0.35rem 0.75rem", borderRadius: "999px", background: "rgba(156, 163, 175, 0.15)", color: "#6b7280", fontWeight: 700, fontSize: "0.75rem" }}>
                              CHƯA KÍCH HOẠT
                            </span>
                          )}
                        </td>

                        <td style={{ color: "var(--text-muted)", fontSize: "0.8125rem" }}>
                          {formatLastActive(row.activatedAt || row.pausedAt || row.disabledAt)}
                          {row.updatedBy && (
                            <div style={{ fontSize: "0.72rem", color: "var(--text-dim)" }}>
                              Bởi: {row.updatedBy}
                            </div>
                          )}
                        </td>

                        <td style={{ textAlign: "right" }}>
                          <div style={{ display: "inline-flex", gap: "0.45rem", justifyContent: "flex-end" }}>
                            {(row.status === "PENDING_ADMIN" || (row.status === "NOT_ENABLED" && row.hasActiveConsent)) && (
                              <button
                                className="btn btn-primary"
                                style={{ background: "#059669", borderColor: "#059669", padding: "0.4rem 0.8rem", fontSize: "0.75rem", display: "inline-flex", alignItems: "center", gap: "0.35rem" }}
                                disabled={isProcessing}
                                onClick={() => handleUpdateAutoDebitStatus(row.userId, "ACTIVE")}
                              >
                                <ShieldCheck size={14} />
                                <span>{isProcessing ? "Đang xử lý..." : "Kích Hoạt (Bật)"}</span>
                              </button>
                            )}

                            {row.status === "ACTIVE" && (
                              <>
                                <button
                                  className="btn btn-secondary"
                                  style={{ padding: "0.4rem 0.75rem", fontSize: "0.75rem", color: "#d97706", display: "inline-flex", alignItems: "center", gap: "0.35rem" }}
                                  disabled={isProcessing}
                                  onClick={() => handleUpdateAutoDebitStatus(row.userId, "PAUSED")}
                                  title="Tạm dừng tự động trừ tiền ví"
                                >
                                  <PauseCircle size={14} />
                                  <span>Tạm dừng</span>
                                </button>
                                <button
                                  className="btn btn-danger"
                                  style={{ padding: "0.4rem 0.75rem", fontSize: "0.75rem", display: "inline-flex", alignItems: "center", gap: "0.35rem" }}
                                  disabled={isProcessing}
                                  onClick={() => handleUpdateAutoDebitStatus(row.userId, "DISABLED")}
                                  title="Vô hiệu hóa Auto-Debit"
                                >
                                  <Ban size={14} />
                                  <span>Tắt</span>
                                </button>
                              </>
                            )}

                            {row.status === "PAUSED" && (
                              <>
                                <button
                                  className="btn btn-primary"
                                  style={{ background: "#059669", borderColor: "#059669", padding: "0.4rem 0.75rem", fontSize: "0.75rem", display: "inline-flex", alignItems: "center", gap: "0.35rem" }}
                                  disabled={isProcessing}
                                  onClick={() => handleUpdateAutoDebitStatus(row.userId, "ACTIVE")}
                                >
                                  <PlayCircle size={14} />
                                  <span>Kích hoạt lại</span>
                                </button>
                                <button
                                  className="btn btn-danger"
                                  style={{ padding: "0.4rem 0.75rem", fontSize: "0.75rem", display: "inline-flex", alignItems: "center", gap: "0.35rem" }}
                                  disabled={isProcessing}
                                  onClick={() => handleUpdateAutoDebitStatus(row.userId, "DISABLED")}
                                >
                                  <Ban size={14} />
                                  <span>Tắt</span>
                                </button>
                              </>
                            )}

                            {row.status === "DISABLED" && row.hasActiveConsent && (
                              <button
                                className="btn btn-secondary"
                                style={{ padding: "0.4rem 0.8rem", fontSize: "0.75rem", display: "inline-flex", alignItems: "center", gap: "0.35rem" }}
                                disabled={isProcessing}
                                onClick={() => handleUpdateAutoDebitStatus(row.userId, "ACTIVE")}
                              >
                                <PlayCircle size={14} />
                                <span>Bật lại</span>
                              </button>
                            )}

                            {!row.hasActiveConsent && row.status !== "ACTIVE" && (
                              <span style={{ fontSize: "0.75rem", color: "var(--text-dim)", fontStyle: "italic", alignSelf: "center" }}>
                                Chờ khách hàng ký
                              </span>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </>
      )}

      {/* TAB 3: DEBT MANAGEMENT & BATCH AUTO-DEBIT BR-01 (FEAT-13.4) */}
      {adminTab === "debts" && (
        <>
          {/* Action & Filter Bar */}
          <div className="glass-card" style={{ padding: "1.25rem", marginBottom: "1.5rem", display: "flex", flexWrap: "wrap", justifyContent: "space-between", alignItems: "center", gap: "1rem" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", flexWrap: "wrap" }}>
              <span style={{ fontSize: "0.8125rem", color: "var(--text-dim)", fontWeight: 600 }}>Lọc trạng thái:</span>
              {[
                { val: "", label: "Tất cả" },
                { val: "UNPAID", label: "Chưa thanh toán" },
                { val: "OVERDUE", label: "Quá hạn" },
                { val: "PAID", label: "Đã thanh toán" },
              ].map((f) => (
                <button
                  key={f.val}
                  className={`btn btn-secondary ${debtsFilter === f.val ? "btn-primary" : ""}`}
                  style={{ padding: "0.4rem 0.8rem", fontSize: "0.8125rem" }}
                  onClick={() => setDebtsFilter(f.val)}
                >
                  {f.label}
                </button>
              ))}
            </div>

            <div style={{ display: "flex", gap: "0.75rem" }}>
              <button
                className="btn btn-primary"
                onClick={handleBatchSweep}
                disabled={batchProcessing}
                style={{
                  background: "linear-gradient(135deg, #4f46e5 0%, #4338ca 100%)",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "0.5rem",
                  fontSize: "0.8125rem",
                  padding: "0.5rem 1rem",
                }}
                title="Quét toàn bộ công nợ đến hạn và tự động trừ số dư ví theo quy tắc BR-01"
              >
                <Zap size={16} className={batchProcessing ? "animate-spin" : ""} />
                <span>{batchProcessing ? "Đang quét & khấu trừ..." : "Quét & Khấu Trừ Nợ Đến Hạn (BR-01)"}</span>
              </button>

              <button
                className="btn btn-secondary"
                onClick={fetchDebtsList}
                disabled={debtsLoading}
                style={{ display: "inline-flex", alignItems: "center", gap: "0.45rem", fontSize: "0.8125rem" }}
              >
                <RefreshCw size={15} className={debtsLoading ? "animate-spin" : ""} />
                <span>Làm mới</span>
              </button>
            </div>
          </div>

          {/* Debts Table */}
          <div className="glass-card" style={{ overflow: "hidden" }}>
            {debtsLoading ? (
              <div style={{ padding: "3rem", textAlign: "center", color: "var(--text-muted)" }}>
                Đang tải danh sách công nợ hệ thống...
              </div>
            ) : debtsList.length === 0 ? (
              <div style={{ padding: "3rem", textAlign: "center", color: "var(--text-muted)" }}>
                Không tìm thấy khoản công nợ nào trong danh mục này.
              </div>
            ) : (
              <table className="custom-table">
                <thead>
                  <tr>
                    <th>Mã Công Nợ</th>
                    <th>Khách Hàng & Ví</th>
                    <th>Nội Dung Nợ</th>
                    <th>Hạn Quyết Toán</th>
                    <th style={{ textAlign: "right" }}>Số Tiền Nợ</th>
                    <th style={{ textAlign: "center" }}>Trạng Thái</th>
                    <th style={{ textAlign: "right" }}>Thao Tác</th>
                  </tr>
                </thead>
                <tbody>
                  {debtsList.map((d) => {
                    const isDueOrPending = d.status === "UNPAID" || d.status === "OVERDUE";
                    const isProcessing = processingDebtKey === d.debtCode;
                    const walletBal = d.user?.wallet?.balance || 0;
                    const canAfford = Number(walletBal) >= Number(d.amount);

                    return (
                      <tr key={d.debtCode || d.id}>
                        <td style={{ fontWeight: 700, fontFamily: "monospace", fontSize: "0.8125rem" }}>
                          {d.debtCode}
                        </td>
                        <td>
                          <div style={{ fontWeight: 700, color: "var(--text-main)" }}>
                            {d.user?.fullName || `User #${d.userId}`}
                          </div>
                          <div style={{ fontSize: "0.75rem", color: "var(--text-dim)" }}>
                            {d.user?.username} • Ví:{" "}
                            <span style={{ fontWeight: 600, color: canAfford ? "#059669" : "#dc2626" }}>
                              {formatCurrency(walletBal)}
                            </span>
                          </div>
                        </td>
                        <td style={{ fontSize: "0.875rem" }}>
                          <div>{d.note || (d.type === "BOOKING_BALANCE" ? "Quyết toán tiền phòng còn lại" : "Chi phí dịch vụ")}</div>
                          <div style={{ display: "flex", gap: "0.4rem", marginTop: "2px" }}>
                            {d.bookingId && (
                              <span style={{ fontSize: "0.7rem", padding: "1px 6px", borderRadius: "4px", background: "rgba(79, 70, 229, 0.1)", color: "#4f46e5" }}>
                                Booking #{d.bookingId}
                              </span>
                            )}
                            <span style={{ fontSize: "0.7rem", padding: "1px 6px", borderRadius: "4px", background: "rgba(100, 116, 139, 0.1)", color: "#475569" }}>
                              {d.type}
                            </span>
                          </div>
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
                          {d.status === "UNPAID" && (
                            <span style={{ padding: "0.25rem 0.6rem", borderRadius: "6px", background: "rgba(245, 158, 11, 0.12)", color: "#d97706", fontWeight: 700, fontSize: "0.75rem" }}>
                              CHỜ THU
                            </span>
                          )}
                          {d.status === "OVERDUE" && (
                            <span style={{ padding: "0.25rem 0.6rem", borderRadius: "6px", background: "rgba(239, 68, 68, 0.12)", color: "#dc2626", fontWeight: 700, fontSize: "0.75rem" }}>
                              QUÁ HẠN
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
                            <button
                              className="btn btn-primary"
                              disabled={isProcessing}
                              onClick={() => handleCollectDebt(d.debtCode)}
                              style={{
                                fontSize: "0.75rem",
                                padding: "0.35rem 0.75rem",
                                background: canAfford ? "#059669" : "#64748b",
                                borderColor: canAfford ? "#059669" : "#64748b",
                              }}
                              title={canAfford ? "Khấu trừ từ ví khách ngay" : "Ví khách không đủ số dư để khấu trừ"}
                            >
                              {isProcessing ? "Đang thu..." : "Thu Ví (BR-01)"}
                            </button>
                          ) : (
                            <span style={{ fontSize: "0.75rem", color: "#059669", fontWeight: 600 }}>✓ Xong</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </>
      )}

      {/* TAB 4: REFUND MANAGEMENT & WALLET LOCK/UNLOCK (FEAT-13.6) */}
      {adminTab === "refunds" && (
        <>
          {/* Action Bar */}
          <div className="glass-card" style={{ padding: "1.25rem", marginBottom: "1.5rem", display: "flex", flexWrap: "wrap", justifyContent: "space-between", alignItems: "center", gap: "1rem" }}>
            <div>
              <h3 style={{ fontSize: "1.1rem", fontWeight: 800, margin: 0 }}>Quản Lý Hoàn Tiền Ví & Khóa/Mở Khóa Ví (FEAT-13.6)</h3>
              <p style={{ fontSize: "0.8125rem", color: "var(--text-muted)", margin: "0.25rem 0 0 0" }}>
                Thực thi hoàn tiền trực tiếp vào ví nội bộ cho các giao dịch dịch vụ/công nợ và quản trị an toàn ví.
              </p>
            </div>

            <div style={{ display: "flex", gap: "0.75rem" }}>
              <button
                className="btn btn-primary"
                onClick={() => {
                  setRefundForm({ originalTxId: "", amount: "", reason: "" });
                  setRefundableInfo(null);
                  setIsRefundModalOpen(true);
                }}
                style={{
                  background: "linear-gradient(135deg, #7e22ce 0%, #6b21a8 100%)",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "0.5rem",
                  fontSize: "0.8125rem",
                }}
              >
                <RotateCcw size={16} />
                <span>Thực Hiện Hoàn Tiền Ví Mới</span>
              </button>

              <button
                className="btn btn-secondary"
                onClick={fetchRefundsAndWallets}
                disabled={refundsLoading}
                style={{ display: "inline-flex", alignItems: "center", gap: "0.45rem", fontSize: "0.8125rem" }}
              >
                <RefreshCw size={15} className={refundsLoading ? "animate-spin" : ""} />
                <span>Làm mới</span>
              </button>
            </div>
          </div>

          {/* Section 1: All System Refunds */}
          <div className="glass-card" style={{ marginBottom: "2rem", overflow: "hidden" }}>
            <div style={{ padding: "1.25rem", borderBottom: "1px solid var(--border-color)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <h4 style={{ fontSize: "1rem", fontWeight: 800, margin: 0 }}>
                1. Nhật Ký Hoàn Tiền Hệ Thống ({refundsList.length})
              </h4>
            </div>

            {refundsLoading ? (
              <div style={{ padding: "2.5rem", textAlign: "center", color: "var(--text-muted)" }}>
                Đang tải dữ liệu hoàn tiền...
              </div>
            ) : refundsList.length === 0 ? (
              <div style={{ padding: "2.5rem", textAlign: "center", color: "var(--text-muted)" }}>
                Chưa có giao dịch hoàn tiền nào được ghi nhận.
              </div>
            ) : (
              <table className="custom-table">
                <thead>
                  <tr>
                    <th>Mã Hoàn Tiền</th>
                    <th>Thời Điểm</th>
                    <th>Khách Hàng & Ví</th>
                    <th>GD Gốc</th>
                    <th>Lý Do Hoàn</th>
                    <th style={{ textAlign: "right" }}>Số Tiền Hoàn</th>
                    <th>Người Thực Hiện</th>
                  </tr>
                </thead>
                <tbody>
                  {refundsList.map((r) => (
                    <tr key={r.id}>
                      <td style={{ fontWeight: 700, fontFamily: "monospace", fontSize: "0.8125rem" }}>
                        {r.refundCode}
                      </td>
                      <td style={{ fontSize: "0.8125rem", color: "var(--text-dim)" }}>
                        {formatDateTimeDisplay(r.processedAt || r.createdAt)}
                      </td>
                      <td>
                        <div style={{ fontWeight: 700 }}>{r.wallet?.user?.fullName || `User #${r.wallet?.userId}`}</div>
                        <div style={{ fontSize: "0.75rem", fontFamily: "monospace", color: "#4f46e5" }}>
                          {r.wallet?.walletNumber}
                        </div>
                      </td>
                      <td style={{ fontFamily: "monospace", fontSize: "0.8125rem" }}>
                        {r.originalTx?.transactionNo || r.originalTxId}
                      </td>
                      <td style={{ fontSize: "0.875rem" }}>{r.reason}</td>
                      <td style={{ textAlign: "right", fontWeight: 800, color: "#7e22ce", fontSize: "0.9375rem" }}>
                        +{formatCurrency(r.amount)}
                      </td>
                      <td style={{ fontSize: "0.8125rem", color: "var(--text-dim)" }}>
                        {r.processedBy || "admin"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          {/* Section 2: Customer Wallets & Safety Lock */}
          <div className="glass-card" style={{ overflow: "hidden" }}>
            <div style={{ padding: "1.25rem", borderBottom: "1px solid var(--border-color)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <h4 style={{ fontSize: "1rem", fontWeight: 800, margin: 0 }}>
                2. Danh Sách Ví Khách Hàng & Khóa/Mở Khóa Ví An Toàn ({walletsList.length})
              </h4>
            </div>

            {walletsLoading ? (
              <div style={{ padding: "2.5rem", textAlign: "center", color: "var(--text-muted)" }}>
                Đang tải danh sách ví...
              </div>
            ) : walletsList.length === 0 ? (
              <div style={{ padding: "2.5rem", textAlign: "center", color: "var(--text-muted)" }}>
                Chưa có ví khách hàng nào được tạo.
              </div>
            ) : (
              <table className="custom-table">
                <thead>
                  <tr>
                    <th>Mã Ví</th>
                    <th>Chủ Sở Hữu</th>
                    <th style={{ textAlign: "right" }}>Số Dư Khả Dụng</th>
                    <th style={{ textAlign: "center" }}>Trạng Thái Ví</th>
                    <th style={{ textAlign: "right" }}>Thao Tác Bảo Mật</th>
                  </tr>
                </thead>
                <tbody>
                  {walletsList.map((w) => (
                    <tr key={w.id}>
                      <td style={{ fontWeight: 700, fontFamily: "monospace", fontSize: "0.8125rem", color: "#4f46e5" }}>
                        {w.walletNumber}
                      </td>
                      <td>
                        <div style={{ fontWeight: 700 }}>{w.user?.fullName}</div>
                        <div style={{ fontSize: "0.75rem", color: "var(--text-dim)" }}>{w.user?.username}</div>
                      </td>
                      <td style={{ textAlign: "right", fontWeight: 800, fontSize: "0.9375rem", color: w.balance > 0 ? "#059669" : "#64748b" }}>
                        {formatCurrency(w.balance)}
                      </td>
                      <td style={{ textAlign: "center" }}>
                        {w.status === "ACTIVE" ? (
                          <span style={{ padding: "0.25rem 0.6rem", borderRadius: "6px", background: "rgba(16, 185, 129, 0.12)", color: "#059669", fontWeight: 700, fontSize: "0.75rem", display: "inline-flex", alignItems: "center", gap: "0.25rem" }}>
                            <Unlock size={13} /> HOẠT ĐỘNG
                          </span>
                        ) : (
                          <span style={{ padding: "0.25rem 0.6rem", borderRadius: "6px", background: "rgba(239, 68, 68, 0.12)", color: "#dc2626", fontWeight: 700, fontSize: "0.75rem", display: "inline-flex", alignItems: "center", gap: "0.25rem" }}>
                            <Lock size={13} /> ĐÃ KHÓA
                          </span>
                        )}
                      </td>
                      <td style={{ textAlign: "right" }}>
                        <button
                          className={`btn ${w.status === "ACTIVE" ? "btn-danger" : "btn-primary"}`}
                          style={{ fontSize: "0.75rem", padding: "0.35rem 0.75rem" }}
                          onClick={() => handleToggleWalletLock(w.id, w.status)}
                        >
                          {w.status === "ACTIVE" ? "Khóa Ví" : "Mở Khóa Ví"}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </>
      )}

      {/* Modal Hoàn Tiền (Refund Modal FEAT-13.6) */}
      {isRefundModalOpen && (
        <div className="modal-overlay" onClick={() => setIsRefundModalOpen(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: "560px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.25rem" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                <RotateCcw size={20} color="#7e22ce" />
                <h2 style={{ fontSize: "1.2rem", fontWeight: 800, margin: 0 }}>Thực Hiện Hoàn Tiền Vào Ví</h2>
              </div>
              <button
                onClick={() => setIsRefundModalOpen(false)}
                style={{ background: "none", border: "none", color: "var(--text-dim)", cursor: "pointer" }}
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSubmitRefund}>
              <div className="form-group">
                <label className="form-label">Mã ID Giao Dịch Gốc (Transaction ID) *</label>
                <div style={{ display: "flex", gap: "0.5rem" }}>
                  <input
                    type="number"
                    required
                    className="form-input"
                    placeholder="VD: 1, 2, 3..."
                    value={refundForm.originalTxId}
                    onChange={(e) => setRefundForm({ ...refundForm, originalTxId: e.target.value })}
                  />
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => handleCheckRefundable(refundForm.originalTxId)}
                    disabled={!refundForm.originalTxId || checkingRefundable}
                  >
                    {checkingRefundable ? "Đang tra..." : "Kiểm tra"}
                  </button>
                </div>
                <small style={{ color: "var(--text-dim)", fontSize: "0.75rem", marginTop: "4px", display: "block" }}>
                  Chỉ giao dịch Auto-Debit dịch vụ, Auto-Debit công nợ hoặc thanh toán trực tiếp mới hợp lệ hoàn tiền.
                </small>
              </div>

              {refundableInfo && (
                <div style={{ padding: "0.75rem 1rem", borderRadius: "10px", background: "rgba(147, 51, 234, 0.08)", border: "1px solid rgba(147, 51, 234, 0.25)", marginBottom: "1rem" }}>
                  <div style={{ fontSize: "0.8125rem", color: "#6b21a8", fontWeight: 700 }}>
                    Giao dịch: {refundableInfo.transactionNo} ({refundableInfo.type})
                  </div>
                  <div style={{ fontSize: "0.78rem", color: "var(--text-main)", marginTop: "2px" }}>
                    Khách hàng: <strong>{refundableInfo.customerName}</strong> • Ví: {refundableInfo.walletNumber}
                  </div>
                  <div style={{ fontSize: "0.78rem", color: "#059669", fontWeight: 700, marginTop: "4px" }}>
                    Tối đa có thể hoàn: {formatCurrency(refundableInfo.remainingRefundable)} (Đã hoàn: {formatCurrency(refundableInfo.totalRefunded)})
                  </div>
                </div>
              )}

              <div className="form-group">
                <label className="form-label">Số Tiền Hoàn Trả (VND) *</label>
                <input
                  type="number"
                  required
                  min="1000"
                  max={refundableInfo?.remainingRefundable || 100000000}
                  step="1000"
                  className="form-input"
                  placeholder="Nhập số tiền cần hoàn"
                  value={refundForm.amount}
                  onChange={(e) => setRefundForm({ ...refundForm, amount: e.target.value })}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Lý Do Hoàn Tiền *</label>
                <textarea
                  required
                  rows="3"
                  className="form-input"
                  placeholder="VD: Hủy phòng trong thời hạn được hoàn 100%, hoặc giảm trừ dịch vụ lỗi..."
                  value={refundForm.reason}
                  onChange={(e) => setRefundForm({ ...refundForm, reason: e.target.value })}
                />
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.75rem", marginTop: "1.5rem" }}>
                <button type="button" className="btn btn-secondary" onClick={() => setIsRefundModalOpen(false)}>
                  Hủy Bỏ
                </button>
                <button
                  type="submit"
                  disabled={submittingRefund || (refundableInfo && !refundableInfo.canRefund)}
                  className="btn btn-primary"
                  style={{ background: "linear-gradient(135deg, #7e22ce 0%, #6b21a8 100%)", fontWeight: 700 }}
                >
                  {submittingRefund ? "Đang xử lý..." : "Xác Nhận Hoàn Tiền"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Thêm / Sửa Người dùng */}
      {isModalOpen && (
        <div className="modal-overlay" onClick={() => setIsModalOpen(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.25rem" }}>
              <h2 style={{ fontSize: "1.2rem", fontWeight: 700 }}>
                {modalMode === "create" ? "Thêm Người Dùng Mới" : "Cập Nhật Thông Tin Người Dùng"}
              </h2>
              <button
                onClick={() => setIsModalOpen(false)}
                style={{ background: "none", border: "none", color: "var(--text-dim)", cursor: "pointer" }}
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleFormSubmit}>
              <div className="form-group">
                <label className="form-label">Tên đăng nhập *</label>
                <input
                  type="text"
                  required
                  className="form-input"
                  placeholder="Ví dụ: levanan, manager2"
                  value={formData.username}
                  onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                  disabled={modalMode === "edit"}
                />
              </div>

              <div className="form-group">
                <label className="form-label">
                  Mật khẩu {modalMode === "create" ? "*" : "(Để trống nếu không đổi)"}
                </label>
                <input
                  type="password"
                  required={modalMode === "create"}
                  minLength={6}
                  className="form-input"
                  placeholder={modalMode === "create" ? "Tối thiểu 6 ký tự" : "Nhập mật khẩu mới"}
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Họ và tên *</label>
                <input
                  type="text"
                  required
                  className="form-input"
                  placeholder="Ví dụ: Lê Văn An"
                  value={formData.fullName}
                  onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Vai trò trong hệ thống *</label>
                <select
                  className="form-select"
                  value={formData.role}
                  onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                >
                  <option value="SALE">SALE (Lễ tân & Bán phòng)</option>
                  <option value="MANAGER">MANAGER (Quản lý thiết lập & Khuyến mãi)</option>
                  <option value="ADMIN">ADMIN (Quản trị viên toàn quyền)</option>
                  <option value="CUSTOMER">CUSTOMER (Khách hàng đặt phòng trực tuyến)</option>
                </select>
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginTop: "1rem" }}>
                <input
                  type="checkbox"
                  id="isActiveCheck"
                  checked={formData.isActive}
                  onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                  style={{ width: "18px", height: "18px", cursor: "pointer", accentColor: "var(--primary)" }}
                />
                <label htmlFor="isActiveCheck" style={{ fontSize: "0.875rem", cursor: "pointer", userSelect: "none" }}>
                  Kích hoạt tài khoản (Cho phép đăng nhập vào hệ thống)
                </label>
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.75rem", marginTop: "1.75rem" }}>
                <button type="button" className="btn btn-secondary" onClick={() => setIsModalOpen(false)}>
                  Hủy bỏ
                </button>
                <button type="submit" className="btn btn-primary">
                  {modalMode === "create" ? "Tạo Tài Khoản" : "Lưu Thay Đổi"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Xác nhận xóa */}
      {userToDelete && (
        <div className="modal-overlay" onClick={() => setUserToDelete(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: "440px" }}>
            <div style={{ textAlign: "center", marginBottom: "1.25rem" }}>
              <div style={{ width: "48px", height: "48px", borderRadius: "50%", background: "rgba(239, 68, 68, 0.15)", color: "var(--danger)", display: "inline-flex", alignItems: "center", justifyContent: "center", marginBottom: "0.75rem" }}>
                <AlertTriangle size={24} />
              </div>
              <h3 style={{ fontSize: "1.125rem", fontWeight: 700, marginBottom: "0.5rem" }}>Xác nhận xóa tài khoản</h3>
              <p style={{ color: "var(--text-muted)", fontSize: "0.875rem" }}>
                Bạn có chắc chắn muốn xóa người dùng <strong style={{ color: "var(--text-main)" }}>{userToDelete.username}</strong> ({userToDelete.fullName})? Hành động này không thể hoàn tác.
              </p>
            </div>

            <div style={{ display: "flex", justifyContent: "center", gap: "0.75rem" }}>
              <button className="btn btn-secondary" onClick={() => setUserToDelete(null)}>
                Hủy bỏ
              </button>
              <button className="btn btn-danger" onClick={confirmDelete}>
                Xác nhận xóa
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
