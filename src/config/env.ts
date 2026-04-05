import dotenv from "dotenv";

dotenv.config();

const isProd = process.env.NODE_ENV === "production";
const required = ["DATABASE_URL", "JWT_SECRET"];
const missing = required.filter((key) => !process.env[key]);

if (missing.length > 0) {
  if (isProd) {
    throw new Error(`Missing required env vars: ${missing.join(", ")}`);
  }
  // eslint-disable-next-line no-console
  console.warn(`Missing required env vars: ${missing.join(", ")}`);
}

const corsOrigins = process.env.CORS_ORIGIN
  ? process.env.CORS_ORIGIN.split(",").map((origin) => origin.trim()).filter(Boolean)
  : [];

export const env = {
  isProd,
  port: Number(process.env.PORT || 3000),
  databaseUrl: process.env.DATABASE_URL || "file:./dev.db",
  jwtSecret: process.env.JWT_SECRET || "dev-secret",
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || "1h",
  refreshTokenDays: Number(process.env.REFRESH_TOKEN_TTL_DAYS || 7),
  lockoutMaxAttempts: Number(process.env.LOCKOUT_MAX_ATTEMPTS || 5),
  lockoutMinutes: Number(process.env.LOCKOUT_DURATION_MIN || 15),
  allowBootstrap: process.env.ALLOW_BOOTSTRAP === "true",
  corsOrigins
};
