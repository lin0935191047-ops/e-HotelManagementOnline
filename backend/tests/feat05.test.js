import test, { describe, before, after } from "node:test";
import assert from "node:assert/strict";
import http from "node:http";
import { app } from "../src/main.js";
import { prisma } from "../src/common/prisma.js";

describe("FEAT-05: Setup Services & Promotion Management", () => {
  let server;
  let baseUrl;
  let managerToken;
  let adminToken;
  let saleToken;

  const testServiceIds = ["TEST-SRV-01", "TEST-SRV-02", "TEST-SRV-GUARD"];
  const testPromoCodes = ["TEST-PCT-10", "TEST-FIXED-50", "TEST-PROMO-GUARD", "TEST-UPDATE-PROMO"];

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

    // Dọn dẹp dữ liệu rác trước khi chạy
    await prisma.serviceUsage.deleteMany({
      where: { serviceId: { in: testServiceIds } },
    });
    await prisma.service.deleteMany({
      where: { serviceId: { in: testServiceIds } },
    });
    await prisma.booking.deleteMany({
      where: { customerName: "Test Feat05 Customer" },
    });
    await prisma.promotion.deleteMany({
      where: { code: { in: testPromoCodes } },
    });
  });

  after(async () => {
    // Dọn dẹp dữ liệu test
    await prisma.serviceUsage.deleteMany({
      where: { serviceId: { in: testServiceIds } },
    });
    await prisma.service.deleteMany({
      where: { serviceId: { in: testServiceIds } },
    });
    await prisma.booking.deleteMany({
      where: { customerName: "Test Feat05 Customer" },
    });
    await prisma.promotion.deleteMany({
      where: { code: { in: testPromoCodes } },
    });

    await new Promise((resolve) => server.close(resolve));
    await prisma.$disconnect();
  });

  // =========================================================================
  // PHẦN 1: QUẢN LÝ DỊCH VỤ (SERVICES)
  // =========================================================================

  test("1. GET /api/setup/services trả về danh sách dịch vụ (200 OK)", async () => {
    const res = await fetch(`${baseUrl}/api/setup/services`, {
      headers: { Authorization: `Bearer ${managerToken}` },
    });

    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.success, true);
    assert.ok(Array.isArray(body.data));
    assert.ok(body.pagination);
    assert.ok(body.data.length >= 4); // Có sẵn các dịch vụ mẫu từ seed
  });

  test("2. POST /api/setup/services tạo dịch vụ mới thành công (201 Created)", async () => {
    const res = await fetch(`${baseUrl}/api/setup/services`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${managerToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        serviceId: "TEST-SRV-01",
        serviceName: "Dịch vụ Đưa đón Sân bay Cao cấp",
        description: "Xe Mercedes Limousine 7 chỗ đưa đón tận nơi",
        unit: "Chuyến",
        price: 500000,
      }),
    });

    assert.equal(res.status, 201);
    const body = await res.json();
    assert.equal(body.success, true);
    assert.equal(body.data.serviceId, "TEST-SRV-01");
    assert.equal(body.data.serviceName, "Dịch vụ Đưa đón Sân bay Cao cấp");
    assert.equal(Number(body.data.price), 500000);
    assert.equal(body.data.unit, "Chuyến");
  });

  test("3. POST /api/setup/services validate trùng serviceId trả về 400 Bad Request", async () => {
    const res = await fetch(`${baseUrl}/api/setup/services`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${managerToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        serviceId: "TEST-SRV-01",
        serviceName: "Dịch vụ Trùng",
        unit: "Lần",
        price: 100000,
      }),
    });

    assert.equal(res.status, 400);
    const body = await res.json();
    assert.equal(body.error.code, "VALIDATION_FAILED");
  });

  test("4. POST /api/setup/services validate đơn giá <= 0 trả về 400 Bad Request", async () => {
    const res = await fetch(`${baseUrl}/api/setup/services`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${managerToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        serviceId: "TEST-SRV-02",
        serviceName: "Dịch vụ Miễn Phí Không Hợp Lệ",
        unit: "Suất",
        price: 0,
      }),
    });

    assert.equal(res.status, 400);
    const body = await res.json();
    assert.equal(body.error.code, "VALIDATION_FAILED");
    assert.ok(body.error.message.includes("lớn hơn 0"));
  });

  test("5. GET /api/setup/services/:serviceId xem chi tiết dịch vụ", async () => {
    const res = await fetch(`${baseUrl}/api/setup/services/TEST-SRV-01`, {
      headers: { Authorization: `Bearer ${managerToken}` },
    });

    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.success, true);
    assert.equal(body.data.serviceId, "TEST-SRV-01");
    assert.equal(body.data.unit, "Chuyến");
  });

  test("6. PUT /api/setup/services/:serviceId cập nhật thông tin dịch vụ thành công", async () => {
    const res = await fetch(`${baseUrl}/api/setup/services/TEST-SRV-01`, {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${managerToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        serviceName: "Xe Đưa Đón Sân Bay VIP",
        price: 600000,
        unit: "Lượt",
      }),
    });

    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.success, true);
    assert.equal(body.data.serviceName, "Xe Đưa Đón Sân Bay VIP");
    assert.equal(Number(body.data.price), 600000);
    assert.equal(body.data.unit, "Lượt");
  });

  test("7. DELETE /api/setup/services/:serviceId xóa dịch vụ chưa có giao dịch thành công (200 OK)", async () => {
    // Tạo 1 service tạm rồi xóa
    await prisma.service.create({
      data: {
        serviceId: "TEST-SRV-02",
        serviceName: "Dịch vụ Xóa Tạm",
        unit: "Lần",
        price: 50000,
      },
    });

    const res = await fetch(`${baseUrl}/api/setup/services/TEST-SRV-02`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${managerToken}` },
    });

    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.success, true);
    assert.equal(body.serviceId, "TEST-SRV-02");

    // Kiểm tra trong DB đã bị xóa
    const checkDb = await prisma.service.findUnique({
      where: { serviceId: "TEST-SRV-02" },
    });
    assert.equal(checkDb, null);
  });

  test("8. Guard: Xóa dịch vụ đã phát sinh giao dịch bị từ chối 400 (SERVICE_CANNOT_BE_DELETED)", async () => {
    // 1. Tạo service test guard
    await prisma.service.create({
      data: {
        serviceId: "TEST-SRV-GUARD",
        serviceName: "Dịch vụ Bảo Vệ Không Cho Xóa",
        unit: "Lần",
        price: 150000,
      },
    });

    // 2. Tạo booking và service usage giả định
    const testBooking = await prisma.booking.create({
      data: {
        bookingNumber: "BK-SRV-GUARD-01",
        customerName: "Test Feat05 Customer",
        customerPhone: "0988776655",
        customerEmail: "cust05@example.com",
        customerCccd: "012345678905",
        fromDate: new Date("2026-11-01T14:00:00Z"),
        toDate: new Date("2026-11-03T12:00:00Z"),
        totalRoomFee: 2000000,
        discountAmount: 0,
        netRoomFee: 2000000,
        paymentOption: "FULL_100",
        prepaidBookingValue: 2000000,
        paymentAccountNumber: "9704000000000001",
        status: "CONFIRMED",
      },
    });

    await prisma.serviceUsage.create({
      data: {
        ticketId: "TCK-TEST-001",
        bookingId: testBooking.id,
        roomId: "101",
        serviceId: "TEST-SRV-GUARD",
        quantity: 2,
        unitPrice: 150000,
        totalPrice: 300000,
      },
    });

    // 3. Thử gọi API xóa service -> phải bị chặn với SERVICE_CANNOT_BE_DELETED
    const deleteRes = await fetch(`${baseUrl}/api/setup/services/TEST-SRV-GUARD`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${managerToken}` },
    });

    assert.equal(deleteRes.status, 400);
    const deleteBody = await deleteRes.json();
    assert.equal(deleteBody.error.code, "SERVICE_CANNOT_BE_DELETED");
    assert.ok(deleteBody.error.message.includes("không thể xóa"));
  });

  // =========================================================================
  // PHẦN 2: QUẢN LÝ KHUYẾN MÃI (PROMOTIONS)
  // =========================================================================

  let createdPromoId;

  test("9. GET /api/setup/promotions trả về danh sách khuyến mãi (200 OK)", async () => {
    const res = await fetch(`${baseUrl}/api/setup/promotions`, {
      headers: { Authorization: `Bearer ${managerToken}` },
    });

    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.success, true);
    assert.ok(Array.isArray(body.data));
    assert.ok(body.pagination);
    assert.ok(body.data.length >= 2); // Seed có SUMMER2026 và WELCOME10
  });

  test("10. POST /api/setup/promotions tạo khuyến mãi PERCENTAGE thành công (201 Created)", async () => {
    const res = await fetch(`${baseUrl}/api/setup/promotions`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${managerToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        code: "TEST-PCT-10",
        name: "Giảm giá 15% mùa hè",
        description: "Khuyến mãi dành cho khách đặt sớm",
        discountType: "PERCENTAGE",
        value: 15,
        startDate: "2026-06-01T00:00:00.000Z",
        endDate: "2026-08-31T23:59:59.000Z",
      }),
    });

    assert.equal(res.status, 201);
    const body = await res.json();
    assert.equal(body.success, true);
    assert.equal(body.data.code, "TEST-PCT-10");
    assert.equal(body.data.discountType, "PERCENTAGE");
    assert.equal(Number(body.data.value), 15);
    createdPromoId = body.data.id;
  });

  test("11. POST /api/setup/promotions tạo khuyến mãi FIXED_AMOUNT thành công (201 Created)", async () => {
    const res = await fetch(`${baseUrl}/api/setup/promotions`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${managerToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        code: "TEST-FIXED-50",
        name: "Giảm cố định 200k",
        description: "Ưu đãi trực tiếp 200,000 VND trên hóa đơn",
        discountType: "FIXED_AMOUNT",
        value: 200000,
        startDate: "2026-01-01T00:00:00.000Z",
        endDate: "2026-12-31T23:59:59.000Z",
      }),
    });

    assert.equal(res.status, 201);
    const body = await res.json();
    assert.equal(body.success, true);
    assert.equal(body.data.code, "TEST-FIXED-50");
    assert.equal(body.data.discountType, "FIXED_AMOUNT");
    assert.equal(Number(body.data.value), 200000);
  });

  test("12. POST /api/setup/promotions validate trùng mã code trả về 400 Bad Request", async () => {
    const res = await fetch(`${baseUrl}/api/setup/promotions`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${managerToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        code: "TEST-PCT-10",
        name: "Trùng mã code",
        discountType: "PERCENTAGE",
        value: 10,
        startDate: "2026-01-01",
        endDate: "2026-12-31",
      }),
    });

    assert.equal(res.status, 400);
    const body = await res.json();
    assert.equal(body.error.code, "VALIDATION_FAILED");
  });

  test("13. POST /api/setup/promotions validate phần trăm > 100 trả về 400 Bad Request", async () => {
    const res = await fetch(`${baseUrl}/api/setup/promotions`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${managerToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        code: "TEST-ERR-PCT",
        name: "Giảm 150% Vô Lý",
        discountType: "PERCENTAGE",
        value: 150,
        startDate: "2026-01-01",
        endDate: "2026-12-31",
      }),
    });

    assert.equal(res.status, 400);
    const body = await res.json();
    assert.equal(body.error.code, "VALIDATION_FAILED");
    assert.ok(body.error.message.includes("không được vượt quá 100%"));
  });

  test("14. POST /api/setup/promotions validate endDate < startDate trả về 400 Bad Request", async () => {
    const res = await fetch(`${baseUrl}/api/setup/promotions`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${managerToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        code: "TEST-ERR-DATE",
        name: "Thời gian đảo ngược",
        discountType: "PERCENTAGE",
        value: 10,
        startDate: "2026-12-31T00:00:00.000Z",
        endDate: "2026-01-01T00:00:00.000Z",
      }),
    });

    assert.equal(res.status, 400);
    const body = await res.json();
    assert.equal(body.error.code, "VALIDATION_FAILED");
    assert.ok(body.error.message.includes("lớn hơn hoặc bằng"));
  });

  test("15. GET /api/setup/promotions/:id xem chi tiết khuyến mãi", async () => {
    const res = await fetch(`${baseUrl}/api/setup/promotions/${createdPromoId}`, {
      headers: { Authorization: `Bearer ${managerToken}` },
    });

    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.success, true);
    assert.equal(body.data.id, createdPromoId);
    assert.equal(body.data.code, "TEST-PCT-10");
    assert.ok(body.data.computedStatus);
  });

  test("16. PUT /api/setup/promotions/:id cập nhật khuyến mãi thành công", async () => {
    const res = await fetch(`${baseUrl}/api/setup/promotions/${createdPromoId}`, {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${managerToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        name: "Ưu Đãi Đặc Biệt 20%",
        value: 20,
      }),
    });

    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.success, true);
    assert.equal(body.data.name, "Ưu Đãi Đặc Biệt 20%");
    assert.equal(Number(body.data.value), 20);
  });

  test("17. DELETE /api/setup/promotions/:id xóa khuyến mãi chưa dùng thành công", async () => {
    const res = await fetch(`${baseUrl}/api/setup/promotions/${createdPromoId}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${managerToken}` },
    });

    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.success, true);
    assert.equal(body.promotionId, createdPromoId);
  });

  test("18. Guard: Xóa khuyến mãi đã gán vào booking bị từ chối 400 (PROMOTION_CANNOT_BE_DELETED)", async () => {
    // 1. Tạo promotion test guard
    const guardPromo = await prisma.promotion.create({
      data: {
        code: "TEST-PROMO-GUARD",
        name: "Khuyến mãi đã dùng không thể xóa",
        discountType: "FIXED_AMOUNT",
        value: 100000,
        startDate: new Date("2026-01-01"),
        endDate: new Date("2026-12-31"),
      },
    });

    // 2. Tạo booking gán mã khuyến mãi này
    await prisma.booking.create({
      data: {
        bookingNumber: "BK-PROMO-GUARD-01",
        customerName: "Test Feat05 Customer",
        customerPhone: "0911223344",
        customerEmail: "custpromo@example.com",
        customerCccd: "012345678906",
        fromDate: new Date("2026-11-01T14:00:00Z"),
        toDate: new Date("2026-11-03T12:00:00Z"),
        promotionId: guardPromo.id,
        totalRoomFee: 3000000,
        discountAmount: 100000,
        netRoomFee: 2900000,
        paymentOption: "FULL_100",
        prepaidBookingValue: 2900000,
        paymentAccountNumber: "9704000000000001",
        status: "CONFIRMED",
      },
    });

    // 3. Thử gọi API xóa promotion -> phải bị chặn với PROMOTION_CANNOT_BE_DELETED
    const deleteRes = await fetch(`${baseUrl}/api/setup/promotions/${guardPromo.id}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${managerToken}` },
    });

    assert.equal(deleteRes.status, 400);
    const deleteBody = await deleteRes.json();
    assert.equal(deleteBody.error.code, "PROMOTION_CANNOT_BE_DELETED");
    assert.ok(deleteBody.error.message.includes("không thể xóa"));
  });

  // =========================================================================
  // PHẦN 3: STRICT DISJOINT RBAC (CHẶN ADMIN & SALE)
  // =========================================================================

  test("19. Strict Disjoint RBAC: ADMIN gọi /api/setup/services hoặc /api/setup/promotions bị trả về 403 Forbidden", async () => {
    const res1 = await fetch(`${baseUrl}/api/setup/services`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    assert.equal(res1.status, 403);

    const res2 = await fetch(`${baseUrl}/api/setup/promotions`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    assert.equal(res2.status, 403);
  });

  test("20. Strict Disjoint RBAC: SALE gọi /api/setup/services hoặc /api/setup/promotions bị trả về 403 Forbidden", async () => {
    const res1 = await fetch(`${baseUrl}/api/setup/services`, {
      headers: { Authorization: `Bearer ${saleToken}` },
    });
    assert.equal(res1.status, 403);

    const res2 = await fetch(`${baseUrl}/api/setup/promotions`, {
      headers: { Authorization: `Bearer ${saleToken}` },
    });
    assert.equal(res2.status, 403);
  });
});
