import { BookingService } from "../services/booking.service.js";

export class BookingController {
  /**
   * Áp dụng và kiểm tra mã khuyến mãi
   * POST /api/public/promotions/apply
   */
  static async validatePromotion(req, res, next) {
    try {
      const { code, totalRoomFee } = req.body;
      const data = await BookingService.validatePromotion({
        code,
        totalRoomFee: Number(totalRoomFee || 0),
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
   * Tính toán trước chi tiết giỏ hàng và giá trị thanh toán
   * POST /api/public/bookings/preview
   */
  static async previewBooking(req, res, next) {
    try {
      const data = await BookingService.calculateBookingPreview(req.body);
      return res.json({
        success: true,
        data,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Đặt phòng và thanh toán giả lập với Transaction & Pessimistic Locks
   * POST /api/public/bookings
   */
  static async createBooking(req, res, next) {
    try {
      const data = await BookingService.createBooking(req.body);
      return res.status(201).json({
        success: true,
        data,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Lấy danh sách tài khoản thanh toán giả lập để test trên giao diện
   * GET /api/public/payment-accounts
   */
  static async getMockPaymentAccounts(req, res, next) {
    try {
      const data = await BookingService.getMockPaymentAccounts();
      return res.json({
        success: true,
        data,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Tra cứu chi tiết đơn đặt phòng bằng bookingNumber
   * GET /api/public/bookings/:bookingNumber
   */
  static async lookupBooking(req, res, next) {
    try {
      const { bookingNumber } = req.params;
      const data = await BookingService.lookupBooking({ bookingNumber });
      return res.json({
        success: true,
        data,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Hủy đơn đặt phòng và hoàn tiền theo quy tắc 80/20 & luật 24h
   * POST /api/public/bookings/:bookingNumber/cancel
   */
  static async cancelBooking(req, res, next) {
    try {
      const { bookingNumber } = req.params;
      const data = await BookingService.cancelBooking({ bookingNumber });
      return res.json({
        success: true,
        message: "Hủy đặt phòng và hoàn tiền thành công.",
        data,
      });
    } catch (error) {
      next(error);
    }
  }
}
