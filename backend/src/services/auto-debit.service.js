import { prisma } from "../common/prisma.js";
import { AppError, ErrorCodes } from "../common/errors.js";
import { WalletService } from "./wallet.service.js";

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
}
