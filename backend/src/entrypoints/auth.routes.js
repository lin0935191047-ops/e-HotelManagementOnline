import { Router } from "express";
import { AuthController } from "../controllers/auth.controller.js";
import { authenticateToken } from "../common/middlewares/auth.middleware.js";

const router = Router();

router.post("/login", AuthController.login);
router.get("/me", authenticateToken, AuthController.getMe);
router.post("/logout", authenticateToken, AuthController.logout);

export default router;
