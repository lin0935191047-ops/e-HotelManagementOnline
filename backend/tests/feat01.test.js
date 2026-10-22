import test, { describe, before, after } from "node:test";
import assert from "node:assert/strict";
import { prisma } from "../src/common/prisma.js";

describe("FEAT-01: Prisma Schema & Mock Data Verification", () => {
  before(async () => {
    // Kết nối đến cơ sở dữ liệu
    await prisma.$connect();
  });

  after(async () => {
    // Ngắt kết nối sau kiểm thử
    await prisma.$disconnect();
  });

  test("Kiểm tra kết nối Database", async () => {
    const result = await prisma.$queryRaw`SELECT 1 as connected`;
    assert.ok(result.length > 0, "Database phải kết nối thành công");
  });

  test("Kiểm tra tồn tại đủ 3 vai trò (ADMIN, MANAGER, SALE)", async () => {
    const users = await prisma.user.findMany();
    const roles = users.map((u) => u.role);
    
    assert.ok(roles.includes("ADMIN"), "Phải có người dùng vai trò ADMIN");
    assert.ok(roles.includes("MANAGER"), "Phải có người dùng vai trò MANAGER");
    assert.ok(roles.includes("SALE"), "Phải có người dùng vai trò SALE");
    assert.strictEqual(users.length >= 3, true, "Phải có ít nhất 3 người dùng");
  });

  test("Kiểm tra tài khoản thanh toán giả lập (ATM, VISA)", async () => {
    const accounts = await prisma.paymentAccount.findMany();
    assert.strictEqual(accounts.length >= 2, true, "Phải có ít nhất 2 thẻ thanh toán giả lập");
    
    const atm = accounts.find((a) => a.cardType === "ATM");
    const visa = accounts.find((a) => a.cardType === "VISA");
    
    assert.ok(atm, "Phải có thẻ ATM");
    assert.ok(visa, "Phải có thẻ VISA");
    assert.ok(Number(atm.balance) > 0, "Số dư thẻ ATM phải > 0");
    assert.ok(Number(visa.balance) > 0, "Số dư thẻ VISA phải > 0");
  });

  test("Kiểm tra dữ liệu phòng và dịch vụ mẫu", async () => {
    const rooms = await prisma.room.findMany();
    const services = await prisma.service.findMany();
    const promotions = await prisma.promotion.findMany();

    assert.ok(rooms.length >= 5, "Phải có ít nhất 5 phòng mẫu");
    assert.ok(services.length >= 4, "Phải có ít nhất 4 dịch vụ mẫu");
    assert.ok(promotions.length >= 2, "Phải có ít nhất 2 mã khuyến mãi");
  });
});
