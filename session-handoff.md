# Session Handoff

**Last Updated:** 2026-10-27

## Current Objective

- **Goal:** Hoàn thành tính năng `FEAT-06: Room Catalog & Inventory-based Availability Search`. Chuẩn bị bước vào triển khai `FEAT-07: Shopping Cart, Customer Form, Promotion & Payment Simulator`.
- **Current status:** `FEAT-01`, `FEAT-02`, `FEAT-03`, `FEAT-04`, `FEAT-05`, và `FEAT-06` đã hoàn tất và nghiệm thu 100%. Sẵn sàng cho `FEAT-07`.
- **Branch / commit:** master

## Completed This Session

- [x] Sửa lỗi khởi chạy server backend trong [backend/src/main.js](file:///d:/Phuong_Anh_internship_project/Hotel%20Management%20Online/Hotel%20Management%20Online/backend/src/main.js) khi đường dẫn chứa khoảng trắng trên Windows (`fileURLToPath` + `path.resolve`), khắc phục triệt để lỗi `ECONNREFUSED` từ Vite Proxy.
- [x] Nghiệm thu hoàn thành `FEAT-06: Room Catalog & Inventory-based Availability Search`:
  - **Tầng Service Tra cứu Tồn kho ([backend/src/services/catalog.service.js](file:///d:/Phuong_Anh_internship_project/Hotel%20Management%20Online/Hotel%20Management%20Online/backend/src/services/catalog.service.js)):**
    - `getCatalog({ type, size, search })`: Gom nhóm phòng theo từng hạng phòng `(type, size)`, tổng hợp tiện nghi, thông số khách, hình ảnh và đơn giá.
    - `getRoomDetails(roomId)`: Xem chi tiết phòng theo mã phòng (trả về 404 RESOURCE_NOT_FOUND nếu không tìm thấy).
    - `searchAvailability({ fromDate, toDate, type, size, forUpdate, tx })`: Triển khai công thức tồn kho chuẩn mực theo SPEC 4.1:
      - $\text{TotalPhysicalRooms} = \text{Count}(\text{rooms with status} \ne \text{MAINTENANCE})$.
      - $\text{BookedRooms} = \sum \text{BookingItem.quantity}$ của các đơn có `status IN ('CONFIRMED', 'CHECKED_IN')` và khoảng thời gian giao nhau `existing.fromDate < search.toDate AND existing.toDate > search.fromDate`.
      - $\text{AvailableQuota} = \max(0, \text{TotalPhysicalRooms} - \text{BookedRooms})$.
      - Đơn `CANCELLED` và `CHECKED_OUT` không chiếm dụng tồn kho.
      - Hỗ trợ khóa bi quan Pessimistic Locking (`SELECT room_id FROM rooms WHERE ... FOR UPDATE`) khi thực thi trong giao dịch `tx`.
    - `checkCategoryQuota(...)`: Helper kiểm tra hạn mức tồn kho phòng phục vụ cho luồng giao dịch đặt phòng FEAT-07, ném mã lỗi RFC 7807 `ROOM_QUOTA_EXCEEDED` khi vượt quá số lượng.
  - **Tầng Controller & Routes ([backend/src/controllers/catalog.controller.js](file:///d:/Phuong_Anh_internship_project/Hotel%20Management%20Online/Hotel%20Management%20Online/backend/src/controllers/catalog.controller.js), [backend/src/entrypoints/public.routes.js](file:///d:/Phuong_Anh_internship_project/Hotel%20Management%20Online/Hotel%20Management%20Online/backend/src/entrypoints/public.routes.js)):**
    - Mount các endpoint công khai không yêu cầu token: `GET /api/public/rooms`, `GET /api/public/rooms/:roomId`, `GET /api/public/availability`, `POST /api/public/availability/search`.
  - **Kiểm thử tự động ([backend/tests/feat06.test.js](file:///d:/Phuong_Anh_internship_project/Hotel%20Management%20Online/Hotel%20Management%20Online/backend/tests/feat06.test.js)):**
    - 15 bài kiểm thử tích hợp chuyên sâu (tất cả 15/15 PASS, nâng tổng số bài test lên 69/69 PASS trên 7 suites).
  - **Giao diện React SPA:**
    - Màn hình Cổng Đặt Phòng Khách Hàng ([frontend/src/pages/customer/RoomCatalog.jsx](file:///d:/Phuong_Anh_internship_project/Hotel%20Management%20Online/Hotel%20Management%20Online/frontend/src/pages/customer/RoomCatalog.jsx)):
      - Hero header sang trọng, thanh tìm kiếm lưu trú trực quan (date picker, chọn loại phòng/kích cỡ, tự động tính số đêm).
      - Lưới thẻ hạng phòng hiển thị huy hiệu loại phòng (VIP, DELUX, LIVING_SUITE), thông số sức chứa người lớn/trẻ em, đơn giá, tổng tiền lưu trú.
      - Huy hiệu tồn kho thời gian thực (Available Quota Badge): hiển thị rõ số phòng còn trống hoặc thông báo hết phòng.
      - Bộ chọn số lượng phòng (tối đa bằng `availableQuota`) và nút Đặt Phòng / Thêm vào giỏ hàng.
      - Modal xem chi tiết phòng: thư viện ảnh, thông số chi tiết, chính sách nhận/trả phòng và chính sách hủy phòng (hoàn 80%).
    - Cập nhật điều hướng trong [frontend/src/App.jsx](file:///d:/Phuong_Anh_internship_project/Hotel%20Management%20Online/Hotel%20Management%20Online/frontend/src/App.jsx): Cho phép chuyển đổi linh hoạt giữa Cổng Đặt Phòng Khách Hàng và Bảng Đăng Nhập / Quản Trị Nội Bộ.
    - Frontend Vite production build PASS (11.15s).
- [x] Nghiệm thu hoàn thành `FEAT-06` trong [feature_list.json](file:///d:/Phuong_Anh_internship_project/Hotel%20Management%20Online/Hotel%20Management%20Online/feature_list.json).

## Verification Evidence

| Check | Command | Result | Notes |
|---|---|---|---|
| Prisma Schema Validation | `cd backend && npx prisma validate` | PASS | Schema hợp lệ 100% |
| Unit & Integration Tests | `cd backend && npm test` | PASS (69/69 tests) | 7 suites (`api`, `feat01`, `feat02`, `feat03`, `feat04`, `feat05`, `feat06`), 0 fail |
| Code Linting | `cd backend && npm run lint` | PASS | 0 lint errors |
| Frontend Production Build | `cd frontend && npm run build` | PASS | Vite bundle built in 11.15s |
| Environment Init Script | `powershell -ExecutionPolicy Bypass -File .\init.ps1` | PASS | Tiến độ 6/12 features completed |

## Decisions Made

- Sử dụng **Node.js (v24)** với cú pháp **JavaScript ES Modules (`"type": "module"`)** cho toàn bộ backend.
- Sử dụng **Express.js** làm REST API web framework tiêu chuẩn.
- Sử dụng **Prisma ORM** cho tầng Data Access và quản lý database PostgreSQL.
- Phân quyền theo ma trận **Strict Disjoint RBAC**: `ADMIN` (`/api/admin/*`), `MANAGER` (`/api/setup/*`), `SALE` (`/api/operation/*`) tách biệt hoàn toàn; không có quyền thừa kế.
- Cơ chế **Deletion Guards**:
  - `ROOM_CANNOT_BE_DELETED`: Không xóa phòng có bản ghi trong `room_assignments` hoặc `service_usage`.
  - `SERVICE_CANNOT_BE_DELETED`: Không xóa dịch vụ có bản ghi trong `service_usage`.
  - `PROMOTION_CANNOT_BE_DELETED`: Không xóa khuyến mãi đã từng được gán trong `bookings`.
- Công thức **Room Availability**:
  - Giao thoa khoảng thời gian: $\text{existing.fromDate} < \text{search.toDate} \land \text{existing.toDate} > \text{search.fromDate}$.
  - $\text{AvailableQuota} = \text{TotalPhysicalRooms (không bảo trì)} - \text{BookedRooms (CONFIRMED hoặc CHECKED_IN)}$.
  - Áp dụng khóa bi quan Pessimistic Locking `SELECT room_id FROM rooms WHERE ... FOR UPDATE` khi kiểm tra trong transaction đặt phòng.

## Blockers / Risks

- Không còn blocker: Toàn bộ 69 tests kiểm thử tự động PASS 100%, bảo mật phân quyền, quản lý phân hệ Setup và tra cứu tồn kho phòng theo thời gian thực hoạt động chính xác.

## Next Session Startup

1. Chạy `powershell -ExecutionPolicy Bypass -File .\init.ps1` hoặc `./init.sh`.
2. Đọc [AGENTS.md](file:///d:/Phuong_Anh_internship_project/Hotel%20Management%20Online/Hotel%20Management%20Online/AGENTS.md), [feature_list.json](file:///d:/Phuong_Anh_internship_project/Hotel%20Management%20Online/Hotel%20Management%20Online/feature_list.json), [progress.md](file:///d:/Phuong_Anh_internship_project/Hotel%20Management%20Online/Hotel%20Management%20Online/progress.md).
3. Review biên bản bàn giao này [session-handoff.md](file:///d:/Phuong_Anh_internship_project/Hotel%20Management%20Online/Hotel%20Management%20Online/session-handoff.md).

## Recommended Next Step

- Bắt đầu triển khai tính năng `FEAT-07: Shopping Cart, Customer Form, Promotion & Payment Simulator` (Giỏ hàng đặt phòng, form nhập thông tin khách hàng, áp dụng mã khuyến mãi và trừ tiền tài khoản thanh toán giả lập có khóa bi quan).
