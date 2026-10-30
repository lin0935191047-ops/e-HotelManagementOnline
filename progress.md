# Session Progress Log — e-Hotel Project

**Last Updated:** 2026-10-30

## Current State & Project Status
- **Completed Features:** 12 / 12 (100% Hoàn Thành Toàn Bộ Hệ Thống!)
- **Current Active Feature:** Tất cả tính năng đã hoàn thành và nghiệm thu đầy đủ theo đặc tả [docs/SPEC.md](file:///d:/Phuong_Anh_internship_project/Hotel%20Management%20Online/Hotel%20Management%20Online/docs/SPEC.md).
- **Last Known Build/Test Status:** Toàn bộ 130 tests passing across 13 suites (0 failures), Prisma valid, PostgreSQL in sync. Frontend Vite production build passing (6.30s). Harness audit 100/100.

## Current Objective
- **Goal:** Hoàn thành toàn diện tính năng cuối cùng `FEAT-12: Revenue Report & Excel/PDF Export` và nghiệm thu 100% hệ thống e-Hotel.
- **Target Deliverables:** `backend/src/services/operation.service.js`, `backend/src/controllers/operation.controller.js`, `backend/src/entrypoints/operation.routes.js`, `backend/tests/feat12.test.js`, `frontend/src/pages/operation/SaleOperation.jsx`.

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
- Nghiệp vụ Sử dụng dịch vụ cho phòng đang ở (`OCCUPIED`), khóa bi quan mức dòng `SELECT ... FOR UPDATE`, sinh mã `ticketId` định dạng `TK-YYYYMMDD-XXXX`, lưu `ServiceUsage`.
- Giao diện ServiceUsageModal.jsx và ServiceTicketPrintModal.jsx chuẩn CSS `@media print` tự động in qua `window.print()`.
- 11 bài kiểm thử tích hợp trong [backend/tests/feat10.test.js](file:///d:/Phuong_Anh_internship_project/Hotel%20Management%20Online/Hotel%20Management%20Online/backend/tests/feat10.test.js) PASS 100% (112/112 tests toàn hệ thống PASS).
- Cập nhật tiến độ `FEAT-10` thành `"done"` trong [feature_list.json](file:///d:/Phuong_Anh_internship_project/Hotel%20Management%20Online/Hotel%20Management%20Online/feature_list.json).

### Session 11 (FEAT-11: Check-out, Invoice Calculation & HTML Invoice Printing)
- Bổ sung mã lỗi RFC 7807 trong [backend/src/common/errors.js](file:///d:/Phuong_Anh_internship_project/Hotel%20Management%20Online/Hotel%20Management%20Online/backend/src/common/errors.js): `CHECKOUT_INVALID` và `INVOICE_NOT_FOUND`.
- Xây dựng nghiệp vụ Quyết toán Check-out trong [backend/src/services/operation.service.js](file:///d:/Phuong_Anh_internship_project/Hotel%20Management%20Online/Hotel%20Management%20Online/backend/src/services/operation.service.js):
  - `previewCheckout(bookingIdOrNumber)`: Lấy toàn diện bảng kê tài chính trước check-out (netRoomFee, extraChildrenFee, các ServiceUsage và totalServiceFee, prepaidBookingValue, remainingPayable).
  - `checkOutBooking(bookingIdOrNumber)`: Thực thi Luồng 3.4 ARCHITECTURE bọc trong Prisma Interactive Transaction với khóa bi quan `SELECT ... FOR UPDATE` trên cả bảng `bookings` và `rooms`:
    - Kiểm tra nghiêm ngặt chỉ cho phép Check-out đơn `CHECKED_IN` (ném lỗi 400 `CHECKOUT_INVALID` nếu không phải).
    - Chặn hoàn toàn Double Checkout (kiểm tra `existingInvoice`).
    - Tính toán theo công thức SPEC 4.5:
      $$\text{totalInvoiceAmount} = \text{netRoomFee} + \text{extraChildrenFee} + \text{totalServiceFee}$$
      $$\text{remainingPayable} = \text{totalInvoiceAmount} - \text{prepaidBookingValue}$$
    - Sinh mã hóa đơn `invoiceId` định dạng `INV-YYYYMMDD-XXXX`.
    - Tạo bản ghi `Invoice` trong cơ sở dữ liệu.
    - Cập nhật thời điểm `checkOutAt` cho tất cả các `RoomAssignment`.
    - Khóa bi quan và giải phóng tất cả phòng vật lý đã gán về trạng thái `AVAILABLE`.
    - Cập nhật đơn đặt phòng `status = 'CHECKED_OUT'` và lưu `checkedOutAt`.
  - `getInvoiceDetails(invoiceIdOrBookingId)`: Lấy chi tiết toàn diện hóa đơn xuất xưởng (thông tin khách, phòng, dịch vụ, bảng kê thanh toán) phục vụ in ấn.
  - `listInvoices({ page, limit, keyword, fromDate, toDate })`: Tra cứu danh sách lịch sử hóa đơn đã quyết toán.
- Gắn các API endpoints trong [backend/src/entrypoints/operation.routes.js](file:///d:/Phuong_Anh_internship_project/Hotel%20Management%20Online/Hotel%20Management%20Online/backend/src/entrypoints/operation.routes.js):
  - `GET /api/operation/bookings/:id/checkout-preview`
  - `POST /api/operation/bookings/:id/check-out`
  - `GET /api/operation/invoices`
  - `GET /api/operation/invoices/:invoiceId`
  - Bảo vệ nghiêm ngặt bằng Strict Disjoint RBAC (chỉ SALE được truy cập, ADMIN/MANAGER bị 403).
- Viết 10 bài kiểm thử tích hợp chuyên sâu trong [backend/tests/feat11.test.js](file:///d:/Phuong_Anh_internship_project/Hotel%20Management%20Online/Hotel%20Management%20Online/backend/tests/feat11.test.js) (toàn bộ 10/10 PASS, nâng tổng số tests hệ thống lên 122/122 PASS trên 12 test suites).
- Xây dựng giao diện Frontend SPA:
  - Component [frontend/src/pages/operation/CheckoutModal.jsx](file:///d:/Phuong_Anh_internship_project/Hotel%20Management%20Online/Hotel%20Management%20Online/frontend/src/pages/operation/CheckoutModal.jsx): Xem trước chi tiết tài chính, tiền phòng, phụ thu trẻ em, dịch vụ, khấu trừ tiền đặt cọc và số tiền cần thu tại quầy, nút xác nhận Check-out.
  - Component [frontend/src/pages/operation/InvoicePrintModal.jsx](file:///d:/Phuong_Anh_internship_project/Hotel%20Management%20Online/Hotel%20Management%20Online/frontend/src/pages/operation/InvoicePrintModal.jsx): Giao diện HTML hóa đơn thanh toán khách sạn (Check-out Invoice / Guest Folio) sang trọng, chuẩn CSS `@media print` khổ A4, tự động kích hoạt `window.print()`.
  - Tích hợp 3 Tab trong [frontend/src/pages/operation/SaleOperation.jsx](file:///d:/Phuong_Anh_internship_project/Hotel%20Management%20Online/Hotel%20Management%20Online/frontend/src/pages/operation/SaleOperation.jsx): Tab 1: Đặt phòng & Check-in / Check-out (nút Check-out màu amber, nút Xem Hóa Đơn màu emerald); Tab 2: Dịch Vụ Phòng & Phiếu In; Tab 3: Danh Sách Hóa Đơn Quyết Toán (tìm kiếm và in lại 1-click).
  - Kiểm tra Vite build thành công: `npm run build` PASS trong 3.75s.
- Cập nhật tiến độ `FEAT-11` thành `"done"` trong [feature_list.json](file:///d:/Phuong_Anh_internship_project/Hotel%20Management%20Online/Hotel%20Management%20Online/feature_list.json).

### Session 12 (FEAT-12: Revenue Report & Excel/PDF Export — 100% System Completion)
- Cài đặt thư viện xử lý xuất file chuẩn Node.js: `exceljs` (tạo bảng tính .xlsx) và `pdfkit` (tạo tệp PDF).
- Triển khai nghiệp vụ Báo cáo Doanh thu trong [backend/src/services/operation.service.js](file:///d:/Phuong_Anh_internship_project/Hotel%20Management%20Online/Hotel%20Management%20Online/backend/src/services/operation.service.js):
  - `getRevenueReport({ fromDate, toDate })`: Tính toán doanh thu theo công thức chuẩn SPEC 4.5 & Điều 6 Architectural Guardrails:
    $$\text{Total Revenue} = \sum_{\text{Checked-out}} \text{Invoice.totalInvoiceAmount} + \sum_{\text{Cancelled}} \text{Booking.cancellationFee}$$
    Hỗ trợ lọc linh hoạt theo ngày `fromDate` và `toDate` (bao gồm cả lọc theo ngày giao dịch trả phòng `checkedOutAt` và ngày hủy phòng `cancelledAt`).
  - `exportRevenueExcel({ fromDate, toDate })`: Kết xuất bảng tính Excel (.xlsx) với phong cách trình bày chuyên nghiệp: tiêu đề khách sạn e-Hotel, khối tóm tắt doanh thu, bảng kê chi tiết từng giao dịch và dòng tổng cộng định dạng tiền tệ `#,##0`.
  - `exportRevenuePdf({ fromDate, toDate })`: Kết xuất tệp PDF (.pdf) chuẩn trang in A4, magic header `%PDF-`, bảng kê chi tiết và 3 chữ ký (Người lập biểu, Kế toán trưởng, Giám đốc khách sạn).
- Xây dựng Controller trong [backend/src/controllers/operation.controller.js](file:///d:/Phuong_Anh_internship_project/Hotel%20Management%20Online/Hotel%20Management%20Online/backend/src/controllers/operation.controller.js) và gắn endpoints vào [backend/src/entrypoints/operation.routes.js](file:///d:/Phuong_Anh_internship_project/Hotel%20Management%20Online/Hotel%20Management%20Online/backend/src/entrypoints/operation.routes.js):
  - `GET /api/operation/reports/revenue`
  - `GET /api/operation/reports/revenue/export-excel`
  - `GET /api/operation/reports/revenue/export-pdf`
  - Bảo vệ nghiêm ngặt bằng Strict Disjoint RBAC (chỉ SALE được truy cập, ADMIN/MANAGER bị 403).
- Viết 8 bài kiểm thử tích hợp chuyên sâu trong [backend/tests/feat12.test.js](file:///d:/Phuong_Anh_internship_project/Hotel%20Management%20Online/Hotel%20Management%20Online/backend/tests/feat12.test.js) (toàn bộ 8/8 PASS, nâng tổng số tests hệ thống lên 130/130 PASS trên 13 test suites).
- Xây dựng giao diện Frontend SPA:
  - Tích hợp Tab "4. Báo Cáo Doanh Thu (Excel/PDF)" trong [frontend/src/pages/operation/SaleOperation.jsx](file:///d:/Phuong_Anh_internship_project/Hotel%20Management%20Online/Hotel%20Management%20Online/frontend/src/pages/operation/SaleOperation.jsx).
  - 4 Thẻ thống kê trực quan: Tổng Doanh Thu Thực Tế (nổi bật công thức SPEC 4.5), Doanh thu Trả phòng, 20% Phí phạt hủy phòng, Tổng lượt giao dịch.
  - Thanh công cụ lọc ngày với các phím tắt chọn nhanh: "Hôm nay", "Tháng này", "Tất cả".
  - Nút "Xuất Excel (.xlsx)" và "Xuất PDF (.pdf)" tải trực tiếp file về máy qua blob download.
  - Bảng kê chi tiết từng giao dịch với badge trạng thái sắc nét và dòng tổng doanh thu nổi bật cuối bảng.
  - Kiểm tra Vite build thành công: `npm run build` PASS trong 6.30s.
- Cập nhật tiến độ `FEAT-12` thành `"done"` trong [feature_list.json](file:///d:/Phuong_Anh_internship_project/Hotel%20Management%20Online/Hotel%20Management%20Online/feature_list.json).

## Architectural Decisions Locked
1. **Tech Stack:** Node.js v20+/v24+, JavaScript ES Modules (`"type": "module"`), Express.js v4.21+, Prisma ORM v6.x, PostgreSQL 16+, React.js v18.3+ SPA (Vite + Tailwind CSS).
2. **Booking Inventory Model:** Đặt phòng online theo hạng phòng (`type` + `size`) và số lượng (`quantity`). Gán phòng vật lý (`101`, `102`...) chỉ thực hiện khi Check-in có khóa bi quan (`FOR UPDATE`).
3. **Availability Intersection Formula:** Hai khoảng thời gian giao nhau khi và chỉ khi: $\text{existing.fromDate} < \text{search.toDate} \land \text{existing.toDate} > \text{search.fromDate}$. Chỉ các đơn có `status IN ('CONFIRMED', 'CHECKED_IN')` mới tính vào `BookedRooms`.
4. **Flexible Prepayment:** Hỗ trợ thanh toán 100% hoặc cọc 50%; khấu trừ chính xác `prepaidBookingValue` khi Check-out.
5. **Cancellation Rule:** Hủy trước $\ge 24\text{h}$ so với giờ nhận phòng khi trạng thái là `CONFIRMED`; giữ lại 20% phí hủy, hoàn trả 80% về tài khoản thanh toán giả lập. Khóa bi quan phòng chống Double Refund.
6. **Strict Disjoint RBAC:** `ADMIN` (`/admin/*`), `MANAGER` (`/setup/*`), `SALE` (`/operation/*`) tách biệt hoàn toàn; không kế thừa quyền; timeout phiên sau 30 phút không hoạt động.
7. **Deletion Guards:** Cấm xóa Phòng vật lý (`ROOM_CANNOT_BE_DELETED`), Dịch vụ (`SERVICE_CANNOT_BE_DELETED`), Khuyến mãi (`PROMOTION_CANNOT_BE_DELETED`) nếu đã từng phát sinh liên kết với Booking hay phiếu dịch vụ.
8. **Check-out & Invoicing Rule (SPEC 4.5 & Luồng 3.4 ARCHITECTURE):**
   - Khóa bi quan booking và phòng vật lý bằng `SELECT ... FOR UPDATE`.
   - $\text{totalInvoiceAmount} = \text{netRoomFee} + \text{extraChildrenFee} + \sum \text{ServiceUsage.totalPrice}$.
   - $\text{remainingPayable} = \text{totalInvoiceAmount} - \text{prepaidBookingValue}$.
   - Sinh mã hóa đơn `INV-YYYYMMDD-XXXX`, lưu bản ghi `Invoice`.
   - Chuyển `Booking` sang `CHECKED_OUT`, cập nhật `checkedOutAt`, giải phóng các phòng vật lý về `AVAILABLE`.
   - Mở giao diện HTML in hóa đơn kích hoạt qua `window.print()`.
9. **Revenue Formula & Reporting (SPEC 4.5 & Rule 6 ARCHITECTURE):**
   - Báo cáo doanh thu theo đúng công thức:
     $$\text{Total Revenue} = \sum_{\text{Checked-out}} \text{Invoice.totalInvoiceAmount} + \sum_{\text{Cancelled}} \text{Booking.cancellationFee}$$
   - Xuất dữ liệu tệp Excel (.xlsx qua `exceljs`) và tệp PDF (.pdf qua `pdfkit`).

## Files Changed
- [backend/package.json](file:///d:/Phuong_Anh_internship_project/Hotel%20Management%20Online/Hotel%20Management%20Online/backend/package.json)
- [backend/src/services/operation.service.js](file:///d:/Phuong_Anh_internship_project/Hotel%20Management%20Online/Hotel%20Management%20Online/backend/src/services/operation.service.js)
- [backend/src/controllers/operation.controller.js](file:///d:/Phuong_Anh_internship_project/Hotel%20Management%20Online/Hotel%20Management%20Online/backend/src/controllers/operation.controller.js)
- [backend/src/entrypoints/operation.routes.js](file:///d:/Phuong_Anh_internship_project/Hotel%20Management%20Online/Hotel%20Management%20Online/backend/src/entrypoints/operation.routes.js)
- [backend/tests/feat12.test.js](file:///d:/Phuong_Anh_internship_project/Hotel%20Management%20Online/Hotel%20Management%20Online/backend/tests/feat12.test.js)
- [frontend/src/pages/operation/SaleOperation.jsx](file:///d:/Phuong_Anh_internship_project/Hotel%20Management%20Online/Hotel%20Management%20Online/frontend/src/pages/operation/SaleOperation.jsx)
- [feature_list.json](file:///d:/Phuong_Anh_internship_project/Hotel%20Management%20Online/Hotel%20Management%20Online/feature_list.json)
- [progress.md](file:///d:/Phuong_Anh_internship_project/Hotel%20Management%20Online/Hotel%20Management%20Online/progress.md)
- [session-handoff.md](file:///d:/Phuong_Anh_internship_project/Hotel%20Management%20Online/Hotel%20Management%20Online/session-handoff.md)

## Blockers / Risks
- Không còn blocker: Toàn bộ 12/12 tính năng của hệ thống e-Hotel đã hoàn thành 100%, 130/130 unit & integration tests PASS trên 13 test suites, Prisma valid, PostgreSQL in sync, frontend production build thành công.

## Verification Evidence
- `npm test`: 130/130 tests passed across 13 test suites (`api.test.js`, `feat01.test.js` đến `feat12.test.js`).
- `npm run lint`: PASS (0 lỗi).
- `npx prisma validate`: PASS (Schema hợp lệ 100%).
- `cd frontend && npm run build`: PASS (Vite production bundle built in 6.30s).
- `powershell -ExecutionPolicy Bypass -File .\init.ps1`: Hiển thị tiến độ 12/12 features completed.
- `node .agents/skills/harness-creator/scripts/validate-harness.mjs`: Đạt điểm tuyệt đối 100/100.

## Next Session & Next Steps
- Toàn bộ 12 tính năng cốt lõi theo đặc tả [docs/SPEC.md](file:///d:/Phuong_Anh_internship_project/Hotel%20Management%20Online/Hotel%20Management%20Online/docs/SPEC.md) đã hoàn tất và nghiệm thu 100%. Hệ thống sẵn sàng cho việc đưa vào triển khai thực tế (Production Deployment via Docker Compose).
