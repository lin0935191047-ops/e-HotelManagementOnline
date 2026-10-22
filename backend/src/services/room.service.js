import { prisma } from "../common/prisma.js";
import { AppError, ErrorCodes } from "../common/errors.js";

const VALID_ROOM_TYPES = ["VIP", "DELUX", "LIVING_SUITE"];
const VALID_ROOM_SIZES = ["SINGLE", "DOUBLE"];
const VALID_ROOM_STATUSES = ["AVAILABLE", "OCCUPIED", "MAINTENANCE"];

export class RoomService {
  /**
   * Lấy danh sách phòng vật lý có phân trang và bộ lọc
   */
  static async listRooms({ type, size, status, search, page = 1, limit = 50 }) {
    const where = {};

    if (type && VALID_ROOM_TYPES.includes(type.toUpperCase())) {
      where.type = type.toUpperCase();
    }

    if (size && VALID_ROOM_SIZES.includes(size.toUpperCase())) {
      where.size = size.toUpperCase();
    }

    if (status && VALID_ROOM_STATUSES.includes(status.toUpperCase())) {
      where.status = status.toUpperCase();
    }

    if (search && search.trim()) {
      const keyword = search.trim();
      where.OR = [
        { roomId: { contains: keyword, mode: "insensitive" } },
        { description: { contains: keyword, mode: "insensitive" } },
      ];
    }

    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const take = Math.max(1, Math.min(100, parseInt(limit, 10) || 50));
    const skip = (pageNum - 1) * take;

    const [total, rooms] = await Promise.all([
      prisma.room.count({ where }),
      prisma.room.findMany({
        where,
        orderBy: { roomId: "asc" },
        skip,
        take,
      }),
    ]);

    return {
      rooms,
      pagination: {
        total,
        page: pageNum,
        limit: take,
        totalPages: Math.ceil(total / take) || 1,
      },
    };
  }

  /**
   * Lấy chi tiết 1 phòng theo mã phòng (roomId)
   */
  static async getRoomById(roomId) {
    if (!roomId || !roomId.trim()) {
      throw new AppError(ErrorCodes.VALIDATION_FAILED, "Mã phòng không được để trống.", 400);
    }

    const cleanRoomId = roomId.trim();
    const room = await prisma.room.findUnique({
      where: { roomId: cleanRoomId },
      include: {
        _count: {
          select: { assignments: true },
        },
      },
    });

    if (!room) {
      throw new AppError(
        ErrorCodes.RESOURCE_NOT_FOUND,
        `Không tìm thấy phòng có mã '${cleanRoomId}'.`,
        404,
      );
    }

    return room;
  }

  /**
   * Tạo mới một phòng vật lý
   */
  static async createRoom(data) {
    const {
      roomId,
      type,
      size,
      price,
      maxAdults,
      maxChildren,
      extraChildFee,
      description,
      pictures,
      status = "AVAILABLE",
    } = data;

    // 1. Validate roomId
    if (!roomId || !roomId.trim()) {
      throw new AppError(ErrorCodes.VALIDATION_FAILED, "Mã phòng (Room ID) không được để trống.", 400);
    }
    const cleanRoomId = roomId.trim();

    // Kiểm tra trùng roomId
    const existing = await prisma.room.findUnique({
      where: { roomId: cleanRoomId },
    });
    if (existing) {
      throw new AppError(
        ErrorCodes.VALIDATION_FAILED,
        `Mã phòng '${cleanRoomId}' đã tồn tại trong hệ thống.`,
        400,
      );
    }

    // 2. Validate Type & Size
    const cleanType = type ? type.toUpperCase() : "";
    if (!VALID_ROOM_TYPES.includes(cleanType)) {
      throw new AppError(
        ErrorCodes.VALIDATION_FAILED,
        `Loại phòng '${type}' không hợp lệ. Chỉ chấp nhận: ${VALID_ROOM_TYPES.join(", ")}.`,
        400,
      );
    }

    const cleanSize = size ? size.toUpperCase() : "";
    if (!VALID_ROOM_SIZES.includes(cleanSize)) {
      throw new AppError(
        ErrorCodes.VALIDATION_FAILED,
        `Kích thước phòng '${size}' không hợp lệ. Chỉ chấp nhận: ${VALID_ROOM_SIZES.join(", ")}.`,
        400,
      );
    }

    // 3. Validate Price & Fees
    const parsedPrice = parseFloat(price);
    if (isNaN(parsedPrice) || parsedPrice <= 0) {
      throw new AppError(ErrorCodes.VALIDATION_FAILED, "Giá phòng phải là một số dương lớn hơn 0.", 400);
    }

    const parsedMaxAdults = parseInt(maxAdults, 10);
    if (isNaN(parsedMaxAdults) || parsedMaxAdults < 1) {
      throw new AppError(ErrorCodes.VALIDATION_FAILED, "Số người lớn tối đa phải lớn hơn hoặc bằng 1.", 400);
    }

    const parsedMaxChildren = maxChildren !== undefined ? parseInt(maxChildren, 10) : 0;
    if (isNaN(parsedMaxChildren) || parsedMaxChildren < 0) {
      throw new AppError(ErrorCodes.VALIDATION_FAILED, "Số trẻ em tối đa phải lớn hơn hoặc bằng 0.", 400);
    }

    const parsedExtraChildFee = extraChildFee !== undefined ? parseFloat(extraChildFee) : 0;
    if (isNaN(parsedExtraChildFee) || parsedExtraChildFee < 0) {
      throw new AppError(ErrorCodes.VALIDATION_FAILED, "Phụ phí trẻ em phát sinh phải lớn hơn hoặc bằng 0.", 400);
    }

    // 4. Validate Status
    const cleanStatus = status ? status.toUpperCase() : "AVAILABLE";
    if (!VALID_ROOM_STATUSES.includes(cleanStatus)) {
      throw new AppError(
        ErrorCodes.VALIDATION_FAILED,
        `Trạng thái phòng '${status}' không hợp lệ. Chỉ chấp nhận: ${VALID_ROOM_STATUSES.join(", ")}.`,
        400,
      );
    }

    // 5. Chuẩn hóa pictures (mảng các URL ảnh)
    let pictureList = [];
    if (Array.isArray(pictures)) {
      pictureList = pictures.map((p) => String(p).trim()).filter(Boolean);
    } else if (typeof pictures === "string" && pictures.trim()) {
      pictureList = pictures
        .split(",")
        .map((p) => p.trim())
        .filter(Boolean);
    }

    const created = await prisma.room.create({
      data: {
        roomId: cleanRoomId,
        type: cleanType,
        size: cleanSize,
        price: parsedPrice,
        maxAdults: parsedMaxAdults,
        maxChildren: parsedMaxChildren,
        extraChildFee: parsedExtraChildFee,
        description: description ? description.trim() : null,
        pictures: pictureList,
        status: cleanStatus,
      },
    });

    return created;
  }

  /**
   * Cập nhật thông tin phòng vật lý
   */
  static async updateRoom(roomId, data) {
    if (!roomId || !roomId.trim()) {
      throw new AppError(ErrorCodes.VALIDATION_FAILED, "Mã phòng không được để trống.", 400);
    }

    const cleanRoomId = roomId.trim();
    const room = await prisma.room.findUnique({
      where: { roomId: cleanRoomId },
    });

    if (!room) {
      throw new AppError(
        ErrorCodes.RESOURCE_NOT_FOUND,
        `Không tìm thấy phòng có mã '${cleanRoomId}'.`,
        404,
      );
    }

    const updateData = {};

    if (data.type !== undefined) {
      const cleanType = data.type.toUpperCase();
      if (!VALID_ROOM_TYPES.includes(cleanType)) {
        throw new AppError(
          ErrorCodes.VALIDATION_FAILED,
          `Loại phòng '${data.type}' không hợp lệ. Chỉ chấp nhận: ${VALID_ROOM_TYPES.join(", ")}.`,
          400,
        );
      }
      updateData.type = cleanType;
    }

    if (data.size !== undefined) {
      const cleanSize = data.size.toUpperCase();
      if (!VALID_ROOM_SIZES.includes(cleanSize)) {
        throw new AppError(
          ErrorCodes.VALIDATION_FAILED,
          `Kích thước phòng '${data.size}' không hợp lệ. Chỉ chấp nhận: ${VALID_ROOM_SIZES.join(", ")}.`,
          400,
        );
      }
      updateData.size = cleanSize;
    }

    if (data.price !== undefined) {
      const parsedPrice = parseFloat(data.price);
      if (isNaN(parsedPrice) || parsedPrice <= 0) {
        throw new AppError(ErrorCodes.VALIDATION_FAILED, "Giá phòng phải lớn hơn 0.", 400);
      }
      updateData.price = parsedPrice;
    }

    if (data.maxAdults !== undefined) {
      const parsedMaxAdults = parseInt(data.maxAdults, 10);
      if (isNaN(parsedMaxAdults) || parsedMaxAdults < 1) {
        throw new AppError(ErrorCodes.VALIDATION_FAILED, "Số người lớn tối đa phải lớn hơn hoặc bằng 1.", 400);
      }
      updateData.maxAdults = parsedMaxAdults;
    }

    if (data.maxChildren !== undefined) {
      const parsedMaxChildren = parseInt(data.maxChildren, 10);
      if (isNaN(parsedMaxChildren) || parsedMaxChildren < 0) {
        throw new AppError(ErrorCodes.VALIDATION_FAILED, "Số trẻ em tối đa phải lớn hơn hoặc bằng 0.", 400);
      }
      updateData.maxChildren = parsedMaxChildren;
    }

    if (data.extraChildFee !== undefined) {
      const parsedExtraChildFee = parseFloat(data.extraChildFee);
      if (isNaN(parsedExtraChildFee) || parsedExtraChildFee < 0) {
        throw new AppError(ErrorCodes.VALIDATION_FAILED, "Phụ phí trẻ em phát sinh phải lớn hơn hoặc bằng 0.", 400);
      }
      updateData.extraChildFee = parsedExtraChildFee;
    }

    if (data.description !== undefined) {
      updateData.description = data.description ? data.description.trim() : null;
    }

    if (data.pictures !== undefined) {
      let pictureList = [];
      if (Array.isArray(data.pictures)) {
        pictureList = data.pictures.map((p) => String(p).trim()).filter(Boolean);
      } else if (typeof data.pictures === "string") {
        pictureList = data.pictures
          .split(",")
          .map((p) => p.trim())
          .filter(Boolean);
      }
      updateData.pictures = pictureList;
    }

    if (data.status !== undefined) {
      const cleanStatus = data.status.toUpperCase();
      if (!VALID_ROOM_STATUSES.includes(cleanStatus)) {
        throw new AppError(
          ErrorCodes.VALIDATION_FAILED,
          `Trạng thái phòng '${data.status}' không hợp lệ. Chỉ chấp nhận: ${VALID_ROOM_STATUSES.join(", ")}.`,
          400,
        );
      }
      updateData.status = cleanStatus;
    }

    const updated = await prisma.room.update({
      where: { roomId: cleanRoomId },
      data: updateData,
    });

    return updated;
  }

  /**
   * Xóa phòng vật lý khỏi hệ thống (Có Booking Deletion Guard)
   */
  static async deleteRoom(roomId) {
    if (!roomId || !roomId.trim()) {
      throw new AppError(ErrorCodes.VALIDATION_FAILED, "Mã phòng không được để trống.", 400);
    }

    const cleanRoomId = roomId.trim();
    const room = await prisma.room.findUnique({
      where: { roomId: cleanRoomId },
    });

    if (!room) {
      throw new AppError(
        ErrorCodes.RESOURCE_NOT_FOUND,
        `Không tìm thấy phòng có mã '${cleanRoomId}'.`,
        404,
      );
    }

    // Booking Deletion Guard: Kiểm tra xem phòng đã từng được gán cho booking nào chưa
    const [assignmentCount, usageCount] = await Promise.all([
      prisma.roomAssignment.count({
        where: { roomId: cleanRoomId },
      }),
      prisma.serviceUsage.count({
        where: { roomId: cleanRoomId },
      }),
    ]);

    if (assignmentCount > 0 || usageCount > 0) {
      throw new AppError(
        ErrorCodes.ROOM_CANNOT_BE_DELETED,
        `Không thể xóa phòng '${cleanRoomId}' vì phòng đã từng có lịch sử gán phòng hoặc sử dụng dịch vụ cho booking.`,
        400,
        {
          roomId: cleanRoomId,
          assignmentCount,
          usageCount,
        },
      );
    }

    await prisma.room.delete({
      where: { roomId: cleanRoomId },
    });

    return {
      message: `Đã xóa phòng '${cleanRoomId}' thành công.`,
    };
  }
}
