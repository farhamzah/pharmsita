import crypto from "node:crypto";
import type { UserAccount } from "../../domain/types";
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

  async list(limit?: number) {
    return auditLogRepository.list(limit);
  }
}

export const auditService = new AuditService();
