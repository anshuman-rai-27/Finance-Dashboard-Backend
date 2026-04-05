import { describe, it, expect, vi } from "vitest";
import request from "supertest";
import { prisma } from "../src/config/prisma.js";
import { hashPassword } from "../src/utils/password.js";

const getApp = async () => {
  const mod = await import("../src/app.js");
  return mod.createApp();
};

const seedAdminWithRecords = async (app: ReturnType<typeof getApp> extends Promise<infer T> ? T : never) => {
  const passwordHash = await hashPassword("Str0ng!Password123");
  const admin = await prisma.user.create({
    data: {
      name: "Admin",
      email: "admin@example.com",
      passwordHash,
      role: "admin",
      status: "active",
      passwordChangedAt: new Date()
    }
  });

  await prisma.financialRecord.createMany({
    data: [
      {
        amount: 1000,
        type: "income",
        category: "salary",
        date: new Date("2026-04-01T00:00:00.000Z"),
        createdBy: admin.id
      },
      {
        amount: 400,
        type: "expense",
        category: "rent",
        date: new Date("2026-04-02T00:00:00.000Z"),
        createdBy: admin.id
      }
    ]
  });

  const login = await request(app)
    .post("/auth/login")
    .send({ email: "admin@example.com", password: "Str0ng!Password123" });

  return login.body.data.token as string;
};

describe("Summary", () => {
  it("returns totals and net balance", async () => {
    vi.resetModules();
    const app = await getApp();
    const token = await seedAdminWithRecords(app);

    const res = await request(app)
      .get("/summary")
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.data.totalIncome).toBe(1000);
    expect(res.body.data.totalExpense).toBe(400);
    expect(res.body.data.netBalance).toBe(600);
  });

  it("ignores soft-deleted records", async () => {
    vi.resetModules();
    const app = await getApp();
    const token = await seedAdminWithRecords(app);

    const record = await prisma.financialRecord.findFirst({
      where: { category: "rent" }
    });

    await prisma.financialRecord.update({
      where: { id: record!.id },
      data: { deletedAt: new Date() }
    });

    const res = await request(app)
      .get("/summary")
      .set("Authorization", `Bearer ${token}`);

    expect(res.body.data.totalExpense).toBe(0);
  });
});