import { WalletService } from "../services/wallet.service.js";
import { RefundService } from "../services/refund.service.js";

export class WalletController {
  /**
   * Khách hàng: Lấy thông tin ví của chính mình
   * GET /api/wallet/my-wallet
   */
  static async getMyWallet(req, res, next) {
    try {
      const data = await WalletService.getWalletDetails(req.user.id);
      return res.json({
        success: true,
        data,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Khách hàng: Nạp tiền giả lập vào ví (Mock Top-up)
   * POST /api/wallet/top-up
   */
  static async topUp(req, res, next) {
    try {
      const { amount, paymentMethod, note } = req.body || {};
      const data = await WalletService.mockTopUp({
        userId: req.user.id,
        amount,
        paymentMethod,
        note,
      });
      return res.status(200).json({
        success: true,
        message: "Nạp tiền giả lập vào ví thành công.",
        data,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Khách hàng: Xem lịch sử giao dịch ví của mình
   * GET /api/wallet/transactions
   */
  static async getMyTransactions(req, res, next) {
    try {
      const { page, limit, type, status } = req.query;
      const data = await WalletService.getWalletTransactions({
        userId: req.user.id,
        page,
        limit,
        type,
        status,
      });
      return res.json({
        success: true,
        data,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Admin: Xem danh sách toàn bộ ví nội bộ
   * GET /api/wallet/admin/all
   */
  static async adminListWallets(req, res, next) {
    try {
      const data = await WalletService.listAllWallets(req.query);
      return res.json({
        success: true,
        data,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Admin: Khóa / Mở khóa ví của khách
   * PUT /api/wallet/admin/:walletId/status
   */
  static async adminUpdateWalletStatus(req, res, next) {
    try {
      const { walletId } = req.params;
      const { status } = req.body || {};
      const data = await WalletService.updateWalletStatus({
        walletId,
        status,
        adminUsername: req.user.username,
      });
      return res.json({
        success: true,
        message: `Cập nhật trạng thái ví thành công: ${status}`,
        data,
      });
    } catch (error) {
      next(error);
    }
  }

  // ==========================================
  // FEAT-13.6: Quản lý Hoàn tiền (Refund Management)
  // ==========================================

  /**
   * Admin: Thực hiện hoàn tiền vào ví nội bộ
   * POST /api/wallet/refund
   */
  static async processRefund(req, res, next) {
    try {
      const { originalTxId, amount, reason } = req.body || {};
      const data = await RefundService.processRefund({
        originalTxId,
        amount,
        reason,
        adminUsername: req.user.username,
      });

      return res.status(200).json({
        success: true,
        message: `Hoàn tiền thành công ${Number(data.amount).toLocaleString()} VND vào ví của khách hàng.`,
        data,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Tra cứu số tiền tối đa còn lại có thể hoàn cho giao dịch gốc
   * GET /api/wallet/transactions/:txId/refundable
   */
  static async getRefundableDetails(req, res, next) {
    try {
      const { txId } = req.params;
      const data = await RefundService.getRefundableAmount(txId);
      return res.json({
        success: true,
        data,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Admin: Xem lịch sử hoàn tiền toàn hệ thống
   * GET /api/wallet/refunds/history
   */
  static async listRefundHistory(req, res, next) {
    try {
      const { page, limit, walletId, keyword } = req.query;
      const data = await RefundService.listRefundHistory({
        page,
        limit,
        walletId,
        keyword,
      });
      return res.json({
        success: true,
        data,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Khách hàng: Xem danh sách các khoản hoàn tiền vào ví của mình
   * GET /api/wallet/refunds/my-refunds
   */
  static async getMyRefunds(req, res, next) {
    try {
      const { page, limit } = req.query;
      const data = await RefundService.listMyRefunds({
        userId: req.user.id,
        page,
        limit,
      });
      return res.json({
        success: true,
        data,
      });
    } catch (error) {
      next(error);
    }
  }
}
