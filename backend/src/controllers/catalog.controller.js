import { CatalogService } from "../services/catalog.service.js";

export class CatalogController {
  /**
   * Lấy danh mục phòng công khai
   * GET /api/public/rooms
   */
  static async getCatalog(req, res, next) {
    try {
      const { type, size, search, format } = req.query;
      const data = await CatalogService.getCatalog({ type, size, search });

      if (format === "grouped" || format === "catalog") {
        return res.json({
          success: true,
          data,
        });
      }

      return res.json({
        success: true,
        data: data.rooms,
        categories: data.categories,
        totalRooms: data.totalRooms,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Xem chi tiết phòng theo roomId
   * GET /api/public/rooms/:roomId
   */
  static async getRoomDetails(req, res, next) {
    try {
      const { roomId } = req.params;
      const data = await CatalogService.getRoomDetails(roomId);
      return res.json({
        success: true,
        data,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Tra cứu tồn kho phòng theo khoảng thời gian lưu trú
   * GET /api/public/availability
   * POST /api/public/availability/search
   */
  static async getAvailability(req, res, next) {
    try {
      const params = {
        fromDate: req.query.fromDate || req.body?.fromDate,
        toDate: req.query.toDate || req.body?.toDate,
        type: req.query.type || req.body?.type,
        size: req.query.size || req.body?.size,
      };

      const data = await CatalogService.searchAvailability(params);
      return res.json({
        success: true,
        data,
      });
    } catch (error) {
      next(error);
    }
  }
}
