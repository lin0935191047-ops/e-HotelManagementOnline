import React, { useState, useEffect } from "react";
import {
  X,
  CreditCard,
  Tag,
  Trash2,
  Plus,
  Minus,
  Calendar,
  User,
  Phone,
  Mail,
  FileText,
  AlertCircle,
  CheckCircle,
  Check,
  Copy,
  ShieldCheck,
  ArrowRight,
  Sparkles,
  Bed,
  Search,
} from "lucide-react";
import { apiRequest } from "../../api/client.js";

// Định dạng tiền tệ VND
const formatCurrency = (amount) => {
  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
  }).format(amount || 0);
};

// Định dạng ngày
const formatDate = (dateStr) => {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  return d.toLocaleDateString("vi-VN", {
    weekday: "short",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
};

export default function BookingCheckoutModal({
  cartItems,
  fromDate,
  toDate,
  nights,
  onClose,
  onUpdateCartItemQuantity,
  onRemoveCartItem,
  onBookingSuccess,
  onOpenLookup,
}) {
  // Step: "form" (nhập thông tin & thanh toán) hoặc "success" (đặt phòng thành công)
  const [step, setStep] = useState("form");

  // Form khách hàng
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [customerCccd, setCustomerCccd] = useState("");

  // Khuyến mãi
  const [promotionCode, setPromotionCode] = useState("");
  const [appliedPromotion, setAppliedPromotion] = useState(null);
  const [discountAmount, setDiscountAmount] = useState(0);
  const [applyingPromo, setApplyingPromo] = useState(false);
  const [promoError, setPromoError] = useState(null);

  // Hình thức thanh toán: "FULL_100" hoặc "DEPOSIT_50"
  const [paymentOption, setPaymentOption] = useState("FULL_100");

  // Tài khoản thanh toán giả lập
  const [paymentAccountNumber, setPaymentAccountNumber] = useState("97040001");
  const [mockAccounts, setMockAccounts] = useState([]);

  // Trạng thái xử lý
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Dữ liệu booking hoàn tất
  const [completedBookingData, setCompletedBookingData] = useState(null);
  const [copied, setCopied] = useState(false);

  // Tính tổng tiền phòng gốc
  const totalRoomFee = cartItems.reduce(
    (sum, item) => sum + item.quantity * item.unitPrice * nights,
    0,
  );

  // Tiền phòng sau giảm
  const netRoomFee = Math.max(0, totalRoomFee - discountAmount);

  // Tiền cần thanh toán ngay
  const prepaidBookingValue =
    paymentOption === "DEPOSIT_50" ? Math.round(netRoomFee * 0.5) : netRoomFee;
  const remainingPayable = netRoomFee - prepaidBookingValue;

  // Tải danh sách tài khoản test giả lập khi mở modal
  useEffect(() => {
    async function loadMockAccounts() {
      try {
        const res = await apiRequest("/api/public/payment-accounts");
        if (res.success && Array.isArray(res.data)) {
          setMockAccounts(res.data);
          if (res.data.length > 0) {
            setPaymentAccountNumber(res.data[0].accountNumber);
          }
        }
      } catch {
        // Sử dụng tài khoản mặc định nếu không gọi được API
      }
    }
    loadMockAccounts();
  }, []);

  // Xử lý áp dụng mã khuyến mãi
  const handleApplyPromotion = async () => {
    if (!promotionCode || !promotionCode.trim()) {
      setPromoError("Vui lòng nhập mã khuyến mãi.");
      return;
    }

    try {
      setApplyingPromo(true);
      setPromoError(null);

      const res = await apiRequest("/api/public/promotions/apply", {
        method: "POST",
        body: JSON.stringify({
          code: promotionCode.trim(),
          totalRoomFee,
        }),
      });

      if (res.success && res.data) {
        setAppliedPromotion(res.data.promotion);
        setDiscountAmount(res.data.discountAmount);
      }
    } catch (err) {
      setAppliedPromotion(null);
      setDiscountAmount(0);
      setPromoError(err.message || "Mã khuyến mãi không hợp lệ.");
    } finally {
      setApplyingPromo(false);
    }
  };

  // Xóa mã khuyến mãi đã áp dụng
  const handleRemovePromotion = () => {
    setPromotionCode("");
    setAppliedPromotion(null);
    setDiscountAmount(0);
    setPromoError(null);
  };

  // Xử lý xác nhận đặt phòng và thanh toán giả lập
  const handleSubmitBooking = async (e) => {
    e.preventDefault();

    if (cartItems.length === 0) {
      setError("Giỏ hàng của bạn đang trống.");
      return;
    }

    if (!customerName.trim() || !customerPhone.trim() || !customerEmail.trim() || !customerCccd.trim()) {
      setError("Vui lòng điền đầy đủ các thông tin cá nhân bắt buộc.");
      return;
    }

    if (!paymentAccountNumber.trim()) {
      setError("Vui lòng cung cấp số tài khoản thanh toán giả lập.");
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const payload = {
        customerName: customerName.trim(),
        customerPhone: customerPhone.trim(),
        customerEmail: customerEmail.trim().toLowerCase(),
        customerCccd: customerCccd.trim(),
        fromDate,
        toDate,
        items: cartItems.map((it) => ({
          roomType: it.roomType,
          roomSize: it.roomSize,
          quantity: it.quantity,
        })),
        promotionCode: appliedPromotion ? appliedPromotion.code : undefined,
        paymentOption,
        paymentAccountNumber: paymentAccountNumber.trim(),
      };

      const res = await apiRequest("/api/public/bookings", {
        method: "POST",
        body: JSON.stringify(payload),
      });

      if (res.success && res.data) {
        setCompletedBookingData(res.data);
        setStep("success");
        if (onBookingSuccess) {
          onBookingSuccess(res.data);
        }
      }
    } catch (err) {
      setError(err.message || "Đã xảy ra lỗi trong quá trình đặt phòng & thanh toán.");
    } finally {
      setLoading(false);
    }
  };

  // Sao chép mã đặt phòng
  const handleCopyBookingNumber = () => {
    if (completedBookingData?.booking?.bookingNumber) {
      navigator.clipboard.writeText(completedBookingData.booking.bookingNumber);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  };

  return (
    <div className="modal-overlay" onClick={step === "form" ? onClose : undefined}>
      <div
        className="modal-content"
        onClick={(e) => e.stopPropagation()}
        style={{
          maxWidth: "850px",
          maxHeight: "92vh",
          overflowY: "auto",
          borderRadius: "20px",
          padding: "2rem",
          background: "var(--bg-secondary)",
          backdropFilter: "blur(25px)",
          border: "1px solid var(--border-color)",
          boxShadow: "0 25px 50px rgba(0, 0, 0, 0.15)",
        }}
      >
        {/* Header Modal */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: "1.5rem",
            paddingBottom: "1rem",
            borderBottom: "1px solid var(--border-color)",
          }}
        >
          <div>
            <h2
              style={{
                fontSize: "1.45rem",
                fontWeight: 800,
                display: "flex",
                alignItems: "center",
                gap: "0.5rem",
              }}
            >
              {step === "form" ? (
                <>
                  <CreditCard color="#6366f1" size={24} />
                  <span>Xác Nhận Giỏ Hàng & Thanh Toán Trực Tuyến</span>
                </>
              ) : (
                <>
                  <CheckCircle color="#10b981" size={26} />
                  <span style={{ color: "#34d399" }}>Đặt Phòng Thành Công!</span>
                </>
              )}
            </h2>
            <div style={{ fontSize: "0.8125rem", color: "var(--text-muted)", marginTop: "2px" }}>
              Kỳ lưu trú: {formatDate(fromDate)} đến {formatDate(toDate)} ({nights} đêm)
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            style={{
              background: "transparent",
              border: "none",
              color: "var(--text-muted)",
              cursor: "pointer",
              padding: "0.4rem",
            }}
          >
            <X size={22} />
          </button>
        </div>

        {/* TH1: Màn hình Đặt Phòng Thành Công (Success Step) */}
        {step === "success" && completedBookingData ? (
          <div>
            <div
              style={{
                textAlign: "center",
                padding: "2rem 1.5rem",
                background: "rgba(16, 185, 129, 0.08)",
                borderRadius: "16px",
                border: "1px solid rgba(16, 185, 129, 0.25)",
                marginBottom: "2rem",
              }}
            >
              <div
                style={{
                  width: "68px",
                  height: "68px",
                  borderRadius: "50%",
                  background: "linear-gradient(135deg, #10b981 0%, #059669 100%)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  margin: "0 auto 1.25rem",
                  boxShadow: "0 8px 20px rgba(16, 185, 129, 0.35)",
                }}
              >
                <Check size={36} color="white" />
              </div>

              <h3 style={{ fontSize: "1.5rem", fontWeight: 800, marginBottom: "0.5rem" }}>
                Giao Dịch Hoàn Tất & Đã Xác Nhận Phòng!
              </h3>
              <p style={{ color: "var(--text-muted)", fontSize: "0.9375rem", maxWidth: "560px", margin: "0 auto 1.5rem" }}>
                Cảm ơn quý khách <strong>{completedBookingData.booking.customerName}</strong>. Đơn đặt phòng của quý khách đã được hệ thống ghi nhận thành công và tự động trừ tiền vào tài khoản giả lập.
              </p>

              {/* Mã Booking Number */}
              <div
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "0.75rem",
                  padding: "0.75rem 1.5rem",
                  borderRadius: "12px",
                  background: "rgba(16, 185, 129, 0.08)",
                  border: "1px dashed #10b981",
                }}
              >
                <div>
                  <div style={{ fontSize: "0.75rem", color: "var(--text-dim)", textTransform: "uppercase" }}>
                    Mã Đặt Phòng Của Bạn
                  </div>
                  <div style={{ fontSize: "1.35rem", fontWeight: 800, color: "#059669", letterSpacing: "0.05em" }}>
                    {completedBookingData.booking.bookingNumber}
                  </div>
                </div>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={handleCopyBookingNumber}
                  style={{ padding: "0.4rem 0.75rem", fontSize: "0.75rem" }}
                  title="Sao chép mã đặt phòng"
                >
                  {copied ? <Check size={14} color="#10b981" /> : <Copy size={14} />}
                  <span>{copied ? "Đã chép" : "Chép mã"}</span>
                </button>
              </div>
            </div>

            {/* Chi tiết thanh toán & đơn hàng */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
                gap: "1.25rem",
                marginBottom: "2rem",
              }}
            >
              <div
                style={{
                  padding: "1.25rem",
                  background: "var(--bg-tertiary)",
                  borderRadius: "12px",
                  border: "1px solid var(--border-color)",
                }}
              >
                <h4 style={{ fontSize: "0.875rem", fontWeight: 700, color: "var(--text-dim)", marginBottom: "0.75rem", textTransform: "uppercase" }}>
                  Thông Tin Khách Hàng
                </h4>
                <div style={{ fontSize: "0.875rem", lineHeight: 1.8 }}>
                  <div><strong>Họ tên:</strong> {completedBookingData.booking.customerName}</div>
                  <div><strong>Số điện thoại:</strong> {completedBookingData.booking.customerPhone}</div>
                  <div><strong>Email:</strong> {completedBookingData.booking.customerEmail}</div>
                  <div><strong>CCCD/CMND:</strong> {completedBookingData.booking.customerCccd}</div>
                </div>
              </div>

              <div
                style={{
                  padding: "1.25rem",
                  background: "var(--bg-tertiary)",
                  borderRadius: "12px",
                  border: "1px solid var(--border-color)",
                }}
              >
                <h4 style={{ fontSize: "0.875rem", fontWeight: 700, color: "var(--text-dim)", marginBottom: "0.75rem", textTransform: "uppercase" }}>
                  Xác Nhận Thanh Toán Giả Lập
                </h4>
                <div style={{ fontSize: "0.875rem", lineHeight: 1.8 }}>
                  <div><strong>Tài khoản:</strong> {completedBookingData.payment.accountNumber} ({completedBookingData.payment.cardType})</div>
                  <div><strong>Chủ tài khoản:</strong> {completedBookingData.payment.accountHolder}</div>
                  <div>
                    <strong>Hình thức:</strong>{" "}
                    {completedBookingData.booking.paymentOption === "FULL_100" ? "Thanh toán 100%" : "Đặt cọc 50%"}
                  </div>
                  <div>
                    <strong>Đã thanh toán:</strong>{" "}
                    <span style={{ color: "#059669", fontWeight: 700 }}>
                      {formatCurrency(completedBookingData.payment.deductedAmount)}
                    </span>
                  </div>
                  {completedBookingData.booking.remainingPayable > 0 && (
                    <div style={{ color: "#b45309" }}>
                      <strong>Còn lại thanh toán tại quầy:</strong> {formatCurrency(completedBookingData.booking.remainingPayable)}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Danh sách phòng đã đặt */}
            <div
              style={{
                padding: "1.25rem",
                background: "var(--bg-tertiary)",
                borderRadius: "12px",
                border: "1px solid var(--border-color)",
                marginBottom: "2rem",
              }}
            >
              <h4 style={{ fontSize: "0.875rem", fontWeight: 700, color: "var(--text-dim)", marginBottom: "0.75rem", textTransform: "uppercase" }}>
                Danh Mục Phòng Đã Đặt
              </h4>
              {completedBookingData.booking.items.map((it, idx) => (
                <div
                  key={idx}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    padding: "0.5rem 0",
                    borderBottom: idx < completedBookingData.booking.items.length - 1 ? "1px solid var(--border-color)" : "none",
                    fontSize: "0.875rem",
                  }}
                >
                  <div>
                    <strong>{it.quantity} x {it.roomType} - {it.roomSize}</strong> ({formatCurrency(it.unitPrice)} / đêm)
                  </div>
                  <div style={{ fontWeight: 700 }}>{formatCurrency(it.subtotal)}</div>
                </div>
              ))}
            </div>

            {/* Lưu ý chính sách hủy phòng */}
            <div
              style={{
                padding: "1rem",
                borderRadius: "10px",
                background: "rgba(99, 102, 241, 0.1)",
                border: "1px solid rgba(99, 102, 241, 0.25)",
                color: "#c7d2fe",
                fontSize: "0.8125rem",
                marginBottom: "2rem",
                display: "flex",
                gap: "0.75rem",
              }}
            >
              <ShieldCheck size={20} style={{ flexShrink: 0 }} />
              <div>
                <strong>Chính sách hủy phòng (SPEC 4.3):</strong> Quý khách được phép hủy phòng trước thời điểm nhận phòng tối thiểu 24 giờ để được hoàn trả <strong>80%</strong> số tiền đã thanh toán vào tài khoản. Khách sạn giữ lại 20% phí hủy.
              </div>
            </div>

            <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.75rem", flexWrap: "wrap" }}>
              {onOpenLookup && (
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => {
                    onClose();
                    onOpenLookup(completedBookingData.booking.bookingNumber);
                  }}
                  style={{
                    padding: "0.75rem 1.5rem",
                    fontSize: "0.9375rem",
                    display: "flex",
                    alignItems: "center",
                    gap: "0.5rem",
                    borderColor: "rgba(99, 102, 241, 0.4)",
                    color: "#c7d2fe",
                  }}
                >
                  <Search size={16} />
                  <span>Tra Cứu & Quản Lý Đơn Này</span>
                </button>
              )}
              <button
                type="button"
                className="btn btn-primary"
                onClick={onClose}
                style={{ padding: "0.75rem 2rem", fontSize: "0.9375rem" }}
              >
                Hoàn Tất & Tiếp Tục
              </button>
            </div>
          </div>
        ) : (
          /* TH2: Form nhập thông tin & thanh toán */
          <form onSubmit={handleSubmitBooking}>
            {error && (
              <div
                style={{
                  padding: "1rem",
                  borderRadius: "10px",
                  background: "rgba(239, 68, 68, 0.15)",
                  border: "1px solid rgba(239, 68, 68, 0.35)",
                  color: "#fca5a5",
                  marginBottom: "1.5rem",
                  display: "flex",
                  alignItems: "center",
                  gap: "0.75rem",
                  fontSize: "0.875rem",
                }}
              >
                <AlertCircle size={20} />
                <span>{error}</span>
              </div>
            )}

            {/* 1. Danh sách phòng trong giỏ hàng */}
            <section style={{ marginBottom: "2rem" }}>
              <h3
                style={{
                  fontSize: "1rem",
                  fontWeight: 700,
                  marginBottom: "0.75rem",
                  color: "var(--text-main)",
                  display: "flex",
                  alignItems: "center",
                  gap: "0.4rem",
                }}
              >
                <Bed size={18} color="#6366f1" />
                <span>1. Hạng Phòng Đã Chọn ({cartItems.length} loại)</span>
              </h3>

              <div
                style={{
                  borderRadius: "12px",
                  border: "1px solid var(--border-color)",
                  overflow: "hidden",
                  background: "var(--bg-tertiary)",
                }}
              >
                {cartItems.map((item, idx) => (
                  <div
                    key={`${item.roomType}_${item.roomSize}`}
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      padding: "1rem 1.25rem",
                      borderBottom: idx < cartItems.length - 1 ? "1px solid var(--border-color)" : "none",
                      flexWrap: "wrap",
                      gap: "0.75rem",
                    }}
                  >
                    <div>
                      <div style={{ fontWeight: 700, fontSize: "0.9375rem", color: "var(--text-main)" }}>
                        {item.categoryName || `${item.roomType} ${item.roomSize}`}
                      </div>
                      <div style={{ fontSize: "0.8125rem", color: "var(--text-muted)" }}>
                        {formatCurrency(item.unitPrice)} / đêm • {nights} đêm lưu trú
                      </div>
                    </div>

                    <div style={{ display: "flex", alignItems: "center", gap: "1.25rem" }}>
                      {/* Tăng giảm số lượng */}
                      {onUpdateCartItemQuantity && (
                        <div
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            background: "var(--bg-card)",
                            borderRadius: "8px",
                            border: "1px solid var(--border-color)",
                          }}
                        >
                          <button
                            type="button"
                            onClick={() => onUpdateCartItemQuantity(item, -1)}
                            disabled={item.quantity <= 1}
                            style={{
                              background: "none",
                              border: "none",
                              color: item.quantity <= 1 ? "var(--text-dim)" : "var(--text-main)",
                              padding: "0.3rem 0.5rem",
                              cursor: item.quantity <= 1 ? "not-allowed" : "pointer",
                            }}
                          >
                            <Minus size={13} />
                          </button>
                          <span style={{ fontSize: "0.875rem", fontWeight: 700, minWidth: "1.5rem", textAlign: "center" }}>
                            {item.quantity}
                          </span>
                          <button
                            type="button"
                            onClick={() => onUpdateCartItemQuantity(item, 1)}
                            style={{
                              background: "none",
                              border: "none",
                              color: "var(--text-main)",
                              padding: "0.3rem 0.5rem",
                              cursor: "pointer",
                            }}
                          >
                            <Plus size={13} />
                          </button>
                        </div>
                      )}

                      {/* Thành tiền */}
                      <div style={{ fontSize: "1rem", fontWeight: 700, minWidth: "120px", textAlign: "right" }}>
                        {formatCurrency(item.quantity * item.unitPrice * nights)}
                      </div>

                      {/* Nút xóa */}
                      {onRemoveCartItem && (
                        <button
                          type="button"
                          onClick={() => onRemoveCartItem(item)}
                          style={{
                            background: "transparent",
                            border: "none",
                            color: "var(--text-dim)",
                            cursor: "pointer",
                            padding: "0.25rem",
                          }}
                          title="Xóa khỏi giỏ hàng"
                        >
                          <Trash2 size={16} />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </section>

            {/* 2. Form thông tin khách hàng */}
            <section style={{ marginBottom: "2rem" }}>
              <h3
                style={{
                  fontSize: "1rem",
                  fontWeight: 700,
                  marginBottom: "0.75rem",
                  color: "var(--text-main)",
                  display: "flex",
                  alignItems: "center",
                  gap: "0.4rem",
                }}
              >
                <User size={18} color="#6366f1" />
                <span>2. Thông Tin Khách Hàng (Người Đại Diện Đặt Phòng)</span>
              </h3>

              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: "1rem" }}>
                <div>
                  <label style={{ display: "block", fontSize: "0.8125rem", fontWeight: 600, marginBottom: "0.4rem" }}>
                    Họ và Tên Quý Khách *
                  </label>
                  <input
                    type="text"
                    className="input-field"
                    placeholder="Nguyễn Văn A"
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    required
                    style={{ width: "100%", padding: "0.7rem 0.9rem" }}
                  />
                </div>

                <div>
                  <label style={{ display: "block", fontSize: "0.8125rem", fontWeight: 600, marginBottom: "0.4rem" }}>
                    Số Điện Thoại Liên Hệ *
                  </label>
                  <input
                    type="tel"
                    className="input-field"
                    placeholder="0912345678"
                    value={customerPhone}
                    onChange={(e) => setCustomerPhone(e.target.value)}
                    required
                    style={{ width: "100%", padding: "0.7rem 0.9rem" }}
                  />
                </div>

                <div>
                  <label style={{ display: "block", fontSize: "0.8125rem", fontWeight: 600, marginBottom: "0.4rem" }}>
                    Địa Chỉ Email *
                  </label>
                  <input
                    type="email"
                    className="input-field"
                    placeholder="khachhang@ehotel.local"
                    value={customerEmail}
                    onChange={(e) => setCustomerEmail(e.target.value)}
                    required
                    style={{ width: "100%", padding: "0.7rem 0.9rem" }}
                  />
                </div>

                <div>
                  <label style={{ display: "block", fontSize: "0.8125rem", fontWeight: 600, marginBottom: "0.4rem" }}>
                    Số CCCD / CMND *
                  </label>
                  <input
                    type="text"
                    className="input-field"
                    placeholder="001200001234"
                    value={customerCccd}
                    onChange={(e) => setCustomerCccd(e.target.value)}
                    required
                    style={{ width: "100%", padding: "0.7rem 0.9rem" }}
                  />
                </div>
              </div>
            </section>

            {/* 3. Khuyến mãi & Chiết khấu */}
            <section style={{ marginBottom: "2rem" }}>
              <h3
                style={{
                  fontSize: "1rem",
                  fontWeight: 700,
                  marginBottom: "0.75rem",
                  color: "var(--text-main)",
                  display: "flex",
                  alignItems: "center",
                  gap: "0.4rem",
                }}
              >
                <Tag size={18} color="#ec4899" />
                <span>3. Mã Ưu Đãi & Khuyến Mãi</span>
              </h3>

              <div style={{ display: "flex", gap: "0.75rem", alignItems: "flex-start", flexWrap: "wrap" }}>
                <div style={{ flex: 1, minWidth: "220px" }}>
                  <input
                    type="text"
                    className="input-field"
                    placeholder="Nhập mã coupon (ví dụ: CHAOHET2026, SUMMER500K)"
                    value={promotionCode}
                    onChange={(e) => setPromotionCode(e.target.value.toUpperCase())}
                    disabled={appliedPromotion !== null}
                    style={{ width: "100%", padding: "0.7rem 0.9rem", textTransform: "uppercase" }}
                  />
                  {promoError && (
                    <div style={{ color: "#f87171", fontSize: "0.75rem", marginTop: "0.4rem" }}>
                      {promoError}
                    </div>
                  )}
                  {appliedPromotion && (
                    <div style={{ color: "#34d399", fontSize: "0.8125rem", marginTop: "0.4rem", display: "flex", alignItems: "center", gap: "0.3rem" }}>
                      <CheckCircle size={14} />
                      <span>
                        Đã áp dụng mã <strong>{appliedPromotion.code}</strong>: Giảm{" "}
                        {appliedPromotion.discountType === "PERCENTAGE" ? `${appliedPromotion.value}%` : formatCurrency(appliedPromotion.value)} (-{formatCurrency(discountAmount)})
                      </span>
                    </div>
                  )}
                </div>

                {appliedPromotion ? (
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={handleRemovePromotion}
                    style={{ padding: "0.7rem 1.25rem", height: "42px" }}
                  >
                    Hủy Mã
                  </button>
                ) : (
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={handleApplyPromotion}
                    disabled={applyingPromo || !promotionCode}
                    style={{ padding: "0.7rem 1.25rem", height: "42px" }}
                  >
                    {applyingPromo ? "Đang Kiểm Tra..." : "Áp Dụng"}
                  </button>
                )}
              </div>
            </section>

            {/* 4. Hình thức thanh toán */}
            <section style={{ marginBottom: "2rem" }}>
              <h3
                style={{
                  fontSize: "1rem",
                  fontWeight: 700,
                  marginBottom: "0.75rem",
                  color: "var(--text-main)",
                  display: "flex",
                  alignItems: "center",
                  gap: "0.4rem",
                }}
              >
                <Sparkles size={18} color="#f59e0b" />
                <span>4. Lựa Chọn Hình Thức Thanh Toán</span>
              </h3>

              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: "1rem" }}>
                {/* Option 1: Thanh toán 100% */}
                <div
                  onClick={() => setPaymentOption("FULL_100")}
                  style={{
                    padding: "1rem 1.25rem",
                    borderRadius: "12px",
                    border: paymentOption === "FULL_100" ? "2px solid #4f46e5" : "1px solid var(--border-color)",
                    background: paymentOption === "FULL_100" ? "rgba(79, 70, 229, 0.08)" : "var(--bg-tertiary)",
                    cursor: "pointer",
                    transition: "all 0.2s ease",
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.25rem" }}>
                    <strong style={{ fontSize: "0.9375rem" }}>Thanh Toán 100%</strong>
                    <input
                      type="radio"
                      name="paymentOption"
                      checked={paymentOption === "FULL_100"}
                      onChange={() => setPaymentOption("FULL_100")}
                    />
                  </div>
                  <p style={{ fontSize: "0.8125rem", color: "var(--text-muted)", marginBottom: "0.5rem" }}>
                    Thanh toán toàn bộ tiền phòng ngay lúc này. Không cần thanh toán thêm tiền phòng tại quầy.
                  </p>
                  <div style={{ fontSize: "1.1rem", fontWeight: 800, color: "#059669" }}>
                    {formatCurrency(netRoomFee)}
                  </div>
                </div>

                {/* Option 2: Đặt cọc 50% */}
                <div
                  onClick={() => setPaymentOption("DEPOSIT_50")}
                  style={{
                    padding: "1rem 1.25rem",
                    borderRadius: "12px",
                    border: paymentOption === "DEPOSIT_50" ? "2px solid #4f46e5" : "1px solid var(--border-color)",
                    background: paymentOption === "DEPOSIT_50" ? "rgba(79, 70, 229, 0.08)" : "var(--bg-tertiary)",
                    cursor: "pointer",
                    transition: "all 0.2s ease",
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.25rem" }}>
                    <strong style={{ fontSize: "0.9375rem" }}>Đặt Cọc 50%</strong>
                    <input
                      type="radio"
                      name="paymentOption"
                      checked={paymentOption === "DEPOSIT_50"}
                      onChange={() => setPaymentOption("DEPOSIT_50")}
                    />
                  </div>
                  <p style={{ fontSize: "0.8125rem", color: "var(--text-muted)", marginBottom: "0.5rem" }}>
                    Thanh toán trước 50% giá trị để giữ phòng. 50% còn lại thanh toán tại quầy khi Check-out.
                  </p>
                  <div style={{ fontSize: "1.1rem", fontWeight: 800, color: "#b45309" }}>
                    {formatCurrency(Math.round(netRoomFee * 0.5))}
                  </div>
                </div>
              </div>
            </section>

            {/* 5. Cổng giả lập thanh toán (Payment Simulator) */}
            <section
              style={{
                marginBottom: "2rem",
                padding: "1.25rem",
                borderRadius: "12px",
                background: "rgba(79, 70, 229, 0.05)",
                border: "1px solid rgba(79, 70, 229, 0.18)",
              }}
            >
              <h3
                style={{
                  fontSize: "1rem",
                  fontWeight: 700,
                  marginBottom: "0.5rem",
                  color: "#3730a3",
                  display: "flex",
                  alignItems: "center",
                  gap: "0.4rem",
                }}
              >
                <CreditCard size={18} />
                <span>5. Cổng Thanh Toán Giả Lập Trực Tuyến (Payment Simulator)</span>
              </h3>
              <p style={{ fontSize: "0.8125rem", color: "var(--text-muted)", marginBottom: "1rem" }}>
                Nhập số tài khoản thanh toán giả lập hoặc chọn nhanh tài khoản kiểm thử có sẵn dưới đây:
              </p>

              {/* Nút chọn nhanh tài khoản mẫu */}
              {mockAccounts.length > 0 && (
                <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap", marginBottom: "1rem" }}>
                  {mockAccounts.map((acc) => (
                    <button
                      key={acc.accountNumber}
                      type="button"
                      onClick={() => setPaymentAccountNumber(acc.accountNumber)}
                      style={{
                        padding: "0.5rem 0.85rem",
                        borderRadius: "8px",
                        fontSize: "0.8125rem",
                        cursor: "pointer",
                        border: paymentAccountNumber === acc.accountNumber ? "2px solid #4f46e5" : "1px solid var(--border-color)",
                        background: paymentAccountNumber === acc.accountNumber ? "rgba(79, 70, 229, 0.12)" : "var(--bg-card)",
                        color: "var(--text-main)",
                        textAlign: "left",
                      }}
                    >
                      <div style={{ fontWeight: 700 }}>
                        {acc.cardType} • {acc.accountNumber}
                      </div>
                      <div style={{ fontSize: "0.75rem", color: "var(--text-dim)" }}>
                        {acc.accountHolder} (Số dư: {formatCurrency(acc.balance)})
                      </div>
                    </button>
                  ))}
                </div>
              )}

              <div>
                <label style={{ display: "block", fontSize: "0.8125rem", fontWeight: 600, marginBottom: "0.4rem" }}>
                  Số Tài Khoản Thanh Toán *
                </label>
                <input
                  type="text"
                  className="input-field"
                  placeholder="Ví dụ: 97040001 hoặc 4000123456789010"
                  value={paymentAccountNumber}
                  onChange={(e) => setPaymentAccountNumber(e.target.value)}
                  required
                  style={{ width: "100%", padding: "0.7rem 0.9rem" }}
                />
              </div>
            </section>

            {/* Bảng tổng kết chi phí cuối cùng */}
            <div
              style={{
                padding: "1.25rem",
                borderRadius: "12px",
                background: "var(--bg-tertiary)",
                border: "1px solid var(--border-color)",
                marginBottom: "2rem",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.5rem", fontSize: "0.875rem" }}>
                <span style={{ color: "var(--text-muted)" }}>Tổng tiền phòng gốc ({nights} đêm):</span>
                <span>{formatCurrency(totalRoomFee)}</span>
              </div>

              {discountAmount > 0 && (
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.5rem", fontSize: "0.875rem", color: "#34d399" }}>
                  <span>Giảm giá khuyến mãi:</span>
                  <span>-{formatCurrency(discountAmount)}</span>
                </div>
              )}

              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.5rem", fontSize: "0.875rem" }}>
                <span style={{ color: "var(--text-muted)" }}>Tiền phòng sau giảm:</span>
                <span style={{ fontWeight: 700 }}>{formatCurrency(netRoomFee)}</span>
              </div>

              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  paddingTop: "0.75rem",
                  marginTop: "0.5rem",
                  borderTop: "1px solid var(--border-color)",
                  fontSize: "1.125rem",
                  fontWeight: 800,
                }}
              >
                <span>Số tiền thanh toán ngay:</span>
                <span style={{ color: "#34d399" }}>{formatCurrency(prepaidBookingValue)}</span>
              </div>

              {paymentOption === "DEPOSIT_50" && (
                <div style={{ fontSize: "0.8125rem", color: "#fbbf24", textAlign: "right", marginTop: "0.25rem" }}>
                  (Còn lại {formatCurrency(remainingPayable)} sẽ thanh toán tại khách sạn khi Check-out)
                </div>
              )}
            </div>

            {/* Nút hành động */}
            <div style={{ display: "flex", justifyContent: "flex-end", gap: "1rem" }}>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={onClose}
                disabled={loading}
                style={{ padding: "0.75rem 1.5rem" }}
              >
                Hủy Bỏ
              </button>

              <button
                type="submit"
                className="btn btn-primary"
                disabled={loading || cartItems.length === 0}
                style={{ padding: "0.75rem 2rem", fontSize: "0.9375rem" }}
              >
                {loading ? "Đang Xử Lý Giao Dịch..." : `Xác Nhận & Thanh Toán (${formatCurrency(prepaidBookingValue)})`}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
