import { AppError } from "../errors.js";

/**
 * Global Exception Handler cho Express theo RFC 7807
 */
export function errorHandler(err, req, res, next) {
  const statusCode = err.statusCode || 500;
  const errorCode = err.code || (statusCode === 500 ? "INTERNAL_SERVER_ERROR" : "BAD_REQUEST");
  const message = err.message || "Đã xảy ra lỗi hệ thống ngoài dự kiến.";

  res.status(statusCode).json({
    success: false,
    error: {
      code: errorCode,
      message: message,
      details: err.details || null,
      timestamp: err.timestamp || new Date().toISOString(),
    },
  });
}
