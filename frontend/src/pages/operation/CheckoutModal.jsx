import React, { useState, useEffect } from "react";
import {
  X,
  LogOut,
  AlertCircle,
  CheckCircle,
  FileText,
  DollarSign,
  Bed,
  Tag,
  ShieldAlert,
  CreditCard,
  Building2,
  Calendar,
  Wallet,
} from "lucide-react";
import { apiRequest } from "../../api/client.js";
import { formatDateShort } from "../../utils/date.js";

const formatCurrency = (amount) => {
  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
  }).format(amount || 0);
};

export default function CheckoutModal({
  booking,
  onClose,
  onCheckoutSuccess,
}) {
  const [previewData, setPreviewData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState(null);

  // Tải bảng tính quyết toán hóa đơn (Preview Checkout)
  useEffect(() => {
    async function fetchPreview() {
      if (!booking || !booking.id) return;
      try {
        setLoading(true);
        setErrorMsg(null);
        const res = await apiRequest(`/api/operation/bookings/${booking.id}/checkout-preview`);
        if (res.success && res.data) {
          setPreviewData(res.data);
        }
      } catch (err) {
        setErrorMsg(err.message || "Không thể tải trước thông tin quyết toán.");
      } finally {
        setLoading(false);
      }
    }

    fetchPreview();
  }, [booking]);

  const handleConfirmCheckout = async () => {
    if (!booking || !booking.id) return;
    try {
      setSubmitting(true);
      setErrorMsg(null);
      const res = await apiRequest(`/api/operation/bookings/${booking.id}/check-out`, {
        method: "POST",
      });

      if (res.success && res.data) {
        if (onCheckoutSuccess) {
          onCheckoutSuccess(res.data);
        }
      }
    } catch (err) {
      setErrorMsg(err.message || "Không thể thực hiện thủ tục Check-out.");
    } finally {
      setSubmitting(false);
    }
  };

  if (!booking) return null;

  const breakdown = previewData?.breakdown || {};
  const rooms = previewData?.rooms || [];
  const services = previewData?.services || [];

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
          maxWidth: "640px",
          maxHeight: "92vh",
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
        {/* Header */}
        <div
          style={{
            background: "linear-gradient(135deg, #b45309 0%, #d97706 60%, #f59e0b 100%)",
            color: "#ffffff",
            padding: "1.25rem 1.75rem",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "0.85rem" }}>
            <div
              style={{
                width: "42px",
                height: "42px",
                borderRadius: "12px",
                background: "rgba(255, 255, 255, 0.2)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#ffffff",
              }}
            >
              <LogOut size={22} />
            </div>
            <div>
              <h3 style={{ fontSize: "1.15rem", fontWeight: 800, margin: 0, letterSpacing: "-0.01em" }}>
                Thủ Tục Check-out & Quyết Toán Hóa Đơn
              </h3>
              <p style={{ fontSize: "0.8rem", color: "rgba(255, 255, 255, 0.85)", margin: "0.2rem 0 0 0" }}>
                Đơn #{booking.bookingNumber} — Khách hàng: {booking.customerName}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            style={{
              background: "rgba(255, 255, 255, 0.15)",
              border: "none",
              borderRadius: "10px",
              padding: "0.5rem",
              color: "#ffffff",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        {loading ? (
          <div style={{ padding: "3rem", textAlign: "center", color: "var(--text-muted)" }}>
            <div
              style={{
                width: "36px",
                height: "36px",
                border: "3px solid #e2e8f0",
                borderTopColor: "#d97706",
                borderRadius: "50%",
                margin: "0 auto 1rem",
                animation: "spin 1s linear infinite",
              }}
            />
            <p style={{ fontSize: "0.875rem", fontWeight: 600 }}>Đang tải bảng tính quyết toán tài chính Check-out...</p>
          </div>
        ) : (
          <div style={{ padding: "1.5rem", overflowY: "auto", flex: 1, display: "flex", flexDirection: "column", gap: "1.25rem", color: "#0f172a" }}>
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

            {/* Tóm tắt thông tin phòng & khách */}
            <div
              style={{
                background: "#f8fafc",
                border: "1px solid #e2e8f0",
                borderRadius: "12px",
                padding: "1rem",
                fontSize: "0.8125rem",
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: "0.75rem",
              }}
            >
              <div>
                <span style={{ color: "#64748b", display: "block" }}>Khách đại diện:</span>
                <span style={{ fontWeight: 800, fontSize: "0.9375rem", color: "#0f172a" }}>{booking.customerName}</span>
                <span style={{ color: "#64748b", display: "block", fontFamily: "monospace" }}>{booking.customerPhone}</span>
              </div>
              <div>
                <span style={{ color: "#64748b", display: "block" }}>Lịch trình lưu trú:</span>
                <span style={{ fontWeight: 700, color: "#0f172a" }}>
                  {formatDateShort(booking.fromDate)} → {formatDateShort(booking.toDate)}
                </span>
                <span style={{ color: "#2563eb", fontWeight: 800, display: "block" }}>
                  {previewData?.booking?.nights || booking.nights || 1} đêm
                </span>
              </div>
              <div style={{ gridColumn: "span 2", paddingTop: "0.5rem", borderTop: "1px solid #e2e8f0" }}>
                <span style={{ color: "#64748b", display: "block", marginBottom: "0.35rem" }}>
                  Các phòng vật lý sẽ được giải phóng:
                </span>
                <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem" }}>
                  {rooms.map((r) => (
                    <span
                      key={r.roomId}
                      style={{
                        padding: "0.25rem 0.6rem",
                        background: "#ffffff",
                        border: "1px solid #cbd5e1",
                        borderRadius: "6px",
                        fontWeight: 700,
                        color: "#2563eb",
                        fontSize: "0.75rem",
                      }}
                    >
                      Phòng {r.roomId} ({r.type} {r.size})
                    </span>
                  ))}
                </div>
              </div>
            </div>

            {/* Chi tiết các khoản quyết toán */}
            <div style={{ display: "flex", flexDirection: "column", gap: "0.6rem" }}>
              <h4 style={{ fontSize: "0.75rem", fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.05em", color: "#475569", margin: 0 }}>
                Chi Tiết Các Khoản Quyết Toán
              </h4>

              {/* 1. Tiền phòng */}
              <div style={{ padding: "0.75rem 1rem", background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: "10px", display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "0.8125rem" }}>
                <div>
                  <span style={{ fontWeight: 700, color: "#0f172a" }}>1. Tiền phòng lưu trú:</span>
                  <span style={{ fontSize: "0.75rem", color: "#64748b", display: "block" }}>Đã áp dụng chiết khấu khuyến mãi (nếu có)</span>
                </div>
                <span style={{ fontWeight: 800, fontSize: "0.9375rem" }}>
                  {formatCurrency(breakdown.netRoomFee)}
                </span>
              </div>

              {/* 2. Phụ thu trẻ em */}
              <div style={{ padding: "0.75rem 1rem", background: "rgba(245, 158, 11, 0.08)", border: "1px solid rgba(245, 158, 11, 0.25)", borderRadius: "10px", display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "0.8125rem" }}>
                <div>
                  <span style={{ fontWeight: 700, color: "#92400e" }}>2. Phụ thu trẻ em vượt tiêu chuẩn:</span>
                  <span style={{ fontSize: "0.75rem", color: "#b45309", display: "block" }}>
                    {breakdown.extraChildrenFee > 0 ? "Tự động tính theo công thức SPEC 4.4 lúc Check-in" : "Không phát sinh phụ thu"}
                  </span>
                </div>
                <span style={{ fontWeight: 800, fontSize: "0.9375rem", color: "#92400e" }}>
                  +{formatCurrency(breakdown.extraChildrenFee)}
                </span>
              </div>

              {/* 3. Phí dịch vụ */}
              <div style={{ padding: "0.75rem 1rem", background: "rgba(59, 130, 246, 0.06)", border: "1px solid rgba(59, 130, 246, 0.2)", borderRadius: "10px", fontSize: "0.8125rem" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div>
                    <span style={{ fontWeight: 700, color: "#1e40af" }}>3. Phí dịch vụ phát sinh:</span>
                    <span style={{ fontSize: "0.75rem", color: "#2563eb", display: "block" }}>{services.length} phiếu dịch vụ đã xuất</span>
                  </div>
                  <span style={{ fontWeight: 800, fontSize: "0.9375rem", color: "#1e40af" }}>
                    +{formatCurrency(breakdown.totalServiceFee)}
                  </span>
                </div>

                {services.length > 0 && (
                  <div style={{ marginTop: "0.5rem", paddingTop: "0.5rem", borderTop: "1px solid rgba(59, 130, 246, 0.15)", display: "flex", flexDirection: "column", gap: "0.25rem" }}>
                    {services.map((s) => (
                      <div key={s.ticketId} style={{ display: "flex", justifyContent: "space-between", fontSize: "0.75rem", color: "#1e40af" }}>
                        <span>
                          • {s.serviceName} ({s.quantity} {s.unit}) - Phòng {s.roomId} [{s.ticketId}]
                          {s.isPaid && (
                            <span style={{ marginLeft: "6px", padding: "1px 5px", borderRadius: "4px", background: "rgba(16, 185, 129, 0.2)", color: "#065f46", fontWeight: 700, fontSize: "0.7rem" }}>
                              Đã trừ ví
                            </span>
                          )}
                        </span>
                        <span style={{ fontWeight: 700 }}>{formatCurrency(s.totalPrice)}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Box Tổng kết & Số tiền phải thu */}
            <div
              style={{
                background: "linear-gradient(135deg, #0f172a 0%, #1e293b 100%)",
                color: "#ffffff",
                borderRadius: "14px",
                padding: "1.25rem",
                display: "flex",
                flexDirection: "column",
                gap: "0.5rem",
                fontSize: "0.8125rem",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", color: "#94a3b8" }}>
                <span>Tổng giá trị đơn & dịch vụ (Total Invoice):</span>
                <span style={{ fontWeight: 700, color: "#ffffff", fontSize: "0.9375rem" }}>
                  {formatCurrency(breakdown.totalInvoiceAmount)}
                </span>
              </div>

              <div style={{ display: "flex", justifyContent: "space-between", color: "#34d399" }}>
                <span>Khấu trừ số tiền khách đã trả trước (Online Prepaid):</span>
                <span style={{ fontWeight: 700, fontSize: "0.9375rem" }}>
                  -{formatCurrency(breakdown.prepaidBookingValue)}
                </span>
              </div>

              {breakdown.walletPaidAmount > 0 && (
                <div style={{ display: "flex", justifyContent: "space-between", color: "#38bdf8" }}>
                  <span>Khấu trừ phí dịch vụ đã thanh toán qua Ví (Auto-Debit):</span>
                  <span style={{ fontWeight: 700, fontSize: "0.9375rem" }}>
                    -{formatCurrency(breakdown.walletPaidAmount)}
                  </span>
                </div>
              )}

              <div style={{ paddingTop: "0.6rem", borderTop: "1px solid #334155", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontWeight: 800, fontSize: "0.875rem", color: "#fef08a", textTransform: "uppercase" }}>
                  SỐ TIỀN CÒN LẠI CẦN THU TẠI QUẦY:
                </span>
                <span style={{ fontWeight: 900, fontSize: "1.35rem", color: "#fef08a", letterSpacing: "-0.01em" }}>
                  {formatCurrency(breakdown.remainingPayable)}
                </span>
              </div>
            </div>

            <div
              style={{
                padding: "0.75rem 1rem",
                borderRadius: "10px",
                background: "rgba(245, 158, 11, 0.08)",
                border: "1px solid rgba(245, 158, 11, 0.25)",
                fontSize: "0.775rem",
                color: "#92400e",
                display: "flex",
                alignItems: "flex-start",
                gap: "0.5rem",
              }}
            >
              <ShieldAlert size={16} style={{ flexShrink: 0, marginTop: "2px" }} />
              <span>
                <strong>Lưu ý:</strong> Sau khi xác nhận Check-out, đơn đặt phòng sẽ chuyển sang <strong>CHECKED_OUT</strong>, tất cả phòng vật lý sẽ tự động chuyển về <strong>AVAILABLE</strong> và hệ thống sẽ mở giao diện in hóa đơn chuẩn A4.
              </span>
            </div>

            {/* Actions */}
            <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.75rem", marginTop: "0.25rem" }}>
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
                type="button"
                onClick={handleConfirmCheckout}
                disabled={submitting}
                className="btn btn-primary"
                style={{
                  padding: "0.7rem 1.5rem",
                  fontSize: "0.875rem",
                  background: "linear-gradient(135deg, #d97706 0%, #b45309 100%)",
                  boxShadow: "0 4px 14px rgba(217, 119, 6, 0.4)",
                  display: "flex",
                  alignItems: "center",
                  gap: "0.5rem",
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
                    <span>Đang quyết toán...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle size={16} />
                    <span>Xác Nhận Quyết Toán & Check-out</span>
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
