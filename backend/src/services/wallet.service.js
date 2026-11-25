import { prisma } from "../common/prisma.js";
import { AppError, ErrorCodes } from "../common/errors.js";

export class WalletService {
  /**
   * Sinh mã ví nội bộ theo định dạng WAL-YYYYMMDD-XXXX
   */
  static generateWalletNumber() {
    const now = new Date();
    const yyyy = now.getFullYear();
    const mm = String(now.getMonth() + 1).padStart(2, "0");
    const dd = String(now.getDate()).padStart(2, "0");
    const randomSuffix = Math.random().toString(36).substring(2, 6).toUpperCase();
    return `WAL-${yyyy}${mm}${dd}-${randomSuffix}`;
  }

  /**
   * Sinh mã giao dịch ví theo định dạng WTX-YYYYMMDD-XXXX
   */
  static generateTransactionNo() {
    const now = new Date();
    const yyyy = now.getFullYear();
    const mm = String(now.getMonth() + 1).padStart(2, "0");
    const dd = String(now.getDate()).padStart(2, "0");
    const randomSuffix = Math.random().toString(36).substring(2, 6).toUpperCase();
    return `WTX-${yyyy}${mm}${dd}-${randomSuffix}`;
  }

  /**
   * Đảm bảo khách hàng luôn có ví nội bộ (Tạo mới nếu chưa có)
   * Đồng thời khởi tạo cài đặt Auto-Debit ở trạng thái NOT_ENABLED
   */
  static async getOrCreateWallet(userId) {
    if (!userId) {
      throw new AppError(
        ErrorCodes.VALIDATION_FAILED,
        "Vui lòng cung cấp mã người dùng (userId).",
        400,
      );
    }

    const cleanUserId = parseInt(userId, 10);
    if (isNaN(cleanUserId)) {
      throw new AppError(
        ErrorCodes.VALIDATION_FAILED,
        "Mã người dùng không hợp lệ.",
        400,
      );
    }

    const existingWallet = await prisma.wallet.findUnique({
      where: { userId: cleanUserId },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            fullName: true,
            role: true,
          },
        },
      },
    });

    if (existingWallet) {
      // Đảm bảo cài đặt Auto-Debit tồn tại
      let autoDebitSetting = await prisma.autoDebitSetting.findUnique({
        where: { userId: cleanUserId },
      });
      if (!autoDebitSetting) {
        autoDebitSetting = await prisma.autoDebitSetting.create({
          data: {
            userId: cleanUserId,
            status: "NOT_ENABLED",
          },
        });
      }

      return {
        id: existingWallet.id,
        walletNumber: existingWallet.walletNumber,
        userId: existingWallet.userId,
        user: existingWallet.user,
        currency: existingWallet.currency,
        balance: Number(existingWallet.balance),
        status: existingWallet.status,
        autoDebitStatus: autoDebitSetting.status,
        createdAt: existingWallet.createdAt,
        updatedAt: existingWallet.updatedAt,
      };
    }

    // Kiểm tra xem User có tồn tại không
    const user = await prisma.user.findUnique({
      where: { id: cleanUserId },
    });

    if (!user) {
      throw new AppError(
        ErrorCodes.RESOURCE_NOT_FOUND,
        `Người dùng với ID ${cleanUserId} không tồn tại.`,
        404,
      );
    }

    const walletNumber = this.generateWalletNumber();

    return await prisma.$transaction(async (tx) => {
      const newWallet = await tx.wallet.create({
        data: {
          walletNumber,
          userId: cleanUserId,
          currency: "VND",
          balance: 0,
          status: "ACTIVE",
        },
        include: {
          user: {
            select: {
              id: true,
              username: true,
              fullName: true,
              role: true,
            },
          },
        },
      });

      const autoDebitSetting = await tx.autoDebitSetting.create({
        data: {
          userId: cleanUserId,
          status: "NOT_ENABLED",
        },
      });

      return {
        id: newWallet.id,
        walletNumber: newWallet.walletNumber,
        userId: newWallet.userId,
        user: newWallet.user,
        currency: newWallet.currency,
        balance: Number(newWallet.balance),
        status: newWallet.status,
        autoDebitStatus: autoDebitSetting.status,
        createdAt: newWallet.createdAt,
        updatedAt: newWallet.updatedAt,
      };
    });
  }

  /**
   * Lấy thông tin chi tiết ví của khách hàng bao gồm số dư, trạng thái Auto-Debit và công nợ hiện tại
   */
  static async getWalletDetails(userId) {
    const wallet = await this.getOrCreateWallet(userId);

    // Lấy 5 giao dịch gần nhất
    const recentTransactions = await prisma.walletTransaction.findMany({
      where: { walletId: wallet.id },
      orderBy: { createdAt: "desc" },
      take: 5,
    });

    // Thống kê công nợ chưa thanh toán
    const activeDebts = await prisma.debt.findMany({
      where: {
        userId: wallet.userId,
        status: { in: ["UNPAID", "OVERDUE"] },
      },
      orderBy: { dueDate: "asc" },
    });

    const totalUnpaidDebt = activeDebts.reduce(
      (sum, d) => sum + (Number(d.amount) - Number(d.paidAmount)),
      0,
    );

    const mappedTransactions = recentTransactions.map((tx) => ({
      id: tx.id,
      txId: tx.transactionNo,
      transactionNo: tx.transactionNo,
      type: tx.type,
      amount: Number(tx.amount),
      balanceBefore: Number(tx.balanceBefore),
      balanceAfter: Number(tx.balanceAfter),
      status: tx.status,
      description: tx.description,
      createdAt: tx.createdAt,
    }));

    return {
      ...wallet,
      walletId: wallet.walletNumber,
      walletNumber: wallet.walletNumber,
      totalUnpaidDebt,
      unpaidDebtsCount: activeDebts.length,
      recentTransactions: mappedTransactions,
      transactions: mappedTransactions,
    };
  }

  /**
   * FEAT-13.2: Nạp tiền giả lập vào Ví nội bộ (Mock Top-up)
   * Bọc trong Prisma Transaction với Pessimistic Locking (SELECT ... FOR UPDATE)
   */
  static async mockTopUp({ userId, amount, paymentMethod = "MOCK_TOP_UP", note = "" }) {
    if (!userId) {
      throw new AppError(
        ErrorCodes.VALIDATION_FAILED,
        "Vui lòng cung cấp mã người dùng (userId).",
        400,
      );
    }

    const cleanAmount = Math.round(Number(amount));
    if (isNaN(cleanAmount) || cleanAmount < 10000) {
      throw new AppError(
        ErrorCodes.VALIDATION_FAILED,
        "Số tiền nạp tối thiểu là 10.000 VND và phải là số nguyên hợp lệ.",
        400,
      );
    }

    if (cleanAmount > 500000000) {
      throw new AppError(
        ErrorCodes.VALIDATION_FAILED,
        "Số tiền nạp tối đa mỗi lần là 500.000.000 VND.",
        400,
      );
    }

    // Đảm bảo ví tồn tại trước khi bắt đầu transaction
    const initialWallet = await this.getOrCreateWallet(userId);

    if (initialWallet.status === "LOCKED") {
      throw new AppError(
        ErrorCodes.WALLET_LOCKED,
        "Ví nội bộ của bạn hiện đang bị KHÓA, không thể thực hiện nạp tiền. Vui lòng liên hệ quản trị viên.",
        400,
      );
    }

    return await prisma.$transaction(async (tx) => {
      // 1. Khóa bi quan bản ghi ví bằng SELECT ... FOR UPDATE
      const lockedWallets = await tx.$queryRaw`
        SELECT id, wallet_number, balance, status, currency, user_id
        FROM wallets
        WHERE id = ${initialWallet.id}
        FOR UPDATE;
      `;

      if (!lockedWallets || lockedWallets.length === 0) {
        throw new AppError(
          ErrorCodes.WALLET_NOT_FOUND,
          "Không tìm thấy ví nội bộ.",
          404,
        );
      }

      const lockedWallet = lockedWallets[0];

      if (lockedWallet.status === "LOCKED") {
        throw new AppError(
          ErrorCodes.WALLET_LOCKED,
          "Ví nội bộ của bạn hiện đang bị KHÓA, không thể thực hiện nạp tiền.",
          400,
        );
      }

      const balanceBefore = Number(lockedWallet.balance);
      const balanceAfter = balanceBefore + cleanAmount;
      const transactionNo = this.generateTransactionNo();

      // 2. Cập nhật số dư ví
      await tx.$executeRaw`
        UPDATE wallets
        SET balance = ${balanceAfter}, updated_at = NOW()
        WHERE id = ${lockedWallet.id};
      `;

      // 3. Tạo bản ghi giao dịch WalletTransaction
      const transaction = await tx.walletTransaction.create({
        data: {
          transactionNo,
          walletId: lockedWallet.id,
          type: "TOP_UP_MOCK",
          amount: cleanAmount,
          balanceBefore,
          balanceAfter,
          status: "SUCCESS",
          description: `Nạp tiền giả lập vào ví (+${new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(cleanAmount)})`,
          metadata: {
            mock: true,
            simulatedAt: new Date().toISOString(),
            paymentMethod: String(paymentMethod || "MOCK_TOP_UP").trim(),
            note: note ? String(note).trim() : "Mock Top-up",
          },
        },
      });

      return {
        wallet: {
          id: lockedWallet.id,
          walletNumber: lockedWallet.wallet_number,
          currency: lockedWallet.currency,
          balanceBefore,
          balanceAfter,
          amountAdded: cleanAmount,
        },
        transaction: {
          id: transaction.id,
          transactionNo: transaction.transactionNo,
          type: transaction.type,
          amount: Number(transaction.amount),
          balanceBefore: Number(transaction.balanceBefore),
          balanceAfter: Number(transaction.balanceAfter),
          status: transaction.status,
          description: transaction.description,
          createdAt: transaction.createdAt,
        },
      };
    });
  }

  /**
   * Lấy lịch sử giao dịch của ví có phân trang và bộ lọc
   */
  static async getWalletTransactions({
    userId,
    page = 1,
    limit = 20,
    type = null,
    status = null,
  }) {
    const wallet = await this.getOrCreateWallet(userId);

    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.max(1, Math.min(100, parseInt(limit, 10) || 20));
    const skip = (pageNum - 1) * limitNum;

    const where = {
      walletId: wallet.id,
    };

    if (type && typeof type === "string" && type.trim()) {
      where.type = type.trim().toUpperCase();
    }

    if (status && typeof status === "string" && status.trim()) {
      where.status = status.trim().toUpperCase();
    }

    const [total, transactions] = await Promise.all([
      prisma.walletTransaction.count({ where }),
      prisma.walletTransaction.findMany({
        where,
        skip,
        take: limitNum,
        orderBy: { createdAt: "desc" },
      }),
    ]);

    return {
      wallet: {
        id: wallet.id,
        walletNumber: wallet.walletNumber,
        balance: wallet.balance,
        currency: wallet.currency,
        status: wallet.status,
      },
      transactions: transactions.map((tx) => ({
        id: tx.id,
        transactionNo: tx.transactionNo,
        type: tx.type,
        amount: Number(tx.amount),
        balanceBefore: Number(tx.balanceBefore),
        balanceAfter: Number(tx.balanceAfter),
        status: tx.status,
        description: tx.description,
        createdAt: tx.createdAt,
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
   * Admin: Xem danh sách toàn bộ ví nội bộ của khách hàng
   */
  static async listAllWallets({
    page = 1,
    limit = 20,
    keyword = "",
    status = null,
  }) {
    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.max(1, Math.min(100, parseInt(limit, 10) || 20));
    const skip = (pageNum - 1) * limitNum;

    const where = {};

    if (status && (status === "ACTIVE" || status === "LOCKED")) {
      where.status = status;
    }

    if (keyword && typeof keyword === "string" && keyword.trim()) {
      const kw = keyword.trim();
      where.OR = [
        { walletNumber: { contains: kw, mode: "insensitive" } },
        { user: { username: { contains: kw, mode: "insensitive" } } },
        { user: { fullName: { contains: kw, mode: "insensitive" } } },
      ];
    }

    const [total, rawWallets] = await Promise.all([
      prisma.wallet.count({ where }),
      prisma.wallet.findMany({
        where,
        skip,
        take: limitNum,
        orderBy: { createdAt: "desc" },
        include: {
          user: {
            select: {
              id: true,
              username: true,
              fullName: true,
              role: true,
              isActive: true,
            },
          },
        },
      }),
    ]);

    // Lấy trạng thái Auto-Debit của danh sách user
    const userIds = rawWallets.map((w) => w.userId);
    const settings = await prisma.autoDebitSetting.findMany({
      where: { userId: { in: userIds } },
    });
    const settingMap = new Map(settings.map((s) => [s.userId, s.status]));

    return {
      wallets: rawWallets.map((w) => ({
        id: w.id,
        walletNumber: w.walletNumber,
        userId: w.userId,
        username: w.user.username,
        fullName: w.user.fullName,
        currency: w.currency,
        balance: Number(w.balance),
        status: w.status,
        autoDebitStatus: settingMap.get(w.userId) || "NOT_ENABLED",
        createdAt: w.createdAt,
        updatedAt: w.updatedAt,
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
   * Admin: Khóa hoặc mở khóa ví của khách hàng
   */
  static async updateWalletStatus({ walletId, status, adminUsername }) {
    if (!walletId) {
      throw new AppError(
        ErrorCodes.VALIDATION_FAILED,
        "Vui lòng cung cấp mã ví (walletId).",
        400,
      );
    }

    const cleanStatus = status?.toUpperCase();
    if (cleanStatus !== "ACTIVE" && cleanStatus !== "LOCKED") {
      throw new AppError(
        ErrorCodes.VALIDATION_FAILED,
        "Trạng thái ví chỉ có thể là ACTIVE hoặc LOCKED.",
        400,
      );
    }

    const cleanWalletId = parseInt(walletId, 10);
    const wallet = await prisma.wallet.findUnique({
      where: { id: cleanWalletId },
      include: { user: true },
    });

    if (!wallet) {
      throw new AppError(
        ErrorCodes.WALLET_NOT_FOUND,
        `Ví có mã ID ${walletId} không tồn tại.`,
        404,
      );
    }

    const updated = await prisma.wallet.update({
      where: { id: cleanWalletId },
      data: { status: cleanStatus },
    });

    return {
      id: updated.id,
      walletNumber: updated.walletNumber,
      userId: updated.userId,
      username: wallet.user.username,
      status: updated.status,
      updatedBy: adminUsername,
      updatedAt: updated.updatedAt,
    };
  }
}
