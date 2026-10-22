import { Router } from "express";
import { authenticateToken } from "../common/middlewares/auth.middleware.js";
import { requireRole } from "../common/middlewares/rbac.middleware.js";

import { RoomController } from "../controllers/room.controller.js";

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

export default router;
