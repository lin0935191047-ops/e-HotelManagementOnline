import test, { describe, before, after } from "node:test";
import assert from "node:assert/strict";
import http from "node:http";
import ExcelJS from "exceljs";
import { app } from "../src/main.js";
import { prisma } from "../src/common/prisma.js";

describe("FEAT-12: Revenue Report & Excel/PDF Export", () => {
  let server;
  let baseUrl;
  let saleToken;
  let adminToken;
  let managerToken;

  const testEmail = "feat12.tester@ehotel.local";
  const testAccountNum = "8888777766665555";

  // Phòng test chuyên dụng
  const testRoom101 = "REV-TEST-101";

  // Dịch vụ test chuyên dụng
  const testServiceId = "SRV-T12-SPA";
  const testServicePrice = 300000;

  let checkoutBookingId = null;
  let checkoutBookingNumber = null;
  let cancelledBookingId = null;
  let cancelledBookingNumber = null;
  let checkoutInvoiceAmount = 0;
  let cancellationFeeAmount = 0;

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
    return { status: res.status, headers: res.headers, body };
  }

  // Helper request binary
  async function requestBuffer(endpoint, options = {}) {
    const url = `${baseUrl}${endpoint}`;
    const res = await fetch(url, {
      ...options,
      headers: {
        ...(options.headers || {}),
      },
    });
    const arrayBuffer = await res.arrayBuffer();
    return {
      status: res.status,
      headers: res.headers,
      buffer: Buffer.from(arrayBuffer),
    };
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
          { roomId: testRoom101 },
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
          { roomId: testRoom101 },
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
      where: { roomId: testRoom101 },
    });

    // 3. Tạo phòng test: REV-TEST-101 VIP SINGLE, giá 800.000đ/đêm
    await prisma.room.create({
      data: {
        roomId: testRoom101,
        type: "VIP",
        size: "SINGLE",
        price: 800000,
        maxAdults: 1,
        maxChildren: 1,
        extraChildFee: 100000,
        status: "AVAILABLE",
        description: "Phòng Test Doanh Thu",
      },
    });

    // 4. Tạo dịch vụ test
    await prisma.service.create({
      data: {
        serviceId: testServiceId,
        serviceName: "Spa Thảo Dược Test",
        description: "Dịch vụ thư giãn",
        unit: "Lượt",
        price: testServicePrice,
      },
    });

    // 5. Tạo tài khoản thanh toán giả lập
    await prisma.paymentAccount.create({
      data: {
        cardType: "ATM",
        accountNumber: testAccountNum,
        accountHolder: "FEAT12 TESTER",
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

    // 7. Tạo Booking 1 để thực hiện CHECK-OUT:
    // Đặt 2 đêm VIP SINGLE: Tiền phòng = 800.000 * 2 = 1.600.000đ
    const today = new Date();
    const fromDate1 = new Date(today.getTime() + 1 * 24 * 60 * 60 * 1000)
      .toISOString()
      .split("T")[0];
    const toDate1 = new Date(today.getTime() + 3 * 24 * 60 * 60 * 1000)
      .toISOString()
      .split("T")[0];

    const createRes1 = await request("/api/public/bookings", {
      method: "POST",
      body: JSON.stringify({
        customerName: "Nguyễn Doanh Thu",
        customerPhone: "0911222333",
        customerEmail: testEmail,
        customerCccd: "001200112233",
        fromDate: fromDate1,
        toDate: toDate1,
        items: [{ roomType: "VIP", roomSize: "SINGLE", quantity: 1 }],
        paymentOption: "FULL_100",
        paymentAccountNumber: testAccountNum,
      }),
    });
    assert.equal(createRes1.status, 201);
    checkoutBookingId = createRes1.body.data.booking.id;
    checkoutBookingNumber = createRes1.body.data.booking.bookingNumber;

    // Check-in Booking 1 với phòng testRoom101 kèm 1 trẻ em phụ thu (2 trẻ em, định mức 1 => dư 1 trẻ em: 100.000 * 2 đêm = 200.000đ)
    const checkinRes = await request(`/api/operation/bookings/${checkoutBookingId}/check-in`, {
      method: "POST",
      headers: { Authorization: `Bearer ${saleToken}` },
      body: JSON.stringify({
        assignments: [
          {
            roomId: testRoom101,
            guests: [
              { fullName: "Nguyễn Doanh Thu", idNumber: "001200112233", birthYear: 1990, guestType: "ADULT" },
              { fullName: "Bé A", idNumber: "KHAISINH01", birthYear: 2020, guestType: "CHILD" },
              { fullName: "Bé B", idNumber: "KHAISINH02", birthYear: 2022, guestType: "CHILD" },
            ],
          },
        ],
      }),
    });
    assert.equal(checkinRes.status, 200);

    // Đăng ký 1 suất Spa (300.000đ)
    const usageRes = await request("/api/operation/services/usage", {
      method: "POST",
      headers: { Authorization: `Bearer ${saleToken}` },
      body: JSON.stringify({
        roomId: testRoom101,
        serviceId: testServiceId,
        quantity: 1,
      }),
    });
    assert.equal(usageRes.status, 201);

    // Check-out Booking 1:
    // Tổng hóa đơn = Tiền phòng (1.600.000) + Phụ thu trẻ em (200.000) + Dịch vụ (300.000) = 2.100.000đ
    const checkoutRes = await request(`/api/operation/bookings/${checkoutBookingId}/check-out`, {
      method: "POST",
      headers: { Authorization: `Bearer ${saleToken}` },
    });
    assert.equal(checkoutRes.status, 200);
    checkoutInvoiceAmount = checkoutRes.body.data.invoice.totalInvoiceAmount;
    assert.equal(checkoutInvoiceAmount, 2100000);

    // 8. Tạo Booking 2 để thực hiện HỦY PHÒNG (CANCELLED):
    // Đặt 1 đêm VIP SINGLE: 800.000đ, trả 100% = 800.000đ
    const fromDate2 = new Date(today.getTime() + 5 * 24 * 60 * 60 * 1000)
      .toISOString()
      .split("T")[0];
    const toDate2 = new Date(today.getTime() + 6 * 24 * 60 * 60 * 1000)
      .toISOString()
      .split("T")[0];

    const createRes2 = await request("/api/public/bookings", {
      method: "POST",
      body: JSON.stringify({
        customerName: "Trần Hủy Phòng",
        customerPhone: "0933444555",
        customerEmail: testEmail,
        customerCccd: "001200334455",
        fromDate: fromDate2,
        toDate: toDate2,
        items: [{ roomType: "VIP", roomSize: "SINGLE", quantity: 1 }],
        paymentOption: "FULL_100",
        paymentAccountNumber: testAccountNum,
      }),
    });
    assert.equal(createRes2.status, 201);
    cancelledBookingId = createRes2.body.data.booking.id;
    cancelledBookingNumber = createRes2.body.data.booking.bookingNumber;

    // Hủy Booking 2: Phí hủy 20% = 800.000 * 20% = 160.000đ
    const cancelRes = await request(`/api/public/bookings/${cancelledBookingNumber}/cancel`, {
      method: "POST",
    });
    assert.equal(cancelRes.status, 200);
    cancellationFeeAmount = cancelRes.body.data.booking.cancellationFee;
    assert.equal(cancellationFeeAmount, 160000);
  });

  after(async () => {
    // Dọn dẹp dữ liệu
    await prisma.invoice.deleteMany({
      where: { booking: { customerEmail: testEmail } },
    });
    await prisma.serviceUsage.deleteMany({
      where: {
        OR: [
          { serviceId: testServiceId },
          { roomId: testRoom101 },
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
          { roomId: testRoom101 },
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
      where: { roomId: testRoom101 },
    });

    if (server) {
      await new Promise((resolve) => server.close(resolve));
    }
  });

  test("1. Strict Disjoint RBAC: ADMIN và MANAGER gọi API báo cáo doanh thu bị từ chối 403, SALE được phép truy cập (200 OK)", async () => {
    // ADMIN -> 403
    const adminRes = await request("/api/operation/reports/revenue", {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    assert.equal(adminRes.status, 403);
    assert.equal(adminRes.body.error?.code, "FORBIDDEN_ACCESS");

    // MANAGER -> 403
    const managerRes = await request("/api/operation/reports/revenue", {
      headers: { Authorization: `Bearer ${managerToken}` },
    });
    assert.equal(managerRes.status, 403);
    assert.equal(managerRes.body.error?.code, "FORBIDDEN_ACCESS");

    // SALE -> 200 OK
    const saleRes = await request("/api/operation/reports/revenue", {
      headers: { Authorization: `Bearer ${saleToken}` },
    });
    assert.equal(saleRes.status, 200);
    assert.equal(saleRes.body.success, true);
    assert.ok(saleRes.body.data.summary);
    assert.ok(Array.isArray(saleRes.body.data.records));
  });

  test("2. Strict Disjoint RBAC trên Endpoints xuất file Excel và PDF: ADMIN/MANAGER nhận 403 Forbidden", async () => {
    const adminExcel = await request("/api/operation/reports/revenue/export-excel", {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    assert.equal(adminExcel.status, 403);

    const managerPdf = await request("/api/operation/reports/revenue/export-pdf", {
      headers: { Authorization: `Bearer ${managerToken}` },
    });
    assert.equal(managerPdf.status, 403);
  });

  test("3. Verification Gate 1: Công thức Tổng Doanh Thu khớp chính xác tổng tiền hóa đơn CHECKED_OUT + 20% phí phạt CANCELLED trong kỳ (SPEC 4.5)", async () => {
    const todayStr = new Date().toISOString().split("T")[0];
    const res = await request(`/api/operation/reports/revenue?fromDate=${todayStr}&toDate=${todayStr}`, {
      headers: { Authorization: `Bearer ${saleToken}` },
    });

    assert.equal(res.status, 200);
    const { summary, records } = res.body.data;

    // Kiểm tra các giao dịch test nằm trong danh sách records
    const checkoutItem = records.find((r) => r.bookingNumber === checkoutBookingNumber);
    const cancelledItem = records.find((r) => r.bookingNumber === cancelledBookingNumber);

    assert.ok(checkoutItem, "Giao dịch Check-out phải xuất hiện trong bảng báo cáo");
    assert.equal(checkoutItem.status, "CHECKED_OUT");
    assert.equal(checkoutItem.revenueAmount, 2100000);
    assert.equal(checkoutItem.netRoomFee, 1600000);
    assert.equal(checkoutItem.extraChildrenFee, 200000);
    assert.equal(checkoutItem.totalServiceFee, 300000);
    assert.ok(checkoutItem.invoiceId.startsWith("INV-"));

    assert.ok(cancelledItem, "Giao dịch Hủy phòng phải xuất hiện trong bảng báo cáo");
    assert.equal(cancelledItem.status, "CANCELLED");
    assert.equal(cancelledItem.revenueAmount, 160000);
    assert.equal(cancelledItem.cancellationFee, 160000);

    // Kiểm tra công thức SPEC 4.5: Total Revenue = Total Checkout Invoices + Total Cancellation Fees
    assert.equal(
      summary.totalRevenue,
      summary.totalCheckoutRevenue + summary.totalCancellationFee,
      "Tổng doanh thu phải bằng tổng hóa đơn check-out + tổng phí phạt hủy phòng"
    );
    assert.ok(summary.totalCheckoutRevenue >= 2100000);
    assert.ok(summary.totalCancellationFee >= 160000);
    assert.ok(summary.totalRevenue >= 2260000);
  });

  test("4. Lọc Báo cáo theo khoảng thời gian không có giao dịch trả về danh sách rỗng và Doanh thu = 0", async () => {
    // Lọc ngày trong quá khứ xa (ví dụ năm 2020)
    const res = await request("/api/operation/reports/revenue?fromDate=2020-01-01&toDate=2020-01-02", {
      headers: { Authorization: `Bearer ${saleToken}` },
    });

    assert.equal(res.status, 200);
    const { summary, records } = res.body.data;

    assert.equal(summary.totalRevenue, 0);
    assert.equal(summary.totalCheckoutRevenue, 0);
    assert.equal(summary.totalCancellationFee, 0);
    assert.equal(summary.checkoutCount, 0);
    assert.equal(summary.cancellationCount, 0);
    assert.equal(summary.totalCount, 0);
    assert.equal(records.length, 0);
  });

  test("5. Verification Gate 2: Endpoint xuất file Excel trả về đúng định dạng .xlsx với MIME type và cấu trúc bảng hợp lệ", async () => {
    const todayStr = new Date().toISOString().split("T")[0];
    const res = await requestBuffer(
      `/api/operation/reports/revenue/export-excel?fromDate=${todayStr}&toDate=${todayStr}`,
      {
        headers: { Authorization: `Bearer ${saleToken}` },
      }
    );

    assert.equal(res.status, 200);

    // Kiểm tra Headers
    const contentType = res.headers.get("content-type");
    assert.ok(
      contentType.includes("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"),
      "Content-Type phải là file Excel .xlsx"
    );

    const contentDisposition = res.headers.get("content-disposition");
    assert.ok(
      contentDisposition.includes("attachment") && contentDisposition.includes(".xlsx"),
      "Content-Disposition phải có attachment và đuôi .xlsx"
    );

    // Đọc buffer bằng ExcelJS để kiểm tra tính toàn vẹn của file
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(res.buffer);
    const worksheet = workbook.getWorksheet("Báo Cáo Doanh Thu");
    assert.ok(worksheet, "Worksheet Báo Cáo Doanh Thu phải tồn tại");

    // Kiểm tra tiêu đề và dòng tổng cộng trong sheet
    const cellA1 = worksheet.getCell("A1").value;
    assert.ok(String(cellA1).includes("E-HOTEL"), "Tiêu đề phải chứa tên khách sạn");

    let foundCheckoutBooking = false;
    let foundCancelledBooking = false;
    worksheet.eachRow((row) => {
      const rowValues = row.values;
      if (Array.isArray(rowValues)) {
        if (rowValues.includes(checkoutBookingNumber)) foundCheckoutBooking = true;
        if (rowValues.includes(cancelledBookingNumber)) foundCancelledBooking = true;
      }
    });

    assert.ok(foundCheckoutBooking, "Mã booking check-out phải xuất hiện trong file Excel");
    assert.ok(foundCancelledBooking, "Mã booking hủy phải xuất hiện trong file Excel");
  });

  test("6. Verification Gate 2: Endpoint xuất file PDF trả về đúng định dạng .pdf với magic header %PDF- và dung lượng chuẩn", async () => {
    const todayStr = new Date().toISOString().split("T")[0];
    const res = await requestBuffer(
      `/api/operation/reports/revenue/export-pdf?fromDate=${todayStr}&toDate=${todayStr}`,
      {
        headers: { Authorization: `Bearer ${saleToken}` },
      }
    );

    assert.equal(res.status, 200);

    // Kiểm tra Headers
    const contentType = res.headers.get("content-type");
    assert.ok(contentType.includes("application/pdf"), "Content-Type phải là application/pdf");

    const contentDisposition = res.headers.get("content-disposition");
    assert.ok(
      contentDisposition.includes("attachment") && contentDisposition.includes(".pdf"),
      "Content-Disposition phải có attachment và đuôi .pdf"
    );

    // Kiểm tra Magic Bytes %PDF- (chuẩn PDF file format)
    const pdfMagic = res.buffer.slice(0, 5).toString("utf-8");
    assert.equal(pdfMagic, "%PDF-", "File trả về phải bắt đầu bằng magic header %PDF-");
    assert.ok(res.buffer.length > 1000, "Dung lượng file PDF phải > 1KB");
  });

  test("7. Xuất file Excel và PDF khi không có giao dịch trong kỳ (kỳ rỗng) vẫn tạo file thành công không lỗi", async () => {
    const emptyExcel = await requestBuffer(
      "/api/operation/reports/revenue/export-excel?fromDate=2019-01-01&toDate=2019-01-02",
      {
        headers: { Authorization: `Bearer ${saleToken}` },
      }
    );
    assert.equal(emptyExcel.status, 200);
    assert.ok(emptyExcel.buffer.length > 0);

    const emptyPdf = await requestBuffer(
      "/api/operation/reports/revenue/export-pdf?fromDate=2019-01-01&toDate=2019-01-02",
      {
        headers: { Authorization: `Bearer ${saleToken}` },
      }
    );
    assert.equal(emptyPdf.status, 200);
    assert.equal(emptyPdf.buffer.slice(0, 5).toString("utf-8"), "%PDF-");
  });

  test("8. Báo cáo khi không truyền fromDate và toDate lấy toàn bộ lịch sử giao dịch", async () => {
    const res = await request("/api/operation/reports/revenue", {
      headers: { Authorization: `Bearer ${saleToken}` },
    });
    assert.equal(res.status, 200);
    assert.ok(res.body.data.records.length >= 2);
    assert.equal(res.body.data.summary.fromDate, null);
    assert.equal(res.body.data.summary.toDate, null);
    assert.ok(res.body.data.summary.totalRevenue >= 2260000);
  });
});
