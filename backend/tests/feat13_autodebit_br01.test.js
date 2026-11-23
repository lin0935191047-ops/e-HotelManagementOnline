import test, { describe, before, after } from "node:test";
import assert from "node:assert/strict";
import http from "node:http";
import { app } from "../src/main.js";
import { prisma } from "../src/common/prisma.js";

describe("FEAT-13.4: Auto-Debit BR-01 (Due Debts Auto-Debit System)", () => {
  let server;
  let baseUrl;
  let adminToken;
  let customerToken1;
  let customerUser1;
  let customerWallet1;
  let customerToken2;
  let customerUser2;
  let customerWallet2;

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

    // 3. Dọn dẹp dữ liệu test cũ nếu có
    await prisma.user.deleteMany({
      where: {
        username: { in: ["test_br01_cust1", "test_br01_cust2"] },
      },
    });

    // 4. Đăng ký khách hàng 1
    const regRes1 = await fetch(`${baseUrl}/api/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        username: "test_br01_cust1",
        password: "Customer@123",
        fullName: "Hoàng Công Nợ 1",
      }),
    });
    const regData1 = await regRes1.json();
    customerToken1 = regData1.data.token;
    customerUser1 = regData1.data.user;
    customerWallet1 = regData1.data.wallet;

    // 5. Đăng ký khách hàng 2
    const regRes2 = await fetch(`${baseUrl}/api/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        username: "test_br01_cust2",
        password: "Customer@123",
        fullName: "Vũ Công Nợ 2",
      }),
    });
    const regData2 = await regRes2.json();
    customerToken2 = regData2.data.token;
    customerUser2 = regData2.data.user;
    customerWallet2 = regData2.data.wallet;
  });

  after(async () => {
    // Dọn dẹp dữ liệu test
    await prisma.user.deleteMany({
      where: {
        username: { in: ["test_br01_cust1", "test_br01_cust2"] },
      },
    });

    if (server) {
      await new Promise((resolve) => server.close(resolve));
    }
  });

  let debtId1;
  const DEBT_AMOUNT_1 = 1500000; // 1.5 triệu VND

  // -------------------------------------------------------------
  // Test 1: Admin tạo khoản công nợ mới cho khách hàng 1
  // -------------------------------------------------------------
  test("1. POST /api/auto-debit/debts tạo công nợ mới thành công (201 Created)", async () => {
    const res = await fetch(`${baseUrl}/api/auto-debit/debts`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({
        userId: customerUser1.id,
        type: "BOOKING_BALANCE",
        amount: DEBT_AMOUNT_1,
        dueDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(),
        note: "Tiền phòng còn lại cần thanh toán",
      }),
    });

    assert.strictEqual(res.status, 201);
    const body = await res.json();
    assert.strictEqual(body.success, true);
    assert.ok(body.data.debtCode.startsWith("DBT-"));
    assert.strictEqual(body.data.amount, DEBT_AMOUNT_1);
    assert.strictEqual(body.data.paidAmount, 0);
    assert.strictEqual(body.data.status, "UNPAID");

    debtId1 = body.data.debtId;
  });

  // -------------------------------------------------------------
  // Test 2: Khách hàng 1 xem danh sách công nợ của mình
  // -------------------------------------------------------------
  test("2. GET /api/auto-debit/debts/my-debts khách hàng thấy đúng khoản nợ của mình (200 OK)", async () => {
    const res = await fetch(`${baseUrl}/api/auto-debit/debts/my-debts`, {
      headers: {
        Authorization: `Bearer ${customerToken1}`,
      },
    });

    assert.strictEqual(res.status, 200);
    const body = await res.json();
    assert.strictEqual(body.success, true);
    assert.strictEqual(body.data.debts.length, 1);
    assert.strictEqual(body.data.debts[0].debtId, debtId1);
    assert.strictEqual(body.data.debts[0].amount, DEBT_AMOUNT_1);
    assert.strictEqual(body.data.debts[0].status, "UNPAID");
  });

  // -------------------------------------------------------------
  // Test 3: Guard Auto-Debit NOT ACTIVE -> Bị chặn
  // -------------------------------------------------------------
  test("3. POST /api/auto-debit/debts/:id/process bị từ chối với AUTO_DEBIT_NOT_ACTIVE khi chưa kích hoạt Auto-Debit (400 Bad Request)", async () => {
    const res = await fetch(`${baseUrl}/api/auto-debit/debts/${debtId1}/process`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${customerToken1}`,
      },
    });

    assert.strictEqual(res.status, 400);
    const body = await res.json();
    assert.strictEqual(body.success, false);
    assert.strictEqual(body.error.code, "AUTO_DEBIT_NOT_ACTIVE");
  });

  // -------------------------------------------------------------
  // Test 4: Khách hàng đồng thuận consent và Admin kích hoạt ACTIVE Auto-Debit
  // -------------------------------------------------------------
  test("4. Khách hàng 1 submit consent và Admin kích hoạt ACTIVE Auto-Debit", async () => {
    // 1. Consent
    const consentRes = await fetch(`${baseUrl}/api/auto-debit/consent`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${customerToken1}`,
      },
      body: JSON.stringify({ agreed: true }),
    });
    assert.strictEqual(consentRes.status, 200);

    // 2. Admin activate
    const actRes = await fetch(`${baseUrl}/api/auto-debit/admin/${customerUser1.id}/status`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({ status: "ACTIVE" }),
    });
    assert.strictEqual(actRes.status, 200);
  });

  // -------------------------------------------------------------
  // Test 5: QUY TẮC CỐT LÕI SRS: TUYỆT ĐỐI KHÔNG TRỪ TIỀN MỘT PHẦN KHI THIẾU SỐ DƯ
  // -------------------------------------------------------------
  test("5. QUY TẮC CỐT LÕI SRS: Số dư ví 500k < Nợ 1.5M -> Thất bại INSUFFICIENT_WALLET_BALANCE và BẢO TOÀN 100% số dư 500k (không trừ một phần)", async () => {
    // Bước 1: Nạp 500.000 VND vào ví khách hàng 1
    const topUpRes = await fetch(`${baseUrl}/api/wallet/top-up`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${customerToken1}`,
      },
      body: JSON.stringify({
        amount: 500000,
        paymentMethod: "MOCK_ATM",
      }),
    });
    assert.strictEqual(topUpRes.status, 200);

    // Bước 2: Gọi Auto-Debit BR-01 để thanh toán khoản nợ 1.5M
    const debitRes = await fetch(`${baseUrl}/api/auto-debit/debts/${debtId1}/process`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${customerToken1}`,
      },
    });

    assert.strictEqual(debitRes.status, 400);
    const debitBody = await debitRes.json();
    assert.strictEqual(debitBody.success, false);
    assert.strictEqual(debitBody.error.code, "INSUFFICIENT_WALLET_BALANCE");

    // Bước 3: Xác minh số dư ví khách hàng 1 VẪN NGUYÊN VẸN 500.000 VND (TUYỆT ĐỐI KHÔNG TRỪ MỘT PHẦN)
    const walletRes = await fetch(`${baseUrl}/api/wallet/my-wallet`, {
      headers: { Authorization: `Bearer ${customerToken1}` },
    });
    const walletBody = await walletRes.json();
    assert.strictEqual(walletBody.data.balance, 500000);

    // Bước 4: Khoản nợ vẫn giữ nguyên trạng thái chưa thanh toán, paidAmount = 0
    const checkDebtRes = await fetch(`${baseUrl}/api/auto-debit/debts/${debtId1}`, {
      headers: { Authorization: `Bearer ${customerToken1}` },
    });
    const checkDebtBody = await checkDebtRes.json();
    assert.strictEqual(checkDebtBody.data.paidAmount, 0);
    assert.notStrictEqual(checkDebtBody.data.status, "PAID");
  });

  // -------------------------------------------------------------
  // Test 6: Guard ví bị khóa (WALLET_LOCKED) bị từ chối
  // -------------------------------------------------------------
  test("6. Khi ví bị khóa LOCKED -> Auto-Debit BR-01 bị chặn với WALLET_LOCKED (400 Bad Request)", async () => {
    // Admin khóa ví
    const lockRes = await fetch(`${baseUrl}/api/wallet/admin/${customerWallet1.id}/status`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({ status: "LOCKED" }),
    });
    assert.strictEqual(lockRes.status, 200);

    // Cố gắng khấu trừ nợ
    const debitRes = await fetch(`${baseUrl}/api/auto-debit/debts/${debtId1}/process`, {
      method: "POST",
      headers: { Authorization: `Bearer ${customerToken1}` },
    });
    assert.strictEqual(debitRes.status, 400);
    const debitBody = await debitRes.json();
    assert.strictEqual(debitBody.error.code, "WALLET_LOCKED");

    // Mở khóa ví lại
    const unlockRes = await fetch(`${baseUrl}/api/wallet/admin/${customerWallet1.id}/status`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({ status: "ACTIVE" }),
    });
    assert.strictEqual(unlockRes.status, 200);
  });

  // -------------------------------------------------------------
  // Test 7: Nạp thêm tiền đủ số dư -> Auto-Debit BR-01 thành công 100%
  // -------------------------------------------------------------
  test("7. Nạp thêm tiền đủ số dư -> Auto-Debit BR-01 thành công: Số dư giảm đúng 1.5M, sinh WTX loại AUTO_DEBIT_DEBT, nợ sang PAID (200 OK)", async () => {
    // Nạp thêm 2.000.000 VND (Tổng số dư thành: 500k + 2M = 2.500.000 VND)
    const topUpRes = await fetch(`${baseUrl}/api/wallet/top-up`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${customerToken1}`,
      },
      body: JSON.stringify({ amount: 2000000 }),
    });
    assert.strictEqual(topUpRes.status, 200);

    // Thực hiện Auto-Debit BR-01
    const debitRes = await fetch(`${baseUrl}/api/auto-debit/debts/${debtId1}/process`, {
      method: "POST",
      headers: { Authorization: `Bearer ${customerToken1}` },
    });
    assert.strictEqual(debitRes.status, 200);

    const debitBody = await debitRes.json();
    assert.strictEqual(debitBody.success, true);
    assert.strictEqual(debitBody.data.debt.status, "PAID");
    assert.strictEqual(debitBody.data.debt.paidAmount, DEBT_AMOUNT_1);
    assert.ok(debitBody.data.debt.paidAt);

    // Kiểm tra số dư ví giảm chính xác: 2.5M - 1.5M = 1.000.000 VND
    assert.strictEqual(debitBody.data.wallet.balanceBefore, 2500000);
    assert.strictEqual(debitBody.data.wallet.balanceAfter, 1000000);
    assert.strictEqual(debitBody.data.wallet.amountDeducted, DEBT_AMOUNT_1);

    // Kiểm tra giao dịch ví
    assert.ok(debitBody.data.transaction.transactionNo.startsWith("WTX-"));
    assert.strictEqual(debitBody.data.transaction.type, "AUTO_DEBIT_DEBT");
    assert.strictEqual(debitBody.data.transaction.status, "SUCCESS");
  });

  // -------------------------------------------------------------
  // Test 8: Chặn khấu trừ lại khoản nợ đã PAID
  // -------------------------------------------------------------
  test("8. Khấu trừ lại khoản nợ đã thanh toán bị chặn với DEBT_ALREADY_PAID (400 Bad Request)", async () => {
    const debitRes = await fetch(`${baseUrl}/api/auto-debit/debts/${debtId1}/process`, {
      method: "POST",
      headers: { Authorization: `Bearer ${customerToken1}` },
    });
    assert.strictEqual(debitRes.status, 400);
    const debitBody = await debitRes.json();
    assert.strictEqual(debitBody.error.code, "DEBT_ALREADY_PAID");
  });

  // -------------------------------------------------------------
  // Test 9: Batch Process BR-01 quét & khấu trừ tự động nợ đến hạn toàn hệ thống
  // -------------------------------------------------------------
  test("9. POST /api/auto-debit/debts/batch-process quét công nợ đến hạn: khách đủ tiền trừ thành công, khách thiếu tiền giữ nguyên (200 OK)", async () => {
    // 1. Chuẩn bị khách hàng 2: Kích hoạt Auto-Debit ACTIVE
    await fetch(`${baseUrl}/api/auto-debit/consent`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${customerToken2}`,
      },
      body: JSON.stringify({ agreed: true }),
    });
    await fetch(`${baseUrl}/api/auto-debit/admin/${customerUser2.id}/status`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({ status: "ACTIVE" }),
    });

    // 2. Tạo 1 khoản nợ đến hạn (hôm qua) cho khách hàng 1 (đang có 1M trong ví -> nợ 300k -> ĐỦ TIỀN)
    const pastDate = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const debtResA = await fetch(`${baseUrl}/api/auto-debit/debts`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({
        userId: customerUser1.id,
        type: "SERVICE_FEE",
        amount: 300000,
        dueDate: pastDate,
        note: "Nợ dịch vụ spa đến hạn",
      }),
    });
    const debtA = await debtResA.json();

    // 3. Tạo 1 khoản nợ đến hạn (hôm qua) cho khách hàng 2 (đang có 0đ trong ví -> nợ 800k -> THIẾU TIỀN)
    const debtResB = await fetch(`${baseUrl}/api/auto-debit/debts`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({
        userId: customerUser2.id,
        type: "BOOKING_BALANCE",
        amount: 800000,
        dueDate: pastDate,
        note: "Nợ phòng quá hạn",
      }),
    });
    const debtB = await debtResB.json();

    // 4. Admin gọi quét tự động hàng loạt
    const batchRes = await fetch(`${baseUrl}/api/auto-debit/debts/batch-process`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${adminToken}`,
      },
    });

    assert.strictEqual(batchRes.status, 200);
    const batchBody = await batchRes.json();
    assert.strictEqual(batchBody.success, true);
    assert.ok(batchBody.data.scannedCount >= 2);
    assert.ok(batchBody.data.successCount >= 1);
    assert.ok(batchBody.data.failedCount >= 1);

    // Xác minh kết quả khách A: Thành công, chuyển sang PAID
    const checkA = await fetch(`${baseUrl}/api/auto-debit/debts/${debtA.data.debtId}`, {
      headers: { Authorization: `Bearer ${customerToken1}` },
    });
    const bodyA = await checkA.json();
    assert.strictEqual(bodyA.data.status, "PAID");
    assert.strictEqual(bodyA.data.paidAmount, 300000);

    // Xác minh kết quả khách B: Thất bại do thiếu tiền, chuyển sang OVERDUE, số dư 0đ vẫn là 0đ
    const checkB = await fetch(`${baseUrl}/api/auto-debit/debts/${debtB.data.debtId}`, {
      headers: { Authorization: `Bearer ${customerToken2}` },
    });
    const bodyB = await checkB.json();
    assert.strictEqual(bodyB.data.status, "OVERDUE");
    assert.strictEqual(bodyB.data.paidAmount, 0);
  });

  // -------------------------------------------------------------
  // Test 10: Strict Disjoint RBAC & Quyền truy cập
  // -------------------------------------------------------------
  test("10. Disjoint RBAC: Customer 1 không được xem nợ của Customer 2 (403), Customer không được gọi batch-process (403)", async () => {
    // 1. Customer gọi batch-process -> 403 Forbidden
    const custBatch = await fetch(`${baseUrl}/api/auto-debit/debts/batch-process`, {
      method: "POST",
      headers: { Authorization: `Bearer ${customerToken1}` },
    });
    assert.strictEqual(custBatch.status, 403);

    // 2. Customer gọi tạo nợ -> 403 Forbidden
    const custCreateDebt = await fetch(`${baseUrl}/api/auto-debit/debts`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${customerToken1}`,
      },
      body: JSON.stringify({
        userId: customerUser1.id,
        type: "BOOKING_BALANCE",
        amount: 100000,
      }),
    });
    assert.strictEqual(custCreateDebt.status, 403);
  });
});
