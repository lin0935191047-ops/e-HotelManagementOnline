import test, { describe, before, after } from "node:test";
import assert from "node:assert/strict";
import http from "node:http";
import { app } from "../src/main.js";
import { prisma } from "../src/common/prisma.js";
import { CatalogService } from "../src/services/catalog.service.js";

describe("FEAT-06: Room Catalog & Inventory-based Availability Search", () => {
  let server;
  let baseUrl;
  let testBookingId;

  before(async () => {
    // 1. Khởi động HTTP server test trên port ngẫu nhiên
    server = http.createServer(app);
    await new Promise((resolve) => {
      server.listen(0, "127.0.0.1", () => {
        const address = server.address();
        baseUrl = `http://127.0.0.1:${address.port}`;
        resolve();
      });
    });

    // 2. Dọn dẹp dữ liệu test cũ nếu có
    await prisma.bookingItem.deleteMany({
      where: { booking: { bookingNumber: "BK-TEST-FEAT06" } },
    });
    await prisma.booking.deleteMany({
      where: { bookingNumber: "BK-TEST-FEAT06" },
    });
  });

  after(async () => {
    // Dọn dẹp dữ liệu sau khi chạy test
    if (testBookingId) {
      await prisma.bookingItem.deleteMany({
        where: { bookingId: testBookingId },
      });
      await prisma.booking.deleteMany({
        where: { id: testBookingId },
      });
    }
    await prisma.room.deleteMany({
      where: { roomId: "TEST-MAINT-999" },
    });

    if (server) {
      server.close();
    }
  });

  test("1. Khách hàng truy cập GET /api/public/rooms thành công mà không cần đăng nhập", async () => {
    const res = await fetch(`${baseUrl}/api/public/rooms`);
    assert.equal(res.status, 200);

    const body = await res.json();
    assert.equal(body.success, true);
    assert.ok(Array.isArray(body.data), "body.data phải là mảng các phòng vật lý");
    assert.ok(Array.isArray(body.categories), "body.categories phải là mảng các hạng phòng");
    assert.ok(body.totalRooms > 0);

    // Kiểm tra cấu trúc category
    const vipDouble = body.categories.find(
      (c) => c.type === "VIP" && c.size === "DOUBLE",
    );
    assert.ok(vipDouble, "Phải tìm thấy hạng phòng VIP DOUBLE");
    assert.ok(vipDouble.price > 0);
    assert.ok(vipDouble.maxAdults >= 1);
    assert.ok(Array.isArray(vipDouble.pictures));
  });

  test("2. Lọc danh mục phòng theo loại (type=DELUX) và kích cỡ (size=DOUBLE)", async () => {
    const res = await fetch(
      `${baseUrl}/api/public/rooms?type=DELUX&size=DOUBLE`,
    );
    assert.equal(res.status, 200);

    const body = await res.json();
    assert.equal(body.success, true);
    for (const cat of body.categories) {
      assert.equal(cat.type, "DELUX");
      assert.equal(cat.size, "DOUBLE");
    }
    for (const r of body.data) {
      assert.equal(r.type, "DELUX");
      assert.equal(r.size, "DOUBLE");
    }
  });

  test("3. Xem chi tiết phòng hợp lệ qua GET /api/public/rooms/:roomId", async () => {
    const res = await fetch(`${baseUrl}/api/public/rooms/101`);
    assert.equal(res.status, 200);

    const body = await res.json();
    assert.equal(body.success, true);
    assert.equal(body.data.roomId, "101");
    assert.equal(body.data.type, "VIP");
    assert.equal(body.data.size, "DOUBLE");
    assert.ok(body.data.categoryName.includes("VIP"));
    assert.ok(body.data.price > 0);
  });

  test("4. Xem chi tiết phòng không tồn tại trả về 404 RESOURCE_NOT_FOUND", async () => {
    const res = await fetch(`${baseUrl}/api/public/rooms/ROOM-DOES-NOT-EXIST`);
    assert.equal(res.status, 404);

    const body = await res.json();
    assert.equal(body.success, false);
    assert.equal(body.error.code, "RESOURCE_NOT_FOUND");
  });

  test("5. Validate tìm kiếm phòng: Thiếu fromDate hoặc toDate trả về 400 VALIDATION_FAILED", async () => {
    const res = await fetch(`${baseUrl}/api/public/availability`);
    assert.equal(res.status, 400);

    const body = await res.json();
    assert.equal(body.success, false);
    assert.equal(body.error.code, "VALIDATION_FAILED");
  });

  test("6. Validate tìm kiếm phòng: toDate <= fromDate trả về 400 INVALID_DATE_RANGE", async () => {
    const res = await fetch(
      `${baseUrl}/api/public/availability?fromDate=2026-12-10&toDate=2026-12-05`,
    );
    assert.equal(res.status, 400);

    const body = await res.json();
    assert.equal(body.success, false);
    assert.equal(body.error.code, "INVALID_DATE_RANGE");
  });

  test("7. Validate tìm kiếm phòng: fromDate bằng toDate trả về 400 INVALID_DATE_RANGE", async () => {
    const res = await fetch(
      `${baseUrl}/api/public/availability?fromDate=2026-12-05&toDate=2026-12-05`,
    );
    assert.equal(res.status, 400);

    const body = await res.json();
    assert.equal(body.success, false);
    assert.equal(body.error.code, "INVALID_DATE_RANGE");
  });

  test("8. Công thức tồn kho: AvailableQuota = TotalPhysicalRooms - BookedRooms (Chưa có booking)", async () => {
    // Tìm kiếm trong khoảng 2026-12-15 đến 2026-12-18
    const fromDate = "2026-12-15T14:00:00.000Z";
    const toDate = "2026-12-18T12:00:00.000Z";

    const res = await fetch(
      `${baseUrl}/api/public/availability?fromDate=${fromDate}&toDate=${toDate}&type=VIP&size=DOUBLE`,
    );
    assert.equal(res.status, 200);

    const body = await res.json();
    assert.equal(body.success, true);
    assert.equal(body.data.searchQuery.nights, 3);

    const vipDouble = body.data.categories.find(
      (c) => c.type === "VIP" && c.size === "DOUBLE",
    );
    assert.ok(vipDouble);
    assert.equal(vipDouble.bookedRooms, 0);
    assert.equal(vipDouble.availableQuota, vipDouble.totalPhysicalRooms);
    assert.equal(vipDouble.isAvailable, true);
  });

  test("9. Công thức tồn kho: Booking CONFIRMED giao thoa làm giảm AvailableQuota chính xác", async () => {
    // 1. Tạo 1 booking giả lập trong khoảng 2026-12-16 đến 2026-12-19 cho 1 phòng VIP DOUBLE
    const testBooking = await prisma.booking.create({
      data: {
        bookingNumber: "BK-TEST-FEAT06",
        customerName: "Nguyễn Văn Test",
        customerPhone: "0901234567",
        customerEmail: "test@ehotel.local",
        customerCccd: "001200001234",
        fromDate: new Date("2026-12-16T14:00:00.000Z"),
        toDate: new Date("2026-12-19T12:00:00.000Z"),
        totalRoomFee: 3600000,
        netRoomFee: 3600000,
        paymentOption: "FULL_100",
        prepaidBookingValue: 3600000,
        paymentAccountNumber: "9704000000000001",
        status: "CONFIRMED",
        items: {
          create: [
            {
              roomType: "VIP",
              roomSize: "DOUBLE",
              quantity: 1,
              unitPrice: 1200000,
            },
          ],
        },
      },
      include: { items: true },
    });
    testBookingId = testBooking.id;

    // 2. Tra cứu khoảng thời gian giao nhau: 2026-12-15 đến 2026-12-18 (Overlaps 16-19)
    const res = await fetch(
      `${baseUrl}/api/public/availability?fromDate=2026-12-15T14:00:00.000Z&toDate=2026-12-18T12:00:00.000Z&type=VIP&size=DOUBLE`,
    );
    assert.equal(res.status, 200);

    const body = await res.json();
    const vipDouble = body.data.categories.find(
      (c) => c.type === "VIP" && c.size === "DOUBLE",
    );
    assert.ok(vipDouble);
    assert.equal(vipDouble.bookedRooms, 1);
    assert.equal(
      vipDouble.availableQuota,
      vipDouble.totalPhysicalRooms - 1,
      "AvailableQuota phải giảm đúng 1 phòng đã đặt",
    );
  });

  test("10. Công thức tồn kho: Đơn booking ở khoảng thời gian không giao nhau KHÔNG làm giảm tồn kho", async () => {
    // Booking test ở [2026-12-16, 2026-12-19]
    // Tra cứu khoảng trước: [2026-12-10, 2026-12-16] -> toDate = fromDate của booking -> KHÔNG giao nhau
    const resBefore = await fetch(
      `${baseUrl}/api/public/availability?fromDate=2026-12-10T14:00:00.000Z&toDate=2026-12-16T12:00:00.000Z&type=VIP&size=DOUBLE`,
    );
    assert.equal(resBefore.status, 200);
    const bodyBefore = await resBefore.json();
    const vipDoubleBefore = bodyBefore.data.categories.find(
      (c) => c.type === "VIP" && c.size === "DOUBLE",
    );
    assert.equal(vipDoubleBefore.bookedRooms, 0);
    assert.equal(vipDoubleBefore.availableQuota, vipDoubleBefore.totalPhysicalRooms);

    // Tra cứu khoảng sau: [2026-12-19, 2026-12-25] -> fromDate = toDate của booking -> KHÔNG giao nhau
    const resAfter = await fetch(
      `${baseUrl}/api/public/availability?fromDate=2026-12-19T14:00:00.000Z&toDate=2026-12-25T12:00:00.000Z&type=VIP&size=DOUBLE`,
    );
    assert.equal(resAfter.status, 200);
    const bodyAfter = await resAfter.json();
    const vipDoubleAfter = bodyAfter.data.categories.find(
      (c) => c.type === "VIP" && c.size === "DOUBLE",
    );
    assert.equal(vipDoubleAfter.bookedRooms, 0);
    assert.equal(vipDoubleAfter.availableQuota, vipDoubleAfter.totalPhysicalRooms);
  });

  test("11. Công thức tồn kho: Booking CHECKED_IN vẫn tính chiếm dụng tồn kho", async () => {
    // Chuyển trạng thái sang CHECKED_IN
    await prisma.booking.update({
      where: { id: testBookingId },
      data: { status: "CHECKED_IN" },
    });

    const res = await fetch(
      `${baseUrl}/api/public/availability?fromDate=2026-12-15T14:00:00.000Z&toDate=2026-12-18T12:00:00.000Z&type=VIP&size=DOUBLE`,
    );
    assert.equal(res.status, 200);

    const body = await res.json();
    const vipDouble = body.data.categories.find(
      (c) => c.type === "VIP" && c.size === "DOUBLE",
    );
    assert.equal(vipDouble.bookedRooms, 1);
    assert.equal(vipDouble.availableQuota, vipDouble.totalPhysicalRooms - 1);
  });

  test("12. Công thức tồn kho: Booking CANCELLED tự động giải phóng tồn kho", async () => {
    // Chuyển trạng thái sang CANCELLED
    await prisma.booking.update({
      where: { id: testBookingId },
      data: { status: "CANCELLED", cancelledAt: new Date() },
    });

    const res = await fetch(
      `${baseUrl}/api/public/availability?fromDate=2026-12-15T14:00:00.000Z&toDate=2026-12-18T12:00:00.000Z&type=VIP&size=DOUBLE`,
    );
    assert.equal(res.status, 200);

    const body = await res.json();
    const vipDouble = body.data.categories.find(
      (c) => c.type === "VIP" && c.size === "DOUBLE",
    );
    assert.equal(vipDouble.bookedRooms, 0, "Đơn đã hủy không được tính vào bookedRooms");
    assert.equal(vipDouble.availableQuota, vipDouble.totalPhysicalRooms);
  });

  test("13. Công thức tồn kho: Booking CHECKED_OUT không chiếm dụng tồn kho", async () => {
    // Chuyển trạng thái sang CHECKED_OUT
    await prisma.booking.update({
      where: { id: testBookingId },
      data: { status: "CHECKED_OUT", checkedOutAt: new Date() },
    });

    const res = await fetch(
      `${baseUrl}/api/public/availability?fromDate=2026-12-15T14:00:00.000Z&toDate=2026-12-18T12:00:00.000Z&type=VIP&size=DOUBLE`,
    );
    assert.equal(res.status, 200);

    const body = await res.json();
    const vipDouble = body.data.categories.find(
      (c) => c.type === "VIP" && c.size === "DOUBLE",
    );
    assert.equal(vipDouble.bookedRooms, 0);
    assert.equal(vipDouble.availableQuota, vipDouble.totalPhysicalRooms);
  });

  test("14. Loại trừ phòng MAINTENANCE khỏi TotalPhysicalRooms", async () => {
    // Tạo phòng bảo trì tạm thời
    await prisma.room.create({
      data: {
        roomId: "TEST-MAINT-999",
        type: "DELUX",
        size: "SINGLE",
        price: 1000000,
        maxAdults: 1,
        maxChildren: 1,
        extraChildFee: 100000,
        status: "MAINTENANCE",
      },
    });

    const res = await fetch(
      `${baseUrl}/api/public/availability?fromDate=2026-12-15&toDate=2026-12-18&type=DELUX&size=SINGLE`,
    );
    assert.equal(res.status, 200);

    const body = await res.json();
    const deluxSingle = body.data.categories.find(
      (c) => c.type === "DELUX" && c.size === "SINGLE",
    );
    // Phòng ban đầu có 1 phòng DELUX SINGLE (202). Phòng TEST-MAINT-999 đang MAINTENANCE nên totalPhysicalRooms vẫn là 1
    assert.equal(deluxSingle.totalPhysicalRooms, 1, "Phòng MAINTENANCE không được tính vào tồn kho khả dụng");

    // Dọn dẹp phòng bảo trì
    await prisma.room.delete({ where: { roomId: "TEST-MAINT-999" } });
  });

  test("15. Pessimistic Locking: checkCategoryQuota và khóa bi quan trong transaction", async () => {
    // Test helper checkCategoryQuota
    await prisma.$transaction(async (tx) => {
      const quotaResult = await CatalogService.checkCategoryQuota({
        type: "VIP",
        size: "DOUBLE",
        fromDate: "2026-12-25",
        toDate: "2026-12-28",
        requestedQuantity: 1,
        forUpdate: true,
        tx,
      });

      assert.ok(quotaResult);
      assert.ok(quotaResult.availableQuota >= 1);
      assert.equal(quotaResult.remainingAfterBooking, quotaResult.availableQuota - 1);
    });

    // Test trường hợp yêu cầu vượt quá tồn kho (ROOM_QUOTA_EXCEEDED)
    await assert.rejects(
      async () => {
        await CatalogService.checkCategoryQuota({
          type: "VIP",
          size: "DOUBLE",
          fromDate: "2026-12-25",
          toDate: "2026-12-28",
          requestedQuantity: 999, // Quá số phòng vật lý có thực
        });
      },
      (err) => {
        assert.equal(err.code, "ROOM_QUOTA_EXCEEDED");
        assert.equal(err.statusCode, 400);
        return true;
      },
    );
  });
});
