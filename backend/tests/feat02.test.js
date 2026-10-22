import test, { describe, before, after } from "node:test";
import assert from "node:assert/strict";
import http from "node:http";
import { app } from "../src/main.js";
import { prisma } from "../src/common/prisma.js";

describe("FEAT-02: Authentication, 30-Min Inactivity Timeout & Strict Disjoint RBAC", () => {
  let server;
  let baseUrl;
  let adminToken;
  let managerToken;
  let saleToken;

  before(async () => {
    // 1. Khởi động HTTP server test trên port ngẫu nhiên
    server = http.createServer(app);
    await new Promise((resolve) => {
      server.listen(0, "127.0.0.1", () => {
        const address = server.address();
        baseUrl = `http://127.0.0.1:${address.port}`;
        resolve();
      });
    });

    // 2. Lấy token đăng nhập cho cả 3 vai trò
    const adminRes = await fetch(`${baseUrl}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username: "admin", password: "Admin@123" }),
    });
    const adminData = await adminRes.json();
    adminToken = adminData.data.token;

    const managerRes = await fetch(`${baseUrl}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username: "manager", password: "Manager@123" }),
    });
    const managerData = await managerRes.json();
    managerToken = managerData.data.token;

    const saleRes = await fetch(`${baseUrl}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username: "sale", password: "Sale@123" }),
    });
    const saleData = await saleRes.json();
    saleToken = saleData.data.token;
  });

  after(async () => {
    await new Promise((resolve) => server.close(resolve));
    await prisma.$disconnect();
  });

  // -------------------------------------------------------------
  // Test 1: Khách hàng truy cập cổng công khai không cần đăng nhập
  // -------------------------------------------------------------
  test("1. Khách hàng truy cập trang đặt phòng không cần login (200 OK)", async () => {
    const res = await fetch(`${baseUrl}/api/public/rooms`);
    assert.strictEqual(res.status, 200);
    const body = await res.json();
    assert.strictEqual(body.success, true);
    assert.ok(Array.isArray(body.data), "Phải trả về danh sách phòng");

    const pingRes = await fetch(`${baseUrl}/api/public/ping`);
    assert.strictEqual(pingRes.status, 200);
  });

  // -------------------------------------------------------------
  // Test 2: Đăng nhập với thông tin không hợp lệ
  // -------------------------------------------------------------
  test("2. Đăng nhập sai mật khẩu trả về 401 Unauthorized", async () => {
    const res = await fetch(`${baseUrl}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username: "admin", password: "WrongPassword" }),
    });
    assert.strictEqual(res.status, 401);
    const body = await res.json();
    assert.strictEqual(body.success, false);
    assert.strictEqual(body.error.code, "UNAUTHORIZED");
  });

  test("3. Đăng nhập thiếu thông tin trả về 400 Bad Request", async () => {
    const res = await fetch(`${baseUrl}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username: "admin" }),
    });
    assert.strictEqual(res.status, 400);
    const body = await res.json();
    assert.strictEqual(body.error.code, "VALIDATION_FAILED");
  });

  // -------------------------------------------------------------
  // Test 3: Ma trận phân quyền độc lập tuyệt đối (Strict Disjoint RBAC)
  // -------------------------------------------------------------
  test("4. ADMIN gọi /api/admin/ping thành công (200 OK)", async () => {
    const res = await fetch(`${baseUrl}/api/admin/ping`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    assert.strictEqual(res.status, 200);
    const body = await res.json();
    assert.strictEqual(body.module, "admin");
  });

  test("5. ADMIN gọi /api/setup hoặc /api/operation bị từ chối (403 Forbidden)", async () => {
    // Admin gọi Setup (vốn chỉ dành cho MANAGER)
    const setupRes = await fetch(`${baseUrl}/api/setup/ping`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    assert.strictEqual(setupRes.status, 403);
    const setupBody = await setupRes.json();
    assert.strictEqual(setupBody.error.code, "FORBIDDEN_ACCESS");

    // Admin gọi Operation (vốn chỉ dành cho SALE)
    const opRes = await fetch(`${baseUrl}/api/operation/ping`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    assert.strictEqual(opRes.status, 403);
    const opBody = await opRes.json();
    assert.strictEqual(opBody.error.code, "FORBIDDEN_ACCESS");
  });

  test("6. MANAGER gọi /api/setup/ping thành công (200 OK), gọi /api/admin hoặc /api/operation bị 403", async () => {
    // Manager gọi Setup
    const setupRes = await fetch(`${baseUrl}/api/setup/ping`, {
      headers: { Authorization: `Bearer ${managerToken}` },
    });
    assert.strictEqual(setupRes.status, 200);

    // Manager gọi Admin
    const adminRes = await fetch(`${baseUrl}/api/admin/ping`, {
      headers: { Authorization: `Bearer ${managerToken}` },
    });
    assert.strictEqual(adminRes.status, 403);

    // Manager gọi Operation
    const opRes = await fetch(`${baseUrl}/api/operation/ping`, {
      headers: { Authorization: `Bearer ${managerToken}` },
    });
    assert.strictEqual(opRes.status, 403);
  });

  test("7. SALE gọi /api/operation/ping thành công (200 OK), gọi /api/admin hoặc /api/setup bị 403", async () => {
    // Sale gọi Operation
    const opRes = await fetch(`${baseUrl}/api/operation/ping`, {
      headers: { Authorization: `Bearer ${saleToken}` },
    });
    assert.strictEqual(opRes.status, 200);

    // Sale gọi Admin
    const adminRes = await fetch(`${baseUrl}/api/admin/ping`, {
      headers: { Authorization: `Bearer ${saleToken}` },
    });
    assert.strictEqual(adminRes.status, 403);

    // Sale gọi Setup
    const setupRes = await fetch(`${baseUrl}/api/setup/ping`, {
      headers: { Authorization: `Bearer ${saleToken}` },
    });
    assert.strictEqual(setupRes.status, 403);
  });

  // -------------------------------------------------------------
  // Test 4: Tự động hết hạn phiên sau 30 phút không hoạt động
  // -------------------------------------------------------------
  test("8. Phiên có lastActiveAt > 30 phút trước bị trả về 401 Unauthorized", async () => {
    // Giả lập người dùng 'admin' không tương tác trong 35 phút (quá mốc 30 phút)
    const thirtyFiveMinutesAgo = new Date(Date.now() - 35 * 60 * 1000);
    await prisma.user.update({
      where: { username: "admin" },
      data: { lastActiveAt: thirtyFiveMinutesAgo },
    });

    // Thực hiện request có token cũ của admin
    const res = await fetch(`${baseUrl}/api/admin/ping`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    assert.strictEqual(res.status, 401);
    const body = await res.json();
    assert.strictEqual(body.success, false);
    assert.strictEqual(body.error.code, "UNAUTHORIZED");
    assert.match(body.error.message, /30 phút/);

    // Phục hồi lại lastActiveAt cho admin để không ảnh hưởng kiểm thử khác
    await prisma.user.update({
      where: { username: "admin" },
      data: { lastActiveAt: new Date() },
    });
  });

  // -------------------------------------------------------------
  // Test 5: Không truyền token hoặc token rác bị từ chối
  // -------------------------------------------------------------
  test("9. Không truyền Token hoặc token sai định dạng trả về 401 Unauthorized", async () => {
    const noTokenRes = await fetch(`${baseUrl}/api/admin/ping`);
    assert.strictEqual(noTokenRes.status, 401);

    const badTokenRes = await fetch(`${baseUrl}/api/admin/ping`, {
      headers: { Authorization: "Bearer fake.jwt.token" },
    });
    assert.strictEqual(badTokenRes.status, 401);
  });
});
