# ARCHITECTURE.md — Bản Thiết Kế Thi Công Hệ Thống e-Hotel
**Phiên bản:** 2.0 (Updated: Node.js + Express.js + Prisma ORM + React.js SPA)  
**Mô hình kiến trúc:** Decoupled Modular Monolith (Clean Architecture)  
**Nền tảng thực thi:** Node.js v24 (Backend API với Express.js + Prisma ORM) + React.js SPA (Frontend với Vite) + PostgreSQL 16 (Database) qua Docker Compose hoặc chạy trực tiếp bằng `npm`.

---

## 1. Sơ đồ cấu trúc thư mục dự án (Repository Tree)

Cấu trúc mã nguồn tuân thủ nghiêm ngặt mô hình **Clean Layered Architecture**, phân tách rạch ròi giữa giao tiếp HTTP, nghiệp vụ lõi (Domain), và truy xuất dữ liệu (Data Access qua Prisma):

```text
e-hotel/
├── docker/
│   ├── api.Dockerfile               # Dockerfile cho Node.js API
│   ├── frontend.Dockerfile          # Nginx Dockerfile phục vụ React SPA
│   ├── nginx.conf                   # Cấu hình reverse proxy & static serving
│   └── entrypoint.sh                # Script chờ DB ready & chạy migration/seed
├── docker-compose.yml               # Điều phối 3 service: db, api, frontend
├── docs/
│   ├── SPEC.md                      # Nguồn sự thật duy nhất (System of Record)
│   ├── ARCHITECTURE.md              # Bản thiết kế kiến trúc thi công này
│   └── adr/
│       └── ADR-001-tech-stack-decision.md # Quyết định công nghệ Node.js + React.js
├── backend/                         # Node.js REST API Application
│   ├── package.json                 # Cấu hình dependencies, scripts (test, seed, dev)
│   ├── prisma/
│   │   ├── schema.prisma            # Định nghĩa 10 thực thể PostgreSQL bằng Prisma
│   │   └── seed.js                  # Dữ liệu khởi tạo (Admin, Manager, Sale, Rooms, Cards)
│   ├── src/
│   │   ├── common/                  # Hạ tầng dùng chung (Cross-cutting concerns)
│   │   │   ├── config.js            # Đọc biến môi trường (.env)
│   │   │   ├── prisma.js            # Khởi tạo PrismaClient singleton
│   │   │   ├── errors.js            # Định nghĩa bảng mã lỗi chuẩn RFC 7807
│   │   │   └── middlewares/
│   │   │       ├── auth.middleware.js        # Xác thực Token & Inactivity Timeout (30p)
│   │   │       ├── rbac.middleware.js        # Chặn quyền Strict Disjoint RBAC
│   │   │       └── error.middleware.js       # Global Exception Handler
│   │   ├── entrypoints/             # Tầng Route định tuyến HTTP (Express Routers)
│   │   │   ├── auth.routes.js
│   │   │   ├── admin.routes.js
│   │   │   ├── setup.routes.js
│   │   │   ├── public.routes.js
│   │   │   └── operation.routes.js
│   │   ├── controllers/             # Tầng tiếp nhận, validate I/O và điều hướng
│   │   │   ├── auth.controller.js
│   │   │   ├── room.controller.js
│   │   │   ├── booking.controller.js
│   │   │   ├── service.controller.js
│   │   │   ├── checkout.controller.js
│   │   │   └── report.controller.js
│   │   ├── services/                # Tầng Domain Business Logic & Quản lý Transaction
│   │   │   ├── auth.service.js
│   │   │   ├── room.service.js
│   │   │   ├── booking.service.js
│   │   │   ├── payment_simulator.service.js
│   │   │   ├── checkin.service.js
│   │   │   ├── checkout.service.js
│   │   │   └── report.service.js
│   │   └── repositories/            # Tầng Data Access (Prisma Queries & Transactions)
│   │       ├── user.repository.js
│   │       ├── room.repository.js
│   │       ├── booking.repository.js
│   │       ├── payment_account.repository.js
│   │       ├── service_ticket.repository.js
│   │       └── invoice.repository.js
│   ├── tests/                       # Node.js Native Test Suite (node:test)
│   │   └── feat01.test.js
│   └── main.js                      # Entrypoint Express App & Server Listener
├── frontend/                        # React.js Single Page Application (SPA)
│   ├── index.html                   # Entrypoint HTML
│   ├── package.json                 # Vite + React 18 + Tailwind CSS
│   ├── src/
│   │   ├── App.jsx                  # Root React Component & Router
│   │   ├── main.jsx                 # Entrypoint DOM render
│   │   ├── api/                     # Axios/Fetch API clients
│   │   ├── components/              # UI components tái sử dụng
│   │   ├── pages/                   # Các màn hình theo từng vai trò
│   │   │   ├── public/              # Catalog, Search, Cart, Payment, Cancel
│   │   │   ├── manager/             # Setup Rooms, Services, Promotions
│   │   │   ├── sale/                # Bookings, Check-in, Tickets, Check-out, Reports
│   │   │   └── admin/               # User Management
│   │   └── print-templates/         # Giao diện HTML (@media print) cho Ticket & Invoice
└── tests-e2e/                       # Playwright E2E Test Suite
```

---

## 2. Nguyên tắc phụ thuộc đơn hướng (Dependency Invariants)

Hệ thống thiết lập nguyên tắc kiến trúc "Bất biến phụ thuộc" theo 1 chiều duy nhất từ ngoài vào trong:

```text
[HTTP Client / Browser] 
      │
      ▼
[Entrypoints / Express Routes] --> Chỉ định tuyến & gắn Middleware (Auth, RBAC, Timeout)
      │
      ▼
[Controllers / Handlers]       --> Parse payload, validate schema, gọi Service, trả JSON
      │
      ▼
[Domain Services]              --> Nắm giữ 100% Business Rules, tính toán tiền, quản lý Transaction
      │
      ▼
[Repositories / Prisma Client] --> Truy vấn Prisma ORM, thực hiện Pessimistic Locks & Transactions
      │
      ▼
[PostgreSQL Database]          --> Database Tables & Constraints
```

### Các điều cấm tuyệt đối (Strict Prohibitions):
1. **CẤM Tầng Dưới gọi ngược Tầng Trên:** Repository không được import Service; Service không được import Controller; Model không được biết về HTTP.
2. **CẤM Router gọi trực tiếp Repository:** Toàn bộ truy vấn đọc/ghi bắt buộc phải đi qua Domain Service để đảm bảo quy tắc nghiệp vụ không bị phân mảnh.
3. **CẤM Trộn lẫn Ngữ cảnh HTTP vào Service:** Domain Service chỉ nhận các tham số thuần túy (Plain Objects/Primitives) và trả về dữ liệu thuần; tuyệt đối không truyền đối tượng HTTP Context (`req`, `res`) vào tầng Service.

---

## 3. Ranh giới giao dịch & Kiểm soát tranh chấp (Transaction Boundaries & Concurrency Control)

Do hệ thống phục vụ đặt phòng và thanh toán tiền trực tuyến, tranh chấp đồng thời (Race Condition) và đặt trùng phòng (Overbooking) là rủi ro trọng yếu. Mọi luồng nhạy cảm bắt buộc phải được bọc trong một **Prisma Interactive Transaction (`prisma.$transaction`)** với chiến lược **Khóa bản ghi bi quan (Pessimistic Locking - `SELECT ... FOR UPDATE` qua raw query)** hoặc Serializable isolation:

```javascript
await prisma.$transaction(async (tx) => {
  // 1. Khóa tài khoản / phòng vật lý: tx.$queryRaw`SELECT ... FOR UPDATE`
  // 2. Kiểm tra tồn kho hạng phòng / Kiểm tra số dư tài khoản
  // 3. Thực thi trừ tiền / Cập nhật trạng thái / Thêm mới booking
  // 4. Tự động COMMIT (nếu thành công) hoặc ROLLBACK (khi gặp lỗi)
});
```

### Chi tiết 4 luồng nghiệp vụ nhạy cảm:

### Luồng 3.1: Đặt phòng & Trừ số lượng tồn kho hạng phòng (Inventory Allocation)
1. Mở giao dịch: `await prisma.$transaction(async (tx) => { ... })`.
2. Khóa chống tranh chấp hạng phòng: Khóa mức dòng các phòng vật lý thuộc loại và kích cỡ đó:
   ```sql
   SELECT room_id FROM rooms 
   WHERE type = $1 AND size = $2 AND status != 'MAINTENANCE' 
   FOR UPDATE;
   ```
3. Tính toán tồn kho thực tế khả dụng (`AvailableQuota`):
   $$\text{AvailableQuota} = \text{TotalPhysicalRooms} - \text{ActiveBookedRoomsInInterval}$$
4. Nếu $\text{AvailableQuota} < \text{RequestedQuantity}$, ném lỗi `ROOM_QUOTA_EXCEEDED` (rollback ngay lập tức).
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
1. `prisma.$transaction(async (tx) => { ... })`.
2. Khóa dòng đơn đặt phòng:
   ```sql
   SELECT * FROM bookings 
   WHERE booking_number = $1 
   FOR UPDATE;
   ```
3. Kiểm tra điều kiện:
   - Nếu `status != 'CONFIRMED'`, ném lỗi `BOOKING_NOT_CANCELLABLE`.
   - Nếu $\text{fromDate} - \text{now} < 24\text{ hours}$, ném lỗi `CANCELLATION_DEADLINE_EXPIRED`.
4. Tính toán tài chính:
   - $\text{cancellationFee} = \text{prepaidBookingValue} \times 0.20$
   - $\text{refundAmount} = \text{prepaidBookingValue} \times 0.80$
5. Cập nhật booking: `status = 'CANCELLED'`, lưu phí phạt và số tiền hoàn.
6. Hoàn tiền vào tài khoản thanh toán:
   ```sql
   UPDATE payment_accounts 
   SET balance = balance + $1 
   WHERE account_number = $2;
   ```
7. `COMMIT`.

### Luồng 3.3: Check-in & Gán phòng vật lý (Physical Room Assignment)
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
1. Khóa booking: `SELECT * FROM bookings WHERE id = $1 FOR UPDATE`.
2. Tính tổng tiền dịch vụ phát sinh của booking.
3. Tính số tiền còn lại phải thanh toán:
   $$\text{remainingPayable} = (\text{netRoomFee} + \text{extraChildrenFee} + \text{totalServiceFee}) - \text{prepaidBookingValue}$$
4. Tạo bản ghi `Invoice`.
5. Chuyển trạng thái booking sang `CHECKED_OUT`.
6. Cập nhật tất cả các phòng vật lý đã gán của booking về trạng thái `AVAILABLE`.
7. `COMMIT`.

---

## 4. Cơ chế Database Migration & Seed Data

### 4.1. Quy trình chạy Migration & Seed Data
- Đồng bộ cấu trúc Schema sang PostgreSQL: `npx prisma db push`
- Khởi tạo dữ liệu mẫu: `npm run db:seed` (chạy `node prisma/seed.js`)

### 4.2. Danh mục Seed Data chuẩn
1. **3 Tài khoản người dùng phân quyền nghiêm ngặt (Password bcrypt: `Admin@123`, `Manager@123`, `Sale@123`):**
   - `admin` | Vai trò: `ADMIN` | Quản trị người dùng
   - `manager` | Vai trò: `MANAGER` | Cấu hình phòng, dịch vụ, khuyến mãi
   - `sale` | Vai trò: `SALE` | Lễ tân, vận hành, check-in/out, báo cáo
2. **Danh mục phòng vật lý mẫu:**
   - `101`: Loại `VIP`, Cỡ `DOUBLE`, Đơn giá: 1.200.000 VNĐ
   - `102`: Loại `VIP`, Cỡ `SINGLE`, Đơn giá: 800.000 VNĐ
   - `201`: Loại `DELUX`, Cỡ `DOUBLE`, Đơn giá: 1.500.000 VNĐ
   - `202`: Loại `DELUX`, Cỡ `SINGLE`, Đơn giá: 1.000.000 VNĐ
   - `301`: Loại `LIVING_SUITE`, Cỡ `DOUBLE`, Đơn giá: 2.500.000 VNĐ
3. **Danh mục Dịch vụ mẫu:**
   - `SRV-01`: Giặt ủi nhanh | Đơn vị: `Kg` | Giá: 30.000 VNĐ
   - `SRV-02`: Bữa sáng Buffet Quốc tế | Đơn vị: `Suất` | Giá: 150.000 VNĐ
   - `SRV-03`: Massage Spa trị liệu toàn thân | Đơn vị: `Lượt` | Giá: 350.000 VNĐ
   - `SRV-04`: Đưa đón sân bay 4 chỗ | Đơn vị: `Chuyến` | Giá: 250.000 VNĐ
4. **Mã Khuyến mãi mẫu:**
   - `CHAOHET2026`: Giảm 10% (`PERCENTAGE`, value = 10)
   - `SUMMER500K`: Giảm 500.000 VNĐ (`FIXED_AMOUNT`, value = 500000)
5. **Tài khoản Thanh toán Giả lập (Payment Simulator):**
   - Số thẻ: `97040001` | Loại: `ATM` | Chủ thẻ: `NGUYEN VAN A` | Số dư: 50.000.000 VNĐ
   - Số thẻ: `4000123456789010` | Loại: `VISA` | Chủ thẻ: `TRAN THI B` | Số dư: 100.000.000 VNĐ

---

## 5. Chuẩn hóa Xử lý Lỗi (Exception Handling & Error Contract)

Toàn bộ lỗi được bắt tại Middleware tập trung và chuẩn hóa theo chuẩn **RFC 7807 Problem Details**:

```json
{
  "success": false,
  "error": {
    "code": "STRING_IDENTIFIER",
    "message": "Thông điệp mô tả lỗi chi tiết cho người dùng bằng Tiếng Việt.",
    "details": null,
    "timestamp": "2026-10-21T08:00:00.000Z"
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

Khi AI Coding Agent thực thi nhiệm vụ, **BẮT BUỘC** phải tuân theo 7 điều răn kiến trúc sau:
1. **CẤM SỬA DATABASE BỎ QUA PRISMA:** Mọi sửa đổi schema phải được thực hiện trong `backend/prisma/schema.prisma` và đồng bộ qua `npx prisma db push` hoặc `npx prisma migrate dev`.
2. **CẤM VI PHẠM TẦNG THỨ KIẾN TRÚC:** Tuyệt đối không cho phép Router hoặc Controller import Repository hay viết câu lệnh query trực tiếp. Toàn bộ logic nghiệp vụ phải nằm trong `services/`.
3. **CẤM VI PHẠM STRICT DISJOINT RBAC:** Tuyệt đối không thêm quyền kế thừa (Inherited Roles). `ADMIN` chỉ được truy cập `/api/admin/*`; `MANAGER` chỉ được truy cập `/api/setup/*`; `SALE` chỉ được truy cập `/api/operation/*`. Bất kỳ vi phạm nào phải trả về đúng mã `403 Forbidden`.
4. **CẤM BỎ QUA TRANSACTION TRONG LUỒNG THANH TOÁN & GÁN PHÒNG:** Mọi thao tác ghi ảnh hưởng từ 2 bảng trở lên (Đặt phòng + Trừ tiền, Hủy phòng + Hoàn tiền, Check-in + Đổi trạng thái phòng) bắt buộc phải bọc trong `prisma.$transaction()`.
5. **CẤM TỰ Ý CÀI THƯ VIỆN NGOÀI ADR-001:** Sử dụng đúng bộ thư viện Node.js, Express.js, Prisma ORM, React.js đã được phê duyệt.
6. **CẤM BỎ SƠN HỞ TRONG CÔNG THỨC DOANH THU:** Báo cáo doanh thu bắt buộc phải áp dụng đúng công thức:
   $$\text{Doanh thu} = \sum (\text{Hóa đơn Check-out}) + \sum (\text{20\% Phí hủy đơn})$$
7. **BẢO ĐẢM TRẠNG THÁI VERIFICATION TRƯỚC KHI BÀN GIAO:** Agent chỉ được đánh dấu hoàn thành một tính năng khi các lệnh kiểm tra sau đều vượt qua (0 lỗi):
   - `npm run lint`
   - `npm test`
   - `npx prisma validate`