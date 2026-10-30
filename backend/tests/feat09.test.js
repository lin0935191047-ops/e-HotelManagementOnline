import test, { describe, before, after } from "node:test";
import assert from "node:assert/strict";
import http from "node:http";
import { app } from "../src/main.js";
import { prisma } from "../src/common/prisma.js";

describe("FEAT-09: Booking Management & Check-in (Physical Room Assignment & Auto Child Surcharge)", () => {
  let server;
  let baseUrl;
  let saleToken;
  let adminToken;
  let managerToken;

  const testEmail = "feat09.tester@ehotel.local";
  const testAccountNum = "9999111122223333";

  // Phòng test chuyên dụng
  const testRoom101 = "TEST-101";
  const testRoom102 = "TEST-102";
  const testRoom201 = "TEST-201";
  const testRoom202 = "TEST-202";

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
    await prisma.stayingGuest.deleteMany({
      where: { booking: { customerEmail: testEmail } },
    });
    await prisma.roomAssignment.deleteMany({
      where: { booking: { customerEmail: testEmail } },
    });
    await prisma.bookingItem.deleteMany({
      where: { booking: { customerEmail: testEmail } },
    });
    await prisma.booking.deleteMany({
      where: { customerEmail: testEmail },
    });

    // Dọn dẹp phòng test & tài khoản test
    await prisma.paymentAccount.deleteMany({
      where: { accountNumber: testAccountNum },
    });
    await prisma.room.deleteMany({
      where: { roomId: { in: [testRoom101, testRoom102, testRoom201, testRoom202] } },
    });
    await prisma.paymentAccount.deleteMany({
      where: { accountNumber: testAccountNum },
    });

    // 3. Tạo các phòng test riêng biệt:
    // TEST-101: VIP SINGLE, maxChildren = 1, extraChildFee = 150000
    // TEST-102: VIP SINGLE, maxChildren = 1, extraChildFee = 150000
    // TEST-201: DELUX DOUBLE, maxChildren = 2, extraChildFee = 100000
    // TEST-202: DELUX DOUBLE, maxChildren = 2, extraChildFee = 100000
    await prisma.room.createMany({
      data: [
        {
          roomId: testRoom101,
          type: "VIP",
          size: "SINGLE",
          price: 1200000,
          maxAdults: 2,
          maxChildren: 1,
          extraChildFee: 150000,
          status: "AVAILABLE",
          description: "Phòng VIP Single Test 101",
        },
        {
          roomId: testRoom102,
          type: "VIP",
          size: "SINGLE",
          price: 1200000,
          maxAdults: 2,
          maxChildren: 1,
          extraChildFee: 150000,
          status: "AVAILABLE",
          description: "Phòng VIP Single Test 102",
        },
        {
          roomId: testRoom201,
          type: "DELUX",
          size: "DOUBLE",
          price: 1600000,
          maxAdults: 2,
          maxChildren: 2,
          extraChildFee: 100000,
          status: "AVAILABLE",
          description: "Phòng Delux Double Test 201",
        },
        {
          roomId: testRoom202,
          type: "DELUX",
          size: "DOUBLE",
          price: 1600000,
          maxAdults: 2,
          maxChildren: 2,
          extraChildFee: 100000,
          status: "AVAILABLE",
          description: "Phòng Delux Double Test 202",
        },
      ],
    });

    // Đảm bảo có tài khoản thanh toán giả lập với số dư dồi dào
    await prisma.paymentAccount.create({
      data: {
        cardType: "ATM",
        accountNumber: testAccountNum,
        accountHolder: "FEAT09 TEST HOLDER",
        balance: 100000000,
      },
    });

    // 4. Lấy Auth Token cho cả 3 vai trò
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
  });

  after(async () => {
    // Dọn dẹp
    await prisma.stayingGuest.deleteMany({
      where: { booking: { customerEmail: testEmail } },
    });
    await prisma.roomAssignment.deleteMany({
      where: { booking: { customerEmail: testEmail } },
    });
    await prisma.bookingItem.deleteMany({
      where: { booking: { customerEmail: testEmail } },
    });
    await prisma.booking.deleteMany({
      where: { customerEmail: testEmail },
    });
    await prisma.room.deleteMany({
      where: { roomId: { in: [testRoom101, testRoom102, testRoom201, testRoom202] } },
    });
    await prisma.paymentAccount.deleteMany({
      where: { accountNumber: testAccountNum },
    });

    if (server) {
      await new Promise((resolve) => server.close(resolve));
    }
  });

  test("1. Strict Disjoint RBAC: ADMIN và MANAGER gọi /api/operation/bookings bị từ chối 403, SALE thành công (200 OK)", async () => {
    // ADMIN gọi -> 403
    const adminRes = await request("/api/operation/bookings", {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    assert.equal(adminRes.status, 403);
    assert.equal(adminRes.body.error.code, "FORBIDDEN_ACCESS");

    // MANAGER gọi -> 403
    const managerRes = await request("/api/operation/bookings", {
      headers: { Authorization: `Bearer ${managerToken}` },
    });
    assert.equal(managerRes.status, 403);
    assert.equal(managerRes.body.error.code, "FORBIDDEN_ACCESS");

    // SALE gọi -> 200 OK
    const saleRes = await request("/api/operation/bookings", {
      headers: { Authorization: `Bearer ${saleToken}` },
    });
    assert.equal(saleRes.status, 200);
    assert.equal(saleRes.body.success, true);
    assert.ok(Array.isArray(saleRes.body.data.bookings));
  });

  test("2. SALE tìm kiếm danh sách booking theo keyword và trạng thái", async () => {
    // Tạo 1 booking test
    const fromDate = new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];
    const toDate = new Date(Date.now() + 4 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];

    const createRes = await request("/api/public/bookings", {
      method: "POST",
      body: JSON.stringify({
        customerName: "Nguyễn Văn Tìm Kiếm",
        customerPhone: "0988111222",
        customerEmail: testEmail,
        customerCccd: "001200333444",
        fromDate,
        toDate,
        items: [{ roomType: "VIP", roomSize: "SINGLE", quantity: 1 }],
        paymentOption: "FULL_100",
        paymentAccountNumber: testAccountNum,
      }),
    });
    assert.equal(createRes.status, 201);
    const bNumber = createRes.body.data.booking.bookingNumber;

    // Tìm theo keyword tên
    const searchByName = await request(`/api/operation/bookings?keyword=Tìm%20Kiếm`, {
      headers: { Authorization: `Bearer ${saleToken}` },
    });
    assert.equal(searchByName.status, 200);
    assert.ok(searchByName.body.data.bookings.length >= 1);
    assert.equal(searchByName.body.data.bookings[0].bookingNumber, bNumber);

    // Tìm theo keyword mã booking
    const searchByCode = await request(`/api/operation/bookings?keyword=${bNumber}`, {
      headers: { Authorization: `Bearer ${saleToken}` },
    });
    assert.equal(searchByCode.status, 200);
    assert.equal(searchByCode.body.data.bookings.length, 1);
    assert.equal(searchByCode.body.data.bookings[0].bookingNumber, bNumber);

    // Lọc theo trạng thái CONFIRMED
    const filterStatus = await request(`/api/operation/bookings?status=CONFIRMED&keyword=${bNumber}`, {
      headers: { Authorization: `Bearer ${saleToken}` },
    });
    assert.equal(filterStatus.status, 200);
    assert.equal(filterStatus.body.data.bookings[0].status, "CONFIRMED");
  });

  test("3. Lấy danh sách phòng vật lý khả dụng để check-in qua /available-rooms", async () => {
    // Tìm booking đã tạo ở test 2
    const b = await prisma.booking.findFirst({
      where: { customerEmail: testEmail },
    });
    assert.ok(b);

    const res = await request(`/api/operation/bookings/${b.id}/available-rooms`, {
      headers: { Authorization: `Bearer ${saleToken}` },
    });

    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.ok(res.body.data.requirements);
    assert.equal(res.body.data.requirements[0].roomType, "VIP");
    assert.equal(res.body.data.requirements[0].roomSize, "SINGLE");
    assert.equal(res.body.data.requirements[0].requiredQuantity, 1);
    // Phòng TEST-101 và TEST-102 phải nằm trong candidates
    const candidateIds = res.body.data.requirements[0].candidates.map((c) => c.roomId);
    assert.ok(candidateIds.includes(testRoom101));
  });

  test("4. Validate Check-in: Chặn khi thiếu assignments hoặc gán sai số lượng phòng", async () => {
    const b = await prisma.booking.findFirst({
      where: { customerEmail: testEmail },
    });

    // 1. Thiếu assignments
    const resNoAssign = await request(`/api/operation/bookings/${b.id}/check-in`, {
      method: "POST",
      headers: { Authorization: `Bearer ${saleToken}` },
      body: JSON.stringify({ assignments: [] }),
    });
    assert.equal(resNoAssign.status, 400);
    assert.equal(resNoAssign.body.error.code, "VALIDATION_FAILED");

    // 2. Gán thừa phòng (booking yêu cầu 1 phòng nhưng gán 2 phòng)
    const resTooMany = await request(`/api/operation/bookings/${b.id}/check-in`, {
      method: "POST",
      headers: { Authorization: `Bearer ${saleToken}` },
      body: JSON.stringify({
        assignments: [
          {
            roomId: testRoom101,
            guests: [{ fullName: "Khách 1", idNumber: "123", birthYear: 1990 }],
          },
          {
            roomId: testRoom102,
            guests: [{ fullName: "Khách 2", idNumber: "456", birthYear: 1992 }],
          },
        ],
      }),
    });
    assert.equal(resTooMany.status, 400);
    assert.equal(resTooMany.body.error.code, "VALIDATION_FAILED");
    assert.match(resTooMany.body.error.message, /không khớp với tổng số phòng yêu cầu/i);
  });

  test("5. Validate Check-in: Chặn khi gán sai loại phòng hoặc phòng chưa có khách", async () => {
    const b = await prisma.booking.findFirst({
      where: { customerEmail: testEmail },
    });

    // 1. Gán phòng DELUX DOUBLE (TEST-201) trong khi đơn đặt VIP SINGLE
    const resWrongType = await request(`/api/operation/bookings/${b.id}/check-in`, {
      method: "POST",
      headers: { Authorization: `Bearer ${saleToken}` },
      body: JSON.stringify({
        assignments: [
          {
            roomId: testRoom201,
            guests: [{ fullName: "Khách Sai Loại", idNumber: "123", birthYear: 1990 }],
          },
        ],
      }),
    });
    assert.equal(resWrongType.status, 400);
    assert.equal(resWrongType.body.error.code, "VALIDATION_FAILED");
    assert.match(resWrongType.body.error.message, /không có trong danh mục phòng khách đã đặt/i);

    // 2. Phòng không có khách lưu trú
    const resNoGuest = await request(`/api/operation/bookings/${b.id}/check-in`, {
      method: "POST",
      headers: { Authorization: `Bearer ${saleToken}` },
      body: JSON.stringify({
        assignments: [
          {
            roomId: testRoom101,
            guests: [],
          },
        ],
      }),
    });
    assert.equal(resNoGuest.status, 400);
    assert.equal(resNoGuest.body.error.code, "VALIDATION_FAILED");
    assert.match(resNoGuest.body.error.message, /chưa có danh sách khách lưu trú/i);
  });

  test("6. Gán số phòng vật lý thành công: chuyển phòng sang OCCUPIED, booking sang CHECKED_IN và lưu StayingGuest", async () => {
    const b = await prisma.booking.findFirst({
      where: { customerEmail: testEmail, status: "CONFIRMED" },
    });
    assert.ok(b);

    // Check-in với TEST-101 (1 người lớn, 1 trẻ em: childCount = 1 <= maxChildren(1) -> Không phụ thu)
    const checkinRes = await request(`/api/operation/bookings/${b.id}/check-in`, {
      method: "POST",
      headers: { Authorization: `Bearer ${saleToken}` },
      body: JSON.stringify({
        assignments: [
          {
            roomId: testRoom101,
            guests: [
              {
                fullName: "Nguyễn Văn Bố",
                idNumber: "001200111222",
                birthYear: 1988,
                guestType: "ADULT",
              },
              {
                fullName: "Nguyễn Con Một",
                idNumber: "KHAI-SINH-01",
                birthYear: 2018, // 8 tuổi -> CHILD
              },
            ],
          },
        ],
      }),
    });

    assert.equal(checkinRes.status, 200);
    assert.equal(checkinRes.body.success, true);
    assert.equal(checkinRes.body.data.booking.status, "CHECKED_IN");
    assert.equal(checkinRes.body.data.booking.extraChildrenFee, 0); // Không vượt quá maxChildren=1
    assert.equal(checkinRes.body.data.assignments.length, 1);
    assert.equal(checkinRes.body.data.assignments[0].roomId, testRoom101);
    assert.equal(checkinRes.body.data.assignments[0].guests.length, 2);

    // Kiểm tra trong cơ sở dữ liệu
    const dbRoom = await prisma.room.findUnique({ where: { roomId: testRoom101 } });
    assert.equal(dbRoom.status, "OCCUPIED");

    const dbBooking = await prisma.booking.findUnique({ where: { id: b.id } });
    assert.equal(dbBooking.status, "CHECKED_IN");

    const dbGuests = await prisma.stayingGuest.findMany({ where: { bookingId: b.id } });
    assert.equal(dbGuests.length, 2);
  });

  test("7. Chặn gán vào phòng đã OCCUPIED -> 400 ROOM_ALREADY_OCCUPIED", async () => {
    // Tạo 1 booking mới cho VIP SINGLE
    const fromDate = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];
    const toDate = new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];

    const createRes = await request("/api/public/bookings", {
      method: "POST",
      body: JSON.stringify({
        customerName: "Khách Thử Trùng Phòng",
        customerPhone: "0911223344",
        customerEmail: testEmail,
        customerCccd: "001200778899",
        fromDate,
        toDate,
        items: [{ roomType: "VIP", roomSize: "SINGLE", quantity: 1 }],
        paymentOption: "FULL_100",
        paymentAccountNumber: testAccountNum,
      }),
    });
    assert.equal(createRes.status, 201);
    const newBookingId = createRes.body.data.booking.id;

    // Thử check-in vào TEST-101 (đã OCCUPIED ở test 6)
    const resOccupied = await request(`/api/operation/bookings/${newBookingId}/check-in`, {
      method: "POST",
      headers: { Authorization: `Bearer ${saleToken}` },
      body: JSON.stringify({
        assignments: [
          {
            roomId: testRoom101, // Đang OCCUPIED!
            guests: [{ fullName: "Khách Đi Sau", idNumber: "999", birthYear: 1995 }],
          },
        ],
      }),
    });

    assert.equal(resOccupied.status, 400);
    assert.equal(resOccupied.body.error.code, "ROOM_ALREADY_OCCUPIED");
    assert.match(resOccupied.body.error.message, /không khả dụng/i);
  });

  test("8. Tự động tính phụ thu trẻ em khi số trẻ em trong phòng > Room.maxChildren (SPEC 4.4)", async () => {
    // TEST-102 có maxChildren = 1, extraChildFee = 150.000đ/đêm
    // Đặt phòng 3 đêm
    const fromDate = new Date(Date.now() + 10 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];
    const toDate = new Date(Date.now() + 13 * 24 * 60 * 60 * 1000).toISOString().split("T")[0]; // 3 đêm

    const createRes = await request("/api/public/bookings", {
      method: "POST",
      body: JSON.stringify({
        customerName: "Gia Đình Đông Trẻ Em",
        customerPhone: "0933445566",
        customerEmail: testEmail,
        customerCccd: "001200556677",
        fromDate,
        toDate,
        items: [{ roomType: "VIP", roomSize: "SINGLE", quantity: 1 }],
        paymentOption: "FULL_100",
        paymentAccountNumber: testAccountNum,
      }),
    });
    assert.equal(createRes.status, 201);
    const booking = createRes.body.data.booking;
    assert.equal(booking.nights, 3);

    // Gán vào phòng TEST-102:
    // Khách: 1 người lớn + 3 trẻ em (sinh 2017, 2019, 2021)
    // childCount = 3 > Room.maxChildren (1)
    // excessChildren = 3 - 1 = 2 trẻ em vượt định mức
    // roomExtraChildFee = 2 trẻ * 150.000đ * 3 đêm = 900.000đ
    const checkinRes = await request(`/api/operation/bookings/${booking.id}/check-in`, {
      method: "POST",
      headers: { Authorization: `Bearer ${saleToken}` },
      body: JSON.stringify({
        assignments: [
          {
            roomId: testRoom102,
            guests: [
              { fullName: "Nguyễn Mẹ Trẻ", idNumber: "001200998877", birthYear: 1992, guestType: "ADULT" },
              { fullName: "Bé Thứ Nhất", idNumber: "KS-01", birthYear: 2017 },
              { fullName: "Bé Thứ Hai", idNumber: "KS-02", birthYear: 2019 },
              { fullName: "Bé Thứ Ba", idNumber: "KS-03", birthYear: 2021 },
            ],
          },
        ],
      }),
    });

    assert.equal(checkinRes.status, 200);
    assert.equal(checkinRes.body.success, true);
    assert.equal(checkinRes.body.data.booking.status, "CHECKED_IN");

    // Kiểm tra tiền phụ thu trẻ em tự động tính đúng 900.000đ
    const expectedSurcharge = 2 * 150000 * 3;
    assert.equal(checkinRes.body.data.booking.extraChildrenFee, expectedSurcharge);
    assert.equal(checkinRes.body.data.surchargeBreakdown.totalExtraChildrenFee, expectedSurcharge);
    assert.equal(checkinRes.body.data.surchargeBreakdown.rooms[0].excessChildren, 2);
    assert.equal(checkinRes.body.data.surchargeBreakdown.rooms[0].roomExtraChildFee, expectedSurcharge);

    // Kiểm tra trong DB
    const dbBooking = await prisma.booking.findUnique({ where: { id: booking.id } });
    assert.equal(Number(dbBooking.extraChildrenFee), expectedSurcharge);
    assert.equal(dbBooking.status, "CHECKED_IN");
  });

  test("9. Pessimistic Locking & Concurrency: Check-in đồng thời cùng 1 phòng chỉ 1 request thành công", async () => {
    // TEST-201 đang AVAILABLE
    // Tạo 2 bookings riêng biệt đều đặt DELUX DOUBLE
    const fromDate = new Date(Date.now() + 20 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];
    const toDate = new Date(Date.now() + 22 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];

    const [bRes1, bRes2] = await Promise.all([
      request("/api/public/bookings", {
        method: "POST",
        body: JSON.stringify({
          customerName: "Khách Tranh Chấp A",
          customerPhone: "0966112233",
          customerEmail: testEmail,
          customerCccd: "001200112211",
          fromDate,
          toDate,
          items: [{ roomType: "DELUX", roomSize: "DOUBLE", quantity: 1 }],
          paymentOption: "FULL_100",
          paymentAccountNumber: testAccountNum,
        }),
      }),
      request("/api/public/bookings", {
        method: "POST",
        body: JSON.stringify({
          customerName: "Khách Tranh Chấp B",
          customerPhone: "0966445566",
          customerEmail: testEmail,
          customerCccd: "001200223322",
          fromDate,
          toDate,
          items: [{ roomType: "DELUX", roomSize: "DOUBLE", quantity: 1 }],
          paymentOption: "FULL_100",
          paymentAccountNumber: testAccountNum,
        }),
      }),
    ]);

    assert.equal(bRes1.status, 201);
    assert.equal(bRes2.status, 201);
    const bId1 = bRes1.body.data.booking.id;
    const bId2 = bRes2.body.data.booking.id;

    // Cả 2 cùng cố check-in vào TEST-201 cùng một lúc
    const payload1 = {
      assignments: [
        {
          roomId: testRoom201,
          guests: [{ fullName: "Khách A", idNumber: "CCCD-A", birthYear: 1990 }],
        },
      ],
    };
    const payload2 = {
      assignments: [
        {
          roomId: testRoom201,
          guests: [{ fullName: "Khách B", idNumber: "CCCD-B", birthYear: 1991 }],
        },
      ],
    };

    const [ci1, ci2] = await Promise.all([
      request(`/api/operation/bookings/${bId1}/check-in`, {
        method: "POST",
        headers: { Authorization: `Bearer ${saleToken}` },
        body: JSON.stringify(payload1),
      }),
      request(`/api/operation/bookings/${bId2}/check-in`, {
        method: "POST",
        headers: { Authorization: `Bearer ${saleToken}` },
        body: JSON.stringify(payload2),
      }),
    ]);

    const statuses = [ci1.status, ci2.status].sort();
    assert.deepEqual(statuses, [200, 400], "Chính xác 1 request thành công (200) và 1 request thất bại (400)");

    const failed = ci1.status === 400 ? ci1 : ci2;
    assert.equal(failed.body.error.code, "ROOM_ALREADY_OCCUPIED");
  });
});
