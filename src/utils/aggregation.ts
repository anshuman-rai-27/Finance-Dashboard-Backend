import type { FinancialRecord } from "@prisma/client";

export type TrendPeriod = "monthly" | "weekly";

const pad = (value: number) => String(value).padStart(2, "0");

const startOfWeek = (date: Date) => {
  const d = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  const day = d.getUTCDay();
  const diff = (day === 0 ? -6 : 1) - day; // Monday as start of week
  d.setUTCDate(d.getUTCDate() + diff);
  return d;
};

export const groupTrends = (records: FinancialRecord[], period: TrendPeriod) => {
  const buckets = new Map<string, { income: number; expense: number }>();

  records.forEach((record) => {
    const date = record.date instanceof Date ? record.date : new Date(record.date);
    let key = "";

    if (period === "monthly") {
      key = `${date.getUTCFullYear()}-${pad(date.getUTCMonth() + 1)}`;
    } else {
      const start = startOfWeek(date);
      key = `${start.getUTCFullYear()}-W${pad(Math.ceil((start.getUTCDate() + 6) / 7))}`;
    }

    if (!buckets.has(key)) {
      buckets.set(key, { income: 0, expense: 0 });
    }

    const bucket = buckets.get(key)!;
    if (record.type === "income") {
      bucket.income += record.amount;
    } else {
      bucket.expense += record.amount;
    }
  });

  return Array.from(buckets.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([periodKey, totals]) => ({
      period: periodKey,
      income: totals.income,
      expense: totals.expense,
      net: totals.income - totals.expense
    }));
};