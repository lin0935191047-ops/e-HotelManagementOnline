import { prisma } from "../common/prisma.js";
import { AppError, ErrorCodes } from "../common/errors.js";

const VALID_ROOM_TYPES = ["VIP", "DELUX", "LIVING_SUITE"];
const VALID_ROOM_SIZES = ["SINGLE", "DOUBLE"];

export class CatalogService {
  /**
   * Lấy danh mục phòng công khai cho khách hàng xem
   * Hỗ trợ lọc theo type, size và tìm kiếm từ khóa
   */
  static async getCatalog({ type, size, search } = {}) {
    const where = {
      status: { not: "MAINTENANCE" },
    };

    if (type && VALID_ROOM_TYPES.includes(type.toUpperCase())) {
      where.type = type.toUpperCase();
    }

    if (size && VALID_ROOM_SIZES.includes(size.toUpperCase())) {
      where.size = size.toUpperCase();
    }

    if (search && search.trim()) {
      const keyword = search.trim();
      where.OR = [
        { roomId: { contains: keyword, mode: "insensitive" } },
        { description: { contains: keyword, mode: "insensitive" } },
      ];
    }

    const rooms = await prisma.room.findMany({
      where,
      orderBy: [{ type: "asc" }, { size: "asc" }, { roomId: "asc" }],
    });

    // Nhóm theo hạng phòng (type, size)
    const categoryMap = new Map();

    for (const room of rooms) {
      const key = `${room.type}_${room.size}`;
      if (!categoryMap.has(key)) {
        categoryMap.set(key, {
          type: room.type,
          size: room.size,
          name: this.formatCategoryName(room.type, room.size),
          price: Number(room.price),
          maxAdults: room.maxAdults,
          maxChildren: room.maxChildren,
          extraChildFee: Number(room.extraChildFee),
          description: room.description,
          pictures: [...(room.pictures || [])],
          totalPhysicalRooms: 1,
          sampleRoomId: room.roomId,
          rooms: [
            {
              roomId: room.roomId,
              status: room.status,
              pictures: room.pictures,
            },
          ],
        });
      } else {
        const cat = categoryMap.get(key);
        cat.totalPhysicalRooms += 1;
        // Gom các ảnh độc nhất
        if (room.pictures && room.pictures.length > 0) {
          for (const pic of room.pictures) {
            if (!cat.pictures.includes(pic)) {
              cat.pictures.push(pic);
            }
          }
        }
        cat.rooms.push({
          roomId: room.roomId,
          status: room.status,
          pictures: room.pictures,
        });
      }
    }

    return {
      categories: Array.from(categoryMap.values()),
      rooms: rooms.map((r) => ({
        ...r,
        price: Number(r.price),
        extraChildFee: Number(r.extraChildFee),
      })),
      totalRooms: rooms.length,
    };
  }

  /**
   * Xem chi tiết phòng theo roomId
   */
  static async getRoomDetails(roomId) {
    if (!roomId || typeof roomId !== "string") {
      throw new AppError(
        ErrorCodes.VALIDATION_FAILED,
        "Mã phòng không hợp lệ.",
        400,
      );
    }

    const room = await prisma.room.findUnique({
      where: { roomId: roomId.trim() },
    });

    if (!room) {
      throw new AppError(
        ErrorCodes.RESOURCE_NOT_FOUND,
        `Không tìm thấy phòng với mã '${roomId}'.`,
        404,
      );
    }

    return {
      ...room,
      categoryName: this.formatCategoryName(room.type, room.size),
      price: Number(room.price),
      extraChildFee: Number(room.extraChildFee),
    };
  }

  /**
   * Kiểm tra tồn kho phòng theo khoảng thời gian lưu trú (fromDate, toDate)
   * Công thức theo Spec 4.1:
   * 1. TotalPhysicalRooms = Tổng số phòng trong Room có cùng (type, size) và status != 'MAINTENANCE'
   * 2. BookedRooms = Tổng BookingItem.quantity của các đơn status IN ('CONFIRMED', 'CHECKED_IN')
   *    giao nhau với [fromDate, toDate) (existing.fromDate < search.toDate AND existing.toDate > search.fromDate)
   * 3. AvailableQuota = TotalPhysicalRooms - BookedRooms
   * Hỗ trợ khóa bi quan Pessimistic Locking (FOR UPDATE) khi truyền forUpdate = true và tx
   */
  static async searchAvailability({
    fromDate,
    toDate,
    type,
    size,
    forUpdate = false,
    tx = null,
  }) {
    if (!fromDate || !toDate) {
      throw new AppError(
        ErrorCodes.VALIDATION_FAILED,
        "Vui lòng cung cấp đầy đủ ngày nhận phòng (fromDate) và ngày trả phòng (toDate).",
        400,
      );
    }

    const from = new Date(fromDate);
    const to = new Date(toDate);

    if (isNaN(from.getTime()) || isNaN(to.getTime())) {
      throw new AppError(
        ErrorCodes.VALIDATION_FAILED,
        "Định dạng ngày nhận/trả phòng không hợp lệ.",
        400,
      );
    }

    if (to <= from) {
      throw new AppError(
        ErrorCodes.INVALID_DATE_RANGE,
        "Ngày trả phòng (toDate) phải sau ngày nhận phòng (fromDate).",
        400,
      );
    }

    const nights = Math.max(
      1,
      Math.ceil((to.getTime() - from.getTime()) / (1000 * 60 * 60 * 24)),
    );

    const db = tx || prisma;

    // Nếu yêu cầu khóa bi quan cho một hạng phòng cụ thể trong transaction
    if (forUpdate && type && size && tx) {
      const typeEnum = type.toUpperCase();
      const sizeEnum = size.toUpperCase();
      await tx.$queryRaw`
        SELECT room_id FROM rooms 
        WHERE type = ${typeEnum}::"RoomType" AND size = ${sizeEnum}::"RoomSize" AND status != 'MAINTENANCE' 
        FOR UPDATE;
      `;
    }

    // 1. Lấy danh sách các phòng vật lý hợp lệ (status != MAINTENANCE)
    const roomWhere = {
      status: { not: "MAINTENANCE" },
    };

    if (type && VALID_ROOM_TYPES.includes(type.toUpperCase())) {
      roomWhere.type = type.toUpperCase();
    }

    if (size && VALID_ROOM_SIZES.includes(size.toUpperCase())) {
      roomWhere.size = size.toUpperCase();
    }

    const physicalRooms = await db.room.findMany({
      where: roomWhere,
      orderBy: [{ type: "asc" }, { size: "asc" }, { roomId: "asc" }],
    });

    // 2. Lấy các booking giao thoa trong khoảng thời gian [from, to) có status CONFIRMED hoặc CHECKED_IN
    const overlappingBookings = await db.booking.findMany({
      where: {
        status: { in: ["CONFIRMED", "CHECKED_IN"] },
        fromDate: { lt: to },
        toDate: { gt: from },
      },
      include: {
        items: true,
      },
    });

    // 3. Gom nhóm và tính toán tồn kho theo từng hạng phòng (type, size)
    const categoryMap = new Map();

    for (const room of physicalRooms) {
      const key = `${room.type}_${room.size}`;
      if (!categoryMap.has(key)) {
        categoryMap.set(key, {
          type: room.type,
          size: room.size,
          name: this.formatCategoryName(room.type, room.size),
          price: Number(room.price),
          maxAdults: room.maxAdults,
          maxChildren: room.maxChildren,
          extraChildFee: Number(room.extraChildFee),
          description: room.description,
          pictures: [...(room.pictures || [])],
          totalPhysicalRooms: 1,
          sampleRoomId: room.roomId,
        });
      } else {
        const cat = categoryMap.get(key);
        cat.totalPhysicalRooms += 1;
        if (room.pictures && room.pictures.length > 0) {
          for (const pic of room.pictures) {
            if (!cat.pictures.includes(pic)) {
              cat.pictures.push(pic);
            }
          }
        }
      }
    }

    const results = [];
    for (const [key, cat] of categoryMap.entries()) {
      // Đếm số lượng phòng đã được đặt cho hạng phòng này trong các booking giao nhau
      let bookedRooms = 0;
      for (const b of overlappingBookings) {
        for (const item of b.items) {
          if (item.roomType === cat.type && item.roomSize === cat.size) {
            bookedRooms += item.quantity;
          }
        }
      }

      const availableQuota = Math.max(0, cat.totalPhysicalRooms - bookedRooms);

      results.push({
        ...cat,
        bookedRooms,
        availableQuota,
        isAvailable: availableQuota > 0,
        nights,
        totalPriceForStay: cat.price * nights,
      });
    }

    return {
      searchQuery: {
        fromDate: from.toISOString(),
        toDate: to.toISOString(),
        nights,
        type: type || null,
        size: size || null,
      },
      categories: results,
      totalAvailableRooms: results.reduce((acc, c) => acc + c.availableQuota, 0),
    };
  }

  /**
   * Helper kiểm tra tồn kho cho giao dịch đặt phòng (dùng cho FEAT-07)
   */
  static async checkCategoryQuota({
    type,
    size,
    fromDate,
    toDate,
    requestedQuantity,
    forUpdate = false,
    tx = null,
  }) {
    const availability = await this.searchAvailability({
      fromDate,
      toDate,
      type,
      size,
      forUpdate,
      tx,
    });

    const category = availability.categories.find(
      (c) => c.type === type.toUpperCase() && c.size === size.toUpperCase(),
    );

    const availableQuota = category ? category.availableQuota : 0;

    if (availableQuota < requestedQuantity) {
      throw new AppError(
        ErrorCodes.ROOM_QUOTA_EXCEEDED,
        `Hạng phòng ${type} ${size} chỉ còn ${availableQuota} phòng trống trong khoảng thời gian đã chọn, không đủ cho số lượng yêu cầu (${requestedQuantity} phòng).`,
        400,
        {
          type,
          size,
          requestedQuantity,
          availableQuota,
        },
      );
    }

    return {
      category,
      availableQuota,
      remainingAfterBooking: availableQuota - requestedQuantity,
    };
  }

  /**
   * Format tên hạng phòng thân thiện cho người dùng
   */
  static formatCategoryName(type, size) {
    const typeLabels = {
      VIP: "Phòng VIP Cao Cấp",
      DELUX: "Phòng Deluxe Sang Trọng",
      LIVING_SUITE: "Phòng Suite Gia Đình",
    };
    const sizeLabels = {
      SINGLE: "Giường Đơn (Single)",
      DOUBLE: "Giường Đôi (Double)",
    };

    const typeStr = typeLabels[type] || type;
    const sizeStr = sizeLabels[size] || size;
    return `${typeStr} - ${sizeStr}`;
  }
}
