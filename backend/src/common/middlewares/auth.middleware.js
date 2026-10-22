import jwt from "jsonwebtoken";
import { config } from "../config.js";
import { prisma } from "../prisma.js";
import { AppError, ErrorCodes } from "../errors.js";

/**
 * Middleware xác thực JWT và kiểm tra tự động hết hạn phiên (30 phút không hoạt động)
 */
export async function authenticateToken(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      throw new AppError(
        ErrorCodes.UNAUTHORIZED,
        "Yêu cầu token xác thực hợp lệ (Bearer token).",
        401,
      );
    }

    const token = authHeader.split(" ")[1];
    let payload;
    try {
      payload = jwt.verify(token, config.jwtSecret);
    } catch (err) {
      throw new AppError(
        ErrorCodes.UNAUTHORIZED,
        "Token không hợp lệ hoặc đã hết hạn.",
        401,
      );
    }

    // Truy vấn thông tin người dùng từ cơ sở dữ liệu
    const user = await prisma.user.findUnique({
      where: { id: payload.id },
    });

    if (!user || !user.isActive) {
      throw new AppError(
        ErrorCodes.UNAUTHORIZED,
        "Tài khoản không tồn tại hoặc đã bị khóa.",
        401,
      );
    }

    // Kiểm tra cơ chế tự động hết hạn phiên (30 phút không hoạt động)
    const timeoutMs = (config.sessionTimeoutMinutes || 30) * 60 * 1000;
    const now = Date.now();
    if (user.lastActiveAt) {
      const lastActiveTime = new Date(user.lastActiveAt).getTime();
      if (now - lastActiveTime > timeoutMs) {
        throw new AppError(
          ErrorCodes.UNAUTHORIZED,
          "Phiên làm việc đã hết hạn do không hoạt động quá 30 phút. Vui lòng đăng nhập lại.",
          401,
        );
      }
    }

    // Cập nhật lại mốc thời gian hoạt động mới nhất (lastActiveAt)
    const updatedUser = await prisma.user.update({
      where: { id: user.id },
      data: { lastActiveAt: new Date(now) },
    });

    // Gán thông tin người dùng đã xác thực vào request
    req.user = updatedUser;
    next();
  } catch (error) {
    next(error);
  }
}
