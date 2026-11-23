import test, { describe, before, after } from "node:test";
import assert from "node:assert/strict";
import http from "node:http";
import { app } from "../src/main.js";
import { prisma } from "../src/common/prisma.js";

describe("FEAT-13.6: Refund Management System (Internal Wallet)", () => {
  let server;
  let baseUrl;
  let adminToken;
  let customerToken;
  let customerUser;
  let customerWallet;
  let targetTx;

  const TOP_UP_AMOUNT = 1000000; // 1M VND
  const DEBT_AMOUNT = 600000;    // 600k VND

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

    // 3. Dọn dẹp dữ liệu test cũ
    await prisma.user.deleteMany({
      where: { username: "test_refund_cust1" },
    });

    // 4. Đăng ký khách hàng mới
    const regRes = await fetch(`${baseUrl}/api/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        username: "test_refund_cust1",
        password: "Customer@123",
        fullName: "Lý Hoàn Tiền",
      }),
    });
    const regData = await regRes.json();
    customerToken = regData.data.token;
    customerUser = regData.data.user;
    customerWallet = regData.data.wallet;

    // 5. Nạp 1.000.000 VND vào ví
    await fetch(`${baseUrl}/api/wallet/top-up`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${customerToken}`,
      },
      body: JSON.stringify({
        amount: TOP_UP_AMOUNT,
        paymentMethod: "MOCK_ATM",
      }),
    });

    // 6. Kích hoạt Auto-Debit ACTIVE cho khách hàng
    await fetch(`${baseUrl}/api/auto-debit/consent`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${customerToken}`,
      },
      body: JSON.stringify({ agreed: true }),
    });

    await fetch(`${baseUrl}/api/auto-debit/admin/${customerUser.id}/status`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({ status: "ACTIVE" }),
    });

    // 7. Tạo một khoản công nợ 600.000 VND và thực hiện Auto-Debit BR-01 để có giao dịch trừ tiền gốc
    const debtRes = await fetch(`${baseUrl}/api/auto-debit/debts`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({
        userId: customerUser.id,
        type: "BOOKING_BALANCE",
        amount: DEBT_AMOUNT,
        note: "Tiền phòng cần thanh toán",
      }),
    });
    const debtData = await debtRes.json();
    const debtId = debtData.data.debtId;

    // Thực thi BR-01 khấu trừ tiền ví
    const debitRes = await fetch(`${baseUrl}/api/auto-debit/debts/${debtId}/process`, {
      method: "POST",
      headers: { Authorization: `Bearer ${customerToken}` },
    });
    const debitData = await debitRes.json();

    // Lấy thông tin giao dịch trừ tiền gốc
    const txRes = await prisma.walletTransaction.findUnique({
      where: { transactionNo: debitData.data.transaction.transactionNo },
    });
    targetTx = txRes;
  });

  after(async () => {
    // Dọn dẹp dữ liệu test
    await prisma.user.deleteMany({
      where: { username: "test_refund_cust1" },
    });

    if (server) {
      await new Promise((resolve) => server.close(resolve));
    }
  });

  // -------------------------------------------------------------
  // Test 1: Tra cứu số tiền tối đa có thể hoàn của giao dịch gốc
  // -------------------------------------------------------------
  test("1. GET /api/wallet/transactions/:txId/refundable: Tra cứu số tiền có thể hoàn chính xác ban đầu (200 OK)", async () => {
    const res = await fetch(`${baseUrl}/api/wallet/transactions/${targetTx.id}/refundable`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });

    assert.strictEqual(res.status, 200);
    const body = await res.json();
    assert.strictEqual(body.success, true);
    assert.strictEqual(body.data.originalAmount, DEBT_AMOUNT);
    assert.strictEqual(body.data.totalRefunded, 0);
    assert.strictEqual(body.data.remainingRefundable, DEBT_AMOUNT);
    assert.strictEqual(body.data.canRefund, true);
  });

  // -------------------------------------------------------------
  // Test 2: Admin hoàn tiền một phần lần 1 (200.000 VND)
  // -------------------------------------------------------------
  test("2. POST /api/wallet/refund hoàn một phần 200k VND: Số dư ví tăng đúng 200k, sinh RFD và WTX REFUND (200 OK)", async () => {
    const res = await fetch(`${baseUrl}/api/wallet/refund`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({
        originalTxId: targetTx.id,
        amount: 200000,
        reason: "Khách hàng khiếu nại chất lượng dịch vụ đêm đầu",
      }),
    });

    assert.strictEqual(res.status, 200);
    const body = await res.json();
    assert.strictEqual(body.success, true);
    assert.ok(body.data.refundCode.startsWith("RFD-"));
    assert.strictEqual(body.data.amount, 200000);
    assert.strictEqual(body.data.approvedBy, "admin");

    // Kiểm tra số dư ví tăng từ 400.000 lên 600.000 VND
    assert.strictEqual(body.data.wallet.balanceBefore, 400000);
    assert.strictEqual(body.data.wallet.balanceAfter, 600000);

    // Kiểm tra giao dịch hoàn tiền
    assert.ok(body.data.transaction.transactionNo.startsWith("WTX-"));
    assert.strictEqual(body.data.transaction.type, "REFUND");

    // Kiểm tra số tiền còn lại có thể hoàn: 600k - 200k = 400k
    assert.strictEqual(body.data.originalTransaction.remainingRefundableAfter, 400000);
  });

  // -------------------------------------------------------------
  // Test 3: Admin hoàn tiền một phần lần 2 (300.000 VND)
  // -------------------------------------------------------------
  test("3. POST /api/wallet/refund hoàn tiếp 300k VND: Số dư ví tăng lên 900k, còn lại có thể hoàn 100k (200 OK)", async () => {
    const res = await fetch(`${baseUrl}/api/wallet/refund`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({
        originalTxId: targetTx.id,
        amount: 300000,
        reason: "Hoàn bù phụ thu thiết bị",
      }),
    });

    assert.strictEqual(res.status, 200);
    const body = await res.json();
    assert.strictEqual(body.data.wallet.balanceBefore, 600000);
    assert.strictEqual(body.data.wallet.balanceAfter, 900000);
    assert.strictEqual(body.data.originalTransaction.remainingRefundableAfter, 100000);
  });

  // -------------------------------------------------------------
  // Test 4: Guard chặn hoàn tiền vượt mức giao dịch gốc
  // -------------------------------------------------------------
  test("4. POST /api/wallet/refund yêu cầu hoàn 200k khi chỉ còn 100k -> Bị từ chối REFUND_INVALID, số dư ví giữ nguyên (400 Bad Request)", async () => {
    const res = await fetch(`${baseUrl}/api/wallet/refund`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({
        originalTxId: targetTx.id,
        amount: 200000,
        reason: "Cố tình hoàn vượt mức còn lại",
      }),
    });

    assert.strictEqual(res.status, 400);
    const body = await res.json();
    assert.strictEqual(body.success, false);
    assert.strictEqual(body.error.code, "REFUND_INVALID");

    // Xác minh số dư ví khách hàng vẫn nguyên vẹn 900.000 VND
    const walletRes = await fetch(`${baseUrl}/api/wallet/my-wallet`, {
      headers: { Authorization: `Bearer ${customerToken}` },
    });
    const walletBody = await walletRes.json();
    assert.strictEqual(walletBody.data.balance, 900000);
  });

  // -------------------------------------------------------------
  // Test 5: Hoàn nốt số tiền còn lại (100.000 VND) thành công 100%
  // -------------------------------------------------------------
  test("5. POST /api/wallet/refund hoàn nốt 100k -> Thành công, số dư đạt 1M, remainingRefundable trở về 0 (200 OK)", async () => {
    const res = await fetch(`${baseUrl}/api/wallet/refund`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({
        originalTxId: targetTx.id,
        amount: 100000,
        reason: "Quyết toán hoàn tiền toàn bộ còn lại",
      }),
    });

    assert.strictEqual(res.status, 200);
    const body = await res.json();
    assert.strictEqual(body.data.wallet.balanceAfter, 1000000);
    assert.strictEqual(body.data.originalTransaction.remainingRefundableAfter, 0);

    // Tra cứu lại: canRefund = false
    const checkRes = await fetch(`${baseUrl}/api/wallet/transactions/${targetTx.id}/refundable`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const checkBody = await checkRes.json();
    assert.strictEqual(checkBody.data.totalRefunded, DEBT_AMOUNT);
    assert.strictEqual(checkBody.data.remainingRefundable, 0);
    assert.strictEqual(checkBody.data.canRefund, false);
  });

  // -------------------------------------------------------------
  // Test 6: Chặn hoàn tiền khi giao dịch gốc đã hoàn 100%
  // -------------------------------------------------------------
  test("6. Hoàn tiền tiếp khi giao dịch đã hoàn 100% bị từ chối REFUND_INVALID (400 Bad Request)", async () => {
    const res = await fetch(`${baseUrl}/api/wallet/refund`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({
        originalTxId: targetTx.id,
        amount: 1000,
        reason: "Cố hoàn thêm",
      }),
    });

    assert.strictEqual(res.status, 400);
    const body = await res.json();
    assert.strictEqual(body.error.code, "REFUND_INVALID");
  });

  // -------------------------------------------------------------
  // Test 7: Guard chặn hoàn tiền cho giao dịch không hợp lệ (ví dụ TOP_UP_MOCK)
  // -------------------------------------------------------------
  test("7. Hoàn tiền cho giao dịch nạp tiền TOP_UP_MOCK bị từ chối REFUND_INVALID (400 Bad Request)", async () => {
    // Tìm giao dịch nạp tiền TOP_UP_MOCK của user
    const topUpTx = await prisma.walletTransaction.findFirst({
      where: {
        walletId: customerWallet.id,
        type: "TOP_UP_MOCK",
      },
    });

    const res = await fetch(`${baseUrl}/api/wallet/refund`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({
        originalTxId: topUpTx.id,
        amount: 50000,
        reason: "Thử hoàn tiền giao dịch nạp",
      }),
    });

    assert.strictEqual(res.status, 400);
    const body = await res.json();
    assert.strictEqual(body.error.code, "REFUND_INVALID");
  });

  // -------------------------------------------------------------
  // Test 8: Guard chặn hoàn tiền khi ví bị khóa LOCKED
  // -------------------------------------------------------------
  test("8. Khi ví khách hàng bị khóa LOCKED -> Hoàn tiền bị chặn với WALLET_LOCKED (400 Bad Request)", async () => {
    // Tạo 1 giao dịch trừ tiền khác để test ví khóa
    const debtRes2 = await fetch(`${baseUrl}/api/auto-debit/debts`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({
        userId: customerUser.id,
        type: "BOOKING_BALANCE",
        amount: 100000,
      }),
    });
    const debt2 = await debtRes2.json();

    const debitRes2 = await fetch(`${baseUrl}/api/auto-debit/debts/${debt2.data.debtId}/process`, {
      method: "POST",
      headers: { Authorization: `Bearer ${customerToken}` },
    });
    const debitData2 = await debitRes2.json();
    const tx2 = await prisma.walletTransaction.findUnique({
      where: { transactionNo: debitData2.data.transaction.transactionNo },
    });

    // Admin khóa ví
    await fetch(`${baseUrl}/api/wallet/admin/${customerWallet.id}/status`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({ status: "LOCKED" }),
    });

    // Cố gắng hoàn tiền vào ví bị khóa
    const refundRes = await fetch(`${baseUrl}/api/wallet/refund`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({
        originalTxId: tx2.id,
        amount: 50000,
        reason: "Hoàn tiền khi ví bị khóa",
      }),
    });

    assert.strictEqual(refundRes.status, 400);
    const refundBody = await refundRes.json();
    assert.strictEqual(refundBody.error.code, "WALLET_LOCKED");

    // Mở khóa ví lại
    await fetch(`${baseUrl}/api/wallet/admin/${customerWallet.id}/status`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({ status: "ACTIVE" }),
    });
  });

  // -------------------------------------------------------------
  // Test 9: Tra cứu lịch sử hoàn tiền (Admin & Customer)
  // -------------------------------------------------------------
  test("9. Tra cứu lịch sử hoàn tiền: Admin xem toàn hệ thống (/refunds/history), Customer xem ví của mình (/my-refunds) (200 OK)", async () => {
    // 1. Admin xem lịch sử
    const adminHistoryRes = await fetch(`${baseUrl}/api/wallet/refunds/history`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    assert.strictEqual(adminHistoryRes.status, 200);
    const adminHistoryBody = await adminHistoryRes.json();
    assert.strictEqual(adminHistoryBody.success, true);
    assert.ok(adminHistoryBody.data.refunds.length >= 3);

    // 2. Customer xem các khoản hoàn vào ví của mình
    const custHistoryRes = await fetch(`${baseUrl}/api/wallet/refunds/my-refunds`, {
      headers: { Authorization: `Bearer ${customerToken}` },
    });
    assert.strictEqual(custHistoryRes.status, 200);
    const custHistoryBody = await custHistoryRes.json();
    assert.strictEqual(custHistoryBody.success, true);
    assert.strictEqual(custHistoryBody.data.refunds.length, 3);
  });

  // -------------------------------------------------------------
  // Test 10: Strict Disjoint RBAC
  // -------------------------------------------------------------
  test("10. Disjoint RBAC: Customer gọi POST /api/wallet/refund hoặc GET /history bị từ chối 403 Forbidden", async () => {
    // Customer gọi hoàn tiền -> 403
    const custRefund = await fetch(`${baseUrl}/api/wallet/refund`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${customerToken}`,
      },
      body: JSON.stringify({
        originalTxId: targetTx.id,
        amount: 10000,
        reason: "Khách tự gọi hoàn tiền",
      }),
    });
    assert.strictEqual(custRefund.status, 403);

    // Customer gọi xem toàn bộ lịch sử -> 403
    const custHistory = await fetch(`${baseUrl}/api/wallet/refunds/history`, {
      headers: { Authorization: `Bearer ${customerToken}` },
    });
    assert.strictEqual(custHistory.status, 403);
  });
});
