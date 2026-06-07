import crypto from "node:crypto";
import type {
  AuditExportAttemptFilter,
  AuditLog,
  AuditLogFilter,
  UserAccount,
} from "../../domain/types";
import { tooManyRequests } from "../../http/errors";
import { auditLogRepository } from "../../repositories";

interface AuditRecordInput {
  actor?: UserAccount | null;
  action: string;
  resourceType: string;
  resourceId: string;
  before?: unknown;
  after?: unknown;
  reason?: string;
}

interface AuditExportInput {
  actor: UserAccount;
  scope: "admin" | "koordinator";
  filter?: AuditLogFilter | number;
  filename: string;
}

interface AuditExportResult {
  csv: string;
  rowCount: number;
}

interface AuditExportAttemptCleanupInput {
  actor: UserAccount;
  dryRun: boolean;
  allowedRetentionDays: number;
  blockedRetentionDays: number;
  limit: number;
}

const exportGuardWindowSeconds = 60;
const exportGuardWindowMs = exportGuardWindowSeconds * 1000;
const exportGuardMaxAttempts = 5;

const csvCell = (value: unknown) => {
  const text = String(value ?? "");
  return `"${text.replace(/"/g, '""')}"`;
};

const sensitiveKeyPattern =
  /(password|passcode|token|secret|hash|authorization|credential|session|cookie)/i;

const redactSensitivePayload = (value: unknown): unknown => {
  if (Array.isArray(value)) {
    return value.map(redactSensitivePayload);
  }

  if (!value || typeof value !== "object") {
    return value;
  }

  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>).map(([key, entryValue]) => [
      key,
      sensitiveKeyPattern.test(key) ? "[REDACTED]" : redactSensitivePayload(entryValue),
    ])
  );
};

const auditLogToCsvRow = (entry: AuditLog) =>
  [
    entry.createdAt,
    entry.action,
    entry.actorRole || "",
    entry.actorId || "",
    entry.resourceType,
    entry.resourceId,
    entry.reason || "",
    JSON.stringify(redactSensitivePayload(entry.before ?? {})),
    JSON.stringify(redactSensitivePayload(entry.after ?? {})),
  ].map(csvCell);

const normalizeFilter = (filter?: AuditLogFilter | number): AuditLogFilter =>
  typeof filter === "number" ? { limit: filter } : filter || {};

const guardExportAttempt = async (actor: UserAccount, scope: "admin" | "koordinator") => {
  const attemptedAt = new Date();
  const attempt = await auditLogRepository.recordExportAttempt({
    id: crypto.randomUUID(),
    actorId: actor.id,
    actorRole: actor.role,
    scope,
    attemptedAt: attemptedAt.toISOString(),
    windowStartedAt: new Date(attemptedAt.getTime() - exportGuardWindowMs).toISOString(),
    maxAttempts: exportGuardMaxAttempts,
    windowSeconds: exportGuardWindowSeconds,
  });

  if (!attempt.allowed) {
    throw tooManyRequests("Export audit terlalu sering. Coba lagi beberapa saat.", {
      scope,
      retryAfterSeconds: attempt.retryAfterSeconds,
      maxAttempts: exportGuardMaxAttempts,
      attemptsInWindow: attempt.attempt.attemptsInWindow,
      attemptId: attempt.attempt.id,
    });
  }
};

export class AuditService {
  async record(input: AuditRecordInput) {
    return auditLogRepository.create({
      id: crypto.randomUUID(),
      actorId: input.actor?.id || null,
      actorRole: input.actor?.role || null,
      action: input.action,
      resourceType: input.resourceType,
      resourceId: input.resourceId,
      before: input.before,
      after: input.after,
      reason: input.reason,
      createdAt: new Date().toISOString(),
    });
  }

  async list(filter?: AuditLogFilter | number) {
    return auditLogRepository.list(filter);
  }

  async listPage(filter?: AuditLogFilter | number) {
    const normalized = typeof filter === "number" ? { limit: filter } : filter || {};
    const [data, total] = await Promise.all([
      auditLogRepository.list(normalized),
      auditLogRepository.count(normalized),
    ]);
    const limit = normalized.limit ?? 100;
    const offset = normalized.offset ?? 0;

    return {
      data,
      meta: {
        filter: normalized,
        total,
        limit,
        offset,
        hasMore: offset + data.length < total,
      },
    };
  }

  async listExportAttemptsPage(filter: AuditExportAttemptFilter = {}) {
    const normalized = filter || {};
    const [data, total, allowed, blocked] = await Promise.all([
      auditLogRepository.listExportAttempts(normalized),
      auditLogRepository.countExportAttempts(normalized),
      auditLogRepository.countExportAttempts({ ...normalized, allowed: true }),
      auditLogRepository.countExportAttempts({ ...normalized, allowed: false }),
    ]);
    const limit = normalized.limit ?? 100;
    const offset = normalized.offset ?? 0;

    return {
      data,
      meta: {
        filter: normalized,
        total,
        limit,
        offset,
        hasMore: offset + data.length < total,
        summary: {
          allowed,
          blocked,
        },
      },
    };
  }

  async exportCsv(input: AuditExportInput): Promise<AuditExportResult> {
    const normalized = normalizeFilter(input.filter);
    await guardExportAttempt(input.actor, input.scope);
    const rows = await auditLogRepository.list({
      ...normalized,
      limit: normalized.limit ?? 500,
      offset: normalized.offset ?? 0,
    });
    const header = [
      "createdAt",
      "action",
      "actorRole",
      "actorId",
      "resourceType",
      "resourceId",
      "reason",
      "before",
      "after",
    ];

    const csv = [header.map(csvCell), ...rows.map(auditLogToCsvRow)]
      .map((row) => row.join(","))
      .join("\n");

    await this.record({
      actor: input.actor,
      action: "AUDIT_LOGS_EXPORTED",
      resourceType: "audit-export",
      resourceId: input.scope,
      after: {
        scope: input.scope,
        filter: normalized,
        rowCount: rows.length,
        filename: input.filename,
      },
      reason: "Audit CSV exported.",
    });

    return {
      csv,
      rowCount: rows.length,
    };
  }

  async cleanupExportAttempts(input: AuditExportAttemptCleanupInput) {
    const now = Date.now();
    const allowedBefore = new Date(
      now - input.allowedRetentionDays * 24 * 60 * 60 * 1000
    ).toISOString();
    const blockedBefore = new Date(
      now - input.blockedRetentionDays * 24 * 60 * 60 * 1000
    ).toISOString();
    const result = await auditLogRepository.cleanupExportAttempts({
      allowedBefore,
      blockedBefore,
      limit: input.limit,
      dryRun: input.dryRun,
    });
    const payload = {
      dryRun: input.dryRun,
      allowedRetentionDays: input.allowedRetentionDays,
      blockedRetentionDays: input.blockedRetentionDays,
      allowedBefore,
      blockedBefore,
      limit: input.limit,
      deletedAllowed: result.deletedAllowed,
      deletedBlocked: result.deletedBlocked,
    };

    if (!input.dryRun) {
      await this.record({
        actor: input.actor,
        action: "AUDIT_EXPORT_ATTEMPTS_CLEANED",
        resourceType: "audit-export-attempt",
        resourceId: "cleanup",
        after: payload,
        reason: "Audit export attempt cleanup executed.",
      });
    }

    return {
      data: payload,
    };
  }
}

export const auditService = new AuditService();
