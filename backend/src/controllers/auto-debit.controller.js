import { AutoDebitService } from "../services/auto-debit.service.js";

export class AutoDebitController {
  /**
   * Xem nội dung Điều khoản Auto-Debit hiện hành
   * GET /api/auto-debit/terms
   */
  static async getTerms(req, res, next) {
    try {
      const data = AutoDebitService.getTerms();
      return res.json({
        success: true,
        data,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Khách hàng: Xác nhận đồng ý Điều khoản Auto-Debit
   * POST /api/auto-debit/consent
   */
  static async submitConsent(req, res, next) {
    try {
      const { agreed, termsVersion } = req.body || {};
      const ipAddress = req.ip || req.headers["x-forwarded-for"] || null;
      const userAgent = req.headers["user-agent"] || null;

      const data = await AutoDebitService.submitConsent({
        userId: req.user.id,
        agreed,
        termsVersion,
        ipAddress,
        userAgent,
      });

      return res.status(200).json({
        success: true,
        message: data.message,
        data,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Khách hàng: Xem trạng thái kích hoạt Auto-Debit của chính mình
   * GET /api/auto-debit/my-status
   */
  static async getMyStatus(req, res, next) {
    try {
      const data = await AutoDebitService.getCustomerStatus(req.user.id);
      return res.json({
        success: true,
        data,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Admin: Xem danh sách cấu hình và yêu cầu kích hoạt Auto-Debit
   * GET /api/auto-debit/admin/list
   */
  static async adminListRequests(req, res, next) {
    try {
      const { page, limit, status, keyword } = req.query;
      const data = await AutoDebitService.listAutoDebitSettings({
        page,
        limit,
        status,
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
   * Admin: Kích hoạt (ACTIVE), Tạm dừng (PAUSED), hoặc Vô hiệu hóa (DISABLED) Auto-Debit
   * PUT /api/auto-debit/admin/:userId/status
   */
  static async adminUpdateStatus(req, res, next) {
    try {
      const { userId } = req.params;
      const { status } = req.body || {};
      const data = await AutoDebitService.adminUpdateStatus({
        userId,
        status,
        adminUsername: req.user.username,
      });

      return res.json({
        success: true,
        message: `Cập nhật trạng thái Auto-Debit cho khách hàng ${userId} thành công: ${status}`,
        data,
      });
    } catch (error) {
      next(error);
    }
  }
}
