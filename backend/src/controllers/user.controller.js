import { UserService } from "../services/user.service.js";

export class UserController {
  static async list(req, res, next) {
    try {
      const { search, role, page, limit } = req.query;
      const result = await UserService.listUsers({ search, role, page, limit });
      return res.json({
        success: true,
        data: result.users,
        pagination: result.pagination,
      });
    } catch (error) {
      next(error);
    }
  }

  static async getById(req, res, next) {
    try {
      const user = await UserService.getUserById(req.params.id);
      return res.json({
        success: true,
        data: user,
      });
    } catch (error) {
      next(error);
    }
  }

  static async create(req, res, next) {
    try {
      const newUser = await UserService.createUser(req.body);
      return res.status(201).json({
        success: true,
        data: newUser,
        message: "Tạo người dùng mới thành công.",
      });
    } catch (error) {
      next(error);
    }
  }

  static async update(req, res, next) {
    try {
      const updatedUser = await UserService.updateUser(
        req.params.id,
        req.body,
        req.user.id,
      );
      return res.json({
        success: true,
        data: updatedUser,
        message: "Cập nhật người dùng thành công.",
      });
    } catch (error) {
      next(error);
    }
  }

  static async delete(req, res, next) {
    try {
      const result = await UserService.deleteUser(req.params.id, req.user.id);
      return res.json({
        success: true,
        message: result.message,
      });
    } catch (error) {
      next(error);
    }
  }
}
