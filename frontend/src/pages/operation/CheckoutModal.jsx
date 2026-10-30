import React, { useState, useEffect } from "react";
import {
  X,
  LogOut,
  AlertCircle,
  CheckCircle,
  FileText,
  DollarSign,
  Coffee,
  Bed,
  Users,
  Calendar,
  Clock,
  Printer,
  ShieldAlert,
} from "lucide-react";
import { apiRequest } from "../../api/client.js";

const formatCurrency = (amount) => {
  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
  }).format(amount || 0);
};

export default function CheckoutModal({ booking, onClose, onCheckoutSuccess }) {
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState(null);
  const [previewData, setPreviewData] = useState(null);

  useEffect(() => {
    async function loadPreview() {
      try {
        setLoading(true);
        setErrorMsg(null);
        const res = await apiRequest(`/api/operation/bookings/${booking.id}/checkout-preview`);
        if (res.success && res.data) {
          setPreviewData(res.data);
        }
      } catch (err) {
        setErrorMsg(err.message || "Không thể tải thông tin quyết toán Check-out.");
      } finally {
        setLoading(false);
      }
    }

    if (booking?.id) {
      loadPreview();
    }
  }, [booking?.id]);

  const handleConfirmCheckout = async () => {
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
      setErrorMsg(err.message || "Không thể hoàn tất thủ tục Check-out.");
    } finally {
      setSubmitting(false);
    }
  };

  if (!booking) return null;

  const breakdown = previewData?.breakdown || {};
  const rooms = previewData?.rooms || [];
  const services = previewData?.services || [];

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black bg-opacity-60 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[92vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="bg-gradient-to-r from-amber-600 to-orange-700 text-white px-6 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-white/10 rounded-lg">
              <LogOut className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="font-bold text-lg">Thủ Tục Check-out & Quyết Toán Hóa Đơn</h3>
              <p className="text-xs text-amber-100">
                Đơn #{booking.bookingNumber} — Khách hàng: {booking.customerName}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-amber-100 hover:text-white hover:bg-white/10 rounded-lg transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        {loading ? (
          <div className="p-10 text-center text-slate-500">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-amber-600 mx-auto mb-3"></div>
            <p className="text-sm">Đang tải bảng tính quyết toán tài chính Check-out...</p>
          </div>
        ) : (
          <div className="p-6 overflow-y-auto flex-1 space-y-5 text-slate-900">
            {errorMsg && (
              <div className="p-3.5 bg-red-50 border border-red-200 rounded-lg text-red-700 text-xs flex items-center space-x-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            {/* Tóm tắt thông tin phòng & khách */}
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 text-xs grid grid-cols-2 gap-3">
              <div>
                <span className="text-slate-500 block">Khách đại diện:</span>
                <span className="font-bold text-slate-800 text-sm">{booking.customerName}</span>
                <span className="text-slate-500 block">{booking.customerPhone}</span>
              </div>
              <div>
                <span className="text-slate-500 block">Lịch trình lưu trú:</span>
                <span className="font-semibold text-slate-800">
                  {new Date(booking.fromDate).toLocaleDateString("vi-VN")} →{" "}
                  {new Date(booking.toDate).toLocaleDateString("vi-VN")}
                </span>
                <span className="text-blue-600 font-bold block">
                  {previewData?.booking?.nights || booking.nights || 1} đêm
                </span>
              </div>
              <div className="col-span-2 pt-2 border-t border-slate-200">
                <span className="text-slate-500 block mb-1">
                  Các phòng vật lý sẽ được giải phóng về trạng thái AVAILABLE:
                </span>
                <div className="flex flex-wrap gap-2">
                  {rooms.map((r) => (
                    <span
                      key={r.roomId}
                      className="px-2.5 py-1 bg-white border border-slate-300 rounded font-bold text-blue-700"
                    >
                      Phòng {r.roomId} ({r.type} {r.size})
                    </span>
                  ))}
                </div>
              </div>
            </div>

            {/* Bảng chi tiết quyết toán tài chính */}
            <div className="space-y-3">
              <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                Chi Tiết Các Khoản Quyết Toán
              </h4>

              {/* 1. Tiền phòng */}
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-xs flex justify-between items-center">
                <div>
                  <span className="font-bold text-slate-800">1. Tiền phòng lưu trú:</span>
                  <span className="text-slate-500 block text-[11px]">
                    Đã áp dụng chiết khấu khuyến mãi (nếu có)
                  </span>
                </div>
                <span className="font-extrabold text-sm text-slate-900">
                  {formatCurrency(breakdown.netRoomFee)}
                </span>
              </div>

              {/* 2. Phụ thu trẻ em */}
              <div className="p-3 bg-amber-50/60 border border-amber-200 rounded-lg text-xs flex justify-between items-center">
                <div>
                  <span className="font-bold text-amber-900">2. Phụ thu trẻ em vượt tiêu chuẩn:</span>
                  <span className="text-amber-700 block text-[11px]">
                    {breakdown.extraChildrenFee > 0
                      ? "Tự động tính theo công thức SPEC 4.4 lúc Check-in"
                      : "Không phát sinh phụ thu"}
                  </span>
                </div>
                <span className="font-extrabold text-sm text-amber-800">
                  +{formatCurrency(breakdown.extraChildrenFee)}
                </span>
              </div>

              {/* 3. Phí dịch vụ */}
              <div className="p-3 bg-blue-50/60 border border-blue-200 rounded-lg text-xs">
                <div className="flex justify-between items-center mb-1.5">
                  <div>
                    <span className="font-bold text-blue-900">3. Phí dịch vụ phát sinh:</span>
                    <span className="text-blue-700 block text-[11px]">
                      {services.length} phiếu dịch vụ đã xuất
                    </span>
                  </div>
                  <span className="font-extrabold text-sm text-blue-800">
                    +{formatCurrency(breakdown.totalServiceFee)}
                  </span>
                </div>

                {services.length > 0 && (
                  <div className="mt-2 pt-2 border-t border-blue-200/60 space-y-1">
                    {services.map((s) => (
                      <div key={s.ticketId} className="flex justify-between text-[11px] text-blue-900">
                        <span>
                          • {s.serviceName} ({s.quantity} {s.unit}) - Phòng {s.roomId} [{s.ticketId}]
                        </span>
                        <span className="font-semibold">{formatCurrency(s.totalPrice)}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Box Tổng kết & Số tiền phải thu */}
            <div className="bg-slate-900 text-white rounded-xl p-4.5 space-y-2 text-xs">
              <div className="flex justify-between text-slate-300">
                <span>Tổng giá trị đơn & dịch vụ (Total Invoice):</span>
                <span className="font-bold text-sm text-white">
                  {formatCurrency(breakdown.totalInvoiceAmount)}
                </span>
              </div>
              <div className="flex justify-between text-emerald-400">
                <span>Khấu trừ số tiền khách đã trả trước (Prepaid):</span>
                <span className="font-bold text-sm">
                  -{formatCurrency(breakdown.prepaidBookingValue)}
                </span>
              </div>
              <div className="pt-2 border-t border-slate-700 flex justify-between items-center">
                <span className="font-bold text-sm text-amber-300 uppercase">
                  SỐ TIỀN CÒN LẠI CẦN THU TẠI QUẦY:
                </span>
                <span className="font-black text-xl text-amber-300">
                  {formatCurrency(breakdown.remainingPayable)}
                </span>
              </div>
            </div>

            <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-800 flex items-start space-x-2">
              <ShieldAlert className="w-4 h-4 flex-shrink-0 mt-0.5 text-amber-600" />
              <span>
                <strong>Lưu ý:</strong> Sau khi xác nhận Check-out, đơn đặt phòng sẽ chuyển sang{" "}
                <strong>CHECKED_OUT</strong>, tất cả phòng vật lý sẽ tự động chuyển về{" "}
                <strong>AVAILABLE</strong> và hệ thống sẽ mở giao diện in hóa đơn chuẩn HTML.
              </span>
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
                type="button"
                onClick={handleConfirmCheckout}
                disabled={submitting}
                className="px-5 py-2.5 bg-amber-600 hover:bg-amber-700 disabled:bg-amber-300 text-white text-sm font-bold rounded-lg flex items-center space-x-2 shadow transition"
              >
                {submitting ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                    <span>Đang quyết toán...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle className="w-4 h-4" />
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

