import { Router } from "express";
import { z } from "zod";
import { prisma } from "../config/prisma.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { validate } from "../middleware/validate.js";
import { authenticate } from "../middleware/auth.js";
import { authorize } from "../middleware/rbac.js";
import { AppError } from "../middleware/error.js";
import { writeAuditLog } from "../utils/audit.js";

const router = Router();

const createRecordSchema = z.object({
  body: z.object({
    amount: z.number().positive(),
    type: z.enum(["income", "expense"]),
    category: z.string().min(2),
    date: z.string().datetime(),
    notes: z.string().optional()
  }),
  params: z.object({}).optional(),
  query: z.object({}).optional()
});

const updateRecordSchema = z.object({
  body: z.object({
    amount: z.number().positive().optional(),
    type: z.enum(["income", "expense"]).optional(),
    category: z.string().min(2).optional(),
    date: z.string().datetime().optional(),
    notes: z.string().optional()
  }),
  params: z.object({
    id: z.string().min(1)
  }),
  query: z.object({}).optional()
});

const listQuerySchema = z.object({
  body: z.object({}).optional(),
  params: z.object({}).optional(),
  query: z.object({
    dateFrom: z.string().datetime().optional(),
    dateTo: z.string().datetime().optional(),
    category: z.string().optional(),
    type: z.enum(["income", "expense"]).optional(),
    search: z.string().optional(),
    page: z.coerce.number().int().min(1).default(1),
    pageSize: z.coerce.number().int().min(1).max(100).default(20),
    includeDeleted: z.coerce.boolean().optional()
  })
});

router.use(authenticate);

router.post(
  "/",
  authorize(["admin"]),
  validate(createRecordSchema),
  asyncHandler(async (req, res) => {
    const { amount, type, category, date, notes } = req.body as z.infer<typeof createRecordSchema>["body"];

    const record = await prisma.financialRecord.create({
      data: {
        amount,
        type,
        category,
        date: new Date(date),
        notes,
        createdBy: req.user!.userId
      }
    });

    await writeAuditLog("record_create", {
      userId: req.user?.userId,
      ip: req.ip,
      userAgent: req.headers["user-agent"],
      metadata: { recordId: record.id }
    });

    return res.status(201).json({ success: true, data: record });
  })
);

router.get(
  "/",
  authorize(["viewer", "analyst", "admin"]),
  validate(listQuerySchema),
  asyncHandler(async (req, res) => {
    const { dateFrom, dateTo, category, type, search, page, pageSize, includeDeleted } =
      req.query as z.infer<typeof listQuerySchema>["query"];

    const where: any = {};
    if (!includeDeleted) {
      where.deletedAt = null;
    }
    if (category) where.category = category;
    if (type) where.type = type;
    if (dateFrom || dateTo) {
      where.date = {};
      if (dateFrom) where.date.gte = new Date(dateFrom);
      if (dateTo) where.date.lte = new Date(dateTo);
    }
    if (search) {
      where.OR = [
        { category: { contains: search, mode: "insensitive" } },
        { notes: { contains: search, mode: "insensitive" } }
      ];
    }

    const skip = (page - 1) * pageSize;
    const [records, total] = await Promise.all([
      prisma.financialRecord.findMany({
        where,
        orderBy: { date: "desc" },
        skip,
        take: pageSize
      }),
      prisma.financialRecord.count({ where })
    ]);

    return res.json({
      success: true,
      data: records,
      meta: {
        page,
        pageSize,
        total,
        totalPages: Math.ceil(total / pageSize)
      }
    });
  })
);

router.get(
  "/:id",
  authorize(["viewer", "analyst", "admin"]),
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    const record = await prisma.financialRecord.findFirst({
      where: { id, deletedAt: null }
    });
    if (!record) {
      throw new AppError("Record not found", 404);
    }

    return res.json({ success: true, data: record });
  })
);

router.patch(
  "/:id",
  authorize(["admin"]),
  validate(updateRecordSchema),
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { amount, type, category, date, notes } = req.body as z.infer<typeof updateRecordSchema>["body"];

    const existing = await prisma.financialRecord.findFirst({ where: { id, deletedAt: null } });
    if (!existing) {
      throw new AppError("Record not found", 404);
    }

    const record = await prisma.financialRecord.update({
      where: { id },
      data: {
        amount,
        type,
        category,
        date: date ? new Date(date) : undefined,
        notes
      }
    });

    await writeAuditLog("record_update", {
      userId: req.user?.userId,
      ip: req.ip,
      userAgent: req.headers["user-agent"],
      metadata: { recordId: record.id }
    });

    return res.json({ success: true, data: record });
  })
);

router.delete(
  "/:id",
  authorize(["admin"]),
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    const existing = await prisma.financialRecord.findFirst({ where: { id, deletedAt: null } });
    if (!existing) {
      throw new AppError("Record not found", 404);
    }

    await prisma.financialRecord.update({
      where: { id },
      data: { deletedAt: new Date() }
    });

    await writeAuditLog("record_delete", {
      userId: req.user?.userId,
      ip: req.ip,
      userAgent: req.headers["user-agent"],
      metadata: { recordId: id }
    });

    return res.status(204).send();
  })
);

export default router;