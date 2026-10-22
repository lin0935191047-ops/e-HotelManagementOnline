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
}
