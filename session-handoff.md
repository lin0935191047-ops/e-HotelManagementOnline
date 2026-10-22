# Session Handoff

**Last Updated:** 2026-10-21

## Current Objective

- **Goal:** Hoàn thành tính năng `FEAT-04: Setup Rooms with Booking Deletion Guard`. Chuẩn bị bước vào triển khai `FEAT-05: Setup Services & Promotion Management`.
- **Current status:** `FEAT-01`, `FEAT-02`, `FEAT-03`, và `FEAT-04` đã hoàn tất và nghiệm thu 100%. Sẵn sàng cho `FEAT-05`.
- **Branch / commit:** master

## Completed This Session

- [x] Chuyển đổi công nghệ toàn dự án sang: **Node.js (v24), JavaScript thuần (ES Modules), Express.js, Prisma ORM, React.js SPA, PostgreSQL 18**.
- [x] Cập nhật toàn bộ tài liệu kiến trúc: [docs/adr/ADR-001-tech-stack-decision.md](file:///d:/Phuong_Anh_internship_project/Hotel%20Management%20Online/Hotel%20Management%20Online/docs/adr/ADR-001-tech-stack-decision.md), [ARCHITECHTURE.md](file:///d:/Phuong_Anh_internship_project/Hotel%20Management%20Online/Hotel%20Management%20Online/ARCHITECHTURE.md), [AGENTS.md](file:///d:/Phuong_Anh_internship_project/Hotel%20Management%20Online/Hotel%20Management%20Online/AGENTS.md).
- [x] Định nghĩa [backend/prisma/schema.prisma](file:///d:/Phuong_Anh_internship_project/Hotel%20Management%20Online/Hotel%20Management%20Online/backend/prisma/schema.prisma) với 10 thực thể và đồng bộ vào PostgreSQL 18 qua `npx prisma db push`.
- [x] Tạo và chạy thành công script [backend/prisma/seed.js](file:///d:/Phuong_Anh_internship_project/Hotel%20Management%20Online/Hotel%20Management%20Online/backend/prisma/seed.js) gieo dữ liệu mẫu ban đầu.
- [x] Nghiệm thu hoàn thành `FEAT-01` trong [feature_list.json](file:///d:/Phuong_Anh_internship_project/Hotel%20Management%20Online/Hotel%20Management%20Online/feature_list.json).
- [x] Nghiệm thu hoàn thành `FEAT-02` (Authentication, 30-Min Inactivity Timeout, Strict Disjoint RBAC).
- [x] Nghiệm thu hoàn thành `FEAT-03` (User Management - Admin Role: CRUD users, bcrypt hash, self-deletion guard, React SPA UserManagement UI).
- [x] Triển khai và nghiệm thu `FEAT-04: Setup Rooms with Booking Deletion Guard`:
  - **Tầng Service ([backend/src/services/room.service.js](file:///d:/Phuong_Anh_internship_project/Hotel%20Management%20Online/Hotel%20Management%20Online/backend/src/services/room.service.js)):**
    - CRUD phòng vật lý: danh sách có phân trang, lọc theo loại phòng (`type`), kích thước (`size`), trạng thái (`status`), tìm kiếm theo mã phòng và mô tả.
    - Validate mã phòng độc nhất, đơn giá $> 0$, số lượng khách tiêu chuẩn, mảng URL hình ảnh.
    - **Booking Deletion Guard:** Kiểm tra lịch sử gán phòng (`room_assignments`) và phiếu dịch vụ (`service_usage`). Nếu phòng đã từng có booking, chặn xóa và trả về lỗi 400 `ROOM_CANNOT_BE_DELETED`.
  - **Tầng Controller & Routes:** [backend/src/controllers/room.controller.js](file:///d:/Phuong_Anh_internship_project/Hotel%20Management%20Online/Hotel%20Management%20Online/backend/src/controllers/room.controller.js) và [backend/src/entrypoints/setup.routes.js](file:///d:/Phuong_Anh_internship_project/Hotel%20Management%20Online/Hotel%20Management%20Online/backend/src/entrypoints/setup.routes.js) (`/api/setup/rooms`).
  - **Kiểm thử tự động ([backend/tests/feat04.test.js](file:///d:/Phuong_Anh_internship_project/Hotel%20Management%20Online/Hotel%20Management%20Online/backend/tests/feat04.test.js)):**
    - 9 bài kiểm thử chuyên sâu (tất cả 9/9 PASS, nâng tổng số bài test lên 34/34 PASS trên 5 suites).
  - **Giao diện React SPA ([frontend/src/pages/manager/RoomSetup.jsx](file:///d:/Phuong_Anh_internship_project/Hotel%20Management%20Online/Hotel%20Management%20Online/frontend/src/pages/manager/RoomSetup.jsx)):**
    - Bảng danh mục phòng vật lý, bộ lọc hạng phòng/trạng thái, ô tìm kiếm từ khóa.
    - Modal thêm mới / chỉnh sửa thông tin phòng.
    - Modal xác nhận xóa an toàn hiển thị cảnh báo Booking Deletion Guard.
    - Tích hợp điều hướng RBAC trong [frontend/src/App.jsx](file:///d:/Phuong_Anh_internship_project/Hotel%20Management%20Online/Hotel%20Management%20Online/frontend/src/App.jsx).
    - Frontend Vite production build PASS (2.83s).
- [x] Nghiệm thu hoàn thành `FEAT-04` trong [feature_list.json](file:///d:/Phuong_Anh_internship_project/Hotel%20Management%20Online/Hotel%20Management%20Online/feature_list.json).

## Verification Evidence

| Check | Command | Result | Notes |
|---|---|---|---|
| Prisma Schema Validation | `cd backend && npx prisma validate` | PASS | Schema hợp lệ 100% |
| Unit & Integration Tests | `cd backend && npm test` | PASS (34/34 tests) | 5 suites (`api`, `feat01`, `feat02`, `feat03`, `feat04`), 0 fail |
| Code Linting | `cd backend && npm run lint` | PASS | 0 lint errors |
| Frontend Production Build | `cd frontend && npm run build` | PASS | Vite bundle built in 2.83s |
| Environment Init Script | `powershell -ExecutionPolicy Bypass -File .\init.ps1` | PASS | Tiến độ 4/12 features completed |
| Harness Engineering Audit | `node .agents/skills/harness-creator/scripts/validate-harness.mjs --target .` | PASS (100/100) | Đạt chuẩn tuyệt đối 5/5 phân hệ |

## Decisions Made

- Sử dụng **Node.js (v24)** với cú pháp **JavaScript ES Modules (`"type": "module"`)** cho toàn bộ backend.
- Sử dụng **Express.js** làm REST API web framework tiêu chuẩn.
- Sử dụng **Prisma ORM** cho tầng Data Access và quản lý database PostgreSQL.
- Phân quyền theo ma trận **Strict Disjoint RBAC**: `ADMIN` (`/api/admin/*`), `MANAGER` (`/api/setup/*`), `SALE` (`/api/operation/*`) tách biệt hoàn toàn; không có quyền thừa kế.
- Cơ chế **Booking Deletion Guard**: Ngăn chặn xóa mọi phòng vật lý đã từng có bản ghi trong `room_assignments` hoặc `service_usage`, bảo vệ tính toàn vẹn dữ liệu kế toán và hóa đơn.
- Thêm cờ `--test-concurrency=1` vào `npm test` trong `backend/package.json` để chạy các bộ test tuần tự, bảo đảm không xảy ra tranh chấp dữ liệu phiên đăng nhập trên PostgreSQL.

## Blockers / Risks

- Không còn blocker: Toàn bộ 34 tests kiểm thử tự động PASS 100%, bảo mật phân quyền và quản lý phòng vật lý hoạt động chính xác.

## Next Session Startup

1. Chạy `powershell -ExecutionPolicy Bypass -File .\init.ps1` hoặc `./init.sh`.
2. Đọc [AGENTS.md](file:///d:/Phuong_Anh_internship_project/Hotel%20Management%20Online/Hotel%20Management%20Online/AGENTS.md), [feature_list.json](file:///d:/Phuong_Anh_internship_project/Hotel%20Management%20Online/Hotel%20Management%20Online/feature_list.json), [progress.md](file:///d:/Phuong_Anh_internship_project/Hotel%20Management%20Online/Hotel%20Management%20Online/progress.md).
3. Review biên bản bàn giao này [session-handoff.md](file:///d:/Phuong_Anh_internship_project/Hotel%20Management%20Online/Hotel%20Management%20Online/session-handoff.md).

## Recommended Next Step

- Bắt đầu triển khai tính năng `FEAT-05: Setup Services & Promotion Management` (Mô-đun Setup cho MANAGER: Quản lý danh mục dịch vụ phát sinh và các mã khuyến mãi có thời hạn).
