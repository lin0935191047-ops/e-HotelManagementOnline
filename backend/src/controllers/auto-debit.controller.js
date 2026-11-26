import { AutoDebitService } from "../services/auto-debit.service.js";
import { DebtService } from "../services/debt.service.js";

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
      const agreed = req.body?.agreed !== undefined ? req.body.agreed : req.body?.consent;
      const termsVersion = req.body?.termsVersion || req.body?.agreedTermsVersion;
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
   * Khách hàng: Tắt dịch vụ Auto-Debit / Thu hồi thỏa thuận
   * POST /api/auto-debit/revoke
   */
  static async revokeConsent(req, res, next) {
    try {
      const data = await AutoDebitService.revokeConsent(req.user.id);
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
      const status = req.body?.status || (req.body?.isActive ? "ACTIVE" : undefined);
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

  // ==========================================
  // FEAT-13.4: Quản lý Công nợ & Auto-Debit BR-01
  // ==========================================

  /**
   * Admin / Manager / Sale: Tạo khoản công nợ mới
   * POST /api/auto-debit/debts
   */
  static async createDebt(req, res, next) {
    try {
      const data = await DebtService.createDebt(req.body);
      return res.status(201).json({
        success: true,
        message: `Tạo công nợ ${data.debtCode} thành công.`,
        data,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Khách hàng: Xem danh sách công nợ của chính mình
   * GET /api/auto-debit/debts/my-debts
   */
  static async getMyDebts(req, res, next) {
    try {
      const { status, page, limit } = req.query;
      const data = await DebtService.listDebtsForCustomer({
        userId: req.user.id,
        status,
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

  /**
   * Chi tiết khoản nợ
   * GET /api/auto-debit/debts/:debtId
   */
  static async getDebtDetails(req, res, next) {
    try {
      const { debtId } = req.params;
      const data = await DebtService.getDebtById(debtId);

      // Nếu là CUSTOMER thì chỉ được xem nợ của chính mình
      if (req.user.role === "CUSTOMER" && data.userId !== req.user.id) {
        return res.status(403).json({
          success: false,
          error: {
            code: "FORBIDDEN_ACCESS",
            message: "Bạn không có quyền truy cập khoản công nợ này.",
          },
        });
      }

      return res.json({
        success: true,
        data,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Admin / Manager / Sale: Xem danh sách công nợ toàn hệ thống
   * GET /api/auto-debit/debts/all
   */
  static async adminListDebts(req, res, next) {
    try {
      const data = await DebtService.listAllDebts(req.query);
      return res.json({
        success: true,
        data,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * FEAT-13.4: Thực thi Auto-Debit BR-01 cho 1 khoản nợ
   * POST /api/auto-debit/debts/:debtId/process
   */
  static async processDebtBR01(req, res, next) {
    try {
      const { debtId } = req.params;
      const isAdmin = req.user.role === "ADMIN";

      const data = await DebtService.processAutoDebitBR01({
        debtId,
        triggeredByUserId: req.user.id,
        isAdmin,
      });

      return res.status(200).json(data);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Admin: Quét & tự động khấu trừ công nợ đến hạn hàng loạt (Batch Process BR-01)
   * POST /api/auto-debit/debts/batch-process
   */
  static async batchProcessDueDebts(req, res, next) {
    try {
      const data = await DebtService.batchProcessDueDebts();
      return res.status(200).json({
        success: true,
        message: "Quá trình quét và tự động khấu trừ công nợ đến hạn (BR-01) hoàn tất.",
        data,
      });
    } catch (error) {
      next(error);
    }
  }

  // ==========================================
  // FEAT-13.5: Auto-Debit BR-02 (Completed Service Fee)
  // ==========================================

  /**
   * Thực thi Auto-Debit BR-02 cho phiếu dịch vụ đã COMPLETED
   * POST /api/auto-debit/services/:ticketId/process-br02
   */
  static async processServiceBR02(req, res, next) {
    try {
      const { ticketId } = req.params;
      const data = await AutoDebitService.triggerBR02ForService(ticketId);
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
   * Xem trạng thái Auto-Debit của phiếu dịch vụ
   * GET /api/auto-debit/services/:ticketId/auto-debit-status
   */
  static async getServiceAutoDebitStatus(req, res, next) {
    try {
      const { ticketId } = req.params;
      const data = await AutoDebitService.getServiceAutoDebitStatus(ticketId);
      return res.json({
        success: true,
        data,
      });
    } catch (error) {
      next(error);
    }
  }
}
