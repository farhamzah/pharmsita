import type { PostgresQueryExecutor } from "../../database/postgres/connection";
import type { AuditLog } from "../../domain/types";
import type { AuditLogRepository } from "../contracts";
import { toAuditLog, type AuditLogRow } from "./row-mappers";

const auditLogColumns = `
  id,
  actor_id,
  actor_role,
  action,
  resource_type,
  resource_id,
  before_payload,
  after_payload,
  reason,
  created_at
`;

const jsonPayload = (value: unknown) =>
  value === undefined ? null : JSON.stringify(value);

export class PostgresAuditLogRepository implements AuditLogRepository {
  constructor(private readonly db: PostgresQueryExecutor) {}

  async list(limit = 100) {
    const result = await this.db.query<AuditLogRow>(
      `
        SELECT ${auditLogColumns}
        FROM audit_logs
        ORDER BY created_at DESC
        LIMIT $1
      `,
      [limit]
    );

    return result.rows.map(toAuditLog);
  }

  async create(record: AuditLog) {
    const result = await this.db.query<AuditLogRow>(
      `
        INSERT INTO audit_logs (
          id,
          actor_id,
          actor_role,
          action,
          resource_type,
          resource_id,
          before_payload,
          after_payload,
          reason,
          created_at
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb, $8::jsonb, $9, $10)
        RETURNING ${auditLogColumns}
      `,
      [
        record.id,
        record.actorId,
        record.actorRole,
        record.action,
        record.resourceType,
        record.resourceId,
        jsonPayload(record.before),
        jsonPayload(record.after),
        record.reason || null,
        record.createdAt,
      ]
    );

    return toAuditLog(result.rows[0]);
  }
}
