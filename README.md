# 🏨 e-Hotel — Hệ Thống Quản Lý & Đặt Phòng Khách Sạn Trực Tuyến

> **Hệ thống Quản lý và Đặt phòng Khách sạn Trực tuyến Toàn diện (Hotel Management & Online Booking System)**  
> Được xây dựng theo kiến trúc đa tầng hiện đại (**Clean Layered Architecture**), tuân thủ phân quyền độc lập nghiêm ngặt (**Strict Disjoint RBAC**), kiểm soát tương tranh khóa bi quan (**Pessimistic Concurrency Control**), tích hợp đầy đủ 12 module nghiệp vụ và đạt độ phủ kiểm thử tự động 100% (**130/130 Unit & Integration Tests PASS**).

---

## 📑 Mục Lục
1. [Giới Thiệu Tổng Quan](#-giới-thiệu-tổng-quan)
2. [Công Nghệ Sử Dụng (Tech Stack)](#-công-nghệ-sử-dụng-tech-stack)
3. [Kiến Trúc & Quy Tắc Thiết Kế Cốt Lõi](#-kiến-trúc--quy-tắc-thiết-kế-cốt-lõi)
4. [Danh Sách Tính Năng Nghiệp Vụ (12 Features)](#-danh-sách-tính-năng-nghiệp-vụ-12-features)
5. [Cấu Trúc Thư Mục Dự Án](#-cấu-trúc-thư-mục-dự-án)
6. [Hướng Dẫn Cài Đặt & Khởi Chạy](#-hướng-dẫn-cài-đặt--khởi-chạy)
7. [Tài Khoản & Dữ Liệu Mẫu Thử Nghiệm](#-tài-khoản--dữ-liệu-mẫu-thử-nghiệm)
8. [Kiểm Thử & Đảm Bảo Chất Lượng](#-kiểm-thử--đảm-bảo-chất-lượng)

---

## 🌟 Giới Thiệu Tổng Quan

**e-Hotel** là giải pháp phần mềm quản trị khách sạn toàn diện hỗ trợ đầy đủ vòng đời lưu trú:
- **Khách hàng trực tuyến:** Tra cứu phòng trống theo khoảng thời gian thực, đặt nhiều phòng trong một giỏ hàng, thanh toán linh hoạt (100% hoặc cọc 50%), tra cứu và tự hủy đơn nhận hoàn tiền 80% theo luật 24 giờ.
- **Lễ tân & Vận hành (Sale):** Quản lý đơn, làm thủ tục Check-in gán phòng vật lý chống trùng lặp, tự động tính phụ thu trẻ em quá quy định, lập và in phiếu dịch vụ phát sinh, quyết toán trả phòng (Check-out) xuất hóa đơn in ấn và báo cáo doanh thu kèm xuất file Excel/PDF.
- **Quản lý khách sạn (Manager):** Quản lý danh mục phòng vật lý kèm cơ chế bảo vệ xóa an toàn (Booking Deletion Guard), bảng giá dịch vụ bổ sung và mã khuyến mãi giảm giá.
- **Quản trị hệ thống (Admin):** Quản lý tài khoản nhân viên, phân quyền hạn độc lập tuyệt đối, chống tự xóa hoặc hạ quyền chính mình.

---

## 🛠 Công Nghệ Sử Dụng (Tech Stack)

### Backend
- **Nền tảng Runtime:** Node.js (v20+ / v24+ LTS), JavaScript ES Modules (`"type": "module"`).
- **Web Framework:** Express.js v4.21+.
- **Database & ORM:** PostgreSQL 16+ kết hợp **Prisma ORM** (`@prisma/client` & `prisma` v6.x).
- **Bảo mật & Xác thực:** `jsonwebtoken` (JWT), `bcryptjs` (Hash mật khẩu).
- **Kết xuất Báo cáo:** `exceljs` (Tạo file bảng tính Excel `.xlsx`), `pdfkit` (Tạo tài liệu in ấn PDF `.pdf`).
- **Kiểm thử tự động:** Node.js Native Test Runner (`node --test`).

### Frontend
- **Framework SPA:** React.js v18.3+ Single Page Application.
- **Build Tool:** Vite v5.4+ (Build siêu tốc, tối ưu hóa bundle).
- **Giao diện & Styling:** Tailwind CSS v3.4+, Modern White Luxury Theme (Nền trắng tinh tế, điểm nhấn Indigo chàm sang trọng).
- **Bộ Icon:** `lucide-react`.

---

## 🏛 Kiến Trúc & Quy Tắc Thiết Kế Cốt Lõi

1. **Phân Quyền Độc Lập Nghiêm Ngặt (Strict Disjoint RBAC):**
   - Phân chia 3 vai trò nội bộ hoàn toàn tách biệt:
     - `ADMIN`: Chỉ có quyền truy cập `/admin/*` và `/api/admin/*`.
     - `MANAGER`: Chỉ có quyền truy cập `/setup/*` và `/api/setup/*`.
     - `SALE`: Chỉ có quyền truy cập `/operation/*` và `/api/operation/*`.
   - **Tuyệt đối không có sự kế thừa quyền:** Admin không thể can thiệp dữ liệu Manager/Sale; Sale không thể truy cập cấu hình hệ thống.
   - **Tự động hết hạn phiên (30-Minute Inactivity Timeout):** Phiên làm việc tự động thu hồi nếu người dùng không có hoạt động trong 30 phút (`now - lastActiveAt > 30 minutes`).

2. **Kiểm Soát Tương Tranh Khóa Bi Quan (Pessimistic Concurrency Control):**
   - Toàn bộ các luồng giao dịch nhạy cảm (Đặt phòng, Hủy phòng hoàn tiền, Check-in gán phòng, Check-out hóa đơn) đều được bọc trong `prisma.$transaction()` và sử dụng khóa bi quan **`SELECT ... FOR UPDATE`**.
   - Ngăn chặn hoàn toàn các lỗi xung đột dữ liệu:
     - Chống bán vượt tồn kho phòng (**Overbooking Guard**).
     - Chống gán trùng phòng vật lý (**Double Room Assignment Guard**).
     - Chống hoàn tiền hai lần (**Double Refund Guard**).
     - Chống thanh toán/trả phòng lặp lại (**Double Checkout Guard**).

3. **Công Thức Tồn Kho Giao Thoa Thời Gian (Availability Intersection Formula):**
   - Hai khoảng thời gian lưu trú giao nhau khi và chỉ khi:
     $$\text{existing.fromDate} < \text{search.toDate} \land \text{existing.toDate} > \text{search.fromDate}$$
   - Tồn kho phòng khả dụng:
     $$\text{AvailableQuota} = \text{TotalPhysicalRooms} - \text{BookedRooms (CONFIRMED + CHECKED\_IN)}$$

4. **Chính Sách Hủy Đơn & Hoàn Tiền (SPEC 4.3):**
   - Cho phép hủy phòng tự động khi đơn ở trạng thái `CONFIRMED` và thời điểm hủy cách giờ nhận phòng tối thiểu 24 giờ.
   - Khách sạn giữ lại **20%** phí phạt hủy, hệ thống tự động hoàn **80%** số tiền đã trả vào tài khoản thẻ gốc và ngay lập tức giải phóng tồn kho phòng.

5. **Công Thức Doanh Thu Chuẩn (SPEC 4.5):**
   - Doanh thu thực tế được tính toán chuẩn xác theo công thức:
     $$\text{Total Revenue} = \sum_{\text{Checked-out}} \text{Invoice.totalInvoiceAmount} + \sum_{\text{Cancelled}} \text{Booking.cancellationFee}$$

6. **Cơ Chế Bảo Vệ Xóa Dữ Liệu An Toàn (Deletion Guards):**
   - Chặn xóa Phòng vật lý (`ROOM_CANNOT_BE_DELETED`), Dịch vụ (`SERVICE_CANNOT_BE_DELETED`), Khuyến mãi (`PROMOTION_CANNOT_BE_DELETED`) nếu đã từng phát sinh liên kết với bất kỳ đơn đặt phòng hoặc phiếu sử dụng nào.

7. **Chuẩn Hóa Mã Lỗi RFC 7807 (Problem Details for HTTP APIs):**
   - Mọi phản hồi lỗi đều có cấu trúc nhất quán: `{ type, title, status, detail, instance }`.

---

## 📋 Danh Sách Tính Năng Nghiệp Vụ (12 Features)

| Mã Tính Năng | Tên Tính Năng | Mô Tả & Nghiệp Vụ Cốt Lõi |
|---|---|---|
| **FEAT-01** | **Prisma Schema & Mock Data Seeding** | 10 bảng cơ sở dữ liệu trên PostgreSQL với quan hệ chặt chẽ; kịch bản gieo dữ liệu mẫu ban đầu: 3 tài khoản nội bộ, 2 thẻ ngân hàng giả lập, phòng mẫu, dịch vụ, khuyến mãi. |
| **FEAT-02** | **Authentication, 30-Min Session Timeout & Strict Disjoint RBAC** | Đăng nhập JWT, kiểm soát thời gian nhàn rỗi 30 phút, middleware RBAC độc lập tuyệt đối giữa ADMIN, MANAGER và SALE. |
| **FEAT-03** | **User Management (Admin Role)** | Quản lý người dùng nội bộ, CRUD tài khoản, mã hóa mật khẩu bcrypt, bảo vệ Admin không tự xóa hoặc hạ quyền chính mình. |
| **FEAT-04** | **Setup Rooms with Booking Deletion Guard** | Quản lý phòng vật lý (VIP/STANDARD, SINGLE/DOUBLE), quản lý ảnh, kiểm tra ràng buộc Booking Deletion Guard trước khi xóa. |
| **FEAT-05** | **Setup Services & Promotion Management** | Quản lý danh mục dịch vụ (giặt ủi, minibar, ăn sáng...) kèm Service Usage Guard; quản lý mã coupon theo % hoặc số tiền cố định kèm Promotion Guard. |
| **FEAT-06** | **Room Catalog & Inventory Availability Search** | Cổng tra cứu phòng khách hàng: tính toán tồn kho phòng trống theo khoảng ngày nhận/trả phòng, lọc theo loại phòng, hiển thị số phòng còn lại. |
| **FEAT-07** | **Shopping Cart, Customer Form, Promotion & Payment Simulator** | Giỏ hàng đa phòng, áp dụng mã giảm giá, tùy chọn thanh toán 100% hoặc cọc 50%, giả lập trừ tiền tài khoản thẻ với khóa `FOR UPDATE`. |
| **FEAT-08** | **Check & Cancel Booking (24h Rule & 80/20 Refund)** | Tra cứu chi tiết đơn đặt phòng bằng mã đơn; hủy phòng trực tuyến hoàn 80% về tài khoản trước 24h, giải phóng tồn kho phòng trống. |
| **FEAT-09** | **Booking Management & Check-in (Physical Room Assignment)** | Tra cứu danh sách đơn lễ tân; gán phòng vật lý với khóa bi quan chống gán trùng phòng; tự động tính phụ thu trẻ em khi vượt sức chứa phòng. |
| **FEAT-10** | **Use Services & HTML Ticket Printing** | Đăng ký dịch vụ cho các phòng đang lưu trú (`OCCUPIED`), sinh mã phiếu `TK-YYYYMMDD-XXXX`, xem và in phiếu dịch vụ chuẩn khổ A4/A5. |
| **FEAT-11** | **Check-out, Invoice Calculation & HTML Invoice Printing** | Trả phòng và quyết toán tự động: khấu trừ tiền cọc, thu phần còn lại, chuyển trạng thái `CHECKED_OUT`, trả phòng về `AVAILABLE`, in hóa đơn `INV-YYYYMMDD-XXXX`. |
| **FEAT-12** | **Revenue Report & Excel/PDF Export** | Thống kê doanh thu thực tế theo công thức chuẩn SPEC 4.5; kết xuất báo cáo bảng tính Excel (`.xlsx`) và tài liệu in ấn PDF (`.pdf`) kèm 3 chữ ký chức danh. |

---

## 📂 Cấu Trúc Thư Mục Dự Án

```text
Hotel Management Online/
├── backend/                             # Backend API (Node.js + Express + Prisma)
│   ├── prisma/
│   │   ├── schema.prisma                # Schema định nghĩa 10 thực thể cơ sở dữ liệu
│   │   └── seed.js                      # Kịch bản gieo dữ liệu khởi tạo
│   ├── src/
│   │   ├── common/                      # Tiện ích dùng chung, lỗi RFC 7807, Prisma client
│   │   │   ├── middlewares/             # Auth, RBAC, Error middlewares
│   │   │   ├── errors.js
│   │   │   └── prisma.js
│   │   ├── controllers/                 # REST Controllers tiếp nhận request HTTP
│   │   ├── services/                    # Domain Services chứa 100% nghiệp vụ & transactions
│   │   ├── entrypoints/                 # Express Routers phân chia theo vai trò
│   │   └── main.js                      # Server Entrypoint khởi chạy Express
│   ├── tests/                           # 13 suites kiểm thử tích hợp (130 tests)
│   └── package.json
│
├── frontend/                            # Frontend SPA (React.js + Vite + Tailwind CSS)
│   ├── src/
│   │   ├── api/                         # HTTP Client kết nối API backend & quản lý Token
│   │   ├── pages/
│   │   │   ├── admin/                   # Giao diện Quản trị viên (UserManagement)
│   │   │   ├── manager/                 # Giao diện Quản lý (RoomSetup, ServiceSetup, PromoSetup)
│   │   │   ├── operation/               # Giao diện Lễ tân (SaleOperation, CheckinModal)
│   │   │   ├── customer/                # Giao diện Khách hàng (RoomCatalog, Checkout, Lookup)
│   │   │   └── Login.jsx                # Giao diện Đăng nhập kèm 1-Click Fast Login
│   │   ├── App.jsx                      # Navigation, Layout, Header & Footer
│   │   └── index.css                    # Design Tokens & White Luxury Styling
│   └── package.json
│
├── docs/                                # Tài liệu kỹ thuật đặc tả & thiết kế
│   ├── SPEC.md                          # Tài liệu đặc tả yêu cầu nghiệp vụ (SRS)
│   └── adr/                             # Architectural Decision Records
├── ARCHITECHTURE.md                     # Bản thiết kế kiến trúc thi công chi tiết
├── feature_list.json                    # Theo dõi trạng thái nghiệm thu 12 tính năng
├── progress.md                          # Nhật ký tiến độ toàn bộ phiên làm việc
├── session-handoff.md                   # Biên bản bàn giao trạng thái hệ thống
├── init.ps1                             # Script khởi động & kiểm tra môi trường trên Windows
└── init.sh                              # Script khởi động & kiểm tra môi trường trên Linux/macOS
```

---

## 🚀 Hướng Dẫn Cài Đặt & Khởi Chạy

### 1. Yêu Cầu Môi Trường (Prerequisites)
- **Node.js:** Phiên bản `v20.x` hoặc `v24.x` trở lên (Khuyến nghị `v24.x LTS`).
- **npm:** Phiên bản `10.x` trở lên.
- **PostgreSQL:** Phiên bản `16` hoặc `18` đang chạy trên máy cục bộ (cổng mặc định `5432`).

---

### 2. Cấu Hình Biến Môi Trường (.env)

Tạo tệp `.env` tại thư mục gốc hoặc trong thư mục `backend/` với nội dung mẫu:

```env
PORT=3000

DB_HOST=localhost
DB_PORT=5432
DB_NAME=ehotel
DB_USER=postgres
DB_PASSWORD=Postgres@123
DATABASE_URL=postgres://postgres:Postgres@123@localhost:5432/ehotel

JWT_SECRET=super_secret_jwt_key_ehotel_2026
SESSION_TIMEOUT_MINUTES=30
```

> **Lưu ý:** Vui lòng điều chỉnh `DB_USER` và `DB_PASSWORD` tương ứng với tài khoản PostgreSQL của bạn.

---

### 3. Cài Đặt & Khởi Chạy Backend

Mở cửa sổ dòng lệnh tại thư mục `backend/`:

```bash
# 1. Di chuyển vào thư mục backend
cd backend

# 2. Cài đặt các thư viện phụ thuộc
npm install

# 3. Đồng bộ hóa Schema vào cơ sở dữ liệu PostgreSQL
npx prisma db push

# 4. Gieo dữ liệu mẫu ban đầu (Tài khoản, phòng mẫu, thẻ thanh toán, dịch vụ)
npm run db:seed

# 5. Khởi chạy máy chủ Backend API (chế độ watch tự động reload khi sửa code)
npm run dev
```

Máy chủ Backend sẽ lắng nghe tại: `http://localhost:3000`  
Kiểm tra tình trạng hệ thống: `http://localhost:3000/api/health` (Trả về `{ status: "healthy", database: "connected" }`).

---

### 4. Cài Đặt & Khởi Chạy Frontend

Mở cửa sổ dòng lệnh thứ hai tại thư mục `frontend/`:

```bash
# 1. Di chuyển vào thư mục frontend
cd frontend

# 2. Cài đặt các gói thư viện
npm install

# 3. Khởi chạy ứng dụng React SPA qua Vite
npm run dev
```

Giao diện ứng dụng sẽ mở tại: `http://localhost:5173` (Vite tự động cấu hình proxy chuyển tiếp các request `/api/*` về `http://localhost:3000`).

---

### 5. Khởi Động Nhanh Với Script Kiểm Tra Tự Động

Bạn có thể chạy script kiểm tra toàn bộ môi trường, kết nối database và chạy trọn bộ kiểm thử:
- **Trên Windows (PowerShell):**
  ```powershell
  powershell -ExecutionPolicy Bypass -File .\init.ps1
  ```
- **Trên Linux / macOS (Bash):**
  ```bash
  chmod +x init.sh
  ./init.sh
  ```

---

## 👤 Tài Khoản & Dữ Liệu Mẫu Thử Nghiệm

Hệ thống đã chuẩn bị sẵn bộ dữ liệu khởi tạo để thử nghiệm ngay lập tức mà không cần nhập liệu thủ công:

### 1. Tài Khoản Đăng Nhập Nội Bộ
Giao diện đăng nhập (`http://localhost:5173/login`) có sẵn các nút **1-Click Fast Login** tự động điền tài khoản:

| Vai Trò (Role) | Tên Đăng Nhập | Mật Khẩu | Quyền Hạn Truy Cập |
|---|---|---|---|
| **Quản trị viên (ADMIN)** | `admin` | `Admin@123` | `/admin/*` — Quản lý tài khoản người dùng, phân quyền |
| **Quản lý khách sạn (MANAGER)** | `manager` | `Manager@123` | `/setup/*` — Cấu hình phòng, dịch vụ, khuyến mãi |
| **Lễ tân & Bán hàng (SALE)** | `sale` | `Sale@123` | `/operation/*` — Quản lý đơn, Check-in, Dịch vụ, Check-out, Báo cáo |

### 2. Thẻ Thanh Toán Giả Lập Trực Tuyến
Dùng để thanh toán khi đặt phòng trên Cổng Khách Hàng:

| Loại Thẻ | Số Tài Khoản Thẻ | Chủ Tài Khoản | Số Dư Ban Đầu |
|---|---|---|---|
| **ATM Nội Địa** | `97040001` | NGUYEN VAN A | 50.000.000 VNĐ |
| **Thẻ Quốc Tế VISA** | `4000123456789010` | TRAN THI B | 100.000.000 VNĐ |

### 3. Mã Khuyến Mãi Mẫu
- `SUMMER2026`: Giảm **10%** tổng tiền phòng.
- `WELCOME50K`: Giảm trực tiếp **50.000 VNĐ**.

---

## 🧪 Kiểm Thử & Đảm Bảo Chất Lượng

Hệ thống được kiểm thử tự động toàn diện qua bộ 13 test suites chạy trên Node.js Native Test Runner (`node --test`), đảm bảo 100% tính nguyên vẹn của nghiệp vụ:

```bash
# Chạy toàn bộ 130 bài kiểm thử tích hợp backend
cd backend && npm test

# Kiểm tra cú pháp và chất lượng mã nguồn
cd backend && npm run lint

# Xác thực tính hợp lệ của cấu trúc Prisma Schema
cd backend && npx prisma validate

# Kiểm tra đóng gói build ứng dụng Frontend SPA
cd frontend && npm run build
```

### Kết Quả Nghiệm Thu (Test Coverage Summary)
```text
✔ API Express Routes (Healthcheck & Metadata)
✔ FEAT-01: Prisma Schema & Mock Data Verification
✔ FEAT-02: Authentication, 30-Min Session Timeout & Strict Disjoint RBAC
✔ FEAT-03: User Management (Admin Role & Self-Delete Guard)
✔ FEAT-04: Setup Rooms with Booking Deletion Guard
✔ FEAT-05: Setup Services & Promotion Management
✔ FEAT-06: Room Catalog & Inventory-based Availability Search
✔ FEAT-07: Shopping Cart, Customer Form, Promotion & Payment Simulator
✔ FEAT-08: Check & Cancel Booking (24h Rule & 80/20 Refund)
✔ FEAT-09: Booking Management & Check-in (Physical Room Assignment & Child Surcharge)
✔ FEAT-10: Use Services & HTML Ticket Printing
✔ FEAT-11: Check-out, Invoice Calculation & HTML Invoice Printing
✔ FEAT-12: Revenue Report & Excel/PDF Export

ℹ tests 130
ℹ suites 13
ℹ pass 130
ℹ fail 0
ℹ cancelled 0
ℹ skipped 0
```

---

## 📜 Giấy Phép & Bản Quyền
Dự án được xây dựng phục vụ mục đích thực tập và phát triển hệ thống quản trị khách sạn hiện đại. Mọi quy tắc nghiệp vụ tuân thủ đặc tả kỹ thuật chuẩn tại [docs/SPEC.md](docs/SPEC.md) và thiết kế tại [ARCHITECHTURE.md](ARCHITECHTURE.md).

