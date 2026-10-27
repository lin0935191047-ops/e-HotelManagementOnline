# Session Handoff

**Last Updated:** 2026-10-27

## Current Objective

- **Goal:** Hoàn thành tính năng `FEAT-07: Shopping Cart, Customer Form, Promotion & Payment Simulator`. Chuẩn bị bước vào triển khai `FEAT-08: Check & Cancel Booking (24h Rule & 80/20 Refund)`.
- **Current status:** `FEAT-01`, `FEAT-02`, `FEAT-03`, `FEAT-04`, `FEAT-05`, `FEAT-06`, và `FEAT-07` đã hoàn tất và nghiệm thu 100%. Sẵn sàng cho `FEAT-08`.
- **Branch / commit:** master

## Completed This Session

- [x] Triển khai và nghiệm thu `FEAT-07: Shopping Cart, Customer Form, Promotion & Payment Simulator`:
  - **Tầng Service Nghiệp vụ Đặt phòng ([backend/src/services/booking.service.js](file:///d:/Phuong_Anh_internship_project/Hotel%20Management%20Online/Hotel%20Management%20Online/backend/src/services/booking.service.js)):**
    - `validatePromotion({ code, totalRoomFee })`: Tra cứu mã coupon, kiểm tra thời hạn hiệu lực `[startDate, endDate]`, tính toán chiết khấu chuẩn xác cho `PERCENTAGE` và `FIXED_AMOUNT`.
    - `calculateBookingPreview({ fromDate, toDate, items, promotionCode, paymentOption })`: Tính toán trước số đêm lưu trú, lấy đơn giá niêm yết từ DB, tổng tiền phòng, tiền giảm giá, tiền sau giảm `netRoomFee` và tiền đặt cọc 50%.
    - `createBooking({ customerName, customerPhone, customerEmail, customerCccd, fromDate, toDate, items, promotionCode, paymentOption, paymentAccountNumber })`:
      - **Pessimistic Locking Flow (Luồng 3.1 ARCHITECHTURE.md):** Bọc toàn bộ quy trình trong `prisma.$transaction(async (tx) => { ... })`.
      - Khóa các phòng vật lý tương ứng với `SELECT ... FOR UPDATE`, kiểm tra hạn mức tồn kho khả dụng qua `CatalogService.checkCategoryQuota` (chặn quá quota với `ROOM_QUOTA_EXCEEDED`).
      - Lấy đơn giá thực tế từ DB để chống gian lận giá.
      - Khóa bản ghi tài khoản thanh toán giả lập với `SELECT ... FOR UPDATE`.
      - Kiểm tra số dư tài khoản: nếu thiếu tiền, ném mã lỗi RFC 7807 `PAYMENT_FAILED` và tự động rollback giao dịch.
      - Trừ tiền tài khoản thanh toán giả lập (`balance = balance - prepaidBookingValue`).
      - Sinh mã `bookingNumber` duy nhất dạng `BK-YYYYMMDD-XXXX`.
      - Tạo bản ghi `Booking` trạng thái `CONFIRMED` cùng các `BookingItem`.
    - `getMockPaymentAccounts()`: Trả về danh sách tài khoản test giả lập phục vụ giao diện simulator.
  - **Tầng Controller & Routes ([backend/src/controllers/booking.controller.js](file:///d:/Phuong_Anh_internship_project/Hotel%20Management%20Online/Hotel%20Management%20Online/backend/src/controllers/booking.controller.js), [backend/src/entrypoints/public.routes.js](file:///d:/Phuong_Anh_internship_project/Hotel%20Management%20Online/Hotel%20Management%20Online/backend/src/entrypoints/public.routes.js)):**
    - Mount các endpoint công khai: `POST /api/public/promotions/apply`, `POST /api/public/bookings/preview`, `POST /api/public/bookings`, `GET /api/public/payment-accounts`.
  - **Kiểm thử tự động ([backend/tests/feat07.test.js](file:///d:/Phuong_Anh_internship_project/Hotel%20Management%20Online/Hotel%20Management%20Online/backend/tests/feat07.test.js)):**
    - 14 bài kiểm thử tích hợp chuyên sâu (tất cả 14/14 PASS, nâng tổng số bài test lên 83/83 PASS trên 8 suites).
  - **Giao diện React SPA:**
    - Component [frontend/src/pages/customer/BookingCheckoutModal.jsx](file:///d:/Phuong_Anh_internship_project/Hotel%20Management%20Online/Hotel%20Management%20Online/frontend/src/pages/customer/BookingCheckoutModal.jsx):
      - Quản lý giỏ hàng: xem danh mục phòng đã chọn, tăng/giảm số lượng phòng, xóa phòng.
      - Form nhập thông tin khách hàng: họ tên, số điện thoại, email, CCCD.
      - Áp dụng mã coupon: ô nhập mã kèm feedback số tiền được giảm theo thời gian thực.
      - Lựa chọn hình thức thanh toán: Thanh toán 100% (`FULL_100`) hoặc Đặt cọc 50% (`DEPOSIT_50`).
      - Cổng thanh toán giả lập: ô nhập số tài khoản kèm các nút chọn nhanh tài khoản kiểm thử 1-click (ATM, VISA).
      - Màn hình đặt phòng thành công rực rỡ: hiển thị mã `bookingNumber` với nút sao chép, tóm tắt đơn đặt phòng, tiền đã trừ và tiền còn lại cần quyết toán tại quầy khi check-out.
    - Tích hợp thanh giỏ hàng nổi (Floating Cart Bar) và modal thanh toán vào [frontend/src/pages/customer/RoomCatalog.jsx](file:///d:/Phuong_Anh_internship_project/Hotel%20Management%20Online/Hotel%20Management%20Online/frontend/src/pages/customer/RoomCatalog.jsx).
    - Frontend Vite production build PASS (3.08s).
- [x] Nghiệm thu hoàn thành `FEAT-07` trong [feature_list.json](file:///d:/Phuong_Anh_internship_project/Hotel%20Management%20Online/Hotel%20Management%20Online/feature_list.json).

## Verification Evidence

| Check | Command | Result | Notes |
|---|---|---|---|
| Prisma Schema Validation | `cd backend && npx prisma validate` | PASS | Schema hợp lệ 100% |
| Unit & Integration Tests | `cd backend && npm test` | PASS (83/83 tests) | 8 suites (`api`, `feat01`, `feat02`, `feat03`, `feat04`, `feat05`, `feat06`, `feat07`), 0 fail |
| Code Linting | `cd backend && npm run lint` | PASS | 0 lint errors |
| Frontend Production Build | `cd frontend && npm run build` | PASS | Vite bundle built in 3.08s |
| Environment Init Script | `powershell -ExecutionPolicy Bypass -File .\init.ps1` | PASS | Tiến độ 7/12 features completed |

## Decisions Made

- Sử dụng **Node.js (v24)** với cú pháp **JavaScript ES Modules (`"type": "module"`)** cho toàn bộ backend.
- Sử dụng **Express.js** làm REST API web framework tiêu chuẩn.
- Sử dụng **Prisma ORM** cho tầng Data Access và quản lý database PostgreSQL.
- Phân quyền theo ma trận **Strict Disjoint RBAC**: `ADMIN` (`/api/admin/*`), `MANAGER` (`/api/setup/*`), `SALE` (`/api/operation/*`) tách biệt hoàn toàn; không có quyền thừa kế.
- Cơ chế **Concurrency & Transaction (Luồng 3.1 ARCHITECHTURE.md)**:
  - Bọc quy trình đặt phòng trong `prisma.$transaction`.
  - Khóa bi quan `SELECT ... FOR UPDATE` trên các phòng vật lý và tài khoản thanh toán giả lập.
  - Chặn overbooking bằng `ROOM_QUOTA_EXCEEDED` và chặn thiếu tiền bằng `PAYMENT_FAILED` kèm rollback tức thời.

## Blockers / Risks

- Không còn blocker: Toàn bộ 83 tests kiểm thử tự động PASS 100%, quy trình đặt phòng, giỏ hàng, áp mã khuyến mãi, lựa chọn thanh toán 100%/50% và trừ tiền tài khoản giả lập hoạt động trơn tru.

## Next Session Startup

1. Chạy `powershell -ExecutionPolicy Bypass -File .\init.ps1` hoặc `./init.sh`.
2. Đọc [AGENTS.md](file:///d:/Phuong_Anh_internship_project/Hotel%20Management%20Online/Hotel%20Management%20Online/AGENTS.md), [feature_list.json](file:///d:/Phuong_Anh_internship_project/Hotel%20Management%20Online/Hotel%20Management%20Online/feature_list.json), [progress.md](file:///d:/Phuong_Anh_internship_project/Hotel%20Management%20Online/Hotel%20Management%20Online/progress.md).
3. Review biên bản bàn giao này [session-handoff.md](file:///d:/Phuong_Anh_internship_project/Hotel%20Management%20Online/Hotel%20Management%20Online/session-handoff.md).

## Recommended Next Step

- Bắt đầu triển khai tính năng `FEAT-08: Check & Cancel Booking (24h Rule & 80/20 Refund)` (Tra cứu đơn đặt phòng qua bookingNumber, kiểm tra điều kiện hủy trước 24h, phạt 20% phí hủy và hoàn trả 80% số tiền vào tài khoản thanh toán giả lập có khóa bi quan FOR UPDATE).
