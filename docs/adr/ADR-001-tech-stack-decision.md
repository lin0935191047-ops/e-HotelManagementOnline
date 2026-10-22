# ADR-001: Quyết định Kiến trúc Công nghệ (Tech Stack Decision)

- **Trạng thái:** Accepted (Cập nhật: Chuyển đổi chính thức sang Node.js + Express.js + Prisma ORM)
- **Ngày cập nhật:** 2026-10-21
- **Người quyết định:** Tech Lead / Developer (Human-in-the-loop)
- **Tài liệu căn cứ:** `docs/SPEC.md`, `Hotel Management & Booking Online System SRS v1.0`

---

## 1. Bối cảnh & Ràng buộc cốt lõi (Context & Constraints)

Hệ thống **e-Hotel** là ứng dụng quản lý và đặt phòng khách sạn trực tuyến phân quyền khép kín. Để triển khai thành công, kiến trúc công nghệ phải thỏa mãn đồng thời các ràng buộc nghiệp vụ và năng lực con người:

1. **Ràng buộc năng lực lập trình viên & Môi trường thực thi (Human-in-the-loop):**
   - Ngôn ngữ sở trường: **JavaScript** (tư duy Fullstack, lập trình giao diện component-based với React.js).
   - **Môi trường Backend:** **Node.js** (v20+ / v24+) kết hợp với **Express.js** và **Prisma ORM** — bộ công cụ chuẩn hóa, phổ biến, ổn định và tài liệu dồi dào nhất trong hệ sinh thái JavaScript.
   - Kiến thức Frontend: **React.js SPA** (Vite + Tailwind CSS).
   - Định hướng hệ thống: **Modular Monolith**, loại trừ hoàn toàn kiến trúc Microservices để tránh phân mảnh vận hành.
2. **Môi trường & Hạ tầng mục tiêu:**
   - Cơ sở dữ liệu: **PostgreSQL 16+**.
   - Môi trường thực thi cục bộ: **Docker & Docker Compose** (chạy toàn bộ hệ thống bằng 1 lệnh duy nhất) hoặc chạy trực tiếp trên máy host qua `npm`.
   - Chiến lược UI: **Decoupled REST API (Express) + React SPA (Vite)**.
3. **Yêu cầu phi chức năng (NFRs & Concurrency):**
   - Kiểm soát phiên làm việc nghiêm ngặt: Tự động hết hạn phiên sau **30 phút** không tương tác.
   - Phân quyền độc lập tuyệt đối (**Strict Disjoint RBAC**): Chặn chéo quyền giữa `ADMIN`, `MANAGER` và `SALE`.
   - Chống tranh chấp đặt trùng phòng (Overbooking) và gian lận hoàn tiền kép (Double Refund) thông qua giao dịch Database Prisma Interactive Transaction (`prisma.$transaction`) và khóa bi quan (**Pessimistic Locking - `SELECT FOR UPDATE`** qua `$queryRaw` hoặc Serializable isolation).
   - In ấn phiếu dịch vụ, hóa đơn qua giao diện HTML chuẩn in (`window.print()`) và xuất báo cáo doanh thu ra file Excel/PDF.

---

## 2. Quyết định (Decision)

Lựa chọn bộ công nghệ: **Node.js (JavaScript ES Modules) + Express.js + Prisma ORM + PostgreSQL 16 + React.js SPA (Vite)**:
- **Ở Backend:** Node.js v24 với ES Modules (`type: "module"` trong `package.json`), sử dụng Express.js làm REST API framework, Prisma ORM quản lý schema và quan hệ 10 thực thể, driver kết nối PostgreSQL.
- **Ở Frontend (React SPA):** React 18+ SPA được xây dựng bằng Vite, Tailwind CSS và Lucide Icons, giao tiếp với Backend qua REST API chuẩn JSON.

---

## 3. Trọn bộ Tooling chuẩn hóa (Detailed Tooling Specification)

| Thành phần kỹ thuật | Công nghệ & Phiên bản cố định | Mục đích & Đặc tả kỹ thuật |
| :--- | :--- | :--- |
| **Ngôn ngữ & Runtime** | **JavaScript (ES2024 - ES Modules)** chạy trên **Node.js v20+ / v24+** | Đảm bảo tính nhất quán của hệ sinh thái JavaScript, cú pháp hiện đại `import`/`export`. |
| **Backend Framework** | **Express.js v4.21+** | Web framework phổ biến nhất của Node.js, routing rõ ràng, middleware hỗ trợ CORS, JWT Auth, Timeout, Error Handling. |
| **ORM & Database Driver** | **Prisma ORM v6.x** (`@prisma/client` & `prisma`) | Type-safe ORM declarative qua `schema.prisma`, hỗ trợ quan hệ, migrations và Interactive Transactions. |
| **Database Migration** | **Prisma CLI (`npx prisma db push` / `migrate`)** | Quản lý schema declaratively, đồng bộ cấu trúc bảng và ràng buộc khóa ngoại vào PostgreSQL. |
| **Frontend Framework** | **React.js v18.3.x (SPA)** | Single Page Application sử dụng Functional Components, React Hooks (`useState`, `useEffect`, `useContext`), JSX. |
| **CSS System & UI** | **Tailwind CSS v3.4.x** + Lucide Icons | Utility-first CSS, hỗ trợ class `@media print` cho các biểu mẫu in hóa đơn và phiếu dịch vụ. |
| **Build Tool (Frontend)** | **Vite v5.4.x** | Biên dịch React JSX, Hot Module Replacement (HMR) cực nhanh, xuất file tĩnh HTML/JS/CSS. |
| **Production Web Server** | **Nginx Alpine (v1.27.x)** | Đóng gói trong container `frontend`, phục vụ file tĩnh React SPA và làm Reverse Proxy định tuyến `/api/*`. |
| **Database Engine** | **PostgreSQL v16+ / v18+** | Cơ sở dữ liệu quan hệ, hỗ trợ ACID transactions và Row-level locking. |
| **Unit & Integration Test** | **Node.js Native Test Runner (`node:test`, `node:assert`)** | Chạy kiểm thử tự động cực nhanh qua `npm test`, không cần cài thêm runner cồng kềnh. |

---

## 4. Hệ quả Kiến trúc (Consequences)

1. **Tính tương thích cao:** Node.js, Express.js và React.js là stack tiêu chuẩn trong mọi trường học, doanh nghiệp và tài liệu hướng dẫn lập trình web.
2. **Quản lý dữ liệu trực quan:** `schema.prisma` mang lại mô hình quan hệ trực quan, có thể kiểm tra dữ liệu bằng Prisma Studio (`npx prisma studio`).
3. **Độ an toàn giao dịch:** Mọi logic trừ tồn kho phòng, hủy đơn, hoàn tiền được bảo vệ bằng giao dịch ACID trong `prisma.$transaction`.