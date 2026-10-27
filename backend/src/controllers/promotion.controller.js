import { PromotionService } from "../services/promotion.service.js";

export class PromotionController {
  /**
   * GET /api/setup/promotions
   */
  static async list(req, res, next) {
    try {
      const { search, discountType, status, page, limit } = req.query;
      const result = await PromotionService.listPromotions({
        search,
        discountType,
        status,
        page,
        limit,
      });
      res.json({
        success: true,
        data: result.promotions,
        pagination: result.pagination,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/setup/promotions/:id
   */
  static async getById(req, res, next) {
    try {
      const { id } = req.params;
      const promotion = await PromotionService.getPromotionByIdOrCode(id);
      res.json({
        success: true,
        data: promotion,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/setup/promotions
   */
  static async create(req, res, next) {
    try {
      const created = await PromotionService.createPromotion(req.body);
      res.status(201).json({
        success: true,
        message: "Tạo chương trình khuyến mãi thành công.",
        data: created,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * PUT /api/setup/promotions/:id
   */
  static async update(req, res, next) {
    try {
      const { id } = req.params;
      const updated = await PromotionService.updatePromotion(id, req.body);
      res.json({
        success: true,
        message: "Cập nhật chương trình khuyến mãi thành công.",
        data: updated,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * DELETE /api/setup/promotions/:id
   */
  static async delete(req, res, next) {
    try {
      const { id } = req.params;
      const result = await PromotionService.deletePromotion(id);
      res.json({
        success: true,
        message: result.message,
        promotionId: result.promotionId,
      });
    } catch (error) {
      next(error);
    }
  }
}
