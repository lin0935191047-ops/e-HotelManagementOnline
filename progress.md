# Session Progress Log — e-Hotel Project

**Last Updated:** 2026-10-27

## Current State & Project Status
- **Completed Features:** 7 / 12
- **Current Active Feature:** `FEAT-08` (Check & Cancel Booking - 24h Rule & 80/20 Refund) - ready to start
- **Last Known Build/Test Status:** All 83 tests passing across 8 suites (0 failures), Prisma valid, PostgreSQL in sync. Frontend Vite production build passing (3.08s). Harness audit 100/100.

## Current Objective
- **Goal:** Hoàn thành `FEAT-07: Shopping Cart, Customer Form, Promotion & Payment Simulator` và chuẩn bị triển khai `FEAT-08: Check & Cancel Booking (24h Rule & 80/20 Refund)`.
- **Target Deliverables:** `src/services/booking.service.js`, `src/controllers/booking.controller.js`, `src/entrypoints/public.routes.js`, `tests/feat07.test.js`, `frontend/src/pages/customer/BookingCheckoutModal.jsx`, `frontend/src/pages/customer/RoomCatalog.jsx`.

## What Was Done (Session History)

### Session 0 (Specification & Harness Standardization)
- Phân tích toàn bộ yêu cầu nghiệp vụ SRS và khóa đặc tả tại [docs/SPEC.md](file:///d:/Phuong_Anh_internship_project/Hotel%20Management%20Online/Hotel%20Management%20Online/docs/SPEC.md).
- Thiết lập bộ khung Harness 100/100 điểm audit.

### Session 1 (Migration to Node.js & FEAT-01 Completion)
- Chuyển đổi toàn bộ nền tảng runtime từ Deno sang **Node.js (v24) + JavaScript (ES Modules) + Express.js + Prisma ORM + React.js (Vite)** theo yêu cầu người dùng.
- Cập nhật quyết định kiến trúc tại [docs/adr/ADR-001-tech-stack-decision.md](file:///d:/Phuong_Anh_internship_project/Hotel%20Management%20Online/Hotel%20Management%20Online/docs/adr/ADR-001-tech-stack-decision.md) và [ARCHITECHTURE.md](file:///d:/Phuong_Anh_internship_project/Hotel%20Management%20Online/Hotel%20Management%20Online/ARCHITECHTURE.md).
- Triển khai `backend/package.json`, `backend/prisma/schema.prisma` với 10 thực thể và đầy đủ quan hệ, enums trên PostgreSQL 18.
- Chạy `npx prisma db push` đồng bộ cấu trúc database thành công.
- Tạo script `backend/prisma/seed.js` gieo dữ liệu mẫu ban đầu: 3 tài khoản nội bộ (admin, manager, sale), 2 thẻ thanh toán giả lập, 5 phòng mẫu, 4 dịch vụ, 2 mã khuyến mãi.
- Xây dựng Express entrypoint `backend/src/main.js` với router `/` và `/api/health`.
- Viết bộ unit test native (`backend/tests/feat01.test.js`, `backend/tests/api.test.js`), chạy qua `npm test` đạt 6/6 tests PASS.
- Cập nhật script khởi động `init.ps1` và `init.sh` kiểm tra Node.js, npm, PostgreSQL.
- Đánh dấu hoàn thành tính năng `FEAT-01` trong [feature_list.json](file:///d:/Phuong_Anh_internship_project/Hotel%20Management%20Online/Hotel%20Management%20Online/feature_list.json).

### Session 2 (FEAT-02: Authentication, 30-Min Session Timeout & Strict Disjoint RBAC)
- Xây dựng hệ thống lỗi chuẩn RFC 7807 trong [backend/src/common/errors.js](file:///d:/Phuong_Anh_internship_project/Hotel%20Management%20Online/Hotel%20Management%20Online/backend/src/common/errors.js) và [backend/src/common/middlewares/error.middleware.js](file:///d:/Phuong_Anh_internship_project/Hotel%20Management%20Online/Hotel%20Management%20Online/backend/src/common/middlewares/error.middleware.js).
- Xây dựng middleware xác thực JWT và kiểm soát Inactivity Timeout 30 phút trong [backend/src/common/middlewares/auth.middleware.js](file:///d:/Phuong_Anh_internship_project/Hotel%20Management%20Online/Hotel%20Management%20Online/backend/src/common/middlewares/auth.middleware.js).
- Xây dựng middleware kiểm soát phân quyền độc lập tuyệt đối [backend/src/common/middlewares/rbac.middleware.js](file:///d:/Phuong_Anh_internship_project/Hotel%20Management%20Online/Hotel%20Management%20Online/backend/src/common/middlewares/rbac.middleware.js) (`ADMIN` chỉ vào `/admin/*`, `MANAGER` chỉ vào `/setup/*`, `SALE` chỉ vào `/operation/*`, chặn kế thừa chéo quyền).
- Xây dựng dịch vụ đăng nhập [backend/src/services/auth.service.js](file:///d:/Phuong_Anh_internship_project/Hotel%20Management%20Online/Hotel%20Management%20Online/backend/src/services/auth.service.js) và controller [backend/src/controllers/auth.controller.js](file:///d:/Phuong_Anh_internship_project/Hotel%20Management%20Online/Hotel%20Management%20Online/backend/src/controllers/auth.controller.js).
- Định tuyến các module [backend/src/entrypoints/](file:///d:/Phuong_Anh_internship_project/Hotel%20Management%20Online/Hotel%20Management%20Online/backend/src/entrypoints/) (`auth.routes.js`, `public.routes.js`, `admin.routes.js`, `setup.routes.js`, `operation.routes.js`).
- Viết 9 bài kiểm thử tích hợp chuyên sâu trong [backend/tests/feat02.test.js](file:///d:/Phuong_Anh_internship_project/Hotel%20Management%20Online/Hotel%20Management%20Online/backend/tests/feat02.test.js), nâng tổng số bài test lên 15/15 PASS.
- Đánh dấu hoàn thành tính năng `FEAT-02` trong [feature_list.json](file:///d:/Phuong_Anh_internship_project/Hotel%20Management%20Online/Hotel%20Management%20Online/feature_list.json).

### Session 3 (FEAT-03: User Management - Admin Role)
- Xây dựng dịch vụ [backend/src/services/user.service.js](file:///d:/Phuong_Anh_internship_project/Hotel%20Management%20Online/Hotel%20Management%20Online/backend/src/services/user.service.js): CRUD tài khoản người dùng, validate tên đăng nhập độc nhất, lọc theo role, tìm kiếm tên/username, mã hóa mật khẩu bcrypt, bảo vệ Admin không tự xóa tài khoản của chính mình và không tự hạ quyền của chính mình.
- Xây dựng REST controller [backend/src/controllers/user.controller.js](file:///d:/Phuong_Anh_internship_project/Hotel%20Management%20Online/Hotel%20Management%20Online/backend/src/controllers/user.controller.js) và gắn routes vào [backend/src/entrypoints/admin.routes.js](file:///d:/Phuong_Anh_internship_project/Hotel%20Management%20Online/Hotel%20Management%20Online/backend/src/entrypoints/admin.routes.js) (`/api/admin/users`).
- Viết 10 bài kiểm thử tích hợp chuyên sâu trong [backend/tests/feat03.test.js](file:///d:/Phuong_Anh_internship_project/Hotel%20Management%20Online/Hotel%20Management%20Online/backend/tests/feat03.test.js) (tất cả 10/10 PASS, nâng tổng số tests hệ thống lên 25/25 PASS trên 4 test suites).
- Tinh chỉnh `backend/package.json` với cờ `--test-concurrency=1` để bảo đảm các bài test database chạy tuần tự, tránh tranh chấp dữ liệu phiên đăng nhập.
- Khởi tạo Frontend SPA hiện đại bằng React 18 + Vite tại [frontend/](file:///d:/Phuong_Anh_internship_project/Hotel%20Management%20Online/Hotel%20Management%20Online/frontend/):
  - Hệ thống CSS & UI Tokens hiện đại trong [frontend/src/index.css](file:///d:/Phuong_Anh_internship_project/Hotel%20Management%20Online/Hotel%20Management%20Online/frontend/src/index.css).
  - API Client [frontend/src/api/client.js](file:///d:/Phuong_Anh_internship_project/Hotel%20Management%20Online/Hotel%20Management%20Online/frontend/src/api/client.js).
  - Màn hình quản lý người dùng [frontend/src/pages/admin/UserManagement.jsx](file:///d:/Phuong_Anh_internship_project/Hotel%20Management%20Online/Hotel%20Management%20Online/frontend/src/pages/admin/UserManagement.jsx).
  - Màn hình đăng nhập [frontend/src/pages/Login.jsx](file:///d:/Phuong_Anh_internship_project/Hotel%20Management%20Online/Hotel%20Management%20Online/frontend/src/pages/Login.jsx).
  - Kiểm tra Vite build thành công: `npm run build` PASS trong 2.77s.
- Cập nhật tiến độ `FEAT-03` thành `"done"` trong [feature_list.json](file:///d:/Phuong_Anh_internship_project/Hotel%20Management%20Online/Hotel%20Management%20Online/feature_list.json).

### Session 4 (FEAT-04: Setup Rooms with Booking Deletion Guard)
- Xây dựng tầng nghiệp vụ [backend/src/services/room.service.js](file:///d:/Phuong_Anh_internship_project/Hotel%20Management%20Online/Hotel%20Management%20Online/backend/src/services/room.service.js):
  - CRUD danh mục phòng vật lý với phân trang, bộ lọc (`type`, `size`, `status`), tìm kiếm từ khóa (`roomId`, `description`).
  - Validate mã phòng độc nhất, giá phòng $> 0$, số lượng người lớn $\ge 1$, trẻ em $\ge 0$, phụ thu $\ge 0$, chuẩn hóa mảng URL hình ảnh.
  - **Booking Deletion Guard:** Kiểm tra lịch sử gán phòng (`RoomAssignment`) và sử dụng dịch vụ (`ServiceUsage`). Nếu phòng đã từng phát sinh dữ liệu liên quan đến booking, chặn xóa phòng và ném mã lỗi RFC 7807 `ROOM_CANNOT_BE_DELETED`.
- Xây dựng REST Controller [backend/src/controllers/room.controller.js](file:///d:/Phuong_Anh_internship_project/Hotel%20Management%20Online/Hotel%20Management%20Online/backend/src/controllers/room.controller.js) và gắn routes vào [backend/src/entrypoints/setup.routes.js](file:///d:/Phuong_Anh_internship_project/Hotel%20Management%20Online/Hotel%20Management%20Online/backend/src/entrypoints/setup.routes.js).
- Viết 9 bài kiểm thử tích hợp chuyên sâu trong [backend/tests/feat04.test.js](file:///d:/Phuong_Anh_internship_project/Hotel%20Management%20Online/Hotel%20Management%20Online/backend/tests/feat04.test.js) (toàn bộ 9/9 PASS, nâng tổng số tests hệ thống lên 34/34 PASS trên 5 suites).
- Giao diện React SPA RoomSetup.jsx và ManagerSetup.jsx. Vite build PASS trong 2.83s.
- Cập nhật tiến độ `FEAT-04` thành `"done"` trong [feature_list.json](file:///d:/Phuong_Anh_internship_project/Hotel%20Management%20Online/Hotel%20Management%20Online/feature_list.json).

### Session 5 (FEAT-05: Setup Services & Promotion Management)
- Bổ sung mã lỗi `SERVICE_CANNOT_BE_DELETED` và `PROMOTION_CANNOT_BE_DELETED` trong [backend/src/common/errors.js](file:///d:/Phuong_Anh_internship_project/Hotel%20Management%20Online/Hotel%20Management%20Online/backend/src/common/errors.js).
- Xây dựng tầng nghiệp vụ Dịch vụ [backend/src/services/hotel-service.service.js](file:///d:/Phuong_Anh_internship_project/Hotel%20Management%20Online/Hotel%20Management%20Online/backend/src/services/hotel-service.service.js) kèm Service Usage Guard.
- Xây dựng tầng nghiệp vụ Khuyến mãi [backend/src/services/promotion.service.js](file:///d:/Phuong_Anh_internship_project/Hotel%20Management%20Online/Hotel%20Management%20Online/backend/src/services/promotion.service.js) kèm Promotion Booking Guard.
- Gắn routes `/api/setup/services` và `/api/setup/promotions` vào [backend/src/entrypoints/setup.routes.js](file:///d:/Phuong_Anh_internship_project/Hotel%20Management%20Online/Hotel%20Management%20Online/backend/src/entrypoints/setup.routes.js).
- Viết 20 bài kiểm thử tích hợp chuyên sâu trong [backend/tests/feat05.test.js](file:///d:/Phuong_Anh_internship_project/Hotel%20Management%20Online/Hotel%20Management%20Online/backend/tests/feat05.test.js) (toàn bộ 20/20 PASS, nâng tổng số tests hệ thống lên 54/54 PASS trên 6 suites).
- Giao diện React SPA ServiceSetup.jsx và PromotionSetup.jsx. Vite build PASS trong 10.29s.
- Cập nhật tiến độ `FEAT-05` thành `"done"` trong [feature_list.json](file:///d:/Phuong_Anh_internship_project/Hotel%20Management%20Online/Hotel%20Management%20Online/feature_list.json).

### Session 6 (FEAT-06: Room Catalog & Inventory-based Availability Search)
- Khắc phục lỗi khởi chạy server backend trong [backend/src/main.js](file:///d:/Phuong_Anh_internship_project/Hotel%20Management%20Online/Hotel%20Management%20Online/backend/src/main.js) khi thư mục dự án trên Windows chứa ký tự khoảng trắng: chuyển đổi logic so sánh sang sử dụng `fileURLToPath` và `path.resolve`.
- Bổ sung mã lỗi `INVALID_DATE_RANGE` vào [backend/src/common/errors.js](file:///d:/Phuong_Anh_internship_project/Hotel%20Management%20Online/Hotel%20Management%20Online/backend/src/common/errors.js).
- Xây dựng Domain Service [backend/src/services/catalog.service.js](file:///d:/Phuong_Anh_internship_project/Hotel%20Management%20Online/Hotel%20Management%20Online/backend/src/services/catalog.service.js) với công thức tồn kho chuẩn SPEC 4.1 và khóa bi quan Pessimistic Locking.
- Định tuyến công khai [backend/src/entrypoints/public.routes.js](file:///d:/Phuong_Anh_internship_project/Hotel%20Management%20Online/Hotel%20Management%20Online/backend/src/entrypoints/public.routes.js) (`/api/public/rooms`, `/api/public/rooms/:roomId`, `/api/public/availability`).
- Viết 15 bài kiểm thử tích hợp chuyên sâu trong [backend/tests/feat06.test.js](file:///d:/Phuong_Anh_internship_project/Hotel%20Management%20Online/Hotel%20Management%20Online/backend/tests/feat06.test.js) (toàn bộ 15/15 PASS, nâng tổng số tests hệ thống lên 69/69 PASS trên 7 suites).
- Cổng Đặt Phòng Khách Hàng [frontend/src/pages/customer/RoomCatalog.jsx](file:///d:/Phuong_Anh_internship_project/Hotel%20Management%20Online/Hotel%20Management%20Online/frontend/src/pages/customer/RoomCatalog.jsx): Hero section sang trọng, thanh tìm kiếm lưu trú trực quan, lưới thẻ phòng với Available Quota Badge, modal chi tiết phòng.
- Cập nhật điều hướng trong [frontend/src/App.jsx](file:///d:/Phuong_Anh_internship_project/Hotel%20Management%20Online/Hotel%20Management%20Online/frontend/src/App.jsx). Vite build PASS trong 11.15s.
- Cập nhật tiến độ `FEAT-06` thành `"done"` trong [feature_list.json](file:///d:/Phuong_Anh_internship_project/Hotel%20Management%20Online/Hotel%20Management%20Online/feature_list.json).

### Session 7 (FEAT-07: Shopping Cart, Customer Form, Promotion & Payment Simulator)
- Xây dựng Domain Service Đặt phòng [backend/src/services/booking.service.js](file:///d:/Phuong_Anh_internship_project/Hotel%20Management%20Online/Hotel%20Management%20Online/backend/src/services/booking.service.js):
  - `validatePromotion({ code, totalRoomFee })`: Kiểm tra sự tồn tại của mã khuyến mãi, thời hạn hiệu lực `[startDate, endDate]`, tính toán chính xác chiết khấu theo `PERCENTAGE` hoặc `FIXED_AMOUNT`.
  - `calculateBookingPreview({ fromDate, toDate, items, promotionCode, paymentOption })`: Tính toán trước số đêm `nights`, lấy đơn giá niêm yết từ DB, tổng tiền phòng, tiền giảm giá, tiền sau giảm `netRoomFee` và tiền đặt cọc 50%.
  - `createBooking({ customerName, customerPhone, customerEmail, customerCccd, fromDate, toDate, items, promotionCode, paymentOption, paymentAccountNumber })`:
    - **Pessimistic Locking Flow (Luồng 3.1 ARCHITECHTURE.md):** Mở giao dịch `prisma.$transaction(async (tx) => { ... })`.
    - Khóa các phòng vật lý tương ứng với `FOR UPDATE`, kiểm tra hạn mức tồn kho qua `CatalogService.checkCategoryQuota` (chặn overbooking với `ROOM_QUOTA_EXCEEDED`).
    - Lấy đơn giá thực tế từ DB để chống gian lận giá từ client.
    - Khóa bản ghi tài khoản thanh toán giả lập với `SELECT ... FOR UPDATE`.
    - Kiểm tra số dư tài khoản: nếu thiếu tiền, ném mã lỗi RFC 7807 `PAYMENT_FAILED` và rollback giao dịch.
    - Trừ tiền tài khoản thanh toán giả lập (`balance = balance - prepaidBookingValue`).
    - Sinh mã `bookingNumber` duy nhất dạng `BK-YYYYMMDD-XXXX`.
    - Tạo bản ghi `Booking` trạng thái `CONFIRMED` cùng các `BookingItem`.
  - `getMockPaymentAccounts()`: Trả về danh sách tài khoản test giả lập phục vụ giao diện.
- Xây dựng Controller [backend/src/controllers/booking.controller.js](file:///d:/Phuong_Anh_internship_project/Hotel%20Management%20Online/Hotel%20Management%20Online/backend/src/controllers/booking.controller.js) và mount routes trong [backend/src/entrypoints/public.routes.js](file:///d:/Phuong_Anh_internship_project/Hotel%20Management%20Online/Hotel%20Management%20Online/backend/src/entrypoints/public.routes.js) (`POST /api/public/promotions/apply`, `POST /api/public/bookings/preview`, `POST /api/public/bookings`, `GET /api/public/payment-accounts`).
- Viết 14 bài kiểm thử tích hợp chuyên sâu trong [backend/tests/feat07.test.js](file:///d:/Phuong_Anh_internship_project/Hotel%20Management%20Online/Hotel%20Management%20Online/backend/tests/feat07.test.js) (toàn bộ 14/14 PASS, nâng tổng số tests hệ thống lên 83/83 PASS trên 8 suites).
- Xây dựng giao diện Frontend SPA:
  - Component [frontend/src/pages/customer/BookingCheckoutModal.jsx](file:///d:/Phuong_Anh_internship_project/Hotel%20Management%20Online/Hotel%20Management%20Online/frontend/src/pages/customer/BookingCheckoutModal.jsx):
    - Quản lý giỏ hàng: xem danh mục phòng đã chọn, tăng/giảm số lượng phòng, xóa phòng.
    - Form nhập thông tin khách hàng: họ tên, số điện thoại, email, CCCD.
    - Áp dụng mã coupon: ô nhập mã kèm feedback số tiền được giảm theo thời gian thực.
    - Lựa chọn hình thức thanh toán: Thanh toán 100% (`FULL_100`) hoặc Đặt cọc 50% (`DEPOSIT_50`).
    - Cổng thanh toán giả lập: ô nhập số tài khoản kèm các nút chọn nhanh tài khoản kiểm thử 1-click (ATM, VISA).
    - Màn hình đặt phòng thành công rực rỡ: hiển thị mã `bookingNumber` với nút sao chép, tóm tắt đơn đặt phòng, tiền đã trừ và tiền còn lại cần quyết toán tại quầy khi check-out.
  - Tích hợp thanh giỏ hàng nổi (Floating Cart Bar) và modal thanh toán vào [frontend/src/pages/customer/RoomCatalog.jsx](file:///d:/Phuong_Anh_internship_project/Hotel%20Management%20Online/Hotel%20Management%20Online/frontend/src/pages/customer/RoomCatalog.jsx).
  - Kiểm tra Vite build thành công: `npm run build` PASS trong 3.08s.
- Cập nhật tiến độ `FEAT-07` thành `"done"` trong [feature_list.json](file:///d:/Phuong_Anh_internship_project/Hotel%20Management%20Online/Hotel%20Management%20Online/feature_list.json).

## Architectural Decisions Locked
1. **Tech Stack:** Node.js v20+/v24+, JavaScript ES Modules (`"type": "module"`), Express.js v4.21+, Prisma ORM v6.x, PostgreSQL 16+, React.js v18.3+ SPA (Vite + Tailwind CSS).
2. **Booking Inventory Model:** Đặt phòng online theo hạng phòng (`type` + `size`) và số lượng (`quantity`). Gán phòng vật lý (`101`, `102`...) chỉ thực hiện khi Check-in có khóa bi quan (`FOR UPDATE`).
3. **Availability Intersection Formula:** Hai khoảng thời gian giao nhau khi và chỉ khi: $\text{existing.fromDate} < \text{search.toDate} \land \text{existing.toDate} > \text{search.fromDate}$. Chỉ các đơn có `status IN ('CONFIRMED', 'CHECKED_IN')` mới tính vào `BookedRooms`.
4. **Flexible Prepayment:** Hỗ trợ thanh toán 100% hoặc cọc 50%; khấu trừ chính xác `prepaidBookingValue` khi Check-out.
5. **Cancellation Rule:** Hủy trước $\ge 24\text{h}$ so với giờ nhận phòng khi trạng thái là `CONFIRMED`; giữ lại 20% phí hủy, hoàn trả 80% về tài khoản thanh toán giả lập.
6. **Strict Disjoint RBAC:** `ADMIN` (`/admin/*`), `MANAGER` (`/setup/*`), `SALE` (`/operation/*`) tách biệt hoàn toàn; không kế thừa quyền; timeout phiên sau 30 phút không hoạt động.
7. **Deletion Guards:** Cấm xóa Phòng vật lý (`ROOM_CANNOT_BE_DELETED`), Dịch vụ (`SERVICE_CANNOT_BE_DELETED`), Khuyến mãi (`PROMOTION_CANNOT_BE_DELETED`) nếu đã từng phát sinh liên kết với Booking hay phiếu dịch vụ.
8. **Revenue Calculation:** Tổng doanh thu = $\sum \text{Hóa đơn Check-out} + \sum \text{20\% Phí hủy đơn}$.

## Files Changed
- [backend/src/services/booking.service.js](file:///d:/Phuong_Anh_internship_project/Hotel%20Management%20Online/Hotel%20Management%20Online/backend/src/services/booking.service.js)
- [backend/src/controllers/booking.controller.js](file:///d:/Phuong_Anh_internship_project/Hotel%20Management%20Online/Hotel%20Management%20Online/backend/src/controllers/booking.controller.js)
- [backend/src/entrypoints/public.routes.js](file:///d:/Phuong_Anh_internship_project/Hotel%20Management%20Online/Hotel%20Management%20Online/backend/src/entrypoints/public.routes.js)
- [backend/tests/feat07.test.js](file:///d:/Phuong_Anh_internship_project/Hotel%20Management%20Online/Hotel%20Management%20Online/backend/tests/feat07.test.js)
- [frontend/src/pages/customer/BookingCheckoutModal.jsx](file:///d:/Phuong_Anh_internship_project/Hotel%20Management%20Online/Hotel%20Management%20Online/frontend/src/pages/customer/BookingCheckoutModal.jsx)
- [frontend/src/pages/customer/RoomCatalog.jsx](file:///d:/Phuong_Anh_internship_project/Hotel%20Management%20Online/Hotel%20Management%20Online/frontend/src/pages/customer/RoomCatalog.jsx)
- [feature_list.json](file:///d:/Phuong_Anh_internship_project/Hotel%20Management%20Online/Hotel%20Management%20Online/feature_list.json)
- [progress.md](file:///d:/Phuong_Anh_internship_project/Hotel%20Management%20Online/Hotel%20Management%20Online/progress.md)
- [session-handoff.md](file:///d:/Phuong_Anh_internship_project/Hotel%20Management%20Online/Hotel%20Management%20Online/session-handoff.md)

## Blockers / Risks
- Không còn blocker: Toàn bộ 83 tests PASS, quy trình đặt phòng, giỏ hàng, áp mã khuyến mãi, lựa chọn thanh toán 100%/50% và trừ tiền tài khoản giả lập có khóa bi quan hoạt động chính xác 100%.

## Verification Evidence
- `npm test`: 83/83 tests passed across 8 test suites (`api.test.js`, `feat01.test.js`, `feat02.test.js`, `feat03.test.js`, `feat04.test.js`, `feat05.test.js`, `feat06.test.js`, `feat07.test.js`).
- `npm run lint`: PASS (0 lỗi).
- `npx prisma validate`: PASS (Schema hợp lệ 100%).
- `cd frontend && npm run build`: PASS (Vite production bundle built in 3.08s).
- `powershell -ExecutionPolicy Bypass -File .\init.ps1`: Hiển thị tiến độ 7/12 features completed.

## Next Session & Next Steps
- **Next Session Startup:** Chạy `./init.ps1` (hoặc `./init.sh`).
- **Recommended Next Step:** Bắt đầu tính năng `FEAT-08: Check & Cancel Booking (24h Rule & 80/20 Refund)` (Tra cứu đơn đặt phòng qua bookingNumber, kiểm tra điều kiện hủy trước 24h, áp dụng chính sách phạt 20% và hoàn 80% về tài khoản thanh toán giả lập có khóa bi quan FOR UPDATE).