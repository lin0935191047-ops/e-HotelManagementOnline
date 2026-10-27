# Session Progress Log — e-Hotel Project

**Last Updated:** 2026-10-22

## Current State & Project Status
- **Completed Features:** 5 / 12
- **Current Active Feature:** `FEAT-06` (Room Catalog & Inventory-based Availability Search) - ready to start
- **Last Known Build/Test Status:** All 54 tests passing across 6 suites (0 failures), Prisma valid, PostgreSQL in sync. Frontend Vite production build passing (10.29s). Harness audit 100/100.

## Current Objective
- **Goal:** Hoàn thành `FEAT-05: Setup Services & Promotion Management` và chuẩn bị triển khai `FEAT-06: Room Catalog & Inventory-based Availability Search`.
- **Target Deliverables:** `src/services/hotel-service.service.js`, `src/controllers/hotel-service.controller.js`, `src/services/promotion.service.js`, `src/controllers/promotion.controller.js`, `src/entrypoints/setup.routes.js`, `tests/feat05.test.js`, `frontend/src/pages/manager/ServiceSetup.jsx`, `frontend/src/pages/manager/PromotionSetup.jsx`, `frontend/src/pages/manager/ManagerSetup.jsx`, `frontend/src/App.jsx`.

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
  - Hệ thống CSS & UI Tokens hiện đại trong [frontend/src/index.css](file:///d:/Phuong_Anh_internship_project/Hotel%20Management%20Online/Hotel%20Management%20Online/frontend/src/index.css) với bảng màu sang trọng (dark theme, glassmorphism, badge role, modal overlay, form controls).
  - API Client [frontend/src/api/client.js](file:///d:/Phuong_Anh_internship_project/Hotel%20Management%20Online/Hotel%20Management%20Online/frontend/src/api/client.js) bọc gọi API kèm token và bóc tách lỗi RFC 7807 Problem Details.
  - Màn hình quản lý người dùng [frontend/src/pages/admin/UserManagement.jsx](file:///d:/Phuong_Anh_internship_project/Hotel%20Management%20Online/Hotel%20Management%20Online/frontend/src/pages/admin/UserManagement.jsx) hiển thị danh sách người dùng, lọc role, tìm kiếm từ khóa, modal tạo/sửa tài khoản, modal xác nhận xóa an toàn.
  - Màn hình đăng nhập [frontend/src/pages/Login.jsx](file:///d:/Phuong_Anh_internship_project/Hotel%20Management%20Online/Hotel%20Management%20Online/frontend/src/pages/Login.jsx) với nút chọn nhanh tài khoản kiểm thử (Admin, Manager, Sale).
  - Kiểm tra Vite build thành công: `npm run build` PASS trong 2.77s.
- Cập nhật tiến độ `FEAT-03` thành `"done"` trong [feature_list.json](file:///d:/Phuong_Anh_internship_project/Hotel%20Management%20Online/Hotel%20Management%20Online/feature_list.json).

### Session 4 (FEAT-04: Setup Rooms with Booking Deletion Guard)
- Xây dựng tầng nghiệp vụ [backend/src/services/room.service.js](file:///d:/Phuong_Anh_internship_project/Hotel%20Management%20Online/Hotel%20Management%20Online/backend/src/services/room.service.js):
  - CRUD danh mục phòng vật lý với phân trang, bộ lọc (`type`, `size`, `status`), tìm kiếm từ khóa (`roomId`, `description`).
  - Validate mã phòng độc nhất, giá phòng $> 0$, số lượng người lớn $\ge 1$, trẻ em $\ge 0$, phụ thu $\ge 0$, chuẩn hóa mảng URL hình ảnh.
  - **Booking Deletion Guard:** Kiểm tra lịch sử gán phòng (`RoomAssignment`) và sử dụng dịch vụ (`ServiceUsage`). Nếu phòng đã từng phát sinh dữ liệu liên quan đến booking, chặn xóa phòng và ném mã lỗi RFC 7807 `ROOM_CANNOT_BE_DELETED`.
- Xây dựng REST Controller [backend/src/controllers/room.controller.js](file:///d:/Phuong_Anh_internship_project/Hotel%20Management%20Online/Hotel%20Management%20Online/backend/src/controllers/room.controller.js) và gắn routes vào [backend/src/entrypoints/setup.routes.js](file:///d:/Phuong_Anh_internship_project/Hotel%20Management%20Online/Hotel%20Management%20Online/backend/src/entrypoints/setup.routes.js) (`/api/setup/rooms`).
- Viết 9 bài kiểm thử tích hợp chuyên sâu trong [backend/tests/feat04.test.js](file:///d:/Phuong_Anh_internship_project/Hotel%20Management%20Online/Hotel%20Management%20Online/backend/tests/feat04.test.js) (toàn bộ 9/9 PASS, nâng tổng số tests hệ thống lên 34/34 PASS trên 5 suites).
- Xây dựng giao diện Frontend SPA:
  - Màn hình Quản lý phòng vật lý [frontend/src/pages/manager/RoomSetup.jsx](file:///d:/Phuong_Anh_internship_project/Hotel%20Management%20Online/Hotel%20Management%20Online/frontend/src/pages/manager/RoomSetup.jsx) với bảng dữ liệu, lọc đa tiêu chí, thanh tìm kiếm, modal tạo/sửa thông tin phòng và modal xác nhận xóa an toàn hiển thị cảnh báo Booking Deletion Guard.
  - Tích hợp vào [frontend/src/App.jsx](file:///d:/Phuong_Anh_internship_project/Hotel%20Management%20Online/Hotel%20Management%20Online/frontend/src/App.jsx) theo vai trò `MANAGER`.
  - Bổ sung CSS badges và status tags trong [frontend/src/index.css](file:///d:/Phuong_Anh_internship_project/Hotel%20Management%20Online/Hotel%20Management%20Online/frontend/src/index.css).
  - Kiểm tra Vite build thành công: `npm run build` PASS trong 2.83s.
- Cập nhật tiến độ `FEAT-04` thành `"done"` trong [feature_list.json](file:///d:/Phuong_Anh_internship_project/Hotel%20Management%20Online/Hotel%20Management%20Online/feature_list.json).

### Session 5 (FEAT-05: Setup Services & Promotion Management)
- Mở rộng mã lỗi RFC 7807 trong [backend/src/common/errors.js](file:///d:/Phuong_Anh_internship_project/Hotel%20Management%20Online/Hotel%20Management%20Online/backend/src/common/errors.js): bổ sung `SERVICE_CANNOT_BE_DELETED` và `PROMOTION_CANNOT_BE_DELETED`.
- Xây dựng tầng nghiệp vụ Dịch vụ [backend/src/services/hotel-service.service.js](file:///d:/Phuong_Anh_internship_project/Hotel%20Management%20Online/Hotel%20Management%20Online/backend/src/services/hotel-service.service.js):
  - CRUD danh mục dịch vụ (Service ID, tên dịch vụ, mô tả, đơn vị tính, đơn giá $> 0$).
  - Service Usage Guard: Chặn xóa dịch vụ đã từng phát sinh hóa đơn hoặc phiếu sử dụng trong bất kỳ booking nào.
  - Controller [backend/src/controllers/hotel-service.controller.js](file:///d:/Phuong_Anh_internship_project/Hotel%20Management%20Online/Hotel%20Management%20Online/backend/src/controllers/hotel-service.controller.js).
- Xây dựng tầng nghiệp vụ Khuyến mãi [backend/src/services/promotion.service.js](file:///d:/Phuong_Anh_internship_project/Hotel%20Management%20Online/Hotel%20Management%20Online/backend/src/services/promotion.service.js):
  - CRUD chương trình khuyến mãi: mã code độc nhất, tên, mô tả, hình thức giảm (`PERCENTAGE` với giá trị $\le 100$, `FIXED_AMOUNT` với giá trị $> 0$), ngày bắt đầu và kết thúc (`endDate >= startDate`).
  - Promotion Booking Guard: Chặn xóa khuyến mãi nếu đã từng được áp dụng vào bất kỳ đơn đặt phòng nào.
  - Controller [backend/src/controllers/promotion.controller.js](file:///d:/Phuong_Anh_internship_project/Hotel%20Management%20Online/Hotel%20Management%20Online/backend/src/controllers/promotion.controller.js).
- Định tuyến các endpoint trong [backend/src/entrypoints/setup.routes.js](file:///d:/Phuong_Anh_internship_project/Hotel%20Management%20Online/Hotel%20Management%20Online/backend/src/entrypoints/setup.routes.js): `/api/setup/services` và `/api/setup/promotions` được bảo vệ nghiêm ngặt bởi `requireRole("MANAGER")`.
- Viết 20 bài kiểm thử tích hợp chuyên sâu trong [backend/tests/feat05.test.js](file:///d:/Phuong_Anh_internship_project/Hotel%20Management%20Online/Hotel%20Management%20Online/backend/tests/feat05.test.js) (toàn bộ 20/20 PASS, nâng tổng số tests hệ thống lên 54/54 PASS trên 6 suites).
- Xây dựng giao diện Frontend SPA:
  - Màn hình Quản lý dịch vụ [frontend/src/pages/manager/ServiceSetup.jsx](file:///d:/Phuong_Anh_internship_project/Hotel%20Management%20Online/Hotel%20Management%20Online/frontend/src/pages/manager/ServiceSetup.jsx): bảng dữ liệu, tìm kiếm, modal tạo/sửa dịch vụ, modal xác nhận xóa an toàn kèm Service Usage Guard.
  - Màn hình Quản lý khuyến mãi [frontend/src/pages/manager/PromotionSetup.jsx](file:///d:/Phuong_Anh_internship_project/Hotel%20Management%20Online/Hotel%20Management%20Online/frontend/src/pages/manager/PromotionSetup.jsx): bảng danh mục coupon, lọc theo loại giảm giá và trạng thái hiệu lực (Đang hiệu lực, Sắp diễn ra, Đã hết hạn), modal tạo/sửa với date picker và validate tỷ lệ %, modal xóa an toàn.
  - Khung điều hướng phân hệ Setup [frontend/src/pages/manager/ManagerSetup.jsx](file:///d:/Phuong_Anh_internship_project/Hotel%20Management%20Online/Hotel%20Management%20Online/frontend/src/pages/manager/ManagerSetup.jsx) tích hợp tab chuyển đổi giữa Phòng, Dịch vụ, Khuyến mãi.
  - Tích hợp vào [frontend/src/App.jsx](file:///d:/Phuong_Anh_internship_project/Hotel%20Management%20Online/Hotel%20Management%20Online/frontend/src/App.jsx).
  - Kiểm tra Vite build thành công: `npm run build` PASS trong 10.29s.
- Cập nhật tiến độ `FEAT-05` thành `"done"` trong [feature_list.json](file:///d:/Phuong_Anh_internship_project/Hotel%20Management%20Online/Hotel%20Management%20Online/feature_list.json).

## Architectural Decisions Locked
1. **Tech Stack:** Node.js v20+/v24+, JavaScript ES Modules (`"type": "module"`), Express.js v4.21+, Prisma ORM v6.x, PostgreSQL 16+, React.js v18.3+ SPA (Vite + Tailwind CSS).
2. **Booking Inventory Model:** Đặt phòng online theo hạng phòng (`type` + `size`) và số lượng (`quantity`). Gán phòng vật lý (`101`, `102`...) chỉ thực hiện khi Check-in có khóa bi quan (`FOR UPDATE`).
3. **Flexible Prepayment:** Hỗ trợ thanh toán 100% hoặc cọc 50%; khấu trừ chính xác `prepaidBookingValue` khi Check-out.
4. **Cancellation Rule:** Hủy trước $\ge 24\text{h}$ so với giờ nhận phòng khi trạng thái là `CONFIRMED`; giữ lại 20% phí hủy, hoàn trả 80% về tài khoản thanh toán giả lập.
5. **Strict Disjoint RBAC:** `ADMIN` (`/admin/*`), `MANAGER` (`/setup/*`), `SALE` (`/operation/*`) tách biệt hoàn toàn; không kế thừa quyền; timeout phiên sau 30 phút không hoạt động.
6. **Deletion Guards:** Cấm xóa Phòng vật lý (`ROOM_CANNOT_BE_DELETED`), Dịch vụ (`SERVICE_CANNOT_BE_DELETED`), Khuyến mãi (`PROMOTION_CANNOT_BE_DELETED`) nếu đã từng phát sinh liên kết với Booking hay phiếu dịch vụ.
7. **Revenue Calculation:** Tổng doanh thu = $\sum \text{Hóa đơn Check-out} + \sum \text{20\% Phí hủy đơn}$.

## Files Changed
- [backend/src/common/errors.js](file:///d:/Phuong_Anh_internship_project/Hotel%20Management%20Online/Hotel%20Management%20Online/backend/src/common/errors.js)
- [backend/src/services/hotel-service.service.js](file:///d:/Phuong_Anh_internship_project/Hotel%20Management%20Online/Hotel%20Management%20Online/backend/src/services/hotel-service.service.js)
- [backend/src/controllers/hotel-service.controller.js](file:///d:/Phuong_Anh_internship_project/Hotel%20Management%20Online/Hotel%20Management%20Online/backend/src/controllers/hotel-service.controller.js)
- [backend/src/services/promotion.service.js](file:///d:/Phuong_Anh_internship_project/Hotel%20Management%20Online/Hotel%20Management%20Online/backend/src/services/promotion.service.js)
- [backend/src/controllers/promotion.controller.js](file:///d:/Phuong_Anh_internship_project/Hotel%20Management%20Online/Hotel%20Management%20Online/backend/src/controllers/promotion.controller.js)
- [backend/src/entrypoints/setup.routes.js](file:///d:/Phuong_Anh_internship_project/Hotel%20Management%20Online/Hotel%20Management%20Online/backend/src/entrypoints/setup.routes.js)
- [backend/tests/feat05.test.js](file:///d:/Phuong_Anh_internship_project/Hotel%20Management%20Online/Hotel%20Management%20Online/backend/tests/feat05.test.js)
- [frontend/src/pages/manager/ServiceSetup.jsx](file:///d:/Phuong_Anh_internship_project/Hotel%20Management%20Online/Hotel%20Management%20Online/frontend/src/pages/manager/ServiceSetup.jsx)
- [frontend/src/pages/manager/PromotionSetup.jsx](file:///d:/Phuong_Anh_internship_project/Hotel%20Management%20Online/Hotel%20Management%20Online/frontend/src/pages/manager/PromotionSetup.jsx)
- [frontend/src/pages/manager/ManagerSetup.jsx](file:///d:/Phuong_Anh_internship_project/Hotel%20Management%20Online/Hotel%20Management%20Online/frontend/src/pages/manager/ManagerSetup.jsx)
- [frontend/src/App.jsx](file:///d:/Phuong_Anh_internship_project/Hotel%20Management%20Online/Hotel%20Management%20Online/frontend/src/App.jsx)
- [feature_list.json](file:///d:/Phuong_Anh_internship_project/Hotel%20Management%20Online/Hotel%20Management%20Online/feature_list.json)
- [progress.md](file:///d:/Phuong_Anh_internship_project/Hotel%20Management%20Online/Hotel%20Management%20Online/progress.md)
- [session-handoff.md](file:///d:/Phuong_Anh_internship_project/Hotel%20Management%20Online/Hotel%20Management%20Online/session-handoff.md)

## Blockers / Risks
- Không còn blocker: Toàn bộ 54 tests PASS, hệ thống quản lý phòng, dịch vụ và khuyến mãi hoạt động ổn định và bảo mật tuyệt đối.

## Verification Evidence
- `npm test`: 54/54 tests passed across 6 test suites (`api.test.js`, `feat01.test.js`, `feat02.test.js`, `feat03.test.js`, `feat04.test.js`, `feat05.test.js`).
- `npm run lint`: PASS (0 lỗi).
- `npx prisma validate`: PASS (Schema hợp lệ 100%).
- `npm run db:push`: PASS (PostgreSQL schema synchronized).
- `cd frontend && npm run build`: PASS (Vite production build hoàn thành không lỗi).
- `powershell -ExecutionPolicy Bypass -File .\init.ps1`: Hiển thị tiến độ 5/12 features completed.
- `node .agents/skills/harness-creator/scripts/validate-harness.mjs --target .`: PASS (100/100).

## Next Session & Next Steps
- **Next Session Startup:** Chạy `./init.ps1` (hoặc `./init.sh`).
- **Recommended Next Step:** Bắt đầu tính năng `FEAT-06: Room Catalog & Inventory-based Availability Search` (Trang chủ hiển thị danh mục hạng phòng và tìm kiếm phòng trống theo tồn kho với khóa bi quan).