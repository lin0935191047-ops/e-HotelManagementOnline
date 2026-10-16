# ADR-001: Quyết định Kiến trúc Công nghệ (Tech Stack Decision)

- **Trạng thái:** Accepted (Đã phê duyệt)
- **Ngày quyết định:** 2026-10-16
- **Người quyết định:** Tech Lead / Senior Software Analyst & Developer (Human-in-the-loop)
- **Tài liệu căn cứ:** `docs/SPEC.md`, `Hotel Management & Booking Online System SRS v1.0`

---

## 1. Bối cảnh & Ràng buộc cốt lõi (Context & Constraints)

Hệ thống **e-Hotel** là ứng dụng quản lý và đặt phòng khách sạn trực tuyến phân quyền khép kín[cite: 2, 7]. Để triển khai thành công, kiến trúc công nghệ phải thỏa mãn đồng thời các ràng buộc nghiệp vụ và năng lực con người:

1. **Ràng buộc năng lực lập trình viên (Human-in-the-loop):**
   - Ngôn ngữ sở trường: **JavaScript** (tư duy Fullstack, lập trình giao diện component-based).
   - **Vùng cấm nghiêm ngặt:** Không có kinh nghiệm và không muốn sử dụng hệ sinh thái **Node.js/npm** trên máy phát triển (tránh gánh nặng quản lý `node_modules`, xung đột phụ thuộc npm, lỗ hổng bảo mật package và cấu hình build-tool phức tạp).
   - Kiến thức Frontend: Đã quen thuộc với **React SPA**, không có kinh nghiệm về Vue 3.
   - Định hướng hệ thống: **Modular Monolith**, loại trừ hoàn toàn kiến trúc Microservices để tránh phân mảnh vận hành.
2. **Môi trường & Hạ tầng mục tiêu:**
   - Cơ sở dữ liệu: **PostgreSQL 16**.
   - Môi trường thực thi cục bộ: **Docker & Docker Compose** (chạy toàn bộ hệ thống bằng 1 lệnh duy nhất).
   - Chiến lược UI: **Decoupled REST API + SPA**.
3. **Yêu cầu phi chức năng (NFRs & Concurrency):**
   - Kiểm soát phiên làm việc nghiêm ngặt: Tự động hết hạn phiên sau **30 phút** không tương tác[cite: 2, 7].
   - Phân quyền độc lập tuyệt đối (**Strict Disjoint RBAC**): Chặn chéo quyền giữa `ADMIN`, `MANAGER` và `SALE`[cite: 2, 7].
   - Chống tranh chấp đặt trùng phòng (Overbooking) và gian lận hoàn tiền kép (Double Refund) thông qua giao dịch Database và khóa bi quan (**Pessimistic Locking - `SELECT FOR UPDATE`**)[cite: 2].
   - In ấn phiếu dịch vụ, hóa đơn qua giao diện HTML chuẩn in (`window.print()`) và xuất báo cáo doanh thu ra file Excel/PDF[cite: 2, 7].

---

## 2. Quyết định (Decision)

Lựa chọn **Phương án A cải tiến**: Sử dụng **Deno 2.x** làm runtime thống nhất cho Backend REST API và xây dựng Frontend bằng **React SPA**, đóng gói toàn bộ quy trình phát triển và triển khai trong **Docker Compose**.

### Giải pháp hóa giải vùng cấm "Không dùng Node.js/npm":
- **Ở Backend:** Deno 2.x tích hợp sẵn runtime, linter (`deno lint`), formatter (`deno fmt`), test runner (`deno test`), và package manager hiện đại qua JSR/URL imports. Nhà phát triển viết JavaScript/TypeScript mà không cần cài Node.js hay npm lên máy host.
- **Ở Frontend (React SPA):** Quá trình build và quản lý gói của React được đóng gói **100% bên trong Docker container (Multi-stage build)** hoặc ủy quyền hoàn toàn cho **Deno 2 Task Runner** (`deno run -A npm:vite`). Lập trình viên chỉ cần chỉnh sửa code JSX/CSS thuần túy trên máy host; toàn bộ việc biên dịch, bundle và tối ưu hóa tài nguyên do Docker/Nginx đảm nhiệm.

---

## 3. Trọn bộ Tooling chuẩn hóa (Detailed Tooling Specification)

| Thành phần kỹ thuật | Công nghệ & Phiên bản cố định | Mục đích & Đặc tả kỹ thuật |
| :--- | :--- | :--- |
| **Ngôn ngữ & Runtime** | **JavaScript (ES2024) / TypeScript 5.6** chạy trên **Deno v2.0.4** | Đảm bảo tính nhất quán của hệ sinh thái JavaScript, tuân thủ 100% Web Standards (`fetch`, `Request`, `Response`, `Web Crypto`). |
| **Backend Framework** | **Hono v4.6.x** trên `Deno.serve` | Web framework siêu nhẹ, định tuyến nhanh, hỗ trợ đầy đủ Middleware (CORS, JWT Auth, Timeout, Error Handling) không phụ thuộc API Node.js. |
| **ORM & Database Driver** | **Drizzle ORM v0.35.x** + Driver **`postgres` (porsager/postgres v3.4.x)** | Type-safe SQL toolkit, hỗ trợ raw queries hiệu năng cao và câu lệnh khóa bi quan `FOR UPDATE` trong giao dịch ACID. |
| **Database Migration** | **Drizzle Kit v0.26.x** | Quản lý schema declaratively, sinh và áp dụng các file SQL migration thông qua `deno task db:migrate`. |
| **Frontend Framework** | **React v18.3.x (SPA)** | Single Page Application sử dụng Functional Components, React Hooks (`useState`, `useEffect`, `useContext`), JSX. |
| **CSS System & UI** | **Tailwind CSS v3.4.x** + Lucide Icons | Utility-first CSS, hỗ trợ class `@media print` cho các biểu mẫu in hóa đơn và phiếu dịch vụ. |
| **Build Tool (Frontend)** | **Vite v5.4.x** (Chạy bên trong Docker Build Stage) | Biên dịch React JSX, Hot Module Replacement (HMR) cực nhanh, xuất file tĩnh HTML/JS/CSS cho Nginx. |
| **Production Web Server** | **Nginx Alpine (v1.27.x)** | Đóng gói trong container `frontend`, phục vụ file tĩnh React SPA và làm Reverse Proxy định tuyến `/api/*` về backend API. |
| **Database Engine** | **PostgreSQL v16-alpine** | Cơ sở dữ liệu quan hệ, hỗ trợ ACID transactions và Row-level locking. |
| **Unit & Integration Test** | **`deno test`** | Test runner tích hợp sẵn của Deno, kiểm thử các thuật toán tính tiền, tồn kho phòng, xác thực JWT và logic nghiệp vụ. |
| **End-to-End (E2E) Test** | **Playwright v1.48.x** | Đóng gói trong container test riêng biệt, kiểm thử tự động toàn bộ luồng người dùng từ UI đến Database. |
| **Static Analysis** | **`deno lint`**, **`deno fmt`**, **`deno check`** | Công cụ kiểm tra cú pháp, định dạng và kiểm tra kiểu dữ liệu tĩnh tích hợp sẵn, tốc độ mili-giây. |

---

## 4. So sánh Đánh đổi Kiến trúc (Trade-off Analysis)

| Tiêu chí | Phương án A (Deno 2.x + Hono + React SPA) [ĐÃ CHỌN] | Phương án B (FastAPI + React SPA) |
| :--- | :--- | :--- |
| **Phù hợp năng lực Dev** | ⭐⭐⭐⭐⭐ **Tối ưu tuyệt đối:** Dev chỉ sử dụng duy nhất JavaScript/JSX cho cả 2 tầng Backend & Frontend[cite: 2]. | ⭐⭐⭐ **Trung bình:** Dev phải học thêm cú pháp Python và tư duy backend của FastAPI/SQLAlchemy. |
| **Khử bỏ Node.js/npm** | ⭐⭐⭐⭐⭐ **Triệt để 100%:** Deno thay thế hoàn toàn Node.js ở backend. React build khép kín trong Docker. | ⭐⭐⭐⭐ **Tốt:** Backend dùng Python/uv. Frontend vẫn cần Docker để cô lập môi trường build React. |
| **Xử lý Tranh chấp (Locks)** | ⭐⭐⭐⭐⭐ **Rất mạnh:** Drizzle + `postgres.js` hỗ trợ transaction context và `SELECT FOR UPDATE` trực tiếp[cite: 2]. | ⭐⭐⭐⭐⭐ **Rất mạnh:** SQLAlchemy Async Session hỗ trợ `with_for_update()` hoàn hảo. |
| **Tốc độ Khởi động Local** | ⭐⭐⭐⭐⭐ **Cực nhanh:** 1 binary Deno duy nhất, container khởi động dưới 1 giây. | ⭐⭐⭐⭐ Khởi động nhanh qua Python `uv` virtualenv. |
| **Hỗ trợ AI Coding Agent** | ⭐⭐⭐⭐ Hono, Drizzle và React có tài liệu chuẩn, Agent sinh code chính xác, dễ kiểm soát. | ⭐⭐⭐⭐⭐ FastAPI + Pydantic + React là bộ stack có dữ liệu huấn luyện dồi dào nhất của AI. |

---

## 5. Hệ quả Kiến trúc (Consequences)

### 5.1. Mặt tích cực (Positive Impacts)
1. **Tối ưu hóa năng suất lập trình:** Lập trình viên làm việc trên ngôn ngữ quen thuộc nhất (JavaScript) và thư viện UI đã nắm vững (React) mà không tốn thời gian làm quen với cú pháp mới (Vue 3 hay Python)[cite: 2].
2. **Sạch sẽ môi trường máy chủ phát triển:** Máy tính của lập trình viên không cần cài đặt Node.js, không có thư mục `node_modules` rác trên host; mọi quy trình phụ thuộc được cô lập hoàn toàn qua Docker.
3. **Toàn vẹn dữ liệu tài chính:** Kiểm soát được 100% rủi ro đặt trùng phòng và thất thoát doanh thu thông qua transaction có khóa bi quan (`FOR UPDATE`)[cite: 2].
4. **Triển khai nhất quán:** Đảm bảo "chạy được trên máy dev là chạy được trên production" nhờ Docker Compose chuẩn hóa.

### 5.2. Thách thức kỹ thuật & Biện pháp kiểm soát (Mitigations)
1. **Cơ chế Hot-Reload của React khi dev:**
   - *Biện pháp:* Cung cấp cấu hình volume mount trong `docker-compose.override.yml` để khi sửa code file `.jsx`, Vite development server trong Docker phản ánh ngay lập tức ra trình duyệt.
2. **Sự khác biệt module trong Deno 2:**
   - *Biện pháp:* Khóa cố định cấu hình import trong `backend/deno.json`, sử dụng định dạng chuẩn JSR (`jsr:@hono/hono`) và URL imports để đảm bảo reproducibility.
3. **Bảo mật phiên đăng nhập 30 phút:**
   - *Biện pháp:* Triển khai Middleware kiểm tra trường `lastActiveAt` trên token/DB ở mọi request API; phía React SPA thiết lập bộ đếm thời gian tự động xóa token và redirect về `/login` khi người dùng không thao tác sau 30 phút[cite: 2, 7].