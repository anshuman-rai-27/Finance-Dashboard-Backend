import { describe, it, expect, vi } from "vitest";
import request from "supertest";
import { prisma } from "../src/config/prisma.js";
import { hashPassword } from "../src/utils/password.js";

const getApp = async () => {
  const mod = await import("../src/app.js");
  return mod.createApp();
};

const seedAdmin = async (app: ReturnType<typeof getApp> extends Promise<infer T> ? T : never) => {
  const passwordHash = await hashPassword("Str0ng!Password123");
  await prisma.user.create({
    data: {
      name: "Admin",
      email: "admin@example.com",
      passwordHash,
      role: "admin",
      status: "active",
      passwordChangedAt: new Date()
    }
  });

  const login = await request(app)
    .post("/auth/login")
    .send({ email: "admin@example.com", password: "Str0ng!Password123" });

  return login.body.data.token as string;
};

const seedViewer = async (app: ReturnType<typeof getApp> extends Promise<infer T> ? T : never) => {
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

  return login.body.data.token as string;
};

describe("Records", () => {
  it("admin can create and update records", async () => {
    vi.resetModules();
    const app = await getApp();
    const token = await seedAdmin(app);

    const create = await request(app)
      .post("/records")
      .set("Authorization", `Bearer ${token}`)
      .send({
        amount: 1200,
        type: "income",
        category: "salary",
        date: "2026-04-05T10:00:00.000Z"
      });

    expect(create.status).toBe(201);

    const update = await request(app)
      .patch(`/records/${create.body.data.id}`)
      .set("Authorization", `Bearer ${token}`)
      .send({
        notes: "Updated"
      });

    expect(update.status).toBe(200);
    expect(update.body.data.notes).toBe("Updated");
  });

  it("viewer cannot create records but can view", async () => {
    vi.resetModules();
    const app = await getApp();
    const adminToken = await seedAdmin(app);
    const viewerToken = await seedViewer(app);

    await request(app)
      .post("/records")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({
        amount: 800,
        type: "expense",
        category: "rent",
        date: "2026-04-05T10:00:00.000Z"
      });

    const create = await request(app)
      .post("/records")
      .set("Authorization", `Bearer ${viewerToken}`)
      .send({
        amount: 100,
        type: "expense",
        category: "food",
        date: "2026-04-05T10:00:00.000Z"
      });

    expect(create.status).toBe(403);

    const list = await request(app)
      .get("/records")
      .set("Authorization", `Bearer ${viewerToken}`);

    expect(list.status).toBe(200);
    expect(list.body.data.length).toBe(1);
  });

  it("soft deletes records and excludes them by default", async () => {
    vi.resetModules();
    const app = await getApp();
    const token = await seedAdmin(app);

    const create = await request(app)
      .post("/records")
      .set("Authorization", `Bearer ${token}`)
      .send({
        amount: 500,
        type: "income",
        category: "bonus",
        date: "2026-04-05T10:00:00.000Z"
      });

    await request(app)
      .delete(`/records/${create.body.data.id}`)
      .set("Authorization", `Bearer ${token}`);

    const list = await request(app)
      .get("/records")
      .set("Authorization", `Bearer ${token}`);

    expect(list.body.data.length).toBe(0);

    const listWithDeleted = await request(app)
      .get("/records?includeDeleted=true")
      .set("Authorization", `Bearer ${token}`);

    expect(listWithDeleted.body.data.length).toBe(1);
  });

  it("paginates and searches records", async () => {
    vi.resetModules();
    const app = await getApp();
    const token = await seedAdmin(app);

    await request(app)
      .post("/records")
      .set("Authorization", `Bearer ${token}`)
      .send({
        amount: 200,
        type: "expense",
        category: "food",
        date: "2026-04-05T10:00:00.000Z",
        notes: "Lunch"
      });

    await request(app)
      .post("/records")
      .set("Authorization", `Bearer ${token}`)
      .send({
        amount: 300,
        type: "expense",
        category: "travel",
        date: "2026-04-06T10:00:00.000Z",
        notes: "Taxi"
      });

    const search = await request(app)
      .get("/records?search=taxi&page=1&pageSize=1")
      .set("Authorization", `Bearer ${token}`);

    expect(search.status).toBe(200);
    expect(search.body.data.length).toBe(1);
    expect(search.body.meta.total).toBe(1);
  });
});