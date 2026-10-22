import { AppError, ErrorCodes } from "../errors.js";

/**
 * Middleware phân quyền khép kín nghiêm ngặt (Strict Disjoint RBAC)
 * Tuyệt đối không cho phép kế thừa quyền: ADMIN chỉ được vào admin, MANAGER chỉ setup, SALE chỉ operation.
 * @param {string} allowedRole - Vai trò được phép duy nhất ('ADMIN' | 'MANAGER' | 'SALE')
 */
export function requireRole(allowedRole) {
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

    if (req.user.role !== allowedRole) {
      return next(
        new AppError(
          ErrorCodes.FORBIDDEN_ACCESS,
          `Truy cập bị từ chối: Vai trò '${req.user.role}' không có quyền truy cập tài nguyên của '${allowedRole}'.`,
          403,
        ),
      );
    }

    next();
  };
}
