import React, { useEffect } from "react";
import {
  Printer,
  X,
  CheckCircle,
  Tag,
  Building2,
  Phone,
  Mail,
  User,
  Bed,
  Calendar,
  CreditCard,
  ShieldCheck,
} from "lucide-react";
import { formatDateTimeDisplay } from "../../utils/date.js";

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

export default function ServiceTicketPrintModal({ ticket, onClose, autoPrint = false }) {
  useEffect(() => {
    if (autoPrint) {
      const timer = setTimeout(() => {
        window.print();
      }, 400);
      return () => clearTimeout(timer);
    }
  }, [autoPrint]);

  if (!ticket) return null;

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
      {/* CSS chuyên dụng in ấn khổ A4/A5 */}
      <style>{`
        @media print {
          body * {
            visibility: hidden !important;
          }
          #printable-ticket, #printable-ticket * {
            visibility: visible !important;
          }
          #printable-ticket {
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
          maxWidth: "680px",
          background: "#ffffff",
          borderRadius: "20px",
          border: "1px solid var(--border-color)",
          boxShadow: "0 25px 60px -15px rgba(0, 0, 0, 0.3), 0 0 0 1px rgba(0, 0, 0, 0.05)",
          overflow: "hidden",
          maxHeight: "94vh",
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
            background: "linear-gradient(135deg, #0f172a 0%, #1e293b 100%)",
            color: "#ffffff",
            padding: "1rem 1.75rem",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            borderBottom: "1px solid rgba(255, 255, 255, 0.1)",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "0.85rem" }}>
            <div
              style={{
                width: "40px",
                height: "40px",
                borderRadius: "10px",
                background: "var(--primary-gradient)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#ffffff",
                boxShadow: "0 4px 12px rgba(79, 70, 229, 0.3)",
              }}
            >
              <Printer size={20} />
            </div>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                <h3 style={{ fontSize: "1.1rem", fontWeight: 800, margin: 0 }}>
                  Phiếu Dịch Vụ Khách Sạn
                </h3>
                <span
                  style={{
                    fontSize: "0.65rem",
                    padding: "0.15rem 0.5rem",
                    borderRadius: "6px",
                    background: "rgba(16, 185, 129, 0.2)",
                    color: "#6ee7b7",
                    border: "1px solid rgba(16, 185, 129, 0.4)",
                    fontWeight: 700,
                  }}
                >
                  XUẤT BẢN IN
                </span>
              </div>
              <p style={{ fontSize: "0.775rem", color: "#94a3b8", margin: "0.15rem 0 0 0" }}>
                Xem trước & xuất bản in chuẩn A5/A4 bàn giao cho khách
              </p>
            </div>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
            <button
              type="button"
              onClick={handlePrint}
              className="btn btn-primary"
              style={{
                padding: "0.55rem 1.15rem",
                fontSize: "0.8125rem",
                display: "flex",
                alignItems: "center",
                gap: "0.45rem",
              }}
            >
              <Printer size={16} />
              <span>In Phiếu (Print)</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              style={{
                background: "rgba(255, 255, 255, 0.1)",
                border: "none",
                borderRadius: "8px",
                padding: "0.5rem",
                color: "#94a3b8",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                transition: "all 0.2s",
              }}
              title="Đóng"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Nội dung Phiếu Dịch Vụ - Có thể in */}
        <div style={{ padding: "1.5rem", overflowY: "auto", flex: 1, background: "#f8fafc", display: "flex", justifyContent: "center" }}>
          <div
            id="printable-ticket"
            style={{
              background: "#ffffff",
              border: "1px solid #cbd5e1",
              borderRadius: "16px",
              padding: "2rem",
              maxWidth: "600px",
              width: "100%",
              boxShadow: "0 4px 20px rgba(0, 0, 0, 0.05)",
              color: "#0f172a",
              fontFamily: "var(--font-family)",
            }}
          >
            {/* Header thương hiệu Khách Sạn */}
            <div style={{ borderBottom: "2px solid #0f172a", paddingBottom: "1rem", marginBottom: "1.25rem" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
                    <h1 style={{ fontSize: "1.25rem", fontWeight: 900, textTransform: "uppercase", letterSpacing: "-0.01em", color: "#0f172a", margin: 0 }}>
                      e-Hotel Luxury Resort & Spa
                    </h1>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: "0.3rem", marginTop: "0.2rem" }}>
                    <span style={{ color: "#f59e0b", fontSize: "0.85rem" }}>★★★★★</span>
                    <span style={{ fontSize: "0.75rem", color: "#64748b", fontWeight: 600 }}>Tiêu chuẩn 5 sao quốc tế</span>
                  </div>
                  <p style={{ fontSize: "0.75rem", color: "#64748b", margin: "0.35rem 0 0 0" }}>
                    Hotline: <strong>1900 8888</strong> • Email: reception@ehotel.local • Web: ehotel.local
                  </p>
                </div>

                <div style={{ textAlign: "right" }}>
                  <span
                    style={{
                      display: "inline-block",
                      padding: "0.35rem 0.75rem",
                      borderRadius: "6px",
                      background: "#f1f5f9",
                      border: "1px solid #cbd5e1",
                      fontFamily: "monospace",
                      fontWeight: 800,
                      fontSize: "0.875rem",
                      color: "#1e293b",
                    }}
                  >
                    {ticket.ticketId}
                  </span>
                  <p style={{ fontSize: "0.75rem", color: "#64748b", margin: "0.35rem 0 0 0" }}>
                    Ngày lập: {formatDateTime(ticket.createdAt)}
                  </p>
                </div>
              </div>
            </div>

            {/* Tiêu đề Phiếu */}
            <div style={{ textAlign: "center", margin: "1.25rem 0" }}>
              <h2 style={{ fontSize: "1.25rem", fontWeight: 900, textTransform: "uppercase", letterSpacing: "0.05em", color: "#0f172a", margin: 0 }}>
                PHIẾU SỬ DỤNG DỊCH VỤ PHÒNG
              </h2>
              <p style={{ fontSize: "0.75rem", fontStyle: "italic", color: "#64748b", margin: "0.25rem 0 0 0" }}>
                (Room Service Order & Charge Voucher)
              </p>
            </div>

            {/* Thông tin phòng & khách hàng */}
            <div
              style={{
                background: "#f8fafc",
                border: "1px solid #e2e8f0",
                borderRadius: "10px",
                padding: "1rem",
                marginBottom: "1.25rem",
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: "0.75rem",
                fontSize: "0.8125rem",
              }}
            >
              <div>
                <span style={{ color: "#64748b", display: "block" }}>Số phòng lưu trú:</span>
                <span style={{ fontWeight: 800, fontSize: "1rem", color: "#2563eb" }}>
                  Phòng {ticket.roomId}
                </span>
                {ticket.roomType && (
                  <span style={{ color: "#64748b", fontSize: "0.75rem", display: "block" }}>
                    ({ticket.roomType} - {ticket.roomSize})
                  </span>
                )}
              </div>

              <div>
                <span style={{ color: "#64748b", display: "block" }}>Mã đơn đặt phòng:</span>
                <span style={{ fontWeight: 700, color: "#1e293b", fontFamily: "monospace" }}>
                  {ticket.bookingNumber || `BK-#${ticket.bookingId}`}
                </span>
              </div>

              <div>
                <span style={{ color: "#64748b", display: "block" }}>Khách hàng sử dụng:</span>
                <span style={{ fontWeight: 700, color: "#0f172a" }}>
                  {ticket.customerName || "Khách lưu trú"}
                </span>
              </div>

              <div>
                <span style={{ color: "#64748b", display: "block" }}>Số điện thoại liên hệ:</span>
                <span style={{ fontWeight: 600, color: "#1e293b", fontFamily: "monospace" }}>
                  {ticket.customerPhone || "---"}
                </span>
              </div>
            </div>

            {/* Bảng chi tiết dịch vụ */}
            <div style={{ marginBottom: "1.25rem" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.8125rem" }}>
                <thead>
                  <tr style={{ borderBottom: "2px solid #0f172a", background: "#f1f5f9", textAlign: "left" }}>
                    <th style={{ padding: "0.6rem 0.75rem", fontWeight: 800, textAlign: "center", width: "40px" }}>STT</th>
                    <th style={{ padding: "0.6rem 0.75rem", fontWeight: 800 }}>Tên dịch vụ</th>
                    <th style={{ padding: "0.6rem 0.75rem", fontWeight: 800, textAlign: "center", width: "60px" }}>ĐVT</th>
                    <th style={{ padding: "0.6rem 0.75rem", fontWeight: 800, textAlign: "center", width: "50px" }}>SL</th>
                    <th style={{ padding: "0.6rem 0.75rem", fontWeight: 800, textAlign: "right", width: "100px" }}>Đơn giá</th>
                    <th style={{ padding: "0.6rem 0.75rem", fontWeight: 800, textAlign: "right", width: "110px" }}>Thành tiền</th>
                  </tr>
                </thead>
                <tbody>
                  <tr style={{ borderBottom: "1px solid #e2e8f0" }}>
                    <td style={{ padding: "0.75rem", textAlign: "center", fontWeight: 600, color: "#64748b" }}>1</td>
                    <td style={{ padding: "0.75rem" }}>
                      <div style={{ fontWeight: 800, color: "#0f172a" }}>{ticket.serviceName}</div>
                      {ticket.description && (
                        <div style={{ fontSize: "0.75rem", color: "#64748b", marginTop: "2px" }}>
                          {ticket.description}
                        </div>
                      )}
                      <div style={{ fontSize: "0.7rem", color: "#94a3b8", fontFamily: "monospace" }}>
                        Mã DV: {ticket.serviceId}
                      </div>
                    </td>
                    <td style={{ padding: "0.75rem", textAlign: "center" }}>{ticket.unit}</td>
                    <td style={{ padding: "0.75rem", textAlign: "center", fontWeight: 800 }}>{ticket.quantity}</td>
                    <td style={{ padding: "0.75rem", textAlign: "right" }}>{formatCurrency(ticket.unitPrice)}</td>
                    <td style={{ padding: "0.75rem", textAlign: "right", fontWeight: 800, color: "#2563eb" }}>
                      {formatCurrency(ticket.totalPrice)}
                    </td>
                  </tr>
                </tbody>
                <tfoot>
                  <tr style={{ borderTop: "2px solid #0f172a", background: "#f8fafc" }}>
                    <td colSpan="5" style={{ padding: "0.75rem", textAlign: "right", fontWeight: 800 }}>
                      TỔNG CỘNG TIỀN DỊCH VỤ:
                    </td>
                    <td style={{ padding: "0.75rem", textAlign: "right", fontWeight: 900, fontSize: "1rem", color: "#1e1b4b" }}>
                      {formatCurrency(ticket.totalPrice)}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>

            {/* Trạng thái thanh toán & Lưu ý */}
            {ticket.isPaid ? (
              <div
                style={{
                  background: "rgba(16, 185, 129, 0.08)",
                  border: "1px solid rgba(16, 185, 129, 0.3)",
                  borderRadius: "10px",
                  padding: "0.85rem 1rem",
                  fontSize: "0.8125rem",
                  color: "#065f46",
                  marginBottom: "1.5rem",
                  display: "flex",
                  alignItems: "center",
                  gap: "0.6rem",
                }}
              >
                <ShieldCheck size={20} color="#059669" style={{ flexShrink: 0 }} />
                <div>
                  <strong style={{ display: "block" }}>ĐÃ THANH TOÁN QUA VÍ NỘI BỘ (AUTO-DEBIT)</strong>
                  Khoản tiền đã được khấu trừ tự động từ Ví e-Hotel của Quý khách. Hóa đơn Check-out sẽ tự động giảm trừ tương ứng.
                </div>
              </div>
            ) : (
              <div
                style={{
                  background: "rgba(245, 158, 11, 0.08)",
                  border: "1px solid rgba(245, 158, 11, 0.3)",
                  borderRadius: "10px",
                  padding: "0.85rem 1rem",
                  fontSize: "0.8125rem",
                  color: "#92400e",
                  marginBottom: "1.5rem",
                  display: "flex",
                  alignItems: "center",
                  gap: "0.6rem",
                }}
              >
                <Tag size={20} color="#d97706" style={{ flexShrink: 0 }} />
                <div>
                  <strong style={{ display: "block" }}>GHI NHẬN HỒ SƠ PHÒNG (FOLIO)</strong>
                  Khoản phí dịch vụ này đã được ghi nợ vào đơn đặt phòng và sẽ quyết toán khi Quý khách làm thủ tục Check-out.
                </div>
              </div>
            )}

            {/* Chữ ký xác nhận */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "2rem", textAlign: "center", fontSize: "0.8125rem", paddingTop: "0.75rem", borderTop: "1px solid #e2e8f0" }}>
              <div>
                <p style={{ fontWeight: 800, color: "#0f172a", margin: 0 }}>Khách hàng xác nhận</p>
                <p style={{ fontSize: "0.7rem", color: "#94a3b8", fontStyle: "italic", margin: "2px 0 0 0" }}>(Ký và ghi rõ họ tên)</p>
                <div style={{ height: "60px" }}></div>
                <p style={{ fontWeight: 600, color: "#334155", margin: 0 }}>
                  {ticket.customerName || "........................................"}
                </p>
              </div>

              <div>
                <p style={{ fontWeight: 800, color: "#0f172a", margin: 0 }}>Nhân viên / Lễ tân thực hiện</p>
                <p style={{ fontSize: "0.7rem", color: "#94a3b8", fontStyle: "italic", margin: "2px 0 0 0" }}>(Ký và ghi rõ họ tên)</p>
                <div style={{ height: "60px" }}></div>
                <p style={{ fontWeight: 600, color: "#334155", margin: 0 }}>
                  ........................................
                </p>
              </div>
            </div>

            {/* Footer bản in */}
            <div style={{ marginTop: "1.5rem", paddingTop: "0.75rem", borderTop: "1px dashed #cbd5e1", textAlign: "center", fontSize: "0.7rem", color: "#94a3b8" }}>
              e-Hotel Online Management System — Kính chúc Quý khách một kỳ nghỉ tuyệt vời & tràn đầy niềm vui!
            </div>
          </div>
        </div>

        {/* Footer Modal (Không in) */}
        <div
          className="no-print"
          style={{
            background: "#f1f5f9",
            padding: "0.85rem 1.75rem",
            borderTop: "1px solid #e2e8f0",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <span style={{ fontSize: "0.75rem", color: "#64748b" }}>
            Khuyến nghị: Chọn máy in hoặc Lưu dưới dạng PDF (Save as PDF) với khổ A5/A4
          </span>
          <div style={{ display: "flex", gap: "0.5rem" }}>
            <button
              type="button"
              onClick={onClose}
              className="btn btn-secondary"
              style={{ padding: "0.5rem 1rem", fontSize: "0.8125rem" }}
            >
              Đóng
            </button>
            <button
              type="button"
              onClick={handlePrint}
              className="btn btn-primary"
              style={{
                padding: "0.5rem 1.25rem",
                fontSize: "0.8125rem",
                display: "flex",
                alignItems: "center",
                gap: "0.45rem",
              }}
            >
              <Printer size={16} />
              <span>In Ngay</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
