import React, { useEffect } from "react";
import {
  Printer,
  X,
  FileText,
  Building2,
  Phone,
  Mail,
  User,
  Bed,
  Calendar,
  CreditCard,
  ShieldCheck,
  Tag,
  DollarSign,
  Wallet,
} from "lucide-react";
import { formatDateShort, formatDateTimeDisplay } from "../../utils/date.js";

const formatCurrency = (amount) => {
  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
  }).format(amount || 0);
};

const formatDateTime = (dateStr) => {
  if (!dateStr) return "---";
  return formatDateTimeDisplay(dateStr);
};

const formatDate = (dateStr) => {
  if (!dateStr) return "---";
  return formatDateShort(dateStr);
};

export default function InvoicePrintModal({ invoiceData, onClose, autoPrint = false }) {
  useEffect(() => {
    if (autoPrint) {
      const timer = setTimeout(() => {
        window.print();
      }, 400);
      return () => clearTimeout(timer);
    }
  }, [autoPrint]);

  if (!invoiceData) return null;

  const {
    invoiceId,
    issuedAt,
    totalRoomFee,
    extraChildrenFee,
    totalServiceFee,
    totalInvoiceAmount,
    prepaidBookingValue,
    walletPaidAmount = 0,
    remainingPayable,
    booking = {},
    rooms = [],
    services = [],
  } = invoiceData;

  const handlePrint = () => {
    window.print();
  };

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 9999,
        backgroundColor: "rgba(15, 23, 42, 0.7)",
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
        if (e.target === e.currentTarget) onClose();
      }}
    >
      {/* CSS chuyên dụng in ấn khổ A4 */}
      <style>{`
        @media print {
          body * {
            visibility: hidden !important;
          }
          #printable-invoice, #printable-invoice * {
            visibility: visible !important;
          }
          #printable-invoice {
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 100% !important;
            margin: 0 !important;
            padding: 24px !important;
            box-shadow: none !important;
            border: none !important;
            background: white !important;
            color: black !important;
          }
          .no-print {
            display: none !important;
          }
        }
      `}</style>

      <div
        className="glass-card"
        style={{
          width: "100%",
          maxWidth: "780px",
          maxHeight: "94vh",
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
        {/* Header Modal (Không in) */}
        <div
          className="no-print"
          style={{
            background: "linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #064e3b 100%)",
            color: "#ffffff",
            padding: "1.15rem 1.75rem",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            position: "relative",
            overflow: "hidden",
          }}
        >
          {/* Ambient glow */}
          <div
            style={{
              position: "absolute",
              right: "-10px",
              top: "-10px",
              width: "100px",
              height: "100px",
              borderRadius: "50%",
              background: "radial-gradient(circle, rgba(16, 185, 129, 0.2) 0%, transparent 70%)",
              pointerEvents: "none",
            }}
          />

          <div style={{ display: "flex", alignItems: "center", gap: "0.85rem", position: "relative", zIndex: 1 }}>
            <div
              style={{
                width: "44px",
                height: "44px",
                borderRadius: "12px",
                background: "rgba(16, 185, 129, 0.25)",
                backdropFilter: "blur(6px)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#6ee7b7",
                border: "1px solid rgba(16, 185, 129, 0.35)",
              }}
            >
              <FileText size={22} />
            </div>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                <h3 style={{ fontSize: "1.15rem", fontWeight: 800, margin: 0, letterSpacing: "-0.01em" }}>
                  Hóa Đơn Quyết Toán Check-out
                </h3>
                <span
                  style={{
                    fontSize: "0.65rem",
                    padding: "0.15rem 0.5rem",
                    borderRadius: "6px",
                    background: "rgba(16, 185, 129, 0.2)",
                    color: "#a7f3d0",
                    border: "1px solid rgba(16, 185, 129, 0.4)",
                    fontWeight: 700,
                  }}
                >
                  A4 FOLIO
                </span>
              </div>
              <p style={{ fontSize: "0.8rem", color: "rgba(255, 255, 255, 0.75)", margin: "0.2rem 0 0 0" }}>
                Xem trước & xuất bản in hóa đơn chuẩn A4 cho khách lưu trú
              </p>
            </div>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", position: "relative", zIndex: 1 }}>
            <button
              onClick={handlePrint}
              style={{
                background: "linear-gradient(135deg, #059669 0%, #047857 100%)",
                color: "#ffffff",
                border: "none",
                borderRadius: "10px",
                padding: "0.5rem 1rem",
                fontSize: "0.85rem",
                fontWeight: 700,
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: "0.45rem",
                boxShadow: "0 4px 12px rgba(5, 150, 105, 0.35)",
                transition: "all 0.15s ease",
              }}
            >
              <Printer size={16} />
              <span>In Hóa Đơn (Print)</span>
            </button>
            <button
              onClick={onClose}
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
        </div>

        {/* Nội dung Hóa đơn - In ấn */}
        <div
          style={{
            padding: "1.5rem",
            overflowY: "auto",
            flex: 1,
            backgroundColor: "#f8fafc",
            display: "flex",
            justifyContent: "center",
          }}
        >
          <div
            id="printable-invoice"
            style={{
              backgroundColor: "#ffffff",
              border: "1px solid #cbd5e1",
              borderRadius: "12px",
              padding: "2rem",
              maxWidth: "700px",
              width: "100%",
              color: "#0f172a",
              boxShadow: "0 4px 12px rgba(0, 0, 0, 0.05)",
              fontSize: "0.85rem",
            }}
          >
            {/* Header Khách Sạn */}
            <div
              style={{
                borderBottom: "2px solid #0f172a",
                paddingBottom: "1rem",
                marginBottom: "1.25rem",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "flex-start",
              }}
            >
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
                  <Building2 size={20} color="#047857" />
                  <h1
                    style={{
                      fontSize: "1.3rem",
                      fontWeight: 900,
                      letterSpacing: "0.02em",
                      color: "#0f172a",
                      margin: 0,
                      textTransform: "uppercase",
                    }}
                  >
                    e-Hotel Luxury Resort & Spa
                  </h1>
                </div>
                <p style={{ fontSize: "0.75rem", color: "#64748b", margin: "0.25rem 0 0 0" }}>
                  ★★★★★ Đẳng cấp nghỉ dưỡng & dịch vụ tiêu chuẩn 5 sao quốc tế
                </p>
                <p style={{ fontSize: "0.72rem", color: "#94a3b8", margin: "0.2rem 0 0 0" }}>
                  Hotline: 1900 8888 | Email: accounting@ehotel.local | Web: ehotel.local
                </p>
              </div>

              <div style={{ textAlign: "right" }}>
                <span
                  style={{
                    display: "inline-block",
                    padding: "0.3rem 0.75rem",
                    background: "#ecfdf5",
                    color: "#065f46",
                    fontFamily: "monospace",
                    fontSize: "0.85rem",
                    fontWeight: 800,
                    borderRadius: "6px",
                    border: "1px solid #a7f3d0",
                  }}
                >
                  {invoiceId}
                </span>
                <p style={{ fontSize: "0.75rem", color: "#64748b", margin: "0.35rem 0 0 0" }}>
                  Ngày lập: {formatDateTime(issuedAt)}
                </p>
              </div>
            </div>

            {/* Tiêu đề Hóa Đơn */}
            <div style={{ textAlign: "center", margin: "1.25rem 0" }}>
              <h2
                style={{
                  fontSize: "1.25rem",
                  fontWeight: 900,
                  letterSpacing: "0.04em",
                  textTransform: "uppercase",
                  color: "#0f172a",
                  margin: 0,
                }}
              >
                HÓA ĐƠN QUYẾT TOÁN TRẢ PHÒNG
              </h2>
              <p style={{ fontSize: "0.75rem", fontStyle: "italic", color: "#64748b", margin: "0.2rem 0 0 0" }}>
                (Guest Folio & Check-out Statement)
              </p>
            </div>

            {/* Thông tin Khách Hàng & Đơn Đặt Phòng */}
            <div
              style={{
                backgroundColor: "#f8fafc",
                border: "1px solid #e2e8f0",
                borderRadius: "10px",
                padding: "0.9rem 1.1rem",
                marginBottom: "1.25rem",
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: "0.65rem",
                fontSize: "0.8rem",
              }}
            >
              <div>
                <span style={{ color: "#64748b", display: "block", fontSize: "0.72rem" }}>Khách hàng đại diện:</span>
                <span style={{ fontWeight: 800, color: "#0f172a", fontSize: "0.88rem" }}>
                  {booking.customerName || "---"}
                </span>
              </div>
              <div>
                <span style={{ color: "#64748b", display: "block", fontSize: "0.72rem" }}>Mã đơn đặt phòng:</span>
                <span style={{ fontWeight: 800, color: "#1d4ed8", fontFamily: "monospace", fontSize: "0.88rem" }}>
                  {booking.bookingNumber || "---"}
                </span>
              </div>
              <div>
                <span style={{ color: "#64748b", display: "block", fontSize: "0.72rem" }}>Số điện thoại:</span>
                <span style={{ fontWeight: 600, color: "#334155", fontFamily: "monospace" }}>
                  {booking.customerPhone || "---"}
                </span>
              </div>
              <div>
                <span style={{ color: "#64748b", display: "block", fontSize: "0.72rem" }}>Số CCCD / CMND:</span>
                <span style={{ fontWeight: 600, color: "#334155", fontFamily: "monospace" }}>
                  {booking.customerCccd || "---"}
                </span>
              </div>
              <div>
                <span style={{ color: "#64748b", display: "block", fontSize: "0.72rem" }}>Thời gian lưu trú:</span>
                <span style={{ fontWeight: 600, color: "#334155" }}>
                  {formatDate(booking.fromDate)} → {formatDate(booking.toDate)} ({booking.nights} đêm)
                </span>
              </div>
              <div>
                <span style={{ color: "#64748b", display: "block", fontSize: "0.72rem" }}>Phòng vật lý đã ở:</span>
                <span style={{ fontWeight: 800, color: "#0f172a" }}>
                  {rooms.map((r) => `Phòng ${r.roomId}`).join(", ") || "---"}
                </span>
              </div>
            </div>

            {/* Danh mục chi tiết quyết toán */}
            <div style={{ display: "flex", flexDirection: "column", gap: "1rem", marginBottom: "1.25rem" }}>
              {/* 1. Tiền phòng */}
              <div>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    marginBottom: "0.35rem",
                  }}
                >
                  <span
                    style={{
                      fontSize: "0.78rem",
                      fontWeight: 800,
                      color: "#1e293b",
                      textTransform: "uppercase",
                      letterSpacing: "0.03em",
                    }}
                  >
                    1. Chi Phí Tiền Phòng Lưu Trú
                  </span>
                  <span style={{ fontFamily: "monospace", fontWeight: 700, color: "#047857" }}>
                    {formatCurrency(totalRoomFee)}
                  </span>
                </div>
                <div
                  style={{
                    backgroundColor: "#f8fafc",
                    border: "1px solid #e2e8f0",
                    borderRadius: "6px",
                    padding: "0.6rem 0.85rem",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    fontSize: "0.8rem",
                  }}
                >
                  <span>
                    Tiền phòng lưu trú ({booking.nights} đêm)
                    {booking.promotion && (
                      <span style={{ color: "#b45309", fontSize: "0.75rem", marginLeft: "0.4rem" }}>
                        (Áp dụng KM: {booking.promotion.code})
                      </span>
                    )}
                  </span>
                  <span style={{ fontWeight: 700 }}>{formatCurrency(totalRoomFee)}</span>
                </div>
              </div>

              {/* 2. Phụ thu trẻ em nếu có */}
              {extraChildrenFee > 0 && (
                <div>
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      marginBottom: "0.35rem",
                    }}
                  >
                    <span
                      style={{
                        fontSize: "0.78rem",
                        fontWeight: 800,
                        color: "#b45309",
                        textTransform: "uppercase",
                        letterSpacing: "0.03em",
                      }}
                    >
                      2. Phụ Thu Trẻ Em Vượt Tiêu Chuẩn (SPEC 4.4)
                    </span>
                    <span style={{ fontFamily: "monospace", fontWeight: 700, color: "#b45309" }}>
                      +{formatCurrency(extraChildrenFee)}
                    </span>
                  </div>
                  <div
                    style={{
                      backgroundColor: "#fffbeb",
                      border: "1px solid #fde68a",
                      borderRadius: "6px",
                      padding: "0.6rem 0.85rem",
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      fontSize: "0.8rem",
                      color: "#92400e",
                    }}
                  >
                    <span>Phụ thu số lượng trẻ em vượt định mức theo quy chế phòng</span>
                    <span style={{ fontWeight: 700 }}>+{formatCurrency(extraChildrenFee)}</span>
                  </div>
                </div>
              )}

              {/* 3. Dịch vụ phát sinh */}
              <div>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    marginBottom: "0.35rem",
                  }}
                >
                  <span
                    style={{
                      fontSize: "0.78rem",
                      fontWeight: 800,
                      color: "#1e293b",
                      textTransform: "uppercase",
                      letterSpacing: "0.03em",
                    }}
                  >
                    {extraChildrenFee > 0 ? "3." : "2."} Dịch Vụ Khách Sạn Đã Sử Dụng ({services.length} phiếu)
                  </span>
                  <span style={{ fontFamily: "monospace", fontWeight: 700, color: "#2563eb" }}>
                    +{formatCurrency(totalServiceFee)}
                  </span>
                </div>
                {services.length === 0 ? (
                  <div
                    style={{
                      backgroundColor: "#f8fafc",
                      border: "1px solid #e2e8f0",
                      borderRadius: "6px",
                      padding: "0.6rem 0.85rem",
                      fontSize: "0.78rem",
                      color: "#64748b",
                      fontStyle: "italic",
                    }}
                  >
                    Không phát sinh dịch vụ phòng trong kỳ lưu trú.
                  </div>
                ) : (
                  <table
                    style={{
                      width: "100%",
                      borderCollapse: "collapse",
                      fontSize: "0.78rem",
                      border: "1px solid #e2e8f0",
                      borderRadius: "6px",
                      overflow: "hidden",
                    }}
                  >
                    <thead>
                      <tr style={{ backgroundColor: "#f1f5f9", color: "#334155", borderBottom: "1px solid #cbd5e1" }}>
                        <th style={{ padding: "0.5rem 0.6rem", textAlign: "left", fontWeight: 700 }}>Mã phiếu</th>
                        <th style={{ padding: "0.5rem 0.6rem", textAlign: "left", fontWeight: 700 }}>Tên dịch vụ</th>
                        <th style={{ padding: "0.5rem 0.6rem", textAlign: "center", fontWeight: 700 }}>Phòng</th>
                        <th style={{ padding: "0.5rem 0.6rem", textAlign: "center", fontWeight: 700 }}>SL</th>
                        <th style={{ padding: "0.5rem 0.6rem", textAlign: "right", fontWeight: 700 }}>Đơn giá</th>
                        <th style={{ padding: "0.5rem 0.6rem", textAlign: "right", fontWeight: 700 }}>Thành tiền</th>
                      </tr>
                    </thead>
                    <tbody>
                      {services.map((s, idx) => (
                        <tr
                          key={s.ticketId || idx}
                          style={{
                            borderBottom: "1px solid #e2e8f0",
                            backgroundColor: idx % 2 === 1 ? "#fafafa" : "#ffffff",
                          }}
                        >
                          <td style={{ padding: "0.45rem 0.6rem", fontFamily: "monospace", color: "#64748b" }}>
                            {s.ticketId}
                          </td>
                          <td style={{ padding: "0.45rem 0.6rem", fontWeight: 600 }}>
                            {s.serviceName}
                            {s.isPaid && (
                              <span
                                style={{
                                  marginLeft: "0.4rem",
                                  padding: "0.1rem 0.35rem",
                                  fontSize: "0.65rem",
                                  backgroundColor: "#eff6ff",
                                  color: "#1d4ed8",
                                  borderRadius: "4px",
                                  fontWeight: 700,
                                  border: "1px solid #bfdbfe",
                                }}
                              >
                                Ví đã thanh toán
                              </span>
                            )}
                          </td>
                          <td style={{ padding: "0.45rem 0.6rem", textAlign: "center" }}>{s.roomId}</td>
                          <td style={{ padding: "0.45rem 0.6rem", textAlign: "center", fontWeight: 700 }}>
                            {s.quantity} {s.unit}
                          </td>
                          <td style={{ padding: "0.45rem 0.6rem", textAlign: "right" }}>
                            {formatCurrency(s.unitPrice)}
                          </td>
                          <td style={{ padding: "0.45rem 0.6rem", textAlign: "right", fontWeight: 700, color: "#1d4ed8" }}>
                            {formatCurrency(s.totalPrice)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>

            {/* Bảng Tổng Kết Quyết Toán Tài Chính */}
            <div
              style={{
                borderTop: "2px solid #0f172a",
                paddingTop: "0.85rem",
                marginBottom: "1.25rem",
              }}
            >
              <div style={{ display: "flex", flexDirection: "column", gap: "0.4rem", fontSize: "0.82rem" }}>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span style={{ color: "#64748b" }}>Tổng tiền phòng sau chiết khấu:</span>
                  <span style={{ fontWeight: 600 }}>{formatCurrency(totalRoomFee)}</span>
                </div>
                {extraChildrenFee > 0 && (
                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <span style={{ color: "#64748b" }}>Phụ thu trẻ em vượt định mức:</span>
                    <span style={{ fontWeight: 600, color: "#b45309" }}>+{formatCurrency(extraChildrenFee)}</span>
                  </div>
                )}
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span style={{ color: "#64748b" }}>Tổng phí dịch vụ phát sinh:</span>
                  <span style={{ fontWeight: 600, color: "#2563eb" }}>+{formatCurrency(totalServiceFee)}</span>
                </div>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    paddingTop: "0.4rem",
                    borderTop: "1px solid #cbd5e1",
                    fontWeight: 800,
                    fontSize: "0.92rem",
                  }}
                >
                  <span>TỔNG GIÁ TRỊ HÓA ĐƠN:</span>
                  <span style={{ color: "#0f172a" }}>{formatCurrency(totalInvoiceAmount)}</span>
                </div>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    color: "#059669",
                    fontWeight: 600,
                  }}
                >
                  <span>Đã thanh toán trước lúc đặt (Online Prepaid):</span>
                  <span>-{formatCurrency(prepaidBookingValue)}</span>
                </div>
                {walletPaidAmount > 0 && (
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      color: "#2563eb",
                      fontWeight: 600,
                    }}
                  >
                    <span>Đã trừ tiền ví tự động (Auto-Debit Wallet):</span>
                    <span>-{formatCurrency(walletPaidAmount)}</span>
                  </div>
                )}

                {/* Highlight SỐ TIỀN CÒN LẠI PHẢI THU */}
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    padding: "0.75rem 1rem",
                    border: "2px solid #059669",
                    backgroundColor: "#ecfdf5",
                    borderRadius: "8px",
                    marginTop: "0.5rem",
                  }}
                >
                  <span style={{ fontWeight: 900, fontSize: "0.88rem", textTransform: "uppercase", color: "#065f46" }}>
                    SỐ TIỀN CÒN LẠI PHẢI THU TẠI QUẦY:
                  </span>
                  <span style={{ fontWeight: 900, fontSize: "1.25rem", color: "#047857", fontFamily: "monospace" }}>
                    {formatCurrency(remainingPayable)}
                  </span>
                </div>
              </div>
            </div>

            {/* Ghi chú & Chữ ký xác nhận */}
            <div
              style={{
                fontSize: "0.72rem",
                color: "#64748b",
                marginBottom: "1.25rem",
                fontStyle: "italic",
                textAlign: "center",
              }}
            >
              Quý khách vui lòng kiểm tra kỹ các khoản mục trên hóa đơn trước khi rời khách sạn.
            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: "2rem",
                textAlign: "center",
                fontSize: "0.78rem",
                paddingTop: "0.75rem",
                borderTop: "1px solid #e2e8f0",
              }}
            >
              <div>
                <p style={{ fontWeight: 700, color: "#1e293b", margin: 0 }}>Khách hàng xác nhận thanh toán</p>
                <p style={{ fontSize: "0.68rem", color: "#94a3b8", fontStyle: "italic", margin: "0.15rem 0 0 0" }}>
                  (Ký và ghi rõ họ tên)
                </p>
                <div style={{ height: "55px" }}></div>
                <p style={{ fontWeight: 600, color: "#475569", margin: 0 }}>
                  {booking.customerName || "........................................"}
                </p>
              </div>
              <div>
                <p style={{ fontWeight: 700, color: "#1e293b", margin: 0 }}>Đại diện Lễ tân / Kế toán</p>
                <p style={{ fontSize: "0.68rem", color: "#94a3b8", fontStyle: "italic", margin: "0.15rem 0 0 0" }}>
                  (Ký và đóng dấu)
                </p>
                <div style={{ height: "55px" }}></div>
                <p style={{ fontWeight: 600, color: "#475569", margin: 0 }}>
                  ........................................
                </p>
              </div>
            </div>

            {/* Footer bản in */}
            <div
              style={{
                marginTop: "1.5rem",
                paddingTop: "0.65rem",
                borderTop: "1px dashed #cbd5e1",
                textAlign: "center",
                fontSize: "0.68rem",
                color: "#94a3b8",
              }}
            >
              e-Hotel Online Management System — Kính chúc Quý khách một chuyến đi vui vẻ & hẹn gặp lại!
            </div>
          </div>
        </div>

        {/* Footer Modal (Không in) */}
        <div
          className="no-print"
          style={{
            backgroundColor: "#f1f5f9",
            padding: "0.85rem 1.75rem",
            borderTop: "1px solid #e2e8f0",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <span style={{ fontSize: "0.75rem", color: "#64748b" }}>
            Khuyến nghị: Chọn máy in hoặc Lưu dưới dạng PDF (Save as PDF) với khổ giấy A4
          </span>
          <div style={{ display: "flex", gap: "0.5rem" }}>
            <button
              onClick={onClose}
              style={{
                padding: "0.5rem 1rem",
                border: "1px solid #cbd5e1",
                backgroundColor: "#ffffff",
                color: "#334155",
                fontSize: "0.85rem",
                fontWeight: 600,
                borderRadius: "8px",
                cursor: "pointer",
                transition: "all 0.15s ease",
              }}
            >
              Đóng
            </button>
            <button
              onClick={handlePrint}
              style={{
                padding: "0.5rem 1.25rem",
                background: "linear-gradient(135deg, #059669 0%, #047857 100%)",
                color: "#ffffff",
                border: "none",
                fontSize: "0.85rem",
                fontWeight: 700,
                borderRadius: "8px",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: "0.4rem",
                boxShadow: "0 2px 6px rgba(5, 150, 105, 0.3)",
              }}
            >
              <Printer size={16} />
              <span>In Hóa Đơn</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
