# Session Progress Log — e-Hotel Project

**Last Updated:** 2026-10-16

## Current State & Project Status
- **Completed Features:** 0 / 12
- **Current Active Feature:** `FEAT-01` (Drizzle Schema & Mock Data Seeding)
- **Last Known Build/Test Status:** Harness verified (Score 100/100). Project ready for initial codebase scaffolding.

## Current Objective
- **Goal:** Khởi tạo kiến trúc mã nguồn Deno 2.x + Drizzle ORM + Hono và hoàn thành tính năng `FEAT-01`.
- **Target Deliverables:** `backend/db/schema.ts`, `backend/db/seed.ts`, migrations, Dockerfile, docker-compose.yml.

## What Was Done (Session History)

### Session 0 (Specification & Harness Standardization)
- Phân tích toàn bộ yêu cầu nghiệp vụ SRS và khóa đặc tả tại [docs/SPEC.md](file:///d:/Phuong_Anh_internship_project/Hotel%20Management%20Online/Hotel%20Management%20Online/docs/SPEC.md).
- Ban hành quyết định kiến trúc [docs/adr/ADR-001-tech-stack-decision.md](file:///d:/Phuong_Anh_internship_project/Hotel%20Management%20Online/Hotel%20Management%20Online/docs/adr/ADR-001-tech-stack-decision.md): Chốt Deno 2.x + Hono + Drizzle ORM + PostgreSQL 16 + React 18 SPA + Docker Compose, loại bỏ hoàn toàn Node.js/npm trên máy host của lập trình viên.
- Ban hành bản thiết kế thi công [ARCHITECHTURE.md](file:///d:/Phuong_Anh_internship_project/Hotel%20Management%20Online/Hotel%20Management%20Online/ARCHITECHTURE.md): Thiết lập Clean Layered Architecture, quy chuẩn Pessimistic Locking (`SELECT FOR UPDATE`), và bảng mã lỗi RFC 7807.
- Chuẩn hóa toàn bộ bộ khung Harness (`AGENTS.md`, `feature_list.json`, `progress.md`, `init.sh`, `session-handoff.md`) bằng `harness-creator`, đạt 100/100 điểm audit.

## Architectural Decisions Locked
1. **Tech Stack:** Deno v2.0+, Hono v4.6+, Drizzle ORM v0.35+, PostgreSQL 16, React v18.3+ SPA (Vite + Tailwind CSS), Docker Compose.
2. **Booking Inventory Model:** Đặt phòng online theo hạng phòng (`type` + `size`) và số lượng (`quantity`). Gán phòng vật lý (`101`, `102`...) chỉ thực hiện khi Check-in có khóa bi quan (`FOR UPDATE`).
3. **Flexible Prepayment:** Hỗ trợ thanh toán 100% hoặc cọc 50%; khấu trừ chính xác `prepaidBookingValue` khi Check-out.
4. **Cancellation Rule:** Hủy trước $\ge 24\text{h}$ so với giờ nhận phòng khi trạng thái là `CONFIRMED`; giữ lại 20% phí hủy, hoàn trả 80% về tài khoản thanh toán giả lập.
5. **Strict Disjoint RBAC:** `ADMIN` (`/admin/*`), `MANAGER` (`/setup/*`), `SALE` (`/operation/*`) tách biệt hoàn toàn; không kế thừa quyền; timeout phiên sau 30 phút không hoạt động.
6. **Revenue Calculation:** Tổng doanh thu = $\sum \text{Hóa đơn Check-out} + \sum \text{20\% Phí hủy đơn}$.

## Files Changed
- [AGENTS.md](file:///d:/Phuong_Anh_internship_project/Hotel%20Management%20Online/Hotel%20Management%20Online/AGENTS.md)
- [feature_list.json](file:///d:/Phuong_Anh_internship_project/Hotel%20Management%20Online/Hotel%20Management%20Online/feature_list.json)
- [progress.md](file:///d:/Phuong_Anh_internship_project/Hotel%20Management%20Online/Hotel%20Management%20Online/progress.md)
- [init.sh](file:///d:/Phuong_Anh_internship_project/Hotel%20Management%20Online/Hotel%20Management%20Online/init.sh)
- [session-handoff.md](file:///d:/Phuong_Anh_internship_project/Hotel%20Management%20Online/Hotel%20Management%20Online/session-handoff.md)

## Blockers / Risks
- Máy host hiện tại cần cài đặt Deno v2.0+ hoặc sử dụng Docker Compose để chạy môi trường container thống nhất.

## Verification Evidence
- Harness validation audit chạy thành công với điểm số 100/100 qua `node .agents/skills/harness-creator/scripts/validate-harness.mjs --target .`.

## Next Session & Next Steps
- **Next Session Startup:** Chạy `./init.sh`, đọc `AGENTS.md` và `session-handoff.md`.
- **Recommended Next Step:** Bắt đầu Session 1 thực hiện tính năng `FEAT-01`: tạo `backend/deno.json`, `backend/db/schema.ts` (10 thực thể), `backend/db/seed.ts` và kiểm tra xác thực.