import React, { useEffect } from "react";
import { Printer, X, CheckCircle, Tag, Building2, Phone, Mail, User, Bed, Calendar } from "lucide-react";

// Hàm chuyển số thành chữ tiền tệ tiếng Việt cơ bản
function convertNumberToWords(amount) {
  if (!amount || isNaN(amount)) return "Không đồng";
  const num = Math.round(Number(amount));
  if (num === 0) return "Không đồng";

  const units = ["", "một", "hai", "ba", "bốn", "năm", "sáu", "bảy", "tám", "chín"];
  const scales = ["", "nghìn", "triệu", "tỷ"];

  // Đơn giản hóa chuyển đổi cho các mức tiền phòng/dịch vụ
  const formatVND = new Intl.NumberFormat("vi-VN").format(num);
  return `${formatVND} đồng`;
}

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
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black bg-opacity-60 flex items-center justify-center p-4">
      {/* CSS dành riêng cho in ấn chuẩn @media print */}
      <style>{`
        @media print {
          body * {
            visibility: hidden;
          }
          #printable-ticket, #printable-ticket * {
            visibility: visible;
          }
          #printable-ticket {
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

      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[92vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Header Modal (Không in) */}
        <div className="no-print bg-slate-900 text-white px-6 py-4 flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-blue-600 rounded-lg">
              <Printer className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="font-bold text-lg">In Phiếu Sử Dụng Dịch Vụ</h3>
              <p className="text-xs text-slate-400">Xem trước & xuất bản in khổ chuẩn A5/A4</p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={handlePrint}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-lg flex items-center space-x-2 shadow-sm transition"
            >
              <Printer className="w-4 h-4" />
              <span>In Phiếu (Print)</span>
            </button>
            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Nội dung Phiếu Dịch Vụ - Có thể in */}
        <div className="p-6 overflow-y-auto flex-1 bg-slate-50 flex justify-center">
          <div
            id="printable-ticket"
            className="bg-white border border-slate-300 rounded-xl p-8 max-w-xl w-full shadow-sm text-slate-900 print:border-none print:shadow-none"
          >
            {/* Header thương hiệu Khách Sạn */}
            <div className="border-b-2 border-slate-900 pb-4 mb-6">
              <div className="flex items-start justify-between">
                <div>
                  <h1 className="text-xl font-extrabold tracking-tight text-slate-950 uppercase">
                    e-Hotel Luxury Resort & Spa
                  </h1>
                  <p className="text-xs text-slate-600 mt-0.5">
                    Đẳng cấp nghỉ dưỡng & dịch vụ tiêu chuẩn 5 sao quốc tế
                  </p>
                  <p className="text-xs text-slate-500 mt-1">
                    Hotline: 1900 8888 | Email: reception@ehotel.local | Web: ehotel.local
                  </p>
                </div>
                <div className="text-right">
                  <span className="inline-block px-2.5 py-1 bg-slate-100 text-slate-800 font-mono text-xs font-bold rounded border border-slate-300">
                    {ticket.ticketId}
                  </span>
                  <p className="text-[11px] text-slate-500 mt-1">
                    {formatDateTime(ticket.createdAt)}
                  </p>
                </div>
              </div>
            </div>

            {/* Tiêu đề Phiếu */}
            <div className="text-center my-4">
              <h2 className="text-xl font-bold tracking-wide uppercase text-slate-900">
                PHIẾU DỊCH VỤ PHÒNG
              </h2>
              <p className="text-xs italic text-slate-500 mt-0.5">
                (Room Service Order & Charge Voucher)
              </p>
            </div>

            {/* Thông tin phòng & khách */}
            <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 mb-6 grid grid-cols-2 gap-3 text-xs">
              <div>
                <span className="text-slate-500 block">Số phòng lưu trú:</span>
                <span className="font-bold text-base text-blue-700">
                  Phòng {ticket.roomId}
                </span>
                {ticket.roomType && (
                  <span className="text-slate-500 text-[11px] block">
                    ({ticket.roomType} - {ticket.roomSize})
                  </span>
                )}
              </div>
              <div>
                <span className="text-slate-500 block">Mã đơn đặt phòng:</span>
                <span className="font-semibold text-slate-800 font-mono">
                  {ticket.bookingNumber || `BK-#${ticket.bookingId}`}
                </span>
              </div>
              <div>
                <span className="text-slate-500 block">Khách đại diện đặt:</span>
                <span className="font-semibold text-slate-800">
                  {ticket.customerName || "Khách vãng lai"}
                </span>
              </div>
              <div>
                <span className="text-slate-500 block">Số điện thoại liên hệ:</span>
                <span className="font-semibold text-slate-800 font-mono">
                  {ticket.customerPhone || "---"}
                </span>
              </div>

              {ticket.stayingGuests && ticket.stayingGuests.length > 0 && (
                <div className="col-span-2 pt-2 border-t border-slate-200">
                  <span className="text-slate-500 block mb-1">Khách đang ở phòng này:</span>
                  <div className="flex flex-wrap gap-1.5">
                    {ticket.stayingGuests.map((g, idx) => (
                      <span
                        key={idx}
                        className="inline-flex items-center px-2 py-0.5 rounded bg-white border border-slate-200 text-[11px] text-slate-700 font-medium"
                      >
                        {g.fullName} ({g.guestType === "CHILD" ? "Trẻ em" : "Người lớn"})
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Bảng chi tiết dịch vụ */}
            <div className="mb-6">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b-2 border-slate-900 bg-slate-100 text-slate-800">
                    <th className="py-2.5 px-3 font-bold text-center w-10">STT</th>
                    <th className="py-2.5 px-3 font-bold">Tên dịch vụ</th>
                    <th className="py-2.5 px-3 font-bold text-center w-16">ĐVT</th>
                    <th className="py-2.5 px-3 font-bold text-center w-14">SL</th>
                    <th className="py-2.5 px-3 font-bold text-right w-24">Đơn giá</th>
                    <th className="py-2.5 px-3 font-bold text-right w-28">Thành tiền</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  <tr>
                    <td className="py-3 px-3 text-center font-medium">1</td>
                    <td className="py-3 px-3">
                      <div className="font-bold text-slate-900">{ticket.serviceName}</div>
                      {ticket.description && (
                        <div className="text-[11px] text-slate-500 mt-0.5">
                          {ticket.description}
                        </div>
                      )}
                      <div className="text-[10px] text-slate-400 font-mono">
                        Mã DV: {ticket.serviceId}
                      </div>
                    </td>
                    <td className="py-3 px-3 text-center">{ticket.unit}</td>
                    <td className="py-3 px-3 text-center font-bold text-slate-900">
                      {ticket.quantity}
                    </td>
                    <td className="py-3 px-3 text-right font-medium">
                      {formatCurrency(ticket.unitPrice)}
                    </td>
                    <td className="py-3 px-3 text-right font-bold text-blue-700">
                      {formatCurrency(ticket.totalPrice)}
                    </td>
                  </tr>
                </tbody>
                <tfoot>
                  <tr className="border-t-2 border-slate-900 bg-slate-50">
                    <td colSpan="5" className="py-3 px-3 text-right font-bold text-slate-900">
                      TỔNG CỘNG TIỀN DỊCH VỤ:
                    </td>
                    <td className="py-3 px-3 text-right font-extrabold text-sm text-blue-800">
                      {formatCurrency(ticket.totalPrice)}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>

            {/* Ghi chú thanh toán */}
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-xs text-amber-900 mb-6 flex items-start space-x-2">
              <Tag className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
              <div>
                <span className="font-bold">Lưu ý quyết toán:</span> Khoản phí dịch vụ này sẽ
                được ghi nhận vào hồ sơ phòng và quyết toán chung khi Quý khách làm thủ tục trả
                phòng (Check-out).
              </div>
            </div>

            {/* Chữ ký xác nhận */}
            <div className="grid grid-cols-2 gap-8 text-center text-xs pt-4 border-t border-slate-200">
              <div>
                <p className="font-bold text-slate-800">Khách hàng xác nhận</p>
                <p className="text-[11px] text-slate-400 italic">(Ký và ghi rõ họ tên)</p>
                <div className="h-16"></div>
                <p className="font-semibold text-slate-700">
                  {ticket.customerName || "........................................"}
                </p>
              </div>
              <div>
                <p className="font-bold text-slate-800">Nhân viên / Lễ tân thực hiện</p>
                <p className="text-[11px] text-slate-400 italic">(Ký và ghi rõ họ tên)</p>
                <div className="h-16"></div>
                <p className="font-semibold text-slate-700">
                  ........................................
                </p>
              </div>
            </div>

            {/* Footer bản in */}
            <div className="mt-8 pt-3 border-t border-dashed border-slate-300 text-center text-[10px] text-slate-400">
              e-Hotel Online Management System — Cảm ơn Quý khách đã sử dụng dịch vụ!
            </div>
          </div>
        </div>

        {/* Footer Modal (Không in) */}
        <div className="no-print bg-slate-100 px-6 py-3 border-t border-slate-200 flex items-center justify-between">
          <span className="text-xs text-slate-500">
            Khuyến nghị: Chọn máy in hoặc Lưu dưới dạng PDF (Save as PDF) với khổ giấy A5/A4
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
              className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold rounded-lg flex items-center space-x-2 shadow transition"
            >
              <Printer className="w-4 h-4" />
              <span>In Ngay</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

