import { OperationService } from "../services/operation.service.js";

export class OperationController {
  /**
   * Danh sách đơn đặt phòng dành cho SALE
   * GET /api/operation/bookings
   */
  static async listBookings(req, res, next) {
    try {
      const data = await OperationService.listBookings(req.query);
      return res.json({
        success: true,
        data,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Xem chi tiết một đơn đặt phòng
   * GET /api/operation/bookings/:id
   */
  static async getBookingDetails(req, res, next) {
    try {
      const { id } = req.params;
      const data = await OperationService.getBookingDetails(id);
      return res.json({
        success: true,
        data,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Lấy danh sách phòng vật lý khả dụng để gán khi làm thủ tục Check-in
   * GET /api/operation/bookings/:id/available-rooms
   */
  static async getAvailableRoomsForCheckin(req, res, next) {
    try {
      const { id } = req.params;
      const data = await OperationService.getAvailableRoomsForCheckin(id);
      return res.json({
        success: true,
        data,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Thủ tục Check-in: Gán số phòng vật lý & Tự động tính phụ thu trẻ em
   * POST /api/operation/bookings/:id/check-in
   */
  static async checkInBooking(req, res, next) {
    try {
      const { id } = req.params;
      const { assignments } = req.body;

      const data = await OperationService.checkInBooking({
        bookingId: id,
        assignments,
      });

      return res.json({
        success: true,
        message: "Làm thủ tục Check-in và gán phòng thành công.",
        data,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * FEAT-10: Lấy danh sách các phòng đang OCCUPIED
   * GET /api/operation/services/occupied-rooms
   */
  static async getOccupiedRooms(req, res, next) {
    try {
      const data = await OperationService.getOccupiedRooms();
      return res.json({
        success: true,
        data,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * FEAT-10: Lấy danh mục dịch vụ có sẵn
   * GET /api/operation/services/catalog
   */
  static async getServicesCatalog(req, res, next) {
    try {
      const data = await OperationService.getServicesCatalog();
      return res.json({
        success: true,
        data,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * FEAT-10: Đăng ký sử dụng dịch vụ cho phòng đang ở
   * POST /api/operation/services/usage
   */
  static async createServiceUsage(req, res, next) {
    try {
      const { roomId, serviceId, quantity } = req.body;
      const data = await OperationService.createServiceUsage({
        roomId,
        serviceId,
        quantity,
      });

      return res.status(201).json({
        success: true,
        message: "Lập phiếu sử dụng dịch vụ thành công.",
        data,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * FEAT-10: Lấy chi tiết phiếu dịch vụ phục vụ in ấn HTML
   * GET /api/operation/services/tickets/:ticketId
   */
  static async getServiceTicket(req, res, next) {
    try {
      const { ticketId } = req.params;
      const data = await OperationService.getServiceTicket(ticketId);
      return res.json({
        success: true,
        data,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * FEAT-10: Danh sách các phiếu dịch vụ đã tạo
   * GET /api/operation/services/tickets
   */
  static async listServiceTickets(req, res, next) {
    try {
      const data = await OperationService.listServiceTickets(req.query);
      return res.json({
        success: true,
        data,
      });
    } catch (error) {
      next(error);
    }
  }
}
