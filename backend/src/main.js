import express from "express";
import cors from "cors";
import { config } from "./common/config.js";
import { prisma } from "./common/prisma.js";
import { errorHandler } from "./common/middlewares/error.middleware.js";

import authRoutes from "./entrypoints/auth.routes.js";
import publicRoutes from "./entrypoints/public.routes.js";
import adminRoutes from "./entrypoints/admin.routes.js";
import setupRoutes from "./entrypoints/setup.routes.js";
import operationRoutes from "./entrypoints/operation.routes.js";

export const app = express();

app.use(cors());
app.use(express.json());

// Metadata & Health Check
app.get("/", (req, res) => {
  res.json({
    message: "e-Hotel Management API",
    status: "ok",
    version: "1.0.0",
    runtime: "Node.js",
  });
});

app.get("/api/health", async (req, res) => {
  try {
    const result = await prisma.$queryRaw`SELECT 1 as connected`;
    const isConnected = result && result.length > 0;
    return res.json({
      status: "healthy",
      database: isConnected ? "connected" : "disconnected",
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Unknown error";
    return res.status(500).json({
      status: "unhealthy",
      database: "disconnected",
      error: msg,
      timestamp: new Date().toISOString(),
    });
  }
});

// Đăng ký các phân hệ Routes theo đúng ma trận phân quyền
app.use("/api/auth", authRoutes);
app.use("/api/public", publicRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/setup", setupRoutes);
app.use("/api/operation", operationRoutes);

// Global Error Handler
app.use(errorHandler);

// Chạy server khi thực thi trực tiếp
if (process.argv[1] && import.meta.url.endsWith(process.argv[1].replace(/\\/g, "/"))) {
  app.listen(config.port, () => {
    console.log(`🚀 e-Hotel API server starting on port ${config.port} (Node.js)...`);
  });
}
