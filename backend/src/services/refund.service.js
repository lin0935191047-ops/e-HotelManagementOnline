import { prisma } from "../common/prisma.js";
import { AppError, ErrorCodes } from "../common/errors.js";
import { WalletService } from "./wallet.service.js";

export class RefundService {
  /**
   * Sinh mã hoàn tiền theo định dạng RFD-YYYYMMDD-XXXX
   */
  static generateRefundCode() {
    const now = new Date();
    const yyyy = now.getFullYear();
    const mm = String(now.getMonth() + 1).padStart(2, "0");
    const dd = String(now.getDate()).padStart(2, "0");
    const randomSuffix = Math.random().toString(36).substring(2, 6).toUpperCase();
    return `RFD-${yyyy}${mm}${dd}-${randomSuffix}`;
  }

  /**
   * Tra cứu số tiền tối đa còn lại có thể hoàn cho một giao dịch gốc
   */
  static async getRefundableAmount(originalTxId) {
    if (!originalTxId) {
      throw new AppError(
        ErrorCodes.VALIDATION_FAILED,
        "Vui lòng chỉ định mã giao dịch gốc (originalTxId).",
        400,
      );
    }

    const cleanTxId = parseInt(originalTxId, 10);
    if (isNaN(cleanTxId)) {
      throw new AppError(
        ErrorCodes.VALIDATION_FAILED,
        "Mã giao dịch gốc không hợp lệ.",
        400,
      );
    }

    const tx = await prisma.walletTransaction.findUnique({
      where: { id: cleanTxId },
      include: {
        refunds: {
          where: { status: "COMPLETED" },
        },
        wallet: {
          include: { user: true },
        },
      },
    });

    if (!tx) {
      throw new AppError(
        ErrorCodes.RESOURCE_NOT_FOUND,
        `Không tìm thấy giao dịch gốc với ID ${cleanTxId}.`,
        404,
      );
    }

    const refundableTypes = ["AUTO_DEBIT_SERVICE", "AUTO_DEBIT_DEBT", "MANUAL_PAYMENT"];
    if (!refundableTypes.includes(tx.type)) {
      throw new AppError(
        ErrorCodes.REFUND_INVALID,
        `Giao dịch loại ${tx.type} không thuộc danh mục được phép hoàn tiền (Chỉ chấp nhận AUTO_DEBIT_SERVICE, AUTO_DEBIT_DEBT hoặc MANUAL_PAYMENT).`,
        400,
      );
    }

    if (tx.status !== "SUCCESS") {
      throw new AppError(
        ErrorCodes.REFUND_INVALID,
        "Không thể hoàn tiền cho giao dịch chưa thành công hoặc đã thất bại.",
        400,
      );
    }

    const originalAmount = Number(tx.amount);
    const totalRefunded = tx.refunds.reduce((sum, r) => sum + Number(r.amount), 0);
    const remainingRefundable = Math.max(0, originalAmount - totalRefunded);

    return {
      originalTxId: tx.id,
      transactionNo: tx.transactionNo,
      type: tx.type,
      walletId: tx.walletId,
      walletNumber: tx.wallet.walletNumber,
      customerName: tx.wallet.user?.fullName,
      originalAmount,
      totalRefunded,
      remainingRefundable,
      canRefund: remainingRefundable > 0,
      refundCount: tx.refunds.length,
    };
  }

  /**
   * FEAT-13.6: Quản lý Hoàn tiền vào Ví nội bộ (Pessimistic Locking & Kiểm soát số tiền hoàn)
   */
  static async processRefund({
    originalTxId,
    amount,
    reason,
    adminUsername = "admin",
  }) {
    if (!originalTxId) {
      throw new AppError(
        ErrorCodes.VALIDATION_FAILED,
        "Vui lòng chỉ định mã giao dịch gốc cần hoàn tiền (originalTxId).",
        400,
      );
    }

    const cleanAmount = Number(amount);
    if (isNaN(cleanAmount) || cleanAmount <= 0) {
      throw new AppError(
        ErrorCodes.VALIDATION_FAILED,
        "Số tiền hoàn phải là số dương lớn hơn 0.",
        400,
      );
    }

    if (!reason || typeof reason !== "string" || reason.trim().length < 3) {
      throw new AppError(
        ErrorCodes.VALIDATION_FAILED,
        "Vui lòng nhập lý do hoàn tiền hợp lệ (ít nhất 3 ký tự).",
        400,
      );
    }

    const refundableInfo = await this.getRefundableAmount(originalTxId);

    if (!refundableInfo.canRefund) {
      throw new AppError(
        ErrorCodes.REFUND_INVALID,
        `Giao dịch ${refundableInfo.transactionNo} đã được hoàn tiền đầy đủ 100% (${refundableInfo.totalRefunded.toLocaleString()} VND), không thể hoàn thêm.`,
        400,
      );
    }

    if (cleanAmount > refundableInfo.remainingRefundable) {
      throw new AppError(
        ErrorCodes.REFUND_INVALID,
        `Số tiền yêu cầu hoàn (${cleanAmount.toLocaleString()} VND) vượt quá số tiền tối đa còn lại có thể hoàn (${refundableInfo.remainingRefundable.toLocaleString()} VND) của giao dịch gốc.`,
        400,
        {
          requestedAmount: cleanAmount,
          remainingRefundable: refundableInfo.remainingRefundable,
          originalAmount: refundableInfo.originalAmount,
          totalRefundedSoFar: refundableInfo.totalRefunded,
        },
      );
    }

    // Thực hiện hoàn tiền nguyên tử vào ví với Pessimistic Locking
    return await prisma.$transaction(async (tx) => {
      // 1. Khóa bi quan ví nội bộ
      const lockedWallets = await tx.$queryRaw`
        SELECT id, wallet_number, balance, status 
        FROM wallets 
        WHERE id = ${refundableInfo.walletId} 
        FOR UPDATE
      `;

      if (!lockedWallets || lockedWallets.length === 0) {
        throw new AppError(
          ErrorCodes.WALLET_NOT_FOUND,
          "Không tìm thấy ví nội bộ khi khóa giao dịch hoàn tiền.",
          404,
        );
      }

      const currentWallet = lockedWallets[0];

      if (currentWallet.status === "LOCKED") {
        throw new AppError(
          ErrorCodes.WALLET_LOCKED,
          "Ví nội bộ của khách hàng đang bị KHÓA, không thể cộng tiền hoàn vào ví.",
          400,
        );
      }

      const currentBalance = Number(currentWallet.balance);
      const balanceAfter = currentBalance + cleanAmount;

      // 2. Cập nhật số dư ví
      await tx.wallet.update({
        where: { id: currentWallet.id },
        data: {
          balance: balanceAfter,
          updatedAt: new Date(),
        },
      });

      // 3. Sinh mã hoàn tiền & giao dịch
      const refundCode = this.generateRefundCode();
      const transactionNo = WalletService.generateTransactionNo();

      // 4. Tạo bản ghi WalletTransaction loại REFUND
      const refundTx = await tx.walletTransaction.create({
        data: {
          transactionNo,
          walletId: currentWallet.id,
          type: "REFUND",
          amount: cleanAmount,
          balanceBefore: currentBalance,
          balanceAfter,
          status: "SUCCESS",
          originalTxId: refundableInfo.originalTxId,
          description: `Hoàn tiền ${cleanAmount.toLocaleString()} VND cho giao dịch ${refundableInfo.transactionNo}. Lý do: ${reason.trim()}`,
          metadata: {
            refundCode,
            originalTxId: refundableInfo.originalTxId,
            originalTxNo: refundableInfo.transactionNo,
            originalTxType: refundableInfo.type,
            reason: reason.trim(),
            approvedBy: adminUsername,
            processedAt: new Date().toISOString(),
          },
        },
      });

      // 5. Tạo bản ghi Refund
      const refundRecord = await tx.refund.create({
        data: {
          refundCode,
          walletId: currentWallet.id,
          originalTxId: refundableInfo.originalTxId,
          amount: cleanAmount,
          reason: reason.trim(),
          status: "COMPLETED",
          approvedBy: adminUsername,
          processedAt: new Date(),
        },
      });

      return {
        refundId: refundRecord.id,
        refundCode: refundRecord.refundCode,
        amount: Number(refundRecord.amount),
        reason: refundRecord.reason,
        status: refundRecord.status,
        approvedBy: refundRecord.approvedBy,
        processedAt: refundRecord.processedAt,
        wallet: {
          walletNumber: currentWallet.wallet_number,
          balanceBefore: currentBalance,
          balanceAfter,
          amountCredited: cleanAmount,
        },
        transaction: {
          transactionNo: refundTx.transactionNo,
          type: refundTx.type,
          status: refundTx.status,
          createdAt: refundTx.createdAt,
        },
        originalTransaction: {
          id: refundableInfo.originalTxId,
          transactionNo: refundableInfo.transactionNo,
          type: refundableInfo.type,
          remainingRefundableAfter: refundableInfo.remainingRefundable - cleanAmount,
        },
      };
    });
  }

  /**
   * Admin: Danh sách lịch sử hoàn tiền toàn hệ thống
   */
  static async listRefundHistory({
    page = 1,
    limit = 20,
    walletId = null,
    keyword = "",
  }) {
    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.max(1, Math.min(100, parseInt(limit, 10) || 20));
    const skip = (pageNum - 1) * limitNum;

    const where = {};
    if (walletId) {
      where.walletId = parseInt(walletId, 10);
    }
    if (keyword && typeof keyword === "string" && keyword.trim()) {
      const kw = keyword.trim();
      where.OR = [
        { refundCode: { contains: kw, mode: "insensitive" } },
        { reason: { contains: kw, mode: "insensitive" } },
        { approvedBy: { contains: kw, mode: "insensitive" } },
        { originalTx: { transactionNo: { contains: kw, mode: "insensitive" } } },
      ];
    }

    const [total, refunds] = await Promise.all([
      prisma.refund.count({ where }),
      prisma.refund.findMany({
        where,
        skip,
        take: limitNum,
        orderBy: { processedAt: "desc" },
        include: {
          wallet: {
            include: {
              user: {
                select: {
                  id: true,
                  username: true,
                  fullName: true,
                },
              },
            },
          },
          originalTx: {
            select: {
              transactionNo: true,
              type: true,
              amount: true,
            },
          },
        },
      }),
    ]);

    return {
      refunds: refunds.map((r) => ({
        id: r.id,
        refundCode: r.refundCode,
        amount: Number(r.amount),
        reason: r.reason,
        status: r.status,
        approvedBy: r.approvedBy,
        processedAt: r.processedAt,
        walletNumber: r.wallet.walletNumber,
        customerUsername: r.wallet.user?.username,
        customerFullName: r.wallet.user?.fullName,
        originalTransaction: {
          transactionNo: r.originalTx.transactionNo,
          type: r.originalTx.type,
          amount: Number(r.originalTx.amount),
        },
      })),
      pagination: {
        total,
        page: pageNum,
        limit: limitNum,
        totalPages: Math.ceil(total / limitNum) || 1,
      },
    };
  }

  /**
   * Khách hàng: Xem danh sách các khoản tiền được hoàn vào ví của mình
   */
  static async listMyRefunds({ userId, page = 1, limit = 20 }) {
    const cleanUserId = parseInt(userId, 10);
    const wallet = await WalletService.getOrCreateWallet(cleanUserId);

    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.max(1, Math.min(100, parseInt(limit, 10) || 20));
    const skip = (pageNum - 1) * limitNum;

    const where = { walletId: wallet.id };

    const [total, refunds] = await Promise.all([
      prisma.refund.count({ where }),
      prisma.refund.findMany({
        where,
        skip,
        take: limitNum,
        orderBy: { processedAt: "desc" },
        include: {
          originalTx: {
            select: {
              transactionNo: true,
              type: true,
              amount: true,
            },
          },
        },
      }),
    ]);

    return {
      walletNumber: wallet.walletNumber,
      refunds: refunds.map((r) => ({
        id: r.id,
        refundCode: r.refundCode,
        amount: Number(r.amount),
        reason: r.reason,
        status: r.status,
        processedAt: r.processedAt,
        originalTransaction: {
          transactionNo: r.originalTx.transactionNo,
          type: r.originalTx.type,
          amount: Number(r.originalTx.amount),
        },
      })),
      pagination: {
        total,
        page: pageNum,
        limit: limitNum,
        totalPages: Math.ceil(total / limitNum) || 1,
      },
    };
  }
}
