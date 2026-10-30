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
          // Nếu có initialRoomId thì chọn, nếu không thì chọn phòng đầu tiên
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
        // Gọi callback với dữ liệu phiếu vừa tạo
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
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black bg-opacity-60 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-xl w-full overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-700 to-indigo-800 text-white px-6 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-white/10 rounded-lg">
              <Coffee className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="font-bold text-lg">Đăng Ký Sử Dụng Dịch Vụ Phòng</h3>
              <p className="text-xs text-blue-100">
                Ghi nhận dịch vụ và xuất phiếu in xác nhận cho khách
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-blue-100 hover:text-white hover:bg-white/10 rounded-lg transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        {loading ? (
          <div className="p-8 text-center text-slate-500">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-3"></div>
            <p className="text-sm">Đang tải danh sách phòng và dịch vụ...</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="p-6 space-y-5">
            {errorMsg && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-xs flex items-center space-x-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            {/* Chọn số phòng đang OCCUPIED */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                1. Chọn phòng lưu trú (Chỉ các phòng đang OCCUPIED) *
              </label>
              {occupiedRooms.length === 0 ? (
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-amber-800 text-xs">
                  Hiện không có phòng nào đang ở trạng thái OCCUPIED (Đang có khách lưu trú).
                  Vui lòng làm thủ tục Check-in trước khi đăng ký dịch vụ.
                </div>
              ) : (
                <select
                  value={selectedRoomId}
                  onChange={(e) => setSelectedRoomId(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-lg text-sm font-medium focus:ring-2 focus:ring-blue-500 focus:bg-white transition"
                  required
                >
                  {occupiedRooms.map((r) => (
                    <option key={r.roomId} value={r.roomId}>
                      Phòng {r.roomId} ({r.type} - {r.size}) — {r.customerName || "Khách"} [
                      {r.bookingNumber}]
                    </option>
                  ))}
                </select>
              )}

              {/* Thông tin nhanh của phòng đang chọn */}
              {selectedRoom && (
                <div className="mt-2 p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-600 flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Bed className="w-4 h-4 text-blue-600" />
                    <span>
                      <strong className="text-slate-800">Khách lưu trú:</strong>{" "}
                      {selectedRoom.customerName} ({selectedRoom.customerPhone || "N/A"})
                    </span>
                  </div>
                  <span className="px-2 py-0.5 bg-emerald-100 text-emerald-700 rounded text-[11px] font-semibold">
                    Đang ở (OCCUPIED)
                  </span>
                </div>
              )}
            </div>

            {/* Chọn Dịch Vụ */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                2. Chọn dịch vụ sử dụng *
              </label>
              <select
                value={selectedServiceId}
                onChange={(e) => setSelectedServiceId(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-lg text-sm font-medium focus:ring-2 focus:ring-blue-500 focus:bg-white transition"
                required
              >
                {services.map((s) => (
                  <option key={s.serviceId} value={s.serviceId}>
                    {s.serviceName} — {formatCurrency(s.price)} / {s.unit} ({s.serviceId})
                  </option>
                ))}
              </select>

              {selectedService && selectedService.description && (
                <p className="mt-1 text-xs text-slate-500 italic">
                  {selectedService.description}
                </p>
              )}
            </div>

            {/* Số lượng & Đơn giá */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  3. Số lượng ({selectedService?.unit || "Lượt"}) *
                </label>
                <div className="flex items-center border border-slate-300 rounded-lg bg-slate-50 overflow-hidden">
                  <button
                    type="button"
                    onClick={() => handleQuantityChange(-1)}
                    disabled={quantity <= 1}
                    className="p-2.5 text-slate-600 hover:bg-slate-200 disabled:opacity-40 transition"
                  >
                    <Minus className="w-4 h-4" />
                  </button>
                  <input
                    type="number"
                    min="1"
                    max="999"
                    value={quantity}
                    onChange={(e) =>
                      setQuantity(Math.max(1, parseInt(e.target.value, 10) || 1))
                    }
                    className="w-full text-center bg-transparent py-2 text-sm font-bold text-slate-900 focus:outline-none"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => handleQuantityChange(1)}
                    className="p-2.5 text-slate-600 hover:bg-slate-200 transition"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Đơn giá niêm yết
                </label>
                <div className="px-3.5 py-2.5 bg-slate-100 border border-slate-200 rounded-lg text-sm font-semibold text-slate-700">
                  {formatCurrency(unitPrice)}
                </div>
              </div>
            </div>

            {/* Box Tổng tiền & Quyết toán */}
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-medium text-blue-900">
                  Thành tiền phiếu dịch vụ:
                </span>
                <span className="text-xl font-extrabold text-blue-800">
                  {formatCurrency(totalPrice)}
                </span>
              </div>
              <div className="text-[11px] text-blue-700 flex items-start space-x-1.5 pt-2 border-t border-blue-200/60">
                <Info className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
                <span>
                  Khoản này sẽ tự động ghi nợ vào đơn đặt phòng và quyết toán khi khách làm thủ tục Check-out.
                </span>
              </div>
            </div>

            {/* Actions */}
            <div className="pt-2 flex items-center justify-end space-x-3">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2.5 border border-slate-300 text-slate-700 hover:bg-slate-100 text-sm font-medium rounded-lg transition"
              >
                Hủy bỏ
              </button>
              <button
                type="submit"
                disabled={submitting || occupiedRooms.length === 0}
                className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white text-sm font-bold rounded-lg flex items-center space-x-2 shadow transition"
              >
                {submitting ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                    <span>Đang lập phiếu...</span>
                  </>
                ) : (
                  <>
                    <Printer className="w-4 h-4" />
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

