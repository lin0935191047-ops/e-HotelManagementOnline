import { prisma } from "../common/prisma.js";
import { AppError, ErrorCodes } from "../common/errors.js";

export class HotelServiceService {
  /**
   * Lấy danh sách dịch vụ khách sạn có phân trang và tìm kiếm
   */
  static async listServices({ search, page = 1, limit = 50 } = {}) {
    const where = {};

    if (search && search.trim()) {
      const keyword = search.trim();
      where.OR = [
        { serviceId: { contains: keyword, mode: "insensitive" } },
        { serviceName: { contains: keyword, mode: "insensitive" } },
        { description: { contains: keyword, mode: "insensitive" } },
        { unit: { contains: keyword, mode: "insensitive" } },
      ];
    }

    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const take = Math.max(1, Math.min(100, parseInt(limit, 10) || 50));
    const skip = (pageNum - 1) * take;

    const [total, services] = await Promise.all([
      prisma.service.count({ where }),
      prisma.service.findMany({
        where,
        orderBy: { serviceId: "asc" },
        skip,
        take,
        include: {
          _count: {
            select: { serviceUsage: true },
          },
        },
      }),
    ]);

    return {
      services,
      pagination: {
        total,
        page: pageNum,
        limit: take,
        totalPages: Math.ceil(total / take) || 1,
      },
    };
  }

  /**
   * Lấy chi tiết một dịch vụ theo serviceId
   */
  static async getServiceById(serviceId) {
    if (!serviceId || !serviceId.trim()) {
      throw new AppError(ErrorCodes.VALIDATION_FAILED, "Mã dịch vụ không được để trống.", 400);
    }

    const cleanId = serviceId.trim();
    const service = await prisma.service.findUnique({
      where: { serviceId: cleanId },
      include: {
        _count: {
          select: { serviceUsage: true },
        },
      },
    });

    if (!service) {
      throw new AppError(
        ErrorCodes.RESOURCE_NOT_FOUND,
        `Không tìm thấy dịch vụ có mã '${cleanId}'.`,
        404,
      );
    }

    return service;
  }

  /**
   * Tạo mới dịch vụ
   */
  static async createService(data) {
    const { serviceId, serviceName, description, unit, price } = data;

    // 1. Validate serviceId
    if (!serviceId || !serviceId.trim()) {
      throw new AppError(ErrorCodes.VALIDATION_FAILED, "Mã dịch vụ (Service ID) không được để trống.", 400);
    }
    const cleanServiceId = serviceId.trim().toUpperCase();

    const existing = await prisma.service.findUnique({
      where: { serviceId: cleanServiceId },
    });
    if (existing) {
      throw new AppError(
        ErrorCodes.VALIDATION_FAILED,
        `Mã dịch vụ '${cleanServiceId}' đã tồn tại trong hệ thống.`,
        400,
      );
    }

    // 2. Validate serviceName & unit
    if (!serviceName || !serviceName.trim()) {
      throw new AppError(ErrorCodes.VALIDATION_FAILED, "Tên dịch vụ không được để trống.", 400);
    }

    if (!unit || !unit.trim()) {
      throw new AppError(ErrorCodes.VALIDATION_FAILED, "Đơn vị tính không được để trống (VD: Lượt, Kg, Lon, Suất).", 400);
    }

    // 3. Validate price > 0
    const parsedPrice = parseFloat(price);
    if (isNaN(parsedPrice) || parsedPrice <= 0) {
      throw new AppError(ErrorCodes.VALIDATION_FAILED, "Đơn giá dịch vụ phải là một số dương lớn hơn 0.", 400);
    }

    const created = await prisma.service.create({
      data: {
        serviceId: cleanServiceId,
        serviceName: serviceName.trim(),
        description: description ? description.trim() : null,
        unit: unit.trim(),
        price: parsedPrice,
      },
    });

    return created;
  }

  /**
   * Cập nhật thông tin dịch vụ
   */
  static async updateService(serviceId, data) {
    if (!serviceId || !serviceId.trim()) {
      throw new AppError(ErrorCodes.VALIDATION_FAILED, "Mã dịch vụ không được để trống.", 400);
    }

    const cleanServiceId = serviceId.trim();
    const service = await prisma.service.findUnique({
      where: { serviceId: cleanServiceId },
    });

    if (!service) {
      throw new AppError(
        ErrorCodes.RESOURCE_NOT_FOUND,
        `Không tìm thấy dịch vụ có mã '${cleanServiceId}'.`,
        404,
      );
    }

    const updateData = {};

    if (data.serviceName !== undefined) {
      if (!data.serviceName || !data.serviceName.trim()) {
        throw new AppError(ErrorCodes.VALIDATION_FAILED, "Tên dịch vụ không được để trống.", 400);
      }
      updateData.serviceName = data.serviceName.trim();
    }

    if (data.unit !== undefined) {
      if (!data.unit || !data.unit.trim()) {
        throw new AppError(ErrorCodes.VALIDATION_FAILED, "Đơn vị tính không được để trống.", 400);
      }
      updateData.unit = data.unit.trim();
    }

    if (data.description !== undefined) {
      updateData.description = data.description ? data.description.trim() : null;
    }

    if (data.price !== undefined) {
      const parsedPrice = parseFloat(data.price);
      if (isNaN(parsedPrice) || parsedPrice <= 0) {
        throw new AppError(ErrorCodes.VALIDATION_FAILED, "Đơn giá dịch vụ phải là một số dương lớn hơn 0.", 400);
      }
      updateData.price = parsedPrice;
    }

    const updated = await prisma.service.update({
      where: { serviceId: cleanServiceId },
      data: updateData,
    });

    return updated;
  }

  /**
   * Xóa dịch vụ với Guard kiểm tra lịch sử sử dụng
   */
  static async deleteService(serviceId) {
    if (!serviceId || !serviceId.trim()) {
      throw new AppError(ErrorCodes.VALIDATION_FAILED, "Mã dịch vụ không được để trống.", 400);
    }

    const cleanServiceId = serviceId.trim();
    const service = await prisma.service.findUnique({
      where: { serviceId: cleanServiceId },
      include: {
        _count: {
          select: { serviceUsage: true },
        },
      },
    });

    if (!service) {
      throw new AppError(
        ErrorCodes.RESOURCE_NOT_FOUND,
        `Không tìm thấy dịch vụ có mã '${cleanServiceId}'.`,
        404,
      );
    }

    if (service._count.serviceUsage > 0) {
      throw new AppError(
        ErrorCodes.SERVICE_CANNOT_BE_DELETED,
        `Dịch vụ '${cleanServiceId}' đã phát sinh ${service._count.serviceUsage} giao dịch sử dụng, không thể xóa để bảo toàn dữ liệu kế toán và hóa đơn.`,
        400,
        { usageCount: service._count.serviceUsage },
      );
    }

    await prisma.service.delete({
      where: { serviceId: cleanServiceId },
    });

    return {
      message: `Đã xóa dịch vụ '${cleanServiceId}' thành công.`,
      serviceId: cleanServiceId,
    };
  }
}
