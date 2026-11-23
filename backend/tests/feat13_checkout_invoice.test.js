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

  let bookingId = null;
  let bookingNumber = null;
  let invoiceId = null;

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
      body: JSON.stringify({ isActive: true }),
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

    // 8. Create Booking with customerId linked, totalRoomFee 1,000,000, prepaid 500,000
    bookingNumber = `BK-F13-${Date.now().toString().slice(-6)}`;
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const booking = await prisma.booking.create({
      data: {
        bookingNumber,
        customerId: customerUser.id,
        customerName: "Khách Hàng Checkout Test",
        customerPhone: testPhone,
        customerEmail: testEmail,
        customerCccd: "034567891234",
        fromDate: today,
        toDate: tomorrow,
        roomType: "VIP",
        roomsCount: 1,
        adultsCount: 2,
        childrenCount: 0,
        totalRoomFee: 1000000,
        prepaidAmount: 500000,
        status: "CONFIRMED",
        bookingItems: {
          create: [
            {
              roomType: "VIP",
              quantity: 1,
              price: 1000000,
            },
          ],
        },
      },
    });
    bookingId = booking.bookingId;

    // 9. Check in booking
    const checkInRes = await request(`/api/operation/bookings/${bookingId}/check-in`, {
      method: "POST",
      headers: { Authorization: `Bearer ${saleToken}` },
      body: JSON.stringify({
        roomAssignments: [{ roomId: testRoomId }],
        guests: [
          {
            fullName: "Khách Hàng Checkout Test",
            cccd: "034567891234",
            gender: "Nam",
            phone: testPhone,
            isRepresentative: true,
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

    // Chi phí tổng:
    // Room: 1,000,000
    // Extra child: 0
    // Service 1: 300,000 (đã trừ ví)
    // Service 2: 100,000 (chưa trừ)
    // Total services: 400,000
    // Total Invoice: 1,400,000
    // Prepaid: 500,000
    // Wallet Paid: 300,000
    // Remaining Payable: 1,400,000 - 500,000 - 300,000 = 600,000 VND
    assert.equal(data.totalRoomFee, 1000000);
    assert.equal(data.totalServiceFee, 400000);
    assert.equal(data.totalInvoiceAmount, 1400000);
    assert.equal(data.prepaidBookingValue, 500000);
    assert.equal(data.walletPaidAmount, 300000, "walletPaidAmount must be exactly 300,000");
    assert.equal(data.remainingPayable, 600000, "remainingPayable must deduct both prepaid and walletPaidAmount");
  });

  test("3. Quyết toán Check-out thành công: Lưu walletPaidAmount vào Invoice và không thu trùng tiền ví", async () => {
    const checkoutRes = await request(`/api/operation/bookings/${bookingId}/check-out`, {
      method: "POST",
      headers: { Authorization: `Bearer ${saleToken}` },
    });

    assert.equal(checkoutRes.status, 200);
    const data = checkoutRes.body.data;
    assert.ok(data.invoice);
    assert.equal(data.invoice.walletPaidAmount, 300000);
    assert.equal(data.invoice.remainingPayable, 600000);
    assert.equal(data.invoice.totalInvoiceAmount, 1400000);

    invoiceId = data.invoice.invoiceId;

    // Kiểm tra trực tiếp Database
    const dbInvoice = await prisma.invoice.findUnique({
      where: { invoiceId },
    });
    assert.ok(dbInvoice);
    assert.equal(dbInvoice.walletPaidAmount, 300000);
    assert.equal(dbInvoice.remainingPayable, 600000);
    assert.equal(dbInvoice.totalAmount, 1400000);

    // Kiểm tra trạng thái Booking đã chuyển CHECKED_OUT
    const dbBooking = await prisma.booking.findUnique({
      where: { bookingId },
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
    assert.equal(inv.walletPaidAmount, 300000);
    assert.equal(inv.remainingPayable, 600000);

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
    const target = res.body.data.find((item) => item.invoiceId === invoiceId);
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
    assert.equal(res.body.error?.code, "FORBIDDEN");
  });
});
