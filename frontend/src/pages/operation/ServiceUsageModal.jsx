import React, { useState, useEffect } from "react";
import {
  X,
  Coffee,
  CheckCircle,
  AlertCircle,
  Printer,
  Bed,
  User,
  Plus,
  Minus,
  Sparkles,
  Info,
  Calendar,
  CreditCard,
  Phone,
  Tag,
} from "lucide-react";
import { apiRequest } from "../../api/client.js";

const formatCurrency = (amount) => {
  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
  }).format(amount || 0);
};

export default function ServiceUsageModal({
  initialRoomId = "",
  initialBookingId = null,
  onClose,
  onTicketCreated,
}) {
  const [occupiedRooms, setOccupiedRooms] = useState([]);
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState(null);

  // Form state
  const [selectedRoomId, setSelectedRoomId] = useState(initialRoomId || "");
  const [selectedServiceId, setSelectedServiceId] = useState("");
  const [quantity, setQuantity] = useState(1);

  // Tải danh sách phòng OCCUPIED và danh mục dịch vụ
  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);
        setErrorMsg(null);

        const [roomsRes, srvRes] = await Promise.all([
          apiRequest("/api/operation/services/occupied-rooms"),
          apiRequest("/api/operation/services/catalog"),
        ]);

        if (roomsRes.success && Array.isArray(roomsRes.data)) {
          setOccupiedRooms(roomsRes.data);
          if (initialRoomId) {
            setSelectedRoomId(initialRoomId);
          } else if (roomsRes.data.length > 0) {
            setSelectedRoomId(roomsRes.data[0].roomId);
          }
        }

        if (srvRes.success && Array.isArray(srvRes.data)) {
          setServices(srvRes.data);
          if (srvRes.data.length > 0) {
            setSelectedServiceId(srvRes.data[0].serviceId);
          }
        }
      } catch (err) {
        setErrorMsg(err.message || "Không thể tải dữ liệu phòng và dịch vụ.");
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, [initialRoomId]);

  // Tìm đối tượng phòng và dịch vụ đang chọn
  const selectedRoom = occupiedRooms.find((r) => r.roomId === selectedRoomId);
  const selectedService = services.find((s) => s.serviceId === selectedServiceId);

  const unitPrice = selectedService ? Number(selectedService.price) : 0;
  const totalPrice = unitPrice * (parseInt(quantity, 10) || 1);

  const handleQuantityChange = (delta) => {
    setQuantity((prev) => Math.max(1, (parseInt(prev, 10) || 1) + delta));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedRoomId) {
      setErrorMsg("Vui lòng chọn phòng đang lưu trú.");
      return;
    }
    if (!selectedServiceId) {
      setErrorMsg("Vui lòng chọn dịch vụ.");
      return;
    }
    const qty = parseInt(quantity, 10);
    if (isNaN(qty) || qty < 1) {
      setErrorMsg("Số lượng sử dụng dịch vụ phải từ 1 trở lên.");
      return;
    }

    try {
      setSubmitting(true);
      setErrorMsg(null);

      const res = await apiRequest("/api/operation/services/usage", {
        method: "POST",
        body: JSON.stringify({
          roomId: selectedRoomId,
          serviceId: selectedServiceId,
          quantity: qty,
        }),
      });

      if (res.success && res.data) {
        if (onTicketCreated) {
          onTicketCreated(res.data);
        }
      }
    } catch (err) {
      setErrorMsg(err.message || "Không thể lập phiếu sử dụng dịch vụ.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
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
        if (e.target === e.currentTarget && !submitting) onClose();
      }}
    >
      <div
        className="glass-card"
        style={{
          width: "100%",
          maxWidth: "580px",
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
        {/* Header Luxury Gradient */}
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
          {/* Ambient decorative glow */}
          <div
            style={{
              position: "absolute",
              right: "-20px",
              top: "-20px",
              width: "120px",
              height: "120px",
              borderRadius: "50%",
              background: "radial-gradient(circle, rgba(255, 255, 255, 0.15) 0%, transparent 70%)",
              pointerEvents: "none",
            }}
          />

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
              <Coffee size={22} />
            </div>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                <h3 style={{ fontSize: "1.15rem", fontWeight: 800, margin: 0, letterSpacing: "-0.01em" }}>
                  Đăng Ký Sử Dụng Dịch Vụ Phòng
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
                  5★ LUXURY
                </span>
              </div>
              <p style={{ fontSize: "0.8rem", color: "rgba(255, 255, 255, 0.75)", margin: "0.2rem 0 0 0" }}>
                Ghi nhận dịch vụ và xuất phiếu in xác nhận cho khách lưu trú
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
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
              transition: "background 0.2s",
              position: "relative",
              zIndex: 1,
            }}
            title="Đóng"
          >
            <X size={18} />
          </button>
        </div>

        {/* Form Body */}
        {loading ? (
          <div style={{ padding: "3rem", textAlign: "center", color: "var(--text-muted)" }}>
            <div
              style={{
                width: "36px",
                height: "36px",
                border: "3px solid #e2e8f0",
                borderTopColor: "var(--primary)",
                borderRadius: "50%",
                margin: "0 auto 1rem",
                animation: "spin 1s linear infinite",
              }}
            />
            <p style={{ fontSize: "0.875rem", fontWeight: 600 }}>Đang tải danh sách phòng và bảng giá dịch vụ...</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} style={{ padding: "1.75rem", display: "flex", flexDirection: "column", gap: "1.25rem" }}>
            {errorMsg && (
              <div
                style={{
                  padding: "0.875rem 1rem",
                  borderRadius: "10px",
                  background: "rgba(239, 68, 68, 0.08)",
                  border: "1px solid rgba(239, 68, 68, 0.25)",
                  color: "#dc2626",
                  fontSize: "0.85rem",
                  display: "flex",
                  alignItems: "center",
                  gap: "0.5rem",
                }}
              >
                <AlertCircle size={18} />
                <span>{errorMsg}</span>
              </div>
            )}

            {/* Bước 1: Chọn phòng */}
            <div>
              <label className="form-label" style={{ display: "flex", alignItems: "center", gap: "0.4rem", marginBottom: "0.5rem" }}>
                <span
                  style={{
                    width: "20px",
                    height: "20px",
                    borderRadius: "50%",
                    background: "var(--primary-gradient)",
                    color: "white",
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: "0.75rem",
                    fontWeight: 800,
                  }}
                >
                  1
                </span>
                <span>Chọn phòng lưu trú (Phòng đang ở - OCCUPIED) *</span>
              </label>

              {occupiedRooms.length === 0 ? (
                <div
                  style={{
                    padding: "0.875rem 1rem",
                    borderRadius: "10px",
                    background: "rgba(245, 158, 11, 0.08)",
                    border: "1px solid rgba(245, 158, 11, 0.25)",
                    color: "#b45309",
                    fontSize: "0.8125rem",
                  }}
                >
                  Hiện không có phòng nào đang ở trạng thái OCCUPIED (Đang có khách lưu trú).
                  Vui lòng làm thủ tục Check-in trước khi đăng ký dịch vụ.
                </div>
              ) : (
                <select
                  className="form-select"
                  value={selectedRoomId}
                  onChange={(e) => setSelectedRoomId(e.target.value)}
                  required
                  style={{
                    fontSize: "0.875rem",
                    fontWeight: 600,
                    padding: "0.75rem 1rem",
                    borderRadius: "10px",
                  }}
                >
                  {occupiedRooms.map((r) => (
                    <option key={r.roomId} value={r.roomId}>
                      Phòng {r.roomId} ({r.type} - {r.size}) — {r.customerName || "Khách"} [{r.bookingNumber}]
                    </option>
                  ))}
                </select>
              )}

              {/* Thông tin nhanh phòng */}
              {selectedRoom && (
                <div
                  style={{
                    marginTop: "0.6rem",
                    padding: "0.75rem 1rem",
                    borderRadius: "10px",
                    background: "var(--bg-secondary)",
                    border: "1px solid var(--border-color)",
                    display: "flex",
                    flexWrap: "wrap",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: "0.5rem",
                    fontSize: "0.8125rem",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
                    <Bed size={16} color="var(--primary)" />
                    <span>
                      <strong style={{ color: "var(--text-main)" }}>Khách lưu trú:</strong>{" "}
                      {selectedRoom.customerName}
                    </span>
                    {selectedRoom.customerPhone && (
                      <span style={{ color: "var(--text-dim)", fontFamily: "monospace" }}>
                        ({selectedRoom.customerPhone})
                      </span>
                    )}
                  </div>
                  <span
                    style={{
                      padding: "0.2rem 0.55rem",
                      borderRadius: "6px",
                      background: "rgba(16, 185, 129, 0.12)",
                      color: "#059669",
                      fontWeight: 700,
                      fontSize: "0.75rem",
                      display: "flex",
                      alignItems: "center",
                      gap: "0.25rem",
                    }}
                  >
                    <CheckCircle size={12} /> Đang ở (OCCUPIED)
                  </span>
                </div>
              )}
            </div>

            {/* Bước 2: Chọn Dịch Vụ */}
            <div>
              <label className="form-label" style={{ display: "flex", alignItems: "center", gap: "0.4rem", marginBottom: "0.5rem" }}>
                <span
                  style={{
                    width: "20px",
                    height: "20px",
                    borderRadius: "50%",
                    background: "var(--primary-gradient)",
                    color: "white",
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: "0.75rem",
                    fontWeight: 800,
                  }}
                >
                  2
                </span>
                <span>Chọn dịch vụ khách sạn yêu cầu *</span>
              </label>

              <select
                className="form-select"
                value={selectedServiceId}
                onChange={(e) => setSelectedServiceId(e.target.value)}
                required
                style={{
                  fontSize: "0.875rem",
                  fontWeight: 600,
                  padding: "0.75rem 1rem",
                  borderRadius: "10px",
                }}
              >
                {services.map((s) => (
                  <option key={s.serviceId} value={s.serviceId}>
                    {s.serviceName} — {formatCurrency(s.price)} / {s.unit} ({s.serviceId})
                  </option>
                ))}
              </select>

              {selectedService && selectedService.description && (
                <p style={{ marginTop: "0.35rem", fontSize: "0.785rem", color: "var(--text-dim)", fontStyle: "italic" }}>
                  {selectedService.description}
                </p>
              )}
            </div>

            {/* Bước 3: Số lượng & Đơn giá */}
            <div style={{ display: "grid", gridTemplateColumns: "1.2fr 1fr", gap: "1rem" }}>
              <div>
                <label className="form-label" style={{ display: "flex", alignItems: "center", gap: "0.4rem", marginBottom: "0.5rem" }}>
                  <span
                    style={{
                      width: "20px",
                      height: "20px",
                      borderRadius: "50%",
                      background: "var(--primary-gradient)",
                      color: "white",
                      display: "inline-flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: "0.75rem",
                      fontWeight: 800,
                    }}
                  >
                    3
                  </span>
                  <span>Số lượng ({selectedService?.unit || "Lượt"}) *</span>
                </label>

                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    border: "1px solid var(--border-color)",
                    borderRadius: "10px",
                    background: "var(--bg-secondary)",
                    overflow: "hidden",
                  }}
                >
                  <button
                    type="button"
                    onClick={() => handleQuantityChange(-1)}
                    disabled={quantity <= 1}
                    style={{
                      padding: "0.7rem 0.9rem",
                      background: "transparent",
                      border: "none",
                      color: quantity <= 1 ? "#cbd5e1" : "var(--text-main)",
                      cursor: quantity <= 1 ? "not-allowed" : "pointer",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      transition: "background 0.15s",
                    }}
                  >
                    <Minus size={16} />
                  </button>

                  <input
                    type="number"
                    min="1"
                    max="999"
                    value={quantity}
                    onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value, 10) || 1))}
                    required
                    style={{
                      width: "100%",
                      textAlign: "center",
                      background: "transparent",
                      border: "none",
                      fontWeight: 800,
                      fontSize: "1.05rem",
                      color: "var(--text-main)",
                      outline: "none",
                    }}
                  />

                  <button
                    type="button"
                    onClick={() => handleQuantityChange(1)}
                    style={{
                      padding: "0.7rem 0.9rem",
                      background: "transparent",
                      border: "none",
                      color: "var(--text-main)",
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      transition: "background 0.15s",
                    }}
                  >
                    <Plus size={16} />
                  </button>
                </div>
              </div>

              <div>
                <label className="form-label" style={{ marginBottom: "0.5rem" }}>
                  Đơn giá niêm yết
                </label>
                <div
                  style={{
                    padding: "0.75rem 1rem",
                    borderRadius: "10px",
                    background: "var(--bg-secondary)",
                    border: "1px solid var(--border-color)",
                    fontSize: "0.9375rem",
                    fontWeight: 700,
                    color: "var(--text-muted)",
                    textAlign: "right",
                  }}
                >
                  {formatCurrency(unitPrice)}
                </div>
              </div>
            </div>

            {/* Box Tổng Tiền & Ghi Nhận */}
            <div
              style={{
                borderRadius: "14px",
                background: "linear-gradient(135deg, rgba(79, 70, 229, 0.06) 0%, rgba(99, 102, 241, 0.12) 100%)",
                border: "1px solid rgba(79, 70, 229, 0.2)",
                padding: "1.25rem",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.5rem" }}>
                <span style={{ fontSize: "0.875rem", fontWeight: 700, color: "#4338ca", textTransform: "uppercase", letterSpacing: "0.03em" }}>
                  Thành tiền phiếu dịch vụ:
                </span>
                <span style={{ fontSize: "1.5rem", fontWeight: 900, color: "#312e81", letterSpacing: "-0.02em" }}>
                  {formatCurrency(totalPrice)}
                </span>
              </div>

              <div
                style={{
                  display: "flex",
                  alignItems: "flex-start",
                  gap: "0.5rem",
                  paddingTop: "0.6rem",
                  borderTop: "1px solid rgba(79, 70, 229, 0.15)",
                  fontSize: "0.775rem",
                  color: "#4338ca",
                  lineHeight: 1.45,
                }}
              >
                <Info size={15} style={{ flexShrink: 0, marginTop: "2px" }} />
                <span>
                  Khoản này sẽ tự động ghi nợ vào đơn đặt phòng và quyết toán khi khách làm thủ tục Check-out. Nếu khách hàng đã kích hoạt <strong>Auto-Debit ví nội bộ</strong>, hệ thống sẽ tự động trừ ví khi dịch vụ hoàn thành (COMPLETED).
                </span>
              </div>
            </div>

            {/* Actions */}
            <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.75rem", marginTop: "0.5rem" }}>
              <button
                type="button"
                onClick={onClose}
                disabled={submitting}
                className="btn btn-secondary"
                style={{ padding: "0.7rem 1.25rem", fontSize: "0.875rem" }}
              >
                Hủy bỏ
              </button>

              <button
                type="submit"
                disabled={submitting || occupiedRooms.length === 0}
                className="btn btn-primary"
                style={{
                  padding: "0.7rem 1.5rem",
                  fontSize: "0.875rem",
                  display: "flex",
                  alignItems: "center",
                  gap: "0.5rem",
                  boxShadow: "0 4px 14px rgba(79, 70, 229, 0.4)",
                }}
              >
                {submitting ? (
                  <>
                    <div
                      style={{
                        width: "16px",
                        height: "16px",
                        border: "2px solid #ffffff",
                        borderTopColor: "transparent",
                        borderRadius: "50%",
                        animation: "spin 1s linear infinite",
                      }}
                    />
                    <span>Đang lập phiếu...</span>
                  </>
                ) : (
                  <>
                    <Printer size={16} />
                    <span>Lập Phiếu & In Ngay</span>
                  </>
                )}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
