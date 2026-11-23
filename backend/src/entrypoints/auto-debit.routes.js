import { Router } from "express";
import { authenticateToken } from "../common/middlewares/auth.middleware.js";
import { requireRole } from "../common/middlewares/rbac.middleware.js";
import { AutoDebitController } from "../controllers/auto-debit.controller.js";

const router = Router();

// ==========================================
// 1. PUBLIC ROUTES
// ==========================================
// Cho phép người dùng/khách hàng xem trước điều khoản Auto-Debit
router.get("/terms", AutoDebitController.getTerms);

// Yêu cầu xác thực Token cho toàn bộ các route bên dưới
router.use(authenticateToken);

// ==========================================
// 2. CUSTOMER ROUTES (Xác thực CUSTOMER)
// ==========================================
// Ký đồng thuận điều khoản
router.post(
  "/consent",
  requireRole("CUSTOMER"),
  AutoDebitController.submitConsent,
);

// Xem trạng thái Auto-Debit của tôi
router.get(
  "/my-status",
  requireRole("CUSTOMER"),
  AutoDebitController.getMyStatus,
);

// Khách hàng xem danh sách công nợ của mình
router.get(
  "/debts/my-debts",
  requireRole("CUSTOMER"),
  AutoDebitController.getMyDebts,
);

// ==========================================
// 3. AUTO-DEBIT BR-01 EXECUTION (CUSTOMER / ADMIN)
// ==========================================
// Thực thi Auto-Debit BR-01 cho một khoản nợ (Khách hàng tự thanh toán hoặc Admin kích hoạt)
router.post(
  "/debts/:debtId/process",
  requireRole("CUSTOMER", "ADMIN"),
  AutoDebitController.processDebtBR01,
);

// Xem chi tiết một khoản nợ
router.get(
  "/debts/:debtId",
  requireRole("CUSTOMER", "ADMIN", "MANAGER", "SALE"),
  AutoDebitController.getDebtDetails,
);

// ==========================================
// 4. MANAGEMENT & ADMIN DEBT ROUTES (ADMIN / MANAGER / SALE)
// ==========================================
// Tạo khoản công nợ mới
router.post(
  "/debts",
  requireRole("ADMIN", "MANAGER", "SALE"),
  AutoDebitController.createDebt,
);

// Danh sách công nợ toàn hệ thống
router.get(
  "/debts/all",
  requireRole("ADMIN", "MANAGER", "SALE"),
  AutoDebitController.adminListDebts,
);

// ==========================================
// 5. ADMIN EXCLUSIVE ROUTES (ADMIN)
// ==========================================
// Quản lý yêu cầu & cấu hình Auto-Debit khách hàng
router.get(
  "/admin/list",
  requireRole("ADMIN"),
  AutoDebitController.adminListRequests,
);

router.put(
  "/admin/:userId/status",
  requireRole("ADMIN"),
  AutoDebitController.adminUpdateStatus,
);

// Quét & tự động khấu trừ công nợ đến hạn hàng loạt
router.post(
  "/debts/batch-process",
  requireRole("ADMIN"),
  AutoDebitController.batchProcessDueDebts,
);

// ==========================================
// 6. AUTO-DEBIT BR-02 ROUTES (SERVICES COMPLETED)
// ==========================================
// Kích hoạt / thực thi Auto-Debit BR-02 cho phiếu dịch vụ
router.post(
  "/services/:ticketId/process-br02",
  requireRole("CUSTOMER", "ADMIN", "SALE"),
  AutoDebitController.processServiceBR02,
);

// Xem trạng thái thanh toán & Auto-Debit của phiếu dịch vụ
router.get(
  "/services/:ticketId/auto-debit-status",
  requireRole("CUSTOMER", "ADMIN", "SALE", "MANAGER"),
  AutoDebitController.getServiceAutoDebitStatus,
);

export default router;
