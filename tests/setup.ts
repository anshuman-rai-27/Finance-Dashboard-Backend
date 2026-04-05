import "dotenv/config";
import { beforeAll, afterAll, beforeEach } from "vitest";
import { prisma } from "../src/config/prisma.js";

process.env.NODE_ENV = "test";
process.env.ALLOW_BOOTSTRAP = process.env.ALLOW_BOOTSTRAP || "true";
process.env.LOCKOUT_MAX_ATTEMPTS = process.env.LOCKOUT_MAX_ATTEMPTS || "3";
process.env.LOCKOUT_DURATION_MIN = process.env.LOCKOUT_DURATION_MIN || "1";
process.env.JWT_SECRET = process.env.JWT_SECRET || "test-secret";

const resetDb = async () => {
  await prisma.auditLog.deleteMany();
  await prisma.refreshToken.deleteMany();
  await prisma.financialRecord.deleteMany();
  await prisma.user.deleteMany();
};

beforeAll(async () => {
  await resetDb();
});

beforeEach(async () => {
  await resetDb();
});

afterAll(async () => {
  await resetDb();
  await prisma.$disconnect();
});