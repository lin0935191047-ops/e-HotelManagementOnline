import React, { useState, useEffect } from "react";
import {
  ConciergeBell,
  Plus,
  Search,
  Edit2,
  Trash2,
  CheckCircle,
  AlertTriangle,
  X,
  DollarSign,
  Tag,
  ShieldAlert,
} from "lucide-react";
import { apiRequest } from "../../api/client.js";

export default function ServiceSetup() {
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);

  // Filter
  const [search, setSearch] = useState("");

  // Modal Form State
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [editingService, setEditingService] = useState(null);
  const [formData, setFormData] = useState({
    serviceId: "",
    serviceName: "",
    description: "",
    unit: "",
    price: "",
  });
  const [formError, setFormError] = useState(null);

  // Modal Delete State
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [serviceToDelete, setServiceToDelete] = useState(null);
  const [deleteError, setDeleteError] = useState(null);

  const fetchServices = async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (search) params.append("search", search);

      const query = params.toString() ? `?${params.toString()}` : "";
      const res = await apiRequest(`/api/setup/services${query}`);
      setServices(res.data || []);
    } catch (err) {
      setError(err.message || "Không thể tải danh sách dịch vụ.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchServices();
  }, []);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    fetchServices();
  };

  const handleOpenCreateModal = () => {
    setEditingService(null);
    setFormData({
      serviceId: "",
      serviceName: "",
      description: "",
      unit: "",
      price: "",
    });
    setFormError(null);
    setIsFormModalOpen(true);
  };

  const handleOpenEditModal = (service) => {
    setEditingService(service);
    setFormData({
      serviceId: service.serviceId,
      serviceName: service.serviceName,
      description: service.description || "",
      unit: service.unit,
      price: service.price,
    });
    setFormError(null);
    setIsFormModalOpen(true);
  };

  const handleFormSubmit = async (e) => {
    e.preventDefault();
    setFormError(null);

    if (!formData.serviceName.trim()) {
      setFormError("Vui lòng nhập tên dịch vụ.");
      return;
    }
    if (!formData.unit.trim()) {
      setFormError("Vui lòng nhập đơn vị tính (VD: Lượt, Kg, Lon, Suất).");
      return;
    }
    const numPrice = parseFloat(formData.price);
    if (isNaN(numPrice) || numPrice <= 0) {
      setFormError("Đơn giá dịch vụ phải lớn hơn 0 VND.");
      return;
    }

    try {
      if (editingService) {
        await apiRequest(`/api/setup/services/${editingService.serviceId}`, {
          method: "PUT",
          body: {
            serviceName: formData.serviceName.trim(),
            description: formData.description.trim() || null,
            unit: formData.unit.trim(),
            price: numPrice,
          },
        });
        setSuccessMsg(`Cập nhật dịch vụ '${editingService.serviceId}' thành công!`);
      } else {
        if (!formData.serviceId.trim()) {
          setFormError("Vui lòng nhập mã dịch vụ (VD: SRV-01).");
          return;
        }
        await apiRequest("/api/setup/services", {
          method: "POST",
          body: {
            serviceId: formData.serviceId.trim().toUpperCase(),
            serviceName: formData.serviceName.trim(),
            description: formData.description.trim() || null,
            unit: formData.unit.trim(),
            price: numPrice,
          },
        });
        setSuccessMsg(`Tạo dịch vụ '${formData.serviceId.toUpperCase()}' thành công!`);
      }

      setIsFormModalOpen(false);
      fetchServices();
      setTimeout(() => setSuccessMsg(null), 4000);
    } catch (err) {
      setFormError(err.message || "Đã xảy ra lỗi khi lưu thông tin dịch vụ.");
    }
  };

  const handleOpenDeleteModal = (service) => {
    setServiceToDelete(service);
    setDeleteError(null);
    setIsDeleteModalOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!serviceToDelete) return;
    setDeleteError(null);
    try {
      await apiRequest(`/api/setup/services/${serviceToDelete.serviceId}`, {
        method: "DELETE",
      });
      setIsDeleteModalOpen(false);
      setServiceToDelete(null);
      setSuccessMsg(`Đã xóa dịch vụ '${serviceToDelete.serviceId}' thành công!`);
      fetchServices();
      setTimeout(() => setSuccessMsg(null), 4000);
    } catch (err) {
      setDeleteError(err.message || "Không thể xóa dịch vụ này.");
    }
  };

  return (
    <div style={{ maxWidth: "1200px", margin: "2rem auto", padding: "0 1.5rem" }}>
      {/* Top Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.75rem", flexWrap: "wrap", gap: "1rem" }}>
        <div>
          <h1 style={{ fontSize: "1.75rem", fontWeight: 700, display: "flex", alignItems: "center", gap: "0.625rem" }}>
            <ConciergeBell color="#3b82f6" size={28} />
            Quản Lý Danh Mục Dịch Vụ
          </h1>
          <p style={{ color: "var(--text-muted)", fontSize: "0.875rem", marginTop: "0.25rem" }}>
            Thiết lập các dịch vụ phát sinh (minibar, giặt ủi, ăn uống, spa, đưa đón...) phục vụ lưu trú.
          </p>
        </div>

        <button className="btn btn-primary" onClick={handleOpenCreateModal} style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
          <Plus size={18} />
          <span>Thêm Dịch Vụ Mới</span>
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

      {/* Search Bar */}
      <div className="glass-card" style={{ padding: "1.25rem", marginBottom: "1.5rem" }}>
        <form onSubmit={handleSearchSubmit} style={{ display: "flex", gap: "1rem", flexWrap: "wrap" }}>
          <div style={{ flex: 1, minWidth: "260px", position: "relative" }}>
            <Search size={16} color="var(--text-dim)" style={{ position: "absolute", left: "12px", top: "50%", transform: "translateY(-50%)" }} />
            <input
              type="text"
              className="form-input"
              style={{ paddingLeft: "36px" }}
              placeholder="Tìm theo mã dịch vụ, tên dịch vụ hoặc đơn vị tính..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <button type="submit" className="btn btn-secondary">
            Tìm Kiếm
          </button>
          {search && (
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => {
                setSearch("");
                setTimeout(() => fetchServices(), 0);
              }}
            >
              Đặt lại
            </button>
          )}
        </form>
      </div>

      {/* Services Table */}
      <div className="glass-card" style={{ overflow: "hidden" }}>
        <div style={{ overflowX: "auto" }}>
          <table className="custom-table" style={{ width: "100%", borderCollapse: "collapse", textAlign: "left" }}>
            <thead>
              <tr>
                <th>Mã Dịch Vụ</th>
                <th>Tên Dịch Vụ</th>
                <th>Mô Tả</th>
                <th>Đơn Vị Tính</th>
                <th>Đơn Giá (VND)</th>
                <th>Đã Sử Dụng</th>
                <th style={{ textAlign: "right" }}>Thao Tác</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="7" style={{ textAlign: "center", padding: "2.5rem", color: "var(--text-muted)" }}>
                    Đang tải danh sách dịch vụ...
                  </td>
                </tr>
              ) : services.length === 0 ? (
                <tr>
                  <td colSpan="7" style={{ textAlign: "center", padding: "3rem", color: "var(--text-muted)" }}>
                    <ConciergeBell size={36} color="var(--text-dim)" style={{ margin: "0 auto 0.75rem" }} />
                    <p>Chưa có dịch vụ nào hoặc không tìm thấy kết quả phù hợp.</p>
                  </td>
                </tr>
              ) : (
                services.map((srv) => (
                  <tr key={srv.serviceId}>
                    <td>
                      <span style={{ fontWeight: 700, color: "#60a5fa", background: "rgba(59, 130, 246, 0.1)", padding: "0.25rem 0.5rem", borderRadius: "6px" }}>
                        {srv.serviceId}
                      </span>
                    </td>
                    <td style={{ fontWeight: 600 }}>{srv.serviceName}</td>
                    <td style={{ color: "var(--text-muted)", maxWidth: "280px" }}>{srv.description || "—"}</td>
                    <td>
                      <span style={{ background: "rgba(255, 255, 255, 0.05)", padding: "0.2rem 0.5rem", borderRadius: "4px", fontSize: "0.8125rem" }}>
                        {srv.unit}
                      </span>
                    </td>
                    <td style={{ fontWeight: 700, color: "#34d399" }}>
                      {Number(srv.price).toLocaleString("vi-VN")} ₫
                    </td>
                    <td>
                      <span style={{ fontSize: "0.8125rem", color: srv._count?.serviceUsage > 0 ? "#fbbf24" : "var(--text-dim)" }}>
                        {srv._count?.serviceUsage || 0} lượt
                      </span>
                    </td>
                    <td style={{ textAlign: "right" }}>
                      <div style={{ display: "inline-flex", gap: "0.5rem" }}>
                        <button
                          className="btn btn-secondary"
                          style={{ padding: "0.4rem 0.6rem" }}
                          onClick={() => handleOpenEditModal(srv)}
                          title="Chỉnh sửa dịch vụ"
                        >
                          <Edit2 size={15} />
                        </button>
                        <button
                          className="btn btn-danger"
                          style={{ padding: "0.4rem 0.6rem" }}
                          onClick={() => handleOpenDeleteModal(srv)}
                          title="Xóa dịch vụ"
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Thêm / Chỉnh Sửa Dịch Vụ */}
      {isFormModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: "560px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.25rem" }}>
              <h2 style={{ fontSize: "1.25rem", fontWeight: 700, display: "flex", alignItems: "center", gap: "0.5rem" }}>
                <ConciergeBell size={20} color="#3b82f6" />
                {editingService ? `Chỉnh Sửa Dịch Vụ: ${editingService.serviceId}` : "Tạo Dịch Vụ Mới"}
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
                <label className="form-label">Mã Dịch Vụ (Service ID) *</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="VD: SRV-01, SPA-01, MINI-01"
                  value={formData.serviceId}
                  onChange={(e) => setFormData({ ...formData, serviceId: e.target.value })}
                  disabled={!!editingService}
                  required
                />
                <span style={{ fontSize: "0.75rem", color: "var(--text-dim)", marginTop: "4px", display: "block" }}>
                  Mã định danh duy nhất, không thể thay đổi sau khi tạo.
                </span>
              </div>

              <div className="form-group">
                <label className="form-label">Tên Dịch Vụ *</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="VD: Giặt ủi cao cấp, Bữa sáng Buffet, Nước suối Minibar"
                  value={formData.serviceName}
                  onChange={(e) => setFormData({ ...formData, serviceName: e.target.value })}
                  required
                />
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
                <div className="form-group">
                  <label className="form-label">Đơn Vị Tính *</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="VD: Lượt, Kg, Lon, Suất, Chai"
                    value={formData.unit}
                    onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Đơn Giá (VND) *</label>
                  <input
                    type="number"
                    min="1000"
                    step="1000"
                    className="form-input"
                    placeholder="VD: 50000"
                    value={formData.price}
                    onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                    required
                  />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Mô Tả Chi Tiết</label>
                <textarea
                  className="form-input"
                  rows="3"
                  placeholder="Ghi chú chi tiết về dịch vụ..."
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                />
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.75rem", marginTop: "1.5rem" }}>
                <button type="button" className="btn btn-secondary" onClick={() => setIsFormModalOpen(false)}>
                  Hủy Bỏ
                </button>
                <button type="submit" className="btn btn-primary">
                  {editingService ? "Lưu Thay Đổi" : "Tạo Mới"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Xác Nhận Xóa Dịch Vụ */}
      {isDeleteModalOpen && serviceToDelete && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: "460px" }}>
            <div style={{ display: "flex", alignItems: "flex-start", gap: "1rem", marginBottom: "1.25rem" }}>
              <div style={{ background: "rgba(239, 68, 68, 0.15)", padding: "0.75rem", borderRadius: "10px", color: "var(--danger)" }}>
                <ShieldAlert size={28} />
              </div>
              <div>
                <h3 style={{ fontSize: "1.15rem", fontWeight: 700 }}>Xác Nhận Xóa Dịch Vụ?</h3>
                <p style={{ color: "var(--text-muted)", fontSize: "0.875rem", marginTop: "0.25rem" }}>
                  Bạn có chắc chắn muốn xóa dịch vụ{" "}
                  <strong style={{ color: "var(--text-main)" }}>
                    {serviceToDelete.serviceId} - {serviceToDelete.serviceName}
                  </strong>
                  ?
                </p>
              </div>
            </div>

            {deleteError && (
              <div style={{ background: "rgba(239, 68, 68, 0.12)", border: "1px solid rgba(239, 68, 68, 0.3)", borderRadius: "8px", padding: "0.75rem 1rem", marginBottom: "1rem", color: "#fca5a5", fontSize: "0.875rem" }}>
                <strong>Lỗi Guard: </strong> {deleteError}
              </div>
            )}

            <div style={{ background: "rgba(245, 158, 11, 0.08)", border: "1px solid rgba(245, 158, 11, 0.25)", borderRadius: "8px", padding: "0.75rem 1rem", marginBottom: "1.25rem", color: "#fcd34d", fontSize: "0.8125rem" }}>
              🛡️ <strong>Service Usage Guard:</strong> Hệ thống tự động từ chối xóa nếu dịch vụ này đã từng phát sinh hóa đơn hoặc phiếu sử dụng trong bất kỳ booking nào.
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
