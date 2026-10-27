import { Router } from "express";
import { authenticateToken } from "../common/middlewares/auth.middleware.js";
import { requireRole } from "../common/middlewares/rbac.middleware.js";

import { RoomController } from "../controllers/room.controller.js";
import { HotelServiceController } from "../controllers/hotel-service.controller.js";
import { PromotionController } from "../controllers/promotion.controller.js";

const router = Router();

router.use(authenticateToken);
router.use(requireRole("MANAGER"));

router.get("/ping", (req, res) => {
  res.json({
    success: true,
    module: "setup",
    message: "Manager setup module access granted.",
    user: req.user.username,
  });
});

// Quản lý phòng vật lý (Setup Rooms)
router.get("/rooms", RoomController.list);
router.get("/rooms/:roomId", RoomController.getById);
router.post("/rooms", RoomController.create);
router.put("/rooms/:roomId", RoomController.update);
router.delete("/rooms/:roomId", RoomController.delete);

// Quản lý dịch vụ phát sinh (Setup Services)
router.get("/services", HotelServiceController.list);
router.get("/services/:serviceId", HotelServiceController.getById);
router.post("/services", HotelServiceController.create);
router.put("/services/:serviceId", HotelServiceController.update);
router.delete("/services/:serviceId", HotelServiceController.delete);

// Quản lý chương trình khuyến mãi (Setup Promotions)
router.get("/promotions", PromotionController.list);
router.get("/promotions/:id", PromotionController.getById);
router.post("/promotions", PromotionController.create);
router.put("/promotions/:id", PromotionController.update);
router.delete("/promotions/:id", PromotionController.delete);

export default router;
