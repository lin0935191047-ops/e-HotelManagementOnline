import { prisma } from "../common/prisma.js";
import { AppError, ErrorCodes } from "../common/errors.js";
import { CatalogService } from "./catalog.service.js";

const VALID_ROOM_TYPES = ["VIP", "DELUX", "LIVING_SUITE"];
const VALID_ROOM_SIZES = ["SINGLE", "DOUBLE"];
const VALID_PAYMENT_OPTIONS = ["FULL_100", "DEPOSIT_50"];

export class BookingService {
  /**
   * Kiểm tra và tính toán giảm giá của mã khuyến mãi
   */
  static async validatePromotion({ code, totalRoomFee = 0 }) {
    if (!code || typeof code !== "string") {
      throw new AppError(
        ErrorCodes.VALIDATION_FAILED,
        "Vui lòng cung cấp mã khuyến mãi hợp lệ.",
        400,
      );
    }

    const promo = await prisma.promotion.findUnique({
      where: { code: code.trim().toUpperCase() },
    });

    if (!promo) {
      throw new AppError(
        ErrorCodes.RESOURCE_NOT_FOUND,
        `Mã khuyến mãi '${code}' không tồn tại trên hệ thống.`,
        404,
      );
    }

    const now = new Date();
    if (now < promo.startDate) {
      throw new AppError(
        ErrorCodes.VALIDATION_FAILED,
        `Chương trình khuyến mãi '${promo.name}' chưa bắt đầu (Áp dụng từ ${promo.startDate.toLocaleDateString("vi-VN")}).`,
        400,
      );
    }

    if (now > promo.endDate) {
      throw new AppError(
        ErrorCodes.VALIDATION_FAILED,
        `Mã khuyến mãi '${promo.code}' đã hết hạn vào ngày ${promo.endDate.toLocaleDateString("vi-VN")}.`,
        400,
      );
    }

    const promoValue = Number(promo.value);
    let discountAmount = 0;

    if (promo.discountType === "PERCENTAGE") {
      discountAmount = Math.round(totalRoomFee * (promoValue / 100));
    } else if (promo.discountType === "FIXED_AMOUNT") {
      discountAmount = Math.min(totalRoomFee, promoValue);
    }

    const netRoomFee = Math.max(0, totalRoomFee - discountAmount);

    return {
      promotion: {
        id: promo.id,
        code: promo.code,
        name: promo.name,
        discountType: promo.discountType,
        value: promoValue,
        startDate: promo.startDate,
        endDate: promo.endDate,
      },
      discountAmount,
      netRoomFee,
    };
  }

  /**
   * Tính toán trước giỏ hàng (Preview Breakdown)
   */
  static async calculateBookingPreview({
    fromDate,
    toDate,
    items,
    promotionCode,
    paymentOption = "FULL_100",
  }) {
    if (!fromDate || !toDate) {
      throw new AppError(
        ErrorCodes.VALIDATION_FAILED,
        "Vui lòng cung cấp ngày nhận phòng và ngày trả phòng.",
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
        "Ngày trả phòng phải sau ngày nhận phòng.",
        400,
      );
    }

    if (!Array.isArray(items) || items.length === 0) {
      throw new AppError(
        ErrorCodes.VALIDATION_FAILED,
        "Giỏ hàng trống. Vui lòng chọn ít nhất một hạng phòng.",
        400,
      );
    }

    if (!VALID_PAYMENT_OPTIONS.includes(paymentOption)) {
      throw new AppError(
        ErrorCodes.VALIDATION_FAILED,
        "Hình thức thanh toán không hợp lệ (Chỉ chấp nhận FULL_100 hoặc DEPOSIT_50).",
        400,
      );
    }

    const nights = Math.max(
      1,
      Math.ceil((to.getTime() - from.getTime()) / (1000 * 60 * 60 * 24)),
    );

    // Tính tiền phòng từng item dựa trên đơn giá trong cơ sở dữ liệu
    const calculatedItems = [];
    let totalRoomFee = 0;

    for (const item of items) {
      const roomType = item.roomType?.toUpperCase();
      const roomSize = item.roomSize?.toUpperCase();
      const quantity = parseInt(item.quantity, 10);

      if (!VALID_ROOM_TYPES.includes(roomType) || !VALID_ROOM_SIZES.includes(roomSize)) {
        throw new AppError(
          ErrorCodes.VALIDATION_FAILED,
          `Hạng phòng (${item.roomType}, ${item.roomSize}) không hợp lệ.`,
          400,
        );
      }

      if (isNaN(quantity) || quantity <= 0) {
        throw new AppError(
          ErrorCodes.VALIDATION_FAILED,
          "Số lượng phòng phải lớn hơn 0.",
          400,
        );
      }

      // Lấy đơn giá niêm yết từ DB
      const sampleRoom = await prisma.room.findFirst({
        where: { type: roomType, size: roomSize, status: { not: "MAINTENANCE" } },
        select: { price: true, description: true, pictures: true },
      });

      if (!sampleRoom) {
        throw new AppError(
          ErrorCodes.RESOURCE_NOT_FOUND,
          `Hạng phòng ${roomType} ${roomSize} hiện không khả dụng.`,
          400,
        );
      }

      const unitPrice = Number(sampleRoom.price);
      const subtotal = quantity * unitPrice * nights;
      totalRoomFee += subtotal;

      calculatedItems.push({
        roomType,
        roomSize,
        categoryName: CatalogService.formatCategoryName(roomType, roomSize),
        quantity,
        unitPrice,
        nights,
        subtotal,
        pictures: sampleRoom.pictures || [],
      });
    }

    // Áp dụng khuyến mãi nếu có
    let discountAmount = 0;
    let netRoomFee = totalRoomFee;
    let appliedPromotion = null;

    if (promotionCode && promotionCode.trim()) {
      const promoResult = await this.validatePromotion({
        code: promotionCode.trim(),
        totalRoomFee,
      });
      discountAmount = promoResult.discountAmount;
      netRoomFee = promoResult.netRoomFee;
      appliedPromotion = promoResult.promotion;
    }

    // Tính số tiền cần thanh toán trước theo hình thức chọn
    let prepaidBookingValue = netRoomFee;
    if (paymentOption === "DEPOSIT_50") {
      prepaidBookingValue = Math.round(netRoomFee * 0.5);
    }
    const remainingPayableAtCheckIn = netRoomFee - prepaidBookingValue;

    return {
      fromDate: from.toISOString(),
      toDate: to.toISOString(),
      nights,
      items: calculatedItems,
      totalRoomFee,
      promotion: appliedPromotion,
      discountAmount,
      netRoomFee,
      paymentOption,
      prepaidBookingValue,
      remainingPayableAtCheckIn,
    };
  }

  /**
   * Tạo đơn đặt phòng mới và thanh toán qua tài khoản giả lập
   * Bọc trong Prisma Interactive Transaction với Pessimistic Locking
   */
  static async createBooking({
    customerName,
    customerPhone,
    customerEmail,
    customerCccd,
    fromDate,
    toDate,
    items,
    promotionCode,
    paymentOption = "FULL_100",
    paymentAccountNumber,
  }) {
    // 1. Kiểm tra tính hợp lệ của thông tin khách hàng
    if (!customerName || typeof customerName !== "string" || customerName.trim().length < 2) {
      throw new AppError(
        ErrorCodes.VALIDATION_FAILED,
        "Họ và tên khách hàng không được để trống (tối thiểu 2 ký tự).",
        400,
      );
    }

    if (!customerPhone || typeof customerPhone !== "string" || !/^[0-9+]{9,15}$/.test(customerPhone.trim())) {
      throw new AppError(
        ErrorCodes.VALIDATION_FAILED,
        "Số điện thoại khách hàng không hợp lệ (từ 9 đến 15 chữ số).",
        400,
      );
    }

    if (!customerEmail || typeof customerEmail !== "string" || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(customerEmail.trim())) {
      throw new AppError(
        ErrorCodes.VALIDATION_FAILED,
        "Địa chỉ email không đúng định dạng.",
        400,
      );
    }

    if (!customerCccd || typeof customerCccd !== "string" || !/^[0-9]{9,12}$/.test(customerCccd.trim())) {
      throw new AppError(
        ErrorCodes.VALIDATION_FAILED,
        "Số CCCD / CMND không hợp lệ (từ 9 đến 12 chữ số).",
        400,
      );
    }

    if (!paymentAccountNumber || typeof paymentAccountNumber !== "string" || !paymentAccountNumber.trim()) {
      throw new AppError(
        ErrorCodes.VALIDATION_FAILED,
        "Vui lòng cung cấp số tài khoản thanh toán giả lập.",
        400,
      );
    }

    if (!VALID_PAYMENT_OPTIONS.includes(paymentOption)) {
      throw new AppError(
        ErrorCodes.VALIDATION_FAILED,
        "Hình thức thanh toán không hợp lệ.",
        400,
      );
    }

    const from = new Date(fromDate);
    const to = new Date(toDate);
    if (isNaN(from.getTime()) || isNaN(to.getTime()) || to <= from) {
      throw new AppError(
        ErrorCodes.INVALID_DATE_RANGE,
        "Khoảng thời gian lưu trú không hợp lệ.",
        400,
      );
    }

    if (!Array.isArray(items) || items.length === 0) {
      throw new AppError(
        ErrorCodes.VALIDATION_FAILED,
        "Đơn đặt phòng phải có ít nhất 1 hạng phòng.",
        400,
      );
    }

    const nights = Math.max(
      1,
      Math.ceil((to.getTime() - from.getTime()) / (1000 * 60 * 60 * 24)),
    );

    const accountNumClean = paymentAccountNumber.trim();

    // 2. Bắt đầu Prisma Interactive Transaction (Pessimistic Locking Flow)
    return await prisma.$transaction(async (tx) => {
      // 2.1. Khóa và kiểm tra tồn kho cho từng hạng phòng trong giỏ hàng
      const validatedItems = [];
      let totalRoomFee = 0;

      for (const item of items) {
        const type = item.roomType?.toUpperCase();
        const size = item.roomSize?.toUpperCase();
        const quantity = parseInt(item.quantity, 10);

        if (!VALID_ROOM_TYPES.includes(type) || !VALID_ROOM_SIZES.includes(size)) {
          throw new AppError(
            ErrorCodes.VALIDATION_FAILED,
            `Loại phòng (${item.roomType}, ${item.roomSize}) không hợp lệ.`,
            400,
          );
        }

        if (isNaN(quantity) || quantity <= 0) {
          throw new AppError(
            ErrorCodes.VALIDATION_FAILED,
            "Số lượng phòng phải lớn hơn 0.",
            400,
          );
        }

        // Khóa các phòng vật lý thuộc hạng này với FOR UPDATE
        await tx.$queryRaw`
          SELECT room_id FROM rooms 
          WHERE type = ${type}::"RoomType" AND size = ${size}::"RoomSize" AND status != 'MAINTENANCE' 
          FOR UPDATE;
        `;

        // Kiểm tra tồn kho khả dụng thời gian thực
        await CatalogService.checkCategoryQuota({
          type,
          size,
          fromDate,
          toDate,
          requestedQuantity: quantity,
          forUpdate: true,
          tx,
        });

        // Lấy đơn giá niêm yết từ DB
        const sample = await tx.room.findFirst({
          where: { type, size, status: { not: "MAINTENANCE" } },
          select: { price: true },
        });

        if (!sample) {
          throw new AppError(
            ErrorCodes.RESOURCE_NOT_FOUND,
            `Không tìm thấy hạng phòng ${type} ${size}.`,
            400,
          );
        }

        const unitPrice = Number(sample.price);
        totalRoomFee += quantity * unitPrice * nights;

        validatedItems.push({
          roomType: type,
          roomSize: size,
          quantity,
          unitPrice,
        });
      }

      // 2.2. Xử lý khuyến mãi nếu có
      let discountAmount = 0;
      let appliedPromotionId = null;

      if (promotionCode && promotionCode.trim()) {
        const promoCodeUpper = promotionCode.trim().toUpperCase();
        const promo = await tx.promotion.findUnique({
          where: { code: promoCodeUpper },
        });

        if (!promo) {
          throw new AppError(
            ErrorCodes.RESOURCE_NOT_FOUND,
            `Mã khuyến mãi '${promotionCode}' không tồn tại.`,
            404,
          );
        }

        const now = new Date();
        if (now < promo.startDate || now > promo.endDate) {
          throw new AppError(
            ErrorCodes.VALIDATION_FAILED,
            `Mã khuyến mãi '${promo.code}' không trong thời hạn sử dụng.`,
            400,
          );
        }

        const promoVal = Number(promo.value);
        if (promo.discountType === "PERCENTAGE") {
          discountAmount = Math.round(totalRoomFee * (promoVal / 100));
        } else if (promo.discountType === "FIXED_AMOUNT") {
          discountAmount = Math.min(totalRoomFee, promoVal);
        }

        appliedPromotionId = promo.id;
      }

      const netRoomFee = Math.max(0, totalRoomFee - discountAmount);

      // 2.3. Tính số tiền thanh toán thực tế
      let prepaidBookingValue = netRoomFee;
      if (paymentOption === "DEPOSIT_50") {
        prepaidBookingValue = Math.round(netRoomFee * 0.5);
      }

      // 2.4. Khóa tài khoản thanh toán giả lập với FOR UPDATE
      const accounts = await tx.$queryRaw`
        SELECT id, balance, card_type, account_number, account_holder 
        FROM payment_accounts 
        WHERE account_number = ${accountNumClean} 
        FOR UPDATE;
      `;

      if (!accounts || accounts.length === 0) {
        throw new AppError(
          ErrorCodes.PAYMENT_FAILED,
          `Số tài khoản '${accountNumClean}' không tồn tại trong hệ thống thanh toán giả lập.`,
          400,
        );
      }

      const account = accounts[0];
      const currentBalance = Number(account.balance);

      if (currentBalance < prepaidBookingValue) {
        throw new AppError(
          ErrorCodes.PAYMENT_FAILED,
          `Thanh toán thất bại: Số dư tài khoản không đủ. Cần thanh toán ${prepaidBookingValue.toLocaleString("vi-VN")} đ nhưng số dư hiện tại chỉ có ${currentBalance.toLocaleString("vi-VN")} đ.`,
          400,
          {
            required: prepaidBookingValue,
            available: currentBalance,
          },
        );
      }

      // 2.5. Trừ tiền tài khoản thanh toán
      await tx.paymentAccount.update({
        where: { accountNumber: accountNumClean },
        data: {
          balance: { decrement: prepaidBookingValue },
        },
      });

      // 2.6. Sinh mã bookingNumber duy nhất: BK-YYYYMMDD-XXXX
      const datePart = from.toISOString().slice(0, 10).replace(/-/g, "");
      const randomSuffix = Math.floor(1000 + Math.random() * 9000);
      const bookingNumber = `BK-${datePart}-${randomSuffix}`;

      // 2.7. Lưu đơn đặt phòng Booking kèm các BookingItem
      const booking = await tx.booking.create({
        data: {
          bookingNumber,
          customerName: customerName.trim(),
          customerPhone: customerPhone.trim(),
          customerEmail: customerEmail.trim().toLowerCase(),
          customerCccd: customerCccd.trim(),
          fromDate: from,
          toDate: to,
          promotionId: appliedPromotionId,
          totalRoomFee,
          discountAmount,
          netRoomFee,
          paymentOption,
          prepaidBookingValue,
          paymentAccountNumber: accountNumClean,
          status: "CONFIRMED",
          items: {
            create: validatedItems.map((it) => ({
              roomType: it.roomType,
              roomSize: it.roomSize,
              quantity: it.quantity,
              unitPrice: it.unitPrice,
            })),
          },
        },
        include: {
          items: true,
          promotion: true,
        },
      });

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
          totalRoomFee: Number(booking.totalRoomFee),
          discountAmount: Number(booking.discountAmount),
          netRoomFee: Number(booking.netRoomFee),
          paymentOption: booking.paymentOption,
          prepaidBookingValue: Number(booking.prepaidBookingValue),
          remainingPayable: Number(booking.netRoomFee) - Number(booking.prepaidBookingValue),
          paymentAccountNumber: booking.paymentAccountNumber,
          status: booking.status,
          createdAt: booking.createdAt,
          promotion: booking.promotion
            ? {
                code: booking.promotion.code,
                name: booking.promotion.name,
                discountType: booking.promotion.discountType,
                value: Number(booking.promotion.value),
              }
            : null,
          items: booking.items.map((it) => ({
            id: it.id,
            roomType: it.roomType,
            roomSize: it.roomSize,
            quantity: it.quantity,
            unitPrice: Number(it.unitPrice),
            subtotal: it.quantity * Number(it.unitPrice) * nights,
          })),
        },
        payment: {
          accountNumber: accountNumClean,
          accountHolder: account.account_holder,
          cardType: account.card_type,
          deductedAmount: prepaidBookingValue,
          remainingAccountBalance: currentBalance - prepaidBookingValue,
        },
      };
    });
  }

  /**
   * Lấy danh sách các tài khoản thanh toán giả lập mẫu để hiển thị trên giao diện simulator
   */
  static async getMockPaymentAccounts() {
    const accounts = await prisma.paymentAccount.findMany({
      select: {
        id: true,
        cardType: true,
        accountNumber: true,
        accountHolder: true,
        balance: true,
      },
      orderBy: { id: "asc" },
    });

    return accounts.map((acc) => ({
      ...acc,
      balance: Number(acc.balance),
    }));
  }

  /**
   * Tra cứu thông tin chi tiết đơn đặt phòng bằng bookingNumber
   */
  static async lookupBooking({ bookingNumber }) {
    if (!bookingNumber || typeof bookingNumber !== "string") {
      throw new AppError(
        ErrorCodes.VALIDATION_FAILED,
        "Vui lòng cung cấp mã đơn đặt phòng (bookingNumber).",
        400,
      );
    }

    const cleanBookingNumber = bookingNumber.trim().toUpperCase();

    const booking = await prisma.booking.findUnique({
      where: { bookingNumber: cleanBookingNumber },
      include: {
        items: true,
        promotion: true,
        assignments: {
          include: {
            room: true,
          },
        },
        serviceUsages: {
          include: {
            service: true,
          },
        },
      },
    });

    if (!booking) {
      throw new AppError(
        ErrorCodes.RESOURCE_NOT_FOUND,
        `Không tìm thấy đơn đặt phòng với mã '${cleanBookingNumber}'.`,
        404,
      );
    }

    const now = new Date();
    const checkInDate = new Date(booking.fromDate);
    const diffHours = (checkInDate.getTime() - now.getTime()) / (1000 * 60 * 60);
    const isCancellable = booking.status === "CONFIRMED" && diffHours >= 24;

    const prepaid = Number(booking.prepaidBookingValue);
    const cancellationFee =
      booking.cancellationFee !== null
        ? Number(booking.cancellationFee)
        : Math.round(prepaid * 0.2);
    const refundAmount =
      booking.refundAmount !== null
        ? Number(booking.refundAmount)
        : prepaid - cancellationFee;

    const nights = Math.max(
      1,
      Math.round(
        (new Date(booking.toDate).getTime() -
          new Date(booking.fromDate).getTime()) /
          (1000 * 60 * 60 * 24),
      ),
    );

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
        totalRoomFee: Number(booking.totalRoomFee),
        discountAmount: Number(booking.discountAmount),
        netRoomFee: Number(booking.netRoomFee),
        paymentOption: booking.paymentOption,
        prepaidBookingValue: prepaid,
        remainingPayable: Number(booking.netRoomFee) - prepaid,
        paymentAccountNumber: booking.paymentAccountNumber,
        status: booking.status,
        createdAt: booking.createdAt,
        cancelledAt: booking.cancelledAt,
        checkedOutAt: booking.checkedOutAt,
        cancellationFee:
          booking.cancellationFee !== null
            ? Number(booking.cancellationFee)
            : null,
        refundAmount:
          booking.refundAmount !== null ? Number(booking.refundAmount) : null,
        promotion: booking.promotion
          ? {
              code: booking.promotion.code,
              name: booking.promotion.name,
              discountType: booking.promotion.discountType,
              value: Number(booking.promotion.value),
            }
          : null,
        items: booking.items.map((it) => ({
          id: it.id,
          roomType: it.roomType,
          roomSize: it.roomSize,
          categoryName: CatalogService.formatCategoryName(
            it.roomType,
            it.roomSize,
          ),
          quantity: it.quantity,
          unitPrice: Number(it.unitPrice),
          subtotal: it.quantity * Number(it.unitPrice) * nights,
        })),
        assignedRooms: booking.assignments.map((as) => ({
          assignmentId: as.id,
          roomId: as.roomId,
          status: as.room?.status,
        })),
      },
      cancellationPolicy: {
        isCancellable,
        hoursUntilCheckIn: Number(diffHours.toFixed(1)),
        cancellationFeeRate: 0.2,
        refundRate: 0.8,
        estimatedCancellationFee: cancellationFee,
        estimatedRefundAmount: refundAmount,
        reason: !isCancellable
          ? booking.status !== "CONFIRMED"
            ? `Đơn đang ở trạng thái ${booking.status}`
            : `Thời gian tới lúc nhận phòng còn dưới 24 giờ (${diffHours.toFixed(1)}h)`
          : null,
      },
    };
  }

  /**
   * Hủy đặt phòng và hoàn tiền theo quy tắc 24h & hoàn 80/20 (Luồng 3.2 Spec 4.3)
   * Sử dụng khóa bi quan SELECT FOR UPDATE chống Race Condition / Double Refund
   */
  static async cancelBooking({ bookingNumber }) {
    if (!bookingNumber || typeof bookingNumber !== "string") {
      throw new AppError(
        ErrorCodes.VALIDATION_FAILED,
        "Vui lòng cung cấp mã đơn đặt phòng (bookingNumber).",
        400,
      );
    }

    const cleanBookingNumber = bookingNumber.trim().toUpperCase();

    return await prisma.$transaction(async (tx) => {
      // 1. Khóa bi quan bản ghi đơn đặt phòng để chống tranh chấp / Double Refund
      const bookings = await tx.$queryRaw`
        SELECT id, booking_number, status, from_date, to_date, prepaid_booking_value, payment_account_number
        FROM bookings
        WHERE booking_number = ${cleanBookingNumber}
        FOR UPDATE;
      `;

      if (!bookings || bookings.length === 0) {
        throw new AppError(
          ErrorCodes.RESOURCE_NOT_FOUND,
          `Không tìm thấy đơn đặt phòng với mã '${cleanBookingNumber}'.`,
          404,
        );
      }

      const lockedBooking = bookings[0];

      // 2. Kiểm tra trạng thái: chỉ cho phép hủy khi đang CONFIRMED
      if (lockedBooking.status !== "CONFIRMED") {
        throw new AppError(
          ErrorCodes.CANCELLATION_INVALID,
          `Đơn đặt phòng đang ở trạng thái '${lockedBooking.status}', không thể thực hiện hủy phòng. Chỉ áp dụng cho đơn CONFIRMED chưa check-in.`,
          400,
        );
      }

      // 3. Kiểm tra luật 24h: fromDate - now >= 24 giờ
      const now = new Date();
      const checkInDate = new Date(lockedBooking.from_date);
      const diffMs = checkInDate.getTime() - now.getTime();
      const diffHours = diffMs / (1000 * 60 * 60);

      if (diffHours < 24) {
        const remainingStr =
          diffHours > 0
            ? `${diffHours.toFixed(1)} giờ`
            : "đã quá giờ nhận phòng";
        throw new AppError(
          ErrorCodes.CANCELLATION_INVALID,
          `Chỉ được phép hủy phòng trước giờ nhận phòng tối thiểu 24 giờ. Thời gian còn lại: ${remainingStr}.`,
          400,
        );
      }

      // 4. Tính toán tài chính hoàn tiền 80/20 theo Spec 4.3
      const prepaid = Number(lockedBooking.prepaid_booking_value);
      const cancellationFee = Math.round(prepaid * 0.2); // Khách sạn giữ lại 20%
      const refundAmount = prepaid - cancellationFee; // Hoàn trả lại 80%

      // 5. Khóa và hoàn tiền vào tài khoản thanh toán gốc
      const accountNum = lockedBooking.payment_account_number;
      const accounts = await tx.$queryRaw`
        SELECT id, account_number, account_holder, card_type, balance
        FROM payment_accounts
        WHERE account_number = ${accountNum}
        FOR UPDATE;
      `;

      if (!accounts || accounts.length === 0) {
        throw new AppError(
          ErrorCodes.PAYMENT_FAILED,
          `Không tìm thấy tài khoản thanh toán gốc '${accountNum}' để hoàn tiền.`,
          400,
        );
      }

      const paymentAcc = accounts[0];
      const previousBalance = Number(paymentAcc.balance);
      const newBalance = previousBalance + refundAmount;

      await tx.$executeRaw`
        UPDATE payment_accounts
        SET balance = balance + ${refundAmount}
        WHERE account_number = ${accountNum};
      `;

      // 6. Cập nhật trạng thái Booking sang CANCELLED
      const updated = await tx.booking.update({
        where: { id: lockedBooking.id },
        data: {
          status: "CANCELLED",
          cancellationFee,
          refundAmount,
          cancelledAt: now,
        },
        include: {
          items: true,
          promotion: true,
        },
      });

      return {
        booking: {
          id: updated.id,
          bookingNumber: updated.bookingNumber,
          customerName: updated.customerName,
          status: updated.status,
          fromDate: updated.fromDate,
          toDate: updated.toDate,
          prepaidBookingValue: Number(updated.prepaidBookingValue),
          cancellationFee: Number(updated.cancellationFee),
          refundAmount: Number(updated.refundAmount),
          cancelledAt: updated.cancelledAt,
          paymentAccountNumber: updated.paymentAccountNumber,
        },
        refund: {
          accountNumber: accountNum,
          accountHolder: paymentAcc.account_holder,
          cardType: paymentAcc.card_type,
          previousBalance,
          refundAmount,
          cancellationFee,
          newBalance,
        },
      };
    });
  }
}
