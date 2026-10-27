import test, { describe, before, after } from "node:test";
import assert from "node:assert/strict";
import http from "node:http";
import { app } from "../src/main.js";
import { prisma } from "../src/common/prisma.js";

describe("FEAT-08: Check & Cancel Booking (24h Rule & 80/20 Refund)", () => {
  let server;
  let baseUrl;
  const testAccountNumber = "9999888877776666";
  const initialBalance = 10000000; // 10.000.000đ

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
    await prisma.roomAssignment.deleteMany({
      where: { booking: { customerEmail: "feat08.tester@ehotel.local" } },
    });
    await prisma.bookingItem.deleteMany({
      where: { booking: { customerEmail: "feat08.tester@ehotel.local" } },
    });
    await prisma.booking.deleteMany({
      where: { customerEmail: "feat08.tester@ehotel.local" },
    });
    await prisma.paymentAccount.deleteMany({
      where: { accountNumber: testAccountNumber },
    });

    // 3. Tạo tài khoản thanh toán giả lập riêng cho test suite
    await prisma.paymentAccount.create({
      data: {
        cardType: "ATM",
        accountNumber: testAccountNumber,
        accountHolder: "HOANG THI TEST CANCELLATION",
        balance: initialBalance,
      },
    });
  });

  after(async () => {
    // Dọn dẹp sau khi kết thúc test
    await prisma.roomAssignment.deleteMany({
      where: { booking: { customerEmail: "feat08.tester@ehotel.local" } },
    });
    await prisma.bookingItem.deleteMany({
      where: { booking: { customerEmail: "feat08.tester@ehotel.local" } },
    });
    await prisma.booking.deleteMany({
      where: { customerEmail: "feat08.tester@ehotel.local" },
    });
    await prisma.paymentAccount.deleteMany({
      where: { accountNumber: testAccountNumber },
    });

    if (server) {
      await new Promise((resolve) => server.close(resolve));
    }
  });

  test("1. Tra cứu đơn đặt phòng không tồn tại -> 404 RESOURCE_NOT_FOUND", async () => {
    const res = await request("/api/public/bookings/BK-99999999-9999");
    assert.equal(res.status, 404);
    assert.equal(res.body.success, false);
    assert.equal(res.body.error.code, "RESOURCE_NOT_FOUND");
  });

  test("2. Tạo đơn đặt phòng hợp lệ (cách hiện tại 5 ngày) và tra cứu thành công", async () => {
    const fromDate = new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];
    const toDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];

    const createRes = await request("/api/public/bookings", {
      method: "POST",
      body: JSON.stringify({
        customerName: "Nguyễn Văn Đạt",
        customerPhone: "0901234567",
        customerEmail: "feat08.tester@ehotel.local",
        customerCccd: "001200001234",
        fromDate,
        toDate,
        items: [{ roomType: "VIP", roomSize: "SINGLE", quantity: 1 }],
        paymentOption: "FULL_100",
        paymentAccountNumber: testAccountNumber,
      }),
    });

    assert.equal(createRes.status, 201);
    const bookingNumber = createRes.body.data.booking.bookingNumber;
    assert.ok(bookingNumber);

    // Tra cứu đơn đặt phòng
    const lookupRes = await request(`/api/public/bookings/${bookingNumber}`);
    assert.equal(lookupRes.status, 200);
    assert.equal(lookupRes.body.success, true);
    assert.equal(lookupRes.body.data.booking.bookingNumber, bookingNumber);
    assert.equal(lookupRes.body.data.booking.status, "CONFIRMED");
    assert.equal(lookupRes.body.data.booking.nights, 2);
    assert.equal(lookupRes.body.data.cancellationPolicy.isCancellable, true);
    assert.ok(lookupRes.body.data.cancellationPolicy.hoursUntilCheckIn >= 24);
    assert.equal(lookupRes.body.data.cancellationPolicy.refundRate, 0.8);
    assert.equal(lookupRes.body.data.cancellationPolicy.cancellationFeeRate, 0.2);
  });

  test("3. Hủy đơn đặt phòng hợp lệ (>= 24h): Hoàn 80%, giữ 20%, chuyển CANCELLED và cộng tiền vào tài khoản", async () => {
    const fromDate = new Date(Date.now() + 6 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];
    const toDate = new Date(Date.now() + 8 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];

    // Lấy số dư trước khi đặt
    const accBefore = await prisma.paymentAccount.findUnique({
      where: { accountNumber: testAccountNumber },
    });
    const balanceBeforeBooking = Number(accBefore.balance);

    // Tạo đơn đặt phòng
    const createRes = await request("/api/public/bookings", {
      method: "POST",
      body: JSON.stringify({
        customerName: "Trần Thị Hằng",
        customerPhone: "0912345678",
        customerEmail: "feat08.tester@ehotel.local",
        customerCccd: "001200005678",
        fromDate,
        toDate,
        items: [{ roomType: "DELUX", roomSize: "DOUBLE", quantity: 1 }],
        paymentOption: "FULL_100",
        paymentAccountNumber: testAccountNumber,
      }),
    });

    assert.equal(createRes.status, 201);
    const booking = createRes.body.data.booking;
    const prepaidValue = booking.prepaidBookingValue;
    assert.ok(prepaidValue > 0);

    const balanceAfterBooking = Number(createRes.body.data.payment.remainingAccountBalance);
    assert.equal(balanceAfterBooking, balanceBeforeBooking - prepaidValue);

    // Thực hiện hủy phòng
    const cancelRes = await request(`/api/public/bookings/${booking.bookingNumber}/cancel`, {
      method: "POST",
    });

    assert.equal(cancelRes.status, 200);
    assert.equal(cancelRes.body.success, true);
    assert.equal(cancelRes.body.data.booking.status, "CANCELLED");

    const expectedFee = Math.round(prepaidValue * 0.2);
    const expectedRefund = prepaidValue - expectedFee;

    assert.equal(cancelRes.body.data.booking.cancellationFee, expectedFee);
    assert.equal(cancelRes.body.data.booking.refundAmount, expectedRefund);
    assert.equal(cancelRes.body.data.refund.refundAmount, expectedRefund);
    assert.equal(cancelRes.body.data.refund.cancellationFee, expectedFee);

    // Kiểm tra số dư trong DB được hoàn 80%
    const accAfterCancel = await prisma.paymentAccount.findUnique({
      where: { accountNumber: testAccountNumber },
    });
    const finalBalance = Number(accAfterCancel.balance);
    assert.equal(finalBalance, balanceAfterBooking + expectedRefund);
  });

  test("4. Thử hủy phòng lần 2 trên cùng một đơn đã CANCELLED -> Chặn 400 CANCELLATION_INVALID", async () => {
    // Tìm đơn đã hủy ở test 3
    const cancelledBooking = await prisma.booking.findFirst({
      where: {
        customerEmail: "feat08.tester@ehotel.local",
        status: "CANCELLED",
      },
    });
    assert.ok(cancelledBooking);

    const res = await request(`/api/public/bookings/${cancelledBooking.bookingNumber}/cancel`, {
      method: "POST",
    });

    assert.equal(res.status, 400);
    assert.equal(res.body.success, false);
    assert.equal(res.body.error.code, "CANCELLATION_INVALID");
    assert.match(res.body.error.message, /không thể thực hiện hủy phòng/i);
  });

  test("5. Chặn hủy phòng nếu thời gian còn lại < 24 giờ (Luật 24h) -> 400 CANCELLATION_INVALID", async () => {
    // Tạo trực tiếp đơn đặt phòng có fromDate chỉ cách hiện tại 10 giờ
    const nearFromDate = new Date(Date.now() + 10 * 60 * 60 * 1000); // +10h
    const nearToDate = new Date(Date.now() + 34 * 60 * 60 * 1000); // +34h

    const nearBooking = await prisma.booking.create({
      data: {
        bookingNumber: "BK-TEST-UNDER24H",
        customerName: "Khách Đặt Gấp",
        customerPhone: "0988776655",
        customerEmail: "feat08.tester@ehotel.local",
        customerCccd: "001200999999",
        fromDate: nearFromDate,
        toDate: nearToDate,
        totalRoomFee: 1200000,
        netRoomFee: 1200000,
        paymentOption: "FULL_100",
        prepaidBookingValue: 1200000,
        paymentAccountNumber: testAccountNumber,
        status: "CONFIRMED",
        items: {
          create: [
            {
              roomType: "VIP",
              roomSize: "SINGLE",
              quantity: 1,
              unitPrice: 1200000,
            },
          ],
        },
      },
    });

    // 1. Kiểm tra tra cứu: isCancellable phải là false
    const lookupRes = await request(`/api/public/bookings/${nearBooking.bookingNumber}`);
    assert.equal(lookupRes.status, 200);
    assert.equal(lookupRes.body.data.cancellationPolicy.isCancellable, false);
    assert.match(lookupRes.body.data.cancellationPolicy.reason, /dưới 24 giờ/i);

    // 2. Thử hủy phòng -> Phải bị từ chối 400 CANCELLATION_INVALID
    const cancelRes = await request(`/api/public/bookings/${nearBooking.bookingNumber}/cancel`, {
      method: "POST",
    });

    assert.equal(cancelRes.status, 400);
    assert.equal(cancelRes.body.success, false);
    assert.equal(cancelRes.body.error.code, "CANCELLATION_INVALID");
    assert.match(cancelRes.body.error.message, /tối thiểu 24 giờ/i);

    // Trạng thái đơn vẫn phải là CONFIRMED trong DB
    const checkDb = await prisma.booking.findUnique({
      where: { id: nearBooking.id },
    });
    assert.equal(checkDb.status, "CONFIRMED");
    assert.equal(checkDb.cancelledAt, null);
  });

  test("6. Chặn hủy phòng nếu đơn đã CHECKED_IN hoặc CHECKED_OUT -> 400 CANCELLATION_INVALID", async () => {
    // Tạo đơn trạng thái CHECKED_IN
    const checkedInBooking = await prisma.booking.create({
      data: {
        bookingNumber: "BK-TEST-CHECKEDIN",
        customerName: "Khách Đang Ở",
        customerPhone: "0988776655",
        customerEmail: "feat08.tester@ehotel.local",
        customerCccd: "001200999998",
        fromDate: new Date(Date.now() + 48 * 60 * 60 * 1000),
        toDate: new Date(Date.now() + 72 * 60 * 60 * 1000),
        totalRoomFee: 1500000,
        netRoomFee: 1500000,
        paymentOption: "FULL_100",
        prepaidBookingValue: 1500000,
        paymentAccountNumber: testAccountNumber,
        status: "CHECKED_IN",
        items: {
          create: [
            {
              roomType: "VIP",
              roomSize: "SINGLE",
              quantity: 1,
              unitPrice: 1500000,
            },
          ],
        },
      },
    });

    const cancelRes = await request(`/api/public/bookings/${checkedInBooking.bookingNumber}/cancel`, {
      method: "POST",
    });

    assert.equal(cancelRes.status, 400);
    assert.equal(cancelRes.body.success, false);
    assert.equal(cancelRes.body.error.code, "CANCELLATION_INVALID");
    assert.match(cancelRes.body.error.message, /CHECKED_IN/i);
  });

  test("7. Hủy phòng thành công giải phóng tồn kho phòng trống (AvailableQuota tăng trở lại)", async () => {
    const fromDate = new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];
    const toDate = new Date(Date.now() + 17 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];

    // Lấy tồn kho ban đầu
    const availBefore = await request(`/api/public/availability?fromDate=${fromDate}&toDate=${toDate}&type=VIP&size=SINGLE`);
    assert.equal(availBefore.status, 200);
    const initialAvailable = availBefore.body.data.categories[0].availableQuota;

    // Đặt 1 phòng VIP SINGLE
    const createRes = await request("/api/public/bookings", {
      method: "POST",
      body: JSON.stringify({
        customerName: "Phạm Văn Quota",
        customerPhone: "0933112233",
        customerEmail: "feat08.tester@ehotel.local",
        customerCccd: "001200554433",
        fromDate,
        toDate,
        items: [{ roomType: "VIP", roomSize: "SINGLE", quantity: 1 }],
        paymentOption: "FULL_100",
        paymentAccountNumber: testAccountNumber,
      }),
    });
    assert.equal(createRes.status, 201);
    const bookingNumber = createRes.body.data.booking.bookingNumber;

    // Kiểm tra tồn kho sau khi đặt: phải giảm 1
    const availAfterBook = await request(`/api/public/availability?fromDate=${fromDate}&toDate=${toDate}&type=VIP&size=SINGLE`);
    assert.equal(availAfterBook.body.data.categories[0].availableQuota, initialAvailable - 1);

    // Hủy đơn đặt phòng
    const cancelRes = await request(`/api/public/bookings/${bookingNumber}/cancel`, {
      method: "POST",
    });
    assert.equal(cancelRes.status, 200);

    // Kiểm tra tồn kho sau khi hủy: phải được phục hồi về ban đầu
    const availAfterCancel = await request(`/api/public/availability?fromDate=${fromDate}&toDate=${toDate}&type=VIP&size=SINGLE`);
    assert.equal(availAfterCancel.body.data.categories[0].availableQuota, initialAvailable);
  });

  test("8. Xử lý đặt phòng với cọc 50% (DEPOSIT_50): Khi hủy hoàn 80% của số tiền cọc đã trả", async () => {
    const fromDate = new Date(Date.now() + 20 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];
    const toDate = new Date(Date.now() + 22 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];

    const createRes = await request("/api/public/bookings", {
      method: "POST",
      body: JSON.stringify({
        customerName: "Vũ Hải Đăng",
        customerPhone: "0944556677",
        customerEmail: "feat08.tester@ehotel.local",
        customerCccd: "001200112233",
        fromDate,
        toDate,
        items: [{ roomType: "DELUX", roomSize: "SINGLE", quantity: 1 }],
        paymentOption: "DEPOSIT_50",
        paymentAccountNumber: testAccountNumber,
      }),
    });
    assert.equal(createRes.status, 201);
    const booking = createRes.body.data.booking;
    assert.equal(booking.paymentOption, "DEPOSIT_50");

    const prepaid = booking.prepaidBookingValue;
    const expectedFee = Math.round(prepaid * 0.2);
    const expectedRefund = prepaid - expectedFee;

    const cancelRes = await request(`/api/public/bookings/${booking.bookingNumber}/cancel`, {
      method: "POST",
    });

    assert.equal(cancelRes.status, 200);
    assert.equal(cancelRes.body.data.booking.cancellationFee, expectedFee);
    assert.equal(cancelRes.body.data.booking.refundAmount, expectedRefund);
    assert.equal(cancelRes.body.data.refund.refundAmount, expectedRefund);
  });

  test("9. Pessimistic Locking & Concurrency: Hủy đồng thời chỉ 1 request thành công, chống Double Refund", async () => {
    const fromDate = new Date(Date.now() + 25 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];
    const toDate = new Date(Date.now() + 27 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];

    const createRes = await request("/api/public/bookings", {
      method: "POST",
      body: JSON.stringify({
        customerName: "Đỗ Minh Concurrency",
        customerPhone: "0977889900",
        customerEmail: "feat08.tester@ehotel.local",
        customerCccd: "001200889900",
        fromDate,
        toDate,
        items: [{ roomType: "LIVING_SUITE", roomSize: "DOUBLE", quantity: 1 }],
        paymentOption: "FULL_100",
        paymentAccountNumber: testAccountNumber,
      }),
    });
    assert.equal(createRes.status, 201);
    const bookingNumber = createRes.body.data.booking.bookingNumber;
    const prepaidValue = createRes.body.data.booking.prepaidBookingValue;

    const accBeforeParallel = await prisma.paymentAccount.findUnique({
      where: { accountNumber: testAccountNumber },
    });
    const balanceBeforeParallel = Number(accBeforeParallel.balance);

    // Gửi đồng thời 2 yêu cầu hủy phòng
    const [res1, res2] = await Promise.all([
      request(`/api/public/bookings/${bookingNumber}/cancel`, { method: "POST" }),
      request(`/api/public/bookings/${bookingNumber}/cancel`, { method: "POST" }),
    ]);

    const statuses = [res1.status, res2.status].sort();
    assert.deepEqual(statuses, [200, 400], "Chính xác 1 request thành công (200) và 1 request thất bại (400)");

    // Số dư chỉ được cộng hoàn đúng 1 lần
    const expectedRefund = prepaidValue - Math.round(prepaidValue * 0.2);
    const accAfterParallel = await prisma.paymentAccount.findUnique({
      where: { accountNumber: testAccountNumber },
    });
    assert.equal(Number(accAfterParallel.balance), balanceBeforeParallel + expectedRefund);
  });
});
