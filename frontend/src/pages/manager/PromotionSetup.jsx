import React, { useState, useEffect } from "react";
import {
  Tag,
  Plus,
  Search,
  Filter,
  Edit2,
  Trash2,
  CheckCircle,
  AlertTriangle,
  X,
  Percent,
  DollarSign,
  Calendar,
  ShieldAlert,
} from "lucide-react";
import { apiRequest } from "../../api/client.js";

const DISCOUNT_TYPES = [
  { value: "PERCENTAGE", label: "Phần trăm (%)" },
  { value: "FIXED_AMOUNT", label: "Số tiền cố định (VND)" },
];

const STATUS_FILTERS = [
  { value: "", label: "Tất cả trạng thái" },
  { value: "ACTIVE", label: "Đang hiệu lực (Active)" },
  { value: "UPCOMING", label: "Sắp diễn ra (Upcoming)" },
  { value: "EXPIRED", label: "Đã hết hạn (Expired)" },
];

export default function PromotionSetup() {
  const [promotions, setPromotions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);

  // Filters
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");

  // Modal Form State
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [editingPromotion, setEditingPromotion] = useState(null);
  const [formData, setFormData] = useState({
    code: "",
    name: "",
    description: "",
    discountType: "PERCENTAGE",
    value: "",
    startDate: "",
    endDate: "",
  });
  const [formError, setFormError] = useState(null);

  // Modal Delete State
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [promotionToDelete, setPromotionToDelete] = useState(null);
  const [deleteError, setDeleteError] = useState(null);

  const fetchPromotions = async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (search) params.append("search", search);
      if (typeFilter) params.append("discountType", typeFilter);
      if (statusFilter) params.append("status", statusFilter);

      const query = params.toString() ? `?${params.toString()}` : "";
      const res = await apiRequest(`/api/setup/promotions${query}`);
      setPromotions(res.data || []);
    } catch (err) {
      setError(err.message || "Không thể tải danh sách khuyến mãi.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPromotions();
  }, [typeFilter, statusFilter]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    fetchPromotions();
  };

  const toInputDate = (isoStr) => {
    if (!isoStr) return "";
    return new Date(isoStr).toISOString().split("T")[0];
  };

  const formatDateVN = (isoStr) => {
    if (!isoStr) return "—";
    const d = new Date(isoStr);
    return d.toLocaleDateString("vi-VN", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  };

  const handleOpenCreateModal = () => {
    setEditingPromotion(null);
    const today = new Date().toISOString().split("T")[0];
    const nextMonth = new Date(Date.now() + 30 * 86400000).toISOString().split("T")[0];

    setFormData({
      code: "",
      name: "",
      description: "",
      discountType: "PERCENTAGE",
      value: "",
      startDate: today,
      endDate: nextMonth,
    });
    setFormError(null);
    setIsFormModalOpen(true);
  };

  const handleOpenEditModal = (promo) => {
    setEditingPromotion(promo);
    setFormData({
      code: promo.code,
      name: promo.name,
      description: promo.description || "",
      discountType: promo.discountType,
      value: promo.value,
      startDate: toInputDate(promo.startDate),
      endDate: toInputDate(promo.endDate),
    });
    setFormError(null);
    setIsFormModalOpen(true);
  };

  const handleFormSubmit = async (e) => {
    e.preventDefault();
    setFormError(null);

    if (!formData.name.trim()) {
      setFormError("Vui lòng nhập tên chương trình khuyến mãi.");
      return;
    }

    const numVal = parseFloat(formData.value);
    if (isNaN(numVal) || numVal <= 0) {
      setFormError("Giá trị giảm giá phải lớn hơn 0.");
      return;
    }

    if (formData.discountType === "PERCENTAGE" && numVal > 100) {
      setFormError("Tỷ lệ giảm giá (%) không được vượt quá 100%.");
      return;
    }

    if (!formData.startDate || !formData.endDate) {
      setFormError("Vui lòng chọn ngày bắt đầu và kết thúc.");
      return;
    }

    if (new Date(formData.endDate) < new Date(formData.startDate)) {
      setFormError("Ngày kết thúc phải lớn hơn hoặc bằng ngày bắt đầu.");
      return;
    }

    try {
      const payload = {
        name: formData.name.trim(),
        description: formData.description.trim() || null,
        discountType: formData.discountType,
        value: numVal,
        startDate: new Date(formData.startDate).toISOString(),
        endDate: new Date(formData.endDate).toISOString(),
      };

      if (editingPromotion) {
        await apiRequest(`/api/setup/promotions/${editingPromotion.id}`, {
          method: "PUT",
          body: payload,
        });
        setSuccessMsg(`Cập nhật khuyến mãi '${editingPromotion.code}' thành công!`);
      } else {
        if (!formData.code.trim()) {
          setFormError("Vui lòng nhập mã khuyến mãi (VD: SUMMER2026).");
          return;
        }
        await apiRequest("/api/setup/promotions", {
          method: "POST",
          body: {
            ...payload,
            code: formData.code.trim().toUpperCase(),
          },
        });
        setSuccessMsg(`Tạo mã khuyến mãi '${formData.code.toUpperCase()}' thành công!`);
      }

      setIsFormModalOpen(false);
      fetchPromotions();
      setTimeout(() => setSuccessMsg(null), 4000);
    } catch (err) {
      setFormError(err.message || "Đã xảy ra lỗi khi lưu thông tin khuyến mãi.");
    }
  };

  const handleOpenDeleteModal = (promo) => {
    setPromotionToDelete(promo);
    setDeleteError(null);
    setIsDeleteModalOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!promotionToDelete) return;
    setDeleteError(null);
    try {
      await apiRequest(`/api/setup/promotions/${promotionToDelete.id}`, {
        method: "DELETE",
      });
      setIsDeleteModalOpen(false);
      setPromotionToDelete(null);
      setSuccessMsg(`Đã xóa khuyến mãi '${promotionToDelete.code}' thành công!`);
      fetchPromotions();
      setTimeout(() => setSuccessMsg(null), 4000);
    } catch (err) {
      setDeleteError(err.message || "Không thể xóa khuyến mãi này.");
    }
  };

  return (
    <div style={{ maxWidth: "1200px", margin: "2rem auto", padding: "0 1.5rem" }}>
      {/* Top Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.75rem", flexWrap: "wrap", gap: "1rem" }}>
        <div>
          <h1 style={{ fontSize: "1.75rem", fontWeight: 700, display: "flex", alignItems: "center", gap: "0.625rem" }}>
            <Tag color="#8b5cf6" size={28} />
            Quản Lý Chương Trình Khuyến Mãi
          </h1>
          <p style={{ color: "var(--text-muted)", fontSize: "0.875rem", marginTop: "0.25rem" }}>
            Thiết lập mã coupon giảm giá (theo % hoặc số tiền cố định) áp dụng khi khách đặt phòng trực tuyến.
          </p>
        </div>

        <button className="btn btn-primary" onClick={handleOpenCreateModal} style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
          <Plus size={18} />
          <span>Thêm Khuyến Mãi Mới</span>
        </button>
      </div>

      {/* Alerts */}
      {successMsg && (
        <div style={{ background: "rgba(16, 185, 129, 0.12)", border: "1px solid rgba(16, 185, 129, 0.3)", borderRadius: "8px", padding: "0.875rem 1rem", marginBottom: "1.25rem", color: "#6ee7b7", display: "flex", alignItems: "center", gap: "0.625rem" }}>
          <CheckCircle size={18} />
          <span>{successMsg}</span>
        </div>
      )}

      {error && (
        <div style={{ background: "rgba(239, 68, 68, 0.12)", border: "1px solid rgba(239, 68, 68, 0.3)", borderRadius: "8px", padding: "0.875rem 1rem", marginBottom: "1.25rem", color: "#fca5a5", display: "flex", alignItems: "center", gap: "0.625rem" }}>
          <AlertTriangle size={18} />
          <span>{error}</span>
        </div>
      )}

      {/* Search & Filter Bar */}
      <div className="glass-card" style={{ padding: "1.25rem", marginBottom: "1.5rem" }}>
        <form onSubmit={handleSearchSubmit} style={{ display: "flex", gap: "1rem", flexWrap: "wrap", alignItems: "center" }}>
          <div style={{ flex: 1, minWidth: "240px", position: "relative" }}>
            <Search size={16} color="var(--text-dim)" style={{ position: "absolute", left: "12px", top: "50%", transform: "translateY(-50%)" }} />
            <input
              type="text"
              className="form-input"
              style={{ paddingLeft: "36px" }}
              placeholder="Tìm theo mã code, tên chương trình..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <div style={{ minWidth: "160px" }}>
            <select
              className="form-select"
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
            >
              <option value="">Tất cả hình thức</option>
              <option value="PERCENTAGE">Giảm theo %</option>
              <option value="FIXED_AMOUNT">Giảm số tiền cố định</option>
            </select>
          </div>

          <div style={{ minWidth: "180px" }}>
            <select
              className="form-select"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              {STATUS_FILTERS.map((f) => (
                <option key={f.value} value={f.value}>
                  {f.label}
                </option>
              ))}
            </select>
          </div>

          <button type="submit" className="btn btn-secondary">
            Lọc
          </button>
        </form>
      </div>

      {/* Promotions Table */}
      <div className="glass-card" style={{ overflow: "hidden" }}>
        <div style={{ overflowX: "auto" }}>
          <table className="custom-table" style={{ width: "100%", borderCollapse: "collapse", textAlign: "left" }}>
            <thead>
              <tr>
                <th>Mã Code</th>
                <th>Tên Chương Trình</th>
                <th>Hình Thức Giảm</th>
                <th>Mức Giảm</th>
                <th>Thời Gian Hiệu Lực</th>
                <th>Trạng Thái</th>
                <th>Đơn Đặt</th>
                <th style={{ textAlign: "right" }}>Thao Tác</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="8" style={{ textAlign: "center", padding: "2.5rem", color: "var(--text-muted)" }}>
                    Đang tải danh sách khuyến mãi...
                  </td>
                </tr>
              ) : promotions.length === 0 ? (
                <tr>
                  <td colSpan="8" style={{ textAlign: "center", padding: "3rem", color: "var(--text-muted)" }}>
                    <Tag size={36} color="var(--text-dim)" style={{ margin: "0 auto 0.75rem" }} />
                    <p>Chưa có chương trình khuyến mãi nào.</p>
                  </td>
                </tr>
              ) : (
                promotions.map((p) => {
                  const isActive = p.computedStatus === "ACTIVE";
                  const isUpcoming = p.computedStatus === "UPCOMING";

                  return (
                    <tr key={p.id}>
                      <td>
                        <span style={{ fontWeight: 800, letterSpacing: "0.05em", color: "#a78bfa", background: "rgba(139, 92, 246, 0.12)", padding: "0.25rem 0.6rem", borderRadius: "6px" }}>
                          {p.code}
                        </span>
                      </td>
                      <td style={{ fontWeight: 600 }}>
                        <div>{p.name}</div>
                        {p.description && (
                          <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginTop: "2px" }}>
                            {p.description}
                          </div>
                        )}
                      </td>
                      <td>
                        {p.discountType === "PERCENTAGE" ? (
                          <span style={{ display: "inline-flex", alignItems: "center", gap: "0.25rem", color: "#60a5fa", background: "rgba(59, 130, 246, 0.1)", padding: "0.2rem 0.5rem", borderRadius: "4px", fontSize: "0.8125rem", fontWeight: 600 }}>
                            <Percent size={13} /> Phần trăm
                          </span>
                        ) : (
                          <span style={{ display: "inline-flex", alignItems: "center", gap: "0.25rem", color: "#34d399", background: "rgba(16, 185, 129, 0.1)", padding: "0.2rem 0.5rem", borderRadius: "4px", fontSize: "0.8125rem", fontWeight: 600 }}>
                            <DollarSign size={13} /> Số tiền
                          </span>
                        )}
                      </td>
                      <td style={{ fontWeight: 700, fontSize: "0.9375rem" }}>
                        {p.discountType === "PERCENTAGE" ? (
                          <span style={{ color: "#818cf8" }}>{Number(p.value)}%</span>
                        ) : (
                          <span style={{ color: "#34d399" }}>{Number(p.value).toLocaleString("vi-VN")} ₫</span>
                        )}
                      </td>
                      <td style={{ fontSize: "0.8125rem", color: "var(--text-muted)" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "0.35rem" }}>
                          <Calendar size={13} />
                          <span>{formatDateVN(p.startDate)} → {formatDateVN(p.endDate)}</span>
                        </div>
                      </td>
                      <td>
                        <span
                          style={{
                            padding: "0.25rem 0.6rem",
                            borderRadius: "12px",
                            fontSize: "0.75rem",
                            fontWeight: 700,
                            background: isActive
                              ? "rgba(16, 185, 129, 0.15)"
                              : isUpcoming
                              ? "rgba(59, 130, 246, 0.15)"
                              : "rgba(107, 114, 128, 0.15)",
                            color: isActive ? "#34d399" : isUpcoming ? "#60a5fa" : "#9ca3af",
                            border: `1px solid ${
                              isActive
                                ? "rgba(16, 185, 129, 0.3)"
                                : isUpcoming
                                ? "rgba(59, 130, 246, 0.3)"
                                : "rgba(107, 114, 128, 0.3)"
                            }`,
                          }}
                        >
                          {isActive ? "ĐANG HIỆU LỰC" : isUpcoming ? "SẮP DIỄN RA" : "ĐÃ HẾT HẠN"}
                        </span>
                      </td>
                      <td>
                        <span style={{ fontSize: "0.8125rem", color: p._count?.bookings > 0 ? "#fbbf24" : "var(--text-dim)" }}>
                          {p._count?.bookings || 0} đơn
                        </span>
                      </td>
                      <td style={{ textAlign: "right" }}>
                        <div style={{ display: "inline-flex", gap: "0.5rem" }}>
                          <button
                            className="btn btn-secondary"
                            style={{ padding: "0.4rem 0.6rem" }}
                            onClick={() => handleOpenEditModal(p)}
                            title="Chỉnh sửa khuyến mãi"
                          >
                            <Edit2 size={15} />
                          </button>
                          <button
                            className="btn btn-danger"
                            style={{ padding: "0.4rem 0.6rem" }}
                            onClick={() => handleOpenDeleteModal(p)}
                            title="Xóa khuyến mãi"
                          >
                            <Trash2 size={15} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Thêm / Chỉnh Sửa Khuyến Mãi */}
      {isFormModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: "560px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.25rem" }}>
              <h2 style={{ fontSize: "1.25rem", fontWeight: 700, display: "flex", alignItems: "center", gap: "0.5rem" }}>
                <Tag size={20} color="#8b5cf6" />
                {editingPromotion ? `Chỉnh Sửa Mã: ${editingPromotion.code}` : "Tạo Mã Khuyến Mãi Mới"}
              </h2>
              <button
                onClick={() => setIsFormModalOpen(false)}
                style={{ background: "none", border: "none", color: "var(--text-muted)", cursor: "pointer" }}
              >
                <X size={20} />
              </button>
            </div>

            {formError && (
              <div style={{ background: "rgba(239, 68, 68, 0.12)", border: "1px solid rgba(239, 68, 68, 0.3)", borderRadius: "8px", padding: "0.75rem 1rem", marginBottom: "1rem", color: "#fca5a5", fontSize: "0.875rem" }}>
                {formError}
              </div>
            )}

            <form onSubmit={handleFormSubmit}>
              <div className="form-group">
                <label className="form-label">Mã Code Khuyến Mãi *</label>
                <input
                  type="text"
                  className="form-input"
                  style={{ textTransform: "uppercase", fontWeight: 700 }}
                  placeholder="VD: SUMMER2026, VIPHOTEL, TET2027"
                  value={formData.code}
                  onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                  disabled={!!editingPromotion}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Tên Chương Trình *</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="VD: Ưu đãi mùa hè rực rỡ, Tri ân khách hàng thân thiết"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                />
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
                <div className="form-group">
                  <label className="form-label">Hình Thức Giảm Giá *</label>
                  <select
                    className="form-select"
                    value={formData.discountType}
                    onChange={(e) => setFormData({ ...formData, discountType: e.target.value })}
                  >
                    {DISCOUNT_TYPES.map((t) => (
                      <option key={t.value} value={t.value}>
                        {t.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">
                    {formData.discountType === "PERCENTAGE" ? "Tỷ Lệ Giảm (% <= 100) *" : "Số Tiền Giảm (VND) *"}
                  </label>
                  <input
                    type="number"
                    min="1"
                    max={formData.discountType === "PERCENTAGE" ? "100" : undefined}
                    step={formData.discountType === "PERCENTAGE" ? "1" : "1000"}
                    className="form-input"
                    placeholder={formData.discountType === "PERCENTAGE" ? "VD: 15" : "VD: 200000"}
                    value={formData.value}
                    onChange={(e) => setFormData({ ...formData, value: e.target.value })}
                    required
                  />
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
                <div className="form-group">
                  <label className="form-label">Ngày Bắt Đầu *</label>
                  <input
                    type="date"
                    className="form-input"
                    value={formData.startDate}
                    onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Ngày Kết Thúc *</label>
                  <input
                    type="date"
                    className="form-input"
                    value={formData.endDate}
                    onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                    required
                  />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Mô Tả & Điều Kiện Áp Dụng</label>
                <textarea
                  className="form-input"
                  rows="2"
                  placeholder="Ghi chú điều kiện áp dụng cho khách hàng..."
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                />
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.75rem", marginTop: "1.5rem" }}>
                <button type="button" className="btn btn-secondary" onClick={() => setIsFormModalOpen(false)}>
                  Hủy Bỏ
                </button>
                <button type="submit" className="btn btn-primary">
                  {editingPromotion ? "Lưu Thay Đổi" : "Tạo Mới"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Xác Nhận Xóa Khuyến Mãi */}
      {isDeleteModalOpen && promotionToDelete && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: "460px" }}>
            <div style={{ display: "flex", alignItems: "flex-start", gap: "1rem", marginBottom: "1.25rem" }}>
              <div style={{ background: "rgba(239, 68, 68, 0.15)", padding: "0.75rem", borderRadius: "10px", color: "var(--danger)" }}>
                <ShieldAlert size={28} />
              </div>
              <div>
                <h3 style={{ fontSize: "1.15rem", fontWeight: 700 }}>Xác Nhận Xóa Mã Khuyến Mãi?</h3>
                <p style={{ color: "var(--text-muted)", fontSize: "0.875rem", marginTop: "0.25rem" }}>
                  Bạn có chắc muốn xóa mã{" "}
                  <strong style={{ color: "#a78bfa" }}>{promotionToDelete.code}</strong> (
                  {promotionToDelete.name})?
                </p>
              </div>
            </div>

            {deleteError && (
              <div style={{ background: "rgba(239, 68, 68, 0.12)", border: "1px solid rgba(239, 68, 68, 0.3)", borderRadius: "8px", padding: "0.75rem 1rem", marginBottom: "1rem", color: "#fca5a5", fontSize: "0.875rem" }}>
                <strong>Lỗi Guard: </strong> {deleteError}
              </div>
            )}

            <div style={{ background: "rgba(245, 158, 11, 0.08)", border: "1px solid rgba(245, 158, 11, 0.25)", borderRadius: "8px", padding: "0.75rem 1rem", marginBottom: "1.25rem", color: "#fcd34d", fontSize: "0.8125rem" }}>
              🛡️ <strong>Promotion Guard:</strong> Hệ thống tự động chặn xóa nếu mã khuyến mãi này đã từng được khách sử dụng trong bất kỳ đơn đặt phòng nào.
            </div>

            <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.75rem" }}>
              <button type="button" className="btn btn-secondary" onClick={() => setIsDeleteModalOpen(false)}>
                Hủy Bỏ
              </button>
              <button type="button" className="btn btn-danger" onClick={handleConfirmDelete}>
                Xóa Vĩnh Viễn
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
