import { prisma } from "../config/prisma.js";
import type { AuditAction, Prisma } from "@prisma/client";

export type AuditContext = {
  userId?: string | null;
  ip?: string | null;
  userAgent?: string | null;
  metadata?: Prisma.InputJsonValue | null;
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
