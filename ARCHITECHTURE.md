# ARCHITECTURE.md — Bản Thiết Kế Thi Công Hệ Thống e-Hotel
**Phiên bản:** 1.0 (Locked Specification)  
**Mô hình kiến trúc:** Decoupled Modular Monolith (Clean Architecture)  
**Nền tảng thực thi:** Deno 2.x (Backend API) + Vue 3 SPA (Frontend) + PostgreSQL 16 (Database) qua Docker Compose.

---

## 1. Sơ đồ cấu trúc thư mục dự án (Repository Tree)

Cấu trúc mã nguồn tuân thủ nghiêm ngặt mô hình **Clean Layered Architecture**, phân tách rạch ròi giữa giao tiếp HTTP, nghiệp vụ lõi (Domain), và truy xuất dữ liệu (Data Access):

```text
e-hotel/
├── docker/
│   ├── api.Dockerfile               # Multi-stage Dockerfile cho Deno API
│   ├── frontend.Dockerfile          # Nginx Dockerfile phục vụ Vue 3 SPA
│   ├── nginx.conf                   # Cấu hình reverse proxy & static serving
│   └── entrypoint.sh                # Script chờ DB ready & chạy migration/seed
├── docker-compose.yml               # Điều phối 3 service: db, api, frontend
├── docs/
│   ├── SPEC.md                      # Nguồn sự thật duy nhất (System of Record)
│   └── ARCHITECTURE.md              # Bản thiết kế kiến trúc thi công này
├── backend/                         # Deno REST API Application
│   ├── deno.json                    # Cấu hình tasks, imports (JSR), linter, fmt
│   ├── drizzle.config.ts            # Cấu hình Drizzle Kit Migration
│   ├── db/
│   │   ├── schema.ts                # Định nghĩa 10 thực thể PostgreSQL bằng Drizzle
│   │   ├── migrations/              # Thư mục chứa các file SQL migration
│   │   └── seed.ts                  # Dữ liệu khởi tạo (Admin, Manager, Sale, Rooms, Cards)
│   ├── src/
│   │   ├── common/                  # Hạ tầng dùng chung (Cross-cutting concerns)
│   │   │   ├── config.ts            # Đọc biến môi trường (ENV) có type-check
│   │   │   ├── database.ts          # Khởi tạo connection pool PostgreSQL
│   │   │   ├── errors.ts            # Định nghĩa bảng mã lỗi chuẩn RFC 7807
│   │   │   └── middlewares/
│   │   │       ├── auth.middleware.ts        # Xác thực Token & Inactivity Timeout (30p)
│   │   │       ├── rbac.middleware.ts        # Chặn quyền Strict Disjoint RBAC
│   │   │       └── error.middleware.ts       # Global Exception Handler
│   │   ├── entrypoints/             # Tầng Route định tuyến HTTP
│   │   │   ├── auth.routes.ts
│   │   │   ├── admin.routes.ts
│   │   │   ├── setup.routes.ts
│   │   │   ├── public.routes.ts
│   │   │   └── operation.routes.ts
│   │   ├── controllers/             # Tầng tiếp nhận, validate I/O và điều hướng
│   │   │   ├── auth.controller.ts
│   │   │   ├── room.controller.ts
│   │   │   ├── booking.controller.ts
│   │   │   ├── service.controller.ts
│   │   │   ├── checkout.controller.ts
│   │   │   └── report.controller.ts
│   │   ├── services/                # Tầng Domain Business Logic & Quản lý Transaction
│   │   │   ├── auth.service.ts
│   │   │   ├── room.service.ts
│   │   │   ├── booking.service.ts
│   │   │   ├── payment_simulator.service.ts
│   │   │   ├── checkin.service.ts
│   │   │   ├── checkout.service.ts
│   │   │   └── report.service.ts
│   │   └── repositories/            # Tầng Data Access (SQL Queries & Locks)
│   │       ├── user.repository.ts
│   │       ├── room.repository.ts
│   │       ├── booking.repository.ts
│   │       ├── payment_account.repository.ts
│   │       ├── service_ticket.repository.ts
│   │       └── invoice.repository.ts
│   └── tests/
│       ├── unit/                    # Unit tests cho các thuật toán tính tiền
│       └── integration/             # Integration tests gọi API kiểm tra DB
├── frontend/                        # Decoupled Single Page Application (SPA)
│   ├── index.html                   # Entrypoint HTML
│   ├── src/
│   │   ├── app.js                   # Khởi tạo Vue SPA & Router
│   │   ├── api/                     # HTTP client (gọi REST API)
│   │   ├── components/              # UI components tái sử dụng
│   │   ├── views/                   # Các màn hình theo từng vai trò
│   │   │   ├── public/              # Catalog, Search, Cart, Payment, Cancel
│   │   │   ├── manager/             # Setup Rooms, Services, Promotions
│   │   │   ├── sale/                # Bookings, Check-in, Tickets, Check-out, Reports
│   │   │   └── admin/               # User Management
│   │   └── print-templates/         # Giao diện HTML (@media print) cho Ticket & Invoice
│   └── assets/                      # CSS (Tailwind) & hình ảnh
└── tests-e2e/                       # Playwright E2E Test Suite chạy trên Docker
    └── e2e/
        ├── booking_flow.spec.js
        ├── cancellation_flow.spec.js
        └── rbac_guard.spec.js

```

---

## 2. Nguyên tắc phụ thuộc đơn hướng (Dependency Invariants)

Hệ thống thiết lập nguyên tắc kiến trúc "Bất biến phụ thuộc" theo 1 chiều duy nhất từ ngoài vào trong:

```text
[HTTP Client] 
      │
      ▼
[Entrypoints / Routes]   --> Chỉ định tuyến & gắn Middleware (Auth, RBAC, Timeout)
      │
      ▼
[Controllers / Handlers] --> Parse payload, validate schema DTO, gọi Service, trả JSON
      │
      ▼
[Domain Services]        --> Nắm giữ 100% Business Rules, tính toán tiền, quản lý Transaction
      │
      ▼
[Repositories]           --> Thực thi SQL, truy vấn Drizzle ORM, thực hiện Pessimistic Locks
      │
      ▼
[Database Model / DB]    --> PostgreSQL Schema & Tables

```

### Các điều cấm tuyệt đối (Strict Prohibitions):

1. **CẤM Tầng Dưới gọi ngược Tầng Trên:** Repository không được import Service; Service không được import Controller; Model không được biết về HTTP.
2. **CẤM Router gọi trực tiếp Repository:** Toàn bộ truy vấn đọc/ghi bắt buộc phải đi qua Domain Service để đảm bảo quy tắc nghiệp vụ không bị phân mảnh.
3. **CẤM Trộn lẫn Ngữ cảnh HTTP vào Service:** Domain Service chỉ nhận các tham số thuần túy (Plain Objects/Primitives) và trả về dữ liệu thuần; tuyệt đối không truyền đối tượng HTTP Context (`c.req`, `c.res`, `Headers`) vào tầng Service.

---

## 3. Ranh giới giao dịch & Kiểm soát tranh chấp (Transaction Boundaries & Concurrency Control)

Do hệ thống phục vụ đặt phòng và thanh toán tiền trực tuyến, tranh chấp đồng thời (Race Condition) và đặt trùng phòng (Overbooking) là rủi ro trọng yếu. Mọi luồng nhạy cảm bắt buộc phải được bọc trong một **Database Transaction** với chiến lược **Khóa bản ghi bi quan (Pessimistic Locking - `FOR UPDATE`)**.

```text
┌────────────────────────────────────────────────────────────────────────┐
│                        DOMAIN SERVICE LAYER                            │
│                                                                        │
│  db.transaction(async (tx) => {                                        │
│      1. Khóa tài khoản / phòng vật lý: SELECT ... FOR UPDATE           │
│      2. Kiểm tra tồn kho hạng phòng / Kiểm tra số dư tài khoản        │
│      3. Thực thi trừ tiền / Cập nhật trạng thái / Thêm mới booking     │
│      4. Tự động COMMIT (nếu thành công) hoặc ROLLBACK (khi gặp lỗi)    │
│  })                                                                    │
└────────────────────────────────────────────────────────────────────────┘

```

### Chi tiết 4 luồng nghiệp vụ nhạy cảm:

### Luồng 3.1: Đặt phòng & Trừ số lượng tồn kho hạng phòng (Inventory Allocation)

* **Bài toán:** Hai khách hàng cùng lúc đặt những phòng cuối cùng của hạng `VIP - SINGLE` trong cùng khoảng ngày `[fromDate, toDate)`.
* **Giải pháp:**
1. Mở giao dịch: `await db.transaction(async (tx) => { ... })`.
2. Khóa chống tranh chấp hạng phòng: Khóa mức dòng các phòng vật lý thuộc loại và kích cỡ đó:
```sql
SELECT room_id FROM rooms 
WHERE type = $1 AND size = $2 AND status != 'MAINTENANCE' 
FOR UPDATE;

```


3. Tính toán tồn kho thực tế khả dụng (`AvailableQuota`):

$$\text{AvailableQuota} = \text{TotalPhysicalRooms} - \text{ActiveBookedRoomsInInterval}$$


4. Nếu $\text{AvailableQuota} < \text{RequestedQuantity}$, ném lỗi `ROOM_QUOTA_EXCEEDED` (kích hoạt rollback ngay lập tức).
5. Khóa và trừ tiền tài khoản thanh toán giả lập của khách:
```sql
SELECT balance FROM payment_accounts 
WHERE account_number = $1 
FOR UPDATE;

```


6. Nếu $\text{balance} < \text{prepaidBookingValue}$, ném lỗi `PAYMENT_INSUFFICIENT_BALANCE`.
7. Trừ tiền `balance = balance - prepaidBookingValue`, tạo đơn `Booking` (status `CONFIRMED`) và các `BookingItem`.
8. Giao dịch tự động `COMMIT`.



### Luồng 3.2: Hủy đặt phòng & Hoàn tiền (80/20 Refund)

* **Bài toán:** Ngăn chặn việc khách bấm hủy 2 lần liên tiếp dẫn đến việc được hoàn tiền 2 lần (Double Refund).
* **Giải pháp:**
1. `db.transaction(async (tx) => { ... })`.
2. Khóa dòng đơn đặt phòng:
```sql
SELECT * FROM bookings 
WHERE booking_number = $1 
FOR UPDATE;

```


3. Kiểm tra điều kiện:
* Nếu `status != 'CONFIRMED'`, ném lỗi `BOOKING_NOT_CANCELLABLE`.
* Nếu $\text{fromDate} - \text{now} < 24\text{ hours}$, ném lỗi `CANCELLATION_DEADLINE_EXPIRED`.


4. Tính toán tài chính:
* $\text{cancellationFee} = \text{prepaidBookingValue} \times 0.20$
* $\text{refundAmount} = \text{prepaidBookingValue} \times 0.80$


5. Cập nhật booking: `status = 'CANCELLED'`, lưu phí phạt và số tiền hoàn.
6. Hoàn tiền vào tài khoản:
```sql
UPDATE payment_accounts 
SET balance = balance + $1 
WHERE account_number = $2;

```


7. `COMMIT`.



### Luồng 3.3: Check-in & Gán phòng vật lý (Physical Room Assignment)

* **Bài toán:** Hai lễ tân cùng lúc gán cùng một phòng vật lý (ví dụ: Phòng 101) cho 2 đoàn khách khác nhau.
* **Giải pháp:**
1. Trong transaction, khóa bản ghi phòng vật lý được chọn:
```sql
SELECT status FROM rooms 
WHERE room_id = $1 
FOR UPDATE;

```


2. Nếu `status != 'AVAILABLE'`, ném lỗi `ROOM_ALREADY_OCCUPIED`.
3. Cập nhật `rooms.status = 'OCCUPIED'`.
4. Lưu thông tin gán phòng (`room_assignments`) và danh sách khách lưu trú (`staying_guests`).
5. Tự động tính phụ thu trẻ em: Nếu số trẻ em trong phòng $> \text{Room.maxChildren}$, tính phụ thu cộng dồn vào `bookings.extra_children_fee`.
6. Cập nhật `bookings.status = 'CHECKED_IN'`.



### Luồng 3.4: Check-out & Quyết toán hóa đơn (Invoicing)

* **Bài toán:** Chốt toàn bộ công nợ, phát hành hóa đơn không thể chỉnh sửa và giải phóng phòng vật lý.
* **Giải pháp:**
1. Khóa booking: `SELECT * FROM bookings WHERE id = $1 FOR UPDATE`.
2. Tính tổng tiền dịch vụ:
```sql
SELECT COALESCE(SUM(total_price), 0) FROM service_usage WHERE booking_id = $1;

```


3. Tính số tiền còn lại phải thanh toán:

$$\text{remainingPayable} = (\text{netRoomFee} + \text{extraChildrenFee} + \text{totalServiceFee}) - \text{prepaidBookingValue}$$


4. Tạo bản ghi `Invoice`.
5. Chuyển trạng thái booking sang `CHECKED_OUT`.
6. Cập nhật tất cả các phòng vật lý đã gán của booking về trạng thái `AVAILABLE`.
7. `COMMIT`.



---

## 4. Cơ chế Database Migration & Seed Data

### 4.1. Quy trình chạy Migration tự động (Zero-manual Ops)

Trong tệp `docker/entrypoint.sh`, khi container API khởi động:

1. Sử dụng tiện ích chờ DB sẵn sàng:
```bash
echo "⏳ Đang chờ PostgreSQL khởi động..."
while ! nc -z db 5432; do sleep 0.5; done
echo "✅ PostgreSQL đã sẵn sàng!"

```


2. Thực thi lệnh migrate của Drizzle:
```bash
deno task db:migrate

```


3. Kiểm tra xem dữ liệu mẫu đã tồn tại chưa; nếu chưa, tự động nạp dữ liệu:
```bash
deno task db:seed

```



### 4.2. Danh mục Seed Data chuẩn phục vụ Test độc lập (Fixtures)

File `backend/db/seed.ts` được lập trình sẵn để tạo toàn bộ dữ liệu mẫu ban đầu:

1. **3 Tài khoản người dùng phân quyền nghiêm ngặt (Password hash bcrypt: `Password@123`):**
* `admin` | Vai trò: `ADMIN` | Quản trị người dùng
* `manager` | Vai trò: `MANAGER` | Cấu hình phòng, dịch vụ, khuyến mãi
* `sale` | Vai trò: `SALE` | Lễ tân, vận hành, check-in/out, báo cáo


2. **Danh mục phòng vật lý mẫu:**
* `101`, `102`: Loại `VIP`, Cỡ `SINGLE`, Đơn giá: 1.500.000 VNĐ, Max: 2 Người lớn, 1 Trẻ em, Phụ thu trẻ em: 200.000 VNĐ/đêm.
* `201`, `202`: Loại `VIP`, Cỡ `DOUBLE`, Đơn giá: 2.200.000 VNĐ, Max: 4 Người lớn, 2 Trẻ em, Phụ thu trẻ em: 250.000 VNĐ/đêm.
* `301`, `302`: Loại `DELUX`, Cỡ `SINGLE`, Đơn giá: 900.000 VNĐ, Max: 2 Người lớn, 1 Trẻ em, Phụ thu trẻ em: 150.000 VNĐ/đêm.
* `401`, `402`: Loại `DELUX`, Cỡ `DOUBLE`, Đơn giá: 1.300.000 VNĐ, Max: 4 Người lớn, 2 Trẻ em, Phụ thu trẻ em: 180.000 VNĐ/đêm.
* `501`: Loại `LIVING_SUITE`, Cỡ `DOUBLE`, Đơn giá: 3.500.000 VNĐ, Max: 4 Người lớn, 2 Trẻ em, Phụ thu trẻ em: 300.000 VNĐ/đêm.


3. **Danh mục Dịch vụ mẫu:**
* `SRV-01`: Massage đá nóng | Đơn vị: `Lượt` | Giá: 450.000 VNĐ
* `SRV-02`: Giặt ủi lấy nhanh | Đơn vị: `Kg` | Giá: 40.000 VNĐ
* `SRV-03`: Vang đỏ Đà Lạt | Đơn vị: `Chai` | Giá: 350.000 VNĐ
* `SRV-04`: Buffet sáng thêm suất | Đơn vị: `Suất` | Giá: 150.000 VNĐ


4. **Mã Khuyến mãi mẫu:**
* `SUMMER2026`: Giảm 15% (`PERCENTAGE`, value = 15, hiệu lực từ 2026-05-01 đến 2026-10-31)
* `DIRECT500`: Giảm 500.000 VNĐ (`FIXED_AMOUNT`, value = 500000, hiệu lực cả năm 2026)


5. **Tài khoản Thanh toán Giả lập (Payment Simulator):**
* Số thẻ: `9704000000000001` | Loại: `ATM` | Chủ thẻ: `NGUYEN VAN A` | Số dư: 50.000.000 VNĐ
* Số thẻ: `4000000000000002` | Loại: `VISA` | Chủ thẻ: `TRAN THI B` | Số dư: 100.000.000 VNĐ
* Số thẻ: `9704000000000003` | Loại: `ATM` | Chủ thẻ: `LE VAN TEO` | Số dư: 50.000 VNĐ *(Tài khoản số dư thấp để kiểm thử kịch bản thanh toán thất bại)*



---

## 5. Chuẩn hóa Xử lý Lỗi (Exception Handling & Error Contract)

Hệ thống bắt toàn bộ lỗi tại Middleware tập trung (`error.middleware.ts`) và chuẩn hóa đầu ra theo chuẩn **RFC 7807 Problem Details**:

```json
{
  "success": false,
  "error": {
    "code": "STRING_IDENTIFIER",
    "message": "Thông điệp mô tả lỗi chi tiết cho người dùng bằng Tiếng Việt.",
    "details": null,
    "timestamp": "2026-10-16T10:05:00.000Z"
  }
}

```

### Bảng Ánh Xạ Mã Lỗi Hệ Thống:

| Mã Lỗi (`code`) | HTTP Status | Mô tả nguyên nhân |
| --- | --- | --- |
| `VALIDATION_FAILED` | `400 Bad Request` | Dữ liệu đầu vào sai định dạng hoặc thiếu trường bắt buộc |
| `ROOM_QUOTA_EXCEEDED` | `400 Bad Request` | Hạng phòng yêu cầu đã hết tồn kho trong khoảng ngày chọn |
| `ROOM_CANNOT_BE_DELETED` | `400 Bad Request` | Phòng đã từng có lịch sử đặt phòng, không thể xóa |
| `PAYMENT_FAILED` | `400 Bad Request` | Tài khoản thanh toán không tồn tại hoặc số dư không đủ |
| `CANCELLATION_INVALID` | `400 Bad Request` | Đơn phòng không ở trạng thái CONFIRMED hoặc hủy trễ hơn mốc 24h |
| `UNAUTHORIZED` | `401 Unauthorized` | Thiếu token đăng nhập hoặc phiên làm việc đã quá 30 phút |
| `FORBIDDEN_ACCESS` | `403 Forbidden` | Truy cập sai vai trò theo ma trận Strict Disjoint RBAC |
| `RESOURCE_NOT_FOUND` | `404 Not Found` | Không tìm thấy mã booking, mã phòng hoặc dịch vụ |
| `ROOM_ALREADY_OCCUPIED` | `409 Conflict` | Phòng vật lý đang có người ở, không thể gán Check-in |
| `INTERNAL_SERVER_ERROR` | `500 Server Error` | Lỗi hệ thống ngoài dự kiến |

---

## 6. Architectural Guardrails (Hàng rào bảo vệ cho AI Coding Agent)

Khi AI Coding Agent (Cursor, Claude Code, Windsurf, Codex) thực thi nhiệm vụ, **BẮT BUỘC** phải tuân theo 7 điều răn kiến trúc sau:

1. **CẤM SỬA DATABASE BỎ QUA MIGRATION:** Tuyệt đối không viết lệnh DDL (ALTER/DROP/CREATE) trực tiếp vào code runtime. Mọi sửa đổi schema trong `backend/db/schema.ts` phải được tạo ra file SQL migration thông qua lệnh `deno task db:generate` và chạy qua `deno task db:migrate`.
2. **CẤM VI PHẠM TẦNG THỨ KIẾN TRÚC:** Tuyệt đối không cho phép Router hoặc Controller import Repository hay viết câu lệnh SQL. Toàn bộ logic phải nằm trong `services/`.
3. **CẤM VI PHẠM STRICT DISJOINT RBAC:** Tuyệt đối không thêm quyền kế thừa (Inherited Roles). `ADMIN` chỉ được truy cập `/api/admin/*`; `MANAGER` chỉ được truy cập `/api/setup/*`; `SALE` chỉ được truy cập `/api/operation/*`. Bất kỳ vi phạm nào phải trả về đúng mã `403 Forbidden`.
4. **CẤM BỎ QUA TRANSACTION TRONG LUỒNG THANH TOÁN & GÁN PHÒNG:** Mọi thao tác ghi ảnh hưởng từ 2 bảng trở lên (Đặt phòng + Trừ tiền, Hủy phòng + Hoàn tiền, Check-in + Đổi trạng thái phòng) bắt buộc phải bọc trong `db.transaction()`.
5. **CẤM TỰ Ý CÀI THƯ VIỆN NGOÀI ADR-001:** Tuyệt đối không tự ý import các thư viện bên thứ ba chưa được phê duyệt trong ADR-001, đặc biệt là các thư viện mang tính phụ thuộc Node.js APIs (`fs`, `child_process`, `crypto` của Node).
6. **CẤM BỎ SƠN HỞ TRONG CÔNG THỨC DOANH THU:** Báo cáo doanh thu bắt buộc phải áp dụng đúng công thức:

$$\text{Doanh thu} = \sum (\text{Hóa đơn Check-out}) + \sum (\text{20\% Phí hủy đơn})$$


7. **BẢO ĐẢM TRẠNG THÁI VERIFICATION TRƯỚC KHI BÀN GIAO:** Agent chỉ được đánh dấu hoàn thành một tính năng khi các lệnh kiểm tra sau đều vượt qua (0 lỗi):
```bash
deno check backend/src/main.ts
deno lint backend/
deno test backend/tests/
```

---

## 3. Bản Mẫu Cấu Hình Hạ Tầng Triển Khai (`docker-compose.yml`)

Để hệ thống sẵn sàng chạy ngay trên máy cục bộ của bạn bằng Docker mà không cần cài đặt Node.js hay npm, dưới đây là file `docker-compose.yml` chuẩn hóa:

```yaml
version: '3.8'

services:
  db:
    image: postgres:16-alpine
    container_name: ehotel_postgres
    restart: always
    environment:
      POSTGRES_DB: ehotel_db
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: postgres_secure_password
    ports:
      - "5432:5432"
    volumes:
      - pgdata:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U postgres -d ehotel_db"]
      interval: 5s
      timeout: 5s
      retries: 5

  api:
    build:
      context: .
      dockerfile: docker/api.Dockerfile
    container_name: ehotel_api
    restart: always
    depends_on:
      db:
        condition: service_healthy
    environment:
      PORT: 8000
      DATABASE_URL: postgres://postgres:postgres_secure_password@db:5432/ehotel_db
      JWT_SECRET: super_secret_jwt_key_ehotel_2026
      SESSION_TIMEOUT_MINUTES: 30
    ports:
      - "8000:8000"

  frontend:
    build:
      context: .
      dockerfile: docker/frontend.Dockerfile
    container_name: ehotel_frontend
    restart: always
    depends_on:
      - api
    ports:
      - "80:80"

volumes:
  pgdata:
```