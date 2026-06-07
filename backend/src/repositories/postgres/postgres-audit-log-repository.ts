import type {
  PostgresConnectionPool,
  PostgresTransactionClient,
} from "../../database/postgres/connection";
import type {
  AuditExportAttempt,
  AuditExportAttemptFilter,
  AuditLog,
  AuditLogFilter,
} from "../../domain/types";
import type {
  AuditExportAttemptCleanupInput,
  AuditExportAttemptInput,
  AuditLogRepository,
} from "../contracts";
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

const normalizeFilter = (filter?: AuditLogFilter | number): AuditLogFilter => {
  if (typeof filter === "number") {
    return { limit: filter };
  }

  return filter || {};
};

const buildWhere = (filter: AuditLogFilter) => {
  const values: unknown[] = [];
  const where: string[] = [];
  const addFilter = (column: string, value: unknown) => {
    values.push(value);
    where.push(`${column} = $${values.length}`);
  };

  if (filter.action) addFilter("action", filter.action);
  if (filter.resourceType) addFilter("resource_type", filter.resourceType);
  if (filter.resourceId) addFilter("resource_id", filter.resourceId);
  if (filter.actorRole) addFilter("actor_role", filter.actorRole);
  if (filter.createdFrom) {
    values.push(filter.createdFrom);
    where.push(`created_at >= $${values.length}`);
  }
  if (filter.createdTo) {
    values.push(filter.createdTo);
    where.push(`created_at <= $${values.length}`);
  }

  return { values, where };
};

const buildExportAttemptWhere = (filter: AuditExportAttemptFilter) => {
  const values: unknown[] = [];
  const where: string[] = [];
  const addFilter = (column: string, value: unknown) => {
    values.push(value);
    where.push(`${column} = $${values.length}`);
  };

  if (filter.scope) addFilter("scope", filter.scope);
  if (filter.actorRole) addFilter("actor_role", filter.actorRole);
  if (filter.allowed !== null && filter.allowed !== undefined) {
    addFilter("allowed", filter.allowed);
  }
  if (filter.createdFrom) {
    values.push(filter.createdFrom);
    where.push(`attempted_at >= $${values.length}`);
  }
  if (filter.createdTo) {
    values.push(filter.createdTo);
    where.push(`attempted_at <= $${values.length}`);
  }

  return { values, where };
};

type AuditExportAttemptRow = {
  id: string;
  actor_id: string | null;
  actor_role: AuditExportAttempt["actorRole"];
  scope: AuditExportAttempt["scope"];
  attempted_at: Date | string;
  allowed: boolean;
  window_started_at: Date | string;
  attempts_in_window: number;
  max_attempts: number;
  window_seconds: number;
};

const toAuditExportAttempt = (row: AuditExportAttemptRow): AuditExportAttempt => ({
  id: row.id,
  actorId: row.actor_id,
  actorRole: row.actor_role,
  scope: row.scope,
  attemptedAt:
    row.attempted_at instanceof Date
      ? row.attempted_at.toISOString()
      : row.attempted_at,
  allowed: row.allowed,
  windowStartedAt:
    row.window_started_at instanceof Date
      ? row.window_started_at.toISOString()
      : row.window_started_at,
  attemptsInWindow: Number(row.attempts_in_window),
  maxAttempts: Number(row.max_attempts),
  windowSeconds: Number(row.window_seconds),
});

const countCleanupRows = (rows: { allowed: boolean }[]) => ({
  deletedAllowed: rows.filter((row) => row.allowed).length,
  deletedBlocked: rows.filter((row) => !row.allowed).length,
});

export class PostgresAuditLogRepository implements AuditLogRepository {
  constructor(private readonly pool: PostgresConnectionPool) {}

  async list(filter?: AuditLogFilter | number) {
    const normalized = normalizeFilter(filter);
    const { values, where } = buildWhere(normalized);

    values.push(normalized.limit ?? 100);
    values.push(normalized.offset ?? 0);
    const result = await this.pool.query<AuditLogRow>(
      `
        SELECT ${auditLogColumns}
        FROM audit_logs
        ${where.length > 0 ? `WHERE ${where.join(" AND ")}` : ""}
        ORDER BY created_at DESC
        LIMIT $${values.length - 1}
        OFFSET $${values.length}
      `,
      values
    );

    return result.rows.map(toAuditLog);
  }

  async count(filter?: AuditLogFilter | number) {
    const normalized = normalizeFilter(filter);
    const { values, where } = buildWhere(normalized);
    const result = await this.pool.query<{ total: string }>(
      `
        SELECT COUNT(*)::text AS total
        FROM audit_logs
        ${where.length > 0 ? `WHERE ${where.join(" AND ")}` : ""}
      `,
      values
    );

    return Number(result.rows[0]?.total || 0);
  }

  async create(record: AuditLog) {
    const result = await this.pool.query<AuditLogRow>(
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

  async recordExportAttempt(input: AuditExportAttemptInput) {
    return this.withTransaction(async (client) => {
      const lockKey = [
        input.actorId || "anonymous",
        input.actorRole || "unknown",
        input.scope,
      ].join(":");

      await client.query("SELECT pg_advisory_xact_lock(hashtextextended($1, 0))", [
        lockKey,
      ]);

      const recent = await client.query<{ attempted_at: Date }>(
        `
          SELECT attempted_at
          FROM audit_export_attempts
          WHERE actor_id IS NOT DISTINCT FROM $1
            AND actor_role IS NOT DISTINCT FROM $2
            AND scope = $3
            AND allowed = TRUE
            AND attempted_at >= $4
          ORDER BY attempted_at ASC
        `,
        [input.actorId, input.actorRole, input.scope, input.windowStartedAt]
      );
      const attemptsInWindow = recent.rows.length + 1;
      const allowed = attemptsInWindow <= input.maxAttempts;
      const windowStartedAt =
        recent.rows[0]?.attempted_at?.toISOString() || input.windowStartedAt;

      await client.query(
        `
          INSERT INTO audit_export_attempts (
            id,
            actor_id,
            actor_role,
            scope,
            attempted_at,
            allowed,
            window_started_at,
            attempts_in_window,
            max_attempts,
            window_seconds
          )
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        `,
        [
          input.id,
          input.actorId,
          input.actorRole,
          input.scope,
          input.attemptedAt,
          allowed,
          windowStartedAt,
          attemptsInWindow,
          input.maxAttempts,
          input.windowSeconds,
        ]
      );

      const attemptedAtMs = Date.parse(input.attemptedAt);
      const retryAfterSeconds = allowed
        ? 0
        : Math.max(
            1,
            Math.ceil(
              (Date.parse(windowStartedAt) + input.windowSeconds * 1000 - attemptedAtMs) /
                1000
            )
          );

      return {
        allowed,
        retryAfterSeconds,
        attempt: {
          id: input.id,
          actorId: input.actorId,
          actorRole: input.actorRole,
          scope: input.scope,
          attemptedAt: input.attemptedAt,
          allowed,
          windowStartedAt,
          attemptsInWindow,
          maxAttempts: input.maxAttempts,
          windowSeconds: input.windowSeconds,
        },
      };
    });
  }

  async listExportAttempts(filter: AuditExportAttemptFilter = {}) {
    const { values, where } = buildExportAttemptWhere(filter);

    values.push(filter.limit ?? 100);
    values.push(filter.offset ?? 0);
    const result = await this.pool.query<AuditExportAttemptRow>(
      `
        SELECT
          id,
          actor_id,
          actor_role,
          scope,
          attempted_at,
          allowed,
          window_started_at,
          attempts_in_window,
          max_attempts,
          window_seconds
        FROM audit_export_attempts
        ${where.length > 0 ? `WHERE ${where.join(" AND ")}` : ""}
        ORDER BY attempted_at DESC
        LIMIT $${values.length - 1}
        OFFSET $${values.length}
      `,
      values
    );

    return result.rows.map(toAuditExportAttempt);
  }

  async countExportAttempts(filter: AuditExportAttemptFilter = {}) {
    const { values, where } = buildExportAttemptWhere(filter);
    const result = await this.pool.query<{ total: string }>(
      `
        SELECT COUNT(*)::text AS total
        FROM audit_export_attempts
        ${where.length > 0 ? `WHERE ${where.join(" AND ")}` : ""}
      `,
      values
    );

    return Number(result.rows[0]?.total || 0);
  }

  async cleanupExportAttempts(input: AuditExportAttemptCleanupInput) {
    if (input.dryRun) {
      const result = await this.pool.query<{ allowed: boolean }>(
        `
          SELECT allowed
          FROM audit_export_attempts
          WHERE (
              allowed = TRUE
              AND attempted_at < $1
            ) OR (
              allowed = FALSE
              AND attempted_at < $2
            )
          ORDER BY attempted_at ASC
          LIMIT $3
        `,
        [input.allowedBefore, input.blockedBefore, input.limit]
      );

      return countCleanupRows(result.rows);
    }

    const result = await this.pool.query<{ allowed: boolean }>(
      `
        WITH target AS (
          SELECT id
          FROM audit_export_attempts
          WHERE (
              allowed = TRUE
              AND attempted_at < $1
            ) OR (
              allowed = FALSE
              AND attempted_at < $2
            )
          ORDER BY attempted_at ASC
          LIMIT $3
        )
        DELETE FROM audit_export_attempts
        WHERE id IN (SELECT id FROM target)
        RETURNING allowed
      `,
      [input.allowedBefore, input.blockedBefore, input.limit]
    );

    return countCleanupRows(result.rows);
  }

  private async withTransaction<T>(
    callback: (client: PostgresTransactionClient) => Promise<T>
  ) {
    const client = await this.pool.connect();

    try {
      await client.query("BEGIN");
      const result = await callback(client);
      await client.query("COMMIT");
      return result;
    } catch (error) {
      await client.query("ROLLBACK").catch(() => undefined);
      throw error;
    } finally {
      client.release();
    }
  }
}
