# AGENTS.md — Operational Rules & Architecture Guide for e-Hotel

## 1. System Overview & Source of Truth
- **Project:** e-Hotel (Hotel Management & Booking Online System).
- **Primary Spec:** Đọc kỹ [docs/SPEC.md](file:///d:/Phuong_Anh_internship_project/Hotel%20Management%20Online/Hotel%20Management%20Online/docs/SPEC.md) trước khi viết bất kỳ dòng code nào. Không tự ý suy diễn hoặc thêm bớt quy tắc nghiệp vụ ngoài tài liệu đặc tả.
- **Architecture Blueprints:**
  - Quyết định công nghệ: [docs/adr/ADR-001-tech-stack-decision.md](file:///d:/Phuong_Anh_internship_project/Hotel%20Management%20Online/Hotel%20Management%20Online/docs/adr/ADR-001-tech-stack-decision.md) (Locked: Deno 2.x + Hono + Drizzle ORM + React SPA + Docker Compose).
  - Bản thiết kế thi công: [ARCHITECHTURE.md](file:///d:/Phuong_Anh_internship_project/Hotel%20Management%20Online/Hotel%20Management%20Online/ARCHITECHTURE.md) (Clean Layered Architecture, Concurrency Control, Error Codes RFC 7807).
- **State & Progress Tracking:**
  - Danh sách tính năng và trạng thái nghiệm thu: [feature_list.json](file:///d:/Phuong_Anh_internship_project/Hotel%20Management%20Online/Hotel%20Management%20Online/feature_list.json).
  - Nhật ký tiến độ phiên: [progress.md](file:///d:/Phuong_Anh_internship_project/Hotel%20Management%20Online/Hotel%20Management%20Online/progress.md).
  - Bàn giao phiên làm việc: [session-handoff.md](file:///d:/Phuong_Anh_internship_project/Hotel%20Management%20Online/Hotel%20Management%20Online/session-handoff.md).

## 2. Tech Stack & Architectural Invariants
- **Backend Runtime & Framework:** Deno v2.0+ (JavaScript ES2024 / TypeScript 5.6), Hono v4.6+ trên `Deno.serve`.
- **Database & ORM:** PostgreSQL 16 + Drizzle ORM v0.35+ (`drizzle-orm`) & Drizzle Kit v0.26+ (`drizzle-kit`), driver `postgres.js`.
- **Frontend SPA:** React v18.3+ Single Page Application + Vite v5.4+ + Tailwind CSS v3.4+ + Lucide Icons, đóng gói phục vụ qua Nginx Alpine container.
- **Containerization:** Docker & Docker Compose (`db`, `api`, `frontend`).
- **Strict Disjoint RBAC Rule:**
  - `ADMIN` CHỈ được truy cập `/admin/*` và `/api/admin/*`.
  - `MANAGER` CHỈ được truy cập `/setup/*` và `/api/setup/*`.
  - `SALE` CHỈ được truy cập `/operation/*` và `/api/operation/*`.
  - Tuyệt đối KHÔNG cho phép Admin kế thừa quyền của Manager hay Sale.
  - Phiên đăng nhập tự động hết hạn nếu `now - lastActiveAt > 30 minutes`.
- **Concurrency & Transaction Invariants:**
  - Mọi thao tác đặt phòng (trừ tồn kho), hủy phòng (hoàn tiền), check-in (gán phòng) và check-out (xuất hóa đơn) bắt buộc phải bọc trong `db.transaction()` và sử dụng khóa bi quan **`SELECT ... FOR UPDATE`**.
  - Tuyệt đối không cho phép Router/Controller gọi trực tiếp Repository hay viết SQL; bắt buộc phải đi qua Domain Service.

## 3. Startup Workflow & Session Rules
Quy trình khởi động phiên làm việc bắt buộc trước khi code (**Startup Workflow**):
1. **Khởi động phiên (Before writing code):**
   - Chạy script `./init.sh` để kiểm tra môi trường, cơ sở dữ liệu và trạng thái kiểm thử hiện tại.
   - Đọc kỹ `session-handoff.md` và `progress.md` để nắm bắt mục tiêu và công việc dở dang từ phiên trước.
2. **One feature at a time:**
   - Chọn đúng 1 tính năng duy nhất có `"status": "not-started"` hoặc `"status": "in-progress"` trong `feature_list.json` để thực hiện.
   - Tuyệt đối không làm tràn lan nhiều tính năng cùng lúc.
3. **Stay in scope (Scope Boundaries):**
   - Chỉ sửa đổi mã nguồn và tệp tin liên quan trực tiếp đến tính năng đang thực hiện.
   - Không tự ý tái cấu trúc hoặc thêm thư viện bên ngoài không thuộc phạm vi `docs/adr/ADR-001-tech-stack-decision.md` và `ARCHITECHTURE.md`.

## 4. Verification Commands & Verification Evidence
Mọi thay đổi mã nguồn phải được kiểm tra qua các lệnh xác minh bắt buộc:
```bash
# Kiểm tra tĩnh và kiểu dữ liệu
deno check backend/src/main.ts
deno lint backend/

# Chạy unit & integration tests
deno test -A backend/tests/

# Kiểm tra migration & database
deno task db:generate
deno task db:migrate
```
- **Verification Evidence:** Trước khi đánh dấu hoàn thành, Agent phải ghi nhận đầy đủ bằng chứng xác minh (lệnh đã chạy, kết quả đầu ra không lỗi, số lượng test passed) vào `session-handoff.md` và trường `evidence` trong `feature_list.json`.

## 5. Definition of Done & Completion Gate
Một tính năng chỉ được xem là hoàn thành (**Definition of Done**) khi:
1. Toàn bộ các tiêu chí trong trường `verification` của tính năng đó trong `feature_list.json` chạy thành công 100%.
2. Tất cả các lệnh kiểm tra trong mục **Verification Commands** (`deno check`, `deno lint`, `deno test`) đều PASS với 0 lỗi.
3. Bằng chứng xác minh (**Verification Evidence**) được ghi lại đầy đủ.
4. **No Early Victory:** Không tự ý chuyển trạng thái sang `"done"` khi chưa chạy và vượt qua toàn bộ lệnh xác minh.

## 6. End of Session Procedure & Clean State Exit
Trước khi kết thúc phiên làm việc (**End of Session** / **Before ending session**):
1. Chạy lại `./init.sh` và bộ Verification Commands để đảm bảo mã nguồn ở trạng thái sạch (**clean state**).
2. Cập nhật tiến độ vào [progress.md](file:///d:/Phuong_Anh_internship_project/Hotel%20Management%20Online/Hotel%20Management%20Online/progress.md).
3. Điền đầy đủ biên bản bàn giao [session-handoff.md](file:///d:/Phuong_Anh_internship_project/Hotel%20Management%20Online/Hotel%20Management%20Online/session-handoff.md) để phiên tiếp theo có thể tái khởi động ngay lập tức (**restartable**).
