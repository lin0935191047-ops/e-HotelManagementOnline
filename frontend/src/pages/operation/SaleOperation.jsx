import React, { useState, useEffect } from "react";
import {
  Calendar,
  Search,
  Users,
  Bed,
  CheckCircle,
  AlertCircle,
  Clock,
  Filter,
  RefreshCw,
  Eye,
  LogOut,
  X,
  CreditCard,
  UserCheck,
  Tag,
  Shield,
  FileText,
  Coffee,
  Printer,
  ChevronRight,
  PlusCircle,
} from "lucide-react";
import { apiRequest } from "../../api/client.js";
import CheckinModal from "./CheckinModal.jsx";
import ServiceUsageModal from "./ServiceUsageModal.jsx";
import ServiceTicketPrintModal from "./ServiceTicketPrintModal.jsx";

// Định dạng tiền tệ VND
const formatCurrency = (amount) => {
  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
  }).format(amount || 0);
};

export default function SaleOperation() {
  // Tab điều hướng chính: 'bookings' hoặc 'services'
  const [activeTab, setActiveTab] = useState("bookings");

  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState(null);
  const [toastMsg, setToastMsg] = useState(null);

  // Bộ lọc cho tab Bookings
  const [keyword, setKeyword] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ total: 0, totalPages: 1, limit: 10 });

  // Modal Check-in
  const [checkinBooking, setCheckinBooking] = useState(null);

  // Modal Chi tiết booking
  const [detailBooking, setDetailBooking] = useState(null);
  const [loadingDetail, setLoadingDetail] = useState(false);

  // State cho Tab Dịch Vụ
  const [serviceModalOpen, setServiceModalOpen] = useState(false);
  const [serviceRoomTarget, setServiceRoomTarget] = useState("");
  const [ticketPrintData, setTicketPrintData] = useState(null);
  const [autoPrintTicket, setAutoPrintTicket] = useState(false);

  const [occupiedRooms, setOccupiedRooms] = useState([]);
  const [loadingOccupied, setLoadingOccupied] = useState(false);

  const [serviceTickets, setServiceTickets] = useState([]);
  const [loadingTickets, setLoadingTickets] = useState(false);
  const [ticketKeyword, setTicketKeyword] = useState("");

  // Tải danh sách bookings
  const fetchBookings = async (targetPage = page) => {
    try {
      setLoading(true);
      setErrorMsg(null);

      const params = new URLSearchParams({
        page: targetPage,
        limit: 10,
      });

      if (keyword.trim()) params.append("keyword", keyword.trim());
      if (statusFilter.trim()) params.append("status", statusFilter.trim());
      if (fromDate) params.append("fromDate", fromDate);
      if (toDate) params.append("toDate", toDate);

      const res = await apiRequest(`/api/operation/bookings?${params.toString()}`);
      if (res.success && res.data) {
        setBookings(res.data.bookings || []);
        setPagination(res.data.pagination || { total: 0, totalPages: 1, limit: 10 });
        setPage(targetPage);
      }
    } catch (err) {
      setErrorMsg(err.message || "Không thể tải danh sách đơn đặt phòng.");
    } finally {
      setLoading(false);
    }
  };

  // Tải danh sách phòng OCCUPIED
  const fetchOccupiedRooms = async () => {
    try {
      setLoadingOccupied(true);
      const res = await apiRequest("/api/operation/services/occupied-rooms");
      if (res.success && Array.isArray(res.data)) {
        setOccupiedRooms(res.data);
      }
    } catch (err) {
      console.error("Error loading occupied rooms:", err);
    } finally {
      setLoadingOccupied(false);
    }
  };

  // Tải danh sách các phiếu dịch vụ đã xuất
  const fetchServiceTickets = async (kw = ticketKeyword) => {
    try {
      setLoadingTickets(true);
      const params = new URLSearchParams({ limit: 50 });
      if (kw && kw.trim()) {
        params.append("keyword", kw.trim());
      }
      const res = await apiRequest(`/api/operation/services/tickets?${params.toString()}`);
      if (res.success && res.data) {
        setServiceTickets(res.data.tickets || []);
      }
    } catch (err) {
      console.error("Error loading tickets:", err);
    } finally {
      setLoadingTickets(false);
    }
  };

  useEffect(() => {
    fetchBookings(1);
  }, []);

  useEffect(() => {
    if (activeTab === "services") {
      fetchOccupiedRooms();
      fetchServiceTickets();
    }
  }, [activeTab]);

  const handleSearch = (e) => {
    e.preventDefault();
    fetchBookings(1);
  };

  const handleResetFilters = () => {
    setKeyword("");
    setStatusFilter("");
    setFromDate("");
    setToDate("");
    fetchBookings(1);
  };

  // Mở modal xem chi tiết booking
  const handleOpenDetail = async (bookingId) => {
    try {
      setLoadingDetail(true);
      const res = await apiRequest(`/api/operation/bookings/${bookingId}`);
      setDetailBooking(res.data);
    } catch (err) {
      setErrorMsg(err.message || "Không thể tải chi tiết đơn.");
    } finally {
      setLoadingDetail(false);
    }
  };

  // Sau khi check-in thành công
  const handleCheckinSuccess = (data) => {
    setCheckinBooking(null);
    setToastMsg(
      `Check-in thành công đơn ${data.booking.bookingNumber}! Đã gán ${data.assignments.length} phòng vật lý.`,
    );
    setTimeout(() => setToastMsg(null), 4000);
    fetchBookings(page);
    if (activeTab === "services") {
      fetchOccupiedRooms();
    }
  };

  // Mở modal lập phiếu dịch vụ
  const handleOpenCreateService = (targetRoomId = "") => {
    setServiceRoomTarget(targetRoomId);
    setServiceModalOpen(true);
  };

  // Khi lập phiếu thành công từ modal
  const handleTicketCreated = (ticketData) => {
    setServiceModalOpen(false);
    setTicketPrintData(ticketData);
    setAutoPrintTicket(true);
    setToastMsg(`Lập phiếu dịch vụ ${ticketData.ticketId} cho phòng ${ticketData.roomId} thành công!`);
    setTimeout(() => setToastMsg(null), 4000);
    fetchServiceTickets();
    fetchOccupiedRooms();
    fetchBookings(page);
  };

  // Xem & In lại một phiếu từ danh sách
  const handleReprintTicket = async (ticketId) => {
    try {
      const res = await apiRequest(`/api/operation/services/tickets/${ticketId}`);
      if (res.success && res.data) {
        setTicketPrintData(res.data);
        setAutoPrintTicket(false);
      }
    } catch (err) {
      alert("Không thể tải chi tiết phiếu dịch vụ: " + err.message);
    }
  };

  // Thống kê nhanh
  const stats = {
    total: pagination.total,
    confirmed: bookings.filter((b) => b.status === "CONFIRMED").length,
    checkedIn: bookings.filter((b) => b.status === "CHECKED_IN").length,
    checkedOut: bookings.filter((b) => b.status === "CHECKED_OUT").length,
    cancelled: bookings.filter((b) => b.status === "CANCELLED").length,
  };

  // Render badge trạng thái
  const renderStatusBadge = (status) => {
    switch (status) {
      case "CONFIRMED":
        return (
          <span
            style={{
              padding: "0.25rem 0.6rem",
              borderRadius: "9999px",
              fontSize: "0.75rem",
              fontWeight: 700,
              background: "rgba(16, 185, 129, 0.15)",
              color: "#10b981",
              border: "1px solid rgba(16, 185, 129, 0.3)",
              display: "inline-flex",
              alignItems: "center",
              gap: "0.3rem",
            }}
          >
            <Clock size={12} /> Chờ Check-in
          </span>
        );
      case "CHECKED_IN":
        return (
          <span
            style={{
              padding: "0.25rem 0.6rem",
              borderRadius: "9999px",
              fontSize: "0.75rem",
              fontWeight: 700,
              background: "rgba(59, 130, 246, 0.15)",
              color: "#3b82f6",
              border: "1px solid rgba(59, 130, 246, 0.3)",
              display: "inline-flex",
              alignItems: "center",
              gap: "0.3rem",
            }}
          >
            <Bed size={12} /> Đang Lưu Trú
          </span>
        );
      case "CHECKED_OUT":
        return (
          <span
            style={{
              padding: "0.25rem 0.6rem",
              borderRadius: "9999px",
              fontSize: "0.75rem",
              fontWeight: 700,
              background: "rgba(107, 114, 128, 0.2)",
              color: "#9ca3af",
              border: "1px solid rgba(107, 114, 128, 0.4)",
              display: "inline-flex",
              alignItems: "center",
              gap: "0.3rem",
            }}
          >
            <CheckCircle size={12} /> Đã Trả Phòng
          </span>
        );
      case "CANCELLED":
        return (
          <span
            style={{
              padding: "0.25rem 0.6rem",
              borderRadius: "9999px",
              fontSize: "0.75rem",
              fontWeight: 700,
              background: "rgba(239, 68, 68, 0.15)",
              color: "#ef4444",
              border: "1px solid rgba(239, 68, 68, 0.3)",
              display: "inline-flex",
              alignItems: "center",
              gap: "0.3rem",
            }}
          >
            <AlertCircle size={12} /> Đã Hủy
          </span>
        );
      default:
        return <span>{status}</span>;
    }
  };

  return (
    <div style={{ maxWidth: "1380px", margin: "0 auto", padding: "1.5rem 1rem" }}>
      {/* Toast thông báo */}
      {toastMsg && (
        <div
          style={{
            position: "fixed",
            bottom: "2rem",
            right: "2rem",
            background: "rgba(16, 185, 129, 0.95)",
            backdropFilter: "blur(12px)",
            color: "white",
            padding: "1rem 1.5rem",
            borderRadius: "12px",
            boxShadow: "0 10px 25px rgba(0,0,0,0.4)",
            display: "flex",
            alignItems: "center",
            gap: "0.75rem",
            zIndex: 10000,
            fontSize: "0.9375rem",
            fontWeight: 600,
            animation: "fadeIn 0.3s ease",
          }}
        >
          <CheckCircle size={20} />
          <span>{toastMsg}</span>
        </div>
      )}

      {/* Header Phân Hệ */}
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          justifyContent: "space-between",
          alignItems: "center",
          gap: "1rem",
          marginBottom: "1.5rem",
        }}
      >
        <div>
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "0.5rem",
              padding: "0.25rem 0.75rem",
              borderRadius: "9999px",
              background: "rgba(16, 185, 129, 0.15)",
              color: "#10b981",
              fontSize: "0.75rem",
              fontWeight: 700,
              marginBottom: "0.5rem",
              textTransform: "uppercase",
              letterSpacing: "0.05em",
            }}
          >
            <UserCheck size={14} /> Phân Hệ Lễ Tân & Bán Hàng (SALE)
          </div>
          <h1 style={{ fontSize: "1.75rem", fontWeight: 800, margin: 0, color: "var(--text-main)" }}>
            Vận Hành Khách Sạn & Quầy Dịch Vụ
          </h1>
          <p style={{ color: "var(--text-muted)", fontSize: "0.875rem", margin: "0.25rem 0 0" }}>
            Quản lý check-in, gán phòng vật lý khóa bi quan, đăng ký dịch vụ phòng & in phiếu HTML.
          </p>
        </div>

        <div style={{ display: "flex", gap: "0.75rem" }}>
          <button
            type="button"
            onClick={() => handleOpenCreateService()}
            className="btn btn-primary"
            style={{
              display: "flex",
              alignItems: "center",
              gap: "0.5rem",
              background: "linear-gradient(135deg, #2563eb, #4f46e5)",
              border: "none",
              color: "#fff",
              fontWeight: 700,
            }}
          >
            <Coffee size={16} />
            <span>+ Lập Phiếu Dịch Vụ</span>
          </button>

          <button
            type="button"
            onClick={() => {
              if (activeTab === "bookings") fetchBookings(page);
              else {
                fetchOccupiedRooms();
                fetchServiceTickets();
              }
            }}
            className="btn btn-secondary"
            style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}
          >
            <RefreshCw size={16} />
            <span>Làm Mới</span>
          </button>
        </div>
      </div>

      {/* Tabs Điều Hướng */}
      <div
        style={{
          display: "flex",
          gap: "0.5rem",
          borderBottom: "1px solid var(--border-color)",
          marginBottom: "1.5rem",
        }}
      >
        <button
          type="button"
          onClick={() => setActiveTab("bookings")}
          style={{
            padding: "0.75rem 1.25rem",
            fontSize: "0.9375rem",
            fontWeight: 700,
            color: activeTab === "bookings" ? "var(--primary-color)" : "var(--text-muted)",
            borderBottom: activeTab === "bookings" ? "2px solid var(--primary-color)" : "2px solid transparent",
            background: "none",
            borderTop: "none",
            borderLeft: "none",
            borderRight: "none",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            gap: "0.5rem",
            transition: "all 0.2s ease",
          }}
        >
          <Bed size={18} />
          <span>1. Đặt Phòng & Check-in ({pagination.total})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("services")}
          style={{
            padding: "0.75rem 1.25rem",
            fontSize: "0.9375rem",
            fontWeight: 700,
            color: activeTab === "services" ? "var(--primary-color)" : "var(--text-muted)",
            borderBottom: activeTab === "services" ? "2px solid var(--primary-color)" : "2px solid transparent",
            background: "none",
            borderTop: "none",
            borderLeft: "none",
            borderRight: "none",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            gap: "0.5rem",
            transition: "all 0.2s ease",
          }}
        >
          <Coffee size={18} />
          <span>2. Dịch Vụ Phòng & Phiếu In ({serviceTickets.length})</span>
        </button>
      </div>

      {/* TAB 1: QUẢN LÝ ĐẶT PHÒNG & CHECK-IN */}
      {activeTab === "bookings" && (
        <>
          {/* Thẻ Thống kê nhanh */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
              gap: "1rem",
              marginBottom: "1.5rem",
            }}
          >
            <div className="glass-card" style={{ padding: "1rem" }}>
              <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", textTransform: "uppercase" }}>
                Tổng Số Đơn
              </div>
              <div style={{ fontSize: "1.5rem", fontWeight: 800, color: "var(--text-main)", marginTop: "0.25rem" }}>
                {stats.total}
              </div>
            </div>
            <div className="glass-card" style={{ padding: "1rem" }}>
              <div style={{ fontSize: "0.75rem", color: "#10b981", textTransform: "uppercase" }}>
                Chờ Check-in
              </div>
              <div style={{ fontSize: "1.5rem", fontWeight: 800, color: "#10b981", marginTop: "0.25rem" }}>
                {stats.confirmed}
              </div>
            </div>
            <div className="glass-card" style={{ padding: "1rem" }}>
              <div style={{ fontSize: "0.75rem", color: "#3b82f6", textTransform: "uppercase" }}>
                Đang Lưu Trú
              </div>
              <div style={{ fontSize: "1.5rem", fontWeight: 800, color: "#3b82f6", marginTop: "0.25rem" }}>
                {stats.checkedIn}
              </div>
            </div>
            <div className="glass-card" style={{ padding: "1rem" }}>
              <div style={{ fontSize: "0.75rem", color: "#9ca3af", textTransform: "uppercase" }}>
                Đã Trả Phòng
              </div>
              <div style={{ fontSize: "1.5rem", fontWeight: 800, color: "#9ca3af", marginTop: "0.25rem" }}>
                {stats.checkedOut}
              </div>
            </div>
          </div>

          {/* Thanh Tìm Kiếm & Bộ Lọc */}
          <form
            onSubmit={handleSearch}
            className="glass-card"
            style={{
              padding: "1rem",
              marginBottom: "1.5rem",
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr)) auto",
              gap: "0.75rem",
              alignItems: "end",
            }}
          >
            <div>
              <label style={{ display: "block", fontSize: "0.75rem", marginBottom: "0.25rem", color: "var(--text-muted)" }}>
                Từ khóa (Mã đơn, Tên, SĐT, CCCD)
              </label>
              <div style={{ position: "relative" }}>
                <input
                  type="text"
                  placeholder="Tìm kiếm..."
                  value={keyword}
                  onChange={(e) => setKeyword(e.target.value)}
                  className="input-field"
                  style={{ width: "100%", paddingLeft: "2rem" }}
                />
                <Search
                  size={14}
                  style={{ position: "absolute", left: "0.75rem", top: "50%", transform: "translateY(-50%)", color: "var(--text-muted)" }}
                />
              </div>
            </div>

            <div>
              <label style={{ display: "block", fontSize: "0.75rem", marginBottom: "0.25rem", color: "var(--text-muted)" }}>
                Trạng thái
              </label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="input-field"
                style={{ width: "100%" }}
              >
                <option value="">Tất cả trạng thái</option>
                <option value="CONFIRMED">Chờ Check-in (CONFIRMED)</option>
                <option value="CHECKED_IN">Đang Lưu Trú (CHECKED_IN)</option>
                <option value="CHECKED_OUT">Đã Trả Phòng (CHECKED_OUT)</option>
                <option value="CANCELLED">Đã Hủy (CANCELLED)</option>
              </select>
            </div>

            <div>
              <label style={{ display: "block", fontSize: "0.75rem", marginBottom: "0.25rem", color: "var(--text-muted)" }}>
                Từ ngày (Nhận phòng)
              </label>
              <input
                type="date"
                value={fromDate}
                onChange={(e) => setFromDate(e.target.value)}
                className="input-field"
                style={{ width: "100%" }}
              />
            </div>

            <div>
              <label style={{ display: "block", fontSize: "0.75rem", marginBottom: "0.25rem", color: "var(--text-muted)" }}>
                Đến ngày
              </label>
              <input
                type="date"
                value={toDate}
                onChange={(e) => setToDate(e.target.value)}
                className="input-field"
                style={{ width: "100%" }}
              />
            </div>

            <div style={{ display: "flex", gap: "0.5rem" }}>
              <button
                type="submit"
                className="btn btn-primary"
                style={{ padding: "0.55rem 1rem", fontSize: "0.8125rem", display: "flex", alignItems: "center", gap: "0.35rem" }}
              >
                <Filter size={14} />
                <span>Lọc</span>
              </button>
              <button
                type="button"
                onClick={handleResetFilters}
                className="btn btn-secondary"
                style={{ padding: "0.55rem 1rem", fontSize: "0.8125rem" }}
              >
                Đặt Lại
              </button>
            </div>
          </form>

          {/* Thông báo lỗi nếu có */}
          {errorMsg && (
            <div
              style={{
                padding: "1rem",
                borderRadius: "0.5rem",
                background: "rgba(239, 68, 68, 0.15)",
                border: "1px solid rgba(239, 68, 68, 0.3)",
                color: "#fca5a5",
                marginBottom: "1.5rem",
                display: "flex",
                alignItems: "center",
                gap: "0.5rem",
              }}
            >
              <AlertCircle size={18} />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Bảng Danh sách Đơn đặt phòng */}
          <div className="glass-card" style={{ padding: "0", overflow: "hidden" }}>
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left", fontSize: "0.875rem" }}>
                <thead>
                  <tr style={{ background: "rgba(255, 255, 255, 0.03)", borderBottom: "1px solid var(--border-color)" }}>
                    <th style={{ padding: "1rem" }}>Mã Đơn</th>
                    <th style={{ padding: "1rem" }}>Khách Hàng</th>
                    <th style={{ padding: "1rem" }}>Hạng Phòng Đặt</th>
                    <th style={{ padding: "1rem" }}>Lưu Trú</th>
                    <th style={{ padding: "1rem" }}>Tiền Phòng & Đã Trả</th>
                    <th style={{ padding: "1rem" }}>Phòng Vật Lý</th>
                    <th style={{ padding: "1rem" }}>Trạng Thái</th>
                    <th style={{ padding: "1rem", textAlign: "right" }}>Thao Tác</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr>
                      <td colSpan="8" style={{ padding: "3rem", textAlign: "center", color: "var(--text-muted)" }}>
                        <div className="animate-spin" style={{ display: "inline-block", marginBottom: "0.5rem" }}>
                          ⌛
                        </div>
                        <div>Đang tải danh sách đặt phòng...</div>
                      </td>
                    </tr>
                  ) : bookings.length === 0 ? (
                    <tr>
                      <td colSpan="8" style={{ padding: "3rem", textAlign: "center", color: "var(--text-muted)" }}>
                        Không tìm thấy đơn đặt phòng nào phù hợp với điều kiện tìm kiếm.
                      </td>
                    </tr>
                  ) : (
                    bookings.map((b) => (
                      <tr
                        key={b.id}
                        style={{
                          borderBottom: "1px solid var(--border-color)",
                          transition: "background 0.2s ease",
                        }}
                        onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(255, 255, 255, 0.02)")}
                        onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                      >
                        <td style={{ padding: "1rem" }}>
                          <strong style={{ color: "#a5b4fc", fontFamily: "monospace" }}>{b.bookingNumber}</strong>
                        </td>
                        <td style={{ padding: "1rem" }}>
                          <div style={{ fontWeight: 600, color: "var(--text-main)" }}>{b.customerName}</div>
                          <div style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>{b.customerPhone}</div>
                        </td>
                        <td style={{ padding: "1rem" }}>
                          {b.items?.map((it) => (
                            <div key={it.id} style={{ fontSize: "0.8125rem" }}>
                              <strong>{it.quantity}x</strong> {it.roomType} ({it.roomSize === "DOUBLE" ? "Đôi" : "Đơn"})
                            </div>
                          ))}
                        </td>
                        <td style={{ padding: "1rem" }}>
                          <div style={{ fontSize: "0.8125rem" }}>
                            {new Date(b.fromDate).toLocaleDateString("vi-VN")} →{" "}
                            {new Date(b.toDate).toLocaleDateString("vi-VN")}
                          </div>
                          <div style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>{b.nights} đêm</div>
                        </td>
                        <td style={{ padding: "1rem" }}>
                          <div>{formatCurrency(b.netRoomFee)}</div>
                          <div style={{ fontSize: "0.75rem", color: "#10b981" }}>
                            Đã trả: {formatCurrency(b.prepaidBookingValue)}
                          </div>
                        </td>
                        <td style={{ padding: "1rem" }}>
                          {b.assignments && b.assignments.length > 0 ? (
                            <div style={{ display: "flex", flexWrap: "wrap", gap: "0.3rem" }}>
                              {b.assignments.map((a) => (
                                <span
                                  key={a.id}
                                  style={{
                                    padding: "0.15rem 0.45rem",
                                    borderRadius: "4px",
                                    background: "rgba(59, 130, 246, 0.2)",
                                    color: "#60a5fa",
                                    fontSize: "0.75rem",
                                    fontWeight: 700,
                                  }}
                                >
                                  {a.roomId}
                                </span>
                              ))}
                            </div>
                          ) : (
                            <span style={{ color: "var(--text-muted)", fontSize: "0.75rem", fontStyle: "italic" }}>
                              Chưa gán
                            </span>
                          )}
                        </td>
                        <td style={{ padding: "1rem" }}>{renderStatusBadge(b.status)}</td>
                        <td style={{ padding: "1rem", textAlign: "right" }}>
                          <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.5rem" }}>
                            {/* Nút Check-in nếu CONFIRMED */}
                            {b.status === "CONFIRMED" && (
                              <button
                                type="button"
                                onClick={() => setCheckinBooking(b)}
                                className="btn btn-primary"
                                style={{
                                  padding: "0.35rem 0.75rem",
                                  fontSize: "0.75rem",
                                  fontWeight: 700,
                                  background: "#10b981",
                                  border: "none",
                                  color: "white",
                                  display: "flex",
                                  alignItems: "center",
                                  gap: "0.3rem",
                                }}
                              >
                                <Bed size={13} /> Check-in
                              </button>
                            )}

                            {/* Nút Thêm Dịch Vụ nếu CHECKED_IN */}
                            {b.status === "CHECKED_IN" && b.assignments && b.assignments.length > 0 && (
                              <button
                                type="button"
                                onClick={() => handleOpenCreateService(b.assignments[0]?.roomId)}
                                className="btn btn-secondary"
                                style={{
                                  padding: "0.35rem 0.65rem",
                                  fontSize: "0.75rem",
                                  color: "#38bdf8",
                                  borderColor: "rgba(56, 189, 248, 0.4)",
                                  display: "flex",
                                  alignItems: "center",
                                  gap: "0.3rem",
                                }}
                                title="Đăng ký dịch vụ cho phòng này"
                              >
                                <Coffee size={13} /> +Dịch vụ
                              </button>
                            )}

                            {/* Nút Xem chi tiết */}
                            <button
                              type="button"
                              onClick={() => handleOpenDetail(b.id)}
                              className="btn btn-secondary"
                              style={{ padding: "0.35rem 0.65rem", fontSize: "0.75rem" }}
                              title="Xem chi tiết đơn"
                            >
                              <Eye size={13} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Phân trang */}
            {pagination.totalPages > 1 && (
              <div
                style={{
                  padding: "1rem",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  borderTop: "1px solid var(--border-color)",
                }}
              >
                <span style={{ fontSize: "0.8125rem", color: "var(--text-muted)" }}>
                  Trang {pagination.page} / {pagination.totalPages} (Tổng {pagination.total} đơn)
                </span>
                <div style={{ display: "flex", gap: "0.5rem" }}>
                  <button
                    type="button"
                    disabled={page <= 1}
                    onClick={() => fetchBookings(page - 1)}
                    className="btn btn-secondary"
                    style={{ padding: "0.35rem 0.75rem", fontSize: "0.8125rem" }}
                  >
                    Trước
                  </button>
                  <button
                    type="button"
                    disabled={page >= pagination.totalPages}
                    onClick={() => fetchBookings(page + 1)}
                    className="btn btn-secondary"
                    style={{ padding: "0.35rem 0.75rem", fontSize: "0.8125rem" }}
                  >
                    Sau
                  </button>
                </div>
              </div>
            )}
          </div>
        </>
      )}

      {/* TAB 2: DỊCH VỤ PHÒNG & IN PHIẾU */}
      {activeTab === "services" && (
        <div className="space-y-6">
          {/* Danh sách phòng đang lưu trú (OCCUPIED) */}
          <div className="glass-card" style={{ padding: "1.25rem" }}>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: "1rem",
              }}
            >
              <div>
                <h3 style={{ fontSize: "1.125rem", fontWeight: 700, margin: 0, color: "var(--text-main)" }}>
                  Phòng Đang Có Khách Lưu Trú (OCCUPIED)
                </h3>
                <p style={{ fontSize: "0.8125rem", color: "var(--text-muted)", margin: "0.25rem 0 0" }}>
                  Chỉ các phòng có khách đang ở mới đủ điều kiện đăng ký dịch vụ theo quy tắc SPEC.
                </p>
              </div>
              <button
                type="button"
                onClick={() => handleOpenCreateService()}
                className="btn btn-primary"
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "0.4rem",
                  fontSize: "0.8125rem",
                  padding: "0.45rem 1rem",
                }}
              >
                <PlusCircle size={15} />
                <span>Lập Phiếu Dịch Vụ Mới</span>
              </button>
            </div>

            {loadingOccupied ? (
              <div style={{ padding: "2rem", textAlign: "center", color: "var(--text-muted)" }}>
                Đang tải danh sách phòng đang lưu trú...
              </div>
            ) : occupiedRooms.length === 0 ? (
              <div
                style={{
                  padding: "2rem",
                  textAlign: "center",
                  color: "var(--text-muted)",
                  background: "rgba(255, 255, 255, 0.02)",
                  borderRadius: "8px",
                }}
              >
                Hiện chưa có phòng nào đang lưu trú (OCCUPIED). Vui lòng check-in phòng trước khi đăng ký dịch vụ.
              </div>
            ) : (
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
                  gap: "1rem",
                }}
              >
                {occupiedRooms.map((r) => (
                  <div
                    key={r.roomId}
                    style={{
                      padding: "1rem",
                      borderRadius: "10px",
                      background: "rgba(255, 255, 255, 0.03)",
                      border: "1px solid var(--border-color)",
                      display: "flex",
                      flexDirection: "column",
                      justifyContent: "space-between",
                    }}
                  >
                    <div>
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          marginBottom: "0.5rem",
                        }}
                      >
                        <span
                          style={{
                            fontSize: "1.25rem",
                            fontWeight: 800,
                            color: "#60a5fa",
                            fontFamily: "monospace",
                          }}
                        >
                          Phòng {r.roomId}
                        </span>
                        <span
                          style={{
                            padding: "0.15rem 0.5rem",
                            borderRadius: "9999px",
                            fontSize: "0.7rem",
                            fontWeight: 700,
                            background: "rgba(59, 130, 246, 0.2)",
                            color: "#60a5fa",
                          }}
                        >
                          {r.type} {r.size}
                        </span>
                      </div>
                      <div style={{ fontSize: "0.875rem", fontWeight: 600, color: "var(--text-main)" }}>
                        {r.customerName || "Khách chưa cập nhật"}
                      </div>
                      <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginTop: "0.2rem" }}>
                        Mã đơn: <span style={{ fontFamily: "monospace" }}>{r.bookingNumber}</span>
                      </div>
                      {r.stayingGuests && r.stayingGuests.length > 0 && (
                        <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginTop: "0.4rem" }}>
                          Khách ở ({r.stayingGuests.length}):{" "}
                          {r.stayingGuests.map((g) => g.fullName).join(", ")}
                        </div>
                      )}
                    </div>

                    <button
                      type="button"
                      onClick={() => handleOpenCreateService(r.roomId)}
                      className="btn btn-secondary"
                      style={{
                        marginTop: "1rem",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        gap: "0.4rem",
                        fontSize: "0.8125rem",
                        padding: "0.45rem",
                        color: "#38bdf8",
                        borderColor: "rgba(56, 189, 248, 0.3)",
                      }}
                    >
                      <Coffee size={14} />
                      <span>+ Thêm Dịch Vụ Cho Phòng {r.roomId}</span>
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Lịch sử Phiếu Dịch Vụ Đã Xuất */}
          <div className="glass-card" style={{ padding: "0", overflow: "hidden" }}>
            <div
              style={{
                padding: "1.25rem",
                borderBottom: "1px solid var(--border-color)",
                display: "flex",
                flexWrap: "wrap",
                justifyContent: "space-between",
                alignItems: "center",
                gap: "1rem",
              }}
            >
              <div>
                <h3 style={{ fontSize: "1.125rem", fontWeight: 700, margin: 0, color: "var(--text-main)" }}>
                  Lịch Sử Phiếu Dịch Vụ Đã Lập
                </h3>
                <p style={{ fontSize: "0.8125rem", color: "var(--text-muted)", margin: "0.25rem 0 0" }}>
                  Tra cứu, xem lại và in lại phiếu dịch vụ chuẩn khổ in A5/A4 theo yêu cầu khách hàng.
                </p>
              </div>

              <div style={{ display: "flex", gap: "0.5rem" }}>
                <input
                  type="text"
                  placeholder="Tìm mã phiếu, phòng, dịch vụ..."
                  value={ticketKeyword}
                  onChange={(e) => {
                    setTicketKeyword(e.target.value);
                    fetchServiceTickets(e.target.value);
                  }}
                  className="input-field"
                  style={{ width: "260px", fontSize: "0.8125rem" }}
                />
                <button
                  type="button"
                  onClick={() => fetchServiceTickets(ticketKeyword)}
                  className="btn btn-secondary"
                  style={{ padding: "0.45rem 0.75rem" }}
                >
                  <RefreshCw size={14} />
                </button>
              </div>
            </div>

            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left", fontSize: "0.875rem" }}>
                <thead>
                  <tr style={{ background: "rgba(255, 255, 255, 0.03)", borderBottom: "1px solid var(--border-color)" }}>
                    <th style={{ padding: "1rem" }}>Mã Phiếu</th>
                    <th style={{ padding: "1rem" }}>Thời Gian Lập</th>
                    <th style={{ padding: "1rem" }}>Phòng & Khách</th>
                    <th style={{ padding: "1rem" }}>Dịch Vụ Sử Dụng</th>
                    <th style={{ padding: "1rem", textAlign: "center" }}>SL</th>
                    <th style={{ padding: "1rem", textAlign: "right" }}>Đơn Giá</th>
                    <th style={{ padding: "1rem", textAlign: "right" }}>Thành Tiền</th>
                    <th style={{ padding: "1rem", textAlign: "right" }}>Thao Tác</th>
                  </tr>
                </thead>
                <tbody>
                  {loadingTickets ? (
                    <tr>
                      <td colSpan="8" style={{ padding: "3rem", textAlign: "center", color: "var(--text-muted)" }}>
                        Đang tải danh sách phiếu dịch vụ...
                      </td>
                    </tr>
                  ) : serviceTickets.length === 0 ? (
                    <tr>
                      <td colSpan="8" style={{ padding: "3rem", textAlign: "center", color: "var(--text-muted)" }}>
                        Chưa phát sinh phiếu dịch vụ nào. Bấm nút "+ Lập Phiếu Dịch Vụ Mới" để bắt đầu.
                      </td>
                    </tr>
                  ) : (
                    serviceTickets.map((t) => (
                      <tr
                        key={t.ticketId}
                        style={{
                          borderBottom: "1px solid var(--border-color)",
                          transition: "background 0.2s ease",
                        }}
                        onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(255, 255, 255, 0.02)")}
                        onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                      >
                        <td style={{ padding: "1rem" }}>
                          <span style={{ fontWeight: 700, fontFamily: "monospace", color: "#a5b4fc" }}>
                            {t.ticketId}
                          </span>
                        </td>
                        <td style={{ padding: "1rem", fontSize: "0.8125rem", color: "var(--text-muted)" }}>
                          {new Date(t.createdAt).toLocaleString("vi-VN")}
                        </td>
                        <td style={{ padding: "1rem" }}>
                          <div style={{ fontWeight: 700, color: "#60a5fa" }}>Phòng {t.roomId}</div>
                          <div style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>
                            {t.customerName} ({t.bookingNumber})
                          </div>
                        </td>
                        <td style={{ padding: "1rem" }}>
                          <div style={{ fontWeight: 600, color: "var(--text-main)" }}>{t.serviceName}</div>
                          <div style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>Mã: {t.serviceId}</div>
                        </td>
                        <td style={{ padding: "1rem", textAlign: "center", fontWeight: 700 }}>
                          {t.quantity} {t.unit}
                        </td>
                        <td style={{ padding: "1rem", textAlign: "right" }}>
                          {formatCurrency(t.unitPrice)}
                        </td>
                        <td style={{ padding: "1rem", textAlign: "right", fontWeight: 800, color: "#38bdf8" }}>
                          {formatCurrency(t.totalPrice)}
                        </td>
                        <td style={{ padding: "1rem", textAlign: "right" }}>
                          <button
                            type="button"
                            onClick={() => handleReprintTicket(t.ticketId)}
                            className="btn btn-secondary"
                            style={{
                              padding: "0.35rem 0.75rem",
                              fontSize: "0.75rem",
                              display: "inline-flex",
                              alignItems: "center",
                              gap: "0.3rem",
                              color: "#60a5fa",
                              borderColor: "rgba(96, 165, 250, 0.4)",
                            }}
                          >
                            <Printer size={13} />
                            <span>In Phiếu</span>
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Modal Check-in (FEAT-09) */}
      {checkinBooking && (
        <CheckinModal
          booking={checkinBooking}
          onClose={() => setCheckinBooking(null)}
          onSuccess={handleCheckinSuccess}
        />
      )}

      {/* Modal Đăng Ký Dịch Vụ (FEAT-10) */}
      {serviceModalOpen && (
        <ServiceUsageModal
          initialRoomId={serviceRoomTarget}
          onClose={() => setServiceModalOpen(false)}
          onTicketCreated={handleTicketCreated}
        />
      )}

      {/* Modal In Phiếu Dịch Vụ Chuẩn HTML @media print (FEAT-10) */}
      {ticketPrintData && (
        <ServiceTicketPrintModal
          ticket={ticketPrintData}
          autoPrint={autoPrintTicket}
          onClose={() => setTicketPrintData(null)}
        />
      )}

      {/* Modal Chi tiết Đơn đặt phòng */}
      {detailBooking && (
        <div className="modal-backdrop">
          <div className="modal-content glass-card" style={{ maxWidth: "700px", maxHeight: "90vh", overflowY: "auto" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
              <h2 style={{ fontSize: "1.25rem", fontWeight: 800, margin: 0, color: "var(--text-main)" }}>
                Chi Tiết Đơn #{detailBooking.bookingNumber}
              </h2>
              <button
                type="button"
                onClick={() => setDetailBooking(null)}
                style={{ background: "none", border: "none", color: "var(--text-muted)", cursor: "pointer" }}
              >
                <X size={20} />
              </button>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "1rem", fontSize: "0.875rem" }}>
              {/* Thông tin khách hàng */}
              <div
                style={{
                  padding: "1rem",
                  background: "rgba(255, 255, 255, 0.02)",
                  borderRadius: "0.5rem",
                  border: "1px solid var(--border-color)",
                }}
              >
                <div style={{ fontWeight: 700, color: "#a5b4fc", marginBottom: "0.5rem" }}>
                  1. Thông Tin Khách Hàng
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.5rem" }}>
                  <div>Họ tên: <strong>{detailBooking.customerName}</strong></div>
                  <div>SĐT: <strong>{detailBooking.customerPhone}</strong></div>
                  <div>Email: <strong>{detailBooking.customerEmail}</strong></div>
                  <div>CCCD: <strong>{detailBooking.customerCccd}</strong></div>
                  <div>Ngày nhận: {new Date(detailBooking.fromDate).toLocaleDateString("vi-VN")}</div>
                  <div>Ngày trả: {new Date(detailBooking.toDate).toLocaleDateString("vi-VN")} ({detailBooking.nights} đêm)</div>
                </div>
              </div>

              {/* Hạng phòng đặt */}
              <div
                style={{
                  padding: "1rem",
                  background: "rgba(255, 255, 255, 0.02)",
                  borderRadius: "0.5rem",
                  border: "1px solid var(--border-color)",
                }}
              >
                <div style={{ fontWeight: 700, color: "#a5b4fc", marginBottom: "0.5rem" }}>
                  2. Hạng Phòng Đặt
                </div>
                {detailBooking.items?.map((it) => (
                  <div key={it.id} style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.25rem" }}>
                    <span>
                      {it.quantity}x {it.roomType} ({it.roomSize === "DOUBLE" ? "Phòng Đôi" : "Phòng Đơn"})
                    </span>
                    <span>{formatCurrency(Number(it.unitPrice) * it.quantity * detailBooking.nights)}</span>
                  </div>
                ))}
              </div>

              {/* Phòng vật lý đã gán */}
              {detailBooking.assignments && detailBooking.assignments.length > 0 && (
                <div
                  style={{
                    padding: "1rem",
                    background: "rgba(59, 130, 246, 0.05)",
                    borderRadius: "0.5rem",
                    border: "1px solid rgba(59, 130, 246, 0.2)",
                  }}
                >
                  <div style={{ fontWeight: 700, color: "#60a5fa", marginBottom: "0.5rem" }}>
                    3. Phòng Vật Lý & Khách Lưu Trú
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
                    {detailBooking.assignments.map((as) => (
                      <div
                        key={as.id}
                        style={{
                          padding: "0.75rem",
                          background: "rgba(0, 0, 0, 0.2)",
                          borderRadius: "0.375rem",
                        }}
                      >
                        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.35rem" }}>
                          <strong style={{ color: "#a5b4fc" }}>
                            Phòng {as.roomId} ({as.room?.type} {as.room?.size})
                          </strong>
                          <span style={{ color: "var(--text-muted)" }}>
                            Check-in: {new Date(as.checkInAt).toLocaleString("vi-VN")}
                          </span>
                        </div>
                        <div style={{ color: "var(--text-muted)", marginBottom: "0.25rem" }}>Khách lưu trú:</div>
                        <div style={{ paddingLeft: "0.75rem" }}>
                          {as.guests.map((g) => (
                            <div key={g.id}>
                              • {g.fullName} - CCCD: {g.idNumber} - Năm sinh: {g.birthYear} (
                              {g.guestType === "CHILD" ? "Trẻ em" : "Người lớn"})
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Quyết toán tài chính */}
              <div
                style={{
                  padding: "1rem",
                  background: "rgba(255, 255, 255, 0.02)",
                  borderRadius: "0.5rem",
                  border: "1px solid var(--border-color)",
                }}
              >
                <div style={{ fontWeight: 700, color: "#a5b4fc", marginBottom: "0.5rem" }}>
                  4. Quyết Toán Tài Chính
                </div>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span>Tiền phòng thực tế:</span>
                  <span>{formatCurrency(detailBooking.netRoomFee)}</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span>Phụ thu trẻ em:</span>
                  <span style={{ color: detailBooking.extraChildrenFee > 0 ? "#fbbf24" : "var(--text-main)" }}>
                    +{formatCurrency(detailBooking.extraChildrenFee)}
                  </span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span>Tiền dịch vụ phát sinh:</span>
                  <span>+{formatCurrency(detailBooking.totalServiceFee)}</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", color: "#10b981" }}>
                  <span>Số tiền đã thanh toán trước:</span>
                  <span>-{formatCurrency(detailBooking.prepaidBookingValue)}</span>
                </div>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    paddingTop: "0.5rem",
                    borderTop: "1px solid var(--border-color)",
                    fontWeight: 800,
                  }}
                >
                  <span>Còn lại thanh toán:</span>
                  <span style={{ color: "#fbbf24" }}>{formatCurrency(detailBooking.remainingPayable)}</span>
                </div>
              </div>
            </div>

            <div style={{ display: "flex", justifyContent: "flex-end", marginTop: "1.5rem" }}>
              <button type="button" onClick={() => setDetailBooking(null)} className="btn btn-secondary">
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
