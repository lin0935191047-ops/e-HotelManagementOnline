import React, { useState, useEffect } from "react";
import {
  Calendar,
  Search,
  Users,
  Baby,
  CheckCircle,
  AlertCircle,
  Info,
  ChevronRight,
  ShieldCheck,
  Coffee,
  Wifi,
  Sparkles,
  X,
  CreditCard,
  Plus,
  Minus,
  Bed,
  ShoppingCart,
  Trash2,
} from "lucide-react";
import { apiRequest } from "../../api/client.js";
import BookingCheckoutModal from "./BookingCheckoutModal.jsx";
import BookingLookupModal from "./BookingLookupModal.jsx";

// Định dạng tiền tệ VND
const formatCurrency = (amount) => {
  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
  }).format(amount || 0);
};

// Định dạng ngày hiển thị
const formatDateDisplay = (dateString) => {
  if (!dateString) return "";
  const d = new Date(dateString);
  return d.toLocaleDateString("vi-VN", {
    weekday: "short",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
};

// Lấy ngày hôm nay dạng YYYY-MM-DD
const getTodayString = () => {
  const today = new Date();
  return today.toISOString().split("T")[0];
};

// Lấy ngày mai dạng YYYY-MM-DD
const getTomorrowString = () => {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  return tomorrow.toISOString().split("T")[0];
};

export default function RoomCatalog({ onNavigateToLogin, onSelectRoomForBooking }) {
  // Bộ lọc tìm kiếm ngày và loại phòng
  const [fromDate, setFromDate] = useState(getTodayString());
  const [toDate, setToDate] = useState(getTomorrowString());
  const [selectedType, setSelectedType] = useState("");
  const [selectedSize, setSelectedSize] = useState("");

  // Dữ liệu tồn kho và phòng
  const [categories, setCategories] = useState([]);
  const [nights, setNights] = useState(1);
  const [totalAvailableRooms, setTotalAvailableRooms] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Modal xem chi tiết phòng
  const [detailModalCat, setDetailModalCat] = useState(null);
  const [activeImageIndex, setActiveImageIndex] = useState(0);

  // Số lượng phòng khách muốn chọn cho từng category trên từng thẻ
  const [quantities, setQuantities] = useState({});

  // Giỏ hàng đặt phòng (Shopping Cart)
  const [cartItems, setCartItems] = useState([]);
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);

  // Modal tra cứu & hủy đặt phòng (FEAT-08)
  const [isLookupOpen, setIsLookupOpen] = useState(false);
  const [lookupBookingNumber, setLookupBookingNumber] = useState("");

  // Toast thông báo thêm phòng thành công
  const [toastMessage, setToastMessage] = useState(null);

  // Hàm gọi API tra cứu tồn kho phòng
  const fetchAvailability = async (fDate = fromDate, tDate = toDate, type = selectedType, size = selectedSize) => {
    try {
      setLoading(true);
      setError(null);

      const params = new URLSearchParams({
        fromDate: fDate,
        toDate: tDate,
      });

      if (type) params.append("type", type);
      if (size) params.append("size", size);

      const res = await apiRequest(`/api/public/availability?${params.toString()}`);
      if (res.success && res.data) {
        setCategories(res.data.categories || []);
        setNights(res.data.searchQuery?.nights || 1);
        setTotalAvailableRooms(res.data.totalAvailableRooms || 0);

        // Khởi tạo số lượng chọn mặc định = 1 cho các phòng còn trống
        const initialQuantities = {};
        (res.data.categories || []).forEach((cat) => {
          const key = `${cat.type}_${cat.size}`;
          initialQuantities[key] = cat.availableQuota > 0 ? 1 : 0;
        });
        setQuantities(initialQuantities);
      }
    } catch (err) {
      setError(err.message || "Không thể tải dữ liệu phòng khả dụng.");
    } finally {
      setLoading(false);
    }
  };

  // Tải danh mục tồn kho ban đầu khi mở trang
  useEffect(() => {
    fetchAvailability();
  }, []);

  // Xử lý khi bấm nút "Tìm phòng trống"
  const handleSearch = (e) => {
    e.preventDefault();
    if (!fromDate || !toDate) {
      setError("Vui lòng chọn ngày nhận phòng và ngày trả phòng.");
      return;
    }
    if (new Date(toDate) <= new Date(fromDate)) {
      setError("Ngày trả phòng phải sau ngày nhận phòng tối thiểu 1 đêm.");
      return;
    }
    fetchAvailability(fromDate, toDate, selectedType, selectedSize);
  };

  // Tăng giảm số lượng phòng muốn đặt trên từng card
  const handleQuantityChange = (catKey, delta, maxQuota) => {
    setQuantities((prev) => {
      const current = prev[catKey] || 1;
      const nextVal = Math.max(1, Math.min(maxQuota, current + delta));
      return { ...prev, [catKey]: nextVal };
    });
  };

  // Thêm phòng vào giỏ hàng và mở modal thanh toán
  const handleAddToCart = (cat) => {
    const key = `${cat.type}_${cat.size}`;
    const qty = quantities[key] || 1;

    if (cat.availableQuota < qty) {
      setError(`Rất tiếc, hạng phòng này chỉ còn ${cat.availableQuota} phòng trống.`);
      return;
    }

    setCartItems((prevItems) => {
      const existingIdx = prevItems.findIndex(
        (it) => it.roomType === cat.type && it.roomSize === cat.size,
      );

      if (existingIdx >= 0) {
        // Cập nhật số lượng
        const updated = [...prevItems];
        const newQty = Math.min(cat.availableQuota, updated[existingIdx].quantity + qty);
        updated[existingIdx] = {
          ...updated[existingIdx],
          quantity: newQty,
        };
        return updated;
      } else {
        // Thêm mới vào giỏ
        return [
          ...prevItems,
          {
            roomType: cat.type,
            roomSize: cat.size,
            categoryName: cat.name,
            quantity: qty,
            unitPrice: cat.price,
            pictures: cat.pictures || [],
            maxAdults: cat.maxAdults,
            maxChildren: cat.maxChildren,
            extraChildFee: cat.extraChildFee,
          },
        ];
      }
    });

    setToastMessage(`Đã thêm ${qty} x ${cat.name} vào giỏ hàng.`);
    setTimeout(() => setToastMessage(null), 3500);

    // Mở modal thanh toán ngay để trải nghiệm mượt mà
    setIsCheckoutOpen(true);
  };

  // Cập nhật số lượng trong giỏ hàng
  const handleUpdateCartItemQuantity = (item, delta) => {
    setCartItems((prev) => {
      return prev
        .map((it) => {
          if (it.roomType === item.roomType && it.roomSize === item.roomSize) {
            const nextQty = it.quantity + delta;
            return nextQty > 0 ? { ...it, quantity: nextQty } : null;
          }
          return it;
        })
        .filter(Boolean);
    });
  };

  // Xóa mục khỏi giỏ hàng
  const handleRemoveCartItem = (item) => {
    setCartItems((prev) =>
      prev.filter(
        (it) => !(it.roomType === item.roomType && it.roomSize === item.roomSize),
      ),
    );
  };

  // Xử lý khi đặt phòng thành công
  const handleBookingSuccess = (bookingData) => {
    setCartItems([]);
    fetchAvailability(fromDate, toDate, selectedType, selectedSize);
    if (onSelectRoomForBooking) {
      onSelectRoomForBooking(bookingData);
    }
  };

  // Mở modal chi tiết
  const openDetailModal = (cat) => {
    setDetailModalCat(cat);
    setActiveImageIndex(0);
  };

  // Tổng tiền tạm tính trong giỏ hàng
  const cartTotalAmount = cartItems.reduce(
    (acc, it) => acc + it.quantity * it.unitPrice * nights,
    0,
  );
  const cartTotalRooms = cartItems.reduce((acc, it) => acc + it.quantity, 0);

  return (
    <div style={{ maxWidth: "1280px", margin: "0 auto", padding: "1.5rem 1rem", paddingBottom: cartItems.length > 0 ? "6rem" : "2rem" }}>
      {/* Toast thông báo */}
      {toastMessage && (
        <div
          style={{
            position: "fixed",
            bottom: "5rem",
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
            zIndex: 100,
            fontSize: "0.9375rem",
            fontWeight: 600,
            animation: "fadeIn 0.3s ease",
          }}
        >
          <CheckCircle size={20} />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Hero Header */}
      <section style={{ textAlign: "center", marginBottom: "2.5rem", padding: "1rem 0" }}>
        <div
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "0.5rem",
            padding: "0.35rem 1rem",
            borderRadius: "9999px",
            background: "rgba(79, 70, 229, 0.08)",
            border: "1px solid rgba(79, 70, 229, 0.2)",
            color: "#4338ca",
            fontSize: "0.8125rem",
            fontWeight: 600,
            marginBottom: "1rem",
          }}
        >
          <Sparkles size={14} />
          <span>Hệ Thống Đặt Phòng Trực Tuyến Thời Gian Thực</span>
        </div>

        <h1
          className="gradient-title"
          style={{
            fontSize: "2.75rem",
            fontWeight: 800,
            letterSpacing: "-0.03em",
            marginBottom: "0.75rem",
          }}
        >
          Trải Nghiệm Nghỉ Dưỡng Đẳng Cấp Tại e-Hotel
        </h1>
        <p style={{ color: "var(--text-muted)", fontSize: "1.0625rem", maxWidth: "680px", margin: "0 auto" }}>
          Khám phá danh mục phòng sang trọng, tiện nghi hiện đại và kiểm tra số lượng phòng trống theo thời gian thực với công nghệ khóa bi quan chống overbooking.
        </p>

        {/* Tiện ích nổi bật */}
        <div
          style={{
            display: "flex",
            justifyContent: "center",
            gap: "1.5rem",
            marginTop: "1.25rem",
            flexWrap: "wrap",
            fontSize: "0.875rem",
            color: "var(--text-muted)",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "0.35rem" }}>
            <Wifi size={16} color="#6366f1" /> Wifi Tốc Độ Cao
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "0.35rem" }}>
            <Coffee size={16} color="#f59e0b" /> Buffet Sáng 5 Sao
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "0.35rem" }}>
            <ShieldCheck size={16} color="#10b981" /> Hủy Phòng Linh Hoạt (Hoàn 80%)
          </div>
        </div>

        {/* Nút tra cứu nhanh đơn đặt phòng */}
        <div style={{ marginTop: "1.25rem" }}>
          <button
            type="button"
            onClick={() => {
              setLookupBookingNumber("");
              setIsLookupOpen(true);
            }}
            className="btn btn-secondary"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "0.5rem",
              padding: "0.5rem 1.25rem",
              fontSize: "0.875rem",
              fontWeight: 600,
              borderRadius: "9999px",
              border: "1px solid rgba(79, 70, 229, 0.25)",
              background: "rgba(79, 70, 229, 0.06)",
              color: "#4338ca",
              cursor: "pointer",
            }}
          >
            <Search size={15} color="#4f46e5" />
            <span>Tra Cứu & Quản Lý / Hủy Đơn Đặt Phòng</span>
          </button>
        </div>
      </section>

      {/* Availability Search Bar */}
      <section
        className="glass-card"
        style={{
          padding: "1.5rem",
          borderRadius: "16px",
          background: "var(--bg-card)",
          backdropFilter: "blur(20px)",
          border: "1px solid var(--border-color)",
          boxShadow: "0 4px 20px -2px rgba(0, 0, 0, 0.06)",
          marginBottom: "2.5rem",
        }}
      >
        <form onSubmit={handleSearch}>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
              gap: "1rem",
              alignItems: "flex-end",
            }}
          >
            {/* Ngày nhận phòng */}
            <div>
              <label
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "0.4rem",
                  fontSize: "0.8125rem",
                  fontWeight: 600,
                  color: "var(--text-main)",
                  marginBottom: "0.5rem",
                }}
              >
                <Calendar size={15} color="#6366f1" />
                <span>Ngày Nhận Phòng (Từ 14:00)</span>
              </label>
              <input
                type="date"
                className="input-field"
                min={getTodayString()}
                value={fromDate}
                onChange={(e) => {
                  setFromDate(e.target.value);
                  if (new Date(e.target.value) >= new Date(toDate)) {
                    const nextDay = new Date(e.target.value);
                    nextDay.setDate(nextDay.getDate() + 1);
                    setToDate(nextDay.toISOString().split("T")[0]);
                  }
                }}
                required
                style={{ width: "100%", padding: "0.75rem 1rem", colorScheme: "light" }}
              />
            </div>

            {/* Ngày trả phòng */}
            <div>
              <label
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "0.4rem",
                  fontSize: "0.8125rem",
                  fontWeight: 600,
                  color: "var(--text-main)",
                  marginBottom: "0.5rem",
                }}
              >
                <Calendar size={15} color="#ec4899" />
                <span>Ngày Trả Phòng (Trước 12:00)</span>
              </label>
              <input
                type="date"
                className="input-field"
                min={fromDate || getTodayString()}
                value={toDate}
                onChange={(e) => setToDate(e.target.value)}
                required
                style={{ width: "100%", padding: "0.75rem 1rem", colorScheme: "light" }}
              />
            </div>

            {/* Lọc loại phòng */}
            <div>
              <label
                style={{
                  display: "block",
                  fontSize: "0.8125rem",
                  fontWeight: 600,
                  color: "var(--text-main)",
                  marginBottom: "0.5rem",
                }}
              >
                Hạng Phòng
              </label>
              <select
                className="input-field"
                value={selectedType}
                onChange={(e) => setSelectedType(e.target.value)}
                style={{ width: "100%", padding: "0.75rem 1rem" }}
              >
                <option value="">Tất Cả Hạng Phòng</option>
                <option value="VIP">VIP Cao Cấp</option>
                <option value="DELUX">Deluxe Sang Trọng</option>
                <option value="LIVING_SUITE">Living Suite Gia Đình</option>
              </select>
            </div>

            {/* Lọc kích cỡ giường */}
            <div>
              <label
                style={{
                  display: "block",
                  fontSize: "0.8125rem",
                  fontWeight: 600,
                  color: "var(--text-main)",
                  marginBottom: "0.5rem",
                }}
              >
                Kích Thước Giường
              </label>
              <select
                className="input-field"
                value={selectedSize}
                onChange={(e) => setSelectedSize(e.target.value)}
                style={{ width: "100%", padding: "0.75rem 1rem" }}
              >
                <option value="">Tất Cả Kích Thước</option>
                <option value="DOUBLE">Giường Đôi (Double)</option>
                <option value="SINGLE">Giường Đơn (Single)</option>
              </select>
            </div>

            {/* Nút tìm kiếm */}
            <div>
              <button
                type="submit"
                className="btn btn-primary"
                disabled={loading}
                style={{
                  width: "100%",
                  padding: "0.75rem 1.25rem",
                  height: "46px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "0.5rem",
                  fontSize: "0.9375rem",
                }}
              >
                <Search size={18} />
                <span>{loading ? "Đang Tra Cứu..." : "Tìm Phòng Trống"}</span>
              </button>
            </div>
          </div>
        </form>

        {/* Thanh tóm tắt khoảng thời gian tìm kiếm */}
        <div
          style={{
            marginTop: "1.25rem",
            paddingTop: "1rem",
            borderTop: "1px solid var(--border-color)",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            flexWrap: "wrap",
            gap: "0.75rem",
            fontSize: "0.875rem",
          }}
        >
          <div style={{ color: "var(--text-muted)" }}>
            Khoảng thời gian: <strong style={{ color: "var(--text-main)" }}>{formatDateDisplay(fromDate)}</strong> đến{" "}
            <strong style={{ color: "var(--text-main)" }}>{formatDateDisplay(toDate)}</strong> (
            <span style={{ color: "#a5b4fc", fontWeight: 700 }}>{nights} đêm</span>)
          </div>
          <div>
            Số lượng phòng còn trống:{" "}
            <span
              style={{
                fontSize: "1rem",
                fontWeight: 700,
                color: totalAvailableRooms > 0 ? "#34d399" : "#f87171",
              }}
            >
              {totalAvailableRooms} phòng khả dụng
            </span>
          </div>
        </div>
      </section>

      {/* Thông báo lỗi nếu có */}
      {error && (
        <div
          style={{
            padding: "1rem 1.25rem",
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

      {/* Grid danh mục phòng */}
      {loading ? (
        <div style={{ textAlign: "center", padding: "4rem 0", color: "var(--text-muted)" }}>
          <div style={{ fontSize: "1.125rem", marginBottom: "0.5rem" }}>Đang kiểm tra tồn kho thời gian thực...</div>
          <div style={{ fontSize: "0.875rem", color: "var(--text-dim)" }}>
            Áp dụng khóa kiểm soát đồng thời (Pessimistic Locking) để đảm bảo độ chính xác
          </div>
        </div>
      ) : categories.length === 0 ? (
        <div
          className="glass-card"
          style={{
            textAlign: "center",
            padding: "3.5rem 2rem",
            borderRadius: "16px",
            color: "var(--text-muted)",
          }}
        >
          <Bed size={48} color="#6b7280" style={{ margin: "0 auto 1rem" }} />
          <h3 style={{ fontSize: "1.25rem", color: "var(--text-main)", marginBottom: "0.5rem" }}>
            Không tìm thấy phòng phù hợp
          </h3>
          <p style={{ maxWidth: "500px", margin: "0 auto" }}>
            Vui lòng thử thay đổi khoảng ngày nhận/trả phòng hoặc chọn tiêu chí lọc khác.
          </p>
        </div>
      ) : (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(360px, 1fr))",
            gap: "1.75rem",
          }}
        >
          {categories.map((cat) => {
            const catKey = `${cat.type}_${cat.size}`;
            const isAvailable = cat.availableQuota > 0;
            const chosenQty = quantities[catKey] || 1;
            const primaryPicture =
              cat.pictures && cat.pictures.length > 0
                ? cat.pictures[0]
                : "https://images.unsplash.com/photo-1590490360182-c33d57733427";

            const typeBadgeStyle =
              cat.type === "VIP"
                ? { background: "rgba(245, 158, 11, 0.15)", color: "#fbbf24", border: "1px solid rgba(245, 158, 11, 0.3)" }
                : cat.type === "DELUX"
                ? { background: "rgba(99, 102, 241, 0.15)", color: "#a5b4fc", border: "1px solid rgba(99, 102, 241, 0.3)" }
                : { background: "rgba(16, 185, 129, 0.15)", color: "#34d399", border: "1px solid rgba(16, 185, 129, 0.3)" };

            return (
              <div
                key={catKey}
                className="glass-card glass-card-hover"
                style={{
                  borderRadius: "16px",
                  overflow: "hidden",
                  display: "flex",
                  flexDirection: "column",
                  border: isAvailable ? "1px solid var(--border-color)" : "1px solid rgba(239, 68, 68, 0.2)",
                  background: isAvailable ? "var(--bg-card)" : "#f8fafc",
                }}
              >
                {/* Ảnh phòng & Badges */}
                <div style={{ position: "relative", height: "220px", overflow: "hidden" }}>
                  <img
                    src={primaryPicture}
                    alt={cat.name}
                    style={{
                      width: "100%",
                      height: "100%",
                      objectFit: "cover",
                      filter: isAvailable ? "none" : "grayscale(60%)",
                      transition: "transform 0.4s ease",
                    }}
                    onMouseOver={(e) => (e.currentTarget.style.transform = "scale(1.04)")}
                    onMouseOut={(e) => (e.currentTarget.style.transform = "scale(1)")}
                  />

                  {/* Badges loại phòng */}
                  <div style={{ position: "absolute", top: "12px", left: "12px", display: "flex", gap: "0.5rem" }}>
                    <span
                      style={{
                        padding: "0.25rem 0.65rem",
                        borderRadius: "8px",
                        fontSize: "0.75rem",
                        fontWeight: 700,
                        backdropFilter: "blur(8px)",
                        ...typeBadgeStyle,
                      }}
                    >
                      {cat.type}
                    </span>
                    <span
                      style={{
                        padding: "0.25rem 0.65rem",
                        borderRadius: "8px",
                        fontSize: "0.75rem",
                        fontWeight: 600,
                        background: "rgba(0, 0, 0, 0.6)",
                        color: "#e2e8f0",
                        backdropFilter: "blur(8px)",
                        border: "1px solid rgba(255, 255, 255, 0.1)",
                      }}
                    >
                      {cat.size === "DOUBLE" ? "Giường Đôi" : "Giường Đơn"}
                    </span>
                  </div>

                  {/* Badge Tồn kho khả dụng */}
                  <div style={{ position: "absolute", bottom: "12px", right: "12px" }}>
                    {isAvailable ? (
                      <div
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: "0.35rem",
                          padding: "0.3rem 0.75rem",
                          borderRadius: "9999px",
                          background: "rgba(16, 185, 129, 0.9)",
                          color: "white",
                          fontSize: "0.75rem",
                          fontWeight: 700,
                          boxShadow: "0 4px 10px rgba(0, 0, 0, 0.3)",
                        }}
                      >
                        <CheckCircle size={13} />
                        <span>Còn trống {cat.availableQuota} phòng</span>
                      </div>
                    ) : (
                      <div
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: "0.35rem",
                          padding: "0.3rem 0.75rem",
                          borderRadius: "9999px",
                          background: "rgba(239, 68, 68, 0.9)",
                          color: "white",
                          fontSize: "0.75rem",
                          fontWeight: 700,
                          boxShadow: "0 4px 10px rgba(0, 0, 0, 0.3)",
                        }}
                      >
                        <AlertCircle size={13} />
                        <span>Hết phòng ({nights} đêm)</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Nội dung chi tiết thẻ phòng */}
                <div style={{ padding: "1.25rem", flex: 1, display: "flex", flexDirection: "column" }}>
                  <h3
                    style={{
                      fontSize: "1.2rem",
                      fontWeight: 700,
                      marginBottom: "0.5rem",
                      color: "var(--text-main)",
                    }}
                  >
                    {cat.name}
                  </h3>

                  <p
                    style={{
                      fontSize: "0.875rem",
                      color: "var(--text-muted)",
                      marginBottom: "1rem",
                      lineHeight: "1.4",
                      display: "-webkit-box",
                      WebkitLineClamp: 2,
                      WebkitBoxOrient: "vertical",
                      overflow: "hidden",
                    }}
                  >
                    {cat.description || "Phòng nghỉ trang nhã với đầy đủ tiện nghi tiêu chuẩn quốc tế."}
                  </p>

                  {/* Thông tin sức chứa */}
                  <div
                    style={{
                      display: "flex",
                      gap: "1rem",
                      fontSize: "0.8125rem",
                      color: "var(--text-muted)",
                      padding: "0.75rem",
                      background: "rgba(79, 70, 229, 0.05)",
                      border: "1px solid rgba(79, 70, 229, 0.12)",
                      borderRadius: "8px",
                      marginBottom: "1rem",
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: "0.35rem" }}>
                      <Users size={15} color="#6366f1" />
                      <span>Tối đa {cat.maxAdults} người lớn</span>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: "0.35rem" }}>
                      <Baby size={15} color="#ec4899" />
                      <span>{cat.maxChildren} trẻ em</span>
                    </div>
                  </div>

                  {/* Giá và Tổng tiền */}
                  <div
                    style={{
                      marginTop: "auto",
                      paddingTop: "0.75rem",
                      borderTop: "1px solid var(--border-color)",
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "flex-end",
                      marginBottom: "1rem",
                    }}
                  >
                    <div>
                      <div style={{ fontSize: "0.75rem", color: "var(--text-dim)" }}>Giá mỗi đêm</div>
                      <div style={{ fontSize: "1.25rem", fontWeight: 800, color: "var(--text-main)" }}>
                        {formatCurrency(cat.price)}
                      </div>
                    </div>
                    {nights > 1 && (
                      <div style={{ textAlign: "right" }}>
                        <div style={{ fontSize: "0.75rem", color: "var(--text-dim)" }}>Tổng {nights} đêm</div>
                        <div style={{ fontSize: "0.9375rem", fontWeight: 700, color: "var(--primary)" }}>
                          {formatCurrency(cat.totalPriceForStay)}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Hành động: Chọn số lượng & Đặt phòng */}
                  <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
                    <button
                      type="button"
                      className="btn btn-secondary"
                      onClick={() => openDetailModal(cat)}
                      style={{ padding: "0.625rem 0.875rem", fontSize: "0.8125rem" }}
                      title="Xem chi tiết tiện nghi & chính sách"
                    >
                      <Info size={16} />
                      <span>Chi Tiết</span>
                    </button>

                    {isAvailable ? (
                      <div style={{ display: "flex", gap: "0.5rem", flex: 1 }}>
                        {/* Selector số lượng */}
                        {cat.availableQuota > 1 && (
                          <div
                            style={{
                              display: "inline-flex",
                              alignItems: "center",
                              background: "#f8fafc",
                              borderRadius: "8px",
                              border: "1px solid rgba(99, 102, 241, 0.2)",
                              padding: "0 0.25rem",
                            }}
                          >
                            <button
                              type="button"
                              onClick={() => handleQuantityChange(catKey, -1, cat.availableQuota)}
                              disabled={chosenQty <= 1}
                              style={{
                                background: "none",
                                border: "none",
                                color: chosenQty <= 1 ? "var(--text-dim)" : "var(--text-main)",
                                padding: "0.35rem",
                                cursor: chosenQty <= 1 ? "not-allowed" : "pointer",
                              }}
                            >
                              <Minus size={14} />
                            </button>
                            <span style={{ fontSize: "0.875rem", fontWeight: 700, minWidth: "1.5rem", textAlign: "center" }}>
                              {chosenQty}
                            </span>
                            <button
                              type="button"
                              onClick={() => handleQuantityChange(catKey, 1, cat.availableQuota)}
                              disabled={chosenQty >= cat.availableQuota}
                              style={{
                                background: "none",
                                border: "none",
                                color: chosenQty >= cat.availableQuota ? "var(--text-dim)" : "var(--text-main)",
                                padding: "0.35rem",
                                cursor: chosenQty >= cat.availableQuota ? "not-allowed" : "pointer",
                              }}
                            >
                              <Plus size={14} />
                            </button>
                          </div>
                        )}

                        <button
                          type="button"
                          className="btn btn-primary"
                          onClick={() => handleAddToCart(cat)}
                          style={{ flex: 1, padding: "0.625rem 1rem", fontSize: "0.875rem" }}
                        >
                          <CreditCard size={16} />
                          <span>Đặt Phòng ({chosenQty})</span>
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        className="btn btn-secondary"
                        disabled
                        style={{
                          flex: 1,
                          opacity: 0.5,
                          cursor: "not-allowed",
                          fontSize: "0.8125rem",
                          border: "1px solid rgba(239, 68, 68, 0.3)",
                        }}
                      >
                        Đã Hết Phòng
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Floating Bottom Cart Bar (Khi có phòng trong giỏ hàng) */}
      {cartItems.length > 0 && !isCheckoutOpen && (
        <aside
          aria-label="Tóm tắt giỏ hàng đặt phòng"
          style={{
            position: "fixed",
            bottom: "1.5rem",
            left: "50%",
            transform: "translateX(-50%)",
            width: "calc(100% - 2rem)",
            maxWidth: "850px",
            background: "rgba(255, 255, 255, 0.96)",
            backdropFilter: "blur(20px)",
            borderRadius: "16px",
            border: "1px solid var(--border-color)",
            padding: "0.85rem 1.5rem",
            boxShadow: "0 15px 35px rgba(0, 0, 0, 0.12)",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            zIndex: 30,
            flexWrap: "wrap",
            gap: "1rem",
            animation: "fadeIn 0.3s ease",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
            <div
              style={{
                width: "42px",
                height: "42px",
                borderRadius: "10px",
                background: "var(--primary-gradient)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "white",
              }}
            >
              <ShoppingCart size={20} />
            </div>
            <div>
              <div style={{ fontSize: "0.9375rem", fontWeight: 700 }}>
                Giỏ hàng: <span style={{ color: "var(--primary)" }}>{cartTotalRooms} phòng</span> ({cartItems.length} hạng phòng, {nights} đêm)
              </div>
              <div style={{ fontSize: "0.8125rem", color: "var(--text-muted)" }}>
                Tổng tạm tính: <strong style={{ color: "#34d399", fontSize: "0.9375rem" }}>{formatCurrency(cartTotalAmount)}</strong>
              </div>
            </div>
          </div>

          <div style={{ display: "flex", gap: "0.75rem", alignItems: "center" }}>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => setCartItems([])}
              style={{ padding: "0.5rem 0.85rem", fontSize: "0.8125rem" }}
              title="Xóa toàn bộ giỏ hàng"
            >
              <Trash2 size={15} />
              <span>Xóa Giỏ</span>
            </button>

            <button
              type="button"
              className="btn btn-primary"
              onClick={() => setIsCheckoutOpen(true)}
              style={{ padding: "0.6rem 1.5rem", fontSize: "0.9375rem", fontWeight: 700 }}
            >
              <CreditCard size={17} />
              <span>Thanh Toán Ngay</span>
            </button>
          </div>
        </aside>
      )}

      {/* Modal Thanh Toán & Đặt Phòng (BookingCheckoutModal) */}
      {isCheckoutOpen && (
        <BookingCheckoutModal
          cartItems={cartItems}
          fromDate={fromDate}
          toDate={toDate}
          nights={nights}
          onClose={() => setIsCheckoutOpen(false)}
          onUpdateCartItemQuantity={handleUpdateCartItemQuantity}
          onRemoveCartItem={handleRemoveCartItem}
          onBookingSuccess={handleBookingSuccess}
          onOpenLookup={(bNumber) => {
            setLookupBookingNumber(bNumber);
            setIsLookupOpen(true);
          }}
        />
      )}

      {/* Modal Xem Chi Tiết Phòng (Room Details Modal) */}
      {detailModalCat && (
        <div className="modal-overlay" onClick={() => setDetailModalCat(null)}>
          <div
            className="modal-content"
            onClick={(e) => e.stopPropagation()}
            style={{ maxWidth: "720px", maxHeight: "90vh", overflowY: "auto", borderRadius: "18px" }}
          >
            {/* Modal Header */}
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: "1.25rem",
                paddingBottom: "0.75rem",
                borderBottom: "1px solid var(--border-color)",
              }}
            >
              <div>
                <h2 style={{ fontSize: "1.35rem", fontWeight: 800 }}>{detailModalCat.name}</h2>
                <div style={{ fontSize: "0.8125rem", color: "var(--text-muted)" }}>
                  Loại {detailModalCat.type} • Giường {detailModalCat.size === "DOUBLE" ? "Đôi" : "Đơn"}
                </div>
              </div>
              <button
                type="button"
                onClick={() => setDetailModalCat(null)}
                style={{
                  background: "transparent",
                  border: "none",
                  color: "var(--text-muted)",
                  cursor: "pointer",
                }}
              >
                <X size={22} />
              </button>
            </div>

            {/* Gallery ảnh phòng */}
            {detailModalCat.pictures && detailModalCat.pictures.length > 0 && (
              <div style={{ marginBottom: "1.5rem" }}>
                <div style={{ height: "300px", borderRadius: "12px", overflow: "hidden", marginBottom: "0.75rem" }}>
                  <img
                    src={detailModalCat.pictures[activeImageIndex] || detailModalCat.pictures[0]}
                    alt={detailModalCat.name}
                    style={{ width: "100%", height: "100%", objectFit: "cover" }}
                  />
                </div>
                {detailModalCat.pictures.length > 1 && (
                  <div style={{ display: "flex", gap: "0.5rem", overflowX: "auto", paddingBottom: "0.5rem" }}>
                    {detailModalCat.pictures.map((pic, idx) => (
                      <img
                        key={idx}
                        src={pic}
                        alt={`Thumbnail ${idx + 1}`}
                        onClick={() => setActiveImageIndex(idx)}
                        style={{
                          width: "70px",
                          height: "50px",
                          borderRadius: "6px",
                          objectFit: "cover",
                          cursor: "pointer",
                          border: activeImageIndex === idx ? "2px solid #6366f1" : "2px solid transparent",
                          opacity: activeImageIndex === idx ? 1 : 0.6,
                        }}
                      />
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Thông số kỹ thuật & Tiện nghi */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "1rem", marginBottom: "1.5rem" }}>
              <div style={{ padding: "0.85rem", background: "linear-gradient(135deg, rgba(238, 242, 255, 0.7) 0%, #ffffff 100%)", border: "1px solid rgba(99, 102, 241, 0.18)", borderRadius: "10px" }}>
                <div style={{ fontSize: "0.75rem", color: "#4338ca", fontWeight: 600 }}>Sức chứa tiêu chuẩn</div>
                <div style={{ fontSize: "0.9375rem", fontWeight: 700, marginTop: "0.25rem" }}>
                  {detailModalCat.maxAdults} Người lớn, {detailModalCat.maxChildren} Trẻ em
                </div>
              </div>
              <div style={{ padding: "0.85rem", background: "linear-gradient(135deg, rgba(238, 242, 255, 0.7) 0%, #ffffff 100%)", border: "1px solid rgba(99, 102, 241, 0.18)", borderRadius: "10px" }}>
                <div style={{ fontSize: "0.75rem", color: "#4338ca", fontWeight: 600 }}>Phụ thu trẻ em quá quy định</div>
                <div style={{ fontSize: "0.9375rem", fontWeight: 700, marginTop: "0.25rem", color: "#b45309" }}>
                  {formatCurrency(detailModalCat.extraChildFee)} / trẻ / đêm
                </div>
              </div>
              <div style={{ padding: "0.85rem", background: "linear-gradient(135deg, rgba(238, 242, 255, 0.7) 0%, #ffffff 100%)", border: "1px solid rgba(99, 102, 241, 0.18)", borderRadius: "10px" }}>
                <div style={{ fontSize: "0.75rem", color: "#4338ca", fontWeight: 600 }}>Tồn kho thời gian thực</div>
                <div
                  style={{
                    fontSize: "0.9375rem",
                    fontWeight: 700,
                    marginTop: "0.25rem",
                    color: detailModalCat.availableQuota > 0 ? "#059669" : "#dc2626",
                  }}
                >
                  {detailModalCat.availableQuota > 0 ? `Còn ${detailModalCat.availableQuota} phòng trống` : "Hết phòng"}
                </div>
              </div>
            </div>

            {/* Mô tả chi tiết */}
            <div style={{ marginBottom: "1.5rem" }}>
              <h4 style={{ fontSize: "0.9375rem", fontWeight: 700, marginBottom: "0.5rem" }}>Mô Tả Hạng Phòng</h4>
              <p style={{ fontSize: "0.875rem", color: "var(--text-muted)", lineHeight: 1.6 }}>
                {detailModalCat.description || "Phòng nghỉ được thiết kế hiện đại, tinh tế với tầm nhìn hướng biển tuyệt đẹp, trang bị đầy đủ điều hòa, truyền hình vệ tinh, két sắt an toàn và phòng tắm riêng cao cấp."}
              </p>
            </div>

            {/* Chính sách nhận/hủy phòng theo SPEC */}
            <div
              style={{
                padding: "1rem",
                borderRadius: "10px",
                background: "rgba(79, 70, 229, 0.06)",
                border: "1px solid rgba(79, 70, 229, 0.18)",
                fontSize: "0.8125rem",
                color: "#3730a3",
                marginBottom: "1.5rem",
                lineHeight: 1.6,
              }}
            >
              <div style={{ fontWeight: 700, marginBottom: "0.25rem" }}>🛡️ Chính Sách Lưu Trú & Hủy Phòng (e-Hotel SPEC):</div>
              <ul style={{ paddingLeft: "1.2rem", margin: 0 }}>
                <li>Nhận phòng (Check-in) từ 14:00 • Trả phòng (Check-out) trước 12:00.</li>
                <li><strong>Chính sách hủy phòng:</strong> Hủy trước giờ nhận phòng từ 24 tiếng trở lên được hoàn tiền <strong>80%</strong> số tiền đã thanh toán (khách sạn giữ phí hủy 20%).</li>
                <li>Không áp dụng hoàn tiền nếu hủy phòng trong vòng dưới 24 tiếng trước ngày nhận phòng.</li>
              </ul>
            </div>

            {/* Footer Modal */}
            <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.75rem" }}>
              <button type="button" className="btn btn-secondary" onClick={() => setDetailModalCat(null)}>
                Đóng
              </button>
              {detailModalCat.availableQuota > 0 && (
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={() => {
                    handleAddToCart(detailModalCat);
                    setDetailModalCat(null);
                  }}
                >
                  <CreditCard size={16} />
                  <span>Chọn Đặt Phòng Này</span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Modal Tra Cứu & Hủy Đặt Phòng (BookingLookupModal - FEAT-08) */}
      <BookingLookupModal
        isOpen={isLookupOpen}
        onClose={() => setIsLookupOpen(false)}
        initialBookingNumber={lookupBookingNumber}
      />
    </div>
  );
}
