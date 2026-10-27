import test, { describe, before, after } from "node:test";
import assert from "node:assert/strict";
import http from "node:http";
import { app } from "../src/main.js";
import { prisma } from "../src/common/prisma.js";

describe("FEAT-07: Shopping Cart, Customer Form, Promotion & Payment Simulator", () => {
  let server;
  let baseUrl;
  let testAccountId;
  const testAccountNumber = "9999000011112222";
  const initialTestBalance = 5000000; // 5.000.000đ

  before(async () => {
    // 1. Khởi động server test
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
      where: { booking: { customerEmail: "feat07.tester@ehotel.local" } },
    });
    await prisma.booking.deleteMany({
      where: { customerEmail: "feat07.tester@ehotel.local" },
    });
    await prisma.paymentAccount.deleteMany({
      where: { accountNumber: testAccountNumber },
    });
    await prisma.promotion.deleteMany({
      where: {
        code: {
          in: ["FEAT07PERCENT", "FEAT07FIXED", "FEAT07EXPIRED", "FEAT07FUTURE"],
        },
      },
    });

    // 3. Tạo tài khoản thanh toán giả lập riêng cho test suite
    const acc = await prisma.paymentAccount.create({
      data: {
        cardType: "ATM",
        accountNumber: testAccountNumber,
        accountHolder: "LE VAN TEST",
        balance: initialTestBalance,
      },
    });
    testAccountId = acc.id;

    // 4. Tạo các mã khuyến mãi test
    const now = new Date();
    const past = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const futureStart = new Date(Date.now() + 10 * 24 * 60 * 60 * 1000);
    const futureEnd = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

    await prisma.promotion.createMany({
      data: [
        {
          code: "FEAT07PERCENT",
          name: "Giảm 15% tổng hóa đơn",
          discountType: "PERCENTAGE",
          value: 15,
          startDate: past,
          endDate: futureEnd,
        },
        {
          code: "FEAT07FIXED",
          name: "Giảm trực tiếp 200k",
          discountType: "FIXED_AMOUNT",
          value: 200000,
          startDate: past,
          endDate: futureEnd,
        },
        {
          code: "FEAT07EXPIRED",
          name: "Mã hết hạn hôm qua",
          discountType: "PERCENTAGE",
          value: 20,
          startDate: past,
          endDate: yesterday,
        },
        {
          code: "FEAT07FUTURE",
          name: "Mã tương lai chưa đến hạn",
          discountType: "FIXED_AMOUNT",
          value: 100000,
          startDate: futureStart,
          endDate: futureEnd,
        },
      ],
    });
  });

  after(async () => {
    // Dọn dẹp dữ liệu test
    await prisma.bookingItem.deleteMany({
      where: { booking: { customerEmail: "feat07.tester@ehotel.local" } },
    });
    await prisma.booking.deleteMany({
      where: { customerEmail: "feat07.tester@ehotel.local" },
    });
    if (testAccountId) {
      await prisma.paymentAccount.deleteMany({
        where: { id: testAccountId },
      });
    }
    await prisma.promotion.deleteMany({
      where: {
        code: {
          in: ["FEAT07PERCENT", "FEAT07FIXED", "FEAT07EXPIRED", "FEAT07FUTURE"],
        },
      },
    });

    if (server) {
      server.close();
    }
  });

  test("1. Lấy danh sách tài khoản thanh toán giả lập qua GET /api/public/payment-accounts", async () => {
    const res = await fetch(`${baseUrl}/api/public/payment-accounts`);
    assert.equal(res.status, 200);

    const body = await res.json();
    assert.equal(body.success, true);
    assert.ok(Array.isArray(body.data));
    assert.ok(body.data.length >= 1);

    const found = body.data.find((a) => a.accountNumber === testAccountNumber);
    assert.ok(found);
    assert.equal(found.balance, initialTestBalance);
  });

  test("2. Áp dụng mã khuyến mãi PERCENTAGE hợp lệ qua POST /api/public/promotions/apply", async () => {
    const totalRoomFee = 2000000; // 2.000.000đ
    const res = await fetch(`${baseUrl}/api/public/promotions/apply`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        code: "FEAT07PERCENT",
        totalRoomFee,
      }),
    });

    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.success, true);
    assert.equal(body.data.promotion.code, "FEAT07PERCENT");
    assert.equal(body.data.promotion.discountType, "PERCENTAGE");
    assert.equal(body.data.discountAmount, 300000); // 15% của 2tr = 300k
    assert.equal(body.data.netRoomFee, 1700000); // 2tr - 300k = 1.7tr
  });

  test("3. Áp dụng mã khuyến mãi FIXED_AMOUNT hợp lệ qua POST /api/public/promotions/apply", async () => {
    const totalRoomFee = 1000000; // 1.000.000đ
    const res = await fetch(`${baseUrl}/api/public/promotions/apply`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        code: "FEAT07FIXED",
        totalRoomFee,
      }),
    });

    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.success, true);
    assert.equal(body.data.promotion.code, "FEAT07FIXED");
    assert.equal(body.data.promotion.discountType, "FIXED_AMOUNT");
    assert.equal(body.data.discountAmount, 200000); // Giảm 200k
    assert.equal(body.data.netRoomFee, 800000);
  });

  test("4. Áp dụng mã khuyến mãi không tồn tại trả về 404 RESOURCE_NOT_FOUND", async () => {
    const res = await fetch(`${baseUrl}/api/public/promotions/apply`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        code: "NON_EXISTING_PROMO",
        totalRoomFee: 1000000,
      }),
    });

    assert.equal(res.status, 404);
    const body = await res.json();
    assert.equal(body.success, false);
    assert.equal(body.error.code, "RESOURCE_NOT_FOUND");
  });

  test("5. Áp dụng mã khuyến mãi đã hết hạn trả về 400 VALIDATION_FAILED", async () => {
    const res = await fetch(`${baseUrl}/api/public/promotions/apply`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        code: "FEAT07EXPIRED",
        totalRoomFee: 1000000,
      }),
    });

    assert.equal(res.status, 400);
    const body = await res.json();
    assert.equal(body.success, false);
    assert.equal(body.error.code, "VALIDATION_FAILED");
  });

  test("6. Áp dụng mã khuyến mãi chưa đến hạn trả về 400 VALIDATION_FAILED", async () => {
    const res = await fetch(`${baseUrl}/api/public/promotions/apply`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        code: "FEAT07FUTURE",
        totalRoomFee: 1000000,
      }),
    });

    assert.equal(res.status, 400);
    const body = await res.json();
    assert.equal(body.success, false);
    assert.equal(body.error.code, "VALIDATION_FAILED");
  });

  test("7. Preview giỏ hàng tính đúng số đêm, tổng tiền, chiết khấu và cọc 50%", async () => {
    const payload = {
      fromDate: "2026-12-01",
      toDate: "2026-12-03", // 2 đêm
      items: [
        { roomType: "VIP", roomSize: "DOUBLE", quantity: 1 }, // Giá 1.2tr * 2 đêm = 2.4tr
      ],
      promotionCode: "FEAT07PERCENT", // Giảm 15% của 2.4tr = 360k -> Net = 2.04tr
      paymentOption: "DEPOSIT_50", // 50% = 1.02tr
    };

    const res = await fetch(`${baseUrl}/api/public/bookings/preview`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.success, true);
    assert.equal(body.data.nights, 2);
    assert.equal(body.data.totalRoomFee, 2400000);
    assert.equal(body.data.discountAmount, 360000);
    assert.equal(body.data.netRoomFee, 2040000);
    assert.equal(body.data.paymentOption, "DEPOSIT_50");
    assert.equal(body.data.prepaidBookingValue, 1020000);
    assert.equal(body.data.remainingPayableAtCheckIn, 1020000);
  });

  test("8. Validate form đặt phòng: Thiếu họ tên hoặc CCCD trả về 400 VALIDATION_FAILED", async () => {
    const payload = {
      customerName: "", // Trống
      customerPhone: "0901234567",
      customerEmail: "feat07.tester@ehotel.local",
      customerCccd: "",
      fromDate: "2026-12-01",
      toDate: "2026-12-03",
      items: [{ roomType: "VIP", roomSize: "DOUBLE", quantity: 1 }],
      paymentOption: "FULL_100",
      paymentAccountNumber: testAccountNumber,
    };

    const res = await fetch(`${baseUrl}/api/public/bookings`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    assert.equal(res.status, 400);
    const body = await res.json();
    assert.equal(body.success, false);
    assert.equal(body.error.code, "VALIDATION_FAILED");
  });

  test("9. Validate form đặt phòng: Số điện thoại hoặc email sai định dạng trả về 400", async () => {
    const payload = {
      customerName: "Nguyễn Văn Test",
      customerPhone: "abcxyz", // Sai định dạng
      customerEmail: "not-an-email",
      customerCccd: "001200009999",
      fromDate: "2026-12-01",
      toDate: "2026-12-03",
      items: [{ roomType: "VIP", roomSize: "DOUBLE", quantity: 1 }],
      paymentOption: "FULL_100",
      paymentAccountNumber: testAccountNumber,
    };

    const res = await fetch(`${baseUrl}/api/public/bookings`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    assert.equal(res.status, 400);
    const body = await res.json();
    assert.equal(body.success, false);
    assert.equal(body.error.code, "VALIDATION_FAILED");
  });

  test("10. Thanh toán thất bại khi tài khoản thanh toán không tồn tại trả về 400 PAYMENT_FAILED", async () => {
    const payload = {
      customerName: "Nguyễn Văn Test",
      customerPhone: "0901234567",
      customerEmail: "feat07.tester@ehotel.local",
      customerCccd: "001200009999",
      fromDate: "2026-12-01",
      toDate: "2026-12-03",
      items: [{ roomType: "VIP", roomSize: "DOUBLE", quantity: 1 }],
      paymentOption: "FULL_100",
      paymentAccountNumber: "NON_EXISTING_CARD_0000",
    };

    const res = await fetch(`${baseUrl}/api/public/bookings`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    assert.equal(res.status, 400);
    const body = await res.json();
    assert.equal(body.success, false);
    assert.equal(body.error.code, "PAYMENT_FAILED");
  });

  test("11. Thanh toán thất bại khi số dư tài khoản không đủ trả về 400 PAYMENT_FAILED", async () => {
    // Cố tình đặt nhiều đêm để tiền thanh toán > 5.000.000đ (số dư testAccount)
    const payload = {
      customerName: "Nguyễn Văn Test",
      customerPhone: "0901234567",
      customerEmail: "feat07.tester@ehotel.local",
      customerCccd: "001200009999",
      fromDate: "2026-12-01",
      toDate: "2026-12-10", // 9 đêm * 1.2tr = 10.8tr > 5tr
      items: [{ roomType: "VIP", roomSize: "DOUBLE", quantity: 1 }],
      paymentOption: "FULL_100",
      paymentAccountNumber: testAccountNumber,
    };

    const res = await fetch(`${baseUrl}/api/public/bookings`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    assert.equal(res.status, 400);
    const body = await res.json();
    assert.equal(body.success, false);
    assert.equal(body.error.code, "PAYMENT_FAILED");

    // Xác nhận số dư tài khoản KHÔNG bị trừ (Transaction Rollback an toàn)
    const acc = await prisma.paymentAccount.findUnique({
      where: { accountNumber: testAccountNumber },
    });
    assert.equal(Number(acc.balance), initialTestBalance);
  });

  test("12. Đặt phòng & thanh toán 100% thành công: Trừ đúng tiền, sinh bookingNumber, giảm tồn kho", async () => {
    // Đặt 1 phòng VIP DOUBLE trong 1 đêm: 1.2tr. Dùng mã giảm 15% (180k) -> Net = 1.020.000đ
    const payload = {
      customerName: "Nguyễn Văn Test",
      customerPhone: "0901234567",
      customerEmail: "feat07.tester@ehotel.local",
      customerCccd: "001200009999",
      fromDate: "2026-12-05",
      toDate: "2026-12-06",
      items: [{ roomType: "VIP", roomSize: "DOUBLE", quantity: 1 }],
      promotionCode: "FEAT07PERCENT",
      paymentOption: "FULL_100",
      paymentAccountNumber: testAccountNumber,
    };

    const res = await fetch(`${baseUrl}/api/public/bookings`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    assert.equal(res.status, 201);
    const body = await res.json();
    assert.equal(body.success, true);
    assert.ok(body.data.booking.bookingNumber.startsWith("BK-"));
    assert.equal(body.data.booking.status, "CONFIRMED");
    assert.equal(body.data.booking.totalRoomFee, 1200000);
    assert.equal(body.data.booking.discountAmount, 180000);
    assert.equal(body.data.booking.netRoomFee, 1020000);
    assert.equal(body.data.booking.prepaidBookingValue, 1020000);
    assert.equal(body.data.booking.paymentOption, "FULL_100");

    // Kiểm tra số dư tài khoản bị trừ chính xác 1.020.000đ
    const expectedRemaining = initialTestBalance - 1020000;
    const acc = await prisma.paymentAccount.findUnique({
      where: { accountNumber: testAccountNumber },
    });
    assert.equal(Number(acc.balance), expectedRemaining);

    // Kiểm tra tồn kho phòng trong khoảng [2026-12-05, 2026-12-06] đã giảm đúng 1 phòng
    const availRes = await fetch(
      `${baseUrl}/api/public/availability?fromDate=2026-12-05&toDate=2026-12-06&type=VIP&size=DOUBLE`,
    );
    const availBody = await availRes.json();
    const vipCat = availBody.data.categories.find(
      (c) => c.type === "VIP" && c.size === "DOUBLE",
    );
    assert.equal(vipCat.bookedRooms, 1);
    assert.equal(vipCat.availableQuota, vipCat.totalPhysicalRooms - 1);
  });

  test("13. Đặt phòng & thanh toán đặt cọc 50% thành công: Trừ đúng 50%, ghi nhận tiền còn lại", async () => {
    // Đặt 1 phòng DELUX DOUBLE trong 1 đêm: 1.5tr. Không dùng mã -> Net = 1.5tr -> Cọc 50% = 750k
    const balanceBefore = Number(
      (
        await prisma.paymentAccount.findUnique({
          where: { accountNumber: testAccountNumber },
        })
      ).balance,
    );

    const payload = {
      customerName: "Trần Thị Test Cọc",
      customerPhone: "0912345678",
      customerEmail: "feat07.tester@ehotel.local",
      customerCccd: "001200008888",
      fromDate: "2026-12-08",
      toDate: "2026-12-09",
      items: [{ roomType: "DELUX", roomSize: "DOUBLE", quantity: 1 }],
      paymentOption: "DEPOSIT_50",
      paymentAccountNumber: testAccountNumber,
    };

    const res = await fetch(`${baseUrl}/api/public/bookings`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    assert.equal(res.status, 201);
    const body = await res.json();
    assert.equal(body.success, true);
    assert.equal(body.data.booking.paymentOption, "DEPOSIT_50");
    assert.equal(body.data.booking.totalRoomFee, 1500000);
    assert.equal(body.data.booking.prepaidBookingValue, 750000);
    assert.equal(body.data.booking.remainingPayable, 750000);

    // Kiểm tra số dư tài khoản bị trừ chính xác 750.000đ
    const acc = await prisma.paymentAccount.findUnique({
      where: { accountNumber: testAccountNumber },
    });
    assert.equal(Number(acc.balance), balanceBefore - 750000);
  });

  test("14. Concurrency Guard: Chặn đặt phòng khi vượt quá tồn kho khả dụng (ROOM_QUOTA_EXCEEDED)", async () => {
    // Đặt quá số lượng phòng vật lý hiện có (ví dụ 99 phòng VIP DOUBLE)
    const payload = {
      customerName: "Nguyễn Văn Vượt Quota",
      customerPhone: "0901234567",
      customerEmail: "feat07.tester@ehotel.local",
      customerCccd: "001200009999",
      fromDate: "2026-12-20",
      toDate: "2026-12-22",
      items: [{ roomType: "VIP", roomSize: "DOUBLE", quantity: 99 }],
      paymentOption: "FULL_100",
      paymentAccountNumber: testAccountNumber,
    };

    const res = await fetch(`${baseUrl}/api/public/bookings`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    assert.equal(res.status, 400);
    const body = await res.json();
    assert.equal(body.success, false);
    assert.equal(body.error.code, "ROOM_QUOTA_EXCEEDED");
  });
});
