import { prisma } from "../common/prisma.js";
import { AppError, ErrorCodes } from "../common/errors.js";

const VALID_DISCOUNT_TYPES = ["PERCENTAGE", "FIXED_AMOUNT"];

export class PromotionService {
  /**
   * Lấy danh sách khuyến mãi có phân trang, bộ lọc và tìm kiếm
   */
  static async listPromotions({ search, discountType, status, page = 1, limit = 50 } = {}) {
    const where = {};
    const now = new Date();

    if (discountType && VALID_DISCOUNT_TYPES.includes(discountType.toUpperCase())) {
      where.discountType = discountType.toUpperCase();
    }

    if (status) {
      const cleanStatus = status.toUpperCase();
      if (cleanStatus === "ACTIVE") {
        where.startDate = { lte: now };
        where.endDate = { gte: now };
      } else if (cleanStatus === "UPCOMING") {
        where.startDate = { gt: now };
      } else if (cleanStatus === "EXPIRED") {
        where.endDate = { lt: now };
      }
    }

    if (search && search.trim()) {
      const keyword = search.trim();
      where.OR = [
        { code: { contains: keyword, mode: "insensitive" } },
        { name: { contains: keyword, mode: "insensitive" } },
        { description: { contains: keyword, mode: "insensitive" } },
      ];
    }

    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const take = Math.max(1, Math.min(100, parseInt(limit, 10) || 50));
    const skip = (pageNum - 1) * take;

    const [total, promotions] = await Promise.all([
      prisma.promotion.count({ where }),
      prisma.promotion.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip,
        take,
        include: {
          _count: {
            select: { bookings: true },
          },
        },
      }),
    ]);

    // Bổ sung computed status cho tiện hiển thị frontend
    const enrichedPromotions = promotions.map((p) => {
      let currentStatus = "ACTIVE";
      const start = new Date(p.startDate);
      const end = new Date(p.endDate);
      if (now < start) currentStatus = "UPCOMING";
      else if (now > end) currentStatus = "EXPIRED";

      return {
        ...p,
        computedStatus: currentStatus,
      };
    });

    return {
      promotions: enrichedPromotions,
      pagination: {
        total,
        page: pageNum,
        limit: take,
        totalPages: Math.ceil(total / take) || 1,
      },
    };
  }

  /**
   * Lấy chi tiết khuyến mãi theo ID hoặc Mã code
   */
  static async getPromotionByIdOrCode(identifier) {
    if (!identifier || !identifier.trim()) {
      throw new AppError(ErrorCodes.VALIDATION_FAILED, "Mã hoặc ID khuyến mãi không được để trống.", 400);
    }

    const clean = identifier.trim();
    const promotion = await prisma.promotion.findFirst({
      where: {
        OR: [
          { id: clean },
          { code: { equals: clean.toUpperCase() } },
        ],
      },
      include: {
        _count: {
          select: { bookings: true },
        },
      },
    });

    if (!promotion) {
      throw new AppError(
        ErrorCodes.RESOURCE_NOT_FOUND,
        `Không tìm thấy chương trình khuyến mãi '${clean}'.`,
        404,
      );
    }

    const now = new Date();
    let currentStatus = "ACTIVE";
    if (now < new Date(promotion.startDate)) currentStatus = "UPCOMING";
    else if (now > new Date(promotion.endDate)) currentStatus = "EXPIRED";

    return {
      ...promotion,
      computedStatus: currentStatus,
    };
  }

  /**
   * Tạo mới một chương trình khuyến mãi
   */
  static async createPromotion(data) {
    const { code, name, description, discountType, value, startDate, endDate } = data;

    // 1. Validate code
    if (!code || !code.trim()) {
      throw new AppError(ErrorCodes.VALIDATION_FAILED, "Mã khuyến mãi (Code) không được để trống.", 400);
    }
    const cleanCode = code.trim().toUpperCase();

    const existing = await prisma.promotion.findUnique({
      where: { code: cleanCode },
    });
    if (existing) {
      throw new AppError(
        ErrorCodes.VALIDATION_FAILED,
        `Mã khuyến mãi '${cleanCode}' đã tồn tại trong hệ thống.`,
        400,
      );
    }

    // 2. Validate name
    if (!name || !name.trim()) {
      throw new AppError(ErrorCodes.VALIDATION_FAILED, "Tên chương trình khuyến mãi không được để trống.", 400);
    }

    // 3. Validate discountType
    const cleanType = discountType ? discountType.toUpperCase() : "";
    if (!VALID_DISCOUNT_TYPES.includes(cleanType)) {
      throw new AppError(
        ErrorCodes.VALIDATION_FAILED,
        `Loại giảm giá '${discountType}' không hợp lệ. Chỉ chấp nhận: ${VALID_DISCOUNT_TYPES.join(", ")}.`,
        400,
      );
    }

    // 4. Validate value
    const parsedValue = parseFloat(value);
    if (isNaN(parsedValue) || parsedValue <= 0) {
      throw new AppError(ErrorCodes.VALIDATION_FAILED, "Giá trị giảm giá phải là một số dương lớn hơn 0.", 400);
    }

    if (cleanType === "PERCENTAGE" && parsedValue > 100) {
      throw new AppError(
        ErrorCodes.VALIDATION_FAILED,
        "Giá trị giảm giá theo tỷ lệ phần trăm (PERCENTAGE) không được vượt quá 100%.",
        400,
      );
    }

    // 5. Validate dates
    if (!startDate) {
      throw new AppError(ErrorCodes.VALIDATION_FAILED, "Ngày bắt đầu (startDate) không được để trống.", 400);
    }
    if (!endDate) {
      throw new AppError(ErrorCodes.VALIDATION_FAILED, "Ngày kết thúc (endDate) không được để trống.", 400);
    }

    const start = new Date(startDate);
    const end = new Date(endDate);

    if (isNaN(start.getTime())) {
      throw new AppError(ErrorCodes.VALIDATION_FAILED, "Ngày bắt đầu không đúng định dạng thời gian hợp lệ.", 400);
    }
    if (isNaN(end.getTime())) {
      throw new AppError(ErrorCodes.VALIDATION_FAILED, "Ngày kết thúc không đúng định dạng thời gian hợp lệ.", 400);
    }

    if (end < start) {
      throw new AppError(
        ErrorCodes.VALIDATION_FAILED,
        "Ngày kết thúc khuyến mãi (endDate) phải lớn hơn hoặc bằng ngày bắt đầu (startDate).",
        400,
      );
    }

    const created = await prisma.promotion.create({
      data: {
        code: cleanCode,
        name: name.trim(),
        description: description ? description.trim() : null,
        discountType: cleanType,
        value: parsedValue,
        startDate: start,
        endDate: end,
      },
    });

    return created;
  }

  /**
   * Cập nhật thông tin khuyến mãi
   */
  static async updatePromotion(id, data) {
    if (!id || !id.trim()) {
      throw new AppError(ErrorCodes.VALIDATION_FAILED, "ID khuyến mãi không được để trống.", 400);
    }

    const cleanId = id.trim();
    const promotion = await prisma.promotion.findUnique({
      where: { id: cleanId },
    });

    if (!promotion) {
      throw new AppError(
        ErrorCodes.RESOURCE_NOT_FOUND,
        `Không tìm thấy chương trình khuyến mãi có ID '${cleanId}'.`,
        404,
      );
    }

    const updateData = {};

    if (data.code !== undefined) {
      if (!data.code || !data.code.trim()) {
        throw new AppError(ErrorCodes.VALIDATION_FAILED, "Mã khuyến mãi không được để trống.", 400);
      }
      const newCode = data.code.trim().toUpperCase();
      if (newCode !== promotion.code) {
        const dup = await prisma.promotion.findUnique({ where: { code: newCode } });
        if (dup) {
          throw new AppError(
            ErrorCodes.VALIDATION_FAILED,
            `Mã khuyến mãi '${newCode}' đã được sử dụng bởi chương trình khác.`,
            400,
          );
        }
        updateData.code = newCode;
      }
    }

    if (data.name !== undefined) {
      if (!data.name || !data.name.trim()) {
        throw new AppError(ErrorCodes.VALIDATION_FAILED, "Tên chương trình không được để trống.", 400);
      }
      updateData.name = data.name.trim();
    }

    if (data.description !== undefined) {
      updateData.description = data.description ? data.description.trim() : null;
    }

    const targetType = data.discountType ? data.discountType.toUpperCase() : promotion.discountType;
    if (data.discountType !== undefined) {
      if (!VALID_DISCOUNT_TYPES.includes(targetType)) {
        throw new AppError(
          ErrorCodes.VALIDATION_FAILED,
          `Loại giảm giá '${data.discountType}' không hợp lệ. Chỉ chấp nhận: ${VALID_DISCOUNT_TYPES.join(", ")}.`,
          400,
        );
      }
      updateData.discountType = targetType;
    }

    if (data.value !== undefined) {
      const parsedValue = parseFloat(data.value);
      if (isNaN(parsedValue) || parsedValue <= 0) {
        throw new AppError(ErrorCodes.VALIDATION_FAILED, "Giá trị giảm giá phải là số dương lớn hơn 0.", 400);
      }
      if (targetType === "PERCENTAGE" && parsedValue > 100) {
        throw new AppError(
          ErrorCodes.VALIDATION_FAILED,
          "Giá trị giảm giá theo tỷ lệ phần trăm (PERCENTAGE) không được vượt quá 100%.",
          400,
        );
      }
      updateData.value = parsedValue;
    } else if (data.discountType !== undefined && targetType === "PERCENTAGE" && Number(promotion.value) > 100) {
      throw new AppError(
        ErrorCodes.VALIDATION_FAILED,
        "Giá trị giảm giá theo tỷ lệ phần trăm (PERCENTAGE) không được vượt quá 100%.",
        400,
      );
    }

    let start = promotion.startDate;
    let end = promotion.endDate;

    if (data.startDate !== undefined) {
      start = new Date(data.startDate);
      if (isNaN(start.getTime())) {
        throw new AppError(ErrorCodes.VALIDATION_FAILED, "Ngày bắt đầu không đúng định dạng hợp lệ.", 400);
      }
      updateData.startDate = start;
    }

    if (data.endDate !== undefined) {
      end = new Date(data.endDate);
      if (isNaN(end.getTime())) {
        throw new AppError(ErrorCodes.VALIDATION_FAILED, "Ngày kết thúc không đúng định dạng hợp lệ.", 400);
      }
      updateData.endDate = end;
    }

    if (end < start) {
      throw new AppError(
        ErrorCodes.VALIDATION_FAILED,
        "Ngày kết thúc khuyến mãi (endDate) phải lớn hơn hoặc bằng ngày bắt đầu (startDate).",
        400,
      );
    }

    const updated = await prisma.promotion.update({
      where: { id: cleanId },
      data: updateData,
    });

    return updated;
  }

  /**
   * Xóa chương trình khuyến mãi với Guard kiểm tra booking đã sử dụng
   */
  static async deletePromotion(id) {
    if (!id || !id.trim()) {
      throw new AppError(ErrorCodes.VALIDATION_FAILED, "ID khuyến mãi không được để trống.", 400);
    }

    const cleanId = id.trim();
    const promotion = await prisma.promotion.findUnique({
      where: { id: cleanId },
      include: {
        _count: {
          select: { bookings: true },
        },
      },
    });

    if (!promotion) {
      throw new AppError(
        ErrorCodes.RESOURCE_NOT_FOUND,
        `Không tìm thấy chương trình khuyến mãi có ID '${cleanId}'.`,
        404,
      );
    }

    if (promotion._count.bookings > 0) {
      throw new AppError(
        ErrorCodes.PROMOTION_CANNOT_BE_DELETED,
        `Chương trình khuyến mãi '${promotion.code}' đã được áp dụng cho ${promotion._count.bookings} đơn đặt phòng, không thể xóa để bảo toàn tính minh bạch kế toán.`,
        400,
        { bookingsCount: promotion._count.bookings },
      );
    }

    await prisma.promotion.delete({
      where: { id: cleanId },
    });

    return {
      message: `Đã xóa chương trình khuyến mãi '${promotion.code}' thành công.`,
      promotionId: cleanId,
    };
  }
}
