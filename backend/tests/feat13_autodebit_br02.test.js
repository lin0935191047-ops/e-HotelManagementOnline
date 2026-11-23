import test, { describe, before, after } from "node:test";
import assert from "node:assert/strict";
import http from "node:http";
import { app } from "../src/main.js";
import { prisma } from "../src/common/prisma.js";

describe("FEAT-13.5: Auto-Debit BR-02 (Completed Service Auto-Debit)", () => {
  let server;
  let baseUrl;
  let adminToken;
  let saleToken;
  let customerToken;
  let customerUser;
  let customerWallet;

  const testRoomId = "BR02-ROOM-101";
  const testServiceId = "BR02-SRV-MASSAGE";
  const SERVICE_PRICE = 300000; // 300k VND
  let testBooking;

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

    // 3. Lấy token Sale
    const saleRes = await fetch(`${baseUrl}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username: "sale", password: "Sale@123" }),
    });
    const saleData = await saleRes.json();
    saleToken = saleData.data.token;

    // 4. Dọn dẹp dữ liệu test cũ
    await prisma.serviceUsage.deleteMany({
      where: { roomId: testRoomId },
    });
    await prisma.debt.deleteMany({
      where: { user: { username: "test_br02_cust1" } },
    });
    await prisma.user.deleteMany({
      where: { username: "test_br02_cust1" },
    });
    await prisma.stayingGuest.deleteMany({
      where: { roomAssignment: { roomId: testRoomId } },
    });
    await prisma.roomAssignment.deleteMany({
      where: { roomId: testRoomId },
    });
    await prisma.bookingItem.deleteMany({
      where: { booking: { customerPhone: "0909999888" } },
    });
    await prisma.booking.deleteMany({
      where: { customerPhone: "0909999888" },
    });
    await prisma.room.deleteMany({
      where: { roomId: testRoomId },
    });
    await prisma.service.deleteMany({
      where: { serviceId: testServiceId },
    });

    // 5. Tạo phòng test và đặt trạng thái OCCUPIED
    await prisma.room.create({
      data: {
        roomId: testRoomId,
        type: "VIP",
        size: "SINGLE",
        price: 1500000,
        maxAdults: 2,
        maxChildren: 1,
        extraChildFee: 150000,
        status: "OCCUPIED",
        description: "Phòng phục vụ test BR-02",
      },
    });

    // 6. Tạo dịch vụ test
    await prisma.service.create({
      data: {
        serviceId: testServiceId,
        serviceName: "Massage Trị Liệu Vai Gáy",
        description: "Dịch vụ massage cổ truyền",
        unit: "Suất",
        price: SERVICE_PRICE,
      },
    });

    // 7. Đăng ký khách hàng thành viên có ví
    const regRes = await fetch(`${baseUrl}/api/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        username: "test_br02_cust1",
        password: "Customer@123",
        fullName: "Đinh Dịch Vụ Auto-Debit",
      }),
    });
    const regData = await regRes.json();
    customerToken = regData.data.token;
    customerUser = regData.data.user;
    customerWallet = regData.data.wallet;

    // 8. Tạo Booking gắn với customerId và gán phòng OCCUPIED
    testBooking = await prisma.booking.create({
      data: {
        bookingNumber: "BK-BR02-TEST-001",
        customerName: "Đinh Dịch Vụ Auto-Debit",
        customerPhone: "0909999888",
        customerEmail: "dinh_br02@ehotel.test",
        customerCccd: "012345678999",
        fromDate: new Date(),
        toDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000),
        totalRoomFee: 3000000,
        netRoomFee: 3000000,
        paymentOption: "FULL_100",
        prepaidBookingValue: 3000000,
        paymentAccountNumber: "ATM-TEST",
        status: "CHECKED_IN",
        customerId: customerUser.id,
      },
    });

    // Tạo RoomAssignment đang ở (checkOutAt = null)
    const assignment = await prisma.roomAssignment.create({
      data: {
        bookingId: testBooking.id,
        roomId: testRoomId,
        checkInAt: new Date(),
      },
    });

    // Gán StayingGuest
    await prisma.stayingGuest.create({
      data: {
        bookingId: testBooking.id,
        roomAssignmentId: assignment.id,
        fullName: "Đinh Dịch Vụ Auto-Debit",
        idNumber: "012345678999",
        birthYear: 1995,
        guestType: "ADULT",
      },
    });
  });

  after(async () => {
    // Dọn dẹp dữ liệu test
    await prisma.serviceUsage.deleteMany({
      where: { roomId: testRoomId },
    });
    await prisma.debt.deleteMany({
      where: { user: { username: "test_br02_cust1" } },
    });
    await prisma.stayingGuest.deleteMany({
      where: { roomAssignment: { roomId: testRoomId } },
    });
    await prisma.roomAssignment.deleteMany({
      where: { roomId: testRoomId },
    });
    await prisma.bookingItem.deleteMany({
      where: { booking: { customerPhone: "0909999888" } },
    });
    await prisma.booking.deleteMany({
      where: { customerPhone: "0909999888" },
    });
    await prisma.room.deleteMany({
      where: { roomId: testRoomId },
    });
    await prisma.service.deleteMany({
      where: { serviceId: testServiceId },
    });
    await prisma.user.deleteMany({
      where: { username: "test_br02_cust1" },
    });

    if (server) {
      await new Promise((resolve) => server.close(resolve));
    }
  });

  let ticketId1;

  // -------------------------------------------------------------
  // Test 1: Khách hàng chưa kích hoạt Auto-Debit -> Dịch vụ COMPLETED tự động sinh DEBT
  // -------------------------------------------------------------
  test("1. Khách hàng chưa kích hoạt Auto-Debit (NOT_ENABLED) -> Dịch vụ COMPLETED không trừ ví và tự động ghi nhận Công nợ (Debt) (201 Created)", async () => {
    const res = await fetch(`${baseUrl}/api/operation/services/usage`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${saleToken}`,
      },
      body: JSON.stringify({
        roomId: testRoomId,
        serviceId: testServiceId,
        quantity: 1,
        status: "COMPLETED",
      }),
    });

    assert.strictEqual(res.status, 201);
    const body = await res.json();
    assert.strictEqual(body.success, true);
    assert.strictEqual(body.data.status, "COMPLETED");
    assert.strictEqual(body.data.isPaid, false);
    assert.strictEqual(body.data.autoDebit.autoDebited, false);
    assert.strictEqual(body.data.autoDebit.debtCreated, true);

    ticketId1 = body.data.ticketId;

    // Kiểm tra bản ghi công nợ sinh ra trong hệ thống
    const debtsRes = await fetch(`${baseUrl}/api/auto-debit/debts/my-debts`, {
      headers: { Authorization: `Bearer ${customerToken}` },
    });
    const debtsBody = await debtsRes.json();
    assert.strictEqual(debtsBody.data.debts.length, 1);
    assert.strictEqual(debtsBody.data.debts[0].ticketId, ticketId1);
    assert.strictEqual(debtsBody.data.debts[0].amount, SERVICE_PRICE);
    assert.strictEqual(debtsBody.data.debts[0].status, "UNPAID");
  });

  // -------------------------------------------------------------
  // Test 2: Khách hàng bật Auto-Debit ACTIVE nhưng ví bị KHÓA (LOCKED)
  // -------------------------------------------------------------
  test("2. Khách hàng bật Auto-Debit ACTIVE nhưng ví bị LOCKED -> Dịch vụ COMPLETED bị chặn Auto-Debit và sinh Debt (201 Created)", async () => {
    // 1. Consent
    await fetch(`${baseUrl}/api/auto-debit/consent`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${customerToken}`,
      },
      body: JSON.stringify({ agreed: true }),
    });

    // 2. Admin activate
    await fetch(`${baseUrl}/api/auto-debit/admin/${customerUser.id}/status`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({ status: "ACTIVE" }),
    });

    // 3. Admin khóa ví
    await fetch(`${baseUrl}/api/wallet/admin/${customerWallet.id}/status`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({ status: "LOCKED" }),
    });

    // 4. Lập phiếu dịch vụ mới COMPLETED
    const res = await fetch(`${baseUrl}/api/operation/services/usage`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${saleToken}`,
      },
      body: JSON.stringify({
        roomId: testRoomId,
        serviceId: testServiceId,
        quantity: 1,
        status: "COMPLETED",
      }),
    });

    assert.strictEqual(res.status, 201);
    const body = await res.json();
    assert.strictEqual(body.data.isPaid, false);
    assert.strictEqual(body.data.autoDebit.reason, "WALLET_LOCKED");
    assert.strictEqual(body.data.autoDebit.debtCreated, true);

    // Mở khóa ví lại cho các test tiếp theo
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
  // Test 3: QUY TẮC CỐT LÕI SRS – Số dư ví thiếu -> TUYỆT ĐỐI KHÔNG TRỪ MỘT PHẦN
  // -------------------------------------------------------------
  test("3. QUY TẮC CỐT LÕI SRS: Số dư ví 100k < Tiền dịch vụ 300k -> Auto-Debit BR-02 thất bại, BẢO TOÀN 100% số dư 100k (không trừ một phần) & tự động tạo Debt (201 Created)", async () => {
    // 1. Nạp 100.000 VND vào ví (100k < 300k)
    const topUpRes = await fetch(`${baseUrl}/api/wallet/top-up`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${customerToken}`,
      },
      body: JSON.stringify({ amount: 100000 }),
    });
    assert.strictEqual(topUpRes.status, 200);

    // 2. Lập phiếu dịch vụ COMPLETED 300.000 VND
    const res = await fetch(`${baseUrl}/api/operation/services/usage`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${saleToken}`,
      },
      body: JSON.stringify({
        roomId: testRoomId,
        serviceId: testServiceId,
        quantity: 1,
        status: "COMPLETED",
      }),
    });

    assert.strictEqual(res.status, 201);
    const body = await res.json();
    assert.strictEqual(body.data.isPaid, false);
    assert.strictEqual(body.data.autoDebit.autoDebited, false);
    assert.strictEqual(body.data.autoDebit.reason, "INSUFFICIENT_WALLET_BALANCE");
    assert.strictEqual(body.data.autoDebit.debtCreated, true);

    // 3. XÁC MINH QUY TẮC BẢO TOÀN SỐ DƯ: Số dư ví VẪN NGUYÊN VẸN 100.000 VND
    const walletRes = await fetch(`${baseUrl}/api/wallet/my-wallet`, {
      headers: { Authorization: `Bearer ${customerToken}` },
    });
    const walletBody = await walletRes.json();
    assert.strictEqual(walletBody.data.balance, 100000);
  });

  // -------------------------------------------------------------
  // Test 4: Khi ví đủ tiền -> Cập nhật trạng thái sang COMPLETED kích hoạt BR-02 thành công
  // -------------------------------------------------------------
  let completedTicketId;

  test("4. Khi ví đủ tiền: Lập phiếu PENDING sau đó chuyển COMPLETED -> Tự động trừ ví 300k, sinh WTX loại AUTO_DEBIT_SERVICE, isPaid = true (200 OK)", async () => {
    // 1. Nạp thêm 500.000 VND vào ví (Tổng số dư: 100k + 500k = 600.000 VND)
    const topUpRes = await fetch(`${baseUrl}/api/wallet/top-up`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${customerToken}`,
      },
      body: JSON.stringify({ amount: 500000 }),
    });
    assert.strictEqual(topUpRes.status, 200);

    // 2. Lập phiếu dịch vụ trạng thái ban đầu PENDING
    const createRes = await fetch(`${baseUrl}/api/operation/services/usage`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${saleToken}`,
      },
      body: JSON.stringify({
        roomId: testRoomId,
        serviceId: testServiceId,
        quantity: 1,
        status: "PENDING",
      }),
    });
    assert.strictEqual(createRes.status, 201);
    const createBody = await createRes.json();
    assert.strictEqual(createBody.data.status, "PENDING");
    assert.strictEqual(createBody.data.isPaid, false);
    completedTicketId = createBody.data.ticketId;

    // 3. Nhân viên SALE cập nhật trạng thái phiếu dịch vụ sang COMPLETED
    const updateRes = await fetch(`${baseUrl}/api/operation/services/tickets/${completedTicketId}/status`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${saleToken}`,
      },
      body: JSON.stringify({ status: "COMPLETED" }),
    });

    assert.strictEqual(updateRes.status, 200);
    const updateBody = await updateRes.json();
    assert.strictEqual(updateBody.success, true);
    assert.strictEqual(updateBody.data.status, "COMPLETED");
    assert.strictEqual(updateBody.data.isPaid, true);
    assert.strictEqual(updateBody.data.autoDebit.autoDebited, true);
    assert.strictEqual(updateBody.data.autoDebit.amountDeducted, SERVICE_PRICE);

    // 4. Kiểm tra số dư ví giảm chính xác: 600k - 300k = 300.000 VND
    const checkWallet = await fetch(`${baseUrl}/api/wallet/my-wallet`, {
      headers: { Authorization: `Bearer ${customerToken}` },
    });
    const checkWalletBody = await checkWallet.json();
    assert.strictEqual(checkWalletBody.data.balance, 300000);

    // 5. Kiểm tra giao dịch ví sinh ra đúng loại AUTO_DEBIT_SERVICE
    assert.ok(updateBody.data.autoDebit.transactionNo.startsWith("WTX-"));
  });

  // -------------------------------------------------------------
  // Test 5: Chặn thực thi lại BR-02 cho phiếu dịch vụ đã thanh toán (isPaid = true)
  // -------------------------------------------------------------
  test("5. POST /api/auto-debit/services/:ticketId/process-br02 cho phiếu đã thanh toán không bị trừ tiền thêm (200 OK)", async () => {
    const res = await fetch(`${baseUrl}/api/auto-debit/services/${completedTicketId}/process-br02`, {
      method: "POST",
      headers: { Authorization: `Bearer ${customerToken}` },
    });

    assert.strictEqual(res.status, 200);
    const body = await res.json();
    assert.strictEqual(body.data.isPaid, true);
    assert.strictEqual(body.data.autoDebited, false);

    // Số dư ví vẫn là 300.000 VND
    const checkWallet = await fetch(`${baseUrl}/api/wallet/my-wallet`, {
      headers: { Authorization: `Bearer ${customerToken}` },
    });
    const checkWalletBody = await checkWallet.json();
    assert.strictEqual(checkWalletBody.data.balance, 300000);
  });

  // -------------------------------------------------------------
  // Test 6: Tra cứu chi tiết trạng thái Auto-Debit của phiếu dịch vụ
  // -------------------------------------------------------------
  test("6. GET /api/auto-debit/services/:ticketId/auto-debit-status trả về đầy đủ chi tiết thanh toán và giao dịch ví (200 OK)", async () => {
    const res = await fetch(`${baseUrl}/api/auto-debit/services/${completedTicketId}/auto-debit-status`, {
      headers: { Authorization: `Bearer ${customerToken}` },
    });

    assert.strictEqual(res.status, 200);
    const body = await res.json();
    assert.strictEqual(body.success, true);
    assert.strictEqual(body.data.ticketId, completedTicketId);
    assert.strictEqual(body.data.isPaid, true);
    assert.strictEqual(body.data.status, "COMPLETED");
    assert.strictEqual(body.data.hasCustomerAccount, true);
    assert.ok(body.data.transaction);
    assert.strictEqual(body.data.transaction.amount, SERVICE_PRICE);
  });

  // -------------------------------------------------------------
  // Test 7: Strict Disjoint RBAC
  // -------------------------------------------------------------
  test("7. Disjoint RBAC: Customer gọi API Operation bị chặn 403 Forbidden", async () => {
    const res = await fetch(`${baseUrl}/api/operation/services/tickets/${completedTicketId}/status`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${customerToken}`,
      },
      body: JSON.stringify({ status: "COMPLETED" }),
    });

    assert.strictEqual(res.status, 403);
  });
});
