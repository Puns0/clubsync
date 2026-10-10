import type { PrismaClient } from '@prisma/client';

export interface AuditRecord {
  actorId?: string | null;
  action: string;
  targetType: string;
  targetId?: string | null;
  meta?: Record<string, unknown>;
  ip?: string | null;
}

export interface AuditService {
  record(entry: AuditRecord): Promise<void>;
}

export function createAuditService(prisma: PrismaClient): AuditService {
  return {
    async record(entry) {
      await prisma.auditLog.create({
        data: {
          actorId: entry.actorId ?? null,
          action: entry.action,
          targetType: entry.targetType,
          targetId: entry.targetId ?? null,
          meta: (entry.meta ?? {}) as object,
          ip: entry.ip ?? null,
        },
      });
    },
  };
}
