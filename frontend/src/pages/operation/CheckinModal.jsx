import React, { useState, useEffect } from "react";
import {
  X,
  Bed,
  User,
  Users,
  Baby,
  Calendar,
  AlertTriangle,
  CheckCircle,
  Plus,
  Trash2,
  DollarSign,
  Info,
  Clock,
  ShieldCheck,
} from "lucide-react";
import { apiRequest } from "../../api/client.js";

// Định dạng tiền tệ VND
const formatCurrency = (amount) => {
  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
  }).format(amount || 0);
};

export default function CheckinModal({ booking, onClose, onSuccess }) {
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState(null);
  const [availableData, setAvailableData] = useState(null);

  // Cấu trúc state gán phòng:
  // Mỗi phần tử đại diện cho 1 phòng vật lý cần gán:
  // {
  //   itemIndex: 0,
  //   roomType: "VIP",
  //   roomSize: "SINGLE",
  //   selectedRoomId: "",
  //   roomDetails: null, // thông tin phòng vật lý đã chọn (maxChildren, extraChildFee...)
  //   guests: [ { fullName: "", idNumber: "", birthYear: 1990 } ]
  // }
  const [assignmentSlots, setAssignmentSlots] = useState([]);

  const currentYear = new Date().getFullYear();

  // Tải danh sách phòng khả dụng
  useEffect(() => {
    if (!booking) return;

    const fetchAvailableRooms = async () => {
      try {
        setLoading(true);
        setErrorMsg(null);
        const res = await apiRequest(`/api/operation/bookings/${booking.id}/available-rooms`);
        setAvailableData(res.data);

        // Khởi tạo các slot phòng cần gán dựa theo booking.items
        const slots = [];
        let slotId = 0;

        (booking.items || []).forEach((item, itemIdx) => {
          for (let q = 0; q < item.quantity; q++) {
            // Tìm các phòng candidate cho loại này
            const req = res.data.requirements.find(
              (r) => r.roomType === item.roomType && r.roomSize === item.roomSize,
            );
            const candidates = req ? req.candidates : [];

            slots.push({
              slotId: slotId++,
              itemIndex: itemIdx,
              roomType: item.roomType,
              roomSize: item.roomSize,
              categoryName: `${item.roomType} (${item.roomSize === "DOUBLE" ? "Giường Đôi" : "Giường Đơn"})`,
              candidates,
              selectedRoomId: candidates.length > 0 ? candidates[q]?.roomId || "" : "",
              roomDetails: candidates.length > 0 ? candidates[q] || null : null,
              guests: [
                {
                  fullName: slotId === 1 ? booking.customerName : "",
                  idNumber: slotId === 1 ? booking.customerCccd : "",
                  birthYear: 1990,
                },
              ],
            });
          }
        });

        setAssignmentSlots(slots);
      } catch (err) {
        setErrorMsg(err.message || "Không thể tải danh sách phòng vật lý khả dụng.");
      } finally {
        setLoading(false);
      }
    };

    fetchAvailableRooms();
  }, [booking]);

  // Thay đổi phòng vật lý được chọn cho 1 slot
  const handleSelectRoom = (slotIndex, roomId) => {
    setAssignmentSlots((prev) => {
      const updated = [...prev];
      const slot = updated[slotIndex];
      slot.selectedRoomId = roomId;

      // Tìm chi tiết phòng trong allAvailableRooms hoặc candidates
      const room =
        availableData?.allAvailableRooms?.find((r) => r.roomId === roomId) ||
        slot.candidates?.find((r) => r.roomId === roomId) ||
        null;
      slot.roomDetails = room;

      return updated;
    });
  };

  // Thêm khách vào phòng
  const handleAddGuest = (slotIndex) => {
    setAssignmentSlots((prev) => {
      const updated = [...prev];
      updated[slotIndex].guests.push({
        fullName: "",
        idNumber: "",
        birthYear: 2000,
      });
      return updated;
    });
  };

  // Xóa khách khỏi phòng
  const handleRemoveGuest = (slotIndex, guestIndex) => {
    setAssignmentSlots((prev) => {
      const updated = [...prev];
      if (updated[slotIndex].guests.length > 1) {
        updated[slotIndex].guests.splice(guestIndex, 1);
      }
      return updated;
    });
  };

  // Thay đổi thông tin khách
  const handleGuestChange = (slotIndex, guestIndex, field, value) => {
    setAssignmentSlots((prev) => {
      const updated = [...prev];
      updated[slotIndex].guests[guestIndex][field] = value;
      return updated;
    });
  };

  // Tính toán phụ thu trẻ em thời gian thực trên giao diện theo công thức SPEC 4.4
  const nights = booking?.nights || 1;

  const calculateSurcharges = () => {
    let totalExtraChildrenFee = 0;
    const roomBreakdowns = assignmentSlots.map((slot) => {
      const room = slot.roomDetails;
      const guests = slot.guests;

      let childCount = 0;
      let adultCount = 0;

      guests.forEach((g) => {
        const bYear = parseInt(g.birthYear, 10) || currentYear;
        const isChild = currentYear - bYear < 12;
        if (isChild) childCount++;
        else adultCount++;
      });

      const maxChildren = room ? room.maxChildren : 1;
      const extraFeePerChild = room ? room.extraChildFee : 0;
      let excessChildren = 0;
      let fee = 0;

      if (childCount > maxChildren) {
        excessChildren = childCount - maxChildren;
        fee = excessChildren * extraFeePerChild * nights;
      }

      totalExtraChildrenFee += fee;

      return {
        slotId: slot.slotId,
        selectedRoomId: slot.selectedRoomId,
        adultCount,
        childCount,
        maxChildren,
        excessChildren,
        extraFeePerChild,
        fee,
      };
    });

    return { totalExtraChildrenFee, roomBreakdowns };
  };

  const { totalExtraChildrenFee, roomBreakdowns } = calculateSurcharges();

  // Submit Check-in
  const handleSubmitCheckin = async (e) => {
    e.preventDefault();
    setErrorMsg(null);

    // Validate
    const seenRooms = new Set();
    for (let i = 0; i < assignmentSlots.length; i++) {
      const slot = assignmentSlots[i];
      if (!slot.selectedRoomId) {
        setErrorMsg(`Vui lòng chọn số phòng vật lý cho phòng thứ ${i + 1} (${slot.categoryName}).`);
        return;
      }
      if (seenRooms.has(slot.selectedRoomId)) {
        setErrorMsg(`Không được chọn trùng số phòng vật lý '${slot.selectedRoomId}'. Mỗi phòng phải là duy nhất.`);
        return;
      }
      seenRooms.add(slot.selectedRoomId);

      for (let j = 0; j < slot.guests.length; j++) {
        const g = slot.guests[j];
        if (!g.fullName.trim()) {
          setErrorMsg(`Phòng ${slot.selectedRoomId}: Vui lòng nhập họ tên của khách thứ ${j + 1}.`);
          return;
        }
        if (!g.idNumber.trim()) {
          setErrorMsg(`Phòng ${slot.selectedRoomId}: Vui lòng nhập số CCCD/Giấy tờ của khách '${g.fullName}'.`);
          return;
        }
      }
    }

    setSubmitting(true);

    try {
      const payload = {
        assignments: assignmentSlots.map((slot) => ({
          roomId: slot.selectedRoomId,
          guests: slot.guests.map((g) => {
            const bYear = parseInt(g.birthYear, 10);
            return {
              fullName: g.fullName.trim(),
              idNumber: g.idNumber.trim(),
              birthYear: bYear,
              guestType: currentYear - bYear < 12 ? "CHILD" : "ADULT",
            };
          }),
        })),
      };

      const res = await apiRequest(`/api/operation/bookings/${booking.id}/check-in`, {
        method: "POST",
        body: JSON.stringify(payload),
      });

      if (onSuccess) {
        onSuccess(res.data);
      }
    } catch (err) {
      setErrorMsg(err.message || "Làm thủ tục Check-in thất bại.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        backgroundColor: "rgba(0, 0, 0, 0.8)",
        backdropFilter: "blur(6px)",
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
          maxWidth: "960px",
          maxHeight: "92vh",
          display: "flex",
          flexDirection: "column",
          borderRadius: "1rem",
          border: "1px solid rgba(255, 255, 255, 0.12)",
          background: "#111827",
          boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.7)",
          overflow: "hidden",
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: "1.25rem 1.75rem",
            borderBottom: "1px solid var(--border-color)",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            background: "rgba(17, 24, 39, 0.95)",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
            <div
              style={{
                width: "42px",
                height: "42px",
                borderRadius: "0.625rem",
                background: "rgba(16, 185, 129, 0.15)",
                border: "1px solid rgba(16, 185, 129, 0.3)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#10b981",
              }}
            >
              <Bed size={22} />
            </div>
            <div>
              <h2 style={{ fontSize: "1.125rem", fontWeight: 700, margin: 0, color: "var(--text-main)" }}>
                Thủ Tục Check-in & Gán Số Phòng Vật Lý
              </h2>
              <p style={{ fontSize: "0.75rem", color: "var(--text-muted)", margin: "0.125rem 0 0" }}>
                Đơn đặt: <strong style={{ color: "#a5b4fc" }}>{booking?.bookingNumber}</strong> • Khách hàng:{" "}
                <strong>{booking?.customerName}</strong> • {nights} đêm ({booking?.fromDate ? new Date(booking.fromDate).toLocaleDateString("vi-VN") : ""} - {booking?.toDate ? new Date(booking.toDate).toLocaleDateString("vi-VN") : ""})
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

        {/* Body Form */}
        <form
          onSubmit={handleSubmitCheckin}
          style={{
            padding: "1.5rem 1.75rem",
            overflowY: "auto",
            display: "flex",
            flexDirection: "column",
            gap: "1.25rem",
          }}
        >
          {/* Lỗi nếu có */}
          {errorMsg && (
            <div
              style={{
                padding: "0.875rem 1.25rem",
                borderRadius: "0.5rem",
                background: "rgba(239, 68, 68, 0.15)",
                border: "1px solid rgba(239, 68, 68, 0.35)",
                color: "#fca5a5",
                fontSize: "0.875rem",
                display: "flex",
                alignItems: "center",
                gap: "0.625rem",
              }}
            >
              <AlertTriangle size={20} color="#ef4444" style={{ flexShrink: 0 }} />
              <span>{errorMsg}</span>
            </div>
          )}

          {loading ? (
            <div style={{ textAlign: "center", padding: "3rem", color: "var(--text-muted)" }}>
              <div className="animate-spin" style={{ display: "inline-block", marginBottom: "0.75rem" }}>
                ⌛
              </div>
              <div>Đang tải danh sách phòng vật lý khả dụng...</div>
            </div>
          ) : (
            <>
              {/* Danh sách các phòng cần gán */}
              <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
                {assignmentSlots.map((slot, slotIdx) => {
                  const breakdown = roomBreakdowns[slotIdx];

                  return (
                    <div
                      key={slot.slotId}
                      style={{
                        padding: "1.25rem",
                        borderRadius: "0.75rem",
                        background: "rgba(31, 41, 55, 0.5)",
                        border: "1px solid var(--border-color)",
                        display: "flex",
                        flexDirection: "column",
                        gap: "1rem",
                      }}
                    >
                      {/* Tiêu đề slot phòng & Bộ chọn số phòng vật lý */}
                      <div
                        style={{
                          display: "flex",
                          flexWrap: "wrap",
                          justifyContent: "space-between",
                          alignItems: "center",
                          gap: "0.75rem",
                          borderBottom: "1px solid var(--border-color)",
                          paddingBottom: "0.75rem",
                        }}
                      >
                        <div>
                          <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", textTransform: "uppercase" }}>
                            Phòng #{slotIdx + 1}
                          </div>
                          <div style={{ fontSize: "1rem", fontWeight: 700, color: "var(--text-main)" }}>
                            Hạng {slot.categoryName}
                          </div>
                        </div>

                        {/* Chọn số phòng vật lý */}
                        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                          <label style={{ fontSize: "0.8125rem", fontWeight: 600, color: "var(--text-muted)" }}>
                            Gán Số Phòng Vật Lý *:
                          </label>
                          <select
                            value={slot.selectedRoomId}
                            onChange={(e) => handleSelectRoom(slotIdx, e.target.value)}
                            required
                            style={{
                              padding: "0.5rem 1rem",
                              borderRadius: "0.5rem",
                              background: "#1f2937",
                              border: "1px solid rgba(99, 102, 241, 0.4)",
                              color: "#a5b4fc",
                              fontSize: "0.875rem",
                              fontWeight: 700,
                              minWidth: "160px",
                            }}
                          >
                            <option value="">-- Chọn số phòng --</option>
                            {slot.candidates?.map((c) => (
                              <option key={c.roomId} value={c.roomId}>
                                Phòng {c.roomId} (Đang trống)
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>

                      {/* Tiêu chuẩn phòng đã chọn */}
                      {slot.roomDetails && (
                        <div
                          style={{
                            display: "flex",
                            gap: "1.5rem",
                            fontSize: "0.75rem",
                            color: "var(--text-muted)",
                            background: "rgba(17, 24, 39, 0.4)",
                            padding: "0.5rem 0.75rem",
                            borderRadius: "0.375rem",
                          }}
                        >
                          <div>
                            Sức chứa: <strong>{slot.roomDetails.maxAdults} Người lớn</strong>,{" "}
                            <strong>{slot.roomDetails.maxChildren} Trẻ em</strong>
                          </div>
                          <div>
                            Phụ thu trẻ em vượt định mức:{" "}
                            <strong style={{ color: "#fbbf24" }}>
                              {formatCurrency(slot.roomDetails.extraChildFee)}/trẻ/đêm
                            </strong>
                          </div>
                        </div>
                      )}

                      {/* Danh sách khách lưu trú trong phòng này */}
                      <div>
                        <div
                          style={{
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "center",
                            marginBottom: "0.5rem",
                          }}
                        >
                          <span style={{ fontSize: "0.8125rem", fontWeight: 600, color: "var(--text-main)" }}>
                            Danh Sách Khách Lưu Trú ({slot.guests.length} khách):
                          </span>
                          <button
                            type="button"
                            onClick={() => handleAddGuest(slotIdx)}
                            className="btn btn-secondary"
                            style={{ padding: "0.3rem 0.75rem", fontSize: "0.75rem", display: "flex", gap: "0.25rem" }}
                          >
                            <Plus size={13} />
                            <span>Thêm Khách</span>
                          </button>
                        </div>

                        <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                          {slot.guests.map((guest, guestIdx) => {
                            const bYear = parseInt(guest.birthYear, 10) || currentYear;
                            const isChild = currentYear - bYear < 12;

                            return (
                              <div
                                key={guestIdx}
                                style={{
                                  display: "grid",
                                  gridTemplateColumns: "1fr 1fr 100px 90px 40px",
                                  gap: "0.5rem",
                                  alignItems: "center",
                                  background: "rgba(17, 24, 39, 0.6)",
                                  padding: "0.5rem 0.75rem",
                                  borderRadius: "0.375rem",
                                }}
                              >
                                <input
                                  type="text"
                                  placeholder="Họ và tên khách *"
                                  value={guest.fullName}
                                  onChange={(e) =>
                                    handleGuestChange(slotIdx, guestIdx, "fullName", e.target.value)
                                  }
                                  required
                                  style={{
                                    padding: "0.4rem 0.6rem",
                                    borderRadius: "0.25rem",
                                    background: "#1f2937",
                                    border: "1px solid var(--border-color)",
                                    color: "var(--text-main)",
                                    fontSize: "0.8125rem",
                                  }}
                                />

                                <input
                                  type="text"
                                  placeholder="CCCD/CMND/Khai sinh *"
                                  value={guest.idNumber}
                                  onChange={(e) =>
                                    handleGuestChange(slotIdx, guestIdx, "idNumber", e.target.value)
                                  }
                                  required
                                  style={{
                                    padding: "0.4rem 0.6rem",
                                    borderRadius: "0.25rem",
                                    background: "#1f2937",
                                    border: "1px solid var(--border-color)",
                                    color: "var(--text-main)",
                                    fontSize: "0.8125rem",
                                  }}
                                />

                                <input
                                  type="number"
                                  placeholder="Năm sinh"
                                  value={guest.birthYear}
                                  onChange={(e) =>
                                    handleGuestChange(slotIdx, guestIdx, "birthYear", e.target.value)
                                  }
                                  min="1900"
                                  max={currentYear}
                                  required
                                  style={{
                                    padding: "0.4rem 0.6rem",
                                    borderRadius: "0.25rem",
                                    background: "#1f2937",
                                    border: "1px solid var(--border-color)",
                                    color: "var(--text-main)",
                                    fontSize: "0.8125rem",
                                    textAlign: "center",
                                  }}
                                />

                                <div style={{ textAlign: "center" }}>
                                  {isChild ? (
                                    <span
                                      style={{
                                        fontSize: "0.7rem",
                                        fontWeight: 700,
                                        padding: "0.2rem 0.4rem",
                                        borderRadius: "9999px",
                                        background: "rgba(245, 158, 11, 0.15)",
                                        color: "#f59e0b",
                                        border: "1px solid rgba(245, 158, 11, 0.3)",
                                        display: "inline-block",
                                      }}
                                    >
                                      Trẻ em ({currentYear - bYear}t)
                                    </span>
                                  ) : (
                                    <span
                                      style={{
                                        fontSize: "0.7rem",
                                        fontWeight: 700,
                                        padding: "0.2rem 0.4rem",
                                        borderRadius: "9999px",
                                        background: "rgba(99, 102, 241, 0.15)",
                                        color: "#a5b4fc",
                                        border: "1px solid rgba(99, 102, 241, 0.3)",
                                        display: "inline-block",
                                      }}
                                    >
                                      Người lớn
                                    </span>
                                  )}
                                </div>

                                <button
                                  type="button"
                                  onClick={() => handleRemoveGuest(slotIdx, guestIdx)}
                                  disabled={slot.guests.length <= 1}
                                  title="Xóa khách"
                                  style={{
                                    background: "none",
                                    border: "none",
                                    color: slot.guests.length > 1 ? "#ef4444" : "var(--text-dim)",
                                    cursor: slot.guests.length > 1 ? "pointer" : "not-allowed",
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                  }}
                                >
                                  <Trash2 size={16} />
                                </button>
                              </div>
                            );
                          })}
                        </div>
                      </div>

                      {/* Thông báo phụ thu trẻ em tự động của phòng này nếu có */}
                      {breakdown && breakdown.excessChildren > 0 && (
                        <div
                          style={{
                            padding: "0.75rem 1rem",
                            borderRadius: "0.5rem",
                            background: "rgba(245, 158, 11, 0.1)",
                            border: "1px solid rgba(245, 158, 11, 0.3)",
                            fontSize: "0.8125rem",
                            color: "#fbbf24",
                            display: "flex",
                            alignItems: "center",
                            gap: "0.625rem",
                          }}
                        >
                          <Info size={18} style={{ flexShrink: 0 }} />
                          <div>
                            <strong>Tự động tính phụ thu trẻ em (SPEC 4.4):</strong> Phòng này có{" "}
                            <strong>{breakdown.childCount} trẻ em</strong>, vượt định mức miễn phí (
                            {breakdown.maxChildren} trẻ). Số trẻ tính phụ thu:{" "}
                            <strong>+{breakdown.excessChildren} trẻ</strong> ×{" "}
                            {formatCurrency(breakdown.extraFeePerChild)} × {nights} đêm ={" "}
                            <strong style={{ color: "#f59e0b" }}>
                              {formatCurrency(breakdown.fee)}
                            </strong>
                            .
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Tóm tắt tổng chi phí & phụ thu khi Check-in */}
              <div
                style={{
                  padding: "1.25rem",
                  borderRadius: "0.75rem",
                  background: "rgba(17, 24, 39, 0.8)",
                  border: "1px solid var(--border-color)",
                  display: "flex",
                  flexDirection: "column",
                  gap: "0.5rem",
                  fontSize: "0.875rem",
                }}
              >
                <div style={{ fontWeight: 700, color: "var(--text-main)", marginBottom: "0.25rem" }}>
                  Tổng Kết Quyết Toán Check-in
                </div>

                <div style={{ display: "flex", justifyContent: "space-between", color: "var(--text-muted)" }}>
                  <span>Tiền phòng thực tế ({nights} đêm):</span>
                  <span>{formatCurrency(booking?.netRoomFee)}</span>
                </div>

                <div style={{ display: "flex", justifyContent: "space-between", color: "var(--text-muted)" }}>
                  <span>Số tiền khách đã thanh toán trước:</span>
                  <span style={{ color: "#10b981", fontWeight: 600 }}>
                    -{formatCurrency(booking?.prepaidBookingValue)} ({booking?.paymentOption === "FULL_100" ? "100%" : "Cọc 50%"})
                  </span>
                </div>

                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    color: totalExtraChildrenFee > 0 ? "#f59e0b" : "var(--text-muted)",
                    fontWeight: totalExtraChildrenFee > 0 ? 700 : 400,
                  }}
                >
                  <span>Tổng phụ thu trẻ em tự động ({nights} đêm):</span>
                  <span>+{formatCurrency(totalExtraChildrenFee)}</span>
                </div>

                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    paddingTop: "0.5rem",
                    borderTop: "1px solid var(--border-color)",
                    fontSize: "1rem",
                    fontWeight: 800,
                  }}
                >
                  <span style={{ color: "var(--text-main)" }}>Dự kiến số tiền còn lại phải thu khi Check-out:</span>
                  <span style={{ color: "#fbbf24" }}>
                    {formatCurrency(
                      Number(booking?.netRoomFee || 0) +
                        totalExtraChildrenFee -
                        Number(booking?.prepaidBookingValue || 0),
                    )}
                  </span>
                </div>
              </div>
            </>
          )}

          {/* Footer nút hành động */}
          <div
            style={{
              display: "flex",
              justifyContent: "flex-end",
              gap: "0.75rem",
              paddingTop: "1rem",
              borderTop: "1px solid var(--border-color)",
            }}
          >
            <button type="button" onClick={onClose} className="btn btn-secondary" disabled={submitting}>
              Đóng
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={loading || submitting}
              style={{
                padding: "0.75rem 1.75rem",
                fontSize: "0.875rem",
                fontWeight: 700,
                background: "linear-gradient(135deg, #10b981 0%, #059669 100%)",
                display: "flex",
                alignItems: "center",
                gap: "0.5rem",
              }}
            >
              {submitting ? (
                <>
                  <div className="animate-spin">⏳</div>
                  <span>Đang Khóa Phòng & Check-in...</span>
                </>
              ) : (
                <>
                  <ShieldCheck size={18} />
                  <span>Xác Nhận Check-in & Gán Phòng</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

