import { Router } from "express";
import { authenticateToken } from "../common/middlewares/auth.middleware.js";
import { requireRole } from "../common/middlewares/rbac.middleware.js";
import { AutoDebitController } from "../controllers/auto-debit.controller.js";

const router = Router();

// Public endpoint - Cho phép người dùng/khách hàng xem trước điều khoản Auto-Debit
router.get("/terms", AutoDebitController.getTerms);

// Customer endpoints - Yêu cầu xác thực tài khoản CUSTOMER
router.post(
  "/consent",
  authenticateToken,
  requireRole("CUSTOMER"),
  AutoDebitController.submitConsent,
);

router.get(
  "/my-status",
  authenticateToken,
  requireRole("CUSTOMER"),
  AutoDebitController.getMyStatus,
);

// Admin endpoints - Yêu cầu xác thực tài khoản ADMIN
router.get(
  "/admin/list",
  authenticateToken,
  requireRole("ADMIN"),
  AutoDebitController.adminListRequests,
);

router.put(
  "/admin/:userId/status",
  authenticateToken,
  requireRole("ADMIN"),
  AutoDebitController.adminUpdateStatus,
);

export default router;
