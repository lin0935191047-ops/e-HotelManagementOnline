import { Router } from "express";
import { CatalogController } from "../controllers/catalog.controller.js";

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

export default router;
