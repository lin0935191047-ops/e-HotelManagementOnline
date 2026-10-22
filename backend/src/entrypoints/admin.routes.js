import { Router } from "express";
import { authenticateToken } from "../common/middlewares/auth.middleware.js";
import { requireRole } from "../common/middlewares/rbac.middleware.js";
import { UserController } from "../controllers/user.controller.js";

const router = Router();

// Tất cả route admin yêu cầu xác thực và vai trò ADMIN nghiêm ngặt
router.use(authenticateToken);
router.use(requireRole("ADMIN"));

router.get("/ping", (req, res) => {
  res.json({
    success: true,
    module: "admin",
    message: "Admin module access granted.",
    user: req.user.username,
  });
});

// CRUD Người dùng (Admin Role)
router.get("/users", UserController.list);
router.get("/users/:id", UserController.getById);
router.post("/users", UserController.create);
router.put("/users/:id", UserController.update);
router.delete("/users/:id", UserController.delete);

export default router;
