import type { DatabaseAdapter } from "../database/schema";
import type { AuditLog } from "../domain/types";
import type { AuditLogRepository } from "./contracts";

export class PersistentAuditLogRepository implements AuditLogRepository {
  constructor(private readonly database: DatabaseAdapter) {}

  list(limit = 100) {
    return this.database
      .read()
      .auditLogs.slice()
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .slice(0, limit);
  }

  create(record: AuditLog) {
    this.database.update((state) => {
      state.auditLogs.push(record);
    });

    return record;
  }
}
