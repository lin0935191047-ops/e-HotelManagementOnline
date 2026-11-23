import { Router } from "express";
import { authenticateToken } from "../common/middlewares/auth.middleware.js";
import { requireRole } from "../common/middlewares/rbac.middleware.js";
import { WalletController } from "../controllers/wallet.controller.js";

const router = Router();

router.use(authenticateToken);

// Customer endpoints
router.get("/my-wallet", requireRole("CUSTOMER"), WalletController.getMyWallet);
router.post("/top-up", requireRole("CUSTOMER"), WalletController.topUp);
router.get("/transactions", requireRole("CUSTOMER"), WalletController.getMyTransactions);

// Admin endpoints
router.get("/admin/all", requireRole("ADMIN"), WalletController.adminListWallets);
router.put("/admin/:walletId/status", requireRole("ADMIN"), WalletController.adminUpdateWalletStatus);

// FEAT-13.6: Refund endpoints
router.post("/refund", requireRole("ADMIN"), WalletController.processRefund);
router.get("/refunds/history", requireRole("ADMIN"), WalletController.listRefundHistory);
router.get("/refunds/my-refunds", requireRole("CUSTOMER"), WalletController.getMyRefunds);
router.get("/transactions/:txId/refundable", requireRole("ADMIN", "CUSTOMER"), WalletController.getRefundableDetails);

export default router;
