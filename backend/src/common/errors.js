/**
 * Chuẩn hóa lỗi hệ thống e-Hotel theo RFC 7807 Problem Details
 */
export class AppError extends Error {
  constructor(code, message, statusCode = 400, details = null) {
    super(message);
    this.name = "AppError";
    this.code = code;
    this.statusCode = statusCode;
    this.details = details;
    this.timestamp = new Date().toISOString();
  }
}

export const ErrorCodes = {
  VALIDATION_FAILED: "VALIDATION_FAILED",
  UNAUTHORIZED: "UNAUTHORIZED",
  FORBIDDEN_ACCESS: "FORBIDDEN_ACCESS",
  RESOURCE_NOT_FOUND: "RESOURCE_NOT_FOUND",
  ROOM_QUOTA_EXCEEDED: "ROOM_QUOTA_EXCEEDED",
  INVALID_DATE_RANGE: "INVALID_DATE_RANGE",
  ROOM_CANNOT_BE_DELETED: "ROOM_CANNOT_BE_DELETED",
  SERVICE_CANNOT_BE_DELETED: "SERVICE_CANNOT_BE_DELETED",
  PROMOTION_CANNOT_BE_DELETED: "PROMOTION_CANNOT_BE_DELETED",
  PAYMENT_FAILED: "PAYMENT_FAILED",
  CANCELLATION_INVALID: "CANCELLATION_INVALID",
  ROOM_ALREADY_OCCUPIED: "ROOM_ALREADY_OCCUPIED",
  INTERNAL_SERVER_ERROR: "INTERNAL_SERVER_ERROR",
};
