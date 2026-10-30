import test, { describe, before, after } from "node:test";
import assert from "node:assert/strict";
import http from "node:http";
import { app } from "../src/main.js";
import { prisma } from "../src/common/prisma.js";

describe("FEAT-11: Check-out, Invoice Calculation & HTML Invoice Printing", () => {
  let server;
  let baseUrl;
  let saleToken;
  let adminToken;
  let managerToken;

  const testEmail = "feat11.tester@ehotel.local";
  const testAccountNum = "9999555544443333";

  // Phòng test chuyên dụng
  const testRoom101 = "CO-TEST-101";
  const testRoom102 = "CO-TEST-102";

  // Dịch vụ test chuyên dụng
  const testServiceId = "SRV-T11-BUFFET";
  const testServicePrice = 150000;

  let fullBookingId = null;
  let fullBookingNumber = null;
  let depositBookingId = null;
  let depositBookingNumber = null;
  let createdInvoiceId = null;

  // Helper request
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
    // 1. Khởi động HTTP server
    server = http.createServer(app);
    await new Promise((resolve) => {
      server.listen(0, "127.0.0.1", () => {
        const address = server.address();
        baseUrl = `http://127.0.0.1:${address.port}`;
        resolve();
      });
    });

    // 2. Dọn dẹp dữ liệu test cũ
    await prisma.invoice.deleteMany({
      where: { booking: { customerEmail: testEmail } },
    });
    await prisma.serviceUsage.deleteMany({
      where: {
        OR: [
          { serviceId: testServiceId },
          { roomId: { in: [testRoom101, testRoom102] } },
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
          { roomId: { in: [testRoom101, testRoom102] } },
        ],
      },
    });
    await prisma.bookingItem.deleteMany({
      where: { booking: { customerEmail: testEmail } },
    });
    await prisma.booking.deleteMany({
      where: { customerEmail: testEmail },
    });
    await prisma.service.deleteMany({
      where: { serviceId: testServiceId },
    });
    await prisma.paymentAccount.deleteMany({
      where: { accountNumber: testAccountNum },
    });
    await prisma.room.deleteMany({
      where: { roomId: { in: [testRoom101, testRoom102] } },
    });

    // 3. Tạo phòng test:
    // - CO-TEST-101: VIP SINGLE, giá 1.000.000, maxChildren = 1, extraChildFee = 100.000
    // - CO-TEST-102: VIP SINGLE, giá 1.000.000, maxChildren = 1, extraChildFee = 100.000
    await prisma.room.createMany({
      data: [
        {
          roomId: testRoom101,
          type: "VIP",
          size: "SINGLE",
          price: 1000000,
          maxAdults: 2,
          maxChildren: 1,
          extraChildFee: 100000,
          status: "AVAILABLE",
          description: "Phòng Test Check-out 101",
        },
        {
          roomId: testRoom102,
          type: "VIP",
          size: "SINGLE",
          price: 1000000,
          maxAdults: 2,
          maxChildren: 1,
          extraChildFee: 100000,
          status: "AVAILABLE",
          description: "Phòng Test Check-out 102",
        },
      ],
    });

    // 4. Tạo dịch vụ test
    await prisma.service.create({
      data: {
        serviceId: testServiceId,
        serviceName: "Buffet Sáng Quốc Tế",
        description: "Bữa sáng tiêu chuẩn 5 sao",
        unit: "Suất",
        price: testServicePrice,
      },
    });

    // 5. Tạo tài khoản thanh toán giả lập
    await prisma.paymentAccount.create({
      data: {
        cardType: "ATM",
        accountNumber: testAccountNum,
        accountHolder: "FEAT11 TESTER",
        balance: 100000000,
      },
    });

    // 6. Đăng nhập lấy JWT tokens cho 3 role
    const saleLogin = await request("/api/auth/login", {
      method: "POST",
      body: JSON.stringify({ username: "sale", password: "Sale@123" }),
    });
    saleToken = saleLogin.body.data.token;

    const adminLogin = await request("/api/auth/login", {
      method: "POST",
      body: JSON.stringify({ username: "admin", password: "Admin@123" }),
    });
    adminToken = adminLogin.body.data.token;

    const managerLogin = await request("/api/auth/login", {
      method: "POST",
      body: JSON.stringify({ username: "manager", password: "Manager@123" }),
    });
    managerToken = managerLogin.body.data.token;

    // 7. Tạo Booking 1: Thanh toán 100% (FULL_100), lưu trú 2 đêm
    const today = new Date();
    const fromDate = new Date(today.getTime() + 1 * 24 * 60 * 60 * 1000)
      .toISOString()
      .split("T")[0];
    const toDate = new Date(today.getTime() + 3 * 24 * 60 * 60 * 1000)
      .toISOString()
      .split("T")[0];

    const b1Res = await request("/api/public/bookings", {
      method: "POST",
      body: JSON.stringify({
        customerName: "Lê Minh Tuấn",
        customerPhone: "0911223344",
        customerEmail: testEmail,
        customerCccd: "001202611111",
        fromDate,
        toDate,
        paymentOption: "FULL_100",
        paymentAccountNumber: testAccountNum,
        items: [{ roomType: "VIP", roomSize: "SINGLE", quantity: 1 }],
      }),
    });
    assert.equal(b1Res.status, 201);
    fullBookingId = b1Res.body.data.booking.id;
    fullBookingNumber = b1Res.body.data.booking.bookingNumber;

    // Check-in Booking 1 vào testRoom101 (gán 1 người lớn + 2 trẻ em => childCount = 2 > maxChildren(1) => phụ thu 1 trẻ * 100.000 * 2 đêm = 200.000đ)
    const checkinB1 = await request(`/api/operation/bookings/${fullBookingId}/check-in`, {
      method: "POST",
      headers: { Authorization: `Bearer ${saleToken}` },
      body: JSON.stringify({
        assignments: [
          {
            roomId: testRoom101,
            roomType: "VIP",
            roomSize: "SINGLE",
            guests: [
              { fullName: "Lê Minh Tuấn", idNumber: "001202611111", birthYear: 1985, guestType: "ADULT" },
              { fullName: "Lê Bé Một", idNumber: "KHACH-NHO-1", birthYear: 2018, guestType: "CHILD" },
              { fullName: "Lê Bé Hai", idNumber: "KHACH-NHO-2", birthYear: 2020, guestType: "CHILD" },
            ],
          },
        ],
      }),
    });
    assert.equal(checkinB1.status, 200, "Checkin B1 must succeed");

    // Đăng ký 2 suất Buffet cho testRoom101 (2 * 150.000 = 300.000đ)
    const srvRes = await request("/api/operation/services/usage", {
      method: "POST",
      headers: { Authorization: `Bearer ${saleToken}` },
      body: JSON.stringify({
        roomId: testRoom101,
        serviceId: testServiceId,
        quantity: 2,
      }),
    });
    assert.equal(srvRes.status, 201, "Register service for B1 must succeed");

    // 8. Tạo Booking 2: Đặt cọc 50% (DEPOSIT_50), lưu trú 2 đêm
    const b2Res = await request("/api/public/bookings", {
      method: "POST",
      body: JSON.stringify({
        customerName: "Nguyễn Thị Hoa",
        customerPhone: "0922334455",
        customerEmail: testEmail,
        customerCccd: "001202622222",
        fromDate,
        toDate,
        paymentOption: "DEPOSIT_50",
        paymentAccountNumber: testAccountNum,
        items: [{ roomType: "VIP", roomSize: "SINGLE", quantity: 1 }],
      }),
    });
    assert.equal(b2Res.status, 201);
    depositBookingId = b2Res.body.data.booking.id;
    depositBookingNumber = b2Res.body.data.booking.bookingNumber;

    // Check-in Booking 2 vào testRoom102 (1 người lớn, 0 trẻ em => 0đ phụ thu)
    const checkinB2 = await request(`/api/operation/bookings/${depositBookingId}/check-in`, {
      method: "POST",
      headers: { Authorization: `Bearer ${saleToken}` },
      body: JSON.stringify({
        assignments: [
          {
            roomId: testRoom102,
            roomType: "VIP",
            roomSize: "SINGLE",
            guests: [
              { fullName: "Nguyễn Thị Hoa", idNumber: "001202622222", birthYear: 1995, guestType: "ADULT" },
            ],
          },
        ],
      }),
    });
    assert.equal(checkinB2.status, 200, "Checkin B2 must succeed");
  });

  after(async () => {
    if (server) {
      server.close();
    }
    await prisma.invoice.deleteMany({
      where: { booking: { customerEmail: testEmail } },
    });
    await prisma.serviceUsage.deleteMany({
      where: {
        OR: [
          { serviceId: testServiceId },
          { roomId: { in: [testRoom101, testRoom102] } },
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
          { roomId: { in: [testRoom101, testRoom102] } },
        ],
      },
    });
    await prisma.bookingItem.deleteMany({
      where: { booking: { customerEmail: testEmail } },
    });
    await prisma.booking.deleteMany({
      where: { customerEmail: testEmail },
    });
    await prisma.service.deleteMany({
      where: { serviceId: testServiceId },
    });
    await prisma.paymentAccount.deleteMany({
      where: { accountNumber: testAccountNum },
    });
    await prisma.room.deleteMany({
      where: { roomId: { in: [testRoom101, testRoom102] } },
    });
  });

  test("1. Strict Disjoint RBAC: ADMIN và MANAGER gọi các API Check-out & Invoices bị từ chối 403, SALE được phép truy cập (200 OK)", async () => {
    // ADMIN gọi -> 403 Forbidden
    const adminRes = await request(`/api/operation/bookings/${fullBookingId}/checkout-preview`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    assert.equal(adminRes.status, 403);
    assert.equal(adminRes.body.error.code, "FORBIDDEN_ACCESS");

    // MANAGER gọi -> 403 Forbidden
    const managerRes = await request(`/api/operation/bookings/${fullBookingId}/checkout-preview`, {
      headers: { Authorization: `Bearer ${managerToken}` },
    });
    assert.equal(managerRes.status, 403);
    assert.equal(managerRes.body.error.code, "FORBIDDEN_ACCESS");

    // SALE gọi -> 200 OK
    const saleRes = await request(`/api/operation/bookings/${fullBookingId}/checkout-preview`, {
      headers: { Authorization: `Bearer ${saleToken}` },
    });
    assert.equal(saleRes.status, 200);
    assert.equal(saleRes.body.success, true);
  });

  test("2. Chặn làm thủ tục Check-out cho đơn chưa Check-in (CONFIRMED) -> 400 CHECKOUT_INVALID", async () => {
    // Tạo 1 booking mới chỉ CONFIRMED (chưa check-in)
    const today = new Date();
    const fromDate = new Date(today.getTime() + 5 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];
    const toDate = new Date(today.getTime() + 6 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];

    const unconfirmedRes = await request("/api/public/bookings", {
      method: "POST",
      body: JSON.stringify({
        customerName: "Khách Chưa Checkin",
        customerPhone: "0999000111",
        customerEmail: testEmail,
        customerCccd: "001202633333",
        fromDate,
        toDate,
        paymentOption: "FULL_100",
        paymentAccountNumber: testAccountNum,
        items: [{ roomType: "VIP", roomSize: "SINGLE", quantity: 1 }],
      }),
    });
    const bId = unconfirmedRes.body.data.booking.id;

    const res = await request(`/api/operation/bookings/${bId}/check-out`, {
      method: "POST",
      headers: { Authorization: `Bearer ${saleToken}` },
    });

    assert.equal(res.status, 400);
    assert.equal(res.body.error.code, "CHECKOUT_INVALID");
    assert.match(res.body.error.message, /CHECKED_IN/);
  });

  test("3. Tra cứu preview quyết toán Check-out qua GET /api/operation/bookings/:id/checkout-preview tính đúng chi tiết tài chính", async () => {
    const res = await request(`/api/operation/bookings/${fullBookingId}/checkout-preview`, {
      headers: { Authorization: `Bearer ${saleToken}` },
    });

    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.ok(res.body.data);

    const { breakdown, services } = res.body.data;

    // Chi tiết tính toán:
    // netRoomFee: 800.000 * 2 đêm = 1.600.000đ (đơn giá niêm yết VIP SINGLE)
    // extraChildrenFee: 1 trẻ vượt * 100.000 * 2 đêm = 200.000đ
    // totalServiceFee: 2 suất Buffet * 150.000 = 300.000đ
    // totalInvoiceAmount: 1.600.000 + 200.000 + 300.000 = 2.100.000đ
    // prepaidBookingValue (FULL_100): 1.600.000đ
    // remainingPayable: 2.100.000 - 1.600.000 = 500.000đ
    assert.equal(breakdown.netRoomFee, 1600000);
    assert.equal(breakdown.extraChildrenFee, 200000);
    assert.equal(breakdown.totalServiceFee, 300000);
    assert.equal(breakdown.totalInvoiceAmount, 2100000);
    assert.equal(breakdown.prepaidBookingValue, 1600000);
    assert.equal(breakdown.remainingPayable, 500000);
    assert.equal(services.length, 1);
    assert.equal(services[0].totalPrice, 300000);
  });

  test("4. Verification Gate 1: Check-out thành công và kiểm tra công thức remainingPayable = (netRoomFee + extraChildrenFee + totalServiceFee) - prepaidBookingValue (SPEC 4.5)", async () => {
    const res = await request(`/api/operation/bookings/${fullBookingId}/check-out`, {
      method: "POST",
      headers: { Authorization: `Bearer ${saleToken}` },
    });

    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.ok(res.body.data);

    const { invoice, booking } = res.body.data;
    assert.ok(invoice);
    assert.match(invoice.invoiceId, /^INV-\d{8}-\d{4}$/, "Mã invoiceId phải có định dạng INV-YYYYMMDD-XXXX");

    // Xác minh công thức toán học SPEC 4.5
    const netRoomFee = invoice.totalRoomFee;
    const extraChildrenFee = invoice.extraChildrenFee;
    const totalServiceFee = invoice.totalServiceFee;
    const prepaidBookingValue = invoice.prepaidBookingValue;

    const expectedTotalInvoice = netRoomFee + extraChildrenFee + totalServiceFee;
    const expectedRemaining = expectedTotalInvoice - prepaidBookingValue;

    assert.equal(invoice.totalInvoiceAmount, expectedTotalInvoice);
    assert.equal(invoice.remainingPayable, expectedRemaining);

    // Giá trị cụ thể của Booking 1:
    assert.equal(netRoomFee, 1600000);
    assert.equal(extraChildrenFee, 200000);
    assert.equal(totalServiceFee, 300000);
    assert.equal(invoice.totalInvoiceAmount, 2100000);
    assert.equal(prepaidBookingValue, 1600000);
    assert.equal(invoice.remainingPayable, 500000);

    createdInvoiceId = invoice.invoiceId;
  });

  test("5. Verification Gate 2: Kiểm tra sau khi Check-out: phòng vật lý trở về AVAILABLE, booking chuyển sang CHECKED_OUT", async () => {
    // 1. Kiểm tra trạng thái Booking trong DB
    const dbBooking = await prisma.booking.findUnique({
      where: { id: fullBookingId },
    });
    assert.ok(dbBooking);
    assert.equal(dbBooking.status, "CHECKED_OUT", "Booking status phải là CHECKED_OUT");
    assert.ok(dbBooking.checkedOutAt, "Phải ghi nhận thời điểm checkedOutAt");

    // 2. Kiểm tra trạng thái phòng vật lý testRoom101 trong DB
    const dbRoom = await prisma.room.findUnique({
      where: { roomId: testRoom101 },
    });
    assert.ok(dbRoom);
    assert.equal(dbRoom.status, "AVAILABLE", "Phòng vật lý phải được giải phóng về AVAILABLE");

    // 3. Kiểm tra RoomAssignment có checkOutAt
    const dbAssignment = await prisma.roomAssignment.findFirst({
      where: { bookingId: fullBookingId, roomId: testRoom101 },
    });
    assert.ok(dbAssignment);
    assert.ok(dbAssignment.checkOutAt, "RoomAssignment phải có checkOutAt");
  });

  test("6. Chặn Check-out lần 2 trên cùng một đơn đã CHECKED_OUT (Double Checkout Guard) -> 400 CHECKOUT_INVALID", async () => {
    const res = await request(`/api/operation/bookings/${fullBookingId}/check-out`, {
      method: "POST",
      headers: { Authorization: `Bearer ${saleToken}` },
    });

    assert.equal(res.status, 400);
    assert.equal(res.body.error.code, "CHECKOUT_INVALID");
    assert.match(res.body.error.message, /CHECKED_IN/);
  });

  test("7. Tra cứu chi tiết hóa đơn in ấn qua GET /api/operation/invoices/:invoiceId hiển thị đầy đủ thông tin", async () => {
    assert.ok(createdInvoiceId);

    const res = await request(`/api/operation/invoices/${createdInvoiceId}`, {
      headers: { Authorization: `Bearer ${saleToken}` },
    });

    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);

    const inv = res.body.data;
    assert.equal(inv.invoiceId, createdInvoiceId);
    assert.equal(inv.booking.bookingNumber, fullBookingNumber);
    assert.equal(inv.booking.customerName, "Lê Minh Tuấn");
    assert.equal(inv.totalRoomFee, 1600000);
    assert.equal(inv.extraChildrenFee, 200000);
    assert.equal(inv.totalServiceFee, 300000);
    assert.equal(inv.totalInvoiceAmount, 2100000);
    assert.equal(inv.prepaidBookingValue, 1600000);
    assert.equal(inv.remainingPayable, 500000);
    assert.ok(inv.issuedAt);
    assert.equal(inv.rooms.length, 1);
    assert.equal(inv.rooms[0].roomId, testRoom101);
    assert.equal(inv.services.length, 1);
    assert.equal(inv.services[0].serviceName, "Buffet Sáng Quốc Tế");
  });

  test("8. GET /api/operation/invoices tra cứu danh sách lịch sử hóa đơn đã quyết toán thành công", async () => {
    const res = await request(
      `/api/operation/invoices?keyword=${createdInvoiceId}`,
      {
        headers: { Authorization: `Bearer ${saleToken}` },
      },
    );

    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.ok(res.body.data.total >= 1);
    assert.equal(res.body.data.invoices[0].invoiceId, createdInvoiceId);
    assert.equal(res.body.data.invoices[0].remainingPayable, 500000);
  });

  test("9. Xử lý trường hợp đặt cọc 50% (DEPOSIT_50): Check-out khấu trừ đúng số tiền cọc 50% và tính đúng số tiền còn lại phải thu", async () => {
    // Booking 2: 2 đêm * 800.000 = 1.600.000đ tiền phòng
    // Cọc 50%: prepaidBookingValue = 800.000đ
    // Không phụ thu trẻ em, chưa dùng dịch vụ:
    // totalInvoiceAmount = 1.600.000đ
    // remainingPayable = 1.600.000 - 800.000 = 800.000đ
    const res = await request(`/api/operation/bookings/${depositBookingId}/check-out`, {
      method: "POST",
      headers: { Authorization: `Bearer ${saleToken}` },
    });

    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);

    const { invoice } = res.body.data;
    assert.equal(invoice.totalRoomFee, 1600000);
    assert.equal(invoice.extraChildrenFee, 0);
    assert.equal(invoice.totalServiceFee, 0);
    assert.equal(invoice.totalInvoiceAmount, 1600000);
    assert.equal(invoice.prepaidBookingValue, 800000);
    assert.equal(invoice.remainingPayable, 800000);

    // Xác minh phòng testRoom102 cũng được giải phóng về AVAILABLE
    const dbRoom102 = await prisma.room.findUnique({
      where: { roomId: testRoom102 },
    });
    assert.equal(dbRoom102.status, "AVAILABLE");
  });

  test("10. Pessimistic Locking & Concurrency: Check-out đồng thời song song chỉ 1 request thành công, request thứ hai bị chặn an toàn với CHECKOUT_INVALID", async () => {
    // Tạo thêm 1 booking và check-in vào testRoom101 (vừa được giải phóng)
    const today = new Date();
    const fromDate = new Date(today.getTime() + 10 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];
    const toDate = new Date(today.getTime() + 12 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];

    const concurrentBookingRes = await request("/api/public/bookings", {
      method: "POST",
      body: JSON.stringify({
        customerName: "Khách Đua Concurrency Check-out",
        customerPhone: "0977889900",
        customerEmail: testEmail,
        customerCccd: "001202644444",
        fromDate,
        toDate,
        paymentOption: "FULL_100",
        paymentAccountNumber: testAccountNum,
        items: [{ roomType: "VIP", roomSize: "SINGLE", quantity: 1 }],
      }),
    });
    const cBookingId = concurrentBookingRes.body.data.booking.id;

    // Check-in
    await request(`/api/operation/bookings/${cBookingId}/check-in`, {
      method: "POST",
      headers: { Authorization: `Bearer ${saleToken}` },
      body: JSON.stringify({
        assignments: [
          {
            roomId: testRoom101,
            roomType: "VIP",
            roomSize: "SINGLE",
            guests: [
              { fullName: "Khách Concurrency", idNumber: "001202644444", birthYear: 1990, guestType: "ADULT" },
            ],
          },
        ],
      }),
    });

    // Gọi đồng thời 2 request check-out cho cùng booking này
    const [res1, res2] = await Promise.all([
      request(`/api/operation/bookings/${cBookingId}/check-out`, {
        method: "POST",
        headers: { Authorization: `Bearer ${saleToken}` },
      }),
      request(`/api/operation/bookings/${cBookingId}/check-out`, {
        method: "POST",
        headers: { Authorization: `Bearer ${saleToken}` },
      }),
    ]);

    const statuses = [res1.status, res2.status].sort();
    assert.deepEqual(statuses, [200, 400], "Một request phải thành công (200), request còn lại bị từ chối (400)");

    const failedRes = res1.status === 400 ? res1 : res2;
    assert.equal(failedRes.body.error.code, "CHECKOUT_INVALID");
  });
});
