import test, { describe, before, after } from "node:test";
import assert from "node:assert/strict";
import http from "node:http";
import { app } from "../src/main.js";
import { prisma } from "../src/common/prisma.js";

describe("FEAT-03: User Management (Admin Role)", () => {
  let server;
  let baseUrl;
  let adminToken;
  let adminId;
  let managerToken;
  let createdUserId;

  before(async () => {
    // 1. Khởi động HTTP server test
    server = http.createServer(app);
    await new Promise((resolve) => {
      server.listen(0, "127.0.0.1", () => {
        const address = server.address();
        baseUrl = `http://127.0.0.1:${address.port}`;
        resolve();
      });
    });

    // 2. Lấy token Admin
    const adminRes = await fetch(`${baseUrl}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username: "admin", password: "Admin@123" }),
    });
    const adminData = await adminRes.json();
    adminToken = adminData.data.token;
    adminId = adminData.data.user.id;

    // 3. Lấy token Manager
    const managerRes = await fetch(`${baseUrl}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username: "manager", password: "Manager@123" }),
    });
    const managerData = await managerRes.json();
    managerToken = managerData.data.token;
  });

  after(async () => {
    // Dọn dẹp tài khoản test nếu còn sót
    await prisma.user.deleteMany({
      where: { username: { in: ["testuser", "testduplicate"] } },
    });
    await new Promise((resolve) => server.close(resolve));
    await prisma.$disconnect();
  });

  // -------------------------------------------------------------
  // Test 1: Lấy danh sách người dùng
  // -------------------------------------------------------------
  test("1. GET /api/admin/users trả về danh sách người dùng và không chứa passwordHash", async () => {
    const res = await fetch(`${baseUrl}/api/admin/users`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    assert.strictEqual(res.status, 200);
    const body = await res.json();
    assert.strictEqual(body.success, true);
    assert.ok(Array.isArray(body.data), "data phải là mảng");
    assert.ok(body.data.length >= 3, "Phải có ít nhất 3 user ban đầu");

    // Kiểm tra bảo mật: Không được để lộ trường passwordHash
    for (const u of body.data) {
      assert.strictEqual(u.passwordHash, undefined, "Không được lộ passwordHash");
      assert.ok(u.id, "Phải có id");
      assert.ok(u.username, "Phải có username");
      assert.ok(u.role, "Phải có role");
    }
  });

  // -------------------------------------------------------------
  // Test 2: Thêm mới người dùng thành công
  // -------------------------------------------------------------
  test("2. POST /api/admin/users tạo người dùng mới thành công (201 Created)", async () => {
    const res = await fetch(`${baseUrl}/api/admin/users`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${adminToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        username: "testuser",
        password: "Password@123",
        fullName: "Nhân viên Kiểm thử",
        role: "SALE",
        isActive: true,
      }),
    });
    assert.strictEqual(res.status, 201);
    const body = await res.json();
    assert.strictEqual(body.success, true);
    assert.strictEqual(body.data.username, "testuser");
    assert.strictEqual(body.data.role, "SALE");
    createdUserId = body.data.id;
  });

  // -------------------------------------------------------------
  // Test 3: Validate không cho phép tạo trùng username
  // -------------------------------------------------------------
  test("3. Validate không cho phép tạo trùng username (400 Bad Request)", async () => {
    const res = await fetch(`${baseUrl}/api/admin/users`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${adminToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        username: "testuser", // Trùng với user vừa tạo
        password: "NewPassword@123",
        fullName: "Người dùng Trùng Lặp",
        role: "MANAGER",
      }),
    });
    assert.strictEqual(res.status, 400);
    const body = await res.json();
    assert.strictEqual(body.success, false);
    assert.strictEqual(body.error.code, "VALIDATION_FAILED");
    assert.match(body.error.message, /đã tồn tại/);
  });

  // -------------------------------------------------------------
  // Test 4: Validate vai trò không hợp lệ & mật khẩu quá ngắn
  // -------------------------------------------------------------
  test("4. Validate vai trò không hợp lệ trả về 400", async () => {
    const res = await fetch(`${baseUrl}/api/admin/users`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${adminToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        username: "invalidrole",
        password: "Password@123",
        fullName: "Test Role",
        role: "SUPER_ADMIN", // Không thuộc ADMIN, MANAGER, SALE
      }),
    });
    assert.strictEqual(res.status, 400);
    const body = await res.json();
    assert.strictEqual(body.error.code, "VALIDATION_FAILED");
  });

  test("5. Validate mật khẩu ngắn hơn 6 ký tự trả về 400", async () => {
    const res = await fetch(`${baseUrl}/api/admin/users`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${adminToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        username: "shortpass",
        password: "123",
        fullName: "Test Short Pass",
        role: "SALE",
      }),
    });
    assert.strictEqual(res.status, 400);
  });

  // -------------------------------------------------------------
  // Test 5: Xem chi tiết & Cập nhật người dùng
  // -------------------------------------------------------------
  test("6. GET /api/admin/users/:id xem chi tiết người dùng", async () => {
    const res = await fetch(`${baseUrl}/api/admin/users/${createdUserId}`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    assert.strictEqual(res.status, 200);
    const body = await res.json();
    assert.strictEqual(body.data.id, createdUserId);
    assert.strictEqual(body.data.username, "testuser");
  });

  test("7. PUT /api/admin/users/:id cập nhật họ tên, đổi vai trò", async () => {
    const res = await fetch(`${baseUrl}/api/admin/users/${createdUserId}`, {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${adminToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        fullName: "Nhân viên Đã Cập Nhật",
        role: "MANAGER",
        isActive: true,
      }),
    });
    assert.strictEqual(res.status, 200);
    const body = await res.json();
    assert.strictEqual(body.data.fullName, "Nhân viên Đã Cập Nhật");
    assert.strictEqual(body.data.role, "MANAGER");
  });

  // -------------------------------------------------------------
  // Test 6: Bảo vệ Admin không tự xóa tài khoản của chính mình
  // -------------------------------------------------------------
  test("8. Admin không thể tự xóa tài khoản của chính mình (400 Bad Request)", async () => {
    const res = await fetch(`${baseUrl}/api/admin/users/${adminId}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    assert.strictEqual(res.status, 400);
    const body = await res.json();
    assert.match(body.error.message, /Không thể xóa tài khoản của chính bạn/);
  });

  // -------------------------------------------------------------
  // Test 7: Xóa người dùng hợp lệ
  // -------------------------------------------------------------
  test("9. DELETE /api/admin/users/:id xóa tài khoản khác thành công", async () => {
    const res = await fetch(`${baseUrl}/api/admin/users/${createdUserId}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    assert.strictEqual(res.status, 200);
    const body = await res.json();
    assert.strictEqual(body.success, true);

    // Xác nhận đã biến mất khỏi Database
    const checkRes = await fetch(`${baseUrl}/api/admin/users/${createdUserId}`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    assert.strictEqual(checkRes.status, 404);
  });

  // -------------------------------------------------------------
  // Test 8: Vai trò khác (MANAGER, SALE) không được gọi API quản lý người dùng
  // -------------------------------------------------------------
  test("10. MANAGER gọi /api/admin/users bị từ chối 403 Forbidden", async () => {
    const res = await fetch(`${baseUrl}/api/admin/users`, {
      headers: { Authorization: `Bearer ${managerToken}` },
    });
    assert.strictEqual(res.status, 403);
  });
});
