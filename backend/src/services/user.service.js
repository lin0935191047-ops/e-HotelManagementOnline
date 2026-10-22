import bcrypt from "bcryptjs";
import { prisma } from "../common/prisma.js";
import { AppError, ErrorCodes } from "../common/errors.js";

const VALID_ROLES = ["ADMIN", "MANAGER", "SALE"];

export class UserService {
  /**
   * Lấy danh sách người dùng hệ thống có phân trang & lọc
   */
  static async listUsers({ search = "", role = "", page = 1, limit = 50 }) {
    const where = {};

    if (role && VALID_ROLES.includes(role.toUpperCase())) {
      where.role = role.toUpperCase();
    }

    if (search && search.trim()) {
      const keyword = search.trim();
      where.OR = [
        { username: { contains: keyword, mode: "insensitive" } },
        { fullName: { contains: keyword, mode: "insensitive" } },
      ];
    }

    const skip = (Math.max(1, parseInt(page, 10)) - 1) * parseInt(limit, 10);
    const take = parseInt(limit, 10);

    const [total, users] = await Promise.all([
      prisma.user.count({ where }),
      prisma.user.findMany({
        where,
        select: {
          id: true,
          username: true,
          fullName: true,
          role: true,
          isActive: true,
          lastActiveAt: true,
          createdAt: true,
        },
        orderBy: { id: "asc" },
        skip,
        take,
      }),
    ]);

    return {
      users,
      pagination: {
        total,
        page: parseInt(page, 10),
        limit: take,
        totalPages: Math.ceil(total / take) || 1,
      },
    };
  }

  /**
   * Xem chi tiết 1 người dùng theo ID
   */
  static async getUserById(id) {
    const userId = parseInt(id, 10);
    if (isNaN(userId)) {
      throw new AppError(ErrorCodes.VALIDATION_FAILED, "ID người dùng không hợp lệ.", 400);
    }

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
      throw new AppError(ErrorCodes.RESOURCE_NOT_FOUND, "Không tìm thấy người dùng.", 404);
    }

    return user;
  }

  /**
   * Tạo tài khoản người dùng mới
   */
  static async createUser({ username, password, fullName, role, isActive = true }) {
    if (!username || !username.trim()) {
      throw new AppError(ErrorCodes.VALIDATION_FAILED, "Tên đăng nhập không được để trống.", 400);
    }

    const cleanUsername = username.trim().toLowerCase();
    if (cleanUsername.length < 3) {
      throw new AppError(ErrorCodes.VALIDATION_FAILED, "Tên đăng nhập phải có ít nhất 3 ký tự.", 400);
    }

    if (!password || password.length < 6) {
      throw new AppError(ErrorCodes.VALIDATION_FAILED, "Mật khẩu phải có ít nhất 6 ký tự.", 400);
    }

    if (!fullName || !fullName.trim()) {
      throw new AppError(ErrorCodes.VALIDATION_FAILED, "Họ và tên không được để trống.", 400);
    }

    const cleanRole = role ? role.toUpperCase() : "";
    if (!VALID_ROLES.includes(cleanRole)) {
      throw new AppError(
        ErrorCodes.VALIDATION_FAILED,
        `Vai trò '${role}' không hợp lệ. Chỉ chấp nhận: ADMIN, MANAGER, SALE.`,
        400,
      );
    }

    // Kiểm tra trùng username
    const existing = await prisma.user.findUnique({
      where: { username: cleanUsername },
    });

    if (existing) {
      throw new AppError(
        ErrorCodes.VALIDATION_FAILED,
        `Tên đăng nhập '${cleanUsername}' đã tồn tại trong hệ thống.`,
        400,
      );
    }

    // Hash mật khẩu
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    const newUser = await prisma.user.create({
      data: {
        username: cleanUsername,
        passwordHash,
        fullName: fullName.trim(),
        role: cleanRole,
        isActive: Boolean(isActive),
      },
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

    return newUser;
  }

  /**
   * Cập nhật thông tin người dùng
   */
  static async updateUser(id, { fullName, role, isActive, password }, currentUserId) {
    const userId = parseInt(id, 10);
    if (isNaN(userId)) {
      throw new AppError(ErrorCodes.VALIDATION_FAILED, "ID người dùng không hợp lệ.", 400);
    }

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new AppError(ErrorCodes.RESOURCE_NOT_FOUND, "Không tìm thấy người dùng.", 404);
    }

    const updateData = {};

    if (fullName !== undefined) {
      if (!fullName.trim()) {
        throw new AppError(ErrorCodes.VALIDATION_FAILED, "Họ và tên không được để trống.", 400);
      }
      updateData.fullName = fullName.trim();
    }

    if (role !== undefined) {
      const cleanRole = role.toUpperCase();
      if (!VALID_ROLES.includes(cleanRole)) {
        throw new AppError(
          ErrorCodes.VALIDATION_FAILED,
          `Vai trò '${role}' không hợp lệ. Chỉ chấp nhận: ADMIN, MANAGER, SALE.`,
          400,
        );
      }
      // Không cho phép tự hạ role của chính mình nếu là Admin duy nhất
      if (user.id === currentUserId && cleanRole !== "ADMIN") {
        throw new AppError(
          ErrorCodes.VALIDATION_FAILED,
          "Bạn không thể tự hạ quyền Admin của chính tài khoản đang đăng nhập.",
          400,
        );
      }
      updateData.role = cleanRole;
    }

    if (isActive !== undefined) {
      // Không cho phép tự khóa tài khoản của chính mình
      if (user.id === currentUserId && isActive === false) {
        throw new AppError(
          ErrorCodes.VALIDATION_FAILED,
          "Bạn không thể tự vô hiệu hóa tài khoản của chính mình.",
          400,
        );
      }
      updateData.isActive = Boolean(isActive);
    }

    if (password !== undefined && password !== "") {
      if (password.length < 6) {
        throw new AppError(ErrorCodes.VALIDATION_FAILED, "Mật khẩu mới phải có ít nhất 6 ký tự.", 400);
      }
      const salt = await bcrypt.genSalt(10);
      updateData.passwordHash = await bcrypt.hash(password, salt);
    }

    const updated = await prisma.user.update({
      where: { id: userId },
      data: updateData,
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

    return updated;
  }

  /**
   * Xóa người dùng khỏi hệ thống
   */
  static async deleteUser(id, currentUserId) {
    const userId = parseInt(id, 10);
    if (isNaN(userId)) {
      throw new AppError(ErrorCodes.VALIDATION_FAILED, "ID người dùng không hợp lệ.", 400);
    }

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new AppError(ErrorCodes.RESOURCE_NOT_FOUND, "Không tìm thấy người dùng.", 404);
    }

    // Không cho phép tự xóa tài khoản của chính mình
    if (user.id === currentUserId) {
      throw new AppError(
        ErrorCodes.VALIDATION_FAILED,
        "Không thể xóa tài khoản của chính bạn đang đăng nhập.",
        400,
      );
    }

    // Nếu là Admin, kiểm tra xem còn Admin nào khác không
    if (user.role === "ADMIN") {
      const adminCount = await prisma.user.count({
        where: { role: "ADMIN", isActive: true },
      });
      if (adminCount <= 1) {
        throw new AppError(
          ErrorCodes.VALIDATION_FAILED,
          "Hệ thống phải có ít nhất một Quản trị viên (ADMIN) hoạt động. Không thể xóa.",
          400,
        );
      }
    }

    await prisma.user.delete({ where: { id: userId } });
    return { message: `Đã xóa người dùng '${user.username}' thành công.` };
  }
}
