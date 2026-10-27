# Session Handoff

**Last Updated:** 2026-10-27

## Current Objective

- **Goal:** Hoàn thành tính năng `FEAT-08: Check & Cancel Booking (24h Rule & 80/20 Refund)`. Chuẩn bị bước vào triển khai `FEAT-09: Booking Management & Check-in (Physical Room Assignment & Auto Child Surcharge)`.
- **Current status:** `FEAT-01`, `FEAT-02`, `FEAT-03`, `FEAT-04`, `FEAT-05`, `FEAT-06`, `FEAT-07`, và `FEAT-08` đã hoàn tất và nghiệm thu 100%. Sẵn sàng cho `FEAT-09`.
- **Branch / commit:** master

## Completed This Session

- [x] Triển khai và nghiệm thu `FEAT-08: Check & Cancel Booking (24h Rule & 80/20 Refund)`:
  - **Tầng Service Nghiệp vụ Hủy Đặt phòng ([backend/src/services/booking.service.js](file:///d:/Phuong_Anh_internship_project/Hotel%20Management%20Online/Hotel%20Management%20Online/backend/src/services/booking.service.js)):**
    - `lookupBooking({ bookingNumber })`: Tra cứu thông tin chi tiết đơn, số đêm, items, tiền đã trả, tiền còn lại khi check-in, cờ `isCancellable` (kiểm tra `status === 'CONFIRMED'` và $\text{fromDate} - \text{now} \ge 24\text{ hours}$), và phân tích chi phí hủy phòng dự kiến.
    - `cancelBooking({ bookingNumber })`:
      - **Pessimistic Locking Flow (Luồng 3.2 ARCHITECHTURE.md):** Bọc toàn bộ quy trình hủy và hoàn tiền trong `prisma.$transaction(async (tx) => { ... })`.
      - Khóa bi quan bản ghi đơn đặt phòng: `SELECT * FROM bookings WHERE booking_number = $1 FOR UPDATE`.
      - Kiểm tra điều kiện nghiêm ngặt:
        - Nếu đơn không tồn tại $\rightarrow$ 404 `RESOURCE_NOT_FOUND`.
        - Nếu `status !== 'CONFIRMED'` $\rightarrow$ 400 `CANCELLATION_INVALID` (Chặn hủy đơn đã CHECKED_IN, CHECKED_OUT, hoặc đã CANCELLED).
        - Nếu thời gian còn lại đến giờ nhận phòng $< 24\text{ hours}$ $\rightarrow$ 400 `CANCELLATION_INVALID`.
      - Tính toán tài chính 80/20 theo Spec 4.3:
        - $\text{cancellationFee} = 0.20 \times \text{prepaidBookingValue}$ (Khách sạn giữ 20%).
        - $\text{refundAmount} = 0.80 \times \text{prepaidBookingValue}$ (Hoàn lại 80% cho khách).
      - Khóa tài khoản thanh toán gốc: `SELECT * FROM payment_accounts WHERE account_number = $1 FOR UPDATE`.
      - Cộng hoàn tiền: `UPDATE payment_accounts SET balance = balance + refundAmount`.
      - Cập nhật đơn: `status = 'CANCELLED'`, lưu `cancellationFee`, `refundAmount`, `cancelledAt`.
      - Tồn kho tự động giải phóng do `searchAvailability` chỉ tính các đơn `CONFIRMED` và `CHECKED_IN`.
      - Khóa bi quan phòng chống 100% rủi ro Double Refund khi hủy đồng thời.
  - **Tầng Controller & Routes ([backend/src/controllers/booking.controller.js](file:///d:/Phuong_Anh_internship_project/Hotel%20Management%20Online/Hotel%20Management%20Online/backend/src/controllers/booking.controller.js), [backend/src/entrypoints/public.routes.js](file:///d:/Phuong_Anh_internship_project/Hotel%20Management%20Online/Hotel%20Management%20Online/backend/src/entrypoints/public.routes.js)):**
    - Mount endpoint công khai: `GET /api/public/bookings/:bookingNumber`, `POST /api/public/bookings/:bookingNumber/cancel`.
  - **Kiểm thử tự động ([backend/tests/feat08.test.js](file:///d:/Phuong_Anh_internship_project/Hotel%20Management%20Online/Hotel%20Management%20Online/backend/tests/feat08.test.js)):**
    - 9 bài kiểm thử tích hợp chuyên sâu (tất cả 9/9 PASS, nâng tổng số bài test lên 92/92 PASS trên 9 suites).
  - **Giao diện React SPA:**
    - Component [frontend/src/pages/customer/BookingLookupModal.jsx](file:///d:/Phuong_Anh_internship_project/Hotel%20Management%20Online/Hotel%20Management%20Online/frontend/src/pages/customer/BookingLookupModal.jsx):
      - Tra cứu thời gian thực theo mã `bookingNumber`.
      - Hiển thị badge trạng thái sắc nét, thông tin khách hàng, lịch trình lưu trú, số đêm, đếm ngược thời gian nhận phòng.
      - Phân tích chi tiết quy tắc hủy phòng 24h & 80/20.
      - Modal con xác nhận hủy phòng an toàn chống thao tác nhầm.
    - Tích hợp nút tra cứu trên Navbar toàn cục [frontend/src/App.jsx](file:///d:/Phuong_Anh_internship_project/Hotel%20Management%20Online/Hotel%20Management%20Online/frontend/src/App.jsx) và Hero banner [frontend/src/pages/customer/RoomCatalog.jsx](file:///d:/Phuong_Anh_internship_project/Hotel%20Management%20Online/Hotel%20Management%20Online/frontend/src/pages/customer/RoomCatalog.jsx).
    - Tích hợp nút "Tra Cứu & Quản Lý Đơn Này" trên màn hình đặt phòng thành công [frontend/src/pages/customer/BookingCheckoutModal.jsx](file:///d:/Phuong_Anh_internship_project/Hotel%20Management%20Online/Hotel%20Management%20Online/frontend/src/pages/customer/BookingCheckoutModal.jsx).
    - Frontend Vite production build PASS (4.24s).
- [x] Nghiệm thu hoàn thành `FEAT-08` trong [feature_list.json](file:///d:/Phuong_Anh_internship_project/Hotel%20Management%20Online/Hotel%20Management%20Online/feature_list.json).

## Verification Evidence

| Check | Command | Result | Notes |
|---|---|---|---|
| Prisma Schema Validation | `cd backend && npx prisma validate` | PASS | Schema hợp lệ 100% |
| Unit & Integration Tests | `cd backend && npm test` | PASS (92/92 tests) | 9 suites (`api`, `feat01`, `feat02`, `feat03`, `feat04`, `feat05`, `feat06`, `feat07`, `feat08`), 0 fail |
| Code Linting | `cd backend && npm run lint` | PASS | 0 lint errors |
| Frontend Production Build | `cd frontend && npm run build` | PASS | Vite bundle built in 4.24s |
| Environment Init Script | `powershell -ExecutionPolicy Bypass -File .\init.ps1` | PASS | Tiến độ 8/12 features completed |

## Decisions Made

- Sử dụng **Node.js (v24)** với cú pháp **JavaScript ES Modules (`"type": "module"`)** cho toàn bộ backend.
- Sử dụng **Express.js** làm REST API web framework tiêu chuẩn.
- Sử dụng **Prisma ORM** cho tầng Data Access và quản lý database PostgreSQL.
- Phân quyền theo ma trận **Strict Disjoint RBAC**: `ADMIN` (`/api/admin/*`), `MANAGER` (`/api/setup/*`), `SALE` (`/api/operation/*`) tách biệt hoàn toàn; không có quyền thừa kế.
- Cơ chế **Concurrency & Transaction (Luồng 3.2 ARCHITECHTURE.md)**:
  - Bọc quy trình hủy phòng trong `prisma.$transaction`.
  - Khóa bi quan `SELECT ... FOR UPDATE` trên cả bản ghi `bookings` và `payment_accounts`.
  - Kiểm tra điều kiện luật 24h: $\text{fromDate} - \text{now} \ge 24\text{ hours}$ và `status === 'CONFIRMED'`.
  - Tính phạt `cancellationFee = 20%` và hoàn trả `refundAmount = 80%` vào tài khoản thanh toán giả lập gốc.
  - Tồn kho khả dụng được giải phóng tự động cho khách hàng khác đặt phòng.

## Blockers / Risks

- Không còn blocker: Toàn bộ 92 tests kiểm thử tự động PASS 100%, quy trình hủy phòng, hoàn tiền 80/20 và tra cứu trực tuyến hoạt động trơn tru.

## Next Session Startup

1. Chạy `powershell -ExecutionPolicy Bypass -File .\init.ps1` hoặc `./init.sh`.
2. Kiểm tra `feature_list.json` và `progress.md`.
3. Bắt đầu tính năng tiếp theo: `FEAT-09: Booking Management & Check-in (Physical Room Assignment & Auto Child Surcharge)`.
