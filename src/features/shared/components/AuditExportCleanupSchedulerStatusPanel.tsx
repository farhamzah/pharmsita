import React, { useEffect, useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  Clock3,
  Database,
  RefreshCcw,
  ShieldCheck,
} from "lucide-react";
import {
  auditApi,
  type AuditExportCleanupSchedulerStatus,
} from "../../../core/api/domain";
import { SectionCard } from "../../../components/ui/SectionCard";

const formatDateTime = (value: string | null) =>
  value
    ? new Date(value).toLocaleString("id-ID", {
        day: "2-digit",
        month: "short",
        hour: "2-digit",
        minute: "2-digit",
      })
    : "-";

const formatInterval = (seconds: number) => {
  if (seconds >= 86400 && seconds % 86400 === 0) {
    return `${seconds / 86400} hari`;
  }
  if (seconds >= 3600 && seconds % 3600 === 0) {
    return `${seconds / 3600} jam`;
  }
  if (seconds >= 60 && seconds % 60 === 0) {
    return `${seconds / 60} menit`;
  }
  return `${seconds} detik`;
};

const skipReasonLabel: Record<string, string> = {
  "already-running": "Run sebelumnya masih berjalan",
  "advisory-lock-held": "Instance lain sedang memegang lock",
};

export const AuditExportCleanupSchedulerStatusPanel: React.FC = () => {
  const [status, setStatus] = useState<AuditExportCleanupSchedulerStatus | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadStatus = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await auditApi.getAdminAuditExportCleanupSchedulerStatus();
      setStatus(response.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Status scheduler cleanup belum bisa dimuat.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void loadStatus();
  }, []);

  const lastResult = status?.lastResult;
  const lastSkip = status?.lastSkip;

  return (
    <SectionCard
      title={
        <span className="inline-flex items-center gap-2">
          <ShieldCheck className="h-4 w-4 text-primary" />
          Status Scheduler Cleanup
        </span>
      }
      className="border-border/70 shadow-sm"
      collapsible={false}
    >
      <div className="flex flex-col gap-3" data-testid="audit-cleanup-scheduler-status-panel">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <span
              data-testid="audit-cleanup-scheduler-enabled"
              className={
                status?.enabled
                  ? "inline-flex h-8 items-center gap-2 rounded-md border border-emerald-200 bg-emerald-50 px-3 text-xs font-bold text-emerald-700 dark:border-emerald-900/40 dark:bg-emerald-950/20 dark:text-emerald-300"
                  : "inline-flex h-8 items-center gap-2 rounded-md border border-amber-200 bg-amber-50 px-3 text-xs font-bold text-amber-800 dark:border-amber-900/40 dark:bg-amber-950/20 dark:text-amber-200"
              }
            >
              {status?.enabled ? (
                <CheckCircle2 className="h-3.5 w-3.5" />
              ) : (
                <AlertTriangle className="h-3.5 w-3.5" />
              )}
              {status?.enabled ? "Aktif" : "Nonaktif"}
            </span>
            <span
              data-testid="audit-cleanup-scheduler-running"
              className="inline-flex h-8 items-center gap-2 rounded-md border border-border bg-muted/40 px-3 text-xs font-bold text-foreground"
            >
              <Clock3 className="h-3.5 w-3.5" />
              {status?.running ? "Running" : "Idle"}
            </span>
          </div>
          <button
            type="button"
            onClick={loadStatus}
            data-testid="audit-cleanup-scheduler-refresh"
            className="inline-flex h-9 items-center gap-2 rounded-md border border-border px-3 text-xs font-semibold text-foreground hover:bg-muted disabled:opacity-60"
            disabled={isLoading}
          >
            <RefreshCcw className="h-3.5 w-3.5" />
            {isLoading ? "Memuat" : "Refresh"}
          </button>
        </div>

        {error && (
          <div
            data-testid="audit-cleanup-scheduler-error"
            className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-xs font-medium text-red-700 dark:border-red-900/40 dark:bg-red-950/20 dark:text-red-300"
          >
            {error}
          </div>
        )}

        <div className="grid gap-3 md:grid-cols-4">
          <div className="rounded-md border border-border/70 bg-muted/30 px-3 py-2">
            <p className="text-[10px] font-bold uppercase text-muted-foreground">Mode DB</p>
            <p className="mt-1 inline-flex items-center gap-2 text-sm font-bold text-foreground">
              <Database className="h-3.5 w-3.5 text-primary" />
              {status?.repositoryMode || "-"}
            </p>
          </div>
          <div className="rounded-md border border-border/70 bg-muted/30 px-3 py-2">
            <p className="text-[10px] font-bold uppercase text-muted-foreground">Interval</p>
            <p className="mt-1 text-sm font-bold text-foreground">
              {status ? formatInterval(status.intervalSeconds) : "-"}
            </p>
          </div>
          <div className="rounded-md border border-border/70 bg-muted/30 px-3 py-2">
            <p className="text-[10px] font-bold uppercase text-muted-foreground">Retensi</p>
            <p className="mt-1 text-sm font-bold text-foreground">
              {status
                ? `${status.retention.allowedDays}/${status.retention.blockedDays} hari`
                : "-"}
            </p>
          </div>
          <div className="rounded-md border border-border/70 bg-muted/30 px-3 py-2">
            <p className="text-[10px] font-bold uppercase text-muted-foreground">Batch</p>
            <p className="mt-1 text-sm font-bold text-foreground">
              {status?.batchSize ?? "-"}
            </p>
          </div>
        </div>

        <div className="grid gap-3 lg:grid-cols-3">
          <div className="rounded-md border border-border/70 bg-card/70 p-3 text-xs">
            <p className="font-bold text-muted-foreground">Last Run</p>
            <p className="mt-1 text-foreground">
              Mulai: {formatDateTime(status?.lastStartedAt || null)}
            </p>
            <p className="mt-1 text-foreground">
              Selesai: {formatDateTime(status?.lastFinishedAt || null)}
            </p>
          </div>
          <div
            data-testid="audit-cleanup-scheduler-last-result"
            className="rounded-md border border-border/70 bg-card/70 p-3 text-xs"
          >
            <p className="font-bold text-muted-foreground">Last Result</p>
            <p className="mt-1 text-foreground">
              Allowed: {lastResult?.deletedAllowed ?? "-"}
            </p>
            <p className="mt-1 text-foreground">
              Blocked: {lastResult?.deletedBlocked ?? "-"}
            </p>
          </div>
          <div
            data-testid="audit-cleanup-scheduler-last-signal"
            className={
              status?.lastError
                ? "rounded-md border border-red-200 bg-red-50 p-3 text-xs text-red-700 dark:border-red-900/40 dark:bg-red-950/20 dark:text-red-300"
                : "rounded-md border border-border/70 bg-card/70 p-3 text-xs"
            }
          >
            <p className="font-bold text-muted-foreground">Last Signal</p>
            {status?.lastError ? (
              <>
                <p className="mt-1 font-semibold">{status.lastError.message}</p>
                <p className="mt-1">{formatDateTime(status.lastError.at)}</p>
              </>
            ) : lastSkip ? (
              <>
                <p className="mt-1 text-foreground">
                  {skipReasonLabel[lastSkip.reason] || lastSkip.reason}
                </p>
                <p className="mt-1 text-muted-foreground">{formatDateTime(lastSkip.at)}</p>
              </>
            ) : (
              <p className="mt-1 text-foreground">Tidak ada error atau skip.</p>
            )}
          </div>
        </div>
      </div>
    </SectionCard>
  );
};
