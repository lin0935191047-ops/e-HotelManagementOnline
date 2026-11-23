import { AppError, ErrorCodes } from "../errors.js";

/**
 * Middleware phân quyền khép kín nghiêm ngặt (Strict Disjoint RBAC)
 * @param {...string} allowedRoles - Vai trò hoặc danh sách vai trò được phép
 */
export function requireRole(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user) {
      return next(
        new AppError(
          ErrorCodes.UNAUTHORIZED,
          "Chưa xác thực người dùng.",
          401,
        ),
      );
    }

    if (!allowedRoles.includes(req.user.role)) {
      return next(
        new AppError(
          ErrorCodes.FORBIDDEN_ACCESS,
          `Truy cập bị từ chối: Vai trò '${req.user.role}' không có quyền truy cập tài nguyên của '${allowedRoles.join(", ")}'.`,
          403,
        ),
      );
    }

    next();
  };
}
