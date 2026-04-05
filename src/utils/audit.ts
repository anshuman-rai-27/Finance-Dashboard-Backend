import { prisma } from "../config/prisma.js";
import type { AuditAction } from "@prisma/client";

export type AuditContext = {
  userId?: string | null;
  ip?: string | null;
  userAgent?: string | null;
  metadata?: Record<string, unknown> | null;
};

export const writeAuditLog = async (action: AuditAction, context: AuditContext) => {
  await prisma.auditLog.create({
    data: {
      action,
      userId: context.userId ?? undefined,
      ip: context.ip ?? undefined,
      userAgent: context.userAgent ?? undefined,
      metadata: context.metadata ?? undefined
    }
  });
};