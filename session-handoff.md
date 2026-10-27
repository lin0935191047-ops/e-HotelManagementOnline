# Session Handoff

**Last Updated:** 2026-10-22

## Current Objective

- **Goal:** Hoàn thành tính năng `FEAT-05: Setup Services & Promotion Management`. Chuẩn bị bước vào triển khai `FEAT-06: Room Catalog & Inventory-based Availability Search`.
- **Current status:** `FEAT-01`, `FEAT-02`, `FEAT-03`, `FEAT-04`, và `FEAT-05` đã hoàn tất và nghiệm thu 100%. Sẵn sàng cho `FEAT-06`.
- **Branch / commit:** master

## Completed This Session

- [x] Chuyển đổi công nghệ toàn dự án sang: **Node.js (v24), JavaScript thuần (ES Modules), Express.js, Prisma ORM, React.js SPA, PostgreSQL 18**.
- [x] Cập nhật toàn bộ tài liệu kiến trúc: [docs/adr/ADR-001-tech-stack-decision.md](file:///d:/Phuong_Anh_internship_project/Hotel%20Management%20Online/Hotel%20Management%20Online/docs/adr/ADR-001-tech-stack-decision.md), [ARCHITECHTURE.md](file:///d:/Phuong_Anh_internship_project/Hotel%20Management%20Online/Hotel%20Management%20Online/ARCHITECHTURE.md), [AGENTS.md](file:///d:/Phuong_Anh_internship_project/Hotel%20Management%20Online/Hotel%20Management%20Online/AGENTS.md).
- [x] Nghiệm thu hoàn thành `FEAT-01` (Prisma Schema 10 thực thể, seed data).
- [x] Nghiệm thu hoàn thành `FEAT-02` (Authentication, 30-Min Inactivity Timeout, Strict Disjoint RBAC).
- [x] Nghiệm thu hoàn thành `FEAT-03` (User Management - Admin Role: CRUD users, bcrypt hash, self-deletion guard, React SPA UserManagement UI).
- [x] Nghiệm thu hoàn thành `FEAT-04` (Setup Rooms with Booking Deletion Guard: CRUD rooms, validation, guard 400 ROOM_CANNOT_BE_DELETED, React SPA RoomSetup UI).
- [x] Triển khai và nghiệm thu `FEAT-05: Setup Services & Promotion Management`:
  - **Tầng Service Dịch vụ ([backend/src/services/hotel-service.service.js](file:///d:/Phuong_Anh_internship_project/Hotel%20Management%20Online/Hotel%20Management%20Online/backend/src/services/hotel-service.service.js)):**
    - CRUD dịch vụ khách sạn: phân trang, tìm kiếm theo mã/tên/đơn vị.
    - Validate mã dịch vụ độc nhất, tên dịch vụ, đơn vị tính, đơn giá $> 0$.
    - **Service Usage Guard:** Kiểm tra `serviceUsage`. Nếu dịch vụ đã từng phát sinh giao dịch trong bất kỳ booking nào, chặn xóa và trả về lỗi 400 `SERVICE_CANNOT_BE_DELETED`.
  - **Tầng Service Khuyến mãi ([backend/src/services/promotion.service.js](file:///d:/Phuong_Anh_internship_project/Hotel%20Management%20Online/Hotel%20Management%20Online/backend/src/services/promotion.service.js)):**
    - CRUD chương trình khuyến mãi: phân trang, tìm kiếm mã code/tên, lọc theo hình thức giảm giá (`PERCENTAGE`, `FIXED_AMOUNT`) và trạng thái (`ACTIVE`, `UPCOMING`, `EXPIRED`).
    - Validate mã code độc nhất, tên, giá trị giảm giá ($0 < \text{value} \le 100$ cho PERCENTAGE, $\text{value} > 0$ cho FIXED_AMOUNT), ngày kết thúc $\ge$ ngày bắt đầu (`endDate >= startDate`).
    - **Promotion Booking Guard:** Kiểm tra `bookings`. Nếu khuyến mãi đã từng được khách sử dụng trong booking, chặn xóa và trả về lỗi 400 `PROMOTION_CANNOT_BE_DELETED`.
  - **Tầng Controller & Routes ([backend/src/controllers/hotel-service.controller.js](file:///d:/Phuong_Anh_internship_project/Hotel%20Management%20Online/Hotel%20Management%20Online/backend/src/controllers/hotel-service.controller.js), [backend/src/controllers/promotion.controller.js](file:///d:/Phuong_Anh_internship_project/Hotel%20Management%20Online/Hotel%20Management%20Online/backend/src/controllers/promotion.controller.js), [backend/src/entrypoints/setup.routes.js](file:///d:/Phuong_Anh_internship_project/Hotel%20Management%20Online/Hotel%20Management%20Online/backend/src/entrypoints/setup.routes.js)):**
    - Mount `/api/setup/services` và `/api/setup/promotions` được bảo vệ độc quyền bởi `requireRole("MANAGER")`.
  - **Kiểm thử tự động ([backend/tests/feat05.test.js](file:///d:/Phuong_Anh_internship_project/Hotel%20Management%20Online/Hotel%20Management%20Online/backend/tests/feat05.test.js)):**
    - 20 bài kiểm thử tích hợp chuyên sâu (tất cả 20/20 PASS, nâng tổng số bài test lên 54/54 PASS trên 6 suites).
  - **Giao diện React SPA:**
    - Màn hình Quản lý Dịch vụ ([frontend/src/pages/manager/ServiceSetup.jsx](file:///d:/Phuong_Anh_internship_project/Hotel%20Management%20Online/Hotel%20Management%20Online/frontend/src/pages/manager/ServiceSetup.jsx)): Bảng dữ liệu, tìm kiếm, modal thêm/sửa, modal xác nhận xóa an toàn kèm Service Usage Guard.
    - Màn hình Quản lý Khuyến mãi ([frontend/src/pages/manager/PromotionSetup.jsx](file:///d:/Phuong_Anh_internship_project/Hotel%20Management%20Online/Hotel%20Management%20Online/frontend/src/pages/manager/PromotionSetup.jsx)): Bảng danh mục coupon, lọc theo loại giảm và trạng thái, modal thêm/sửa có date picker và validate %, modal xác nhận xóa an toàn.
    - Khung tab tổng hợp Setup Module ([frontend/src/pages/manager/ManagerSetup.jsx](file:///d:/Phuong_Anh_internship_project/Hotel%20Management%20Online/Hotel%20Management%20Online/frontend/src/pages/manager/ManagerSetup.jsx)): Chuyển tab mượt mà giữa Phòng, Dịch vụ và Khuyến mãi.
    - Tích hợp vào [frontend/src/App.jsx](file:///d:/Phuong_Anh_internship_project/Hotel%20Management%20Online/Hotel%20Management%20Online/frontend/src/App.jsx).
    - Frontend Vite production build PASS (10.29s).
- [x] Nghiệm thu hoàn thành `FEAT-05` trong [feature_list.json](file:///d:/Phuong_Anh_internship_project/Hotel%20Management%20Online/Hotel%20Management%20Online/feature_list.json).

## Verification Evidence

| Check | Command | Result | Notes |
|---|---|---|---|
| Prisma Schema Validation | `cd backend && npx prisma validate` | PASS | Schema hợp lệ 100% |
| Unit & Integration Tests | `cd backend && npm test` | PASS (54/54 tests) | 6 suites (`api`, `feat01`, `feat02`, `feat03`, `feat04`, `feat05`), 0 fail |
| Code Linting | `cd backend && npm run lint` | PASS | 0 lint errors |
| Frontend Production Build | `cd frontend && npm run build` | PASS | Vite bundle built in 10.29s |
| Environment Init Script | `powershell -ExecutionPolicy Bypass -File .\init.ps1` | PASS | Tiến độ 5/12 features completed |
| Harness Engineering Audit | `node .agents/skills/harness-creator/scripts/validate-harness.mjs --target .` | PASS (100/100) | Đạt chuẩn tuyệt đối 5/5 phân hệ |

## Decisions Made

- Sử dụng **Node.js (v24)** với cú pháp **JavaScript ES Modules (`"type": "module"`)** cho toàn bộ backend.
- Sử dụng **Express.js** làm REST API web framework tiêu chuẩn.
- Sử dụng **Prisma ORM** cho tầng Data Access và quản lý database PostgreSQL.
- Phân quyền theo ma trận **Strict Disjoint RBAC**: `ADMIN` (`/api/admin/*`), `MANAGER` (`/api/setup/*`), `SALE` (`/api/operation/*`) tách biệt hoàn toàn; không có quyền thừa kế.
- Cơ chế **Deletion Guards**:
  - `ROOM_CANNOT_BE_DELETED`: Không xóa phòng có bản ghi trong `room_assignments` hoặc `service_usage`.
  - `SERVICE_CANNOT_BE_DELETED`: Không xóa dịch vụ có bản ghi trong `service_usage`.
  - `PROMOTION_CANNOT_BE_DELETED`: Không xóa khuyến mãi đã từng được gán trong `bookings`.
- Thêm cờ `--test-concurrency=1` vào `npm test` trong `backend/package.json` để chạy các bộ test tuần tự, bảo đảm không xảy ra tranh chấp dữ liệu phiên đăng nhập trên PostgreSQL.

## Blockers / Risks

- Không còn blocker: Toàn bộ 54 tests kiểm thử tự động PASS 100%, bảo mật phân quyền và quản lý phân hệ Setup (Phòng, Dịch vụ, Khuyến mãi) hoạt động chính xác.

## Next Session Startup

1. Chạy `powershell -ExecutionPolicy Bypass -File .\init.ps1` hoặc `./init.sh`.
2. Đọc [AGENTS.md](file:///d:/Phuong_Anh_internship_project/Hotel%20Management%20Online/Hotel%20Management%20Online/AGENTS.md), [feature_list.json](file:///d:/Phuong_Anh_internship_project/Hotel%20Management%20Online/Hotel%20Management%20Online/feature_list.json), [progress.md](file:///d:/Phuong_Anh_internship_project/Hotel%20Management%20Online/Hotel%20Management%20Online/progress.md).
3. Review biên bản bàn giao này [session-handoff.md](file:///d:/Phuong_Anh_internship_project/Hotel%20Management%20Online/Hotel%20Management%20Online/session-handoff.md).

## Recommended Next Step

- Bắt đầu triển khai tính năng `FEAT-06: Room Catalog & Inventory-based Availability Search` (Trang chủ hiển thị danh mục hạng phòng và tìm kiếm số lượng phòng trống theo tồn kho thời gian thực kèm khóa bi quan Pessimistic Locking).
