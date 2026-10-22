import React, { useState, useEffect } from "react";
import {
  BedDouble,
  Plus,
  Search,
  Filter,
  Edit2,
  Trash2,
  CheckCircle,
  AlertTriangle,
  X,
  Users,
  Image as ImageIcon,
  DollarSign,
  ShieldAlert,
} from "lucide-react";
import { apiRequest } from "../../api/client.js";

const ROOM_TYPES = [
  { value: "VIP", label: "VIP" },
  { value: "DELUX", label: "Deluxe (DELUX)" },
  { value: "LIVING_SUITE", label: "Living Suite" },
];

const ROOM_SIZES = [
  { value: "SINGLE", label: "Single (1 Giường)" },
  { value: "DOUBLE", label: "Double (2 Giường)" },
];

const ROOM_STATUSES = [
  { value: "AVAILABLE", label: "Sẵn sàng (Available)", color: "available" },
  { value: "OCCUPIED", label: "Đang có khách (Occupied)", color: "occupied" },
  { value: "MAINTENANCE", label: "Bảo trì (Maintenance)", color: "maintenance" },
];

export default function RoomSetup() {
  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);

  // Filters
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [sizeFilter, setSizeFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");

  // Modal State
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [editingRoom, setEditingRoom] = useState(null);
  const [formData, setFormData] = useState({
    roomId: "",
    type: "VIP",
    size: "SINGLE",
    price: "",
    maxAdults: 2,
    maxChildren: 1,
    extraChildFee: 0,
    description: "",
    pictures: "",
    status: "AVAILABLE",
  });
  const [formError, setFormError] = useState(null);

  // Delete Modal State
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [roomToDelete, setRoomToDelete] = useState(null);
  const [deleteError, setDeleteError] = useState(null);

  const fetchRooms = async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (search) params.append("search", search);
      if (typeFilter) params.append("type", typeFilter);
      if (sizeFilter) params.append("size", sizeFilter);
      if (statusFilter) params.append("status", statusFilter);

      const query = params.toString() ? `?${params.toString()}` : "";
      const res = await apiRequest(`/api/setup/rooms${query}`);
      setRooms(res.data || []);
    } catch (err) {
      setError(err.message || "Không thể tải danh sách phòng.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRooms();
  }, [typeFilter, sizeFilter, statusFilter]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    fetchRooms();
  };

  // Mở modal thêm phòng
  const handleOpenCreateModal = () => {
    setEditingRoom(null);
    setFormData({
      roomId: "",
      type: "VIP",
      size: "SINGLE",
      price: "",
      maxAdults: 2,
      maxChildren: 1,
      extraChildFee: 0,
      description: "",
      pictures: "",
      status: "AVAILABLE",
    });
    setFormError(null);
    setIsFormModalOpen(true);
  };

  // Mở modal sửa phòng
  const handleOpenEditModal = (room) => {
    setEditingRoom(room);
    setFormData({
      roomId: room.roomId,
      type: room.type,
      size: room.size,
      price: room.price,
      maxAdults: room.maxAdults,
      maxChildren: room.maxChildren,
      extraChildFee: room.extraChildFee,
      description: room.description || "",
      pictures: Array.isArray(room.pictures) ? room.pictures.join(", ") : "",
      status: room.status,
    });
    setFormError(null);
    setIsFormModalOpen(true);
  };

  // Lưu thông tin phòng (Thêm / Sửa)
  const handleSubmitForm = async (e) => {
    e.preventDefault();
    setFormError(null);

    const picList = formData.pictures
      ? formData.pictures
          .split(",")
          .map((p) => p.trim())
          .filter(Boolean)
      : [];

    const payload = {
      type: formData.type,
      size: formData.size,
      price: parseFloat(formData.price),
      maxAdults: parseInt(formData.maxAdults, 10),
      maxChildren: parseInt(formData.maxChildren, 10),
      extraChildFee: parseFloat(formData.extraChildFee || 0),
      description: formData.description,
      pictures: picList,
      status: formData.status,
    };

    try {
      if (editingRoom) {
        await apiRequest(`/api/setup/rooms/${editingRoom.roomId}`, {
          method: "PUT",
          body: JSON.stringify(payload),
        });
        setSuccessMsg(`Cập nhật phòng '${editingRoom.roomId}' thành công.`);
      } else {
        await apiRequest("/api/setup/rooms", {
          method: "POST",
          body: JSON.stringify({
            ...payload,
            roomId: formData.roomId.trim(),
          }),
        });
        setSuccessMsg(`Tạo phòng mới '${formData.roomId.trim()}' thành công.`);
      }
      setIsFormModalOpen(false);
      fetchRooms();
    } catch (err) {
      setFormError(err.message || "Đã xảy ra lỗi khi lưu thông tin phòng.");
    }
  };

  // Mở modal xóa phòng
  const handleOpenDeleteModal = (room) => {
    setRoomToDelete(room);
    setDeleteError(null);
    setIsDeleteModalOpen(true);
  };

  // Xác nhận xóa phòng
  const handleConfirmDelete = async () => {
    if (!roomToDelete) return;
    setDeleteError(null);
    try {
      await apiRequest(`/api/setup/rooms/${roomToDelete.roomId}`, {
        method: "DELETE",
      });
      setSuccessMsg(`Đã xóa phòng '${roomToDelete.roomId}' thành công.`);
      setIsDeleteModalOpen(false);
      setRoomToDelete(null);
      fetchRooms();
    } catch (err) {
      // Bắt lỗi Booking Deletion Guard hoặc lỗi hệ thống
      setDeleteError(err.message || "Không thể xóa phòng này.");
    }
  };

  const formatCurrency = (val) => {
    const num = Number(val);
    if (isNaN(num)) return "0 ₫";
    return num.toLocaleString("vi-VN") + " ₫";
  };

  return (
    <div style={{ maxWidth: "1280px", margin: "2rem auto", padding: "0 1.5rem" }}>
      {/* Header Page */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          marginBottom: "2rem",
          flexWrap: "wrap",
          gap: "1rem",
        }}
      >
        <div>
          <h1
            style={{
              fontSize: "1.875rem",
              fontWeight: 800,
              display: "flex",
              alignItems: "center",
              gap: "0.75rem",
            }}
          >
            <BedDouble size={28} color="#3b82f6" />
            Quản Lý Phòng Vật Lý (Setup Rooms)
          </h1>
          <p style={{ color: "var(--text-muted)", marginTop: "0.25rem", fontSize: "0.875rem" }}>
            Thiết lập danh mục các số phòng vật lý trong khách sạn, bảng giá, sức chứa và kiểm soát an toàn dữ liệu lịch sử đặt phòng.
          </p>
        </div>

        <button className="btn btn-primary" onClick={handleOpenCreateModal}>
          <Plus size={18} />
          <span>Thêm Phòng Mới</span>
        </button>
      </div>

      {/* Thông báo thành công */}
      {successMsg && (
        <div
          style={{
            padding: "0.875rem 1.25rem",
            borderRadius: "8px",
            background: "rgba(16, 185, 129, 0.15)",
            border: "1px solid rgba(16, 185, 129, 0.3)",
            color: "#34d399",
            marginBottom: "1.5rem",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <CheckCircle size={18} />
            <span>{successMsg}</span>
          </div>
          <button
            onClick={() => setSuccessMsg(null)}
            style={{ background: "transparent", border: "none", color: "inherit", cursor: "pointer" }}
          >
            <X size={16} />
          </button>
        </div>
      )}

      {/* Thông báo lỗi */}
      {error && (
        <div
          style={{
            padding: "0.875rem 1.25rem",
            borderRadius: "8px",
            background: "rgba(239, 68, 68, 0.15)",
            border: "1px solid rgba(239, 68, 68, 0.3)",
            color: "#fca5a5",
            marginBottom: "1.5rem",
          }}
        >
          <AlertTriangle size={18} style={{ display: "inline", verticalAlign: "middle", marginRight: "0.5rem" }} />
          <span>{error}</span>
        </div>
      )}

      {/* Filter & Search Bar */}
      <div
        className="glass-card"
        style={{
          padding: "1rem 1.25rem",
          marginBottom: "1.5rem",
          display: "flex",
          gap: "1rem",
          flexWrap: "wrap",
          alignItems: "center",
        }}
      >
        <form onSubmit={handleSearchSubmit} style={{ flex: "1 1 240px", display: "flex", gap: "0.5rem" }}>
          <div style={{ position: "relative", width: "100%" }}>
            <Search
              size={16}
              style={{
                position: "absolute",
                left: "0.75rem",
                top: "50%",
                transform: "translateY(-50%)",
                color: "var(--text-dim)",
              }}
            />
            <input
              type="text"
              className="form-input"
              placeholder="Tìm theo mã phòng hoặc mô tả..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{ paddingLeft: "2.25rem" }}
            />
          </div>
          <button type="submit" className="btn btn-secondary">
            Tìm
          </button>
        </form>

        <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap" }}>
          {/* Lọc loại phòng */}
          <select
            className="form-select"
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            style={{ width: "auto", minWidth: "140px" }}
          >
            <option value="">Tất cả loại phòng</option>
            {ROOM_TYPES.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </select>

          {/* Lọc kích thước */}
          <select
            className="form-select"
            value={sizeFilter}
            onChange={(e) => setSizeFilter(e.target.value)}
            style={{ width: "auto", minWidth: "140px" }}
          >
            <option value="">Tất cả kích thước</option>
            {ROOM_SIZES.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </select>

          {/* Lọc trạng thái */}
          <select
            className="form-select"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            style={{ width: "auto", minWidth: "150px" }}
          >
            <option value="">Tất cả trạng thái</option>
            {ROOM_STATUSES.map((st) => (
              <option key={st.value} value={st.value}>
                {st.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Bảng danh sách phòng */}
      <div className="glass-card" style={{ overflow: "hidden" }}>
        <table className="custom-table">
          <thead>
            <tr>
              <th>Số Phòng</th>
              <th>Hạng Phòng</th>
              <th>Đơn Giá / Đêm</th>
              <th>Sức Chứa & Phụ Thu</th>
              <th>Trạng Thái</th>
              <th>Hình Ảnh</th>
              <th style={{ textAlign: "right" }}>Thao Tác</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={7} style={{ textAlign: "center", padding: "3rem", color: "var(--text-muted)" }}>
                  Đang tải danh sách phòng...
                </td>
              </tr>
            ) : rooms.length === 0 ? (
              <tr>
                <td colSpan={7} style={{ textAlign: "center", padding: "3rem", color: "var(--text-muted)" }}>
                  Không tìm thấy phòng vật lý nào phù hợp.
                </td>
              </tr>
            ) : (
              rooms.map((room) => (
                <tr key={room.roomId}>
                  <td>
                    <span
                      style={{
                        fontSize: "1rem",
                        fontWeight: 700,
                        color: "#93c5fd",
                        background: "rgba(59, 130, 246, 0.15)",
                        padding: "0.25rem 0.65rem",
                        borderRadius: "6px",
                        border: "1px solid rgba(59, 130, 246, 0.3)",
                      }}
                    >
                      {room.roomId}
                    </span>
                  </td>
                  <td>
                    <div style={{ display: "flex", flexDirection: "column", gap: "0.25rem" }}>
                      <span className="room-type-tag">
                        {room.type} • {room.size}
                      </span>
                      {room.description && (
                        <span style={{ fontSize: "0.75rem", color: "var(--text-dim)" }}>
                          {room.description.length > 40
                            ? room.description.substring(0, 40) + "..."
                            : room.description}
                        </span>
                      )}
                    </div>
                  </td>
                  <td>
                    <strong style={{ color: "#34d399", fontSize: "0.9375rem" }}>
                      {formatCurrency(room.price)}
                    </strong>
                  </td>
                  <td>
                    <div style={{ fontSize: "0.8125rem", color: "var(--text-main)" }}>
                      <span>
                        👤 {room.maxAdults} Lớn, 👶 {room.maxChildren} Trẻ
                      </span>
                      {Number(room.extraChildFee) > 0 && (
                        <div style={{ fontSize: "0.75rem", color: "var(--text-dim)", marginTop: "2px" }}>
                          + {formatCurrency(room.extraChildFee)} / trẻ phụ thu
                        </div>
                      )}
                    </div>
                  </td>
                  <td>
                    <span className={`status-tag ${room.status.toLowerCase()}`}>
                      <span
                        style={{
                          width: "6px",
                          height: "6px",
                          borderRadius: "50%",
                          background: "currentColor",
                        }}
                      />
                      {room.status === "AVAILABLE"
                        ? "Sẵn sàng"
                        : room.status === "OCCUPIED"
                        ? "Đang ở"
                        : "Bảo trì"}
                    </span>
                  </td>
                  <td>
                    <div style={{ display: "flex", alignItems: "center", gap: "0.35rem" }}>
                      <ImageIcon size={14} color="var(--text-dim)" />
                      <span style={{ fontSize: "0.8125rem", color: "var(--text-dim)" }}>
                        {room.pictures?.length || 0} ảnh
                      </span>
                    </div>
                  </td>
                  <td style={{ textAlign: "right" }}>
                    <div style={{ display: "inline-flex", gap: "0.5rem" }}>
                      <button
                        className="btn btn-secondary btn-icon"
                        onClick={() => handleOpenEditModal(room)}
                        title="Chỉnh sửa phòng"
                      >
                        <Edit2 size={16} />
                      </button>
                      <button
                        className="btn btn-danger btn-icon"
                        onClick={() => handleOpenDeleteModal(room)}
                        title="Xóa phòng"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Modal Thêm / Chỉnh Sửa Phòng */}
      {isFormModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: "600px" }}>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: "1.25rem",
              }}
            >
              <h3 style={{ fontSize: "1.25rem", fontWeight: 700 }}>
                {editingRoom ? `Chỉnh Sửa Phòng ${editingRoom.roomId}` : "Thêm Phòng Vật Lý Mới"}
              </h3>
              <button
                onClick={() => setIsFormModalOpen(false)}
                style={{ background: "transparent", border: "none", color: "var(--text-dim)", cursor: "pointer" }}
              >
                <X size={20} />
              </button>
            </div>

            {formError && (
              <div
                style={{
                  padding: "0.75rem 1rem",
                  borderRadius: "8px",
                  background: "rgba(239, 68, 68, 0.15)",
                  border: "1px solid rgba(239, 68, 68, 0.3)",
                  color: "#fca5a5",
                  marginBottom: "1rem",
                  fontSize: "0.875rem",
                }}
              >
                {formError}
              </div>
            )}

            <form onSubmit={handleSubmitForm}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
                {/* Mã phòng */}
                <div className="form-group">
                  <label className="form-label">Mã Phòng (Room ID) *</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="VD: 101, 201, 302..."
                    value={formData.roomId}
                    onChange={(e) => setFormData({ ...formData, roomId: e.target.value })}
                    disabled={!!editingRoom}
                    required
                  />
                </div>

                {/* Trạng thái */}
                <div className="form-group">
                  <label className="form-label">Trạng Thái</label>
                  <select
                    className="form-select"
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                  >
                    {ROOM_STATUSES.map((st) => (
                      <option key={st.value} value={st.value}>
                        {st.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
                {/* Loại phòng */}
                <div className="form-group">
                  <label className="form-label">Loại Phòng *</label>
                  <select
                    className="form-select"
                    value={formData.type}
                    onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                  >
                    {ROOM_TYPES.map((t) => (
                      <option key={t.value} value={t.value}>
                        {t.label}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Kích thước */}
                <div className="form-group">
                  <label className="form-label">Kích Thước *</label>
                  <select
                    className="form-select"
                    value={formData.size}
                    onChange={(e) => setFormData({ ...formData, size: e.target.value })}
                  >
                    {ROOM_SIZES.map((s) => (
                      <option key={s.value} value={s.value}>
                        {s.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Đơn giá */}
              <div className="form-group">
                <label className="form-label">Đơn Giá Phòng / Đêm (VND) *</label>
                <input
                  type="number"
                  className="form-input"
                  placeholder="VD: 1200000"
                  value={formData.price}
                  onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                  min="1"
                  required
                />
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "0.75rem" }}>
                <div className="form-group">
                  <label className="form-label">Max Người Lớn</label>
                  <input
                    type="number"
                    className="form-input"
                    value={formData.maxAdults}
                    onChange={(e) => setFormData({ ...formData, maxAdults: e.target.value })}
                    min="1"
                    required
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Max Trẻ Em</label>
                  <input
                    type="number"
                    className="form-input"
                    value={formData.maxChildren}
                    onChange={(e) => setFormData({ ...formData, maxChildren: e.target.value })}
                    min="0"
                    required
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Phụ Thu Trẻ / Đêm</label>
                  <input
                    type="number"
                    className="form-input"
                    value={formData.extraChildFee}
                    onChange={(e) => setFormData({ ...formData, extraChildFee: e.target.value })}
                    min="0"
                  />
                </div>
              </div>

              {/* Mô tả */}
              <div className="form-group">
                <label className="form-label">Mô Tả Phòng</label>
                <textarea
                  className="form-input"
                  rows={2}
                  placeholder="Tiện ích phòng, tầm nhìn, đặc điểm nổi bật..."
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                />
              </div>

              {/* Danh sách URL hình ảnh */}
              <div className="form-group">
                <label className="form-label">Danh Sách URL Hình Ảnh (Phân tách bằng dấu phẩy)</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="https://example.com/pic1.jpg, https://example.com/pic2.jpg"
                  value={formData.pictures}
                  onChange={(e) => setFormData({ ...formData, pictures: e.target.value })}
                />
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.75rem", marginTop: "1.5rem" }}>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setIsFormModalOpen(false)}
                >
                  Hủy Bỏ
                </button>
                <button type="submit" className="btn btn-primary">
                  {editingRoom ? "Lưu Thay Đổi" : "Tạo Phòng Mới"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Xác Nhận Xóa Phòng (Booking Deletion Guard) */}
      {isDeleteModalOpen && roomToDelete && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: "480px" }}>
            <div style={{ textAlign: "center", marginBottom: "1.5rem" }}>
              <div
                style={{
                  width: "56px",
                  height: "56px",
                  borderRadius: "50%",
                  background: "rgba(239, 68, 68, 0.15)",
                  color: "#f87171",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  margin: "0 auto 1rem",
                }}
              >
                <ShieldAlert size={32} />
              </div>
              <h3 style={{ fontSize: "1.25rem", fontWeight: 700, marginBottom: "0.5rem" }}>
                Xác Nhận Xóa Phòng {roomToDelete.roomId}?
              </h3>
              <p style={{ color: "var(--text-muted)", fontSize: "0.875rem", lineHeight: 1.5 }}>
                Bạn có chắc chắn muốn xóa phòng <strong>{roomToDelete.roomId}</strong> khỏi hệ thống? Hành động này không thể hoàn tác.
              </p>
            </div>

            {/* Thông báo lỗi nếu dính Booking Deletion Guard */}
            {deleteError && (
              <div
                style={{
                  padding: "0.875rem",
                  borderRadius: "8px",
                  background: "rgba(239, 68, 68, 0.2)",
                  border: "1px solid rgba(239, 68, 68, 0.4)",
                  color: "#fca5a5",
                  marginBottom: "1.25rem",
                  fontSize: "0.875rem",
                  lineHeight: 1.4,
                }}
              >
                <strong>🛡️ Booking Deletion Guard:</strong> {deleteError}
              </div>
            )}

            <div
              style={{
                padding: "0.75rem 1rem",
                borderRadius: "8px",
                background: "rgba(59, 130, 246, 0.1)",
                border: "1px solid rgba(59, 130, 246, 0.2)",
                color: "#93c5fd",
                fontSize: "0.8125rem",
                marginBottom: "1.5rem",
              }}
            >
              🔒 <strong>Quy tắc hệ thống:</strong> Nếu phòng đã từng được gán cho bất kỳ đơn đặt phòng nào hoặc có phiếu dịch vụ, hệ thống sẽ tự động ngăn chặn xóa để bảo toàn dữ liệu kế toán và hóa đơn.
            </div>

            <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.75rem" }}>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => {
                  setIsDeleteModalOpen(false);
                  setRoomToDelete(null);
                  setDeleteError(null);
                }}
              >
                Đóng
              </button>
              <button
                type="button"
                className="btn btn-danger"
                onClick={handleConfirmDelete}
              >
                Xác Nhận Xóa
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
