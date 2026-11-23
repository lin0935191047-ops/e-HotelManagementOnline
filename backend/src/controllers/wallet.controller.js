import { WalletService } from "../services/wallet.service.js";

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
}
