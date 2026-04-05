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

describe("Auth", () => {
  it("registers first admin when bootstrap is allowed", async () => {
    process.env.ALLOW_BOOTSTRAP = "true";
    vi.resetModules();
    const app = await getApp();

    const res = await request(app)
      .post("/auth/register")
      .send({
        name: "Admin",
        email: "admin@example.com",
        password: "Str0ng!Password123"
      });

    expect(res.status).toBe(201);
    expect(res.body.data.role).toBe("admin");
  });

  it("denies register when bootstrap disabled", async () => {
    process.env.ALLOW_BOOTSTRAP = "false";
    vi.resetModules();
    const app = await getApp();

    const res = await request(app)
      .post("/auth/register")
      .send({
        name: "Admin",
        email: "admin@example.com",
        password: "Str0ng!Password123"
      });

    expect(res.status).toBe(403);
  });

  it("logs in with valid credentials and returns refresh token", async () => {
    process.env.ALLOW_BOOTSTRAP = "true";
    vi.resetModules();
    const app = await getApp();
    await seedAdmin();

    const res = await request(app)
      .post("/auth/login")
      .send({ email: "admin@example.com", password: "Str0ng!Password123" });

    expect(res.status).toBe(200);
    expect(res.body.data.token).toBeTruthy();
    expect(res.body.data.refreshToken).toBeTruthy();
  });

  it("rotates refresh token on refresh", async () => {
    process.env.ALLOW_BOOTSTRAP = "true";
    vi.resetModules();
    const app = await getApp();
    await seedAdmin();

    const login = await request(app)
      .post("/auth/login")
      .send({ email: "admin@example.com", password: "Str0ng!Password123" });

    const refresh = await request(app)
      .post("/auth/refresh")
      .send({ refreshToken: login.body.data.refreshToken });

    expect(refresh.status).toBe(200);
    expect(refresh.body.data.token).toBeTruthy();
    expect(refresh.body.data.refreshToken).toBeTruthy();
  });

  it("locks out after repeated failed logins", async () => {
    process.env.LOCKOUT_MAX_ATTEMPTS = "2";
    vi.resetModules();
    const app = await getApp();
    await seedAdmin();

    await request(app)
      .post("/auth/login")
      .send({ email: "admin@example.com", password: "WrongPassword123!" });

    await request(app)
      .post("/auth/login")
      .send({ email: "admin@example.com", password: "WrongPassword123!" });

    const locked = await request(app)
      .post("/auth/login")
      .send({ email: "admin@example.com", password: "Str0ng!Password123" });

    expect(locked.status).toBe(423);
  });
});