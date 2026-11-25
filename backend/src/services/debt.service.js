import { prisma } from "../common/prisma.js";
import { AppError, ErrorCodes } from "../common/errors.js";
import { WalletService } from "./wallet.service.js";

export class DebtService {
  /**
   * Sinh mã công nợ theo định dạng DBT-YYYYMMDD-XXXX
   */
  static generateDebtCode() {
    const now = new Date();
    const yyyy = now.getFullYear();
    const mm = String(now.getMonth() + 1).padStart(2, "0");
    const dd = String(now.getDate()).padStart(2, "0");
    const randomSuffix = Math.random().toString(36).substring(2, 6).toUpperCase();
    return `DBT-${yyyy}${mm}${dd}-${randomSuffix}`;
  }

  /**
   * Tạo bản ghi công nợ mới (Debt)
   */
  static async createDebt({
    userId,
    type,
    amount,
    dueDate,
    bookingId = null,
    ticketId = null,
    note = null,
  }) {
    if (!userId) {
      throw new AppError(
        ErrorCodes.VALIDATION_FAILED,
        "Vui lòng cung cấp mã khách hàng (userId).",
        400,
      );
    }

    const cleanUserId = parseInt(userId, 10);
    if (isNaN(cleanUserId)) {
      throw new AppError(
        ErrorCodes.VALIDATION_FAILED,
        "Mã khách hàng không hợp lệ.",
        400,
      );
    }

    const cleanAmount = Number(amount);
    if (isNaN(cleanAmount) || cleanAmount <= 0) {
      throw new AppError(
        ErrorCodes.VALIDATION_FAILED,
        "Số tiền công nợ phải là số dương lớn hơn 0.",
        400,
      );
    }

    const cleanType = String(type || "").toUpperCase();
    if (!["BOOKING_BALANCE", "SERVICE_FEE"].includes(cleanType)) {
      throw new AppError(
        ErrorCodes.VALIDATION_FAILED,
        "Loại công nợ không hợp lệ (chỉ chấp nhận BOOKING_BALANCE hoặc SERVICE_FEE).",
        400,
      );
    }

    let parsedDueDate;
    if (dueDate) {
      parsedDueDate = new Date(dueDate);
      if (isNaN(parsedDueDate.getTime())) {
        throw new AppError(
          ErrorCodes.VALIDATION_FAILED,
          "Hạn thanh toán (dueDate) không đúng định dạng ngày giờ.",
          400,
        );
      }
    } else {
      // Mặc định hạn thanh toán là 3 ngày sau
      parsedDueDate = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000);
    }

    const user = await prisma.user.findUnique({
      where: { id: cleanUserId },
      include: { wallet: true },
    });

    if (!user) {
      throw new AppError(
        ErrorCodes.RESOURCE_NOT_FOUND,
        `Khách hàng với ID ${cleanUserId} không tồn tại.`,
        404,
      );
    }

    // Đảm bảo khách hàng đã có ví nội bộ
    const wallet = user.wallet || (await WalletService.getOrCreateWallet(cleanUserId));

    const debtCode = this.generateDebtCode();

    const debt = await prisma.debt.create({
      data: {
        debtCode,
        userId: cleanUserId,
        walletId: wallet.id,
        bookingId: bookingId ? parseInt(bookingId, 10) : null,
        ticketId: ticketId ? String(ticketId).trim() : null,
        type: cleanType,
        amount: cleanAmount,
        paidAmount: 0,
        status: "UNPAID",
        dueDate: parsedDueDate,
        note: note ? String(note).trim() : null,
      },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            fullName: true,
          },
        },
      },
    });

    return {
      debtId: debt.id,
      debtCode: debt.debtCode,
      userId: debt.userId,
      username: debt.user.username,
      fullName: debt.user.fullName,
      type: debt.type,
      amount: Number(debt.amount),
      paidAmount: Number(debt.paidAmount),
      status: debt.status,
      dueDate: debt.dueDate,
      bookingId: debt.bookingId,
      ticketId: debt.ticketId,
      note: debt.note,
      createdAt: debt.createdAt,
    };
  }

  /**
   * Xem chi tiết khoản nợ theo ID
   */
  static async getDebtById(debtId) {
    let whereCondition = null;
    if (typeof debtId === "number" || (/^\d+$/.test(String(debtId).trim()))) {
      whereCondition = { id: parseInt(debtId, 10) };
    } else if (typeof debtId === "string" && debtId.trim().length > 0) {
      whereCondition = { debtCode: debtId.trim() };
    } else {
      throw new AppError(
        ErrorCodes.VALIDATION_FAILED,
        "Mã công nợ không hợp lệ.",
        400,
      );
    }

    const debt = await prisma.debt.findFirst({
      where: whereCondition,
      include: {
        user: {
          select: {
            id: true,
            username: true,
            fullName: true,
            wallet: true,
            autoDebitSetting: true,
          },
        },
        booking: true,
        serviceUsage: true,
        transactions: true,
      },
    });

    if (!debt) {
      throw new AppError(
        ErrorCodes.DEBT_NOT_FOUND,
        `Không tìm thấy khoản công nợ với ID ${cleanDebtId}.`,
        404,
      );
    }

    return {
      debtId: debt.id,
      debtCode: debt.debtCode,
      userId: debt.userId,
      user: {
        id: debt.user.id,
        username: debt.user.username,
        fullName: debt.user.fullName,
        walletNumber: debt.user.wallet?.walletNumber || null,
        walletBalance: Number(debt.user.wallet?.balance || 0),
        autoDebitStatus: debt.user.autoDebitSetting?.status || "NOT_ENABLED",
      },
      type: debt.type,
      amount: Number(debt.amount),
      paidAmount: Number(debt.paidAmount),
      status: debt.status,
      dueDate: debt.dueDate,
      paidAt: debt.paidAt,
      bookingId: debt.bookingId,
      ticketId: debt.ticketId,
      note: debt.note,
      createdAt: debt.createdAt,
      transactions: debt.transactions.map((tx) => ({
        transactionNo: tx.transactionNo,
        type: tx.type,
        amount: Number(tx.amount),
        status: tx.status,
        createdAt: tx.createdAt,
      })),
    };
  }

  /**
   * Khách hàng: Xem danh sách công nợ của chính mình
   */
  static async listDebtsForCustomer({
    userId,
    status = null,
    page = 1,
    limit = 20,
  }) {
    const cleanUserId = parseInt(userId, 10);
    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.max(1, Math.min(100, parseInt(limit, 10) || 20));
    const skip = (pageNum - 1) * limitNum;

    const where = { userId: cleanUserId };
    if (status && ["UNPAID", "OVERDUE", "PAID", "CANCELLED"].includes(status.toUpperCase())) {
      where.status = status.toUpperCase();
    }

    const [total, debts] = await Promise.all([
      prisma.debt.count({ where }),
      prisma.debt.findMany({
        where,
        skip,
        take: limitNum,
        orderBy: { dueDate: "asc" },
        include: {
          booking: {
            select: {
              id: true,
              customerName: true,
              status: true,
            },
          },
          serviceUsage: {
            select: {
              ticketId: true,
              serviceId: true,
              totalPrice: true,
            },
          },
        },
      }),
    ]);

    return {
      debts: debts.map((d) => ({
        debtId: d.id,
        debtCode: d.debtCode,
        type: d.type,
        amount: Number(d.amount),
        paidAmount: Number(d.paidAmount),
        status: d.status,
        dueDate: d.dueDate,
        paidAt: d.paidAt,
        bookingId: d.bookingId,
        ticketId: d.ticketId,
        note: d.note,
        createdAt: d.createdAt,
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
   * Quản trị viên / Lễ tân / Quản lý: Xem danh sách công nợ toàn hệ thống
   */
  static async listAllDebts({
    page = 1,
    limit = 20,
    status = null,
    userId = null,
    type = null,
    keyword = "",
  }) {
    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.max(1, Math.min(100, parseInt(limit, 10) || 20));
    const skip = (pageNum - 1) * limitNum;

    const where = {};
    if (status && ["UNPAID", "OVERDUE", "PAID", "CANCELLED"].includes(status.toUpperCase())) {
      where.status = status.toUpperCase();
    }
    if (userId) {
      where.userId = parseInt(userId, 10);
    }
    if (type && ["BOOKING_BALANCE", "SERVICE_FEE"].includes(type.toUpperCase())) {
      where.type = type.toUpperCase();
    }
    if (keyword && typeof keyword === "string" && keyword.trim()) {
      const kw = keyword.trim();
      where.OR = [
        { debtCode: { contains: kw, mode: "insensitive" } },
        { user: { username: { contains: kw, mode: "insensitive" } } },
        { user: { fullName: { contains: kw, mode: "insensitive" } } },
      ];
    }

    const [total, debts] = await Promise.all([
      prisma.debt.count({ where }),
      prisma.debt.findMany({
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
              wallet: true,
              autoDebitSetting: true,
            },
          },
        },
      }),
    ]);

    return {
      debts: debts.map((d) => ({
        debtId: d.id,
        debtCode: d.debtCode,
        userId: d.userId,
        username: d.user.username,
        fullName: d.user.fullName,
        walletNumber: d.user.wallet?.walletNumber || null,
        walletBalance: Number(d.user.wallet?.balance || 0),
        autoDebitStatus: d.user.autoDebitSetting?.status || "NOT_ENABLED",
        type: d.type,
        amount: Number(d.amount),
        paidAmount: Number(d.paidAmount),
        status: d.status,
        dueDate: d.dueDate,
        paidAt: d.paidAt,
        bookingId: d.bookingId,
        ticketId: d.ticketId,
        note: d.note,
        createdAt: d.createdAt,
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
   * FEAT-13.4: Auto-Debit BR-01 — Khấu trừ tự động công nợ đến hạn
   * 
   * Quy tắc nghiệp vụ:
   * 1. AutoDebitSetting của khách hàng bắt buộc phải là ACTIVE.
   * 2. Ví nội bộ Wallet phải ở trạng thái ACTIVE (không bị LOCKED).
   * 3. Trạng thái khoản nợ phải là UNPAID hoặc OVERDUE.
   * 4. QUY TẮC CỐT LÕI: TUYỆT ĐỐI KHÔNG TRỪ TIỀN MỘT PHẦN:
   *    Nếu số dư ví < số tiền nợ, giao dịch THẤT BẠI toàn phần, số dư ví giữ nguyên,
   *    khoản nợ cập nhật thành OVERDUE nếu đã quá hạn dueDate.
   * 5. Khi số dư đủ: Sử dụng Pessimistic Locking (SELECT ... FOR UPDATE) trừ tiền an toàn,
   *    ghi nhận WalletTransaction loại AUTO_DEBIT_DEBT, cập nhật khoản nợ sang PAID.
   */
  static async processAutoDebitBR01({
    debtId,
    triggeredByUserId = null,
    isAdmin = false,
  }) {
    let whereCondition = null;
    if (typeof debtId === "number" || (/^\d+$/.test(String(debtId).trim()))) {
      whereCondition = { id: parseInt(debtId, 10) };
    } else if (typeof debtId === "string" && debtId.trim().length > 0) {
      whereCondition = { debtCode: debtId.trim() };
    } else {
      throw new AppError(
        ErrorCodes.VALIDATION_FAILED,
        "Mã công nợ không hợp lệ.",
        400,
      );
    }

    const debt = await prisma.debt.findFirst({
      where: whereCondition,
      include: {
        user: {
          include: {
            wallet: true,
            autoDebitSetting: true,
          },
        },
      },
    });

    if (!debt) {
      throw new AppError(
        ErrorCodes.DEBT_NOT_FOUND,
        `Khoản công nợ với ID ${cleanDebtId} không tồn tại.`,
        404,
      );
    }

    // Kiểm tra quyền: nếu không phải Admin thì phải là chính chủ khoản nợ
    if (!isAdmin && triggeredByUserId && debt.userId !== parseInt(triggeredByUserId, 10)) {
      throw new AppError(
        ErrorCodes.FORBIDDEN_ACCESS,
        "Bạn không có quyền thực hiện thanh toán cho khoản nợ này.",
        403,
      );
    }

    // Kiểm tra trạng thái nợ
    if (debt.status === "PAID") {
      throw new AppError(
        ErrorCodes.DEBT_ALREADY_PAID,
        `Khoản nợ ${debt.debtCode} đã được thanh toán trước đó.`,
        400,
      );
    }

    if (debt.status === "CANCELLED") {
      throw new AppError(
        ErrorCodes.VALIDATION_FAILED,
        `Khoản nợ ${debt.debtCode} đã bị hủy, không thể khấu trừ.`,
        400,
      );
    }

    // 1. Kiểm tra trạng thái Auto-Debit của khách hàng
    const autoDebitSetting = debt.user.autoDebitSetting;
    if (!autoDebitSetting || autoDebitSetting.status !== "ACTIVE") {
      const currentStatus = autoDebitSetting ? autoDebitSetting.status : "NOT_ENABLED";
      throw new AppError(
        ErrorCodes.AUTO_DEBIT_NOT_ACTIVE,
        `Dịch vụ Auto-Debit của khách hàng ${debt.user.username} chưa được kích hoạt hoặc đang tạm ngừng (Trạng thái hiện tại: ${currentStatus}).`,
        400,
        { autoDebitStatus: currentStatus },
      );
    }

    // 2. Kiểm tra ví nội bộ
    const wallet = debt.user.wallet;
    if (!wallet) {
      throw new AppError(
        ErrorCodes.WALLET_NOT_FOUND,
        "Không tìm thấy ví nội bộ của khách hàng.",
        404,
      );
    }

    if (wallet.status === "LOCKED") {
      throw new AppError(
        ErrorCodes.WALLET_LOCKED,
        "Ví nội bộ của khách hàng đang bị KHÓA, không thể thực hiện khấu trừ tự động.",
        400,
      );
    }

    const debtAmount = Number(debt.amount);

    // 3. Thực hiện khấu trừ nguyên tử với Pessimistic Locking
    try {
      return await prisma.$transaction(async (tx) => {
        // Khóa bi quan bản ghi ví nội bộ
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
          throw new AppError(
            ErrorCodes.WALLET_LOCKED,
            "Ví nội bộ của khách hàng đang bị khóa tại thời điểm thanh toán.",
            400,
          );
        }

        const currentBalance = Number(currentWallet.balance);

        // QUY TẮC CỐT LÕI SRS: TUYỆT ĐỐI KHÔNG TRỪ TIỀN MỘT PHẦN
        if (currentBalance < debtAmount) {
          throw new AppError(
            ErrorCodes.INSUFFICIENT_WALLET_BALANCE,
            `Số dư ví (${currentBalance.toLocaleString()} VND) không đủ để thanh toán toàn bộ khoản nợ (${debtAmount.toLocaleString()} VND). Quy tắc Auto-Debit tuyệt đối không trừ một phần.`,
            400,
            {
              currentBalance,
              debtAmount,
              shortage: debtAmount - currentBalance,
              debtCode: debt.debtCode,
            },
          );
        }

        // ĐỦ SỐ DƯ: Khấu trừ đúng số tiền debtAmount
        const balanceAfter = currentBalance - debtAmount;

        await tx.wallet.update({
          where: { id: wallet.id },
          data: {
            balance: balanceAfter,
            updatedAt: new Date(),
          },
        });

        // Sinh mã giao dịch WTX-YYYYMMDD-XXXX
        const transactionNo = WalletService.generateTransactionNo();

        const transaction = await tx.walletTransaction.create({
          data: {
            transactionNo,
            walletId: wallet.id,
            type: "AUTO_DEBIT_DEBT",
            amount: debtAmount,
            balanceBefore: currentBalance,
            balanceAfter,
            status: "SUCCESS",
            debtId: debt.id,
            description: `Tự động khấu trừ công nợ ${debt.debtCode} (${debt.type}) theo quy tắc BR-01`,
            metadata: {
              rule: "BR-01",
              debtCode: debt.debtCode,
              debtType: debt.type,
              dueDate: debt.dueDate,
              bookingId: debt.bookingId,
              ticketId: debt.ticketId,
              paidAt: new Date().toISOString(),
            },
          },
        });

        // Cập nhật công nợ sang PAID
        const updatedDebt = await tx.debt.update({
          where: { id: debt.id },
          data: {
            status: "PAID",
            paidAmount: debtAmount,
            paidAt: new Date(),
            updatedAt: new Date(),
          },
        });

        // Nếu là công nợ tiền dịch vụ kèm ticketId, cập nhật isPaid = true
        if (debt.ticketId) {
          await tx.serviceUsage.updateMany({
            where: { ticketId: debt.ticketId },
            data: { isPaid: true },
          });
        }

        return {
          success: true,
          message: `Khấu trừ tự động BR-01 thành công cho khoản nợ ${debt.debtCode}.`,
          data: {
            debt: {
              id: updatedDebt.id,
              debtCode: updatedDebt.debtCode,
              type: updatedDebt.type,
              amount: Number(updatedDebt.amount),
              paidAmount: Number(updatedDebt.paidAmount),
              status: updatedDebt.status,
              paidAt: updatedDebt.paidAt,
            },
            wallet: {
              walletNumber: currentWallet.wallet_number,
              balanceBefore: currentBalance,
              balanceAfter,
              amountDeducted: debtAmount,
            },
            transaction: {
              transactionNo: transaction.transactionNo,
              type: transaction.type,
              status: transaction.status,
              createdAt: transaction.createdAt,
            },
          },
        };
      });
    } catch (err) {
      if (err.code === ErrorCodes.INSUFFICIENT_WALLET_BALANCE) {
        const isOverdue = new Date() > new Date(debt.dueDate);
        if (isOverdue && debt.status !== "OVERDUE") {
          await prisma.debt.update({
            where: { id: debt.id },
            data: { status: "OVERDUE", updatedAt: new Date() },
          });
        }
      }
      throw err;
    }
  }

  /**
   * Quét & thực thi tự động khấu trừ hàng loạt các khoản công nợ đến hạn (Batch Process BR-01)
   */
  static async batchProcessDueDebts() {
    const now = new Date();

    // 1. Tìm tất cả các khoản nợ UNPAID hoặc OVERDUE có dueDate <= now
    const dueDebts = await prisma.debt.findMany({
      where: {
        status: { in: ["UNPAID", "OVERDUE"] },
        dueDate: { lte: now },
      },
      include: {
        user: {
          include: {
            autoDebitSetting: true,
            wallet: true,
          },
        },
      },
      orderBy: { dueDate: "asc" },
    });

    const summary = {
      scannedCount: dueDebts.length,
      successCount: 0,
      failedCount: 0,
      totalAmountDebited: 0,
      results: [],
    };

    for (const debt of dueDebts) {
      // Bỏ qua nếu user không bật ACTIVE Auto-Debit
      if (debt.user?.autoDebitSetting?.status !== "ACTIVE") {
        summary.failedCount++;
        summary.results.push({
          debtId: debt.id,
          debtCode: debt.debtCode,
          userId: debt.userId,
          status: "SKIPPED",
          reason: "Auto-Debit không ở trạng thái ACTIVE",
        });
        continue;
      }

      try {
        const result = await this.processAutoDebitBR01({
          debtId: debt.id,
          isAdmin: true,
        });

        summary.successCount++;
        summary.totalAmountDebited += Number(debt.amount);
        summary.results.push({
          debtId: debt.id,
          debtCode: debt.debtCode,
          userId: debt.userId,
          amount: Number(debt.amount),
          status: "SUCCESS",
          transactionNo: result.data.transaction.transactionNo,
        });
      } catch (err) {
        summary.failedCount++;
        summary.results.push({
          debtId: debt.id,
          debtCode: debt.debtCode,
          userId: debt.userId,
          amount: Number(debt.amount),
          status: "FAILED",
          errorCode: err.code || "UNKNOWN_ERROR",
          reason: err.message,
        });
      }
    }

    return summary;
  }
}
