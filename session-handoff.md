# Session Handoff

**Last Updated:** 2026-10-30

## Current Objective

- **Goal:** Hoàn thành tính năng `FEAT-10: Use Services & HTML Ticket Printing`. Chuẩn bị bước vào triển khai `FEAT-11: Check-out, Invoice Calculation & HTML Invoice Printing`.
- **Current status:** `FEAT-01` đến `FEAT-10` đã hoàn tất và nghiệm thu 100% (10/12 features completed). Sẵn sàng bắt đầu `FEAT-11`.
- **Branch / commit:** master

## Completed This Session

- [x] Triển khai và nghiệm thu `FEAT-10: Use Services & HTML Ticket Printing`:
  - **Mã lỗi RFC 7807 ([backend/src/common/errors.js](file:///d:/Phuong_Anh_internship_project/Hotel%20Management%20Online/Hotel%20Management%20Online/backend/src/common/errors.js)):**
    - Bổ sung `ROOM_NOT_OCCUPIED` (trả về khi đăng ký dịch vụ cho phòng không ở trạng thái OCCUPIED).
    - Bổ sung `SERVICE_NOT_FOUND` (trả về khi dịch vụ không tồn tại trong danh mục).
  - **Tầng Service Nghiệp vụ Vận hành ([backend/src/services/operation.service.js](file:///d:/Phuong_Anh_internship_project/Hotel%20Management%20Online/Hotel%20Management%20Online/backend/src/services/operation.service.js)):**
    - `getOccupiedRooms()`: Lấy danh sách phòng vật lý đang `OCCUPIED` kèm thông tin đơn đặt phòng và khách lưu trú.
    - `getServicesCatalog()`: Lấy danh mục dịch vụ có sẵn của khách sạn.
    - `createServiceUsage({ roomId, serviceId, quantity })`:
      - Mở Interactive Transaction: `prisma.$transaction(async (tx) => { ... })`.
      - Khóa bi quan phòng vật lý bằng `SELECT room_id, status FROM rooms WHERE room_id = $1 FOR UPDATE`.
      - Kiểm tra nghiêm ngặt trạng thái phòng phải là `OCCUPIED` (nếu là `AVAILABLE` hoặc `MAINTENANCE` ném lỗi `ROOM_NOT_OCCUPIED`).
      - Tìm phiên lưu trú đang hoạt động của phòng này thuộc đơn booking đang `CHECKED_IN`.
      - Sinh mã phiếu `ticketId` theo định dạng duy nhất: `TK-YYYYMMDD-XXXX`.
      - Lưu bản ghi vào bảng `ServiceUsage` với `totalPrice = Number(service.price) * quantity`.
    - `getServiceTicket(ticketId)`: Lấy chi tiết toàn diện phiếu dịch vụ gồm mã phiếu, ngày lập, thông tin phòng, thông tin khách, tên dịch vụ, đơn vị tính, số lượng, đơn giá, thành tiền phục vụ in ấn HTML.
    - `listServiceTickets({ page, limit, roomId, bookingId, keyword })`: Lịch sử các phiếu dịch vụ đã xuất để quản lý và in lại.
  - **Tầng Controller & Routes ([backend/src/controllers/operation.controller.js](file:///d:/Phuong_Anh_internship_project/Hotel%20Management%20Online/Hotel%20Management%20Online/backend/src/controllers/operation.controller.js), [backend/src/entrypoints/operation.routes.js](file:///d:/Phuong_Anh_internship_project/Hotel%20Management%20Online/Hotel%20Management%20Online/backend/src/entrypoints/operation.routes.js)):**
    - Gắn các endpoints:
      - `GET /api/operation/services/occupied-rooms`
      - `GET /api/operation/services/catalog`
      - `POST /api/operation/services/usage`
      - `GET /api/operation/services/tickets/:ticketId`
      - `GET /api/operation/services/tickets`
    - Bảo vệ tuyệt đối bằng middleware `authenticateToken` và `requireRole("SALE")` (Strict Disjoint RBAC).
  - **Kiểm thử tự động ([backend/tests/feat10.test.js](file:///d:/Phuong_Anh_internship_project/Hotel%20Management%20Online/Hotel%20Management%20Online/backend/tests/feat10.test.js)):**
    - 11 bài kiểm thử tích hợp chuyên sâu (11/11 PASS, nâng tổng số bài test hệ thống lên 112/112 PASS trên 11 test suites).
    - Đáp ứng 100% hai tiêu chí verification trong `feature_list.json`:
      1. Chặn đăng ký dịch vụ cho phòng không ở trạng thái OCCUPIED (`ROOM_NOT_OCCUPIED`).
      2. Trang in phiếu hiển thị đầy đủ mã phiếu, số phòng, tên dịch vụ, số lượng, đơn giá, thành tiền và gọi `window.print()`.
  - **Giao diện React SPA:**
    - Component [frontend/src/pages/operation/ServiceUsageModal.jsx](file:///d:/Phuong_Anh_internship_project/Hotel%20Management%20Online/Hotel%20Management%20Online/frontend/src/pages/operation/ServiceUsageModal.jsx): Chọn phòng đang ở (`OCCUPIED`), chọn dịch vụ, nhập số lượng, tự động tính thành tiền thời gian thực, nút "Lập Phiếu & In Ngay".
    - Component [frontend/src/pages/operation/ServiceTicketPrintModal.jsx](file:///d:/Phuong_Anh_internship_project/Hotel%20Management%20Online/Hotel%20Management%20Online/frontend/src/pages/operation/ServiceTicketPrintModal.jsx): Giao diện HTML phiếu dịch vụ phòng sang trọng, chuẩn CSS `@media print`, hiển thị đầy đủ thương hiệu khách sạn, mã phiếu, phòng, dịch vụ, số lượng, đơn giá, thành tiền, ghi chú quyết toán và chữ ký 2 bên, tự động kích hoạt `window.print()`.
    - Tích hợp 2 tab điều hướng trong [frontend/src/pages/operation/SaleOperation.jsx](file:///d:/Phuong_Anh_internship_project/Hotel%20Management%20Online/Hotel%20Management%20Online/frontend/src/pages/operation/SaleOperation.jsx): Tab Đặt phòng & Check-in (có nút nhanh "+ Dịch vụ" cho đơn đang ở) và Tab Dịch vụ phòng (danh sách phòng đang ở kèm nút thêm dịch vụ, bảng lịch sử phiếu đã lập kèm nút in lại).
    - Frontend Vite production build PASS (4.16s).
- [x] Nghiệm thu hoàn thành `FEAT-10` trong [feature_list.json](file:///d:/Phuong_Anh_internship_project/Hotel%20Management%20Online/Hotel%20Management%20Online/feature_list.json).

## Verification Evidence

| Check | Command | Result | Notes |
|---|---|---|---|
| Prisma Schema Validation | `cd backend && npx prisma validate` | PASS | Schema hợp lệ 100% |
| Unit & Integration Tests | `cd backend && npm test` | PASS (112/112 tests) | 11 suites (`api`, `feat01` đến `feat10`), 0 fail |
| Code Linting | `cd backend && npm run lint` | PASS | 0 lint errors |
| Frontend Production Build | `cd frontend && npm run build` | PASS | Vite bundle built in 4.16s |
| Environment Init Script | `powershell -ExecutionPolicy Bypass -File .\init.ps1` | PASS | Tiến độ 10/12 features completed |

## Decisions Made

- Sử dụng **Node.js (v24)** với cú pháp **JavaScript ES Modules (`"type": "module"`)** cho toàn bộ backend.
- Sử dụng **Express.js** làm REST API web framework tiêu chuẩn.
- Sử dụng **Prisma ORM** cho tầng Data Access và quản lý database PostgreSQL.
- Phân quyền theo ma trận **Strict Disjoint RBAC**: `ADMIN` (`/api/admin/*`), `MANAGER` (`/api/setup/*`), `SALE` (`/api/operation/*`) tách biệt hoàn toàn; không có quyền thừa kế.
- Cơ chế **Sử dụng Dịch vụ (FEAT-10)**:
  - Chỉ phòng đang `OCCUPIED` mới được đăng ký dịch vụ.
  - Sử dụng khóa bi quan `SELECT ... FOR UPDATE` trên bảng `rooms`.
  - Sinh mã `ticketId` theo định dạng `TK-YYYYMMDD-XXXX`.
  - Toàn bộ chi phí dịch vụ sẽ được tổng hợp và quyết toán khi Check-out (`FEAT-11`).
  - Giao diện in HTML phiếu dịch vụ theo chuẩn CSS `@media print` và tự động kích hoạt `window.print()`.

## Blockers / Risks

- Không còn blocker: Toàn bộ 112 tests kiểm thử tự động PASS 100%, quy trình lập phiếu sử dụng dịch vụ và in phiếu HTML hoạt động hoàn hảo.

## Next Session Startup

1. Chạy `powershell -ExecutionPolicy Bypass -File .\init.ps1` hoặc `./init.sh`.
2. Kiểm tra `feature_list.json` và `progress.md`.
3. Bắt đầu tính năng tiếp theo: `FEAT-11: Check-out, Invoice Calculation & HTML Invoice Printing` (Tổng hợp tiền phòng, phụ thu trẻ em, tổng phí dịch vụ, khấu trừ số tiền đã trả trước prepaidBookingValue, xuất hóa đơn quyết toán, giải phóng phòng về AVAILABLE và mở trang in HTML qua window.print()).
