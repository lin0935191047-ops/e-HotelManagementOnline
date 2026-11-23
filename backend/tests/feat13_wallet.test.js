import test, { describe, before, after } from "node:test";
import assert from "node:assert/strict";
import http from "node:http";
import { app } from "../src/main.js";
import { prisma } from "../src/common/prisma.js";

describe("FEAT-13.1: Internal Wallet Management", () => {
  let server;
  let baseUrl;
  let adminToken;
  let customerToken;
  let customerUser;
  let customerWallet;

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

    // 3. Xóa dữ liệu test cũ nếu có
    await prisma.user.deleteMany({
      where: { username: { in: ["test_wallet_cust1", "test_wallet_cust2"] } },
    });
  });

  after(async () => {
    // Dọn dẹp dữ liệu test
    await prisma.user.deleteMany({
      where: { username: { in: ["test_wallet_cust1", "test_wallet_cust2"] } },
    });

    if (server) {
      await new Promise((resolve) => server.close(resolve));
    }
  });

  // -------------------------------------------------------------
  // Test 1: Đăng ký tài khoản khách hàng & Tự động tạo ví nội bộ
  // -------------------------------------------------------------
  test("1. POST /api/auth/register đăng ký Customer thành công & tự động tạo ví 0 VND (201 Created)", async () => {
    const res = await fetch(`${baseUrl}/api/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        username: "test_wallet_cust1",
        password: "Customer@123",
        fullName: "Nguyễn Văn Khách Hàng",
      }),
    });

    assert.strictEqual(res.status, 201);
    const body = await res.json();
    assert.strictEqual(body.success, true);
    assert.strictEqual(body.data.user.role, "CUSTOMER");
    assert.ok(body.data.token);

    // Kiểm tra thông tin ví được tự động tạo
    assert.ok(body.data.wallet.walletNumber.startsWith("WAL-"));
    assert.strictEqual(body.data.wallet.currency, "VND");
    assert.strictEqual(body.data.wallet.balance, 0);
    assert.strictEqual(body.data.wallet.status, "ACTIVE");
    assert.strictEqual(body.data.autoDebit.status, "NOT_ENABLED");

    customerToken = body.data.token;
    customerUser = body.data.user;
    customerWallet = body.data.wallet;
  });

  // -------------------------------------------------------------
  // Test 2: Validate khi đăng ký tài khoản khách hàng
  // -------------------------------------------------------------
  test("2. Validate đăng ký: Chặn username trùng và mật khẩu ngắn hơn 6 ký tự (400 Bad Request)", async () => {
    // Thử đăng ký trùng username
    const dupRes = await fetch(`${baseUrl}/api/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        username: "test_wallet_cust1",
        password: "Customer@123",
        fullName: "Khách Trùng Tên",
      }),
    });
    assert.strictEqual(dupRes.status, 400);

    // Thử mật khẩu ngắn < 6 ký tự
    const shortPassRes = await fetch(`${baseUrl}/api/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        username: "test_wallet_cust2",
        password: "123",
        fullName: "Khách Pass Ngắn",
      }),
    });
    assert.strictEqual(shortPassRes.status, 400);
  });

  // -------------------------------------------------------------
  // Test 3: Customer xem thông tin ví của chính mình qua /my-wallet
  // -------------------------------------------------------------
  test("3. GET /api/wallet/my-wallet: Customer xem đúng thông tin ví, số dư 0 VND và trạng thái NOT_ENABLED (200 OK)", async () => {
    const res = await fetch(`${baseUrl}/api/wallet/my-wallet`, {
      headers: { Authorization: `Bearer ${customerToken}` },
    });

    assert.strictEqual(res.status, 200);
    const body = await res.json();
    assert.strictEqual(body.success, true);
    assert.strictEqual(body.data.walletNumber, customerWallet.walletNumber);
    assert.strictEqual(body.data.balance, 0);
    assert.strictEqual(body.data.currency, "VND");
    assert.strictEqual(body.data.status, "ACTIVE");
    assert.strictEqual(body.data.autoDebitStatus, "NOT_ENABLED");
    assert.strictEqual(body.data.totalUnpaidDebt, 0);
    assert.strictEqual(body.data.unpaidDebtsCount, 0);
    assert.strictEqual(body.data.recentTransactions.length, 0);
  });

  // -------------------------------------------------------------
  // Test 4: Strict Disjoint RBAC: Không token -> 401, Sai vai trò -> 403
  // -------------------------------------------------------------
  test("4. Strict Disjoint RBAC: Không truyền Token trả về 401, ADMIN gọi /my-wallet bị từ chối 403", async () => {
    // Không token
    const noTokenRes = await fetch(`${baseUrl}/api/wallet/my-wallet`);
    assert.strictEqual(noTokenRes.status, 401);

    // ADMIN gọi /my-wallet (chỉ dành cho CUSTOMER)
    const adminRes = await fetch(`${baseUrl}/api/wallet/my-wallet`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    assert.strictEqual(adminRes.status, 403);
  });

  // -------------------------------------------------------------
  // Test 5: Customer xem lịch sử giao dịch ví rỗng ban đầu
  // -------------------------------------------------------------
  test("5. GET /api/wallet/transactions: Trả về danh sách giao dịch phân trang rỗng ban đầu (200 OK)", async () => {
    const res = await fetch(`${baseUrl}/api/wallet/transactions?page=1&limit=10`, {
      headers: { Authorization: `Bearer ${customerToken}` },
    });

    assert.strictEqual(res.status, 200);
    const body = await res.json();
    assert.strictEqual(body.success, true);
    assert.strictEqual(body.data.transactions.length, 0);
    assert.strictEqual(body.data.pagination.total, 0);
  });

  // -------------------------------------------------------------
  // Test 6: Admin xem danh sách tất cả ví của khách hàng qua /admin/all
  // -------------------------------------------------------------
  test("6. GET /api/wallet/admin/all: ADMIN xem danh sách tất cả ví của khách hàng thành công (200 OK)", async () => {
    const res = await fetch(`${baseUrl}/api/wallet/admin/all?keyword=test_wallet_cust1`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });

    assert.strictEqual(res.status, 200);
    const body = await res.json();
    assert.strictEqual(body.success, true);
    assert.ok(body.data.wallets.length >= 1);

    const foundWallet = body.data.wallets.find(
      (w) => w.walletNumber === customerWallet.walletNumber,
    );
    assert.ok(foundWallet);
    assert.strictEqual(foundWallet.username, "test_wallet_cust1");
    assert.strictEqual(foundWallet.currency, "VND");
    assert.strictEqual(foundWallet.balance, 0);
  });

  // -------------------------------------------------------------
  // Test 7: CUSTOMER gọi API quản trị của Admin bị chặn 403
  // -------------------------------------------------------------
  test("7. Strict Disjoint RBAC: CUSTOMER gọi /api/wallet/admin/* bị từ chối 403 Forbidden", async () => {
    const res = await fetch(`${baseUrl}/api/wallet/admin/all`, {
      headers: { Authorization: `Bearer ${customerToken}` },
    });
    assert.strictEqual(res.status, 403);
  });

  // -------------------------------------------------------------
  // Test 8: Admin Khóa ví của khách hàng (status = LOCKED)
  // -------------------------------------------------------------
  test("8. PUT /api/wallet/admin/:walletId/status: Admin khóa ví khách hàng thành công (status = LOCKED) (200 OK)", async () => {
    const res = await fetch(`${baseUrl}/api/wallet/admin/${customerWallet.id}/status`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({ status: "LOCKED" }),
    });

    assert.strictEqual(res.status, 200);
    const body = await res.json();
    assert.strictEqual(body.success, true);
    assert.strictEqual(body.data.status, "LOCKED");
    assert.strictEqual(body.data.updatedBy, "admin");

    // Khách kiểm tra lại ví thấy trạng thái LOCKED
    const checkRes = await fetch(`${baseUrl}/api/wallet/my-wallet`, {
      headers: { Authorization: `Bearer ${customerToken}` },
    });
    const checkBody = await checkRes.json();
    assert.strictEqual(checkBody.data.status, "LOCKED");
  });

  // -------------------------------------------------------------
  // Test 9: Admin Mở khóa ví lại (status = ACTIVE)
  // -------------------------------------------------------------
  test("9. PUT /api/wallet/admin/:walletId/status: Admin mở khóa ví trở lại (status = ACTIVE) (200 OK)", async () => {
    const res = await fetch(`${baseUrl}/api/wallet/admin/${customerWallet.id}/status`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({ status: "ACTIVE" }),
    });

    assert.strictEqual(res.status, 200);
    const body = await res.json();
    assert.strictEqual(body.success, true);
    assert.strictEqual(body.data.status, "ACTIVE");
  });

  // -------------------------------------------------------------
  // Test 10: Validate cập nhật trạng thái ví: Sai trạng thái hoặc ID không tồn tại
  // -------------------------------------------------------------
  test("10. Validate Admin cập nhật ví: Trạng thái không hợp lệ trả về 400, ID không tồn tại trả về 404", async () => {
    // Trạng thái sai
    const invalidStatusRes = await fetch(`${baseUrl}/api/wallet/admin/${customerWallet.id}/status`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({ status: "INVALID_STATUS" }),
    });
    assert.strictEqual(invalidStatusRes.status, 400);

    // ID không tồn tại
    const notFoundRes = await fetch(`${baseUrl}/api/wallet/admin/999999/status`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({ status: "LOCKED" }),
    });
    assert.strictEqual(notFoundRes.status, 404);
  });
});
