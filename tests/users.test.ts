import { describe, it, expect, vi } from "vitest";
import request from "supertest";
import { prisma } from "../src/config/prisma.js";
import { hashPassword } from "../src/utils/password.js";

const getApp = async () => {
  const mod = await import("../src/app.js");
  return mod.createApp();
};

const seedAdmin = async () => {
  const passwordHash = await hashPassword("Str0ng!Password123");
  return prisma.user.create({
    data: {
      name: "Admin",
      email: "admin@example.com",
      passwordHash,
      role: "admin",
      status: "active",
      passwordChangedAt: new Date()
    }
  });
};

const loginAdmin = async (app: ReturnType<typeof getApp> extends Promise<infer T> ? T : never) => {
  await seedAdmin();
  const res = await request(app)
    .post("/auth/login")
    .send({ email: "admin@example.com", password: "Str0ng!Password123" });
  return res.body.data.token as string;
};

describe("Users", () => {
  it("admin can create a user", async () => {
    vi.resetModules();
    const app = await getApp();
    const token = await loginAdmin(app);

    const res = await request(app)
      .post("/users")
      .set("Authorization", `Bearer ${token}`)
      .send({
        name: "Analyst",
        email: "analyst@example.com",
        password: "Str0ng!Password123",
        role: "analyst"
      });

    expect(res.status).toBe(201);
    expect(res.body.data.role).toBe("analyst");
  });

  it("non-admin is forbidden", async () => {
    vi.resetModules();
    const app = await getApp();

    const passwordHash = await hashPassword("Str0ng!Password123");
    await prisma.user.create({
      data: {
        name: "Viewer",
        email: "viewer@example.com",
        passwordHash,
        role: "viewer",
        status: "active",
        passwordChangedAt: new Date()
      }
    });

    const login = await request(app)
      .post("/auth/login")
      .send({ email: "viewer@example.com", password: "Str0ng!Password123" });

    const res = await request(app)
      .post("/users")
      .set("Authorization", `Bearer ${login.body.data.token}`)
      .send({
        name: "Test",
        email: "test@example.com",
        password: "Str0ng!Password123",
        role: "viewer"
      });

    expect(res.status).toBe(403);
  });
});