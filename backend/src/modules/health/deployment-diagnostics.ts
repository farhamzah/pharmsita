import fs from "node:fs/promises";
import path from "node:path";
import { config } from "../../config";
import { getPostgresPool } from "../../database/postgres/connection";
import {
  collectProductionStartupIssues,
  hasDefaultAuthSecret,
} from "../../startup/production-startup-guard";

const migrationTable = "pharmsita_schema_migrations";

type CheckStatus = "ok" | "warning" | "error" | "skipped";

interface HealthCheck {
  status: CheckStatus;
  message: string;
  durationMs?: number;
  details?: unknown;
}

const nowIso = () => new Date().toISOString();

const duration = (startedAt: number) => Date.now() - startedAt;

const safeOriginCount = () => config.corsOrigins.length;

const parseDatabaseTarget = () => {
  if (!config.databaseUrl) {
    return null;
  }

  try {
    const url = new URL(config.databaseUrl);
    return {
      protocol: url.protocol.replace(":", ""),
      host: url.hostname,
      port: url.port || null,
      database: url.pathname.replace(/^\//, "") || null,
      usernameSet: Boolean(url.username),
      passwordSet: Boolean(url.password),
    };
  } catch {
    return {
      parseError: true,
    };
  }
};

const migrationDir = () =>
  path.resolve(process.cwd(), "backend", "database", "migrations");

const readLocalMigrations = async () => {
  const filenames = (await fs.readdir(migrationDir()))
    .filter((filename) => /^\d+_.+\.sql$/.test(filename))
    .sort();

  return filenames.map((filename) => ({
    version: filename.split("_")[0],
    filename,
  }));
};

const checkJsonDatabase = async (): Promise<HealthCheck> => {
  const startedAt = Date.now();

  try {
    await fs.mkdir(path.dirname(config.databaseFile), { recursive: true });

    return {
      status: "ok",
      message: "JSON database adapter is configured.",
      durationMs: duration(startedAt),
      details: {
        mode: "local-json",
        databaseFileConfigured: Boolean(config.databaseFile),
      },
    };
  } catch (error) {
    return {
      status: "error",
      message: "JSON database directory is not writable.",
      durationMs: duration(startedAt),
      details: {
        error: error instanceof Error ? error.message : String(error),
      },
    };
  }
};

const checkPostgresDatabase = async (): Promise<HealthCheck> => {
  const startedAt = Date.now();

  if (!config.databaseUrl) {
    return {
      status: "error",
      message: "DATABASE_URL is required when DB_ADAPTER=postgres.",
      durationMs: duration(startedAt),
    };
  }

  try {
    const result = await getPostgresPool().query<{
      database_name: string;
      server_time: string;
    }>("SELECT current_database() AS database_name, NOW()::TEXT AS server_time");

    return {
      status: "ok",
      message: "PostgreSQL connection is ready.",
      durationMs: duration(startedAt),
      details: {
        databaseName: result.rows[0]?.database_name || null,
        serverTime: result.rows[0]?.server_time || null,
      },
    };
  } catch (error) {
    return {
      status: "error",
      message: "PostgreSQL connection failed.",
      durationMs: duration(startedAt),
      details: {
        error: error instanceof Error ? error.message : String(error),
      },
    };
  }
};

const checkPostgresMigrations = async (): Promise<HealthCheck> => {
  const startedAt = Date.now();

  if (config.databaseAdapter !== "postgres") {
    return {
      status: "skipped",
      message: "Migration versioning is only required for PostgreSQL runtime.",
      durationMs: duration(startedAt),
    };
  }

  try {
    const localMigrations = await readLocalMigrations();
    const tableResult = await getPostgresPool().query<{ exists: boolean }>(
      "SELECT to_regclass($1) IS NOT NULL AS exists",
      [migrationTable]
    );

    if (!tableResult.rows[0]?.exists) {
      return {
        status: "error",
        message: "Migration version table is missing. Run db:migrate or baseline first.",
        durationMs: duration(startedAt),
        details: {
          migrationTable,
          localCount: localMigrations.length,
          appliedCount: 0,
          pendingCount: localMigrations.length,
        },
      };
    }

    const appliedResult = await getPostgresPool().query<{
      version: string;
      filename: string;
      applied_at: Date;
    }>(
      `
        SELECT version, filename, applied_at
        FROM ${migrationTable}
        ORDER BY version ASC
      `
    );

    const appliedVersions = new Set(appliedResult.rows.map((row) => row.version));
    const pending = localMigrations.filter(
      (migration) => !appliedVersions.has(migration.version)
    );
    const unknownApplied = appliedResult.rows.filter(
      (row) =>
        !localMigrations.some(
          (migration) =>
            migration.version === row.version && migration.filename === row.filename
        )
    );

    const status: CheckStatus =
      pending.length === 0 && unknownApplied.length === 0 ? "ok" : "warning";

    return {
      status,
      message:
        status === "ok"
          ? "PostgreSQL migrations are up to date."
          : "PostgreSQL migration state needs review.",
      durationMs: duration(startedAt),
      details: {
        migrationTable,
        localCount: localMigrations.length,
        appliedCount: appliedResult.rows.length,
        pendingCount: pending.length,
        pending: pending.map((migration) => migration.filename),
        unknownApplied: unknownApplied.map((row) => row.filename),
        latestApplied:
          appliedResult.rows.length > 0
            ? appliedResult.rows[appliedResult.rows.length - 1].filename
            : null,
      },
    };
  } catch (error) {
    return {
      status: "error",
      message: "Unable to read PostgreSQL migration status.",
      durationMs: duration(startedAt),
      details: {
        error: error instanceof Error ? error.message : String(error),
      },
    };
  }
};

const buildChecks = async () => {
  const database =
    config.databaseAdapter === "postgres"
      ? await checkPostgresDatabase()
      : await checkJsonDatabase();
  const migrations = await checkPostgresMigrations();

  return { database, migrations };
};

const summarizeStatus = (checks: Record<string, HealthCheck>) => {
  const statuses = Object.values(checks).map((check) => check.status);

  if (statuses.includes("error")) {
    return "not_ready";
  }

  if (statuses.includes("warning")) {
    return "degraded";
  }

  return "ready";
};

export const deploymentDiagnosticsService = {
  async readiness() {
    const checks = await buildChecks();
    const status = summarizeStatus(checks);

    return {
      status,
      service: "pharmsita-api",
      timestamp: nowIso(),
      repositoryMode: config.databaseAdapter,
      checks,
    };
  },

  async diagnostics() {
    const readiness = await this.readiness();
    const startupGuard = collectProductionStartupIssues();

    return {
      ...readiness,
      environment: {
        nodeEnv: process.env.NODE_ENV || "development",
        apiPrefix: config.apiPrefix,
        port: config.port,
        corsOriginCount: safeOriginCount(),
      },
      database: {
        adapter: config.databaseAdapter,
        sslEnabled: config.databaseSsl,
        poolMax: config.databasePoolMax,
        target: parseDatabaseTarget(),
      },
      auth: {
        accessTokenTtlSeconds: config.accessTokenTtlSeconds,
        refreshTokenTtlSeconds: config.refreshTokenTtlSeconds,
        authSecretConfigured: Boolean(config.authSecret),
        authSecretLooksDefault: hasDefaultAuthSecret(),
      },
      startupGuard: {
        enforced: startupGuard.enforced,
        status: startupGuard.status,
        issueCount: startupGuard.issues.length,
        issueCodes: startupGuard.issues.map((issue) => issue.code),
      },
      auditExportCleanup: {
        enabled: config.auditExportCleanupEnabled,
        intervalSeconds: config.auditExportCleanupIntervalSeconds,
        allowedRetentionDays: config.auditExportAllowedRetentionDays,
        blockedRetentionDays: config.auditExportBlockedRetentionDays,
        batchSize: config.auditExportCleanupBatchSize,
        advisoryLockKey: config.auditExportCleanupAdvisoryLockKey,
      },
    };
  },
};
