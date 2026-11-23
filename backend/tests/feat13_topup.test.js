import test, { describe, before, after } from "node:test";
import assert from "node:assert/strict";
import http from "node:http";
import { app } from "../src/main.js";
import { prisma } from "../src/common/prisma.js";

describe("FEAT-13.2: Mock Top-up System", () => {
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
      where: { username: { in: ["test_topup_cust1"] } },
    });

    // 4. Đăng ký khách hàng mới
    const regRes = await fetch(`${baseUrl}/api/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        username: "test_topup_cust1",
        password: "Customer@123",
        fullName: "Trần Nạp Tiền Giả Lập",
      }),
    });
    const regData = await regRes.json();
    customerToken = regData.data.token;
    customerUser = regData.data.user;
    customerWallet = regData.data.wallet;
  });

  after(async () => {
    // Dọn dẹp dữ liệu test
    await prisma.user.deleteMany({
      where: { username: { in: ["test_topup_cust1"] } },
    });

    if (server) {
      await new Promise((resolve) => server.close(resolve));
    }
  });

  // -------------------------------------------------------------
  // Test 1: Nạp tiền giả lập thành công lần 1 (+500,000 VND)
  // -------------------------------------------------------------
  test("1. POST /api/wallet/top-up nạp 500.000 VND thành công: Số dư tăng từ 0 lên 500.000 VND, sinh WTX-YYYYMMDD-XXXX (200 OK)", async () => {
    const res = await fetch(`${baseUrl}/api/wallet/top-up`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${customerToken}`,
      },
      body: JSON.stringify({
        amount: 500000,
        paymentMethod: "MOCK_ATM",
        note: "Nạp tiền thử nghiệm 500k",
      }),
    });

    assert.strictEqual(res.status, 200);
    const body = await res.json();
    assert.strictEqual(body.success, true);
    assert.strictEqual(body.data.wallet.balanceBefore, 0);
    assert.strictEqual(body.data.wallet.balanceAfter, 500000);
    assert.strictEqual(body.data.wallet.amountAdded, 500000);

    // Kiểm tra chi tiết giao dịch
    assert.ok(body.data.transaction.transactionNo.startsWith("WTX-"));
    assert.strictEqual(body.data.transaction.type, "TOP_UP_MOCK");
    assert.strictEqual(body.data.transaction.amount, 500000);
    assert.strictEqual(body.data.transaction.balanceBefore, 0);
    assert.strictEqual(body.data.transaction.balanceAfter, 500000);
    assert.strictEqual(body.data.transaction.status, "SUCCESS");
  });

  // -------------------------------------------------------------
  // Test 2: Nạp tiền lần 2 (+200,000 VND) và kiểm tra số dư mới
  // -------------------------------------------------------------
  test("2. Nạp tiếp 200.000 VND: Số dư tăng lên 700.000 VND, kiểm tra /my-wallet khớp chính xác", async () => {
    const res = await fetch(`${baseUrl}/api/wallet/top-up`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${customerToken}`,
      },
      body: JSON.stringify({
        amount: 200000,
        paymentMethod: "MOCK_VISA",
        note: "Nạp thêm 200k",
      }),
    });

    assert.strictEqual(res.status, 200);
    const body = await res.json();
    assert.strictEqual(body.data.wallet.balanceBefore, 500000);
    assert.strictEqual(body.data.wallet.balanceAfter, 700000);

    // Kiểm tra API /my-wallet
    const myWalletRes = await fetch(`${baseUrl}/api/wallet/my-wallet`, {
      headers: { Authorization: `Bearer ${customerToken}` },
    });
    const myWalletBody = await myWalletRes.json();
    assert.strictEqual(myWalletBody.data.balance, 700000);
    assert.strictEqual(myWalletBody.data.recentTransactions.length, 2);
  });

  // -------------------------------------------------------------
  // Test 3: Kiểm tra lịch sử giao dịch nạp tiền (/transactions)
  // -------------------------------------------------------------
  test("3. GET /api/wallet/transactions hiển thị đủ 2 giao dịch nạp tiền theo thứ tự mới nhất (200 OK)", async () => {
    const res = await fetch(`${baseUrl}/api/wallet/transactions`, {
      headers: { Authorization: `Bearer ${customerToken}` },
    });

    assert.strictEqual(res.status, 200);
    const body = await res.json();
    assert.strictEqual(body.data.transactions.length, 2);
    assert.strictEqual(body.data.pagination.total, 2);

    // Giao dịch mới nhất là 200,000 VND
    assert.strictEqual(body.data.transactions[0].amount, 200000);
    assert.strictEqual(body.data.transactions[0].type, "TOP_UP_MOCK");

    // Giao dịch trước đó là 500,000 VND
    assert.strictEqual(body.data.transactions[1].amount, 500000);
    assert.strictEqual(body.data.transactions[1].type, "TOP_UP_MOCK");
  });

  // -------------------------------------------------------------
  // Test 4: Validate số tiền nạp không hợp lệ
  // -------------------------------------------------------------
  test("4. Validate nạp tiền: Chặn số tiền âm, bằng 0, nhỏ hơn 10.000 VND hoặc vượt 500 triệu (400 Bad Request)", async () => {
    // Số tiền < 10.000 VND
    const underMinRes = await fetch(`${baseUrl}/api/wallet/top-up`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${customerToken}`,
      },
      body: JSON.stringify({ amount: 5000 }),
    });
    assert.strictEqual(underMinRes.status, 400);

    // Số tiền âm
    const negativeRes = await fetch(`${baseUrl}/api/wallet/top-up`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${customerToken}`,
      },
      body: JSON.stringify({ amount: -100000 }),
    });
    assert.strictEqual(negativeRes.status, 400);

    // Số tiền vượt 500 triệu
    const overMaxRes = await fetch(`${baseUrl}/api/wallet/top-up`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${customerToken}`,
      },
      body: JSON.stringify({ amount: 600000000 }),
    });
    assert.strictEqual(overMaxRes.status, 400);

    // Không truyền amount
    const noAmountRes = await fetch(`${baseUrl}/api/wallet/top-up`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${customerToken}`,
      },
      body: JSON.stringify({}),
    });
    assert.strictEqual(noAmountRes.status, 400);
  });

  // -------------------------------------------------------------
  // Test 5: Guard Chặn nạp tiền khi ví đang bị khóa (LOCKED)
  // -------------------------------------------------------------
  test("5. Wallet Guard: Chặn nạp tiền khi ví bị khóa LOCKED -> 400 WALLET_LOCKED, mở khóa nạp lại bình thường", async () => {
    // 1. Admin khóa ví
    await fetch(`${baseUrl}/api/wallet/admin/${customerWallet.id}/status`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({ status: "LOCKED" }),
    });

    // 2. Customer thử nạp tiền khi ví bị khóa -> Bị từ chối 400 WALLET_LOCKED
    const lockedTopUpRes = await fetch(`${baseUrl}/api/wallet/top-up`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${customerToken}`,
      },
      body: JSON.stringify({ amount: 50000 }),
    });
    assert.strictEqual(lockedTopUpRes.status, 400);
    const lockedBody = await lockedTopUpRes.json();
    assert.strictEqual(lockedBody.error.code, "WALLET_LOCKED");

    // 3. Admin mở khóa ví trở lại
    await fetch(`${baseUrl}/api/wallet/admin/${customerWallet.id}/status`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({ status: "ACTIVE" }),
    });

    // 4. Nạp tiền lại thành công
    const activeTopUpRes = await fetch(`${baseUrl}/api/wallet/top-up`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${customerToken}`,
      },
      body: JSON.stringify({ amount: 50000 }),
    });
    assert.strictEqual(activeTopUpRes.status, 200);
    const activeBody = await activeTopUpRes.json();
    assert.strictEqual(activeBody.data.wallet.balanceAfter, 750000);
  });

  // -------------------------------------------------------------
  // Test 6: Concurrency & Pessimistic Locking: Nạp tiền đồng thời chống Race Condition
  // -------------------------------------------------------------
  test("6. Pessimistic Locking & Concurrency: 3 requests nạp tiền song song đồng thời đều thành công và số dư cộng dồn chính xác", async () => {
    const currentBalance = 750000;
    const amounts = [100000, 150000, 250000]; // Tổng cộng +500.000 VND
    const expectedFinalBalance = currentBalance + 500000; // = 1.250.000 VND

    // Chạy song song 3 requests
    const promises = amounts.map((amt) =>
      fetch(`${baseUrl}/api/wallet/top-up`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${customerToken}`,
        },
        body: JSON.stringify({
          amount: amt,
          paymentMethod: "MOCK_PARALLEL",
          note: `Nạp song song ${amt}`,
        }),
      }),
    );

    const responses = await Promise.all(promises);

    for (const res of responses) {
      assert.strictEqual(res.status, 200);
      const b = await res.json();
      assert.strictEqual(b.success, true);
    }

    // Kiểm tra số dư cuối cùng
    const finalWalletRes = await fetch(`${baseUrl}/api/wallet/my-wallet`, {
      headers: { Authorization: `Bearer ${customerToken}` },
    });
    const finalWalletBody = await finalWalletRes.json();
    assert.strictEqual(finalWalletBody.data.balance, expectedFinalBalance);
  });

  // -------------------------------------------------------------
  // Test 7: Strict Disjoint RBAC: Không cho phép Admin gọi top-up khách
  // -------------------------------------------------------------
  test("7. Strict Disjoint RBAC: ADMIN gọi /api/wallet/top-up bị từ chối 403 Forbidden", async () => {
    const res = await fetch(`${baseUrl}/api/wallet/top-up`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({ amount: 100000 }),
    });
    assert.strictEqual(res.status, 403);
  });
});
