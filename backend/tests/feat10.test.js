import test, { describe, before, after } from "node:test";
import assert from "node:assert/strict";
import http from "node:http";
import { app } from "../src/main.js";
import { prisma } from "../src/common/prisma.js";

describe("FEAT-10: Use Services & HTML Ticket Printing", () => {
  let server;
  let baseUrl;
  let saleToken;
  let adminToken;
  let managerToken;

  const testEmail = "feat10.tester@ehotel.local";
  const testAccountNum = "9999888877776666";

  // Phòng test chuyên dụng
  const testOccupiedRoom = "SRV-TEST-101";
  const testAvailableRoom = "SRV-TEST-102";
  const testMaintenanceRoom = "SRV-TEST-103";

  // Dịch vụ test chuyên dụng
  const testServiceId = "SRV-T10-SPA";
  const testServiceName = "Spa Thư Giãn Tinh Dầu";
  const testServicePrice = 300000;
  const testServiceUnit = "Lượt";

  let createdBookingId = null;
  let createdBookingNumber = null;
  let createdTicketId = null;

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
    await prisma.serviceUsage.deleteMany({
      where: {
        OR: [
          { serviceId: testServiceId },
          { roomId: { in: [testOccupiedRoom, testAvailableRoom, testMaintenanceRoom] } },
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
          { roomId: { in: [testOccupiedRoom, testAvailableRoom, testMaintenanceRoom] } },
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
      where: { roomId: { in: [testOccupiedRoom, testAvailableRoom, testMaintenanceRoom] } },
    });

    // 3. Tạo phòng test:
    // - SRV-TEST-101: VIP SINGLE, ban đầu AVAILABLE, sau đó check-in thành OCCUPIED
    // - SRV-TEST-102: VIP SINGLE, luôn AVAILABLE
    // - SRV-TEST-103: VIP SINGLE, MAINTENANCE
    await prisma.room.createMany({
      data: [
        {
          roomId: testOccupiedRoom,
          type: "VIP",
          size: "SINGLE",
          price: 1000000,
          maxAdults: 2,
          maxChildren: 1,
          extraChildFee: 150000,
          status: "AVAILABLE",
          description: "Phòng VIP Check-in Test",
        },
        {
          roomId: testAvailableRoom,
          type: "VIP",
          size: "SINGLE",
          price: 1000000,
          maxAdults: 2,
          maxChildren: 1,
          extraChildFee: 150000,
          status: "AVAILABLE",
          description: "Phòng Trống Test",
        },
        {
          roomId: testMaintenanceRoom,
          type: "VIP",
          size: "SINGLE",
          price: 1000000,
          maxAdults: 2,
          maxChildren: 1,
          extraChildFee: 150000,
          status: "MAINTENANCE",
          description: "Phòng Bảo trì Test",
        },
      ],
    });

    // 4. Tạo dịch vụ mẫu test
    await prisma.service.create({
      data: {
        serviceId: testServiceId,
        serviceName: testServiceName,
        description: "Liệu trình chăm sóc toàn thân với thảo mộc tự nhiên",
        unit: testServiceUnit,
        price: testServicePrice,
      },
    });

    // 5. Tạo tài khoản thanh toán giả lập
    await prisma.paymentAccount.create({
      data: {
        cardType: "ATM",
        accountNumber: testAccountNum,
        accountHolder: "FEAT10 TESTER",
        balance: 50000000,
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

    // 7. Tạo một Booking và Check-in vào phòng testOccupiedRoom
    const today = new Date();
    const fromDate = new Date(today.getTime() + 1 * 24 * 60 * 60 * 1000)
      .toISOString()
      .split("T")[0];
    const toDate = new Date(today.getTime() + 3 * 24 * 60 * 60 * 1000)
      .toISOString()
      .split("T")[0];

    const bookingRes = await request("/api/public/bookings", {
      method: "POST",
      body: JSON.stringify({
        customerName: "Đỗ Phương Anh",
        customerPhone: "0988776655",
        customerEmail: testEmail,
        customerCccd: "001202610101",
        fromDate,
        toDate,
        paymentOption: "FULL_100",
        paymentAccountNumber: testAccountNum,
        items: [{ roomType: "VIP", roomSize: "SINGLE", quantity: 1 }],
      }),
    });

    assert.equal(bookingRes.status, 201, "Booking setup must succeed");
    createdBookingId = bookingRes.body.data.booking.id;
    createdBookingNumber = bookingRes.body.data.booking.bookingNumber;

    // Check-in booking vào testOccupiedRoom
    const checkinRes = await request(
      `/api/operation/bookings/${createdBookingId}/check-in`,
      {
        method: "POST",
        headers: { Authorization: `Bearer ${saleToken}` },
        body: JSON.stringify({
          assignments: [
            {
              roomId: testOccupiedRoom,
              roomType: "VIP",
              roomSize: "SINGLE",
              guests: [
                {
                  fullName: "Đỗ Phương Anh",
                  idNumber: "001202610101",
                  birthYear: 2000,
                  guestType: "ADULT",
                },
              ],
            },
          ],
        }),
      },
    );

    assert.equal(checkinRes.status, 200, "Checkin must succeed");
  });

  after(async () => {
    // Dọn dẹp dữ liệu test
    if (server) {
      server.close();
    }
    await prisma.serviceUsage.deleteMany({
      where: {
        OR: [
          { serviceId: testServiceId },
          { roomId: { in: [testOccupiedRoom, testAvailableRoom, testMaintenanceRoom] } },
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
          { roomId: { in: [testOccupiedRoom, testAvailableRoom, testMaintenanceRoom] } },
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
      where: { roomId: { in: [testOccupiedRoom, testAvailableRoom, testMaintenanceRoom] } },
    });
  });

  test("1. Strict Disjoint RBAC: ADMIN và MANAGER gọi /api/operation/services/* bị từ chối 403, SALE được phép truy cập (200 OK)", async () => {
    // ADMIN gọi -> 403 Forbidden
    const adminRes = await request("/api/operation/services/occupied-rooms", {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    assert.equal(adminRes.status, 403);
    assert.equal(adminRes.body.error.code, "FORBIDDEN_ACCESS");

    // MANAGER gọi -> 403 Forbidden
    const managerRes = await request("/api/operation/services/occupied-rooms", {
      headers: { Authorization: `Bearer ${managerToken}` },
    });
    assert.equal(managerRes.status, 403);
    assert.equal(managerRes.body.error.code, "FORBIDDEN_ACCESS");

    // SALE gọi -> 200 OK
    const saleRes = await request("/api/operation/services/occupied-rooms", {
      headers: { Authorization: `Bearer ${saleToken}` },
    });
    assert.equal(saleRes.status, 200);
    assert.equal(saleRes.body.success, true);
  });

  test("2. Lấy danh mục dịch vụ có sẵn qua GET /api/operation/services/catalog trả về danh sách hợp lệ", async () => {
    const res = await request("/api/operation/services/catalog", {
      headers: { Authorization: `Bearer ${saleToken}` },
    });

    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.ok(Array.isArray(res.body.data));
    assert.ok(res.body.data.length >= 1);

    const testSrv = res.body.data.find((s) => s.serviceId === testServiceId);
    assert.ok(testSrv, "Danh mục phải chứa dịch vụ test vừa tạo");
    assert.equal(testSrv.serviceName, testServiceName);
    assert.equal(testSrv.price, testServicePrice);
    assert.equal(testSrv.unit, testServiceUnit);
  });

  test("3. Chặn đăng ký dịch vụ cho phòng không tồn tại -> 404 RESOURCE_NOT_FOUND", async () => {
    const res = await request("/api/operation/services/usage", {
      method: "POST",
      headers: { Authorization: `Bearer ${saleToken}` },
      body: JSON.stringify({
        roomId: "ROOM-999-NONEXISTENT",
        serviceId: testServiceId,
        quantity: 1,
      }),
    });

    assert.equal(res.status, 404);
    assert.equal(res.body.error.code, "RESOURCE_NOT_FOUND");
  });

  test("4. Verification Gate 1: Chặn đăng ký dịch vụ cho phòng không ở trạng thái OCCUPIED (AVAILABLE / MAINTENANCE) -> 400 ROOM_NOT_OCCUPIED", async () => {
    // Thử với phòng AVAILABLE
    const availRes = await request("/api/operation/services/usage", {
      method: "POST",
      headers: { Authorization: `Bearer ${saleToken}` },
      body: JSON.stringify({
        roomId: testAvailableRoom,
        serviceId: testServiceId,
        quantity: 1,
      }),
    });

    assert.equal(availRes.status, 400);
    assert.equal(availRes.body.error.code, "ROOM_NOT_OCCUPIED");
    assert.ok(
      availRes.body.error.message.includes("OCCUPIED"),
      "Message phải giải thích chỉ dành cho phòng OCCUPIED",
    );

    // Thử với phòng MAINTENANCE
    const maintRes = await request("/api/operation/services/usage", {
      method: "POST",
      headers: { Authorization: `Bearer ${saleToken}` },
      body: JSON.stringify({
        roomId: testMaintenanceRoom,
        serviceId: testServiceId,
        quantity: 1,
      }),
    });

    assert.equal(maintRes.status, 400);
    assert.equal(maintRes.body.error.code, "ROOM_NOT_OCCUPIED");
  });

  test("5. Validate thông tin: Thiếu roomId, thiếu serviceId hoặc quantity <= 0 -> 400 VALIDATION_FAILED", async () => {
    // Thiếu roomId
    const noRoom = await request("/api/operation/services/usage", {
      method: "POST",
      headers: { Authorization: `Bearer ${saleToken}` },
      body: JSON.stringify({
        roomId: "",
        serviceId: testServiceId,
        quantity: 1,
      }),
    });
    assert.equal(noRoom.status, 400);
    assert.equal(noRoom.body.error.code, "VALIDATION_FAILED");

    // Thiếu serviceId
    const noSrv = await request("/api/operation/services/usage", {
      method: "POST",
      headers: { Authorization: `Bearer ${saleToken}` },
      body: JSON.stringify({
        roomId: testOccupiedRoom,
        serviceId: "",
        quantity: 1,
      }),
    });
    assert.equal(noSrv.status, 400);
    assert.equal(noSrv.body.error.code, "VALIDATION_FAILED");

    // quantity <= 0
    const invalidQty = await request("/api/operation/services/usage", {
      method: "POST",
      headers: { Authorization: `Bearer ${saleToken}` },
      body: JSON.stringify({
        roomId: testOccupiedRoom,
        serviceId: testServiceId,
        quantity: 0,
      }),
    });
    assert.equal(invalidQty.status, 400);
    assert.equal(invalidQty.body.error.code, "VALIDATION_FAILED");
  });

  test("6. Validate dịch vụ không tồn tại trong hệ thống -> 400 SERVICE_NOT_FOUND", async () => {
    const res = await request("/api/operation/services/usage", {
      method: "POST",
      headers: { Authorization: `Bearer ${saleToken}` },
      body: JSON.stringify({
        roomId: testOccupiedRoom,
        serviceId: "SRV-NONEXISTENT-999",
        quantity: 1,
      }),
    });

    assert.equal(res.status, 400);
    assert.equal(res.body.error.code, "SERVICE_NOT_FOUND");
  });

  test("7. Đăng ký dịch vụ cho phòng đang OCCUPIED thành công: Sinh ticketId định dạng TK-YYYYMMDD-XXXX, lưu ServiceUsage, tính đúng tổng tiền (201 Created)", async () => {
    const quantity = 3;
    const res = await request("/api/operation/services/usage", {
      method: "POST",
      headers: { Authorization: `Bearer ${saleToken}` },
      body: JSON.stringify({
        roomId: testOccupiedRoom,
        serviceId: testServiceId,
        quantity,
      }),
    });

    assert.equal(res.status, 201);
    assert.equal(res.body.success, true);
    assert.ok(res.body.data);

    const ticket = res.body.data;
    assert.ok(ticket.ticketId);
    assert.match(
      ticket.ticketId,
      /^TK-\d{8}-[A-Z0-9]{4}$/,
      "Mã ticketId phải có định dạng TK-YYYYMMDD-XXXX",
    );
    assert.equal(ticket.roomId, testOccupiedRoom);
    assert.equal(ticket.serviceId, testServiceId);
    assert.equal(ticket.serviceName, testServiceName);
    assert.equal(ticket.unit, testServiceUnit);
    assert.equal(ticket.quantity, quantity);
    assert.equal(ticket.unitPrice, testServicePrice);
    assert.equal(ticket.totalPrice, testServicePrice * quantity);
    assert.equal(ticket.customerName, "Đỗ Phương Anh");
    assert.equal(ticket.bookingNumber, createdBookingNumber);

    createdTicketId = ticket.ticketId;

    // Kiểm tra trực tiếp trong DB
    const dbTicket = await prisma.serviceUsage.findUnique({
      where: { ticketId: createdTicketId },
    });
    assert.ok(dbTicket);
    assert.equal(Number(dbTicket.totalPrice), testServicePrice * quantity);
  });

  test("8. Verification Gate 2: Tra cứu chi tiết phiếu in dịch vụ qua GET /api/operation/services/tickets/:ticketId hiển thị đầy đủ mã phiếu, số phòng, tên dịch vụ, số lượng, đơn giá, thành tiền", async () => {
    assert.ok(createdTicketId, "Phải có ticketId từ test trước");

    const res = await request(`/api/operation/services/tickets/${createdTicketId}`, {
      headers: { Authorization: `Bearer ${saleToken}` },
    });

    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);

    const ticket = res.body.data;
    assert.equal(ticket.ticketId, createdTicketId);
    assert.equal(ticket.roomId, testOccupiedRoom);
    assert.equal(ticket.serviceName, testServiceName);
    assert.equal(ticket.quantity, 3);
    assert.equal(ticket.unitPrice, testServicePrice);
    assert.equal(ticket.totalPrice, testServicePrice * 3);
    assert.equal(ticket.bookingNumber, createdBookingNumber);
    assert.equal(ticket.customerName, "Đỗ Phương Anh");
    assert.ok(ticket.createdAt);
    assert.ok(Array.isArray(ticket.stayingGuests));
    assert.equal(ticket.stayingGuests.length, 1);
    assert.equal(ticket.stayingGuests[0].fullName, "Đỗ Phương Anh");
  });

  test("9. Lấy danh sách các phòng đang OCCUPIED qua GET /api/operation/services/occupied-rooms hiển thị đúng phòng và thông tin booking", async () => {
    const res = await request("/api/operation/services/occupied-rooms", {
      headers: { Authorization: `Bearer ${saleToken}` },
    });

    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.ok(Array.isArray(res.body.data));

    const foundRoom = res.body.data.find((r) => r.roomId === testOccupiedRoom);
    assert.ok(foundRoom, "Danh sách phòng OCCUPIED phải chứa phòng testOccupiedRoom");
    assert.equal(foundRoom.status, "OCCUPIED");
    assert.equal(foundRoom.bookingNumber, createdBookingNumber);
    assert.equal(foundRoom.customerName, "Đỗ Phương Anh");
  });

  test("10. GET /api/operation/services/tickets hỗ trợ tra cứu lịch sử phiếu dịch vụ theo phòng hoặc từ khóa", async () => {
    const res = await request(
      `/api/operation/services/tickets?roomId=${testOccupiedRoom}&keyword=${createdTicketId}`,
      {
        headers: { Authorization: `Bearer ${saleToken}` },
      },
    );

    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.ok(res.body.data.total >= 1);
    assert.equal(res.body.data.tickets[0].ticketId, createdTicketId);
    assert.equal(res.body.data.tickets[0].roomId, testOccupiedRoom);
  });

  test("11. Pessimistic Locking & Concurrency: Đăng ký nhiều dịch vụ đồng thời cho phòng đang OCCUPIED đều thành công và tính đúng tổng tiền phát sinh", async () => {
    // Đăng ký 3 dịch vụ đồng thời
    const concurrentRequests = [1, 2, 3].map((qty) =>
      request("/api/operation/services/usage", {
        method: "POST",
        headers: { Authorization: `Bearer ${saleToken}` },
        body: JSON.stringify({
          roomId: testOccupiedRoom,
          serviceId: testServiceId,
          quantity: qty,
        }),
      }),
    );

    const responses = await Promise.all(concurrentRequests);
    for (const r of responses) {
      assert.equal(r.status, 201, "Mọi request đồng thời cho phòng OCCUPIED phải thành công");
      assert.ok(r.body.data.ticketId);
    }

    // Kiểm tra tổng số phiếu của booking này
    const allTickets = await prisma.serviceUsage.findMany({
      where: { bookingId: createdBookingId },
    });

    // Ban đầu test 7 tạo 1 phiếu (qty 3), test 11 tạo thêm 3 phiếu (qty 1 + 2 + 3 = 6) => tổng 4 phiếu, tổng số lượng 9
    assert.equal(allTickets.length, 4);
    const totalQty = allTickets.reduce((sum, t) => sum + t.quantity, 0);
    assert.equal(totalQty, 9);
    const totalAmount = allTickets.reduce((sum, t) => sum + Number(t.totalPrice), 0);
    assert.equal(totalAmount, 9 * testServicePrice);
  });
});
