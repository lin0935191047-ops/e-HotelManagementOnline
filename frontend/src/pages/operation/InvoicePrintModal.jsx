import React, { useEffect } from "react";
import { Printer, X, CheckCircle, FileText, Building2, Phone, Mail, User, Bed, Calendar, Tag, DollarSign } from "lucide-react";

const formatCurrency = (amount) => {
  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
  }).format(amount || 0);
};

const formatDateTime = (dateStr) => {
  if (!dateStr) return "---";
  const d = new Date(dateStr);
  return d.toLocaleString("vi-VN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const formatDate = (dateStr) => {
  if (!dateStr) return "---";
  return new Date(dateStr).toLocaleDateString("vi-VN");
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
    remainingPayable,
    booking = {},
    rooms = [],
    services = [],
  } = invoiceData;

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black bg-opacity-60 flex items-center justify-center p-4">
      {/* CSS chuyên dụng in ấn khổ A4 */}
      <style>{`
        @media print {
          body * {
            visibility: hidden;
          }
          #printable-invoice, #printable-invoice * {
            visibility: visible;
          }
          #printable-invoice {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            margin: 0;
            padding: 24px;
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

      <div className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full max-h-[94vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Header Modal (Không in) */}
        <div className="no-print bg-slate-900 text-white px-6 py-4 flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-emerald-600 rounded-lg">
              <FileText className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="font-bold text-lg">Hóa Đơn Quyết Toán Check-out</h3>
              <p className="text-xs text-slate-400">Xem trước & xuất bản in hóa đơn chuẩn A4</p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={handlePrint}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold rounded-lg flex items-center space-x-2 shadow-sm transition"
            >
              <Printer className="w-4 h-4" />
              <span>In Hóa Đơn (Print)</span>
            </button>
            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Nội dung Hóa đơn - In ấn */}
        <div className="p-6 overflow-y-auto flex-1 bg-slate-50 flex justify-center">
          <div
            id="printable-invoice"
            className="bg-white border border-slate-300 rounded-xl p-8 max-w-2xl w-full shadow-sm text-slate-900 print:border-none print:shadow-none"
          >
            {/* Header Khách Sạn */}
            <div className="border-b-2 border-slate-900 pb-4 mb-6">
              <div className="flex items-start justify-between">
                <div>
                  <h1 className="text-2xl font-black tracking-tight text-slate-950 uppercase">
                    e-Hotel Luxury Resort & Spa
                  </h1>
                  <p className="text-xs text-slate-600 mt-0.5">
                    Đẳng cấp nghỉ dưỡng & dịch vụ tiêu chuẩn 5 sao quốc tế
                  </p>
                  <p className="text-xs text-slate-500 mt-1">
                    Hotline: 1900 8888 | Email: accounting@ehotel.local | Web: ehotel.local
                  </p>
                </div>
                <div className="text-right">
                  <span className="inline-block px-3 py-1 bg-emerald-50 text-emerald-800 font-mono text-sm font-extrabold rounded border border-emerald-300">
                    {invoiceId}
                  </span>
                  <p className="text-xs text-slate-500 mt-1">
                    Ngày lập: {formatDateTime(issuedAt)}
                  </p>
                </div>
              </div>
            </div>

            {/* Tiêu đề Hóa Đơn */}
            <div className="text-center my-5">
              <h2 className="text-xl font-extrabold tracking-wide uppercase text-slate-900">
                HÓA ĐƠN QUYẾT TOÁN TRẢ PHÒNG
              </h2>
              <p className="text-xs italic text-slate-500 mt-0.5">
                (Guest Folio & Check-out Statement)
              </p>
            </div>

            {/* Thông tin Khách Hàng & Đơn Đặt Phòng */}
            <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 mb-6 grid grid-cols-2 gap-3 text-xs">
              <div>
                <span className="text-slate-500 block">Khách hàng đại diện:</span>
                <span className="font-bold text-sm text-slate-900">
                  {booking.customerName}
                </span>
              </div>
              <div>
                <span className="text-slate-500 block">Mã đơn đặt phòng:</span>
                <span className="font-bold text-sm text-blue-700 font-mono">
                  {booking.bookingNumber}
                </span>
              </div>
              <div>
                <span className="text-slate-500 block">Số điện thoại:</span>
                <span className="font-semibold text-slate-800 font-mono">
                  {booking.customerPhone}
                </span>
              </div>
              <div>
                <span className="text-slate-500 block">Số CCCD / CMND:</span>
                <span className="font-semibold text-slate-800 font-mono">
                  {booking.customerCccd}
                </span>
              </div>
              <div>
                <span className="text-slate-500 block">Thời gian lưu trú:</span>
                <span className="font-semibold text-slate-800">
                  {formatDate(booking.fromDate)} → {formatDate(booking.toDate)} ({booking.nights} đêm)
                </span>
              </div>
              <div>
                <span className="text-slate-500 block">Phòng vật lý đã ở:</span>
                <span className="font-bold text-slate-900">
                  {rooms.map((r) => `Phòng ${r.roomId}`).join(", ") || "---"}
                </span>
              </div>
            </div>

            {/* Danh mục chi tiết quyết toán */}
            <div className="space-y-4 mb-6">
              {/* 1. Tiền phòng */}
              <div>
                <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-1.5 flex items-center justify-between">
                  <span>1. Chi Phí Tiền Phòng</span>
                  <span className="font-mono text-emerald-700">{formatCurrency(totalRoomFee)}</span>
                </h4>
                <div className="bg-slate-50 border border-slate-200 rounded p-2.5 text-xs">
                  <div className="flex justify-between items-center">
                    <span>
                      Tiền phòng lưu trú ({booking.nights} đêm)
                      {booking.promotion && (
                        <span className="text-amber-600 text-[11px] ml-1.5">
                          (Đã áp dụng mã KM: {booking.promotion.code})
                        </span>
                      )}
                    </span>
                    <span className="font-bold">{formatCurrency(totalRoomFee)}</span>
                  </div>
                </div>
              </div>

              {/* 2. Phụ thu trẻ em nếu có */}
              {extraChildrenFee > 0 && (
                <div>
                  <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-1.5 flex items-center justify-between">
                    <span>2. Phụ Thu Trẻ Em Vượt Tiêu Chuẩn (SPEC 4.4)</span>
                    <span className="font-mono text-amber-700">+{formatCurrency(extraChildrenFee)}</span>
                  </h4>
                  <div className="bg-amber-50/60 border border-amber-200 rounded p-2.5 text-xs text-amber-900">
                    <div className="flex justify-between items-center">
                      <span>Phụ thu số lượng trẻ em vượt định mức phòng</span>
                      <span className="font-bold">+{formatCurrency(extraChildrenFee)}</span>
                    </div>
                  </div>
                </div>
              )}

              {/* 3. Dịch vụ phát sinh */}
              <div>
                <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-1.5 flex items-center justify-between">
                  <span>3. Dịch Vụ Khách Sạn Đã Sử Dụng ({services.length} phiếu)</span>
                  <span className="font-mono text-blue-700">+{formatCurrency(totalServiceFee)}</span>
                </h4>
                {services.length === 0 ? (
                  <div className="bg-slate-50 border border-slate-200 rounded p-2.5 text-xs text-slate-500 italic">
                    Không phát sinh dịch vụ phòng trong kỳ lưu trú.
                  </div>
                ) : (
                  <table className="w-full text-left border-collapse text-xs border border-slate-200 rounded">
                    <thead>
                      <tr className="bg-slate-100 text-slate-700 border-b border-slate-200">
                        <th className="py-1.5 px-2.5 font-bold">Mã phiếu</th>
                        <th className="py-1.5 px-2.5 font-bold">Tên dịch vụ</th>
                        <th className="py-1.5 px-2.5 font-bold text-center">Phòng</th>
                        <th className="py-1.5 px-2.5 font-bold text-center">SL</th>
                        <th className="py-1.5 px-2.5 font-bold text-right">Đơn giá</th>
                        <th className="py-1.5 px-2.5 font-bold text-right">Thành tiền</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      {services.map((s) => (
                        <tr key={s.ticketId}>
                          <td className="py-2 px-2.5 font-mono text-[11px] text-slate-600">{s.ticketId}</td>
                          <td className="py-2 px-2.5 font-medium">{s.serviceName}</td>
                          <td className="py-2 px-2.5 text-center">{s.roomId}</td>
                          <td className="py-2 px-2.5 text-center font-bold">{s.quantity} {s.unit}</td>
                          <td className="py-2 px-2.5 text-right">{formatCurrency(s.unitPrice)}</td>
                          <td className="py-2 px-2.5 text-right font-bold text-blue-700">
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
            <div className="border-t-2 border-slate-900 pt-4 mb-6">
              <div className="space-y-1.5 text-xs">
                <div className="flex justify-between py-1">
                  <span className="text-slate-600">Tổng tiền phòng sau chiết khấu:</span>
                  <span className="font-semibold">{formatCurrency(totalRoomFee)}</span>
                </div>
                {extraChildrenFee > 0 && (
                  <div className="flex justify-between py-1">
                    <span className="text-slate-600">Phụ thu trẻ em vượt định mức:</span>
                    <span className="font-semibold text-amber-700">+{formatCurrency(extraChildrenFee)}</span>
                  </div>
                )}
                <div className="flex justify-between py-1">
                  <span className="text-slate-600">Tổng phí dịch vụ phát sinh:</span>
                  <span className="font-semibold text-blue-700">+{formatCurrency(totalServiceFee)}</span>
                </div>
                <div className="flex justify-between py-1.5 border-t border-slate-200 font-bold text-sm">
                  <span>TỔNG GIÁ TRỊ HÓA ĐƠN:</span>
                  <span className="text-slate-900">{formatCurrency(totalInvoiceAmount)}</span>
                </div>
                <div className="flex justify-between py-1 text-emerald-700 font-medium">
                  <span>Đã thanh toán trước lúc đặt (Online Prepaid):</span>
                  <span>-{formatCurrency(prepaidBookingValue)}</span>
                </div>
                <div className="flex justify-between items-center py-2.5 border-t-2 border-slate-900 mt-2 bg-slate-100 px-3 rounded-lg">
                  <span className="font-extrabold text-sm uppercase text-slate-900">
                    SỐ TIỀN CÒN LẠI PHẢI THU TẠI QUẦY:
                  </span>
                  <span className="font-black text-lg text-emerald-800">
                    {formatCurrency(remainingPayable)}
                  </span>
                </div>
              </div>
            </div>

            {/* Ghi chú & Chữ ký xác nhận */}
            <div className="text-xs text-slate-500 mb-6 italic text-center">
              Quý khách vui lòng kiểm tra kỹ các khoản mục trên hóa đơn trước khi rời khách sạn.
            </div>

            <div className="grid grid-cols-2 gap-8 text-center text-xs pt-4 border-t border-slate-200">
              <div>
                <p className="font-bold text-slate-800">Khách hàng xác nhận thanh toán</p>
                <p className="text-[11px] text-slate-400 italic">(Ký và ghi rõ họ tên)</p>
                <div className="h-16"></div>
                <p className="font-semibold text-slate-700">
                  {booking.customerName || "........................................"}
                </p>
              </div>
              <div>
                <p className="font-bold text-slate-800">Đại diện Lễ tân / Kế toán</p>
                <p className="text-[11px] text-slate-400 italic">(Ký và đóng dấu)</p>
                <div className="h-16"></div>
                <p className="font-semibold text-slate-700">
                  ........................................
                </p>
              </div>
            </div>

            {/* Footer bản in */}
            <div className="mt-8 pt-3 border-t border-dashed border-slate-300 text-center text-[10px] text-slate-400">
              e-Hotel Online Management System — Kính chúc Quý khách một chuyến đi vui vẻ & hẹn gặp lại!
            </div>
          </div>
        </div>

        {/* Footer Modal (Không in) */}
        <div className="no-print bg-slate-100 px-6 py-3 border-t border-slate-200 flex items-center justify-between">
          <span className="text-xs text-slate-500">
            Khuyến nghị: Chọn máy in hoặc Lưu dưới dạng PDF (Save as PDF) với khổ giấy A4
          </span>
          <div className="flex space-x-2">
            <button
              onClick={onClose}
              className="px-4 py-2 border border-slate-300 text-slate-700 hover:bg-slate-200 text-sm font-medium rounded-lg transition"
            >
              Đóng
            </button>
            <button
              onClick={handlePrint}
              className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-bold rounded-lg flex items-center space-x-2 shadow transition"
            >
              <Printer className="w-4 h-4" />
              <span>In Hóa Đơn</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

