import { Router } from "express";
import { z } from "zod";
import { prisma } from "../config/prisma.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { validate } from "../middleware/validate.js";
import { authorize } from "../middleware/rbac.js";
import { authenticate } from "../middleware/auth.js";
import { AppError } from "../middleware/error.js";
import { hashPassword, isStrongPassword } from "../utils/password.js";
import { writeAuditLog } from "../utils/audit.js";

const router = Router();

const createUserSchema = z.object({
  body: z.object({
    name: z.string().min(2),
    email: z.string().email(),
    password: z.string().min(12),
    role: z.enum(["viewer", "analyst", "admin"]).default("viewer")
  }),
  params: z.object({}).optional(),
  query: z.object({}).optional()
});

const updateUserSchema = z.object({
  body: z.object({
    role: z.enum(["viewer", "analyst", "admin"]).optional(),
    status: z.enum(["active", "inactive", "locked"]).optional()
  }),
  params: z.object({
    id: z.string().min(1)
  }),
  query: z.object({}).optional()
});

router.use(authenticate, authorize(["admin"]));

router.post(
  "/",
  validate(createUserSchema),
  asyncHandler(async (req, res) => {
    const { name, email, password, role } = req.body as z.infer<typeof createUserSchema>["body"];
    if (!isStrongPassword(password)) {
      throw new AppError("Password does not meet complexity requirements", 400);
    }

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      throw new AppError("Email already in use", 409);
    }

    const passwordHash = await hashPassword(password);
    const user = await prisma.user.create({
      data: {
        name,
        email,
        passwordHash,
        role,
        status: "active",
        passwordChangedAt: new Date()
      },
      select: { id: true, name: true, email: true, role: true, status: true, createdAt: true }
    });

    await writeAuditLog("user_create", {
      userId: req.user?.userId,
      ip: req.ip,
      userAgent: req.headers["user-agent"],
      metadata: { targetUserId: user.id, role: user.role }
    });

    return res.status(201).json({ success: true, data: user });
  })
);

router.get(
  "/",
  asyncHandler(async (_req, res) => {
    const users = await prisma.user.findMany({
      select: { id: true, name: true, email: true, role: true, status: true, createdAt: true },
      orderBy: { createdAt: "desc" }
    });

    return res.json({ success: true, data: users });
  })
);

router.get(
  "/:id",
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    const user = await prisma.user.findUnique({
      where: { id },
      select: { id: true, name: true, email: true, role: true, status: true, createdAt: true }
    });

    if (!user) {
      throw new AppError("User not found", 404);
    }

    return res.json({ success: true, data: user });
  })
);

router.patch(
  "/:id",
  validate(updateUserSchema),
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { role, status } = req.body as z.infer<typeof updateUserSchema>["body"];

    const existing = await prisma.user.findUnique({ where: { id } });
    if (!existing) {
      throw new AppError("User not found", 404);
    }

    const user = await prisma.user.update({
      where: { id },
      data: { role, status },
      select: { id: true, name: true, email: true, role: true, status: true, createdAt: true }
    });

    await writeAuditLog("user_update", {
      userId: req.user?.userId,
      ip: req.ip,
      userAgent: req.headers["user-agent"],
      metadata: { targetUserId: user.id, role: user.role, status: user.status }
    });

    return res.json({ success: true, data: user });
  })
);

export default router;