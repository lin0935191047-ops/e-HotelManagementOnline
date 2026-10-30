import { prisma } from "../common/prisma.js";
import { AppError, ErrorCodes } from "../common/errors.js";
import ExcelJS from "exceljs";
import PDFDocument from "pdfkit";

export class OperationService {
  /**
   * Danh sách đơn đặt phòng dành cho nhân viên SALE
   * Tìm kiếm theo mã booking, họ tên, điện thoại, CCCD và lọc theo trạng thái, ngày lưu trú
   */
  static async listBookings({
    page = 1,
    limit = 10,
    keyword = "",
    status = "",
    fromDate = "",
    toDate = "",
  }) {
    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.max(1, Math.min(100, parseInt(limit, 10) || 10));
    const skip = (pageNum - 1) * limitNum;

    const where = {};

    // Tìm kiếm theo từ khóa
    if (keyword && typeof keyword === "string" && keyword.trim() !== "") {
      const kw = keyword.trim();
      where.OR = [
        { bookingNumber: { contains: kw, mode: "insensitive" } },
        { customerName: { contains: kw, mode: "insensitive" } },
        { customerPhone: { contains: kw, mode: "insensitive" } },
        { customerCccd: { contains: kw, mode: "insensitive" } },
        { customerEmail: { contains: kw, mode: "insensitive" } },
      ];
    }

    // Lọc theo trạng thái
    if (status && typeof status === "string" && status.trim() !== "") {
      where.status = status.trim().toUpperCase();
    }

    // Lọc theo ngày
    if (fromDate) {
      const fDate = new Date(fromDate);
      if (!isNaN(fDate.getTime())) {
        where.fromDate = { gte: fDate };
      }
    }

    if (toDate) {
      const tDate = new Date(toDate);
      if (!isNaN(tDate.getTime())) {
        where.toDate = { ...(where.toDate || {}), lte: tDate };
      }
    }

    const [total, rawBookings] = await Promise.all([
      prisma.booking.count({ where }),
      prisma.booking.findMany({
        where,
        skip,
        take: limitNum,
        orderBy: { createdAt: "desc" },
        include: {
          items: true,
          promotion: true,
          assignments: {
            include: {
              room: true,
              guests: true,
            },
          },
        },
      }),
    ]);

    const bookings = rawBookings.map((b) => {
      const nights = Math.max(
        1,
        Math.round(
          (new Date(b.toDate).getTime() - new Date(b.fromDate).getTime()) /
            (1000 * 60 * 60 * 24),
        ),
      );

      return {
        id: b.id,
        bookingNumber: b.bookingNumber,
        customerName: b.customerName,
        customerPhone: b.customerPhone,
        customerEmail: b.customerEmail,
        customerCccd: b.customerCccd,
        fromDate: b.fromDate,
        toDate: b.toDate,
        nights,
        totalRoomFee: Number(b.totalRoomFee),
        discountAmount: Number(b.discountAmount),
        netRoomFee: Number(b.netRoomFee),
        paymentOption: b.paymentOption,
        prepaidBookingValue: Number(b.prepaidBookingValue),
        extraChildrenFee: Number(b.extraChildrenFee),
        remainingPayable:
          Number(b.netRoomFee) +
          Number(b.extraChildrenFee) -
          Number(b.prepaidBookingValue),
        paymentAccountNumber: b.paymentAccountNumber,
        cancellationFee: b.cancellationFee !== null ? Number(b.cancellationFee) : null,
        refundAmount: b.refundAmount !== null ? Number(b.refundAmount) : null,
        status: b.status,
        createdAt: b.createdAt,
        cancelledAt: b.cancelledAt,
        checkedOutAt: b.checkedOutAt,
        items: b.items.map((it) => ({
          id: it.id,
          roomType: it.roomType,
          roomSize: it.roomSize,
          quantity: it.quantity,
          unitPrice: Number(it.unitPrice),
          subtotal: it.quantity * Number(it.unitPrice) * nights,
        })),
        assignments: b.assignments.map((as) => ({
          id: as.id,
          roomId: as.roomId,
          roomType: as.room?.type,
          roomSize: as.room?.size,
          checkInAt: as.checkInAt,
          checkOutAt: as.checkOutAt,
          guestsCount: as.guests.length,
          guests: as.guests,
        })),
      };
    });

    return {
      bookings,
      pagination: {
        total,
        page: pageNum,
        limit: limitNum,
        totalPages: Math.ceil(total / limitNum),
      },
    };
  }

  /**
   * Xem chi tiết một đơn đặt phòng
   */
  static async getBookingDetails(idOrBookingNumber) {
    if (!idOrBookingNumber) {
      throw new AppError(
        ErrorCodes.VALIDATION_FAILED,
        "Vui lòng cung cấp mã ID hoặc mã bookingNumber.",
        400,
      );
    }

    const isNumeric = /^\d+$/.test(String(idOrBookingNumber).trim());
    const where = isNumeric
      ? { id: parseInt(idOrBookingNumber, 10) }
      : { bookingNumber: String(idOrBookingNumber).trim().toUpperCase() };

    const b = await prisma.booking.findUnique({
      where,
      include: {
        items: true,
        promotion: true,
        assignments: {
          include: {
            room: true,
            guests: true,
          },
        },
        serviceUsages: {
          include: {
            service: true,
          },
        },
        invoice: true,
      },
    });

    if (!b) {
      throw new AppError(
        ErrorCodes.RESOURCE_NOT_FOUND,
        `Không tìm thấy đơn đặt phòng '${idOrBookingNumber}'.`,
        404,
      );
    }

    const nights = Math.max(
      1,
      Math.round(
        (new Date(b.toDate).getTime() - new Date(b.fromDate).getTime()) /
          (1000 * 60 * 60 * 24),
      ),
    );

    const totalServiceFee = b.serviceUsages.reduce(
      (acc, s) => acc + Number(s.totalPrice),
      0,
    );

    return {
      id: b.id,
      bookingNumber: b.bookingNumber,
      customerName: b.customerName,
      customerPhone: b.customerPhone,
      customerEmail: b.customerEmail,
      customerCccd: b.customerCccd,
      fromDate: b.fromDate,
      toDate: b.toDate,
      nights,
      totalRoomFee: Number(b.totalRoomFee),
      discountAmount: Number(b.discountAmount),
      netRoomFee: Number(b.netRoomFee),
      paymentOption: b.paymentOption,
      prepaidBookingValue: Number(b.prepaidBookingValue),
      extraChildrenFee: Number(b.extraChildrenFee),
      totalServiceFee,
      remainingPayable:
        Number(b.netRoomFee) +
        Number(b.extraChildrenFee) +
        totalServiceFee -
        Number(b.prepaidBookingValue),
      paymentAccountNumber: b.paymentAccountNumber,
      cancellationFee: b.cancellationFee !== null ? Number(b.cancellationFee) : null,
      refundAmount: b.refundAmount !== null ? Number(b.refundAmount) : null,
      status: b.status,
      createdAt: b.createdAt,
      cancelledAt: b.cancelledAt,
      checkedOutAt: b.checkedOutAt,
      promotion: b.promotion
        ? {
            code: b.promotion.code,
            name: b.promotion.name,
            discountType: b.promotion.discountType,
            value: Number(b.promotion.value),
          }
        : null,
      items: b.items.map((it) => ({
        id: it.id,
        roomType: it.roomType,
        roomSize: it.roomSize,
        quantity: it.quantity,
        unitPrice: Number(it.unitPrice),
        subtotal: it.quantity * Number(it.unitPrice) * nights,
      })),
      assignments: b.assignments.map((as) => ({
        id: as.id,
        roomId: as.roomId,
        room: as.room
          ? {
              roomId: as.room.roomId,
              type: as.room.type,
              size: as.room.size,
              price: Number(as.room.price),
              status: as.room.status,
              maxAdults: as.room.maxAdults,
              maxChildren: as.room.maxChildren,
              extraChildFee: Number(as.room.extraChildFee),
            }
          : null,
        checkInAt: as.checkInAt,
        checkOutAt: as.checkOutAt,
        guests: as.guests.map((g) => ({
          id: g.id,
          fullName: g.fullName,
          idNumber: g.idNumber,
          birthYear: g.birthYear,
          guestType: g.guestType,
        })),
      })),
      serviceUsages: b.serviceUsages.map((su) => ({
        ticketId: su.ticketId,
        roomId: su.roomId,
        serviceId: su.serviceId,
        serviceName: su.service?.serviceName,
        quantity: su.quantity,
        unitPrice: Number(su.unitPrice),
        totalPrice: Number(su.totalPrice),
        createdAt: su.createdAt,
      })),
      invoice: b.invoice
        ? {
            id: b.invoice.id,
            totalInvoiceAmount: Number(b.invoice.totalInvoiceAmount),
            remainingAmountPaid: Number(b.invoice.remainingAmountPaid),
            createdAt: b.invoice.createdAt,
          }
        : null,
    };
  }

  /**
   * Lấy danh sách phòng vật lý đang AVAILABLE phù hợp với các BookingItem của đơn cần check-in
   */
  static async getAvailableRoomsForCheckin(idOrBookingNumber) {
    const booking = await this.getBookingDetails(idOrBookingNumber);

    if (booking.status !== "CONFIRMED") {
      throw new AppError(
        ErrorCodes.VALIDATION_FAILED,
        `Đơn đặt phòng đang ở trạng thái '${booking.status}', không thể thực hiện check-in.`,
        400,
      );
    }

    // Lấy tất cả các phòng vật lý đang AVAILABLE
    const availableRooms = await prisma.room.findMany({
      where: { status: "AVAILABLE" },
      orderBy: { roomId: "asc" },
    });

    // Gom nhóm các phòng khả dụng theo từng item yêu cầu
    const matchingRoomsByItem = booking.items.map((it) => {
      const candidates = availableRooms.filter(
        (r) => r.type === it.roomType && r.size === it.roomSize,
      );

      return {
        roomType: it.roomType,
        roomSize: it.roomSize,
        requiredQuantity: it.quantity,
        availableCandidatesCount: candidates.length,
        hasEnoughRooms: candidates.length >= it.quantity,
        candidates: candidates.map((r) => ({
          roomId: r.roomId,
          type: r.type,
          size: r.size,
          price: Number(r.price),
          maxAdults: r.maxAdults,
          maxChildren: r.maxChildren,
          extraChildFee: Number(r.extraChildFee),
          status: r.status,
          description: r.description,
        })),
      };
    });

    return {
      booking: {
        id: booking.id,
        bookingNumber: booking.bookingNumber,
        customerName: booking.customerName,
        fromDate: booking.fromDate,
        toDate: booking.toDate,
        nights: booking.nights,
      },
      requirements: matchingRoomsByItem,
      allAvailableRooms: availableRooms.map((r) => ({
        roomId: r.roomId,
        type: r.type,
        size: r.size,
        price: Number(r.price),
        maxAdults: r.maxAdults,
        maxChildren: r.maxChildren,
        extraChildFee: Number(r.extraChildFee),
      })),
    };
  }

  /**
   * Thủ tục Check-in & Gán phòng vật lý (Luồng 3.3 SPEC 4.4 & ARCHITECTURE)
   * Sử dụng Interactive Transaction & Khóa bi quan SELECT ... FOR UPDATE chống gán trùng phòng
   * Tự động tính phụ thu trẻ em khi số trẻ em trong phòng > Room.maxChildren
   */
  static async checkInBooking({ bookingId, assignments }) {
    if (!bookingId) {
      throw new AppError(
        ErrorCodes.VALIDATION_FAILED,
        "Vui lòng cung cấp bookingId cần làm thủ tục check-in.",
        400,
      );
    }

    if (!Array.isArray(assignments) || assignments.length === 0) {
      throw new AppError(
        ErrorCodes.VALIDATION_FAILED,
        "Vui lòng cung cấp danh sách gán phòng vật lý và khách lưu trú (assignments).",
        400,
      );
    }

    const cleanBookingId = parseInt(bookingId, 10);
    if (isNaN(cleanBookingId)) {
      throw new AppError(
        ErrorCodes.VALIDATION_FAILED,
        "Mã bookingId phải là số nguyên hợp lệ.",
        400,
      );
    }

    return await prisma.$transaction(async (tx) => {
      // 1. Khóa bi quan bản ghi đơn đặt phòng
      const rawBookings = await tx.$queryRaw`
        SELECT id, booking_number, status, from_date, to_date, total_room_fee, net_room_fee, prepaid_booking_value, extra_children_fee
        FROM bookings
        WHERE id = ${cleanBookingId}
        FOR UPDATE;
      `;

      if (!rawBookings || rawBookings.length === 0) {
        throw new AppError(
          ErrorCodes.RESOURCE_NOT_FOUND,
          `Không tìm thấy đơn đặt phòng với ID ${cleanBookingId}.`,
          404,
        );
      }

      const lockedBooking = rawBookings[0];

      // Kiểm tra trạng thái: chỉ cho phép check-in đơn CONFIRMED
      if (lockedBooking.status !== "CONFIRMED") {
        throw new AppError(
          ErrorCodes.VALIDATION_FAILED,
          `Chỉ có thể check-in đơn đặt phòng ở trạng thái CONFIRMED. Đơn này hiện đang ở trạng thái '${lockedBooking.status}'.`,
          400,
        );
      }

      // Lấy danh sách BookingItem của đơn
      const items = await tx.bookingItem.findMany({
        where: { bookingId: lockedBooking.id },
      });

      if (!items || items.length === 0) {
        throw new AppError(
          ErrorCodes.VALIDATION_FAILED,
          "Đơn đặt phòng không có danh mục phòng cần gán.",
          400,
        );
      }

      // Xây dựng map nhu cầu phòng: { "VIP_SINGLE": 1, ... }
      const requiredMap = {};
      let totalRequiredRooms = 0;
      for (const it of items) {
        const key = `${it.roomType}_${it.roomSize}`;
        requiredMap[key] = (requiredMap[key] || 0) + it.quantity;
        totalRequiredRooms += it.quantity;
      }

      if (assignments.length !== totalRequiredRooms) {
        throw new AppError(
          ErrorCodes.VALIDATION_FAILED,
          `Số lượng phòng gán (${assignments.length}) không khớp với tổng số phòng yêu cầu trong đơn (${totalRequiredRooms}).`,
          400,
        );
      }

      // Kiểm tra trùng lặp roomId trong payload
      const seenRoomIds = new Set();
      for (const a of assignments) {
        if (!a.roomId || typeof a.roomId !== "string" || a.roomId.trim() === "") {
          throw new AppError(
            ErrorCodes.VALIDATION_FAILED,
            "Mỗi phần tử gán phòng phải có roomId hợp lệ.",
            400,
          );
        }
        const rId = a.roomId.trim();
        if (seenRoomIds.has(rId)) {
          throw new AppError(
            ErrorCodes.VALIDATION_FAILED,
            `Không được gán trùng cùng một số phòng vật lý '${rId}' trong danh sách check-in.`,
            400,
          );
        }
        seenRoomIds.add(rId);

        // Kiểm tra danh sách khách
        if (!Array.isArray(a.guests) || a.guests.length === 0) {
          throw new AppError(
            ErrorCodes.VALIDATION_FAILED,
            `Phòng '${rId}' chưa có danh sách khách lưu trú. Mỗi phòng phải có ít nhất 1 khách.`,
            400,
          );
        }

        for (const g of a.guests) {
          if (!g.fullName || typeof g.fullName !== "string" || g.fullName.trim() === "") {
            throw new AppError(
              ErrorCodes.VALIDATION_FAILED,
              `Phòng '${rId}': Vui lòng nhập họ và tên khách lưu trú.`,
              400,
            );
          }
          if (!g.idNumber || String(g.idNumber).trim() === "") {
            throw new AppError(
              ErrorCodes.VALIDATION_FAILED,
              `Phòng '${rId}': Vui lòng nhập số CCCD/CMND/Giấy tờ của khách '${g.fullName}'.`,
              400,
            );
          }
          const bYear = parseInt(g.birthYear, 10);
          const currYear = new Date().getFullYear();
          if (isNaN(bYear) || bYear < 1900 || bYear > currYear) {
            throw new AppError(
              ErrorCodes.VALIDATION_FAILED,
              `Phòng '${rId}': Năm sinh của khách '${g.fullName}' không hợp lệ (1900 - ${currYear}).`,
              400,
            );
          }
        }
      }

      // 2. Khóa bi quan và kiểm tra trạng thái từng phòng vật lý
      const lockedRoomsMap = new Map();
      const assignedCountMap = {};

      for (const a of assignments) {
        const rId = a.roomId.trim();
        const rawRooms = await tx.$queryRaw`
          SELECT room_id, status, type, size, max_adults, max_children, extra_child_fee
          FROM rooms
          WHERE room_id = ${rId}
          FOR UPDATE;
        `;

        if (!rawRooms || rawRooms.length === 0) {
          throw new AppError(
            ErrorCodes.RESOURCE_NOT_FOUND,
            `Phòng vật lý '${rId}' không tồn tại trên hệ thống.`,
            404,
          );
        }

        const room = rawRooms[0];

        if (room.status !== "AVAILABLE") {
          throw new AppError(
            ErrorCodes.ROOM_ALREADY_OCCUPIED,
            `Phòng vật lý '${room.room_id}' không khả dụng để gán (Trạng thái hiện tại: ${room.status}).`,
            400,
          );
        }

        const catKey = `${room.type}_${room.size}`;
        if (!requiredMap[catKey]) {
          throw new AppError(
            ErrorCodes.VALIDATION_FAILED,
            `Phòng '${room.room_id}' thuộc hạng ${catKey}, không có trong danh mục phòng khách đã đặt.`,
            400,
          );
        }

        assignedCountMap[catKey] = (assignedCountMap[catKey] || 0) + 1;
        if (assignedCountMap[catKey] > requiredMap[catKey]) {
          throw new AppError(
            ErrorCodes.VALIDATION_FAILED,
            `Số lượng phòng gán cho hạng ${catKey} vượt quá số lượng khách đã đặt (${requiredMap[catKey]} phòng).`,
            400,
          );
        }

        lockedRoomsMap.set(rId, room);
      }

      // Kiểm tra đầy đủ từng hạng phòng
      for (const [catKey, reqQty] of Object.entries(requiredMap)) {
        const actual = assignedCountMap[catKey] || 0;
        if (actual !== reqQty) {
          throw new AppError(
            ErrorCodes.VALIDATION_FAILED,
            `Hạng phòng ${catKey} yêu cầu gán ${reqQty} phòng nhưng mới gán ${actual} phòng.`,
            400,
          );
        }
      }

      // 3. Tự động tính phụ thu trẻ em theo công thức SPEC 4.4
      const nights = Math.max(
        1,
        Math.round(
          (new Date(lockedBooking.to_date).getTime() -
            new Date(lockedBooking.from_date).getTime()) /
            (1000 * 60 * 60 * 24),
        ),
      );

      const currentYear = new Date().getFullYear();
      let totalExtraChildrenFee = 0;
      const surchargeBreakdown = [];
      const processedAssignments = [];

      for (const a of assignments) {
        const rId = a.roomId.trim();
        const room = lockedRoomsMap.get(rId);

        let childCount = 0;
        let adultCount = 0;

        const guestsToSave = a.guests.map((g) => {
          const birthYear = parseInt(g.birthYear, 10);
          let guestType = g.guestType;
          if (!guestType || (guestType !== "ADULT" && guestType !== "CHILD")) {
            guestType = currentYear - birthYear < 12 ? "CHILD" : "ADULT";
          }

          if (guestType === "CHILD") childCount++;
          else adultCount++;

          return {
            fullName: g.fullName.trim(),
            idNumber: String(g.idNumber).trim(),
            birthYear,
            guestType,
          };
        });

        // Áp dụng công thức SPEC 4.4:
        // excessChildren = childCount - Room.maxChildren (nếu childCount > Room.maxChildren)
        // roomExtraChildFee = excessChildren * Room.extraChildFee * nights
        const maxChildren = Number(room.max_children);
        const extraFeePerChild = Number(room.extra_child_fee);
        let excessChildren = 0;
        let roomExtraChildFee = 0;

        if (childCount > maxChildren) {
          excessChildren = childCount - maxChildren;
          roomExtraChildFee = excessChildren * extraFeePerChild * nights;
        }

        totalExtraChildrenFee += roomExtraChildFee;

        surchargeBreakdown.push({
          roomId: room.room_id,
          roomType: room.type,
          roomSize: room.size,
          adultCount,
          childCount,
          maxChildren,
          excessChildren,
          extraFeePerChild,
          nights,
          roomExtraChildFee,
        });

        processedAssignments.push({
          roomId: room.room_id,
          guests: guestsToSave,
        });
      }

      // 4. Cập nhật cơ sở dữ liệu trong Transaction
      // Chuyển trạng thái các phòng vật lý sang OCCUPIED
      for (const a of assignments) {
        await tx.$executeRaw`
          UPDATE rooms
          SET status = 'OCCUPIED'
          WHERE room_id = ${a.roomId.trim()};
        `;
      }

      // Lưu RoomAssignment và StayingGuest
      const createdAssignments = [];
      for (const pa of processedAssignments) {
        const ra = await tx.roomAssignment.create({
          data: {
            bookingId: lockedBooking.id,
            roomId: pa.roomId,
            checkInAt: new Date(),
            guests: {
              create: pa.guests.map((g) => ({
                bookingId: lockedBooking.id,
                fullName: g.fullName,
                idNumber: g.idNumber,
                birthYear: g.birthYear,
                guestType: g.guestType,
              })),
            },
          },
          include: {
            room: true,
            guests: true,
          },
        });
        createdAssignments.push(ra);
      }

      // Cập nhật Booking: status = 'CHECKED_IN', extraChildrenFee = totalExtraChildrenFee
      const updatedBooking = await tx.booking.update({
        where: { id: lockedBooking.id },
        data: {
          status: "CHECKED_IN",
          extraChildrenFee: totalExtraChildrenFee,
        },
        include: {
          items: true,
          promotion: true,
        },
      });

      return {
        booking: {
          id: updatedBooking.id,
          bookingNumber: updatedBooking.bookingNumber,
          customerName: updatedBooking.customerName,
          customerPhone: updatedBooking.customerPhone,
          customerEmail: updatedBooking.customerEmail,
          customerCccd: updatedBooking.customerCccd,
          fromDate: updatedBooking.fromDate,
          toDate: updatedBooking.toDate,
          nights,
          totalRoomFee: Number(updatedBooking.totalRoomFee),
          discountAmount: Number(updatedBooking.discountAmount),
          netRoomFee: Number(updatedBooking.netRoomFee),
          prepaidBookingValue: Number(updatedBooking.prepaidBookingValue),
          extraChildrenFee: Number(updatedBooking.extraChildrenFee),
          remainingPayable:
            Number(updatedBooking.netRoomFee) +
            Number(updatedBooking.extraChildrenFee) -
            Number(updatedBooking.prepaidBookingValue),
          status: updatedBooking.status,
        },
        assignments: createdAssignments.map((ra) => ({
          assignmentId: ra.id,
          roomId: ra.roomId,
          roomType: ra.room?.type,
          roomSize: ra.room?.size,
          checkInAt: ra.checkInAt,
          guests: ra.guests.map((g) => ({
            id: g.id,
            fullName: g.fullName,
            idNumber: g.idNumber,
            birthYear: g.birthYear,
            guestType: g.guestType,
          })),
        })),
        surchargeBreakdown: {
          nights,
          totalExtraChildrenFee,
          rooms: surchargeBreakdown,
        },
      };
    });
  }

  /**
   * FEAT-10: Lấy danh sách các phòng đang OCCUPIED kèm thông tin booking và khách lưu trú
   * Dùng cho dropdown chọn phòng khi lập phiếu sử dụng dịch vụ
   */
  static async getOccupiedRooms() {
    const occupiedRooms = await prisma.room.findMany({
      where: {
        status: "OCCUPIED",
      },
      orderBy: { roomId: "asc" },
      include: {
        assignments: {
          where: {
            checkOutAt: null,
            booking: {
              status: "CHECKED_IN",
            },
          },
          orderBy: { checkInAt: "desc" },
          take: 1,
          include: {
            booking: true,
            guests: true,
          },
        },
      },
    });

    return occupiedRooms.map((r) => {
      const activeAssignment = r.assignments[0] || null;
      return {
        roomId: r.roomId,
        type: r.type,
        size: r.size,
        price: Number(r.price),
        status: r.status,
        bookingId: activeAssignment?.bookingId || null,
        bookingNumber: activeAssignment?.booking?.bookingNumber || null,
        customerName: activeAssignment?.booking?.customerName || null,
        customerPhone: activeAssignment?.booking?.customerPhone || null,
        stayingGuests:
          activeAssignment?.guests.map((g) => ({
            id: g.id,
            fullName: g.fullName,
            guestType: g.guestType,
            birthYear: g.birthYear,
          })) || [],
      };
    });
  }

  /**
   * FEAT-10: Lấy danh mục dịch vụ có sẵn của khách sạn
   */
  static async getServicesCatalog() {
    const services = await prisma.service.findMany({
      orderBy: { serviceId: "asc" },
    });

    return services.map((s) => ({
      serviceId: s.serviceId,
      serviceName: s.serviceName,
      description: s.description,
      unit: s.unit,
      price: Number(s.price),
    }));
  }

  /**
   * FEAT-10: Tạo phiếu sử dụng dịch vụ cho phòng đang ở
   * Bọc trong Interactive Transaction với khóa bi quan FOR UPDATE
   */
  static async createServiceUsage({ roomId, serviceId, quantity = 1 }) {
    if (!roomId || typeof roomId !== "string" || roomId.trim() === "") {
      throw new AppError(
        ErrorCodes.VALIDATION_FAILED,
        "Vui lòng chỉ định số phòng (roomId).",
        400,
      );
    }

    if (!serviceId || typeof serviceId !== "string" || serviceId.trim() === "") {
      throw new AppError(
        ErrorCodes.VALIDATION_FAILED,
        "Vui lòng chọn dịch vụ (serviceId).",
        400,
      );
    }

    const cleanRoomId = roomId.trim();
    const cleanServiceId = serviceId.trim();
    const quantityNum = parseInt(quantity, 10);

    if (isNaN(quantityNum) || quantityNum <= 0) {
      throw new AppError(
        ErrorCodes.VALIDATION_FAILED,
        "Số lượng sử dụng dịch vụ phải là số nguyên dương lớn hơn 0.",
        400,
      );
    }

    return await prisma.$transaction(async (tx) => {
      // 1. Khóa bi quan phòng vật lý bằng SELECT ... FOR UPDATE
      const lockedRooms = await tx.$queryRaw`
        SELECT room_id, status FROM rooms
        WHERE room_id = ${cleanRoomId}
        FOR UPDATE;
      `;

      if (!lockedRooms || lockedRooms.length === 0) {
        throw new AppError(
          ErrorCodes.RESOURCE_NOT_FOUND,
          `Phòng ${cleanRoomId} không tồn tại trong hệ thống.`,
          404,
        );
      }

      const room = lockedRooms[0];

      // 2. Kiểm tra trạng thái phòng bắt buộc phải là OCCUPIED
      if (room.status !== "OCCUPIED") {
        throw new AppError(
          ErrorCodes.ROOM_NOT_OCCUPIED,
          `Chỉ được đăng ký dịch vụ cho phòng đang có khách lưu trú (OCCUPIED). Phòng ${cleanRoomId} hiện đang ở trạng thái ${room.status}.`,
          400,
        );
      }

      // 3. Tìm phiên lưu trú đang hoạt động của phòng này
      const activeAssignment = await tx.roomAssignment.findFirst({
        where: {
          roomId: cleanRoomId,
          checkOutAt: null,
          booking: {
            status: "CHECKED_IN",
          },
        },
        include: {
          booking: true,
          guests: true,
        },
        orderBy: { checkInAt: "desc" },
      });

      if (!activeAssignment || !activeAssignment.booking) {
        throw new AppError(
          ErrorCodes.ROOM_NOT_OCCUPIED,
          `Không tìm thấy phiên lưu trú hoặc đơn đặt phòng hợp lệ đang Check-in tại phòng ${cleanRoomId}.`,
          400,
        );
      }

      // 4. Lấy thông tin dịch vụ
      const service = await tx.service.findUnique({
        where: { serviceId: cleanServiceId },
      });

      if (!service) {
        throw new AppError(
          ErrorCodes.SERVICE_NOT_FOUND,
          `Dịch vụ ${cleanServiceId} không tồn tại.`,
          400,
        );
      }

      const unitPrice = Number(service.price);
      const totalPrice = unitPrice * quantityNum;

      // 5. Sinh mã phiếu dịch vụ: TK-YYYYMMDD-XXXX
      const now = new Date();
      const yyyy = now.getFullYear();
      const mm = String(now.getMonth() + 1).padStart(2, "0");
      const dd = String(now.getDate()).padStart(2, "0");
      const randomSuffix = Math.random().toString(36).substring(2, 6).toUpperCase();
      const ticketId = `TK-${yyyy}${mm}${dd}-${randomSuffix}`;

      // 6. Lưu ServiceUsage
      const createdTicket = await tx.serviceUsage.create({
        data: {
          ticketId,
          bookingId: activeAssignment.bookingId,
          roomId: cleanRoomId,
          serviceId: cleanServiceId,
          quantity: quantityNum,
          unitPrice,
          totalPrice,
        },
        include: {
          service: true,
          booking: true,
        },
      });

      return {
        ticketId: createdTicket.ticketId,
        bookingId: createdTicket.bookingId,
        bookingNumber: createdTicket.booking.bookingNumber,
        customerName: createdTicket.booking.customerName,
        customerPhone: createdTicket.booking.customerPhone,
        customerCccd: createdTicket.booking.customerCccd,
        roomId: createdTicket.roomId,
        serviceId: createdTicket.serviceId,
        serviceName: createdTicket.service.serviceName,
        unit: createdTicket.service.unit,
        unitPrice: Number(createdTicket.unitPrice),
        quantity: createdTicket.quantity,
        totalPrice: Number(createdTicket.totalPrice),
        createdAt: createdTicket.createdAt,
        stayingGuests: activeAssignment.guests.map((g) => ({
          id: g.id,
          fullName: g.fullName,
          idNumber: g.idNumber,
          guestType: g.guestType,
        })),
      };
    });
  }

  /**
   * FEAT-10: Lấy chi tiết phiếu dịch vụ để in ấn HTML
   */
  static async getServiceTicket(ticketId) {
    if (!ticketId || typeof ticketId !== "string" || ticketId.trim() === "") {
      throw new AppError(
        ErrorCodes.VALIDATION_FAILED,
        "Vui lòng cung cấp mã phiếu dịch vụ (ticketId).",
        400,
      );
    }

    const cleanTicketId = ticketId.trim();

    const ticket = await prisma.serviceUsage.findUnique({
      where: { ticketId: cleanTicketId },
      include: {
        service: true,
        booking: {
          include: {
            assignments: {
              where: {
                roomId: { not: undefined },
              },
              include: {
                room: true,
                guests: true,
              },
            },
          },
        },
      },
    });

    if (!ticket) {
      throw new AppError(
        ErrorCodes.RESOURCE_NOT_FOUND,
        `Không tìm thấy phiếu dịch vụ có mã ${cleanTicketId}.`,
        404,
      );
    }

    // Tìm thông tin phòng và khách của phòng ghi trên phiếu
    const roomAssignment = ticket.booking.assignments.find(
      (a) => a.roomId === ticket.roomId,
    );

    return {
      ticketId: ticket.ticketId,
      createdAt: ticket.createdAt,
      bookingId: ticket.bookingId,
      bookingNumber: ticket.booking.bookingNumber,
      customerName: ticket.booking.customerName,
      customerPhone: ticket.booking.customerPhone,
      customerCccd: ticket.booking.customerCccd,
      roomId: ticket.roomId,
      roomType: roomAssignment?.room?.type || null,
      roomSize: roomAssignment?.room?.size || null,
      serviceId: ticket.serviceId,
      serviceName: ticket.service.serviceName,
      description: ticket.service.description,
      unit: ticket.service.unit,
      unitPrice: Number(ticket.unitPrice),
      quantity: ticket.quantity,
      totalPrice: Number(ticket.totalPrice),
      stayingGuests:
        roomAssignment?.guests.map((g) => ({
          id: g.id,
          fullName: g.fullName,
          idNumber: g.idNumber,
          guestType: g.guestType,
        })) || [],
    };
  }

  /**
   * FEAT-10: Danh sách các phiếu dịch vụ đã tạo (lịch sử)
   */
  static async listServiceTickets({
    page = 1,
    limit = 20,
    roomId = "",
    bookingId = null,
    keyword = "",
  }) {
    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.max(1, Math.min(100, parseInt(limit, 10) || 20));
    const skip = (pageNum - 1) * limitNum;

    const where = {};

    if (roomId && typeof roomId === "string" && roomId.trim() !== "") {
      where.roomId = roomId.trim();
    }

    if (bookingId) {
      const bId = parseInt(bookingId, 10);
      if (!isNaN(bId)) {
        where.bookingId = bId;
      }
    }

    if (keyword && typeof keyword === "string" && keyword.trim() !== "") {
      const kw = keyword.trim();
      where.OR = [
        { ticketId: { contains: kw, mode: "insensitive" } },
        { serviceId: { contains: kw, mode: "insensitive" } },
        { service: { serviceName: { contains: kw, mode: "insensitive" } } },
        { booking: { customerName: { contains: kw, mode: "insensitive" } } },
        { booking: { bookingNumber: { contains: kw, mode: "insensitive" } } },
      ];
    }

    const [total, tickets] = await Promise.all([
      prisma.serviceUsage.count({ where }),
      prisma.serviceUsage.findMany({
        where,
        skip,
        take: limitNum,
        orderBy: { createdAt: "desc" },
        include: {
          service: true,
          booking: true,
        },
      }),
    ]);

    return {
      total,
      page: pageNum,
      limit: limitNum,
      totalPages: Math.ceil(total / limitNum),
      tickets: tickets.map((t) => ({
        ticketId: t.ticketId,
        createdAt: t.createdAt,
        bookingId: t.bookingId,
        bookingNumber: t.booking?.bookingNumber,
        customerName: t.booking?.customerName,
        customerPhone: t.booking?.customerPhone,
        roomId: t.roomId,
        serviceId: t.serviceId,
        serviceName: t.service?.serviceName,
        unit: t.service?.unit,
        unitPrice: Number(t.unitPrice),
        quantity: t.quantity,
        totalPrice: Number(t.totalPrice),
      })),
    };
  }

  /**
   * FEAT-11: Xem trước quyết toán hóa đơn Check-out
   */
  static async previewCheckout(bookingIdOrNumber) {
    if (!bookingIdOrNumber) {
      throw new AppError(
        ErrorCodes.VALIDATION_FAILED,
        "Vui lòng chỉ định mã booking (id hoặc bookingNumber).",
        400,
      );
    }

    const where = isNaN(Number(bookingIdOrNumber))
      ? { bookingNumber: String(bookingIdOrNumber).trim() }
      : { id: parseInt(bookingIdOrNumber, 10) };

    const booking = await prisma.booking.findFirst({
      where,
      include: {
        items: true,
        promotion: true,
        assignments: {
          include: {
            room: true,
            guests: true,
          },
        },
        serviceUsages: {
          include: {
            service: true,
          },
          orderBy: { createdAt: "asc" },
        },
        invoice: true,
      },
    });

    if (!booking) {
      throw new AppError(
        ErrorCodes.RESOURCE_NOT_FOUND,
        `Không tìm thấy đơn đặt phòng tương ứng '${bookingIdOrNumber}'.`,
        404,
      );
    }

    if (booking.status !== "CHECKED_IN") {
      throw new AppError(
        ErrorCodes.CHECKOUT_INVALID,
        `Chỉ có thể làm thủ tục Check-out cho đơn đặt phòng đang ở trạng thái CHECKED_IN. Đơn này hiện đang ở trạng thái '${booking.status}'.`,
        400,
      );
    }

    const nights = Math.max(
      1,
      Math.round(
        (new Date(booking.toDate).getTime() - new Date(booking.fromDate).getTime()) /
          (1000 * 60 * 60 * 24),
      ),
    );

    const netRoomFee = Number(booking.netRoomFee);
    const extraChildrenFee = Number(booking.extraChildrenFee);
    const totalServiceFee = booking.serviceUsages.reduce(
      (sum, s) => sum + Number(s.totalPrice),
      0,
    );
    const totalInvoiceAmount = netRoomFee + extraChildrenFee + totalServiceFee;
    const prepaidBookingValue = Number(booking.prepaidBookingValue);
    const remainingPayable = totalInvoiceAmount - prepaidBookingValue;

    return {
      booking: {
        id: booking.id,
        bookingNumber: booking.bookingNumber,
        customerName: booking.customerName,
        customerPhone: booking.customerPhone,
        customerEmail: booking.customerEmail,
        customerCccd: booking.customerCccd,
        fromDate: booking.fromDate,
        toDate: booking.toDate,
        nights,
        paymentOption: booking.paymentOption,
        status: booking.status,
      },
      breakdown: {
        totalRoomFee: Number(booking.totalRoomFee),
        discountAmount: Number(booking.discountAmount),
        netRoomFee,
        extraChildrenFee,
        totalServiceFee,
        totalInvoiceAmount,
        prepaidBookingValue,
        remainingPayable,
      },
      rooms: booking.assignments.map((a) => ({
        roomId: a.roomId,
        type: a.room?.type,
        size: a.room?.size,
        checkInAt: a.checkInAt,
        guests: a.guests.map((g) => ({
          fullName: g.fullName,
          idNumber: g.idNumber,
          guestType: g.guestType,
          birthYear: g.birthYear,
        })),
      })),
      services: booking.serviceUsages.map((s) => ({
        ticketId: s.ticketId,
        roomId: s.roomId,
        serviceId: s.serviceId,
        serviceName: s.service?.serviceName,
        unit: s.service?.unit,
        unitPrice: Number(s.unitPrice),
        quantity: s.quantity,
        totalPrice: Number(s.totalPrice),
        createdAt: s.createdAt,
      })),
    };
  }

  /**
   * FEAT-11: Thực hiện thủ tục Check-out, Quyết toán hóa đơn & Giải phóng phòng
   * Bọc trong Interactive Transaction với khóa bi quan SELECT ... FOR UPDATE
   */
  static async checkOutBooking(bookingIdOrNumber) {
    if (!bookingIdOrNumber) {
      throw new AppError(
        ErrorCodes.VALIDATION_FAILED,
        "Vui lòng chỉ định mã booking (id hoặc bookingNumber).",
        400,
      );
    }

    const where = isNaN(Number(bookingIdOrNumber))
      ? { bookingNumber: String(bookingIdOrNumber).trim() }
      : { id: parseInt(bookingIdOrNumber, 10) };

    const initialBooking = await prisma.booking.findFirst({
      where,
    });

    if (!initialBooking) {
      throw new AppError(
        ErrorCodes.RESOURCE_NOT_FOUND,
        `Không tìm thấy đơn đặt phòng tương ứng '${bookingIdOrNumber}'.`,
        404,
      );
    }

    return await prisma.$transaction(async (tx) => {
      // 1. Khóa bi quan booking bằng SELECT ... FOR UPDATE
      const lockedBookings = await tx.$queryRaw`
        SELECT id, booking_number, status, total_room_fee, discount_amount, net_room_fee, extra_children_fee, prepaid_booking_value, from_date, to_date, customer_name, customer_phone, customer_email, customer_cccd
        FROM bookings
        WHERE id = ${initialBooking.id}
        FOR UPDATE;
      `;

      if (!lockedBookings || lockedBookings.length === 0) {
        throw new AppError(
          ErrorCodes.RESOURCE_NOT_FOUND,
          "Đơn đặt phòng không tồn tại.",
          404,
        );
      }

      const lockedBooking = lockedBookings[0];

      // 2. Kiểm tra trạng thái: chỉ cho phép Check-out đơn CHECKED_IN
      if (lockedBooking.status !== "CHECKED_IN") {
        throw new AppError(
          ErrorCodes.CHECKOUT_INVALID,
          `Chỉ có thể làm thủ tục Check-out cho đơn đặt phòng ở trạng thái CHECKED_IN. Đơn này hiện đang ở trạng thái '${lockedBooking.status}'.`,
          400,
        );
      }

      // 3. Kiểm tra xem đã có Invoice chưa
      const existingInvoice = await tx.invoice.findUnique({
        where: { bookingId: lockedBooking.id },
      });

      if (existingInvoice) {
        throw new AppError(
          ErrorCodes.CHECKOUT_INVALID,
          `Đơn đặt phòng này đã được quyết toán hóa đơn trước đó (${existingInvoice.invoiceId}).`,
          400,
        );
      }

      // 4. Lấy tất cả dịch vụ phát sinh của booking
      const serviceUsages = await tx.serviceUsage.findMany({
        where: { bookingId: lockedBooking.id },
        include: { service: true },
        orderBy: { createdAt: "asc" },
      });

      const totalServiceFee = serviceUsages.reduce(
        (sum, s) => sum + Number(s.totalPrice),
        0,
      );

      // 5. Tính toán tài chính theo công thức SPEC 4.5
      const totalRoomFee = Number(lockedBooking.net_room_fee);
      const extraChildrenFee = Number(lockedBooking.extra_children_fee);
      const totalInvoiceAmount = totalRoomFee + extraChildrenFee + totalServiceFee;
      const prepaidBookingValue = Number(lockedBooking.prepaid_booking_value);
      const remainingPayable = totalInvoiceAmount - prepaidBookingValue;

      // 6. Sinh mã Invoice: INV-YYYYMMDD-XXXX
      const now = new Date();
      const yyyy = now.getFullYear();
      const mm = String(now.getMonth() + 1).padStart(2, "0");
      const dd = String(now.getDate()).padStart(2, "0");
      const randomSuffix = Math.floor(1000 + Math.random() * 9000);
      const invoiceId = `INV-${yyyy}${mm}${dd}-${randomSuffix}`;

      // 7. Tạo bản ghi Invoice
      const createdInvoice = await tx.invoice.create({
        data: {
          invoiceId,
          bookingId: lockedBooking.id,
          totalRoomFee,
          extraChildrenFee,
          totalServiceFee,
          totalInvoiceAmount,
          prepaidBookingValue,
          remainingPayable,
          issuedAt: now,
        },
      });

      // 8. Cập nhật checkOutAt cho các RoomAssignment
      await tx.roomAssignment.updateMany({
        where: {
          bookingId: lockedBooking.id,
          checkOutAt: null,
        },
        data: {
          checkOutAt: now,
        },
      });

      // Lấy danh sách các phòng vật lý để giải phóng
      const assignments = await tx.roomAssignment.findMany({
        where: { bookingId: lockedBooking.id },
        include: { room: true, guests: true },
      });

      const releasedRoomIds = [];
      for (const a of assignments) {
        // Khóa phòng vật lý
        await tx.$queryRaw`
          SELECT room_id, status FROM rooms WHERE room_id = ${a.roomId} FOR UPDATE;
        `;

        // Giải phóng phòng về AVAILABLE
        await tx.room.update({
          where: { roomId: a.roomId },
          data: { status: "AVAILABLE" },
        });

        releasedRoomIds.push(a.roomId);
      }

      // 9. Cập nhật Booking sang CHECKED_OUT
      const updatedBooking = await tx.booking.update({
        where: { id: lockedBooking.id },
        data: {
          status: "CHECKED_OUT",
          checkedOutAt: now,
        },
        include: {
          items: true,
          promotion: true,
        },
      });

      const nights = Math.max(
        1,
        Math.round(
          (new Date(updatedBooking.toDate).getTime() -
            new Date(updatedBooking.fromDate).getTime()) /
            (1000 * 60 * 60 * 24),
        ),
      );

      return {
        invoice: {
          invoiceId: createdInvoice.invoiceId,
          issuedAt: createdInvoice.issuedAt,
          totalRoomFee: Number(createdInvoice.totalRoomFee),
          extraChildrenFee: Number(createdInvoice.extraChildrenFee),
          totalServiceFee: Number(createdInvoice.totalServiceFee),
          totalInvoiceAmount: Number(createdInvoice.totalInvoiceAmount),
          prepaidBookingValue: Number(createdInvoice.prepaidBookingValue),
          remainingPayable: Number(createdInvoice.remainingPayable),
        },
        booking: {
          id: updatedBooking.id,
          bookingNumber: updatedBooking.bookingNumber,
          customerName: updatedBooking.customerName,
          customerPhone: updatedBooking.customerPhone,
          customerEmail: updatedBooking.customerEmail,
          customerCccd: updatedBooking.customerCccd,
          fromDate: updatedBooking.fromDate,
          toDate: updatedBooking.toDate,
          nights,
          paymentOption: updatedBooking.paymentOption,
          status: updatedBooking.status,
          checkedOutAt: updatedBooking.checkedOutAt,
        },
        releasedRooms: releasedRoomIds,
        rooms: assignments.map((a) => ({
          roomId: a.roomId,
          type: a.room?.type,
          size: a.room?.size,
          checkInAt: a.checkInAt,
          checkOutAt: now,
          guests: a.guests.map((g) => ({
            fullName: g.fullName,
            idNumber: g.idNumber,
            guestType: g.guestType,
          })),
        })),
        services: serviceUsages.map((s) => ({
          ticketId: s.ticketId,
          roomId: s.roomId,
          serviceId: s.serviceId,
          serviceName: s.service?.serviceName,
          unit: s.service?.unit,
          unitPrice: Number(s.unitPrice),
          quantity: s.quantity,
          totalPrice: Number(s.totalPrice),
          createdAt: s.createdAt,
        })),
      };
    });
  }

  /**
   * FEAT-11: Lấy chi tiết hóa đơn xuất xưởng phục vụ in ấn HTML (@media print)
   */
  static async getInvoiceDetails(invoiceIdOrBookingId) {
    if (!invoiceIdOrBookingId) {
      throw new AppError(
        ErrorCodes.VALIDATION_FAILED,
        "Vui lòng cung cấp mã hóa đơn (invoiceId) hoặc mã booking.",
        400,
      );
    }

    const cleanInput = String(invoiceIdOrBookingId).trim();

    let invoice = null;

    if (cleanInput.startsWith("INV-")) {
      invoice = await prisma.invoice.findUnique({
        where: { invoiceId: cleanInput },
        include: {
          booking: {
            include: {
              items: true,
              promotion: true,
              assignments: {
                include: {
                  room: true,
                  guests: true,
                },
              },
              serviceUsages: {
                include: {
                  service: true,
                },
                orderBy: { createdAt: "asc" },
              },
            },
          },
        },
      });
    } else {
      // Tìm theo bookingId hoặc bookingNumber
      const bWhere = isNaN(Number(cleanInput))
        ? { bookingNumber: cleanInput }
        : { id: parseInt(cleanInput, 10) };

      const b = await prisma.booking.findFirst({
        where: bWhere,
        include: {
          invoice: true,
        },
      });

      if (b && b.invoice) {
        invoice = await prisma.invoice.findUnique({
          where: { invoiceId: b.invoice.invoiceId },
          include: {
            booking: {
              include: {
                items: true,
                promotion: true,
                assignments: {
                  include: {
                    room: true,
                    guests: true,
                  },
                },
                serviceUsages: {
                  include: {
                    service: true,
                  },
                  orderBy: { createdAt: "asc" },
                },
              },
            },
          },
        });
      }
    }

    if (!invoice) {
      throw new AppError(
        ErrorCodes.RESOURCE_NOT_FOUND,
        `Không tìm thấy hóa đơn tương ứng với '${cleanInput}'.`,
        404,
      );
    }

    const b = invoice.booking;
    const nights = Math.max(
      1,
      Math.round(
        (new Date(b.toDate).getTime() - new Date(b.fromDate).getTime()) /
          (1000 * 60 * 60 * 24),
      ),
    );

    return {
      invoiceId: invoice.invoiceId,
      issuedAt: invoice.issuedAt,
      totalRoomFee: Number(invoice.totalRoomFee),
      extraChildrenFee: Number(invoice.extraChildrenFee),
      totalServiceFee: Number(invoice.totalServiceFee),
      totalInvoiceAmount: Number(invoice.totalInvoiceAmount),
      prepaidBookingValue: Number(invoice.prepaidBookingValue),
      remainingPayable: Number(invoice.remainingPayable),
      booking: {
        id: b.id,
        bookingNumber: b.bookingNumber,
        customerName: b.customerName,
        customerPhone: b.customerPhone,
        customerEmail: b.customerEmail,
        customerCccd: b.customerCccd,
        fromDate: b.fromDate,
        toDate: b.toDate,
        nights,
        paymentOption: b.paymentOption,
        status: b.status,
        createdAt: b.createdAt,
        checkedOutAt: b.checkedOutAt,
        promotion: b.promotion
          ? {
              code: b.promotion.code,
              name: b.promotion.name,
              discountType: b.promotion.discountType,
              value: Number(b.promotion.value),
            }
          : null,
      },
      rooms: b.assignments.map((a) => ({
        roomId: a.roomId,
        type: a.room?.type,
        size: a.room?.size,
        price: Number(a.room?.price || 0),
        checkInAt: a.checkInAt,
        checkOutAt: a.checkOutAt,
        guests: a.guests.map((g) => ({
          fullName: g.fullName,
          idNumber: g.idNumber,
          guestType: g.guestType,
          birthYear: g.birthYear,
        })),
      })),
      services: b.serviceUsages.map((s) => ({
        ticketId: s.ticketId,
        roomId: s.roomId,
        serviceId: s.serviceId,
        serviceName: s.service?.serviceName,
        unit: s.service?.unit,
        unitPrice: Number(s.unitPrice),
        quantity: s.quantity,
        totalPrice: Number(s.totalPrice),
        createdAt: s.createdAt,
      })),
    };
  }

  /**
   * FEAT-11: Danh sách các hóa đơn đã xuất
   */
  static async listInvoices({
    page = 1,
    limit = 20,
    keyword = "",
    fromDate = "",
    toDate = "",
  }) {
    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.max(1, Math.min(100, parseInt(limit, 10) || 20));
    const skip = (pageNum - 1) * limitNum;

    const where = {};

    if (keyword && typeof keyword === "string" && keyword.trim() !== "") {
      const kw = keyword.trim();
      where.OR = [
        { invoiceId: { contains: kw, mode: "insensitive" } },
        { booking: { bookingNumber: { contains: kw, mode: "insensitive" } } },
        { booking: { customerName: { contains: kw, mode: "insensitive" } } },
        { booking: { customerPhone: { contains: kw, mode: "insensitive" } } },
      ];
    }

    if (fromDate) {
      const fDate = new Date(fromDate);
      if (!isNaN(fDate.getTime())) {
        where.issuedAt = { gte: fDate };
      }
    }

    if (toDate) {
      const tDate = new Date(toDate);
      if (!isNaN(tDate.getTime())) {
        where.issuedAt = { ...(where.issuedAt || {}), lte: tDate };
      }
    }

    const [total, invoices] = await Promise.all([
      prisma.invoice.count({ where }),
      prisma.invoice.findMany({
        where,
        skip,
        take: limitNum,
        orderBy: { issuedAt: "desc" },
        include: {
          booking: true,
        },
      }),
    ]);

    return {
      total,
      page: pageNum,
      limit: limitNum,
      totalPages: Math.ceil(total / limitNum),
      invoices: invoices.map((inv) => ({
        invoiceId: inv.invoiceId,
        bookingId: inv.bookingId,
        bookingNumber: inv.booking?.bookingNumber,
        customerName: inv.booking?.customerName,
        customerPhone: inv.booking?.customerPhone,
        totalInvoiceAmount: Number(inv.totalInvoiceAmount),
        prepaidBookingValue: Number(inv.prepaidBookingValue),
        remainingPayable: Number(inv.remainingPayable),
        issuedAt: inv.issuedAt,
      })),
    };
  }

  /**
   * Helper chuẩn hóa khoảng ngày lọc
   */
  static parseDateBounds(fromDate, toDate) {
    let start = null;
    let end = null;

    if (fromDate && typeof fromDate === "string" && fromDate.trim() !== "") {
      const trimmed = fromDate.trim();
      if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
        start = new Date(`${trimmed}T00:00:00.000Z`);
      } else {
        const d = new Date(trimmed);
        if (!isNaN(d.getTime())) start = d;
      }
    }

    if (toDate && typeof toDate === "string" && toDate.trim() !== "") {
      const trimmed = toDate.trim();
      if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
        end = new Date(`${trimmed}T23:59:59.999Z`);
      } else {
        const d = new Date(trimmed);
        if (!isNaN(d.getTime())) end = d;
      }
    }

    return { start, end };
  }

  /**
   * FEAT-12: Báo cáo Doanh thu Khách sạn
   * Công thức SPEC 4.5:
   * Total Revenue = Sum(Checked-out Invoice.totalInvoiceAmount) + Sum(Cancelled Booking.cancellationFee)
   */
  static async getRevenueReport({ fromDate = "", toDate = "" } = {}) {
    const { start, end } = this.parseDateBounds(fromDate, toDate);

    // 1. Truy vấn các đơn đã CHECKED_OUT trong kỳ
    const checkoutWhere = {
      status: "CHECKED_OUT",
    };
    if (start || end) {
      checkoutWhere.OR = [
        {
          checkedOutAt: {
            ...(start ? { gte: start } : {}),
            ...(end ? { lte: end } : {}),
          },
        },
        {
          checkedOutAt: null,
          invoice: {
            issuedAt: {
              ...(start ? { gte: start } : {}),
              ...(end ? { lte: end } : {}),
            },
          },
        },
      ];
    }

    const checkoutBookings = await prisma.booking.findMany({
      where: checkoutWhere,
      include: {
        invoice: true,
        items: true,
      },
      orderBy: {
        checkedOutAt: "desc",
      },
    });

    // 2. Truy vấn các đơn đã CANCELLED trong kỳ
    const cancelledWhere = {
      status: "CANCELLED",
    };
    if (start || end) {
      cancelledWhere.OR = [
        {
          cancelledAt: {
            ...(start ? { gte: start } : {}),
            ...(end ? { lte: end } : {}),
          },
        },
        {
          cancelledAt: null,
          createdAt: {
            ...(start ? { gte: start } : {}),
            ...(end ? { lte: end } : {}),
          },
        },
      ];
    }

    const cancelledBookings = await prisma.booking.findMany({
      where: cancelledWhere,
      include: {
        items: true,
      },
      orderBy: {
        cancelledAt: "desc",
      },
    });

    // 3. Tính toán doanh thu theo công thức chuẩn SPEC 4.5
    const totalCheckoutRevenue = checkoutBookings.reduce(
      (sum, b) =>
        sum +
        Number(
          b.invoice?.totalInvoiceAmount ??
            Number(b.netRoomFee) + Number(b.extraChildrenFee)
        ),
      0
    );

    const totalCancellationFee = cancelledBookings.reduce(
      (sum, b) => sum + Number(b.cancellationFee || 0),
      0
    );

    const totalRevenue = totalCheckoutRevenue + totalCancellationFee;

    // 4. Định dạng danh sách giao dịch chi tiết
    const formattedCheckouts = checkoutBookings.map((b) => ({
      id: b.id,
      bookingNumber: b.bookingNumber,
      customerName: b.customerName,
      customerPhone: b.customerPhone,
      customerEmail: b.customerEmail,
      customerCccd: b.customerCccd,
      status: "CHECKED_OUT",
      transactionDate: b.checkedOutAt || b.invoice?.issuedAt || b.createdAt,
      invoiceId: b.invoice?.invoiceId || null,
      netRoomFee: Number(b.netRoomFee || 0),
      extraChildrenFee: Number(b.extraChildrenFee || 0),
      totalServiceFee: Number(b.invoice?.totalServiceFee || 0),
      prepaidBookingValue: Number(b.prepaidBookingValue || 0),
      cancellationFee: 0,
      revenueAmount: Number(
        b.invoice?.totalInvoiceAmount ??
          Number(b.netRoomFee) + Number(b.extraChildrenFee)
      ),
      itemsSummary:
        b.items?.map((it) => `${it.roomType} ${it.roomSize} x${it.quantity}`).join(", ") || "",
    }));

    const formattedCancelled = cancelledBookings.map((b) => ({
      id: b.id,
      bookingNumber: b.bookingNumber,
      customerName: b.customerName,
      customerPhone: b.customerPhone,
      customerEmail: b.customerEmail,
      customerCccd: b.customerCccd,
      status: "CANCELLED",
      transactionDate: b.cancelledAt || b.createdAt,
      invoiceId: null,
      netRoomFee: Number(b.netRoomFee || 0),
      extraChildrenFee: 0,
      totalServiceFee: 0,
      prepaidBookingValue: Number(b.prepaidBookingValue || 0),
      cancellationFee: Number(b.cancellationFee || 0),
      revenueAmount: Number(b.cancellationFee || 0),
      itemsSummary:
        b.items?.map((it) => `${it.roomType} ${it.roomSize} x${it.quantity}`).join(", ") || "",
    }));

    const records = [...formattedCheckouts, ...formattedCancelled].sort(
      (a, b) =>
        new Date(b.transactionDate).getTime() - new Date(a.transactionDate).getTime()
    );

    return {
      summary: {
        fromDate: fromDate || null,
        toDate: toDate || null,
        totalRevenue,
        totalCheckoutRevenue,
        totalCancellationFee,
        checkoutCount: checkoutBookings.length,
        cancellationCount: cancelledBookings.length,
        totalCount: records.length,
      },
      records,
    };
  }

  /**
   * FEAT-12: Xuất Báo cáo Doanh thu định dạng Excel (.xlsx)
   */
  static async exportRevenueExcel({ fromDate = "", toDate = "" } = {}) {
    const report = await this.getRevenueReport({ fromDate, toDate });
    const { summary, records } = report;

    const workbook = new ExcelJS.Workbook();
    workbook.creator = "e-Hotel Management System";
    workbook.created = new Date();

    const worksheet = workbook.addWorksheet("Báo Cáo Doanh Thu", {
      views: [{ showGridLines: true }],
    });

    // Tiêu đề báo cáo
    worksheet.mergeCells("A1:I1");
    const titleCell = worksheet.getCell("A1");
    titleCell.value = "HỆ THỐNG QUẢN LÝ KHÁCH SẠN E-HOTEL";
    titleCell.font = { bold: true, size: 14, color: { argb: "FF1E3A8A" } };
    titleCell.alignment = { horizontal: "center", vertical: "middle" };

    worksheet.mergeCells("A2:I2");
    const subtitleCell = worksheet.getCell("A2");
    subtitleCell.value = "BÁO CÁO DOANH THU HOẠT ĐỘNG KHÁCH SẠN";
    subtitleCell.font = { bold: true, size: 16, color: { argb: "FF0F172A" } };
    subtitleCell.alignment = { horizontal: "center", vertical: "middle" };

    worksheet.mergeCells("A3:I3");
    const dateCell = worksheet.getCell("A3");
    const periodText = `Kỳ báo cáo: Từ ngày ${fromDate || "Toàn bộ"} đến ngày ${toDate || "Hiện tại"} | Ngày kết xuất: ${new Date().toLocaleString("vi-VN")}`;
    dateCell.value = periodText;
    dateCell.font = { italic: true, size: 10, color: { argb: "FF64748B" } };
    dateCell.alignment = { horizontal: "center", vertical: "middle" };

    worksheet.addRow([]);

    // Phần tổng quan
    const summaryHeader = worksheet.addRow(["TỔNG QUAN DOANH THU THEO ĐẶC TẢ SPEC 4.5"]);
    summaryHeader.font = { bold: true, size: 11, color: { argb: "FF1E293B" } };

    const s1 = worksheet.addRow([
      "Tổng Doanh Thu Thực Tế (VNĐ):",
      `${summary.totalRevenue.toLocaleString("vi-VN")} VNĐ`,
    ]);
    s1.getCell(1).font = { bold: true };
    s1.getCell(2).font = { bold: true, color: { argb: "FF16A34A" } };

    worksheet.addRow([
      "Doanh thu từ hóa đơn trả phòng (Check-out):",
      `${summary.totalCheckoutRevenue.toLocaleString("vi-VN")} VNĐ (${summary.checkoutCount} giao dịch)`,
    ]);

    worksheet.addRow([
      "Doanh thu từ 20% phí phạt hủy phòng (Cancelled):",
      `${summary.totalCancellationFee.toLocaleString("vi-VN")} VNĐ (${summary.cancellationCount} giao dịch)`,
    ]);

    worksheet.addRow([
      "Tổng số giao dịch phát sinh doanh thu:",
      `${summary.totalCount} giao dịch`,
    ]);

    worksheet.addRow([]);

    // Bảng chi tiết
    const headers = [
      "STT",
      "Mã Booking",
      "Mã Hóa Đơn",
      "Khách Hàng",
      "Số Điện Thoại",
      "Trạng Thái",
      "Thời Điểm",
      "Bảng Phân Bổ Nguồn Thu",
      "Doanh Thu Ghi Nhận (VNĐ)",
    ];

    const headerRow = worksheet.addRow(headers);
    headerRow.eachCell((cell) => {
      cell.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "FF1E3A8A" },
      };
      cell.font = { bold: true, color: { argb: "FFFFFFFF" } };
      cell.alignment = { horizontal: "center", vertical: "middle" };
    });

    records.forEach((r, idx) => {
      const detailText =
        r.status === "CHECKED_OUT"
          ? `Tiền phòng: ${r.netRoomFee.toLocaleString("vi-VN")}đ | Phụ thu trẻ em: ${r.extraChildrenFee.toLocaleString("vi-VN")}đ | Dịch vụ: ${r.totalServiceFee.toLocaleString("vi-VN")}đ`
          : `20% phí phạt giữ lại (Tiền khách đã cọc: ${r.prepaidBookingValue.toLocaleString("vi-VN")}đ)`;

      const row = worksheet.addRow([
        idx + 1,
        r.bookingNumber,
        r.invoiceId || "-",
        r.customerName,
        r.customerPhone,
        r.status === "CHECKED_OUT" ? "TRẢ PHÒNG" : "ĐÃ HỦY",
        r.transactionDate ? new Date(r.transactionDate).toLocaleString("vi-VN") : "-",
        detailText,
        r.revenueAmount,
      ]);

      row.getCell(1).alignment = { horizontal: "center" };
      row.getCell(2).alignment = { horizontal: "center" };
      row.getCell(3).alignment = { horizontal: "center" };
      row.getCell(5).alignment = { horizontal: "center" };
      row.getCell(6).alignment = { horizontal: "center" };
      row.getCell(7).alignment = { horizontal: "center" };
      row.getCell(9).numFmt = "#,##0";
      row.getCell(9).alignment = { horizontal: "right" };
    });

    // Dòng tổng cộng
    const totalRow = worksheet.addRow([
      "TỔNG CỘNG DOANH THU",
      "",
      "",
      "",
      "",
      "",
      "",
      "",
      summary.totalRevenue,
    ]);
    worksheet.mergeCells(`A${totalRow.number}:H${totalRow.number}`);
    totalRow.getCell(1).font = { bold: true, size: 11 };
    totalRow.getCell(1).alignment = { horizontal: "center", vertical: "middle" };
    totalRow.getCell(9).font = { bold: true, size: 11, color: { argb: "FFDC2626" } };
    totalRow.getCell(9).numFmt = "#,##0";
    totalRow.getCell(9).alignment = { horizontal: "right", vertical: "middle" };

    worksheet.columns = [
      { width: 6 },
      { width: 22 },
      { width: 22 },
      { width: 24 },
      { width: 16 },
      { width: 16 },
      { width: 22 },
      { width: 50 },
      { width: 26 },
    ];

    return await workbook.xlsx.writeBuffer();
  }

  /**
   * FEAT-12: Xuất Báo cáo Doanh thu định dạng PDF (.pdf)
   */
  static async exportRevenuePdf({ fromDate = "", toDate = "" } = {}) {
    const report = await this.getRevenueReport({ fromDate, toDate });
    const { summary, records } = report;

    return new Promise((resolve, reject) => {
      const doc = new PDFDocument({ margin: 40, size: "A4" });
      const chunks = [];

      doc.on("data", (chunk) => chunks.push(chunk));
      doc.on("end", () => resolve(Buffer.concat(chunks)));
      doc.on("error", (err) => reject(err));

      // Header
      doc.fontSize(16).text("E-HOTEL MANAGEMENT & BOOKING SYSTEM", { align: "center" });
      doc.fontSize(14).text("BAO CAO DOANH THU (REVENUE REPORT)", { align: "center" });
      doc.moveDown(0.5);

      const periodStr = `Ky bao cao: ${fromDate || "Tat ca"} den ${toDate || "Hien tai"} | Ngay xuat: ${new Date().toISOString().slice(0, 10)}`;
      doc.fontSize(9).fillColor("#555555").text(periodStr, { align: "center" });
      doc.fillColor("#000000").moveDown(1);

      // Tong quan
      doc.fontSize(11).text("--- 1. TONG QUAN DOANH THU (SUMMARY) ---", { underline: true });
      doc.moveDown(0.4);
      doc.fontSize(10);
      doc.text(`Tong Doanh Thu (Total Revenue): ${summary.totalRevenue.toLocaleString("vi-VN")} VND`);
      doc.text(`Doanh thu tu hoa don tra phong (Checkout): ${summary.totalCheckoutRevenue.toLocaleString("vi-VN")} VND (${summary.checkoutCount} giao dich)`);
      doc.text(`Doanh thu tu phi huy phong (Cancellation 20%): ${summary.totalCancellationFee.toLocaleString("vi-VN")} VND (${summary.cancellationCount} giao dich)`);
      doc.text(`Tong so luot giao dich phat sinh doanh thu: ${summary.totalCount}`);
      doc.moveDown(1);

      // Danh sach giao dich
      doc.fontSize(11).text("--- 2. DANH SACH GIAO DICH PHAT SINH DOANH THU ---", { underline: true });
      doc.moveDown(0.4);

      records.forEach((r, idx) => {
        const typeStr = r.status === "CHECKED_OUT" ? "[TRA PHONG / CHECK-OUT]" : "[HUY PHONG / CANCELLED]";
        const dateStr = r.transactionDate ? new Date(r.transactionDate).toISOString().slice(0, 16).replace("T", " ") : "N/A";
        const amountStr = `${r.revenueAmount.toLocaleString("vi-VN")} VND`;

        doc.fontSize(9).fillColor("#1e3a8a").text(
          `${idx + 1}. Booking: ${r.bookingNumber} | Khach hang: ${r.customerName} (${r.customerPhone})`
        );
        doc.fillColor("#222222").text(
          `   Trang thai: ${typeStr} | Thoi diem: ${dateStr} | Doanh thu: ${amountStr}`
        );
        if (r.status === "CHECKED_OUT") {
          doc.fillColor("#555555").text(
            `   Chi tiet: Tien phong: ${r.netRoomFee.toLocaleString("vi-VN")} VND | Tre em: ${r.extraChildrenFee.toLocaleString("vi-VN")} VND | Dich vu: ${r.totalServiceFee.toLocaleString("vi-VN")} VND | Ma HD: ${r.invoiceId || "N/A"}`
          );
        } else {
          doc.fillColor("#555555").text(
            `   Chi tiet: 20% phi phat giu lai tu tien khach da tra: ${r.prepaidBookingValue.toLocaleString("vi-VN")} VND`
          );
        }
        doc.moveDown(0.3);

        if (doc.y > 720) {
          doc.addPage();
        }
      });

      doc.moveDown(1);
      doc.fontSize(11).fillColor("#b91c1c").text(
        `>>> TONG DOANH THU GHI NHAN: ${summary.totalRevenue.toLocaleString("vi-VN")} VND <<<`,
        { align: "right" }
      );

      // Signatures
      doc.moveDown(2);
      if (doc.y > 670) {
        doc.addPage();
      }
      const sigY = doc.y;
      doc.fontSize(10).fillColor("#000000");
      doc.text("Nguoi Lap Bao Cao", 50, sigY, { width: 150, align: "center" });
      doc.text("Ke Toan Truong", 220, sigY, { width: 150, align: "center" });
      doc.text("Giam Doc Khach San", 390, sigY, { width: 150, align: "center" });

      doc.fontSize(8).fillColor("#777777");
      doc.text("(Ky va ghi ro ho ten)", 50, sigY + 15, { width: 150, align: "center" });
      doc.text("(Ky va ghi ro ho ten)", 220, sigY + 15, { width: 150, align: "center" });
      doc.text("(Ky va dong dau)", 390, sigY + 15, { width: 150, align: "center" });

      doc.end();
    });
  }
}
