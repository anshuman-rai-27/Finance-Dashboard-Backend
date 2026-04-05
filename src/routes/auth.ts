import { Router } from "express";
import jwt from "jsonwebtoken";
import { z } from "zod";
import { prisma } from "../config/prisma.js";
import { env } from "../config/env.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { validate } from "../middleware/validate.js";
import { AppError } from "../middleware/error.js";
import { hashPassword, verifyPassword, isStrongPassword } from "../utils/password.js";
import { writeAuditLog } from "../utils/audit.js";
import crypto from "crypto";

const router = Router();

const registerSchema = z.object({
  body: z.object({
    name: z.string().min(2),
    email: z.string().email(),
    password: z.string().min(12),
    role: z.enum(["viewer", "analyst", "admin"]).optional()
  }),
  params: z.object({}).optional(),
  query: z.object({}).optional()
});

const loginSchema = z.object({
  body: z.object({
    email: z.string().email(),
    password: z.string().min(12)
  }),
  params: z.object({}).optional(),
  query: z.object({}).optional()
});

const refreshSchema = z.object({
  body: z.object({
    refreshToken: z.string().min(20)
  }),
  params: z.object({}).optional(),
  query: z.object({}).optional()
});

const logoutSchema = z.object({
  body: z.object({
    refreshToken: z.string().min(20)
  }),
  params: z.object({}).optional(),
  query: z.object({}).optional()
});

const createRefreshToken = (userId: string) => {
  const refreshToken = crypto.randomBytes(64).toString("hex");
  const tokenHash = crypto.createHash("sha256").update(refreshToken).digest("hex");
  const expiresAt = new Date(Date.now() + env.refreshTokenDays * 24 * 60 * 60 * 1000);

  return { refreshToken, tokenHash, expiresAt, userId };
};

router.post(
  "/register",
  validate(registerSchema),
  asyncHandler(async (req, res) => {
    const { name, email, password, role } = req.body as z.infer<typeof registerSchema>["body"];

    if (!isStrongPassword(password)) {
      throw new AppError("Password does not meet complexity requirements", 400);
    }

    const userCount = await prisma.user.count();
    let adminUserId: string | null = null;
    if (userCount === 0 && !env.allowBootstrap) {
      throw new AppError("Admin bootstrap disabled", 403);
    }

    if (userCount > 0) {
      const authHeader = req.headers.authorization;
      if (!authHeader || !authHeader.startsWith("Bearer ")) {
        throw new AppError("Admin authorization required", 403);
      }

      const token = authHeader.replace("Bearer ", "");
      try {
        const payload = jwt.verify(token, env.jwtSecret) as { role?: string; userId?: string };
        if (payload.role !== "admin") {
          throw new AppError("Admin authorization required", 403);
        }
        adminUserId = payload.userId ?? null;
      } catch (error) {
        throw new AppError("Admin authorization required", 403);
      }
    }

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      throw new AppError("Email already in use", 409);
    }

    const passwordHash = await hashPassword(password);
    const finalRole = userCount === 0 ? "admin" : role ?? "viewer";

    const user = await prisma.user.create({
      data: {
        name,
        email,
        passwordHash,
        role: finalRole,
        status: "active",
        passwordChangedAt: new Date()
      },
      select: { id: true, name: true, email: true, role: true, status: true, createdAt: true }
    });

    await writeAuditLog("user_create", {
      userId: userCount === 0 ? user.id : adminUserId,
      ip: req.ip,
      userAgent: req.headers["user-agent"],
      metadata: { targetUserId: user.id, role: user.role }
    });

    return res.status(201).json({ success: true, data: user });
  })
);

router.post(
  "/login",
  validate(loginSchema),
  asyncHandler(async (req, res) => {
    const { email, password } = req.body as z.infer<typeof loginSchema>["body"];

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      await writeAuditLog("auth_login_failure", {
        ip: req.ip,
        userAgent: req.headers["user-agent"],
        metadata: { email }
      });
      throw new AppError("Invalid credentials", 401);
    }

    if (user.status === "inactive") {
      throw new AppError("User is inactive", 403);
    }

    if (user.lockUntil && user.lockUntil > new Date()) {
      throw new AppError("Account is temporarily locked", 423);
    }

    const isValid = await verifyPassword(password, user.passwordHash);
    if (!isValid) {
      const attempts = user.failedLoginAttempts + 1;
      const shouldLock = attempts >= env.lockoutMaxAttempts;
      await prisma.user.update({
        where: { id: user.id },
        data: {
          failedLoginAttempts: attempts,
          lockUntil: shouldLock ? new Date(Date.now() + env.lockoutMinutes * 60 * 1000) : null,
          status: shouldLock ? "locked" : user.status
        }
      });

      await writeAuditLog("auth_login_failure", {
        userId: user.id,
        ip: req.ip,
        userAgent: req.headers["user-agent"],
        metadata: { attempts }
      });

      throw new AppError("Invalid credentials", 401);
    }

    if (user.status === "locked") {
      await prisma.user.update({
        where: { id: user.id },
        data: { status: "active", lockUntil: null }
      });
    }

    await prisma.user.update({
      where: { id: user.id },
      data: {
        failedLoginAttempts: 0,
        lockUntil: null,
        lastLoginAt: new Date()
      }
    });

    await prisma.refreshToken.deleteMany({ where: { userId: user.id } });
    const refresh = createRefreshToken(user.id);
    await prisma.refreshToken.create({
      data: {
        userId: refresh.userId,
        tokenHash: refresh.tokenHash,
        expiresAt: refresh.expiresAt
      }
    });

    const token = jwt.sign(
      { userId: user.id, role: user.role },
      env.jwtSecret,
      { expiresIn: env.jwtExpiresIn }
    );

    await writeAuditLog("auth_login_success", {
      userId: user.id,
      ip: req.ip,
      userAgent: req.headers["user-agent"],
      metadata: { role: user.role }
    });

    return res.json({
      success: true,
      data: {
        token,
        refreshToken: refresh.refreshToken,
        user: { id: user.id, name: user.name, email: user.email, role: user.role, status: user.status }
      }
    });
  })
);

router.post(
  "/refresh",
  validate(refreshSchema),
  asyncHandler(async (req, res) => {
    const { refreshToken } = req.body as z.infer<typeof refreshSchema>["body"];
    const tokenHash = crypto.createHash("sha256").update(refreshToken).digest("hex");

    const stored = await prisma.refreshToken.findUnique({ where: { tokenHash } });
    if (!stored || stored.revokedAt || stored.expiresAt < new Date()) {
      throw new AppError("Invalid refresh token", 401);
    }

    const user = await prisma.user.findUnique({ where: { id: stored.userId } });
    if (!user || user.status !== "active") {
      throw new AppError("User not active", 403);
    }

    await prisma.refreshToken.update({
      where: { id: stored.id },
      data: { revokedAt: new Date() }
    });

    const refresh = createRefreshToken(user.id);
    await prisma.refreshToken.create({
      data: {
        userId: refresh.userId,
        tokenHash: refresh.tokenHash,
        expiresAt: refresh.expiresAt
      }
    });

    const token = jwt.sign(
      { userId: user.id, role: user.role },
      env.jwtSecret,
      { expiresIn: env.jwtExpiresIn }
    );

    await writeAuditLog("auth_refresh", {
      userId: user.id,
      ip: req.ip,
      userAgent: req.headers["user-agent"],
      metadata: { rotated: true }
    });

    return res.json({
      success: true,
      data: {
        token,
        refreshToken: refresh.refreshToken
      }
    });
  })
);

router.post(
  "/logout",
  validate(logoutSchema),
  asyncHandler(async (req, res) => {
    const { refreshToken } = req.body as z.infer<typeof logoutSchema>["body"];
    const tokenHash = crypto.createHash("sha256").update(refreshToken).digest("hex");

    const existing = await prisma.refreshToken.findUnique({ where: { tokenHash } });
    if (existing && !existing.revokedAt) {
      await prisma.refreshToken.update({
        where: { id: existing.id },
        data: { revokedAt: new Date() }
      });
    }

    await writeAuditLog("auth_logout", {
      userId: existing?.userId,
      ip: req.ip,
      userAgent: req.headers["user-agent"],
      metadata: { tokenRevoked: true }
    });

    return res.json({ success: true, data: { loggedOut: true } });
  })
);

export default router;
