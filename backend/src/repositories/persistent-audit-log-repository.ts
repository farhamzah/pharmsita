import type { DatabaseAdapter } from "../database/schema";
import type {
  AuditExportAttempt,
  AuditExportAttemptFilter,
  AuditLog,
  AuditLogFilter,
} from "../domain/types";
import type {
  AuditExportAttemptCleanupInput,
  AuditExportAttemptInput,
  AuditLogRepository,
} from "./contracts";

const normalizeFilter = (filter?: AuditLogFilter | number): AuditLogFilter => {
  if (typeof filter === "number") {
    return { limit: filter };
  }

  return filter || {};
};

const matchesFilter = (entry: AuditLog, filter: AuditLogFilter) =>
  (!filter.action || entry.action === filter.action) &&
  (!filter.resourceType || entry.resourceType === filter.resourceType) &&
  (!filter.resourceId || entry.resourceId === filter.resourceId) &&
  (!filter.actorRole || entry.actorRole === filter.actorRole) &&
  (!filter.createdFrom || entry.createdAt >= filter.createdFrom) &&
  (!filter.createdTo || entry.createdAt <= filter.createdTo);

const matchesExportAttemptFilter = (
  entry: AuditExportAttempt,
  filter: AuditExportAttemptFilter
) =>
  (!filter.scope || entry.scope === filter.scope) &&
  (!filter.actorRole || entry.actorRole === filter.actorRole) &&
  (filter.allowed === null ||
    filter.allowed === undefined ||
    entry.allowed === filter.allowed) &&
  (!filter.createdFrom || entry.attemptedAt >= filter.createdFrom) &&
  (!filter.createdTo || entry.attemptedAt <= filter.createdTo);

export class PersistentAuditLogRepository implements AuditLogRepository {
  constructor(private readonly database: DatabaseAdapter) {}

  list(filter?: AuditLogFilter | number) {
    const normalized = normalizeFilter(filter);
    const limit = normalized.limit ?? 100;
    const offset = normalized.offset ?? 0;

    return this.database
      .read()
      .auditLogs.slice()
      .filter((entry) => matchesFilter(entry, normalized))
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .slice(offset, offset + limit);
  }

  count(filter?: AuditLogFilter | number) {
    const normalized = normalizeFilter(filter);

    return this.database
      .read()
      .auditLogs.filter((entry) => matchesFilter(entry, normalized)).length;
  }

  create(record: AuditLog) {
    this.database.update((state) => {
      state.auditLogs.push(record);
    });

    return record;
  }

  recordExportAttempt(input: AuditExportAttemptInput) {
    const attemptedAtMs = Date.parse(input.attemptedAt);
    const windowMs = input.windowSeconds * 1000;
    const recentAllowedAttempts = this.database
      .read()
      .auditExportAttempts.filter((entry) => entry.allowed)
      .filter((entry) => entry.actorId === input.actorId)
      .filter((entry) => entry.actorRole === input.actorRole)
      .filter((entry) => entry.scope === input.scope)
      .filter((entry) => Date.parse(entry.attemptedAt) >= attemptedAtMs - windowMs)
      .sort((a, b) => Date.parse(a.attemptedAt) - Date.parse(b.attemptedAt));
    const attemptsInWindow = recentAllowedAttempts.length + 1;
    const allowed = attemptsInWindow <= input.maxAttempts;
    const windowStartedAt =
      recentAllowedAttempts[0]?.attemptedAt || input.windowStartedAt;
    const attempt: AuditExportAttempt = {
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
    };

    this.database.update((state) => {
      state.auditExportAttempts.push(attempt);
    });

    const retryAfterSeconds = attempt.allowed
      ? 0
      : Math.max(
          1,
          Math.ceil(
            (Date.parse(attempt.windowStartedAt) + input.windowSeconds * 1000 - attemptedAtMs) /
              1000
          )
        );

    return {
      attempt,
      allowed: attempt.allowed,
      retryAfterSeconds,
    };
  }

  listExportAttempts(filter: AuditExportAttemptFilter = {}) {
    const limit = filter.limit ?? 100;
    const offset = filter.offset ?? 0;

    return this.database
      .read()
      .auditExportAttempts.slice()
      .filter((entry) => matchesExportAttemptFilter(entry, filter))
      .sort((a, b) => b.attemptedAt.localeCompare(a.attemptedAt))
      .slice(offset, offset + limit);
  }

  countExportAttempts(filter: AuditExportAttemptFilter = {}) {
    return this.database
      .read()
      .auditExportAttempts.filter((entry) =>
        matchesExportAttemptFilter(entry, filter)
      ).length;
  }

  cleanupExportAttempts(input: AuditExportAttemptCleanupInput) {
    const candidates = this.database
      .read()
      .auditExportAttempts.slice()
      .filter(
        (entry) =>
          (entry.allowed && entry.attemptedAt < input.allowedBefore) ||
          (!entry.allowed && entry.attemptedAt < input.blockedBefore)
      )
      .sort((a, b) => a.attemptedAt.localeCompare(b.attemptedAt))
      .slice(0, input.limit);
    const deletedAllowed = candidates.filter((entry) => entry.allowed).length;
    const deletedBlocked = candidates.filter((entry) => !entry.allowed).length;

    if (!input.dryRun && candidates.length > 0) {
      const candidateIds = new Set(candidates.map((entry) => entry.id));
      this.database.update((state) => {
        state.auditExportAttempts = state.auditExportAttempts.filter(
          (entry) => !candidateIds.has(entry.id)
        );
      });
    }

    return {
      deletedAllowed,
      deletedBlocked,
    };
  }
}
