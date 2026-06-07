import { config } from "../config";
import type { UserAccount } from "../domain/types";
import { getPostgresPool } from "../database/postgres/connection";
import { auditService } from "../modules/audit/audit-service";
import { repositoryMode } from "../repositories";

interface CleanupSchedulerResult {
  dryRun: boolean;
  allowedRetentionDays: number;
  blockedRetentionDays: number;
  allowedBefore: string;
  blockedBefore: string;
  limit: number;
  deletedAllowed: number;
  deletedBlocked: number;
}

interface CleanupSchedulerStatus {
  enabled: boolean;
  running: boolean;
  repositoryMode: "json" | "postgres";
  intervalSeconds: number;
  retention: {
    allowedDays: number;
    blockedDays: number;
  };
  batchSize: number;
  advisoryLockKey: number;
  startedAt: string | null;
  lastStartedAt: string | null;
  lastFinishedAt: string | null;
  lastResult: CleanupSchedulerResult | null;
  lastError: {
    message: string;
    at: string;
  } | null;
  lastSkip: {
    reason: "already-running" | "advisory-lock-held";
    at: string;
  } | null;
}

const schedulerActor: UserAccount = {
  id: "system:audit-export-cleanup",
  role: "admin",
  name: "Audit Export Cleanup Scheduler",
  identifier: "audit-export-cleanup-scheduler",
  email: "system@pharmsita.local",
  status: "Aktif",
};

export class AuditExportCleanupScheduler {
  private timer: NodeJS.Timeout | null = null;
  private running = false;
  private startedAt: string | null = null;
  private lastStartedAt: string | null = null;
  private lastFinishedAt: string | null = null;
  private lastResult: CleanupSchedulerResult | null = null;
  private lastError: CleanupSchedulerStatus["lastError"] = null;
  private lastSkip: CleanupSchedulerStatus["lastSkip"] = null;

  start() {
    if (!config.auditExportCleanupEnabled || this.timer) {
      return;
    }

    this.startedAt = new Date().toISOString();

    const intervalMs = Math.max(
      config.auditExportCleanupIntervalSeconds * 1000,
      60 * 1000
    );
    this.timer = setInterval(() => {
      void this.runOnce();
    }, intervalMs);
    this.timer.unref();

    void this.runOnce();
  }

  stop() {
    if (!this.timer) {
      return;
    }

    clearInterval(this.timer);
    this.timer = null;
  }

  getStatus(): CleanupSchedulerStatus {
    return {
      enabled: config.auditExportCleanupEnabled,
      running: this.running,
      repositoryMode,
      intervalSeconds: Math.max(config.auditExportCleanupIntervalSeconds, 60),
      retention: {
        allowedDays: config.auditExportAllowedRetentionDays,
        blockedDays: config.auditExportBlockedRetentionDays,
      },
      batchSize: config.auditExportCleanupBatchSize,
      advisoryLockKey: config.auditExportCleanupAdvisoryLockKey,
      startedAt: this.startedAt,
      lastStartedAt: this.lastStartedAt,
      lastFinishedAt: this.lastFinishedAt,
      lastResult: this.lastResult,
      lastError: this.lastError,
      lastSkip: this.lastSkip,
    };
  }

  async runOnce() {
    if (this.running) {
      console.info("Audit export cleanup skipped: scheduler already running.");
      this.lastSkip = {
        reason: "already-running",
        at: new Date().toISOString(),
      };
      return;
    }

    this.running = true;
    this.lastStartedAt = new Date().toISOString();
    try {
      if (repositoryMode === "postgres") {
        await this.runWithPostgresLock();
      } else {
        await this.cleanup();
      }
    } catch (error) {
      console.error(
        "Audit export cleanup scheduler failed:",
        error instanceof Error ? error.message : error
      );
      this.lastError = {
        message: error instanceof Error ? error.message : String(error),
        at: new Date().toISOString(),
      };
    } finally {
      this.lastFinishedAt = new Date().toISOString();
      this.running = false;
    }
  }

  private async runWithPostgresLock() {
    const pool = getPostgresPool();
    const client = await pool.connect();

    try {
      const lock = await client.query<{ locked: boolean }>(
        "SELECT pg_try_advisory_lock($1) AS locked",
        [config.auditExportCleanupAdvisoryLockKey]
      );
      const locked = lock.rows[0]?.locked === true;
      if (!locked) {
        console.info("Audit export cleanup skipped: advisory lock is held.");
        this.lastSkip = {
          reason: "advisory-lock-held",
          at: new Date().toISOString(),
        };
        return;
      }

      try {
        await this.cleanup();
      } finally {
        await client.query("SELECT pg_advisory_unlock($1)", [
          config.auditExportCleanupAdvisoryLockKey,
        ]);
      }
    } finally {
      client.release();
    }
  }

  private async cleanup() {
    const response = await auditService.cleanupExportAttempts({
      actor: schedulerActor,
      dryRun: false,
      allowedRetentionDays: config.auditExportAllowedRetentionDays,
      blockedRetentionDays: config.auditExportBlockedRetentionDays,
      limit: config.auditExportCleanupBatchSize,
    });
    this.lastResult = response.data;
    this.lastError = null;

    console.info(
      [
        "Audit export cleanup completed:",
        `allowed=${response.data.deletedAllowed}`,
        `blocked=${response.data.deletedBlocked}`,
        `limit=${response.data.limit}`,
      ].join(" ")
    );
  }
}

export const auditExportCleanupScheduler = new AuditExportCleanupScheduler();
