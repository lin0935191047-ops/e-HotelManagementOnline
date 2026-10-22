import { Router } from "express";
import { authenticateToken } from "../common/middlewares/auth.middleware.js";
import { requireRole } from "../common/middlewares/rbac.middleware.js";

const router = Router();

router.use(authenticateToken);
router.use(requireRole("SALE"));

router.get("/ping", (req, res) => {
  res.json({
    success: true,
    module: "operation",
    message: "Sale operation module access granted.",
    user: req.user.username,
  });
});

export default router;
