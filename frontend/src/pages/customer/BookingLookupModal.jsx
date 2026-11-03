import React, { useState, useEffect } from "react";
import {
  X,
  Search,
  Calendar,
  Clock,
  User,
  CreditCard,
  AlertTriangle,
  CheckCircle,
  HelpCircle,
  ArrowRight,
  ShieldAlert,
  DollarSign,
  Tag,
  Bed,
  FileText,
  RefreshCw,
  Phone,
  Mail,
  Copy,
  Check,
} from "lucide-react";
import { apiRequest } from "../../api/client.js";

export default function BookingLookupModal({ isOpen, onClose, initialBookingNumber = "" }) {
  const [bookingNumber, setBookingNumber] = useState(initialBookingNumber);
  const [loading, setLoading] = useState(false);
  const [bookingData, setBookingData] = useState(null);
  const [errorMsg, setErrorMsg] = useState(null);
  const [copied, setCopied] = useState(false);

  // Trạng thái modal xác nhận hủy phòng
  const [showConfirmCancel, setShowConfirmCancel] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [cancelSuccessMsg, setCancelSuccessMsg] = useState(null);

  // Tự động tìm kiếm nếu có initialBookingNumber
  useEffect(() => {
    if (initialBookingNumber) {
      setBookingNumber(initialBookingNumber);
      handleLookup(initialBookingNumber);
    }
  }, [initialBookingNumber]);

  if (!isOpen) return null;

  const handleLookup = async (codeToSearch) => {
    const code = (codeToSearch || bookingNumber || "").trim().toUpperCase();
    if (!code) {
      setErrorMsg("Vui lòng nhập mã đơn đặt phòng để tra cứu.");
      return;
    }

    setLoading(true);
    setErrorMsg(null);
    setCancelSuccessMsg(null);

    try {
      const res = await apiRequest(`/api/public/bookings/${code}`);
      setBookingData(res.data);
    } catch (err) {
      setBookingData(null);
      setErrorMsg(err.message || "Không tìm thấy thông tin đơn đặt phòng với mã đã nhập.");
    } finally {
      setLoading(false);
    }
  };

  const handleCancelBooking = async () => {
    if (!bookingData?.booking?.bookingNumber) return;

    setCancelling(true);
    setErrorMsg(null);

    try {
      const res = await apiRequest(
        `/api/public/bookings/${bookingData.booking.bookingNumber}/cancel`,
        { method: "POST" }
      );

      // Cập nhật lại bookingData với trạng thái đã hủy
      setCancelSuccessMsg(
        `Hủy phòng thành công! Số tiền hoàn ${res.data.refund.refundAmount.toLocaleString(
          "vi-VN"
        )}đ (80%) đã được cộng lại vào tài khoản thẻ ${res.data.refund.accountNumber}.`
      );

      // Tự động load lại đơn mới nhất từ server
      await handleLookup(bookingData.booking.bookingNumber);
      setShowConfirmCancel(false);
    } catch (err) {
      setErrorMsg(err.message || "Không thể thực hiện hủy phòng. Vui lòng thử lại.");
    } finally {
      setCancelling(false);
    }
  };

  const handleCopyCode = (text) => {
    navigator.clipboard?.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const booking = bookingData?.booking;
  const policy = bookingData?.cancellationPolicy;

  // Render tag trạng thái
  const renderStatusBadge = (status) => {
    switch (status) {
      case "CONFIRMED":
        return (
          <span
            style={{
              padding: "0.25rem 0.75rem",
              borderRadius: "9999px",
              fontSize: "0.75rem",
              fontWeight: 700,
              background: "rgba(16, 185, 129, 0.15)",
              color: "#10b981",
              border: "1px solid rgba(16, 185, 129, 0.3)",
              display: "inline-flex",
              alignItems: "center",
              gap: "0.375rem",
            }}
          >
            <CheckCircle size={13} />
            Đã Xác Nhận (CONFIRMED)
          </span>
        );
      case "CHECKED_IN":
        return (
          <span
            style={{
              padding: "0.25rem 0.75rem",
              borderRadius: "9999px",
              fontSize: "0.75rem",
              fontWeight: 700,
              background: "rgba(59, 130, 246, 0.15)",
              color: "#3b82f6",
              border: "1px solid rgba(59, 130, 246, 0.3)",
              display: "inline-flex",
              alignItems: "center",
              gap: "0.375rem",
            }}
          >
            <Bed size={13} />
            Đang Lưu Trú (CHECKED_IN)
          </span>
        );
      case "CHECKED_OUT":
        return (
          <span
            style={{
              padding: "0.25rem 0.75rem",
              borderRadius: "9999px",
              fontSize: "0.75rem",
              fontWeight: 700,
              background: "rgba(107, 114, 128, 0.2)",
              color: "#9ca3af",
              border: "1px solid rgba(107, 114, 128, 0.4)",
              display: "inline-flex",
              alignItems: "center",
              gap: "0.375rem",
            }}
          >
            <Check size={13} />
            Đã Trả Phòng (CHECKED_OUT)
          </span>
        );
      case "CANCELLED":
        return (
          <span
            style={{
              padding: "0.25rem 0.75rem",
              borderRadius: "9999px",
              fontSize: "0.75rem",
              fontWeight: 700,
              background: "rgba(239, 68, 68, 0.15)",
              color: "#ef4444",
              border: "1px solid rgba(239, 68, 68, 0.3)",
              display: "inline-flex",
              alignItems: "center",
              gap: "0.375rem",
            }}
          >
            <AlertTriangle size={13} />
            Đã Hủy Đơn (CANCELLED)
          </span>
        );
      default:
        return <span>{status}</span>;
    }
  };

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        backgroundColor: "rgba(15, 23, 42, 0.5)",
        backdropFilter: "blur(8px)",
        zIndex: 9999,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "1rem",
        animation: "fadeIn 0.2s ease",
      }}
    >
      <div
        className="glass-card"
        style={{
          width: "100%",
          maxWidth: "850px",
          maxHeight: "90vh",
          display: "flex",
          flexDirection: "column",
          borderRadius: "1rem",
          border: "1px solid var(--border-color)",
          background: "var(--bg-secondary)",
          boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.15)",
          overflow: "hidden",
        }}
      >
        {/* Modal Header */}
        <div
          style={{
            padding: "1.25rem 1.75rem",
            borderBottom: "1px solid var(--border-color)",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            background: "var(--bg-secondary)",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
            <div
              style={{
                width: "40px",
                height: "40px",
                borderRadius: "0.625rem",
                background: "linear-gradient(135deg, rgba(99, 102, 241, 0.2), rgba(139, 92, 246, 0.2))",
                border: "1px solid rgba(99, 102, 241, 0.3)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "var(--primary)",
              }}
            >
              <Search size={20} />
            </div>
            <div>
              <h2 style={{ fontSize: "1.125rem", fontWeight: 700, margin: 0, color: "var(--text-main)" }}>
                Tra Cứu & Quản Lý Đơn Đặt Phòng
              </h2>
              <p style={{ fontSize: "0.75rem", color: "var(--text-muted)", margin: "0.125rem 0 0" }}>
                Kiểm tra thông tin chi tiết hoặc hủy phòng hoàn 80% (Luật 24 giờ trước nhận phòng)
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="btn btn-secondary"
            style={{ padding: "0.5rem", borderRadius: "50%", minWidth: "auto" }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Modal Body */}
        <div
          style={{
            padding: "1.5rem 1.75rem",
            overflowY: "auto",
            display: "flex",
            flexDirection: "column",
            gap: "1.25rem",
          }}
        >
          {/* Thanh tìm kiếm mã đơn */}
          <div
            style={{
              padding: "1rem",
              borderRadius: "0.75rem",
              background: "var(--bg-tertiary)",
              border: "1px solid var(--border-color)",
              display: "flex",
              flexDirection: "column",
              gap: "0.75rem",
            }}
          >
            <label style={{ fontSize: "0.8125rem", fontWeight: 600, color: "var(--text-main)" }}>
              Nhập mã đặt phòng của bạn (Ví dụ: BK-20261027-1234)
            </label>
            <div style={{ display: "flex", gap: "0.5rem" }}>
              <div style={{ position: "relative", flex: 1 }}>
                <Search
                  size={16}
                  style={{
                    position: "absolute",
                    left: "1rem",
                    top: "50%",
                    transform: "translateY(-50%)",
                    color: "var(--text-dim)",
                  }}
                />
                <input
                  type="text"
                  value={bookingNumber}
                  onChange={(e) => setBookingNumber(e.target.value.toUpperCase())}
                  onKeyDown={(e) => e.key === "Enter" && handleLookup()}
                  placeholder="BK-YYYYMMDD-XXXX"
                  style={{
                    width: "100%",
                    padding: "0.625rem 1rem 0.625rem 2.5rem",
                    borderRadius: "0.5rem",
                    background: "var(--bg-card)",
                    border: "1px solid var(--border-color)",
                    color: "var(--text-main)",
                    fontSize: "0.875rem",
                    fontWeight: 600,
                    letterSpacing: "0.05em",
                    textTransform: "uppercase",
                  }}
                />
              </div>
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => handleLookup()}
                disabled={loading}
                style={{
                  padding: "0.625rem 1.25rem",
                  fontSize: "0.875rem",
                  fontWeight: 600,
                  display: "flex",
                  alignItems: "center",
                  gap: "0.5rem",
                }}
              >
                {loading ? (
                  <>
                    <RefreshCw size={16} className="animate-spin" />
                    <span>Đang Tra Cứu...</span>
                  </>
                ) : (
                  <>
                    <Search size={16} />
                    <span>Tra Cứu</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Thông báo lỗi nếu có */}
          {errorMsg && (
            <div
              style={{
                padding: "0.875rem 1rem",
                borderRadius: "0.5rem",
                background: "rgba(239, 68, 68, 0.12)",
                border: "1px solid rgba(239, 68, 68, 0.3)",
                color: "#fca5a5",
                fontSize: "0.8125rem",
                display: "flex",
                alignItems: "center",
                gap: "0.625rem",
              }}
            >
              <AlertTriangle size={18} color="#ef4444" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Thông báo hủy phòng thành công nếu có */}
          {cancelSuccessMsg && (
            <div
              style={{
                padding: "1rem",
                borderRadius: "0.5rem",
                background: "rgba(16, 185, 129, 0.15)",
                border: "1px solid rgba(16, 185, 129, 0.4)",
                color: "#6ee7b7",
                fontSize: "0.875rem",
                display: "flex",
                alignItems: "flex-start",
                gap: "0.75rem",
              }}
            >
              <CheckCircle size={20} color="#10b981" style={{ flexShrink: 0, marginTop: "2px" }} />
              <div>
                <div style={{ fontWeight: 700, marginBottom: "0.25rem" }}>Hủy Đặt Phòng Thành Công!</div>
                <div>{cancelSuccessMsg}</div>
              </div>
            </div>
          )}

          {/* Nội dung chi tiết đơn đặt phòng */}
          {booking && (
            <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
              {/* Thẻ Header Đơn: Mã đơn, Trạng thái, Ngày tạo */}
              <div
                style={{
                  padding: "1.25rem",
                  borderRadius: "0.75rem",
                  background: "rgba(31, 41, 55, 0.4)",
                  border: "1px solid var(--border-color)",
                  display: "flex",
                  flexWrap: "wrap",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: "1rem",
                }}
              >
                <div>
                  <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", textTransform: "uppercase" }}>
                    Mã Đơn Đặt Phòng
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginTop: "0.25rem" }}>
                    <span
                      style={{
                        fontSize: "1.25rem",
                        fontWeight: 800,
                        color: "#a5b4fc",
                        letterSpacing: "0.05em",
                      }}
                    >
                      {booking.bookingNumber}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleCopyCode(booking.bookingNumber)}
                      title="Sao chép mã"
                      style={{
                        background: "none",
                        border: "none",
                        color: "var(--text-muted)",
                        cursor: "pointer",
                        padding: "4px",
                      }}
                    >
                      {copied ? <Check size={16} color="#10b981" /> : <Copy size={16} />}
                    </button>
                  </div>
                </div>

                <div style={{ textAlign: "right" }}>
                  <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginBottom: "0.25rem" }}>
                    Trạng Thái Đơn
                  </div>
                  {renderStatusBadge(booking.status)}
                </div>
              </div>

              {/* Thông tin Lịch trình & Khách hàng */}
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
                  gap: "1rem",
                }}
              >
                {/* Lịch trình lưu trú */}
                <div
                  style={{
                    padding: "1rem",
                    borderRadius: "0.75rem",
                    background: "var(--bg-tertiary)",
                    border: "1px solid var(--border-color)",
                  }}
                >
                  <div
                    style={{
                      fontSize: "0.8125rem",
                      fontWeight: 600,
                      color: "var(--primary)",
                      display: "flex",
                      alignItems: "center",
                      gap: "0.5rem",
                      marginBottom: "0.75rem",
                    }}
                  >
                    <Calendar size={16} />
                    <span>Lịch Trình Lưu Trú ({booking.nights} đêm)</span>
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem", fontSize: "0.8125rem" }}>
                    <div style={{ display: "flex", justifyContent: "space-between" }}>
                      <span style={{ color: "var(--text-muted)" }}>Nhận phòng:</span>
                      <strong style={{ color: "var(--text-main)" }}>
                        {new Date(booking.fromDate).toLocaleDateString("vi-VN", {
                          weekday: "short",
                          year: "numeric",
                          month: "short",
                          day: "numeric",
                        })}
                      </strong>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between" }}>
                      <span style={{ color: "var(--text-muted)" }}>Trả phòng:</span>
                      <strong style={{ color: "var(--text-main)" }}>
                        {new Date(booking.toDate).toLocaleDateString("vi-VN", {
                          weekday: "short",
                          year: "numeric",
                          month: "short",
                          day: "numeric",
                        })}
                      </strong>
                    </div>
                    <div
                      style={{
                        marginTop: "0.5rem",
                        padding: "0.5rem",
                        borderRadius: "0.375rem",
                        background: "var(--bg-card)",
                        display: "flex",
                        alignItems: "center",
                        gap: "0.5rem",
                        fontSize: "0.75rem",
                        color: policy?.hoursUntilCheckIn >= 24 ? "#059669" : "#d97706",
                      }}
                    >
                      <Clock size={14} />
                      <span>
                        {policy?.hoursUntilCheckIn > 0
                          ? `Còn ${policy.hoursUntilCheckIn} giờ nữa đến lúc nhận phòng`
                          : "Đã qua thời điểm nhận phòng"}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Thông tin khách đặt phòng */}
                <div
                  style={{
                    padding: "1rem",
                    borderRadius: "0.75rem",
                    background: "var(--bg-tertiary)",
                    border: "1px solid var(--border-color)",
                  }}
                >
                  <div
                    style={{
                      fontSize: "0.8125rem",
                      fontWeight: 600,
                      color: "var(--primary)",
                      display: "flex",
                      alignItems: "center",
                      gap: "0.5rem",
                      marginBottom: "0.75rem",
                    }}
                  >
                    <User size={16} />
                    <span>Thông Tin Khách Hàng</span>
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem", fontSize: "0.8125rem" }}>
                    <div style={{ display: "flex", justifyContent: "space-between" }}>
                      <span style={{ color: "var(--text-muted)" }}>Họ và tên:</span>
                      <strong style={{ color: "var(--text-main)" }}>{booking.customerName}</strong>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between" }}>
                      <span style={{ color: "var(--text-muted)" }}>Số điện thoại:</span>
                      <span style={{ color: "var(--text-main)" }}>{booking.customerPhone}</span>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between" }}>
                      <span style={{ color: "var(--text-muted)" }}>CCCD/CMND:</span>
                      <span style={{ color: "var(--text-main)" }}>{booking.customerCccd}</span>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between" }}>
                      <span style={{ color: "var(--text-muted)" }}>Email:</span>
                      <span style={{ color: "var(--text-main)" }}>{booking.customerEmail}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Danh sách phòng đã đặt */}
              <div
                style={{
                  padding: "1rem",
                  borderRadius: "0.75rem",
                  background: "var(--bg-tertiary)",
                  border: "1px solid var(--border-color)",
                }}
              >
                <div
                  style={{
                    fontSize: "0.8125rem",
                    fontWeight: 600,
                    color: "var(--primary)",
                    display: "flex",
                    alignItems: "center",
                    gap: "0.5rem",
                    marginBottom: "0.75rem",
                  }}
                >
                  <Bed size={16} />
                  <span>Danh Sách Phòng Đã Đặt</span>
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                  {booking.items.map((it) => (
                    <div
                      key={it.id}
                      style={{
                        padding: "0.75rem",
                        borderRadius: "0.5rem",
                        background: "var(--bg-card)",
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        fontSize: "0.8125rem",
                      }}
                    >
                      <div>
                        <div style={{ fontWeight: 600, color: "var(--text-main)" }}>
                          {it.categoryName || `${it.roomType} (${it.roomSize})`}
                        </div>
                        <div style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>
                          Số lượng: <strong>{it.quantity} phòng</strong> × {it.unitPrice.toLocaleString("vi-VN")}đ/đêm
                        </div>
                      </div>
                      <div style={{ fontWeight: 700, color: "var(--primary)" }}>
                        {it.subtotal.toLocaleString("vi-VN")}đ
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Tóm tắt thanh toán & Khuyến mãi */}
              <div
                style={{
                  padding: "1rem",
                  borderRadius: "0.75rem",
                  background: "var(--bg-tertiary)",
                  border: "1px solid var(--border-color)",
                  display: "flex",
                  flexDirection: "column",
                  gap: "0.5rem",
                  fontSize: "0.8125rem",
                }}
              >
                <div
                  style={{
                    fontSize: "0.8125rem",
                    fontWeight: 600,
                    color: "var(--primary)",
                    display: "flex",
                    alignItems: "center",
                    gap: "0.5rem",
                    marginBottom: "0.5rem",
                  }}
                >
                  <CreditCard size={16} />
                  <span>Thông Tin Quyết Toán & Thanh Toán</span>
                </div>

                <div style={{ display: "flex", justifyContent: "space-between", color: "var(--text-muted)" }}>
                  <span>Tổng tiền phòng gốc ({booking.nights} đêm):</span>
                  <span>{booking.totalRoomFee.toLocaleString("vi-VN")}đ</span>
                </div>

                {booking.discountAmount > 0 && (
                  <div style={{ display: "flex", justifyContent: "space-between", color: "#10b981" }}>
                    <span>Giảm giá khuyến mãi ({booking.promotion?.code}):</span>
                    <span>-{booking.discountAmount.toLocaleString("vi-VN")}đ</span>
                  </div>
                )}

                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    paddingTop: "0.25rem",
                    borderTop: "1px dashed var(--border-color)",
                    fontWeight: 600,
                    color: "var(--text-main)",
                  }}
                >
                  <span>Tổng tiền phòng thực tế:</span>
                  <span>{booking.netRoomFee.toLocaleString("vi-VN")}đ</span>
                </div>

                <div style={{ display: "flex", justifyContent: "space-between", color: "var(--text-muted)" }}>
                  <span>Hình thức đã chọn:</span>
                  <span style={{ color: "#f59e0b", fontWeight: 600 }}>
                    {booking.paymentOption === "FULL_100" ? "Thanh toán 100%" : "Đặt cọc 50%"}
                  </span>
                </div>

                <div style={{ display: "flex", justifyContent: "space-between", color: "var(--text-muted)" }}>
                  <span>Tài khoản thẻ thanh toán:</span>
                  <span style={{ fontFamily: "monospace" }}>{booking.paymentAccountNumber}</span>
                </div>

                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    paddingTop: "0.5rem",
                    borderTop: "1px solid var(--border-color)",
                    fontSize: "0.9375rem",
                  }}
                >
                  <span style={{ fontWeight: 700, color: "var(--text-main)" }}>Số tiền đã thanh toán trước:</span>
                  <span style={{ fontWeight: 800, color: "#10b981" }}>
                    {booking.prepaidBookingValue.toLocaleString("vi-VN")}đ
                  </span>
                </div>

                {booking.remainingPayable > 0 && booking.status !== "CANCELLED" && (
                  <div style={{ display: "flex", justifyContent: "space-between", color: "#f59e0b" }}>
                    <span>Số tiền còn lại thanh toán tại quầy khi Check-in:</span>
                    <strong style={{ fontWeight: 700 }}>
                      {booking.remainingPayable.toLocaleString("vi-VN")}đ
                    </strong>
                  </div>
                )}
              </div>

              {/* Khối chính sách hủy phòng & Nút hành động */}
              {booking.status === "CANCELLED" ? (
                <div
                  style={{
                    padding: "1.25rem",
                    borderRadius: "0.75rem",
                    background: "rgba(239, 68, 68, 0.08)",
                    border: "1px solid rgba(239, 68, 68, 0.25)",
                    display: "flex",
                    flexDirection: "column",
                    gap: "0.5rem",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "0.5rem",
                      fontWeight: 700,
                      color: "#ef4444",
                    }}
                  >
                    <AlertTriangle size={18} />
                    <span>Đơn Đặt Phòng Này Đã Bị Hủy</span>
                  </div>
                  <div style={{ fontSize: "0.8125rem", color: "var(--text-muted)" }}>
                    Thời điểm hủy:{" "}
                    <strong>
                      {booking.cancelledAt
                        ? new Date(booking.cancelledAt).toLocaleString("vi-VN")
                        : "N/A"}
                    </strong>
                  </div>
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "1fr 1fr",
                      gap: "0.75rem",
                      marginTop: "0.5rem",
                      padding: "0.75rem",
                      borderRadius: "0.5rem",
                      background: "var(--bg-tertiary)",
                      fontSize: "0.8125rem",
                    }}
                  >
                    <div>
                      <span style={{ color: "var(--text-muted)" }}>Phí hủy phạt giữ lại (20%):</span>
                      <div style={{ fontWeight: 700, color: "#dc2626", marginTop: "2px" }}>
                        {booking.cancellationFee
                          ? booking.cancellationFee.toLocaleString("vi-VN")
                          : 0}
                        đ
                      </div>
                    </div>
                    <div>
                      <span style={{ color: "var(--text-muted)" }}>Số tiền đã hoàn lại (80%):</span>
                      <div style={{ fontWeight: 700, color: "#059669", marginTop: "2px" }}>
                        {booking.refundAmount ? booking.refundAmount.toLocaleString("vi-VN") : 0}đ
                      </div>
                    </div>
                  </div>
                </div>
              ) : policy?.isCancellable ? (
                /* Đủ điều kiện hủy theo luật 24h */
                <div
                  style={{
                    padding: "1.25rem",
                    borderRadius: "0.75rem",
                    background: "linear-gradient(135deg, rgba(16, 185, 129, 0.08), rgba(99, 102, 241, 0.08))",
                    border: "1px solid rgba(16, 185, 129, 0.3)",
                    display: "flex",
                    flexDirection: "column",
                    gap: "0.75rem",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "0.5rem",
                      fontWeight: 700,
                      color: "#059669",
                      fontSize: "0.9375rem",
                    }}
                  >
                    <CheckCircle size={18} />
                    <span>Đủ Điều Kiện Hủy Phòng Trực Tuyến (Cách nhận phòng &gt;= 24h)</span>
                  </div>
                  <p style={{ fontSize: "0.8125rem", color: "var(--text-muted)", margin: 0 }}>
                    Theo chính sách lưu trú của e-Hotel (Mục 4.3), khi quý khách thực hiện hủy trước giờ nhận phòng
                    tối thiểu 24 giờ, khách sạn sẽ giữ lại <strong>20% phí hủy</strong> và hoàn lại{" "}
                    <strong style={{ color: "#059669" }}>80% số tiền đã trả</strong> vào tài khoản thẻ gốc ngay lập
                    tức.
                  </p>

                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "1fr 1fr",
                      gap: "0.75rem",
                      padding: "0.75rem",
                      borderRadius: "0.5rem",
                      background: "var(--bg-tertiary)",
                      fontSize: "0.8125rem",
                    }}
                  >
                    <div>
                      <span style={{ color: "var(--text-muted)" }}>Phí khách sạn giữ lại (20%):</span>
                      <div style={{ fontWeight: 700, color: "#dc2626", marginTop: "2px" }}>
                        {policy.estimatedCancellationFee.toLocaleString("vi-VN")}đ
                      </div>
                    </div>
                    <div>
                      <span style={{ color: "var(--text-muted)" }}>Số tiền quý khách nhận lại (80%):</span>
                      <div style={{ fontWeight: 700, color: "#059669", marginTop: "2px" }}>
                        {policy.estimatedRefundAmount.toLocaleString("vi-VN")}đ
                      </div>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => setShowConfirmCancel(true)}
                    className="btn"
                    style={{
                      marginTop: "0.5rem",
                      background: "rgba(239, 68, 68, 0.15)",
                      color: "#ef4444",
                      border: "1px solid rgba(239, 68, 68, 0.4)",
                      padding: "0.75rem 1rem",
                      fontWeight: 700,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: "0.5rem",
                    }}
                  >
                    <AlertTriangle size={18} />
                    <span>Yêu Cầu Hủy Phòng & Nhận Hoàn 80%</span>
                  </button>
                </div>
              ) : (
                /* Không đủ điều kiện hủy */
                <div
                  style={{
                    padding: "1.25rem",
                    borderRadius: "0.75rem",
                    background: "rgba(245, 158, 11, 0.08)",
                    border: "1px solid rgba(245, 158, 11, 0.3)",
                    display: "flex",
                    flexDirection: "column",
                    gap: "0.5rem",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "0.5rem",
                      fontWeight: 700,
                      color: "#f59e0b",
                    }}
                  >
                    <AlertTriangle size={18} />
                    <span>Không Thể Hủy Phòng Trực Tuyến</span>
                  </div>
                  <p style={{ fontSize: "0.8125rem", color: "var(--text-muted)", margin: 0 }}>
                    {policy?.reason ||
                      "Chỉ được phép hủy phòng khi đơn ở trạng thái CONFIRMED và cách giờ nhận phòng tối thiểu 24 giờ."}
                  </p>
                  <div style={{ fontSize: "0.75rem", color: "var(--text-dim)", marginTop: "0.25rem" }}>
                    Quý khách có nhu cầu hỗ trợ đặc biệt vui lòng liên hệ trực tiếp hotline lễ tân:{" "}
                    <strong>1900 6868</strong>.
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div
          style={{
            padding: "1rem 1.75rem",
            borderTop: "1px solid var(--border-color)",
            display: "flex",
            justifyContent: "flex-end",
            background: "var(--bg-secondary)",
          }}
        >
          <button type="button" onClick={onClose} className="btn btn-secondary">
            Đóng
          </button>
        </div>
      </div>

      {/* Confirmation Sub-Modal */}
      {showConfirmCancel && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            backgroundColor: "rgba(15, 23, 42, 0.5)",
            backdropFilter: "blur(6px)",
            zIndex: 10000,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "1rem",
            animation: "fadeIn 0.15s ease",
          }}
        >
          <div
            className="glass-card"
            style={{
              width: "100%",
              maxWidth: "500px",
              padding: "1.75rem",
              borderRadius: "1rem",
              border: "1px solid rgba(239, 68, 68, 0.3)",
              background: "var(--bg-secondary)",
              boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.15)",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", color: "#dc2626" }}>
              <ShieldAlert size={28} />
              <h3 style={{ fontSize: "1.125rem", fontWeight: 700, margin: 0 }}>Xác Nhận Hủy Đặt Phòng</h3>
            </div>

            <p style={{ fontSize: "0.875rem", color: "var(--text-muted)", margin: "1rem 0" }}>
              Quý khách có chắc chắn muốn hủy đơn đặt phòng <strong>{booking?.bookingNumber}</strong> không? Hành động
              này không thể hoàn tác.
            </p>

            <div
              style={{
                padding: "1rem",
                borderRadius: "0.5rem",
                background: "var(--bg-tertiary)",
                fontSize: "0.8125rem",
                display: "flex",
                flexDirection: "column",
                gap: "0.5rem",
                marginBottom: "1.25rem",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ color: "var(--text-muted)" }}>Tiền đã trả:</span>
                <strong>{booking?.prepaidBookingValue?.toLocaleString("vi-VN")}đ</strong>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", color: "#ef4444" }}>
                <span>Phí hủy giữ lại (20%):</span>
                <span>-{policy?.estimatedCancellationFee?.toLocaleString("vi-VN")}đ</span>
              </div>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  color: "#10b981",
                  fontWeight: 700,
                  fontSize: "0.875rem",
                  paddingTop: "0.375rem",
                  borderTop: "1px dashed var(--border-color)",
                }}
              >
                <span>Số tiền hoàn về thẻ (80%):</span>
                <span>+{policy?.estimatedRefundAmount?.toLocaleString("vi-VN")}đ</span>
              </div>
              <div style={{ fontSize: "0.75rem", color: "var(--text-dim)", marginTop: "0.25rem" }}>
                Tài khoản nhận hoàn: <strong>{booking?.paymentAccountNumber}</strong>
              </div>
            </div>

            <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.75rem" }}>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setShowConfirmCancel(false)}
                disabled={cancelling}
              >
                Không, Quay Lại
              </button>
              <button
                type="button"
                className="btn btn-danger"
                onClick={handleCancelBooking}
                disabled={cancelling}
                style={{
                  background: "#ef4444",
                  color: "#fff",
                  display: "flex",
                  alignItems: "center",
                  gap: "0.5rem",
                }}
              >
                {cancelling ? (
                  <>
                    <RefreshCw size={16} className="animate-spin" />
                    <span>Đang Xử Lý Hoàn Tiền...</span>
                  </>
                ) : (
                  <>
                    <AlertTriangle size={16} />
                    <span>Xác Nhận Hủy Phòng</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
