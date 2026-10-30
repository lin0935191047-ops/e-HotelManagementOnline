# Session Progress Log — e-Hotel Project

**Last Updated:** 2026-10-30

## Current State & Project Status
- **Completed Features:** 10 / 12
- **Current Active Feature:** `FEAT-11` (Check-out, Invoice Calculation & HTML Invoice Printing) - ready to start
- **Last Known Build/Test Status:** All 112 tests passing across 11 suites (0 failures), Prisma valid, PostgreSQL in sync. Frontend Vite production build passing (4.16s). Harness audit 100/100.

## Current Objective
- **Goal:** Hoàn thành `FEAT-10: Use Services & HTML Ticket Printing` và chuẩn bị triển khai `FEAT-11: Check-out, Invoice Calculation & HTML Invoice Printing`.
- **Target Deliverables:** `backend/src/services/operation.service.js`, `backend/src/controllers/operation.controller.js`, `backend/src/entrypoints/operation.routes.js`, `backend/src/common/errors.js`, `backend/tests/feat10.test.js`, `frontend/src/pages/operation/SaleOperation.jsx`, `frontend/src/pages/operation/ServiceUsageModal.jsx`, `frontend/src/pages/operation/ServiceTicketPrintModal.jsx`.

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
- Khắc phục lỗi khởi chạy server backend trong [backend/src/main.js](file:///d:/Phuong_Anh_internship_project/Hotel%20Management%20Online/Hotel%20Management%20Online/backend/src/main.js) khi thư mục dự án trên Windows chứa ký tự khoảng trắng.
- Bổ sung mã lỗi `INVALID_DATE_RANGE` vào [backend/src/common/errors.js](file:///d:/Phuong_Anh_internship_project/Hotel%20Management%20Online/Hotel%20Management%20Online/backend/src/common/errors.js).
- Xây dựng Domain Service [backend/src/services/catalog.service.js](file:///d:/Phuong_Anh_internship_project/Hotel%20Management%20Online/Hotel%20Management%20Online/backend/src/services/catalog.service.js) với công thức tồn kho chuẩn SPEC 4.1 và khóa bi quan Pessimistic Locking.
- Định tuyến công khai [backend/src/entrypoints/public.routes.js](file:///d:/Phuong_Anh_internship_project/Hotel%20Management%20Online/Hotel%20Management%20Online/backend/src/entrypoints/public.routes.js) (`/api/public/rooms`, `/api/public/rooms/:roomId`, `/api/public/availability`).
- Viết 15 bài kiểm thử tích hợp chuyên sâu trong [backend/tests/feat06.test.js](file:///d:/Phuong_Anh_internship_project/Hotel%20Management%20Online/Hotel%20Management%20Online/backend/tests/feat06.test.js) (toàn bộ 15/15 PASS, nâng tổng số tests hệ thống lên 69/69 PASS trên 7 suites).
- Cổng Đặt Phòng Khách Hàng [frontend/src/pages/customer/RoomCatalog.jsx](file:///d:/Phuong_Anh_internship_project/Hotel%20Management%20Online/Hotel%20Management%20Online/frontend/src/pages/customer/RoomCatalog.jsx): Hero section sang trọng, thanh tìm kiếm lưu trú trực quan, lưới thẻ phòng với Available Quota Badge, modal chi tiết phòng.
- Cập nhật điều hướng trong [frontend/src/App.jsx](file:///d:/Phuong_Anh_internship_project/Hotel%20Management%20Online/Hotel%20Management%20Online/frontend/src/App.jsx). Vite build PASS trong 11.15s.
- Cập nhật tiến độ `FEAT-06` thành `"done"` trong [feature_list.json](file:///d:/Phuong_Anh_internship_project/Hotel%20Management%20Online/Hotel%20Management%20Online/feature_list.json).

### Session 7 (FEAT-07: Shopping Cart, Customer Form, Promotion & Payment Simulator)
- Xây dựng Domain Service Đặt phòng [backend/src/services/booking.service.js](file:///d:/Phuong_Anh_internship_project/Hotel%20Management%20Online/Hotel%20Management%20Online/backend/src/services/booking.service.js): Áp coupon, preview giỏ hàng, createBooking với Pessimistic Locking FOR UPDATE trên phòng và tài khoản thanh toán giả lập, trừ tiền, sinh mã bookingNumber.
- Giao diện BookingCheckoutModal.jsx, giỏ hàng nổi Floating Cart Bar, chọn nhanh thẻ ATM/VISA 1-click.
- 14 bài kiểm thử tích hợp chuyên sâu trong [backend/tests/feat07.test.js](file:///d:/Phuong_Anh_internship_project/Hotel%20Management%20Online/Hotel%20Management%20Online/backend/tests/feat07.test.js) PASS 100% (83/83 tests toàn hệ thống PASS).
- Cập nhật tiến độ `FEAT-07` thành `"done"` trong [feature_list.json](file:///d:/Phuong_Anh_internship_project/Hotel%20Management%20Online/Hotel%20Management%20Online/feature_list.json).

### Session 8 (FEAT-08: Check & Cancel Booking - 24h Rule & 80/20 Refund)
- Nghiệp vụ tra cứu và hủy phòng bọc trong transaction với khóa bi quan `SELECT ... FOR UPDATE` trên cả `bookings` và `payment_accounts`. Kiểm tra điều kiện cách giờ nhận phòng $\ge 24\text{h}$, phạt giữ 20%, hoàn trả 80% về thẻ, giải phóng tồn kho phòng.
- Giao diện React SPA BookingLookupModal.jsx.
- 9 bài kiểm thử tích hợp trong [backend/tests/feat08.test.js](file:///d:/Phuong_Anh_internship_project/Hotel%20Management%20Online/Hotel%20Management%20Online/backend/tests/feat08.test.js) PASS 100% (92/92 tests toàn hệ thống PASS).
- Cập nhật tiến độ `FEAT-08` thành `"done"` trong [feature_list.json](file:///d:/Phuong_Anh_internship_project/Hotel%20Management%20Online/Hotel%20Management%20Online/feature_list.json).

### Session 9 (FEAT-09: Booking Management & Check-in - Physical Room Assignment & Auto Child Surcharge)
- Nghiệp vụ vận hành lễ tân: tra cứu phân trang, gán phòng vật lý với khóa bi quan chống gán trùng phòng, tự động tính phụ thu trẻ em khi `childCount > Room.maxChildren` theo SPEC 4.4, chuyển phòng sang `OCCUPIED` và booking sang `CHECKED_IN`.
- Giao diện React SPA SaleOperation.jsx và CheckinModal.jsx.
- 9 bài kiểm thử tích hợp trong [backend/tests/feat09.test.js](file:///d:/Phuong_Anh_internship_project/Hotel%20Management%20Online/Hotel%20Management%20Online/backend/tests/feat09.test.js) PASS 100% (101/101 tests toàn hệ thống PASS).
- Cập nhật tiến độ `FEAT-09` thành `"done"` trong [feature_list.json](file:///d:/Phuong_Anh_internship_project/Hotel%20Management%20Online/Hotel%20Management%20Online/feature_list.json).

### Session 10 (FEAT-10: Use Services & HTML Ticket Printing)
- Bổ sung mã lỗi RFC 7807 trong [backend/src/common/errors.js](file:///d:/Phuong_Anh_internship_project/Hotel%20Management%20Online/Hotel%20Management%20Online/backend/src/common/errors.js): `ROOM_NOT_OCCUPIED` và `SERVICE_NOT_FOUND`.
- Xây dựng nghiệp vụ Sử dụng dịch vụ trong [backend/src/services/operation.service.js](file:///d:/Phuong_Anh_internship_project/Hotel%20Management%20Online/Hotel%20Management%20Online/backend/src/services/operation.service.js):
  - `getOccupiedRooms()`: Lấy danh sách các phòng vật lý đang `OCCUPIED` kèm thông tin đơn booking và khách lưu trú.
  - `getServicesCatalog()`: Lấy danh mục dịch vụ có sẵn của khách sạn.
  - `createServiceUsage({ roomId, serviceId, quantity })`: Mở Interactive Transaction, khóa bi quan phòng vật lý bằng `SELECT ... FOR UPDATE`, kiểm tra nghiêm ngặt phòng phải đang `OCCUPIED` (chặn phòng `AVAILABLE` hoặc `MAINTENANCE` ném lỗi `ROOM_NOT_OCCUPIED`), tìm phiên lưu trú đang hoạt động, sinh mã phiếu `ticketId` định dạng `TK-YYYYMMDD-XXXX`, lưu bản ghi vào `ServiceUsage` với `totalPrice = unitPrice * quantity`.
  - `getServiceTicket(ticketId)`: Lấy chi tiết toàn diện phiếu dịch vụ gồm thông tin phòng, thông tin khách, tên dịch vụ, đơn vị tính, số lượng, đơn giá, thành tiền, phục vụ in ấn.
  - `listServiceTickets({ page, limit, roomId, bookingId, keyword })`: Lịch sử các phiếu dịch vụ đã tạo để quản lý và in lại.
- Mount API endpoints trong [backend/src/entrypoints/operation.routes.js](file:///d:/Phuong_Anh_internship_project/Hotel%20Management%20Online/Hotel%20Management%20Online/backend/src/entrypoints/operation.routes.js):
  - `GET /api/operation/services/occupied-rooms`
  - `GET /api/operation/services/catalog`
  - `POST /api/operation/services/usage`
  - `GET /api/operation/services/tickets/:ticketId`
  - `GET /api/operation/services/tickets`
  - Strict Disjoint RBAC bảo vệ 100% (chỉ SALE được truy cập, ADMIN/MANAGER nhận 403).
- Viết 11 bài kiểm thử tích hợp chuyên sâu trong [backend/tests/feat10.test.js](file:///d:/Phuong_Anh_internship_project/Hotel%20Management%20Online/Hotel%20Management%20Online/backend/tests/feat10.test.js) (toàn bộ 11/11 PASS, nâng tổng số tests hệ thống lên 112/112 PASS trên 11 test suites).
- Xây dựng giao diện Frontend SPA:
  - Component [frontend/src/pages/operation/ServiceUsageModal.jsx](file:///d:/Phuong_Anh_internship_project/Hotel%20Management%20Online/Hotel%20Management%20Online/frontend/src/pages/operation/ServiceUsageModal.jsx): Chọn phòng đang ở (`OCCUPIED`), chọn dịch vụ, nhập số lượng, tự động tính thành tiền thời gian thực, nút "Lập Phiếu & In Ngay".
  - Component [frontend/src/pages/operation/ServiceTicketPrintModal.jsx](file:///d:/Phuong_Anh_internship_project/Hotel%20Management%20Online/Hotel%20Management%20Online/frontend/src/pages/operation/ServiceTicketPrintModal.jsx): Giao diện HTML phiếu dịch vụ phòng sang trọng, chuẩn CSS `@media print`, hiển thị đầy đủ thương hiệu khách sạn, mã phiếu, phòng, dịch vụ, số lượng, đơn giá, thành tiền, ghi chú quyết toán và chữ ký 2 bên, tự động kích hoạt `window.print()`.
  - Tích hợp 2 tab điều hướng trong [frontend/src/pages/operation/SaleOperation.jsx](file:///d:/Phuong_Anh_internship_project/Hotel%20Management%20Online/Hotel%20Management%20Online/frontend/src/pages/operation/SaleOperation.jsx): Tab Đặt phòng & Check-in (có nút nhanh "+ Dịch vụ" cho đơn đang ở) và Tab Dịch vụ phòng (danh sách phòng đang ở kèm nút thêm dịch vụ, bảng lịch sử phiếu đã lập kèm nút in lại).
  - Kiểm tra Vite build thành công: `npm run build` PASS trong 4.16s.
- Cập nhật tiến độ `FEAT-10` thành `"done"` trong [feature_list.json](file:///d:/Phuong_Anh_internship_project/Hotel%20Management%20Online/Hotel%20Management%20Online/feature_list.json).

## Architectural Decisions Locked
1. **Tech Stack:** Node.js v20+/v24+, JavaScript ES Modules (`"type": "module"`), Express.js v4.21+, Prisma ORM v6.x, PostgreSQL 16+, React.js v18.3+ SPA (Vite + Tailwind CSS).
2. **Booking Inventory Model:** Đặt phòng online theo hạng phòng (`type` + `size`) và số lượng (`quantity`). Gán phòng vật lý (`101`, `102`...) chỉ thực hiện khi Check-in có khóa bi quan (`FOR UPDATE`).
3. **Availability Intersection Formula:** Hai khoảng thời gian giao nhau khi và chỉ khi: $\text{existing.fromDate} < \text{search.toDate} \land \text{existing.toDate} > \text{search.fromDate}$. Chỉ các đơn có `status IN ('CONFIRMED', 'CHECKED_IN')` mới tính vào `BookedRooms`.
4. **Flexible Prepayment:** Hỗ trợ thanh toán 100% hoặc cọc 50%; khấu trừ chính xác `prepaidBookingValue` khi Check-out.
5. **Cancellation Rule:** Hủy trước $\ge 24\text{h}$ so với giờ nhận phòng khi trạng thái là `CONFIRMED`; giữ lại 20% phí hủy, hoàn trả 80% về tài khoản thanh toán giả lập. Khóa bi quan phòng chống Double Refund.
6. **Strict Disjoint RBAC:** `ADMIN` (`/admin/*`), `MANAGER` (`/setup/*`), `SALE` (`/operation/*`) tách biệt hoàn toàn; không kế thừa quyền; timeout phiên sau 30 phút không hoạt động.
7. **Deletion Guards:** Cấm xóa Phòng vật lý (`ROOM_CANNOT_BE_DELETED`), Dịch vụ (`SERVICE_CANNOT_BE_DELETED`), Khuyến mãi (`PROMOTION_CANNOT_BE_DELETED`) nếu đã từng phát sinh liên kết với Booking hay phiếu dịch vụ.
8. **Service Usage Rule:** Chỉ cho phép đăng ký dịch vụ cho các phòng đang ở trạng thái `OCCUPIED` thuộc một đơn booking `CHECKED_IN`. Khóa bi quan phòng vật lý bằng `SELECT ... FOR UPDATE`. Mã phiếu sinh theo định dạng `TK-YYYYMMDD-XXXX`. Tiền dịch vụ được ghi nhận và quyết toán tổng hợp khi Check-out.
9. **HTML Print Standards:** In phiếu dịch vụ và hóa đơn Check-out sử dụng HTML view chuyên biệt kèm CSS `@media print`, kích hoạt trực tiếp qua `window.print()`.

## Files Changed
- [backend/src/common/errors.js](file:///d:/Phuong_Anh_internship_project/Hotel%20Management%20Online/Hotel%20Management%20Online/backend/src/common/errors.js)
- [backend/src/services/operation.service.js](file:///d:/Phuong_Anh_internship_project/Hotel%20Management%20Online/Hotel%20Management%20Online/backend/src/services/operation.service.js)
- [backend/src/controllers/operation.controller.js](file:///d:/Phuong_Anh_internship_project/Hotel%20Management%20Online/Hotel%20Management%20Online/backend/src/controllers/operation.controller.js)
- [backend/src/entrypoints/operation.routes.js](file:///d:/Phuong_Anh_internship_project/Hotel%20Management%20Online/Hotel%20Management%20Online/backend/src/entrypoints/operation.routes.js)
- [backend/tests/feat10.test.js](file:///d:/Phuong_Anh_internship_project/Hotel%20Management%20Online/Hotel%20Management%20Online/backend/tests/feat10.test.js)
- [frontend/src/pages/operation/SaleOperation.jsx](file:///d:/Phuong_Anh_internship_project/Hotel%20Management%20Online/Hotel%20Management%20Online/frontend/src/pages/operation/SaleOperation.jsx)
- [frontend/src/pages/operation/ServiceUsageModal.jsx](file:///d:/Phuong_Anh_internship_project/Hotel%20Management%20Online/Hotel%20Management%20Online/frontend/src/pages/operation/ServiceUsageModal.jsx)
- [frontend/src/pages/operation/ServiceTicketPrintModal.jsx](file:///d:/Phuong_Anh_internship_project/Hotel%20Management%20Online/Hotel%20Management%20Online/frontend/src/pages/operation/ServiceTicketPrintModal.jsx)
- [feature_list.json](file:///d:/Phuong_Anh_internship_project/Hotel%20Management%20Online/Hotel%20Management%20Online/feature_list.json)
- [progress.md](file:///d:/Phuong_Anh_internship_project/Hotel%20Management%20Online/Hotel%20Management%20Online/progress.md)
- [session-handoff.md](file:///d:/Phuong_Anh_internship_project/Hotel%20Management%20Online/Hotel%20Management%20Online/session-handoff.md)

## Blockers / Risks
- Không còn blocker: Toàn bộ 112 tests PASS trên 11 suites, quy trình đăng ký dịch vụ cho phòng đang ở, khóa bi quan và in phiếu HTML qua `window.print()` hoạt động hoàn hảo 100%.

## Verification Evidence
- `npm test`: 112/112 tests passed across 11 test suites (`api.test.js`, `feat01.test.js`, `feat02.test.js`, `feat03.test.js`, `feat04.test.js`, `feat05.test.js`, `feat06.test.js`, `feat07.test.js`, `feat08.test.js`, `feat09.test.js`, `feat10.test.js`).
- `npm run lint`: PASS (0 lỗi).
- `npx prisma validate`: PASS (Schema hợp lệ 100%).
- `cd frontend && npm run build`: PASS (Vite production bundle built in 4.16s).
- `powershell -ExecutionPolicy Bypass -File .\init.ps1`: Hiển thị tiến độ 10/12 features completed.

## Next Session & Next Steps
- **Next Session Startup:** Chạy `./init.ps1` (hoặc `./init.sh`).
- **Recommended Next Step:** Bắt đầu tính năng `FEAT-11: Check-out, Invoice Calculation & HTML Invoice Printing` (Tổng hợp tiền phòng, phụ thu trẻ em, tổng phí dịch vụ, khấu trừ số tiền đã trả trước prepaidBookingValue, xuất hóa đơn quyết toán, giải phóng phòng về AVAILABLE và mở trang in HTML qua window.print()).
