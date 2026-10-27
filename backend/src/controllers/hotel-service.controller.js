import { HotelServiceService } from "../services/hotel-service.service.js";

export class HotelServiceController {
  /**
   * GET /api/setup/services
   */
  static async list(req, res, next) {
    try {
      const { search, page, limit } = req.query;
      const result = await HotelServiceService.listServices({ search, page, limit });
      res.json({
        success: true,
        data: result.services,
        pagination: result.pagination,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/setup/services/:serviceId
   */
  static async getById(req, res, next) {
    try {
      const { serviceId } = req.params;
      const service = await HotelServiceService.getServiceById(serviceId);
      res.json({
        success: true,
        data: service,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/setup/services
   */
  static async create(req, res, next) {
    try {
      const created = await HotelServiceService.createService(req.body);
      res.status(201).json({
        success: true,
        message: "Tạo dịch vụ mới thành công.",
        data: created,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * PUT /api/setup/services/:serviceId
   */
  static async update(req, res, next) {
    try {
      const { serviceId } = req.params;
      const updated = await HotelServiceService.updateService(serviceId, req.body);
      res.json({
        success: true,
        message: "Cập nhật dịch vụ thành công.",
        data: updated,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * DELETE /api/setup/services/:serviceId
   */
  static async delete(req, res, next) {
    try {
      const { serviceId } = req.params;
      const result = await HotelServiceService.deleteService(serviceId);
      res.json({
        success: true,
        message: result.message,
        serviceId: result.serviceId,
      });
    } catch (error) {
      next(error);
    }
  }
}
