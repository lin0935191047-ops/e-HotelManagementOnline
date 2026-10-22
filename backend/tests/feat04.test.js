import test, { describe, before, after } from "node:test";
import assert from "node:assert/strict";
import http from "node:http";
import { app } from "../src/main.js";
import { prisma } from "../src/common/prisma.js";

describe("FEAT-04: Setup Rooms with Booking Deletion Guard", () => {
  let server;
  let baseUrl;
  let managerToken;
  let adminToken;
  let saleToken;

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

    // 2. Lấy token Manager
    const managerRes = await fetch(`${baseUrl}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username: "manager", password: "Manager@123" }),
    });
    const managerData = await managerRes.json();
    managerToken = managerData.data.token;

    // 3. Lấy token Admin
    const adminRes = await fetch(`${baseUrl}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username: "admin", password: "Admin@123" }),
    });
    const adminData = await adminRes.json();
    adminToken = adminData.data.token;

    // 4. Lấy token Sale
    const saleRes = await fetch(`${baseUrl}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username: "sale", password: "Sale@123" }),
    });
    const saleData = await saleRes.json();
    saleToken = saleData.data.token;
  });

  after(async () => {
    // Dọn dẹp phòng test nếu còn sót
    await prisma.roomAssignment.deleteMany({
      where: { roomId: { in: ["TEST-301", "TEST-302", "TEST-GUARD"] } },
    });
    await prisma.booking.deleteMany({
      where: { bookingNumber: { startsWith: "BK-TEST-GUARD" } },
    });
    await prisma.room.deleteMany({
      where: { roomId: { in: ["TEST-301", "TEST-302", "TEST-GUARD"] } },
    });

    await new Promise((resolve) => server.close(resolve));
    await prisma.$disconnect();
  });

  // -------------------------------------------------------------
  // Test 1: Lấy danh sách phòng (MANAGER)
  // -------------------------------------------------------------
  test("1. GET /api/setup/rooms trả về danh sách phòng vật lý (200 OK)", async () => {
    const res = await fetch(`${baseUrl}/api/setup/rooms`, {
      headers: { Authorization: `Bearer ${managerToken}` },
    });
    assert.strictEqual(res.status, 200);
    const body = await res.json();
    assert.strictEqual(body.success, true);
    assert.ok(Array.isArray(body.data), "data phải là mảng");
    assert.ok(body.data.length >= 5, "Hệ thống có ít nhất 5 phòng mẫu");

    const sample = body.data[0];
    assert.ok(sample.roomId, "Phải có roomId");
    assert.ok(sample.type, "Phải có type");
    assert.ok(sample.size, "Phải có size");
    assert.ok(sample.price !== undefined, "Phải có price");
    assert.ok(Array.isArray(sample.pictures), "pictures phải là mảng");
  });

  // -------------------------------------------------------------
  // Test 2: Tạo phòng mới với mảng URL hình ảnh
  // -------------------------------------------------------------
  test("2. POST /api/setup/rooms tạo phòng mới với mảng URL hình ảnh thành công (201 Created)", async () => {
    const roomPayload = {
      roomId: "TEST-301",
      type: "DELUX",
      size: "DOUBLE",
      price: 1500000,
      maxAdults: 2,
      maxChildren: 1,
      extraChildFee: 200000,
      description: "Phòng Delux Double hướng biển tầng cao",
      pictures: [
        "https://images.unsplash.com/photo-1590490360182-c33d57733427",
        "https://images.unsplash.com/photo-1582719478250-c89cae4dc85b",
      ],
      status: "AVAILABLE",
    };

    const res = await fetch(`${baseUrl}/api/setup/rooms`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${managerToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(roomPayload),
    });

    assert.strictEqual(res.status, 201);
    const body = await res.json();
    assert.strictEqual(body.success, true);
    assert.strictEqual(body.data.roomId, "TEST-301");
    assert.strictEqual(body.data.type, "DELUX");
    assert.strictEqual(body.data.size, "DOUBLE");
    assert.strictEqual(Number(body.data.price), 1500000);
    assert.strictEqual(body.data.pictures.length, 2);
    assert.strictEqual(body.data.status, "AVAILABLE");
  });

  // -------------------------------------------------------------
  // Test 3: Validate không cho phép tạo trùng roomId
  // -------------------------------------------------------------
  test("3. Validate không cho phép tạo trùng roomId (400 Bad Request)", async () => {
    const res = await fetch(`${baseUrl}/api/setup/rooms`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${managerToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        roomId: "TEST-301", // Trùng với phòng vừa tạo
        type: "VIP",
        size: "SINGLE",
        price: 2000000,
        maxAdults: 1,
      }),
    });

    assert.strictEqual(res.status, 400);
    const body = await res.json();
    assert.strictEqual(body.success, false);
    assert.strictEqual(body.error.code, "VALIDATION_FAILED");
    assert.match(body.error.message, /đã tồn tại/);
  });

  // -------------------------------------------------------------
  // Test 4: Validate tham số không hợp lệ (Type, Size, Price <= 0)
  // -------------------------------------------------------------
  test("4. Validate loại phòng, kích thước hoặc giá không hợp lệ trả về 400", async () => {
    // Sai loại phòng
    const resInvalidType = await fetch(`${baseUrl}/api/setup/rooms`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${managerToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        roomId: "TEST-INVALID-1",
        type: "PRESIDENTIAL", // Không hợp lệ
        size: "SINGLE",
        price: 1000000,
        maxAdults: 2,
      }),
    });
    assert.strictEqual(resInvalidType.status, 400);

    // Sai giá (âm hoặc bằng 0)
    const resInvalidPrice = await fetch(`${baseUrl}/api/setup/rooms`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${managerToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        roomId: "TEST-INVALID-2",
        type: "VIP",
        size: "SINGLE",
        price: -500,
        maxAdults: 2,
      }),
    });
    assert.strictEqual(resInvalidPrice.status, 400);
  });

  // -------------------------------------------------------------
  // Test 5: Xem chi tiết phòng
  // -------------------------------------------------------------
  test("5. GET /api/setup/rooms/:roomId xem chi tiết phòng", async () => {
    const res = await fetch(`${baseUrl}/api/setup/rooms/TEST-301`, {
      headers: { Authorization: `Bearer ${managerToken}` },
    });
    assert.strictEqual(res.status, 200);
    const body = await res.json();
    assert.strictEqual(body.data.roomId, "TEST-301");
    assert.strictEqual(body.data.type, "DELUX");
  });

  // -------------------------------------------------------------
  // Test 6: Cập nhật phòng (sửa giá, mô tả, hình ảnh, trạng thái)
  // -------------------------------------------------------------
  test("6. PUT /api/setup/rooms/:roomId cập nhật thông tin phòng thành công", async () => {
    const res = await fetch(`${baseUrl}/api/setup/rooms/TEST-301`, {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${managerToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        price: 1800000,
        description: "Phòng Delux Double đã sửa sang mới",
        pictures: [
          "https://images.unsplash.com/photo-new-1",
          "https://images.unsplash.com/photo-new-2",
          "https://images.unsplash.com/photo-new-3",
        ],
        status: "MAINTENANCE",
      }),
    });

    assert.strictEqual(res.status, 200);
    const body = await res.json();
    assert.strictEqual(Number(body.data.price), 1800000);
    assert.strictEqual(body.data.description, "Phòng Delux Double đã sửa sang mới");
    assert.strictEqual(body.data.pictures.length, 3);
    assert.strictEqual(body.data.status, "MAINTENANCE");
  });

  // -------------------------------------------------------------
  // Test 7: Xóa phòng chưa có lịch sử gán phòng -> 200 OK
  // -------------------------------------------------------------
  test("7. DELETE /api/setup/rooms/:roomId xóa phòng chưa có lịch sử thành công (200 OK)", async () => {
    const res = await fetch(`${baseUrl}/api/setup/rooms/TEST-301`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${managerToken}` },
    });
    assert.strictEqual(res.status, 200);
    const body = await res.json();
    assert.strictEqual(body.success, true);

    // Xác nhận đã biến mất khỏi cơ sở dữ liệu
    const checkRes = await fetch(`${baseUrl}/api/setup/rooms/TEST-301`, {
      headers: { Authorization: `Bearer ${managerToken}` },
    });
    assert.strictEqual(checkRes.status, 404);
  });

  // -------------------------------------------------------------
  // Test 8: Booking Deletion Guard: Chặn xóa phòng đã từng có booking
  // -------------------------------------------------------------
  test("8. Booking Deletion Guard: Xóa phòng đã có lịch sử gán phòng bị từ chối 400 (ROOM_CANNOT_BE_DELETED)", async () => {
    // 1. Tạo phòng TEST-GUARD
    await prisma.room.create({
      data: {
        roomId: "TEST-GUARD",
        type: "VIP",
        size: "SINGLE",
        price: 1200000,
        maxAdults: 1,
        maxChildren: 0,
        extraChildFee: 0,
        status: "OCCUPIED",
      },
    });

    // 2. Tạo một booking giả lập
    const booking = await prisma.booking.create({
      data: {
        bookingNumber: "BK-TEST-GUARD-001",
        customerName: "Khách Kiểm Thử Guard",
        customerPhone: "0901234567",
        customerEmail: "guard@ehotel.test",
        customerCccd: "012345678901",
        fromDate: new Date("2026-11-01T14:00:00Z"),
        toDate: new Date("2026-11-03T12:00:00Z"),
        totalRoomFee: 2400000,
        netRoomFee: 2400000,
        paymentOption: "FULL_100",
        prepaidBookingValue: 2400000,
        paymentAccountNumber: "9704000000000001",
        status: "CONFIRMED",
      },
    });

    // 3. Gán phòng TEST-GUARD vào booking (RoomAssignment)
    await prisma.roomAssignment.create({
      data: {
        bookingId: booking.id,
        roomId: "TEST-GUARD",
      },
    });

    // 4. Thử xóa phòng TEST-GUARD qua API
    const res = await fetch(`${baseUrl}/api/setup/rooms/TEST-GUARD`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${managerToken}` },
    });

    assert.strictEqual(res.status, 400);
    const body = await res.json();
    assert.strictEqual(body.success, false);
    assert.strictEqual(body.error.code, "ROOM_CANNOT_BE_DELETED");
    assert.match(body.error.message, /lịch sử/);

    // 5. Kiểm tra phòng TEST-GUARD vẫn còn nguyên vẹn trong Database
    const checkRoom = await prisma.room.findUnique({
      where: { roomId: "TEST-GUARD" },
    });
    assert.ok(checkRoom, "Phòng TEST-GUARD không được bị xóa");
  });

  // -------------------------------------------------------------
  // Test 9: Strict Disjoint RBAC: ADMIN và SALE không được truy cập Setup Rooms
  // -------------------------------------------------------------
  test("9. Strict Disjoint RBAC: ADMIN và SALE gọi /api/setup/rooms bị trả về 403 Forbidden", async () => {
    const adminRes = await fetch(`${baseUrl}/api/setup/rooms`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    assert.strictEqual(adminRes.status, 403);

    const saleRes = await fetch(`${baseUrl}/api/setup/rooms`, {
      headers: { Authorization: `Bearer ${saleToken}` },
    });
    assert.strictEqual(saleRes.status, 403);
  });
});
