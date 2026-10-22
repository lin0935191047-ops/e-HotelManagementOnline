import bcrypt from "bcryptjs";
import { prisma } from "../src/common/prisma.js";

async function main() {
  console.log("🌱 Bắt đầu gieo dữ liệu khởi tạo (Seed data)...");

  // 1. Dọn sạch dữ liệu cũ theo thứ tự quan hệ
  await prisma.invoice.deleteMany();
  await prisma.serviceUsage.deleteMany();
  await prisma.stayingGuest.deleteMany();
  await prisma.roomAssignment.deleteMany();
  await prisma.bookingItem.deleteMany();
  await prisma.booking.deleteMany();
  await prisma.promotion.deleteMany();
  await prisma.service.deleteMany();
  await prisma.room.deleteMany();
  await prisma.paymentAccount.deleteMany();
  await prisma.user.deleteMany();

  // 2. Khởi tạo 3 Người dùng với 3 Role độc lập
  const salt = await bcrypt.genSalt(10);
  const adminHash = await bcrypt.hash("Admin@123", salt);
  const managerHash = await bcrypt.hash("Manager@123", salt);
  const saleHash = await bcrypt.hash("Sale@123", salt);

  await prisma.user.createMany({
    data: [
      {
        username: "admin",
        passwordHash: adminHash,
        fullName: "Quản trị viên Hệ thống",
        role: "ADMIN",
        isActive: true,
      },
      {
        username: "manager",
        passwordHash: managerHash,
        fullName: "Trưởng phòng Quản lý",
        role: "MANAGER",
        isActive: true,
      },
      {
        username: "sale",
        passwordHash: saleHash,
        fullName: "Nhân viên Lễ tân & Bán hàng",
        role: "SALE",
        isActive: true,
      },
    ],
  });
  console.log("✅ Đã tạo 3 tài khoản nội bộ (admin, manager, sale).");

  // 3. Khởi tạo Tài khoản Thanh toán Giả lập
  await prisma.paymentAccount.createMany({
    data: [
      {
        cardType: "ATM",
        accountNumber: "97040001",
        accountHolder: "NGUYEN VAN A",
        balance: 50000000.0,
      },
      {
        cardType: "VISA",
        accountNumber: "4000123456789010",
        accountHolder: "TRAN THI B",
        balance: 100000000.0,
      },
    ],
  });
  console.log("✅ Đã tạo 2 tài khoản thanh toán giả lập (ATM, VISA).");

  // 4. Khởi tạo Hạng phòng & Phòng vật lý
  await prisma.room.createMany({
    data: [
      {
        roomId: "101",
        type: "VIP",
        size: "DOUBLE",
        price: 1200000,
        maxAdults: 2,
        maxChildren: 2,
        extraChildFee: 150000,
        description: "Phòng VIP Đôi hướng biển, đầy đủ tiện nghi cao cấp",
        pictures: [
          "https://images.unsplash.com/photo-1582719478250-c89cae4dc85b",
          "https://images.unsplash.com/photo-1591088398332-8a7791972843",
        ],
        status: "AVAILABLE",
      },
      {
        roomId: "102",
        type: "VIP",
        size: "SINGLE",
        price: 800000,
        maxAdults: 1,
        maxChildren: 1,
        extraChildFee: 150000,
        description: "Phòng VIP Đơn yên tĩnh, trang nhã cho doanh nhân",
        pictures: [
          "https://images.unsplash.com/photo-1618773928121-c32242e63f39",
        ],
        status: "AVAILABLE",
      },
      {
        roomId: "201",
        type: "DELUX",
        size: "DOUBLE",
        price: 1500000,
        maxAdults: 2,
        maxChildren: 2,
        extraChildFee: 200000,
        description: "Phòng Deluxe Đôi ban công rộng ngắm toàn cảnh",
        pictures: [
          "https://images.unsplash.com/photo-1590490360182-c33d57733427",
        ],
        status: "AVAILABLE",
      },
      {
        roomId: "202",
        type: "DELUX",
        size: "SINGLE",
        price: 1000000,
        maxAdults: 1,
        maxChildren: 1,
        extraChildFee: 200000,
        description: "Phòng Deluxe Đơn ấm cúng, thiết kế hiện đại",
        pictures: [
          "https://images.unsplash.com/photo-1566665797739-1674de7a421a",
        ],
        status: "AVAILABLE",
      },
      {
        roomId: "301",
        type: "LIVING_SUITE",
        size: "DOUBLE",
        price: 2500000,
        maxAdults: 4,
        maxChildren: 2,
        extraChildFee: 300000,
        description: "Phòng Suite Tổng thống có phòng khách, quầy bar riêng biệt",
        pictures: [
          "https://images.unsplash.com/photo-1578683010236-d716f9a3f461",
        ],
        status: "AVAILABLE",
      },
    ],
  });
  console.log("✅ Đã tạo 5 phòng mẫu thuộc 3 hạng phòng (VIP, DELUX, LIVING_SUITE).");

  // 5. Khởi tạo Dịch vụ
  await prisma.service.createMany({
    data: [
      {
        serviceId: "SRV-01",
        serviceName: "Giặt ủi nhanh",
        description: "Giặt và là khô lấy ngay trong ngày",
        unit: "Kg",
        price: 30000,
      },
      {
        serviceId: "SRV-02",
        serviceName: "Bữa sáng Buffet Quốc tế",
        description: "Thực đơn Á - Âu trên 50 món tự chọn",
        unit: "Suất",
        price: 150000,
      },
      {
        serviceId: "SRV-03",
        serviceName: "Massage Spa trị liệu toàn thân",
        description: "Liệu trình thư giãn thảo dược 60 phút",
        unit: "Lượt",
        price: 350000,
      },
      {
        serviceId: "SRV-04",
        serviceName: "Đưa đón sân bay 4 chỗ",
        description: "Xe riêng đón tại sân bay về khách sạn",
        unit: "Chuyến",
        price: 250000,
      },
    ],
  });
  console.log("✅ Đã tạo 4 dịch vụ khách sạn mẫu.");

  // 6. Khởi tạo Khuyến mãi
  const now = new Date();
  const nextMonth = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

  await prisma.promotion.createMany({
    data: [
      {
        code: "CHAOHET2026",
        name: "Ưu đãi chào năm 2026",
        description: "Giảm 10% tổng giá trị phòng",
        discountType: "PERCENTAGE",
        value: 10,
        startDate: now,
        endDate: nextMonth,
      },
      {
        code: "SUMMER500K",
        name: "Gói nghỉ dưỡng gia đình",
        description: "Giảm trực tiếp 500.000 VNĐ cho đơn đặt phòng",
        discountType: "FIXED_AMOUNT",
        value: 500000,
        startDate: now,
        endDate: nextMonth,
      },
    ],
  });
  console.log("✅ Đã tạo 2 chương trình khuyến mãi mẫu.");

  console.log("🎉 Seed dữ liệu hoàn tất thành công 100%!");
}

main()
  .catch((e) => {
    console.error("❌ Lỗi khi gieo dữ liệu seed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
