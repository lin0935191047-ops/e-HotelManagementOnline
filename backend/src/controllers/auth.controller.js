import { AuthService } from "../services/auth.service.js";

export class AuthController {
  static async login(req, res, next) {
    try {
      const { username, password } = req.body || {};
      const result = await AuthService.login({ username, password });
      return res.json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  static async getMe(req, res, next) {
    try {
      const profile = await AuthService.getProfile(req.user.id);
      return res.json({
        success: true,
        data: profile,
      });
    } catch (error) {
      next(error);
    }
  }

  static async logout(req, res, next) {
    try {
      return res.json({
        success: true,
        message: "Đăng xuất thành công.",
      });
    } catch (error) {
      next(error);
    }
  }
}
