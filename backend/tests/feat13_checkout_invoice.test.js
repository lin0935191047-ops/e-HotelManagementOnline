import test, { describe, before, after } from "node:test";
import assert from "node:assert/strict";
import http from "node:http";
import { app } from "../src/main.js";
import { prisma } from "../src/common/prisma.js";

describe("FEAT-13.7: Invoice Integration, Check-out Quyết toán & Khấu trừ Ví Tự Động", () => {
  let server;
  let baseUrl;
  let saleToken;
  let adminToken;
  let custToken;
  let customerUser;

  const testEmail = "feat13.checkout.tester@ehotel.local";
  const testPhone = "0988776655";
  const testRoomId = "CO-F13-701";
  const testServiceId1 = "SRV-F13-PAID";
  const testServiceId2 = "SRV-F13-UNPAID";
  const testAccountNum = "9999888877771377";

  let bookingId = null;
  let bookingNumber = null;
  let invoiceId = null;
  let expectedTotalRoomFee = 0;
  let expectedPrepaid = 0;

  async function request(endpoint, options = {}) {
    const url = `${baseUrl}${endpoint}`;
    const res = await fetch(url, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        ...(options.headers || {}),
      },
    });
    const body = await res.json().catch(() => ({}));
    return { status: res.status, body };
  }

  before(async () => {
    // 1. Start test server
    server = http.createServer(app);
    await new Promise((resolve) => {
      server.listen(0, "127.0.0.1", () => {
        const address = server.address();
        baseUrl = `http://127.0.0.1:${address.port}`;
        resolve();
      });
    });

    // 2. Clean old test data
    await prisma.invoice.deleteMany({
      where: { booking: { customerEmail: testEmail } },
    });
    await prisma.serviceUsage.deleteMany({
      where: {
        OR: [
          { serviceId: { in: [testServiceId1, testServiceId2] } },
          { roomId: testRoomId },
          { booking: { customerEmail: testEmail } },
        ],
      },
    });
    await prisma.stayingGuest.deleteMany({
      where: { booking: { customerEmail: testEmail } },
    });
    await prisma.roomAssignment.deleteMany({
      where: {
        OR: [
          { booking: { customerEmail: testEmail } },
          { roomId: testRoomId },
        ],
      },
    });
    await prisma.bookingItem.deleteMany({
      where: { booking: { customerEmail: testEmail } },
    });
    await prisma.booking.deleteMany({
      where: { customerEmail: testEmail },
    });
    await prisma.debt.deleteMany({
      where: { user: { username: "f13_checkout_user" } },
    });
    await prisma.walletTransaction.deleteMany({
      where: { wallet: { user: { username: "f13_checkout_user" } } },
    });
    await prisma.wallet.deleteMany({
      where: { user: { username: "f13_checkout_user" } },
    });
    await prisma.autoDebitConsent.deleteMany({
      where: { user: { username: "f13_checkout_user" } },
    });
    await prisma.autoDebitSetting.deleteMany({
      where: { user: { username: "f13_checkout_user" } },
    });
    await prisma.user.deleteMany({
      where: { username: "f13_checkout_user" },
    });
    await prisma.service.deleteMany({
      where: { serviceId: { in: [testServiceId1, testServiceId2] } },
    });
    await prisma.room.deleteMany({
      where: { roomId: testRoomId },
    });
    await prisma.paymentAccount.deleteMany({
      where: { accountNumber: testAccountNum },
    });

    // 3. Logins
    const saleLogin = await request("/api/auth/login", {
      method: "POST",
      body: JSON.stringify({ username: "sale", password: "Sale@123" }),
    });
    saleToken = saleLogin.body.data?.token;

    const adminLogin = await request("/api/auth/login", {
      method: "POST",
      body: JSON.stringify({ username: "admin", password: "Admin@123" }),
    });
    adminToken = adminLogin.body.data?.token;

    // 4. Register customer
    const regRes = await request("/api/auth/register", {
      method: "POST",
      body: JSON.stringify({
        username: "f13_checkout_user",
        password: "Customer@123",
        fullName: "Khách Hàng Checkout Test",
        email: testEmail,
        phone: testPhone,
        cccd: "034567891234",
      }),
    });
    assert.equal(regRes.status, 201);
    customerUser = regRes.body.data.user;

    const custLogin = await request("/api/auth/login", {
      method: "POST",
      body: JSON.stringify({ username: "f13_checkout_user", password: "Customer@123" }),
    });
    custToken = custLogin.body.data?.token;

    // 5. Customer signs Auto-Debit Consent & Admin activates setting
    await request("/api/auto-debit/consent", {
      method: "POST",
      headers: { Authorization: `Bearer ${custToken}` },
      body: JSON.stringify({ consent: true, agreedTermsVersion: "v1.0" }),
    });
    await request(`/api/auto-debit/admin/${customerUser.id}/status`, {
      method: "PUT",
      headers: { Authorization: `Bearer ${adminToken}` },
      body: JSON.stringify({ status: "ACTIVE" }),
    });

    // 6. Top up customer wallet with 2,000,000 VND
    await request("/api/wallet/top-up", {
      method: "POST",
      headers: { Authorization: `Bearer ${custToken}` },
      body: JSON.stringify({ amount: 2000000, bankCode: "NCB", note: "Nạp ví test" }),
    });

    // 7. Create Room and Services
    await prisma.room.create({
      data: {
        roomId: testRoomId,
        type: "VIP",
        size: "SINGLE",
        description: "Phòng VIP Deluxe FEAT-13 Checkout",
        price: 1000000,
        maxAdults: 2,
        maxChildren: 1,
        extraChildFee: 100000,
        status: "AVAILABLE",
      },
    });

    await prisma.service.createMany({
      data: [
        {
          serviceId: testServiceId1,
          serviceName: "Massage Toàn Thân 60p",
          unit: "Lượt",
          price: 300000,
        },
        {
          serviceId: testServiceId2,
          serviceName: "Nước Uống Mini-bar",
          unit: "Lon",
          price: 50000,
        },
      ],
    });

    // 8. Create payment account
    await prisma.paymentAccount.create({
      data: {
        cardType: "ATM",
        accountNumber: testAccountNum,
        accountHolder: "FEAT13 TESTER",
        balance: 100000000,
      },
    });

    // 9. Create Booking with 1 night VIP SINGLE (price 1,000,000, deposit 50% = 500,000)
    const today = new Date();
    const fromDate = new Date(today.getTime() + 1 * 24 * 60 * 60 * 1000)
      .toISOString()
      .split("T")[0];
    const toDate = new Date(today.getTime() + 2 * 24 * 60 * 60 * 1000)
      .toISOString()
      .split("T")[0];

    const bRes = await request("/api/public/bookings", {
      method: "POST",
      body: JSON.stringify({
        customerName: "Khách Hàng Checkout Test",
        customerPhone: testPhone,
        customerEmail: testEmail,
        customerCccd: "034567891234",
        fromDate,
        toDate,
        paymentOption: "DEPOSIT_50",
        paymentAccountNumber: testAccountNum,
        items: [{ roomType: "VIP", roomSize: "SINGLE", quantity: 1 }],
      }),
    });
    assert.equal(bRes.status, 201, "Booking creation must succeed");
    bookingId = bRes.body.data.booking.id;
    bookingNumber = bRes.body.data.booking.bookingNumber;
    expectedTotalRoomFee = Number(bRes.body.data.booking.totalRoomFee);
    expectedPrepaid = Number(bRes.body.data.booking.prepaidBookingValue);

    // Link customerId
    await prisma.booking.update({
      where: { id: bookingId },
      data: { customerId: customerUser.id },
    });

    // 10. Check in booking
    const checkInRes = await request(`/api/operation/bookings/${bookingId}/check-in`, {
      method: "POST",
      headers: { Authorization: `Bearer ${saleToken}` },
      body: JSON.stringify({
        assignments: [
          {
            roomId: testRoomId,
            roomType: "VIP",
            roomSize: "SINGLE",
            guests: [
              {
                fullName: "Khách Hàng Checkout Test",
                idNumber: "034567891234",
                birthYear: 1990,
                guestType: "ADULT",
              },
            ],
          },
        ],
      }),
    });
    assert.equal(checkInRes.status, 200, "Check-in must succeed");
  });

  after(async () => {
    if (server) {
      await new Promise((resolve) => server.close(resolve));
    }
    // Clean up
    await prisma.invoice.deleteMany({
      where: { booking: { customerEmail: testEmail } },
    });
    await prisma.serviceUsage.deleteMany({
      where: {
        OR: [
          { serviceId: { in: [testServiceId1, testServiceId2] } },
          { roomId: testRoomId },
          { booking: { customerEmail: testEmail } },
        ],
      },
    });
    await prisma.stayingGuest.deleteMany({
      where: { booking: { customerEmail: testEmail } },
    });
    await prisma.roomAssignment.deleteMany({
      where: {
        OR: [
          { booking: { customerEmail: testEmail } },
          { roomId: testRoomId },
        ],
      },
    });
    await prisma.bookingItem.deleteMany({
      where: { booking: { customerEmail: testEmail } },
    });
    await prisma.booking.deleteMany({
      where: { customerEmail: testEmail },
    });
    await prisma.debt.deleteMany({
      where: { user: { username: "f13_checkout_user" } },
    });
    await prisma.walletTransaction.deleteMany({
      where: { wallet: { user: { username: "f13_checkout_user" } } },
    });
    await prisma.wallet.deleteMany({
      where: { user: { username: "f13_checkout_user" } },
    });
    await prisma.autoDebitConsent.deleteMany({
      where: { user: { username: "f13_checkout_user" } },
    });
    await prisma.autoDebitSetting.deleteMany({
      where: { user: { username: "f13_checkout_user" } },
    });
    await prisma.user.deleteMany({
      where: { username: "f13_checkout_user" },
    });
    await prisma.service.deleteMany({
      where: { serviceId: { in: [testServiceId1, testServiceId2] } },
    });
    await prisma.room.deleteMany({
      where: { roomId: testRoomId },
    });
    await prisma.paymentAccount.deleteMany({
      where: { accountNumber: testAccountNum },
    });
  });

  test("1. Sử dụng dịch vụ, hoàn tất (COMPLETED) và trừ ví tự động qua BR-02 (isPaid = true)", async () => {
    // 1. Tạo service 1 (Massage 300,000)
    const srv1Res = await request("/api/operation/services/usage", {
      method: "POST",
      headers: { Authorization: `Bearer ${saleToken}` },
      body: JSON.stringify({
        bookingId,
        roomId: testRoomId,
        serviceId: testServiceId1,
        quantity: 1,
      }),
    });
    assert.equal(srv1Res.status, 201);
    const ticketId1 = srv1Res.body.data.ticketId;

    // Đổi trạng thái ticket 1 sang COMPLETED -> kích hoạt BR-02
    const completeRes = await request(`/api/operation/services/tickets/${ticketId1}/status`, {
      method: "PUT",
      headers: { Authorization: `Bearer ${saleToken}` },
      body: JSON.stringify({ status: "COMPLETED" }),
    });
    assert.equal(completeRes.status, 200);
    assert.equal(completeRes.body.data.isPaid, true, "Ticket 1 must be marked isPaid = true");

    // 2. Tạo service 2 (Nước uống 2 lon * 50,000 = 100,000) ở trạng thái PENDING (chưa trả)
    const srv2Res = await request("/api/operation/services/usage", {
      method: "POST",
      headers: { Authorization: `Bearer ${saleToken}` },
      body: JSON.stringify({
        bookingId,
        roomId: testRoomId,
        serviceId: testServiceId2,
        quantity: 2,
        status: "PENDING",
      }),
    });
    assert.equal(srv2Res.status, 201);
    assert.equal(srv2Res.body.data.isPaid, false, "Ticket 2 must be isPaid = false");
  });

  test("2. Xem trước quyết toán (Check-out Preview): Khấu trừ chính xác ví đã thanh toán (walletPaidAmount)", async () => {
    const previewRes = await request(`/api/operation/bookings/${bookingId}/checkout-preview`, {
      method: "GET",
      headers: { Authorization: `Bearer ${saleToken}` },
    });

    assert.equal(previewRes.status, 200);
    const data = previewRes.body.data;

    const b = data.breakdown;
    const expectedTotalInvoice = expectedTotalRoomFee + 400000;
    const expectedRemaining = expectedTotalInvoice - expectedPrepaid - 300000;

    assert.equal(b.totalRoomFee, expectedTotalRoomFee);
    assert.equal(b.totalServiceFee, 400000);
    assert.equal(b.totalInvoiceAmount, expectedTotalInvoice);
    assert.equal(b.prepaidBookingValue, expectedPrepaid);
    assert.equal(b.walletPaidAmount, 300000, "walletPaidAmount must be exactly 300,000");
    assert.equal(b.remainingPayable, expectedRemaining, "remainingPayable must deduct both prepaid and walletPaidAmount");
  });

  test("3. Quyết toán Check-out thành công: Lưu walletPaidAmount vào Invoice và không thu trùng tiền ví", async () => {
    const checkoutRes = await request(`/api/operation/bookings/${bookingId}/check-out`, {
      method: "POST",
      headers: { Authorization: `Bearer ${saleToken}` },
    });

    assert.equal(checkoutRes.status, 200);
    const data = checkoutRes.body.data;
    const expectedTotalInvoice = expectedTotalRoomFee + 400000;
    const expectedRemaining = expectedTotalInvoice - expectedPrepaid - 300000;

    assert.ok(data.invoice);
    assert.equal(data.invoice.walletPaidAmount, 300000);
    assert.equal(data.invoice.remainingPayable, expectedRemaining);
    assert.equal(data.invoice.totalInvoiceAmount, expectedTotalInvoice);

    invoiceId = data.invoice.invoiceId;

    // Kiểm tra trực tiếp Database
    const dbInvoice = await prisma.invoice.findUnique({
      where: { invoiceId },
    });
    assert.ok(dbInvoice);
    assert.equal(Number(dbInvoice.walletPaidAmount), 300000);
    assert.equal(Number(dbInvoice.remainingPayable), expectedRemaining);
    assert.equal(Number(dbInvoice.totalInvoiceAmount), expectedTotalInvoice);

    // Kiểm tra trạng thái Booking đã chuyển CHECKED_OUT
    const dbBooking = await prisma.booking.findUnique({
      where: { id: bookingId },
    });
    assert.equal(dbBooking.status, "CHECKED_OUT");
  });

  test("4. Chi tiết Hóa đơn (GET /invoices/:invoiceId): Trả về đầy đủ walletPaidAmount và cờ isPaid của dịch vụ", async () => {
    const res = await request(`/api/operation/invoices/${invoiceId}`, {
      method: "GET",
      headers: { Authorization: `Bearer ${saleToken}` },
    });

    assert.equal(res.status, 200);
    const inv = res.body.data;
    const expectedTotalInvoice = expectedTotalRoomFee + 400000;
    const expectedRemaining = expectedTotalInvoice - expectedPrepaid - 300000;

    assert.equal(inv.walletPaidAmount, 300000);
    assert.equal(inv.remainingPayable, expectedRemaining);

    // Kiểm tra danh sách dịch vụ
    assert.ok(Array.isArray(inv.services));
    const paidService = inv.services.find((s) => s.totalPrice === 300000);
    assert.ok(paidService);
    assert.equal(paidService.isPaid, true, "Paid service must have isPaid = true");

    const unpaidService = inv.services.find((s) => s.totalPrice === 100000);
    assert.ok(unpaidService);
    assert.equal(unpaidService.isPaid, false, "Unpaid service must have isPaid = false");
  });

  test("5. Danh sách Hóa đơn (GET /invoices): Chứa trường walletPaidAmount", async () => {
    const res = await request("/api/operation/invoices", {
      method: "GET",
      headers: { Authorization: `Bearer ${saleToken}` },
    });

    assert.equal(res.status, 200);
    const target = res.body.data.invoices.find((item) => item.invoiceId === invoiceId);
    assert.ok(target, "Created invoice must exist in list");
    assert.equal(target.walletPaidAmount, 300000);
  });

  test("6. Chặn Check-out lặp lại (Double Check-out Prevention) -> 400 CHECKOUT_INVALID", async () => {
    const res = await request(`/api/operation/bookings/${bookingId}/check-out`, {
      method: "POST",
      headers: { Authorization: `Bearer ${saleToken}` },
    });

    assert.equal(res.status, 400);
    assert.equal(res.body.error?.code, "CHECKOUT_INVALID");
  });

  test("7. Phân quyền Strict Disjoint RBAC: CUSTOMER không thể gọi API Check-out -> 403 Forbidden", async () => {
    const res = await request(`/api/operation/bookings/${bookingId}/check-out`, {
      method: "POST",
      headers: { Authorization: `Bearer ${custToken}` },
    });

    assert.equal(res.status, 403);
    assert.equal(res.body.error?.code, "FORBIDDEN_ACCESS");
  });
});
