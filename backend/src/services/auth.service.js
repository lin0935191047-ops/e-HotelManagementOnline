import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { config } from "../common/config.js";
import { prisma } from "../common/prisma.js";
import { AppError, ErrorCodes } from "../common/errors.js";

export class AuthService {
  /**
   * Đăng nhập người dùng nội bộ
   * @param {Object} credentials - { username, password }
   */
  static async login({ username, password }) {
    if (!username || !password) {
      throw new AppError(
        ErrorCodes.VALIDATION_FAILED,
        "Vui lòng cung cấp đầy đủ tên đăng nhập và mật khẩu.",
        400,
      );
    }

    const user = await prisma.user.findUnique({
      where: { username: username.trim().toLowerCase() },
    });

    if (!user || !user.isActive) {
      throw new AppError(
        ErrorCodes.UNAUTHORIZED,
        "Tên đăng nhập hoặc mật khẩu không chính xác.",
        401,
      );
    }

    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
      throw new AppError(
        ErrorCodes.UNAUTHORIZED,
        "Tên đăng nhập hoặc mật khẩu không chính xác.",
        401,
      );
    }

    // Cập nhật lastActiveAt
    const now = new Date();
    await prisma.user.update({
      where: { id: user.id },
      data: { lastActiveAt: now },
    });

    // Tạo JWT token
    const token = jwt.sign(
      {
        id: user.id,
        username: user.username,
        role: user.role,
      },
      config.jwtSecret,
      { expiresIn: "12h" },
    );

    return {
      token,
      user: {
        id: user.id,
        username: user.username,
        fullName: user.fullName,
        role: user.role,
      },
    };
  }

  /**
   * Lấy thông tin tài khoản hiện tại
   */
  static async getProfile(userId) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        username: true,
        fullName: true,
        role: true,
        isActive: true,
        lastActiveAt: true,
        createdAt: true,
      },
    });

    if (!user) {
      throw new AppError(
        ErrorCodes.RESOURCE_NOT_FOUND,
        "Không tìm thấy thông tin người dùng.",
        404,
      );
    }

    return user;
  }

  /**
   * Đăng ký tài khoản Khách hàng (CUSTOMER) & Tự động tạo Ví nội bộ (Internal Wallet)
   */
  static async registerCustomer({ username, password, fullName }) {
    if (!username || typeof username !== "string" || username.trim().length < 3) {
      throw new AppError(
        ErrorCodes.VALIDATION_FAILED,
        "Tên đăng nhập phải có ít nhất 3 ký tự.",
        400,
      );
    }

    if (!password || typeof password !== "string" || password.length < 6) {
      throw new AppError(
        ErrorCodes.VALIDATION_FAILED,
        "Mật khẩu phải có ít nhất 6 ký tự.",
        400,
      );
    }

    if (!fullName || typeof fullName !== "string" || fullName.trim().length < 2) {
      throw new AppError(
        ErrorCodes.VALIDATION_FAILED,
        "Họ và tên khách hàng phải có ít nhất 2 ký tự.",
        400,
      );
    }

    const cleanUsername = username.trim().toLowerCase();

    const existingUser = await prisma.user.findUnique({
      where: { username: cleanUsername },
    });

    if (existingUser) {
      throw new AppError(
        ErrorCodes.VALIDATION_FAILED,
        `Tên đăng nhập '${cleanUsername}' đã được sử dụng.`,
        400,
      );
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    // Sinh mã ví: WAL-YYYYMMDD-XXXX
    const now = new Date();
    const yyyy = now.getFullYear();
    const mm = String(now.getMonth() + 1).padStart(2, "0");
    const dd = String(now.getDate()).padStart(2, "0");
    const randomSuffix = Math.random().toString(36).substring(2, 6).toUpperCase();
    const walletNumber = `WAL-${yyyy}${mm}${dd}-${randomSuffix}`;

    return await prisma.$transaction(async (tx) => {
      // 1. Tạo user với Role CUSTOMER
      const newUser = await tx.user.create({
        data: {
          username: cleanUsername,
          passwordHash,
          fullName: fullName.trim(),
          role: "CUSTOMER",
          isActive: true,
          lastActiveAt: now,
        },
      });

      // 2. Tạo ví nội bộ với số dư 0 VND
      const newWallet = await tx.wallet.create({
        data: {
          walletNumber,
          userId: newUser.id,
          currency: "VND",
          balance: 0,
          status: "ACTIVE",
        },
      });

      // 3. Khởi tạo cấu hình Auto-Debit ở trạng thái NOT_ENABLED
      const autoDebitSetting = await tx.autoDebitSetting.create({
        data: {
          userId: newUser.id,
          status: "NOT_ENABLED",
        },
      });

      // 4. Sinh JWT token
      const token = jwt.sign(
        {
          id: newUser.id,
          username: newUser.username,
          role: newUser.role,
        },
        config.jwtSecret,
        { expiresIn: "12h" },
      );

      return {
        token,
        user: {
          id: newUser.id,
          username: newUser.username,
          fullName: newUser.fullName,
          role: newUser.role,
        },
        wallet: {
          id: newWallet.id,
          walletNumber: newWallet.walletNumber,
          currency: newWallet.currency,
          balance: Number(newWallet.balance),
          status: newWallet.status,
        },
        autoDebit: {
          status: autoDebitSetting.status,
        },
      };
    });
  }
}
