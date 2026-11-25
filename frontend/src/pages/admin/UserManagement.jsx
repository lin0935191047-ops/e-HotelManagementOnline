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
  const [adminTab, setAdminTab] = useState("users"); // "users" | "autoDebit"

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

  // Auto-Debit Admin State
  const [autoDebitList, setAutoDebitList] = useState([]);
  const [autoDebitLoading, setAutoDebitLoading] = useState(false);
  const [autoDebitStatusFilter, setAutoDebitStatusFilter] = useState("");
  const [actionLoadingId, setActionLoadingId] = useState(null);

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

  useEffect(() => {
    if (adminTab === "users") {
      fetchUsers();
    } else {
      fetchAutoDebitList();
    }
  }, [adminTab, roleFilter, autoDebitStatusFilter]);

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
      password: "", // Để trống nếu không muốn đổi pass
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
    <div style={{ maxWidth: "1200px", margin: "2rem auto", padding: "0 1.5rem" }}>
      {/* Header section */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "1.25rem" }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "0.25rem" }}>
            <div style={{ padding: "0.5rem", borderRadius: "10px", background: "rgba(236, 72, 153, 0.15)", color: "#ec4899" }}>
              <Shield size={24} />
            </div>
            <h1 style={{ fontSize: "1.5rem", fontWeight: 700 }}>Trung Tâm Quản Trị Hệ Thống (ADMIN)</h1>
          </div>
          <p style={{ color: "var(--text-muted)", fontSize: "0.875rem" }}>
            Quản trị người dùng theo RBAC khép kín và xét duyệt kích hoạt Auto-Debit bảo mật 2 bước theo chuẩn SRS FEAT-13.3.
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
      <div style={{ display: "flex", gap: "0.75rem", marginBottom: "1.5rem", borderBottom: "1px solid var(--border-color)", paddingBottom: "0.75rem" }}>
        <button
          className={`btn ${adminTab === "users" ? "btn-primary" : "btn-secondary"}`}
          onClick={() => setAdminTab("users")}
          style={{ display: "inline-flex", alignItems: "center", gap: "0.5rem" }}
        >
          <Users size={18} />
          <span>1. Quản Lý Tài Khoản & Phân Quyền</span>
        </button>

        <button
          className={`btn ${adminTab === "autoDebit" ? "btn-primary" : "btn-secondary"}`}
          onClick={() => setAdminTab("autoDebit")}
          style={{ display: "inline-flex", alignItems: "center", gap: "0.5rem" }}
        >
          <CreditCard size={18} />
          <span>2. Xét Duyệt & Kích Hoạt Auto-Debit (SRS FEAT-13.3)</span>
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
                            {/* Nút kích hoạt cho PENDING_ADMIN hoặc NOT_ENABLED khi đã có consent */}
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

                            {/* Các thao tác khi đang ACTIVE */}
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

                            {/* Các thao tác khi đang PAUSED */}
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

                            {/* Khi DISABLED */}
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

                            {/* Nếu chưa ký cam kết */}
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
                  disabled={modalMode === "edit"}
                  style={modalMode === "edit" ? { opacity: 0.6, cursor: "not-allowed" } : {}}
                  onChange={(e) => setFormData({ ...formData, username: e.target.value })}
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
                <label className="form-label">Vai trò (Role) *</label>
                <select
                  className="form-select"
                  value={formData.role}
                  onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                >
                  <option value="SALE">SALE (Lễ tân, Đặt phòng, Bán hàng, Check-in/out)</option>
                  <option value="MANAGER">MANAGER (Quản lý thiết lập Phòng, Dịch vụ, Khuyến mãi)</option>
                  <option value="ADMIN">ADMIN (Quản trị viên hệ thống & người dùng)</option>
                  <option value="CUSTOMER">CUSTOMER (Khách hàng, Ví nội bộ & Auto-Debit)</option>
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">
                  {modalMode === "create" ? "Mật khẩu khởi tạo *" : "Mật khẩu mới (Để trống nếu không đổi)"}
                </label>
                <input
                  type="password"
                  className="form-input"
                  placeholder={modalMode === "create" ? "Tối thiểu 6 ký tự" : "Nhập nếu muốn đổi mật khẩu"}
                  required={modalMode === "create"}
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                />
              </div>

              <div className="form-group" style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginTop: "1rem" }}>
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
