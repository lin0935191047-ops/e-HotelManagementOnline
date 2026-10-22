import dotenv from "dotenv";
import path from "node:path";
import { fileURLToPath } from "node:url";

// Tải biến môi trường từ .env gốc hoặc .env tại backend
const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, "../../../.env") });
dotenv.config();

export const config = {
  port: parseInt(process.env.PORT || "3000", 10),
  databaseUrl:
    process.env.DATABASE_URL ||
    "postgres://postgres:Postgres@123@localhost:5432/ehotel_db",
  jwtSecret: process.env.JWT_SECRET || "super_secret_jwt_key_ehotel_2026",
  sessionTimeoutMinutes: parseInt(
    process.env.SESSION_TIMEOUT_MINUTES || "30",
    10,
  ),
};
