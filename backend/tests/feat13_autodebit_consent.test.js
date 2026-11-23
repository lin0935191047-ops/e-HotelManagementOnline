import test, { describe, before, after } from "node:test";
import assert from "node:assert/strict";
import http from "node:http";
import { app } from "../src/main.js";
import { prisma } from "../src/common/prisma.js";

describe("FEAT-13.3: Customer Consent & Admin Activation System", () => {
  let server;
  let baseUrl;
  let adminToken;
  let customerToken1;
  let customerUser1;
  let customerToken2;
  let customerUser2;

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

    // 2. Lấy token Admin
    const adminRes = await fetch(`${baseUrl}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username: "admin", password: "Admin@123" }),
    });
    const adminData = await adminRes.json();
    adminToken = adminData.data.token;

    // 3. Dọn dẹp dữ liệu test cũ nếu có
    await prisma.user.deleteMany({
      where: {
        username: { in: ["test_consent_cust1", "test_consent_cust2"] },
      },
    });

    // 4. Đăng ký khách hàng 1 (sẽ đồng ý consent)
    const regRes1 = await fetch(`${baseUrl}/api/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        username: "test_consent_cust1",
        password: "Customer@123",
        fullName: "Lê Đồng Thuận",
      }),
    });
    const regData1 = await regRes1.json();
    customerToken1 = regData1.data.token;
    customerUser1 = regData1.data.user;

    // 5. Đăng ký khách hàng 2 (chưa đồng ý consent, dùng để test vi phạm kích hoạt)
    const regRes2 = await fetch(`${baseUrl}/api/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        username: "test_consent_cust2",
        password: "Customer@123",
        fullName: "Phạm Chưa Đồng Ý",
      }),
    });
    const regData2 = await regRes2.json();
    customerToken2 = regData2.data.token;
    customerUser2 = regData2.data.user;
  });

  after(async () => {
    // Dọn dẹp dữ liệu test
    await prisma.user.deleteMany({
      where: {
        username: { in: ["test_consent_cust1", "test_consent_cust2"] },
      },
    });

    if (server) {
      await new Promise((resolve) => server.close(resolve));
    }
  });

  // -------------------------------------------------------------
  // Test 1: Xem Điều khoản Auto-Debit (Public API)
  // -------------------------------------------------------------
  test("1. GET /api/auto-debit/terms xem điều khoản công khai không cần token (200 OK)", async () => {
    const res = await fetch(`${baseUrl}/api/auto-debit/terms`);
    assert.strictEqual(res.status, 200);

    const body = await res.json();
    assert.strictEqual(body.success, true);
    assert.strictEqual(body.data.termsVersion, "v1.0");
    assert.ok(body.data.termsContent.includes("BR-01"));
    assert.ok(body.data.termsContent.includes("BR-02"));
    assert.ok(body.data.effectiveDate);
  });

  // -------------------------------------------------------------
  // Test 2: Khách hàng xem trạng thái ban đầu khi chưa đăng ký
  // -------------------------------------------------------------
  test("2. GET /api/auto-debit/my-status khi chưa đồng ý trả về trạng thái NOT_ENABLED (200 OK)", async () => {
    const res = await fetch(`${baseUrl}/api/auto-debit/my-status`, {
      headers: {
        Authorization: `Bearer ${customerToken1}`,
      },
    });
    assert.strictEqual(res.status, 200);

    const body = await res.json();
    assert.strictEqual(body.success, true);
    assert.strictEqual(body.data.autoDebitStatus, "NOT_ENABLED");
    assert.strictEqual(body.data.latestConsent, null);
    assert.strictEqual(body.data.balance, 0);
  });

  // -------------------------------------------------------------
  // Test 3: Khách hàng gửi consent nhưng không tích chọn đồng ý (Validation error)
  // -------------------------------------------------------------
  test("3. POST /api/auto-debit/consent với agreed: false bị từ chối (400 Bad Request)", async () => {
    const res = await fetch(`${baseUrl}/api/auto-debit/consent`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${customerToken1}`,
      },
      body: JSON.stringify({
        agreed: false,
      }),
    });
    assert.strictEqual(res.status, 400);

    const body = await res.json();
    assert.strictEqual(body.success, false);
    assert.strictEqual(body.error.code, "VALIDATION_FAILED");
  });

  // -------------------------------------------------------------
  // Test 4: Khách hàng gửi consent hợp lệ (agreed: true)
  // -------------------------------------------------------------
  test("4. POST /api/auto-debit/consent hợp lệ chuyển trạng thái sang PENDING_ADMIN (200 OK)", async () => {
    const res = await fetch(`${baseUrl}/api/auto-debit/consent`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${customerToken1}`,
        "User-Agent": "Node-Test-Agent/1.0",
      },
      body: JSON.stringify({
        agreed: true,
        termsVersion: "v1.0",
      }),
    });
    assert.strictEqual(res.status, 200);

    const body = await res.json();
    assert.strictEqual(body.success, true);
    assert.strictEqual(body.data.status, "PENDING_ADMIN");
    assert.strictEqual(body.data.consent.termsVersion, "v1.0");
    assert.strictEqual(body.data.consent.isActive, true);
    assert.ok(body.data.consent.agreedAt);
  });

  // -------------------------------------------------------------
  // Test 5: Khách hàng kiểm tra trạng thái sau khi submit consent
  // -------------------------------------------------------------
  test("5. GET /api/auto-debit/my-status phản ánh đúng PENDING_ADMIN và thông tin consent (200 OK)", async () => {
    const res = await fetch(`${baseUrl}/api/auto-debit/my-status`, {
      headers: {
        Authorization: `Bearer ${customerToken1}`,
      },
    });
    assert.strictEqual(res.status, 200);

    const body = await res.json();
    assert.strictEqual(body.success, true);
    assert.strictEqual(body.data.autoDebitStatus, "PENDING_ADMIN");
    assert.ok(body.data.latestConsent);
    assert.strictEqual(body.data.latestConsent.termsVersion, "v1.0");
    assert.strictEqual(body.data.latestConsent.isActive, true);
  });

  // -------------------------------------------------------------
  // Test 6: QUY TẮC SRS 5.1 — Admin cố kích hoạt khách hàng chưa có consent hợp lệ
  // -------------------------------------------------------------
  test("6. PUT /api/auto-debit/admin/:userId/status kích hoạt khách hàng chưa đồng thuận bị chặn với AUTO_DEBIT_NOT_CONSENTED (400 Bad Request)", async () => {
    const res = await fetch(`${baseUrl}/api/auto-debit/admin/${customerUser2.id}/status`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({
        status: "ACTIVE",
      }),
    });
    assert.strictEqual(res.status, 400);

    const body = await res.json();
    assert.strictEqual(body.success, false);
    assert.strictEqual(body.error.code, "AUTO_DEBIT_NOT_CONSENTED");
  });

  // -------------------------------------------------------------
  // Test 7: Admin xem danh sách các yêu cầu kích hoạt Auto-Debit
  // -------------------------------------------------------------
  test("7. GET /api/auto-debit/admin/list xem danh sách cấu hình và yêu cầu chờ duyệt (200 OK)", async () => {
    const res = await fetch(`${baseUrl}/api/auto-debit/admin/list?status=PENDING_ADMIN`, {
      headers: {
        Authorization: `Bearer ${adminToken}`,
      },
    });
    assert.strictEqual(res.status, 200);

    const body = await res.json();
    assert.strictEqual(body.success, true);
    assert.ok(Array.isArray(body.data.requests));
    const found = body.data.requests.find((r) => r.userId === customerUser1.id);
    assert.ok(found);
    assert.strictEqual(found.status, "PENDING_ADMIN");
    assert.strictEqual(found.hasActiveConsent, true);
    assert.strictEqual(found.termsVersion, "v1.0");
  });

  // -------------------------------------------------------------
  // Test 8: Admin kích hoạt thành công (ACTIVE) cho khách hàng đã có consent
  // -------------------------------------------------------------
  test("8. PUT /api/auto-debit/admin/:userId/status kích hoạt thành công ACTIVE khi khách hàng đã có consent (200 OK)", async () => {
    const res = await fetch(`${baseUrl}/api/auto-debit/admin/${customerUser1.id}/status`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({
        status: "ACTIVE",
      }),
    });
    assert.strictEqual(res.status, 200);

    const body = await res.json();
    assert.strictEqual(body.success, true);
    assert.strictEqual(body.data.status, "ACTIVE");
    assert.strictEqual(body.data.updatedBy, "admin");
    assert.ok(body.data.activatedAt);

    // Xác nhận phía khách hàng thấy trạng thái ACTIVE
    const myRes = await fetch(`${baseUrl}/api/auto-debit/my-status`, {
      headers: { Authorization: `Bearer ${customerToken1}` },
    });
    const myBody = await myRes.json();
    assert.strictEqual(myBody.data.autoDebitStatus, "ACTIVE");
  });

  // -------------------------------------------------------------
  // Test 9: Admin tạm dừng (PAUSED) dịch vụ Auto-Debit
  // -------------------------------------------------------------
  test("9. PUT /api/auto-debit/admin/:userId/status chuyển sang PAUSED thành công (200 OK)", async () => {
    const res = await fetch(`${baseUrl}/api/auto-debit/admin/${customerUser1.id}/status`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({
        status: "PAUSED",
      }),
    });
    assert.strictEqual(res.status, 200);

    const body = await res.json();
    assert.strictEqual(body.success, true);
    assert.strictEqual(body.data.status, "PAUSED");
    assert.ok(body.data.pausedAt);
  });

  // -------------------------------------------------------------
  // Test 10: Admin vô hiệu hóa (DISABLED) dịch vụ Auto-Debit -> vô hiệu hóa consent
  // -------------------------------------------------------------
  test("10. PUT /api/auto-debit/admin/:userId/status chuyển sang DISABLED: vô hiệu hóa consent và ngăn kích hoạt lại nếu chưa re-consent (200 OK -> 400)", async () => {
    // Bước 1: Admin set DISABLED
    const disRes = await fetch(`${baseUrl}/api/auto-debit/admin/${customerUser1.id}/status`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({
        status: "DISABLED",
      }),
    });
    assert.strictEqual(disRes.status, 200);
    const disBody = await disRes.json();
    assert.strictEqual(disBody.data.status, "DISABLED");
    assert.ok(disBody.data.disabledAt);

    // Bước 2: Admin cố kích hoạt lại ngay lập tức -> bị chặn do consent đã bị deactivate
    const reactivateRes = await fetch(`${baseUrl}/api/auto-debit/admin/${customerUser1.id}/status`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({
        status: "ACTIVE",
      }),
    });
    assert.strictEqual(reactivateRes.status, 400);
    const reactivateBody = await reactivateRes.json();
    assert.strictEqual(reactivateBody.error.code, "AUTO_DEBIT_NOT_CONSENTED");
  });

  // -------------------------------------------------------------
  // Test 11: Kiểm tra phân quyền Disjoint RBAC nghiêm ngặt
  // -------------------------------------------------------------
  test("11. Disjoint RBAC: Customer không được gọi API Admin (403), Admin không được gọi API Customer (403)", async () => {
    // 1. Customer gọi API Admin list -> 403 Forbidden
    const custCallAdmin = await fetch(`${baseUrl}/api/auto-debit/admin/list`, {
      headers: { Authorization: `Bearer ${customerToken1}` },
    });
    assert.strictEqual(custCallAdmin.status, 403);

    // 2. Customer gọi API Admin update status -> 403 Forbidden
    const custUpdateAdmin = await fetch(
      `${baseUrl}/api/auto-debit/admin/${customerUser1.id}/status`,
      {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${customerToken1}`,
        },
        body: JSON.stringify({ status: "ACTIVE" }),
      },
    );
    assert.strictEqual(custUpdateAdmin.status, 403);

    // 3. Admin gọi API Customer consent -> 403 Forbidden
    const adminConsent = await fetch(`${baseUrl}/api/auto-debit/consent`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({ agreed: true }),
    });
    assert.strictEqual(adminConsent.status, 403);

    // 4. Admin gọi API Customer my-status -> 403 Forbidden
    const adminMyStatus = await fetch(`${baseUrl}/api/auto-debit/my-status`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    assert.strictEqual(adminMyStatus.status, 403);

    // 5. Chưa đăng nhập gọi endpoint yêu cầu xác thực -> 401 Unauthorized
    const unauthCall = await fetch(`${baseUrl}/api/auto-debit/my-status`);
    assert.strictEqual(unauthCall.status, 401);
  });
});
