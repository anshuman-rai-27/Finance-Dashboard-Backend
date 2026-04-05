import { Router } from "express";
import { z } from "zod";
import { prisma } from "../config/prisma.js";
import { authenticate } from "../middleware/auth.js";
import { authorize } from "../middleware/rbac.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { validate } from "../middleware/validate.js";
import { groupTrends } from "../utils/aggregation.js";

const router = Router();

const trendsQuerySchema = z.object({
  body: z.object({}).optional(),
  params: z.object({}).optional(),
  query: z.object({
    period: z.enum(["monthly", "weekly"]).default("monthly"),
    dateFrom: z.string().datetime().optional(),
    dateTo: z.string().datetime().optional()
  })
});

const recentQuerySchema = z.object({
  body: z.object({}).optional(),
  params: z.object({}).optional(),
  query: z.object({
    limit: z.coerce.number().int().positive().max(50).default(5)
  })
});

router.use(authenticate, authorize(["viewer", "analyst", "admin"]));

router.get(
  "/",
  asyncHandler(async (_req, res) => {
    const incomeAgg = await prisma.financialRecord.aggregate({
      _sum: { amount: true },
      where: { type: "income", deletedAt: null }
    });

    const expenseAgg = await prisma.financialRecord.aggregate({
      _sum: { amount: true },
      where: { type: "expense", deletedAt: null }
    });

    const totalIncome = incomeAgg._sum.amount ?? 0;
    const totalExpense = expenseAgg._sum.amount ?? 0;

    const categoryTotals = await prisma.financialRecord.groupBy({
      by: ["category", "type"],
      _sum: { amount: true },
      where: { deletedAt: null }
    });

    const categories = categoryTotals.map((item) => ({
      category: item.category,
      type: item.type,
      total: item._sum.amount ?? 0
    }));

    return res.json({
      success: true,
      data: {
        totalIncome,
        totalExpense,
        netBalance: totalIncome - totalExpense,
        categories
      }
    });
  })
);

router.get(
  "/recent",
  validate(recentQuerySchema),
  asyncHandler(async (req, res) => {
    const { limit } = req.query as unknown as z.infer<typeof recentQuerySchema>["query"];
    const records = await prisma.financialRecord.findMany({
      where: { deletedAt: null },
      take: limit,
      orderBy: { date: "desc" }
    });

    return res.json({ success: true, data: records });
  })
);

router.get(
  "/trends",
  validate(trendsQuerySchema),
  asyncHandler(async (req, res) => {
    const { period, dateFrom, dateTo } = req.query as unknown as z.infer<typeof trendsQuerySchema>["query"];

    const where: any = { deletedAt: null };
    if (dateFrom || dateTo) {
      where.date = {};
      if (dateFrom) where.date.gte = new Date(dateFrom);
      if (dateTo) where.date.lte = new Date(dateTo);
    }

    const records = await prisma.financialRecord.findMany({
      where,
      orderBy: { date: "asc" }
    });

    const trendData = groupTrends(records, period);

    return res.json({ success: true, data: trendData });
  })
);

export default router;
