import { Router } from "express";
import { CatalogController } from "../controllers/catalog.controller.js";
import { BookingController } from "../controllers/booking.controller.js";

const router = Router();

// Endpoint kiểm tra cổng đặt phòng công khai
router.get("/ping", (req, res) => {
  res.json({
    success: true,
    module: "public",
    message: "Public booking portal is accessible without authentication.",
  });
});

// Danh mục phòng và chi tiết phòng
router.get("/rooms", CatalogController.getCatalog);
router.get("/rooms/:roomId", CatalogController.getRoomDetails);

// Tra cứu tồn kho phòng trống theo khoảng thời gian lưu trú
router.get("/availability", CatalogController.getAvailability);
router.post("/availability/search", CatalogController.getAvailability);

// Áp dụng mã khuyến mãi & tính toán trước giỏ hàng (FEAT-07)
router.post("/promotions/apply", BookingController.validatePromotion);
router.post("/bookings/preview", BookingController.previewBooking);

// Đặt phòng & thanh toán giả lập với Transaction (FEAT-07)
router.post("/bookings", BookingController.createBooking);
router.get("/payment-accounts", BookingController.getMockPaymentAccounts);

// Tra cứu & Hủy đặt phòng theo luật 24h & hoàn 80/20 (FEAT-08)
router.get("/bookings/:bookingNumber", BookingController.lookupBooking);
router.post("/bookings/:bookingNumber/cancel", BookingController.cancelBooking);

export default router;
