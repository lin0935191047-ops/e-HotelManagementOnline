import { prisma } from "../common/prisma.js";
import { AppError, ErrorCodes } from "../common/errors.js";
import { WalletService } from "./wallet.service.js";
import { DebtService } from "./debt.service.js";

export const CURRENT_TERMS_VERSION = "v1.0";
export const TERMS_CONTENT = `ĐIỀU KHOẢN VÀ ĐIỀU KIỆN SỬ DỤNG DỊCH VỤ AUTO-DEBIT (VÍ NỘI BỘ e-HOTEL)
Phiên bản: v1.0 - Ngày hiệu lực: 18/11/2026

1. GIỚI THIỆU VÀ PHẠM VI
Dịch vụ Auto-Debit cho phép hệ thống e-Hotel tự động khấu trừ số dư từ Ví nội bộ (Internal Wallet) của Quý khách để thanh toán các khoản chi phí phát sinh hợp lệ.

2. CÁC TRƯỜNG HỢP TỰ ĐỘNG KHẤU TRỪ
Hệ thống chỉ tự động khấu trừ trong 2 trường hợp cụ thể:
- BR-01 (Công nợ đến hạn): Tự động thanh toán các khoản nợ tiền phòng hoặc dịch vụ khi đến hạn thanh toán.
- BR-02 (Dịch vụ đã hoàn thành): Tự động thanh toán toàn bộ chi phí dịch vụ ngay khi dịch vụ được nhân viên cập nhật trạng thái "Completed".

3. QUY TẮC KHẤU TRỪ KHI THIẾU SỐ DƯ
- Nếu số dư trong Ví nội bộ nhỏ hơn tổng số tiền cần thanh toán, giao dịch sẽ THẤT BẠI toàn phần. Hệ thống TUYỆT ĐỐI KHÔNG trừ tiền một phần.
- Khoản phí chưa thanh toán sẽ được ghi nhận vào danh mục Công nợ (Debt) của Quý khách.

4. QUYỀN HẠN CỦA QUẢN TRỊ VIÊN (ADMIN)
- Quản trị viên chỉ có quyền Kích hoạt (ACTIVE) dịch vụ sau khi Quý khách đã đọc và bấm Xác nhận đồng ý Điều khoản này.
- Quản trị viên và Quý khách có quyền Tạm ngừng (PAUSED) hoặc Vô hiệu hóa (DISABLED) dịch vụ Auto-Debit bất kỳ lúc nào.`;

export class AutoDebitService {
  /**
   * Lấy nội dung Điều khoản Auto-Debit hiện hành
   */
  static getTerms() {
    return {
      termsVersion: CURRENT_TERMS_VERSION,
      termsContent: TERMS_CONTENT,
      effectiveDate: "2026-11-18",
    };
  }

  /**
   * Khách hàng: Xác nhận đồng thuận điều khoản Auto-Debit (Customer Consent)
   * Chuyển trạng thái Auto-Debit sang PENDING_ADMIN chờ Admin kích hoạt
   */
  static async submitConsent({
    userId,
    agreed,
    termsVersion = CURRENT_TERMS_VERSION,
    ipAddress = null,
    userAgent = null,
  }) {
    if (!userId) {
      throw new AppError(
        ErrorCodes.VALIDATION_FAILED,
        "Vui lòng cung cấp mã người dùng (userId).",
        400,
      );
    }

    if (!agreed) {
      throw new AppError(
        ErrorCodes.VALIDATION_FAILED,
        "Quý khách phải đọc và tích chọn đồng ý điều khoản Auto-Debit để tiếp tục.",
        400,
      );
    }

    const cleanUserId = parseInt(userId, 10);

    // Đảm bảo khách hàng đã có ví nội bộ
    const wallet = await WalletService.getOrCreateWallet(cleanUserId);

    if (wallet.status === "LOCKED") {
      throw new AppError(
        ErrorCodes.WALLET_LOCKED,
        "Ví nội bộ của bạn hiện đang bị KHÓA, không thể đăng ký Auto-Debit.",
        400,
      );
    }

    return await prisma.$transaction(async (tx) => {
      // 1. Vô hiệu hóa các bản ghi consent cũ nếu có
      await tx.autoDebitConsent.updateMany({
        where: { userId: cleanUserId, isActive: true },
        data: { isActive: false },
      });

      // 2. Tạo bản ghi Consent mới với bằng chứng thời gian, IP và User-Agent
      const consent = await tx.autoDebitConsent.create({
        data: {
          userId: cleanUserId,
          termsVersion: String(termsVersion || CURRENT_TERMS_VERSION).trim(),
          termsContent: TERMS_CONTENT,
          ipAddress: ipAddress ? String(ipAddress).trim() : null,
          userAgent: userAgent ? String(userAgent).trim() : null,
          agreedAt: new Date(),
          isActive: true,
        },
      });

      // 3. Cập nhật AutoDebitSetting sang trạng thái PENDING_ADMIN
      const updatedSetting = await tx.autoDebitSetting.upsert({
        where: { userId: cleanUserId },
        update: {
          status: "PENDING_ADMIN",
          updatedAt: new Date(),
        },
        create: {
          userId: cleanUserId,
          status: "PENDING_ADMIN",
        },
      });

      return {
        userId: cleanUserId,
        status: updatedSetting.status,
        consent: {
          id: consent.id,
          termsVersion: consent.termsVersion,
          agreedAt: consent.agreedAt,
          isActive: consent.isActive,
        },
        message: "Xác nhận đồng thuận điều khoản thành công. Đang chờ Admin phê duyệt kích hoạt.",
      };
    });
  }

  /**
   * Khách hàng: Lấy trạng thái Auto-Debit hiện tại của chính mình
   */
  static async getCustomerStatus(userId) {
    if (!userId) {
      throw new AppError(
        ErrorCodes.VALIDATION_FAILED,
        "Vui lòng cung cấp mã người dùng (userId).",
        400,
      );
    }

    const cleanUserId = parseInt(userId, 10);
    const wallet = await WalletService.getOrCreateWallet(cleanUserId);

    const setting = await prisma.autoDebitSetting.findUnique({
      where: { userId: cleanUserId },
    });

    const latestConsent = await prisma.autoDebitConsent.findFirst({
      where: { userId: cleanUserId, isActive: true },
      orderBy: { agreedAt: "desc" },
    });

    return {
      userId: cleanUserId,
      walletNumber: wallet.walletNumber,
      balance: wallet.balance,
      walletStatus: wallet.status,
      autoDebitStatus: setting ? setting.status : "NOT_ENABLED",
      activatedAt: setting?.activatedAt || null,
      pausedAt: setting?.pausedAt || null,
      disabledAt: setting?.disabledAt || null,
      updatedBy: setting?.updatedBy || null,
      latestConsent: latestConsent
        ? {
            id: latestConsent.id,
            termsVersion: latestConsent.termsVersion,
            agreedAt: latestConsent.agreedAt,
            isActive: latestConsent.isActive,
          }
        : null,
      // Compatibility aliases for frontend components
      setting: {
        status: setting ? setting.status : "NOT_ENABLED",
        isActive: setting?.status === "ACTIVE",
        activatedAt: setting?.activatedAt || null,
        pausedAt: setting?.pausedAt || null,
        disabledAt: setting?.disabledAt || null,
      },
      consent: latestConsent
        ? {
            id: latestConsent.id,
            status: latestConsent.isActive ? "CONSENTED" : "REVOKED",
            isActive: latestConsent.isActive,
            agreedTermsVersion: latestConsent.termsVersion,
            termsVersion: latestConsent.termsVersion,
            consentedAt: latestConsent.agreedAt,
            agreedAt: latestConsent.agreedAt,
          }
        : null,
    };
  }

  /**
   * Admin: Danh sách cấu hình Auto-Debit của tất cả khách hàng
   */
  static async listAutoDebitSettings({
    page = 1,
    limit = 20,
    status = null,
    keyword = "",
  }) {
    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.max(1, Math.min(100, parseInt(limit, 10) || 20));
    const skip = (pageNum - 1) * limitNum;

    const where = {};

    if (status && ["NOT_ENABLED", "PENDING_ADMIN", "ACTIVE", "PAUSED", "DISABLED"].includes(status.toUpperCase())) {
      where.status = status.toUpperCase();
    }

    if (keyword && typeof keyword === "string" && keyword.trim()) {
      const kw = keyword.trim();
      where.user = {
        OR: [
          { username: { contains: kw, mode: "insensitive" } },
          { fullName: { contains: kw, mode: "insensitive" } },
          { wallet: { walletNumber: { contains: kw, mode: "insensitive" } } },
        ],
      };
    }

    const [total, settings] = await Promise.all([
      prisma.autoDebitSetting.count({ where }),
      prisma.autoDebitSetting.findMany({
        where,
        skip,
        take: limitNum,
        orderBy: { updatedAt: "desc" },
        include: {
          user: {
            select: {
              id: true,
              username: true,
              fullName: true,
              role: true,
              isActive: true,
              wallet: true,
              autoDebitConsents: {
                where: { isActive: true },
                take: 1,
                orderBy: { agreedAt: "desc" },
              },
            },
          },
        },
      }),
    ]);

    return {
      requests: settings.map((s) => {
        const activeConsent = s.user.autoDebitConsents[0] || null;
        return {
          settingId: s.id,
          userId: s.userId,
          username: s.user.username,
          fullName: s.user.fullName,
          walletNumber: s.user.wallet?.walletNumber || null,
          walletBalance: Number(s.user.wallet?.balance || 0),
          walletStatus: s.user.wallet?.status || "NOT_CREATED",
          status: s.status,
          hasActiveConsent: !!activeConsent,
          consentDate: activeConsent?.agreedAt || null,
          termsVersion: activeConsent?.termsVersion || null,
          activatedAt: s.activatedAt,
          pausedAt: s.pausedAt,
          disabledAt: s.disabledAt,
          updatedBy: s.updatedBy,
          updatedAt: s.updatedAt,
        };
      }),
      pagination: {
        total,
        page: pageNum,
        limit: limitNum,
        totalPages: Math.ceil(total / limitNum) || 1,
      },
    };
  }

  /**
   * Admin: Kích hoạt (ACTIVE), Tạm ngừng (PAUSED) hoặc Vô hiệu hóa (DISABLED) Auto-Debit
   * Tuân thủ nghiêm ngặt quy tắc SRS 5.1: Không được kích hoạt khi chưa có đồng ý hợp lệ.
   */
  static async adminUpdateStatus({ userId, status, adminUsername }) {
    if (!userId) {
      throw new AppError(
        ErrorCodes.VALIDATION_FAILED,
        "Vui lòng chỉ định mã khách hàng (userId).",
        400,
      );
    }

    const cleanStatus = status?.toUpperCase();
    if (!["ACTIVE", "PAUSED", "DISABLED"].includes(cleanStatus)) {
      throw new AppError(
        ErrorCodes.AUTO_DEBIT_INVALID_STATUS,
        "Trạng thái cập nhật không hợp lệ. Chỉ chấp nhận ACTIVE, PAUSED hoặc DISABLED.",
        400,
      );
    }

    const cleanUserId = parseInt(userId, 10);
    const user = await prisma.user.findUnique({
      where: { id: cleanUserId },
      include: {
        autoDebitSetting: true,
        autoDebitConsents: {
          where: { isActive: true },
          take: 1,
          orderBy: { agreedAt: "desc" },
        },
      },
    });

    if (!user) {
      throw new AppError(
        ErrorCodes.RESOURCE_NOT_FOUND,
        `Khách hàng với ID ${cleanUserId} không tồn tại.`,
        404,
      );
    }

    const activeConsent = user.autoDebitConsents[0] || null;

    // QUY TẮC BẮT BUỘC SRS 5.1: Admin không được kích hoạt khi chưa có sự đồng ý hợp lệ của khách hàng
    if (cleanStatus === "ACTIVE") {
      if (!activeConsent) {
        throw new AppError(
          ErrorCodes.AUTO_DEBIT_NOT_CONSENTED,
          "Khách hàng chưa xác nhận đồng ý điều khoản Auto-Debit hoặc điều khoản đã hết hiệu lực. Admin không được phép kích hoạt.",
          400,
        );
      }
    }

    const now = new Date();
    const updateData = {
      status: cleanStatus,
      updatedBy: adminUsername,
      updatedAt: now,
    };

    if (cleanStatus === "ACTIVE") {
      updateData.activatedAt = now;
      updateData.pausedAt = null;
      updateData.disabledAt = null;
    } else if (cleanStatus === "PAUSED") {
      updateData.pausedAt = now;
    } else if (cleanStatus === "DISABLED") {
      updateData.disabledAt = now;
    }

    return await prisma.$transaction(async (tx) => {
      // Nếu Admin chọn DISABLED, hủy kích hoạt bản ghi Consent hiện tại
      if (cleanStatus === "DISABLED") {
        await tx.autoDebitConsent.updateMany({
          where: { userId: cleanUserId, isActive: true },
          data: { isActive: false },
        });
      }

      const updated = await tx.autoDebitSetting.upsert({
        where: { userId: cleanUserId },
        update: updateData,
        create: {
          userId: cleanUserId,
          ...updateData,
        },
      });

      return {
        userId: cleanUserId,
        username: user.username,
        status: updated.status,
        activatedAt: updated.activatedAt,
        pausedAt: updated.pausedAt,
        disabledAt: updated.disabledAt,
        updatedBy: updated.updatedBy,
        updatedAt: updated.updatedAt,
      };
    });
  }

  /**
   * FEAT-13.5: Auto-Debit BR-02 — Tự động khấu trừ chi phí dịch vụ khi trạng thái COMPLETED
   * 
   * Quy tắc nghiệp vụ BR-02:
   * 1. Khi dịch vụ chuyển sang trạng thái COMPLETED:
   * 2. Nếu đơn phòng có liên kết tài khoản thành viên (customerId):
   *    a. Nếu Auto-Debit KHÔNG ACTIVE hoặc ví bị LOCKED:
   *       Tự động ghi nhận khoản phí vào bảng Debt (loại SERVICE_FEE, status UNPAID).
   *    b. Nếu Auto-Debit ACTIVE và ví ACTIVE:
   *       - Dùng Pessimistic Locking (SELECT ... FOR UPDATE) trên bảng wallets.
   *       - QUY TẮC CỐT LÕI SRS: TUYỆT ĐỐI KHÔNG TRỪ TIỀN MỘT PHẦN:
   *         * Nếu số dư ví < tổng tiền dịch vụ:
   *           VÍ GIỮ NGUYÊN 100% SỐ DƯ (không trừ 1 xu).
   *           Tự động ghi nhận khoản phí vào bảng Debt (loại SERVICE_FEE, status UNPAID).
   *         * Nếu số dư ví >= tổng tiền dịch vụ:
   *           Khấu trừ đúng số tiền totalPrice từ ví.
   *           Sinh WalletTransaction loại AUTO_DEBIT_SERVICE.
   *           Cập nhật ServiceUsage.isPaid = true.
   *           Nếu trước đó có Debt gắn với ticketId này thì chuyển sang PAID.
   */
  static async triggerBR02ForService(ticketId) {
    if (!ticketId || typeof ticketId !== "string" || ticketId.trim() === "") {
      throw new AppError(
        ErrorCodes.VALIDATION_FAILED,
        "Vui lòng chỉ định mã phiếu dịch vụ (ticketId).",
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
            customer: {
              include: {
                wallet: true,
                autoDebitSetting: true,
              },
            },
          },
        },
      },
    });

    if (!ticket) {
      throw new AppError(
        ErrorCodes.RESOURCE_NOT_FOUND,
        `Không tìm thấy phiếu dịch vụ với mã ${cleanTicketId}.`,
        404,
      );
    }

    if (ticket.isPaid) {
      return {
        ticketId: ticket.ticketId,
        autoDebited: false,
        isPaid: true,
        message: "Phiếu dịch vụ này đã được thanh toán trước đó.",
      };
    }

    if (ticket.status !== "COMPLETED") {
      return {
        ticketId: ticket.ticketId,
        autoDebited: false,
        isPaid: false,
        status: ticket.status,
        message: "Phiếu dịch vụ chưa ở trạng thái COMPLETED, không kích hoạt Auto-Debit BR-02.",
      };
    }

    const customer = ticket.booking?.customer;

    // Trường hợp 1: Booking không gắn tài khoản thành viên (khách vãng lai)
    if (!customer) {
      return {
        ticketId: ticket.ticketId,
        autoDebited: false,
        isPaid: false,
        hasCustomerAccount: false,
        message: "Khách hàng không có tài khoản thành viên e-Hotel. Phí dịch vụ sẽ quyết toán tại quầy khi Check-out.",
      };
    }

    const autoDebitSetting = customer.autoDebitSetting;
    const wallet = customer.wallet || (await WalletService.getOrCreateWallet(customer.id));
    const totalPrice = Number(ticket.totalPrice);

    // Trường hợp 2: Khách hàng chưa kích hoạt Auto-Debit (NOT ACTIVE) hoặc ví bị khóa (LOCKED)
    const isAutoDebitActive = autoDebitSetting && autoDebitSetting.status === "ACTIVE";
    const isWalletLocked = wallet.status === "LOCKED";

    if (!isAutoDebitActive || isWalletLocked) {
      // Ghi nhận công nợ (Debt)
      let existingDebt = await prisma.debt.findFirst({
        where: { ticketId: ticket.ticketId },
      });

      if (!existingDebt) {
        existingDebt = await DebtService.createDebt({
          userId: customer.id,
          type: "SERVICE_FEE",
          amount: totalPrice,
          dueDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
          bookingId: ticket.bookingId,
          ticketId: ticket.ticketId,
          note: `Công nợ dịch vụ tự động tạo do ${!isAutoDebitActive ? "Auto-Debit chưa ACTIVE" : "Ví bị khóa"}`,
        });
      }

      return {
        ticketId: ticket.ticketId,
        autoDebited: false,
        isPaid: false,
        debtCreated: true,
        debtCode: existingDebt.debtCode,
        reason: !isAutoDebitActive ? "AUTO_DEBIT_NOT_ACTIVE" : "WALLET_LOCKED",
        message: "Auto-Debit không khả dụng. Khoản phí dịch vụ đã được tự động ghi nhận vào Công nợ (Debt).",
      };
    }

    // Trường hợp 3: Đủ điều kiện Auto-Debit -> Thực hiện khấu trừ nguyên tử với Pessimistic Locking
    return await prisma.$transaction(async (tx) => {
      const lockedWallets = await tx.$queryRaw`
        SELECT id, wallet_number, balance, status 
        FROM wallets 
        WHERE id = ${wallet.id} 
        FOR UPDATE
      `;

      if (!lockedWallets || lockedWallets.length === 0) {
        throw new AppError(
          ErrorCodes.WALLET_NOT_FOUND,
          "Không tìm thấy ví nội bộ khi khóa giao dịch.",
          404,
        );
      }

      const currentWallet = lockedWallets[0];

      if (currentWallet.status === "LOCKED") {
        let existingDebt = await tx.debt.findFirst({
          where: { ticketId: ticket.ticketId },
        });
        if (!existingDebt) {
          const debtCode = DebtService.generateDebtCode();
          existingDebt = await tx.debt.create({
            data: {
              debtCode,
              userId: customer.id,
              walletId: wallet.id,
              bookingId: ticket.bookingId,
              ticketId: ticket.ticketId,
              type: "SERVICE_FEE",
              amount: totalPrice,
              paidAmount: 0,
              status: "UNPAID",
              dueDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
              note: "Công nợ dịch vụ tự động tạo do ví bị khóa tại thời điểm thanh toán",
            },
          });
        }
        return {
          ticketId: ticket.ticketId,
          autoDebited: false,
          isPaid: false,
          debtCreated: true,
          debtCode: existingDebt.debtCode,
          reason: "WALLET_LOCKED",
          message: "Ví bị khóa tại thời điểm thanh toán. Đã chuyển thành công nợ.",
        };
      }

      const currentBalance = Number(currentWallet.balance);

      // QUY TẮC CỐT LÕI SRS: TUYỆT ĐỐI KHÔNG TRỪ TIỀN MỘT PHẦN
      if (currentBalance < totalPrice) {
        // VÍ KHÔNG BỊ TRỪ DÙ CHỈ 1 ĐỒNG!
        let existingDebt = await tx.debt.findFirst({
          where: { ticketId: ticket.ticketId },
        });

        if (!existingDebt) {
          const debtCode = DebtService.generateDebtCode();
          existingDebt = await tx.debt.create({
            data: {
              debtCode,
              userId: customer.id,
              walletId: wallet.id,
              bookingId: ticket.bookingId,
              ticketId: ticket.ticketId,
              type: "SERVICE_FEE",
              amount: totalPrice,
              paidAmount: 0,
              status: "UNPAID",
              dueDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
              note: `Công nợ dịch vụ tự động tạo do số dư ví (${currentBalance.toLocaleString()} VND) không đủ thanh toán Auto-Debit BR-02 (${totalPrice.toLocaleString()} VND)`,
            },
          });
        }

        return {
          ticketId: ticket.ticketId,
          autoDebited: false,
          isPaid: false,
          debtCreated: true,
          debtCode: existingDebt.debtCode,
          reason: "INSUFFICIENT_WALLET_BALANCE",
          walletBalance: currentBalance,
          amountRequired: totalPrice,
          shortage: totalPrice - currentBalance,
          message: `Số dư ví (${currentBalance.toLocaleString()} VND) không đủ để thanh toán toàn bộ chi phí dịch vụ (${totalPrice.toLocaleString()} VND). Quy tắc Auto-Debit tuyệt đối không trừ một phần. Khoản phí đã được ghi nhận vào Công nợ (Debt).`,
        };
      }

      // ĐỦ SỐ DƯ: Khấu trừ 100%
      const balanceAfter = currentBalance - totalPrice;

      await tx.wallet.update({
        where: { id: wallet.id },
        data: {
          balance: balanceAfter,
          updatedAt: new Date(),
        },
      });

      const transactionNo = WalletService.generateTransactionNo();

      const txRecord = await tx.walletTransaction.create({
        data: {
          transactionNo,
          walletId: wallet.id,
          type: "AUTO_DEBIT_SERVICE",
          amount: totalPrice,
          balanceBefore: currentBalance,
          balanceAfter,
          status: "SUCCESS",
          description: `Tự động thanh toán chi phí dịch vụ ${ticket.service.serviceName} (${ticket.ticketId}) theo quy tắc BR-02`,
          metadata: {
            rule: "BR-02",
            ticketId: ticket.ticketId,
            serviceId: ticket.serviceId,
            serviceName: ticket.service.serviceName,
            bookingId: ticket.bookingId,
            quantity: ticket.quantity,
            unitPrice: Number(ticket.unitPrice),
            totalPrice,
            paidAt: new Date().toISOString(),
          },
        },
      });

      // Cập nhật ServiceUsage: isPaid = true
      await tx.serviceUsage.update({
        where: { ticketId: ticket.ticketId },
        data: {
          isPaid: true,
          status: "COMPLETED",
        },
      });

      // Nếu trước đó có nợ gắn với ticketId, cập nhật sang PAID
      await tx.debt.updateMany({
        where: { ticketId: ticket.ticketId, status: { in: ["UNPAID", "OVERDUE"] } },
        data: {
          status: "PAID",
          paidAmount: totalPrice,
          paidAt: new Date(),
        },
      });

      return {
        ticketId: ticket.ticketId,
        autoDebited: true,
        isPaid: true,
        amountDeducted: totalPrice,
        balanceBefore: currentBalance,
        balanceAfter,
        transactionNo: txRecord.transactionNo,
        serviceName: ticket.service.serviceName,
        message: `Thanh toán tự động BR-02 thành công ${totalPrice.toLocaleString()} VND cho dịch vụ ${ticket.service.serviceName}.`,
      };
    });
  }

  /**
   * Xem trạng thái Auto-Debit của phiếu dịch vụ
   */
  static async getServiceAutoDebitStatus(ticketId) {
    if (!ticketId) {
      throw new AppError(
        ErrorCodes.VALIDATION_FAILED,
        "Vui lòng chỉ định mã phiếu dịch vụ.",
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
            customer: {
              include: {
                wallet: true,
                autoDebitSetting: true,
              },
            },
          },
        },
        debts: true,
      },
    });

    if (!ticket) {
      throw new AppError(
        ErrorCodes.RESOURCE_NOT_FOUND,
        `Không tìm thấy phiếu dịch vụ ${cleanTicketId}.`,
        404,
      );
    }

    const tx = await prisma.walletTransaction.findFirst({
      where: {
        type: "AUTO_DEBIT_SERVICE",
        description: { contains: cleanTicketId },
      },
    });

    return {
      ticketId: ticket.ticketId,
      serviceId: ticket.serviceId,
      serviceName: ticket.service.serviceName,
      status: ticket.status,
      isPaid: ticket.isPaid,
      totalPrice: Number(ticket.totalPrice),
      bookingId: ticket.bookingId,
      hasCustomerAccount: !!ticket.booking.customerId,
      customer: ticket.booking.customer
        ? {
            id: ticket.booking.customer.id,
            username: ticket.booking.customer.username,
            autoDebitStatus: ticket.booking.customer.autoDebitSetting?.status || "NOT_ENABLED",
            walletBalance: Number(ticket.booking.customer.wallet?.balance || 0),
          }
        : null,
      debt: ticket.debts[0]
        ? {
            debtCode: ticket.debts[0].debtCode,
            amount: Number(ticket.debts[0].amount),
            status: ticket.debts[0].status,
          }
        : null,
      transaction: tx
        ? {
            transactionNo: tx.transactionNo,
            amount: Number(tx.amount),
            status: tx.status,
            createdAt: tx.createdAt,
          }
        : null,
    };
  }
}
