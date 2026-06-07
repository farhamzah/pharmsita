import React, { useEffect, useMemo, useState } from "react";
import {
  Activity,
  Eye,
  RefreshCcw,
  RotateCcw,
  ShieldAlert,
  Trash2,
  X,
} from "lucide-react";
import {
  auditApi,
  type AuditExportAttempt,
  type AuditExportAttemptCleanupResult,
  type AuditExportAttemptQuery,
} from "../../../core/api/domain";
import { SectionCard } from "../../../components/ui/SectionCard";

const pageSize = 10;

const formatDateTime = (value: string) =>
  new Date(value).toLocaleString("id-ID", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });

const dateStart = (value: string) => (value ? `${value}T00:00:00.000Z` : undefined);
const dateEnd = (value: string) => (value ? `${value}T23:59:59.999Z` : undefined);

export const AuditExportAttemptPanel: React.FC = () => {
  const [scope, setScope] = useState("");
  const [allowed, setAllowed] = useState("");
  const [createdFrom, setCreatedFrom] = useState("");
  const [createdTo, setCreatedTo] = useState("");
  const [page, setPage] = useState(1);
  const [attempts, setAttempts] = useState<AuditExportAttempt[]>([]);
  const [total, setTotal] = useState(0);
  const [allowedCount, setAllowedCount] = useState(0);
  const [blockedCount, setBlockedCount] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedAttempt, setSelectedAttempt] = useState<AuditExportAttempt | null>(null);
  const [isCleanupOpen, setIsCleanupOpen] = useState(false);
  const [cleanupAllowedRetentionDays, setCleanupAllowedRetentionDays] = useState(30);
  const [cleanupBlockedRetentionDays, setCleanupBlockedRetentionDays] = useState(90);
  const [cleanupLimit, setCleanupLimit] = useState(1000);
  const [cleanupResult, setCleanupResult] = useState<AuditExportAttemptCleanupResult | null>(null);
  const [cleanupError, setCleanupError] = useState<string | null>(null);
  const [isCleanupLoading, setIsCleanupLoading] = useState(false);

  const query: AuditExportAttemptQuery = useMemo(
    () => ({
      limit: pageSize,
      offset: (page - 1) * pageSize,
      ...(scope ? { scope: scope as "admin" | "koordinator" } : {}),
      ...(allowed ? { allowed: allowed === "allowed" } : {}),
      ...(createdFrom ? { createdFrom: dateStart(createdFrom) } : {}),
      ...(createdTo ? { createdTo: dateEnd(createdTo) } : {}),
    }),
    [allowed, createdFrom, createdTo, page, scope]
  );

  const loadAttempts = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await auditApi.listAdminAuditExportAttempts(query);
      setAttempts(response.data);
      setTotal(response.meta?.total ?? response.data.length);
      setAllowedCount(response.meta?.summary?.allowed ?? 0);
      setBlockedCount(response.meta?.summary?.blocked ?? 0);
      setHasMore(response.meta?.hasMore ?? response.data.length === pageSize);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Monitoring export audit belum bisa dimuat.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void loadAttempts();
  }, [query]);

  useEffect(() => {
    setPage(1);
  }, [allowed, createdFrom, createdTo, scope]);

  const resetFilters = () => {
    setScope("");
    setAllowed("");
    setCreatedFrom("");
    setCreatedTo("");
    setPage(1);
  };

  const resetCleanupResult = () => {
    setCleanupResult(null);
    setCleanupError(null);
  };

  const runCleanup = async (dryRun: boolean) => {
    setIsCleanupLoading(true);
    setCleanupError(null);

    try {
      const response = await auditApi.cleanupAdminAuditExportAttempts({
        dryRun,
        allowedRetentionDays: cleanupAllowedRetentionDays,
        blockedRetentionDays: cleanupBlockedRetentionDays,
        limit: cleanupLimit,
      });
      setCleanupResult(response.data);
      if (!dryRun) {
        void loadAttempts();
      }
    } catch (err) {
      setCleanupError(
        err instanceof Error ? err.message : "Cleanup attempt export audit gagal diproses."
      );
    } finally {
      setIsCleanupLoading(false);
    }
  };

  const retryAt = selectedAttempt
    ? new Date(
        new Date(selectedAttempt.windowStartedAt).getTime() +
          selectedAttempt.windowSeconds * 1000
      ).toISOString()
    : null;

  return (
    <>
      <SectionCard
        title={
          <span className="inline-flex items-center gap-2">
            <ShieldAlert className="h-4 w-4 text-primary" />
            Monitoring Export Audit
          </span>
        }
        className="border-border/70 shadow-sm"
        collapsible={false}
      >
        <div className="flex flex-col gap-3" data-testid="audit-export-attempt-panel">
        <div className="grid gap-3 sm:grid-cols-3">
          <div className="rounded-md border border-border/70 bg-muted/30 px-3 py-2">
            <p className="text-[10px] font-bold uppercase text-muted-foreground">Total</p>
            <p className="text-lg font-bold text-foreground">{total}</p>
          </div>
          <div className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 dark:border-emerald-900/40 dark:bg-emerald-950/20">
            <p className="text-[10px] font-bold uppercase text-emerald-700 dark:text-emerald-300">
              Allowed
            </p>
            <p className="text-lg font-bold text-emerald-700 dark:text-emerald-300">
              {allowedCount}
            </p>
          </div>
          <button
            type="button"
            onClick={() => setAllowed("blocked")}
            data-testid="audit-export-attempt-filter-blocked"
            className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-left transition hover:border-red-300 hover:bg-red-100 dark:border-red-900/40 dark:bg-red-950/20 dark:hover:bg-red-950/30"
          >
            <p className="text-[10px] font-bold uppercase text-red-700 dark:text-red-300">
              Blocked
            </p>
            <p className="text-lg font-bold text-red-700 dark:text-red-300">
              {blockedCount}
            </p>
          </button>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <select
              value={scope}
              onChange={(event) => setScope(event.target.value)}
              className="h-9 rounded-md border border-input bg-background px-3 text-xs font-medium outline-none focus:ring-2 focus:ring-primary/40"
              aria-label="Filter scope export audit"
            >
              <option value="">Semua Scope</option>
              <option value="admin">Admin</option>
              <option value="koordinator">Koordinator</option>
            </select>
            <select
              value={allowed}
              onChange={(event) => setAllowed(event.target.value)}
              className="h-9 rounded-md border border-input bg-background px-3 text-xs font-medium outline-none focus:ring-2 focus:ring-primary/40"
              aria-label="Filter status export audit"
            >
              <option value="">Semua Status</option>
              <option value="allowed">Allowed</option>
              <option value="blocked">Blocked</option>
            </select>
            <input
              type="date"
              value={createdFrom}
              onChange={(event) => setCreatedFrom(event.target.value)}
              className="h-9 rounded-md border border-input bg-background px-3 text-xs font-medium outline-none focus:ring-2 focus:ring-primary/40"
              aria-label="Tanggal awal export audit"
            />
            <input
              type="date"
              value={createdTo}
              onChange={(event) => setCreatedTo(event.target.value)}
              className="h-9 rounded-md border border-input bg-background px-3 text-xs font-medium outline-none focus:ring-2 focus:ring-primary/40"
              aria-label="Tanggal akhir export audit"
            />
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => {
                resetCleanupResult();
                setIsCleanupOpen(true);
              }}
              data-testid="audit-export-attempt-cleanup-open"
              className="inline-flex h-9 items-center gap-2 rounded-md border border-amber-200 bg-amber-50 px-3 text-xs font-semibold text-amber-800 hover:bg-amber-100 dark:border-amber-900/40 dark:bg-amber-950/20 dark:text-amber-200 dark:hover:bg-amber-950/30"
            >
              <Trash2 className="h-3.5 w-3.5" />
              Cleanup
            </button>
            <button
              type="button"
              onClick={loadAttempts}
              data-testid="audit-export-attempt-refresh"
              className="inline-flex h-9 items-center gap-2 rounded-md border border-border px-3 text-xs font-semibold text-foreground hover:bg-muted disabled:opacity-60"
              disabled={isLoading}
            >
              <RefreshCcw className="h-3.5 w-3.5" />
              {isLoading ? "Memuat" : "Refresh"}
            </button>
            <button
              type="button"
              onClick={resetFilters}
              data-testid="audit-export-attempt-reset"
              className="inline-flex h-9 items-center gap-2 rounded-md border border-border px-3 text-xs font-semibold text-foreground hover:bg-muted"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              Reset
            </button>
          </div>
        </div>

        {error && (
          <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-xs font-medium text-red-700 dark:border-red-900/40 dark:bg-red-950/20 dark:text-red-300">
            {error}
          </div>
        )}

        <div className="overflow-hidden rounded-lg border border-border/60">
          <table className="w-full text-left text-xs">
            <thead className="bg-muted/60 text-[10px] uppercase text-muted-foreground">
              <tr>
                <th className="px-3 py-2 font-bold">Waktu</th>
                <th className="px-3 py-2 font-bold">Scope</th>
                <th className="px-3 py-2 font-bold">Actor</th>
                <th className="px-3 py-2 font-bold">Status</th>
                <th className="px-3 py-2 font-bold">Window</th>
                <th className="px-3 py-2 font-bold">Detail</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {attempts.length === 0 && (
                <tr>
                  <td className="px-3 py-4 text-center text-muted-foreground" colSpan={6}>
                    Belum ada attempt export audit.
                  </td>
                </tr>
              )}
              {attempts.map((attempt) => (
                <tr key={attempt.id} className="bg-card/70">
                  <td className="whitespace-nowrap px-3 py-2 text-muted-foreground">
                    {formatDateTime(attempt.attemptedAt)}
                  </td>
                  <td className="px-3 py-2 font-semibold">{attempt.scope}</td>
                  <td className="px-3 py-2 text-muted-foreground">
                    {attempt.actorRole || "-"}
                  </td>
                  <td className="px-3 py-2">
                    <span
                      className={
                        attempt.allowed
                          ? "rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 font-bold text-emerald-700 dark:border-emerald-900/40 dark:bg-emerald-950/20 dark:text-emerald-300"
                          : "rounded-full border border-red-200 bg-red-50 px-2 py-0.5 font-bold text-red-700 dark:border-red-900/40 dark:bg-red-950/20 dark:text-red-300"
                      }
                    >
                      {attempt.allowed ? "Allowed" : "Blocked"}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-muted-foreground">
                    <span className="inline-flex items-center gap-1">
                      <Activity className="h-3 w-3" />
                      {attempt.attemptsInWindow}/{attempt.maxAttempts} dalam{" "}
                      {attempt.windowSeconds} detik
                    </span>
                  </td>
                  <td className="px-3 py-2">
                    <button
                      type="button"
                      onClick={() => setSelectedAttempt(attempt)}
                      data-testid={
                        attempt.allowed
                          ? "audit-export-attempt-detail"
                          : "audit-export-attempt-blocked-detail"
                      }
                      className="inline-flex items-center gap-1 rounded-md border border-border px-2 py-1 text-[11px] font-semibold text-foreground hover:bg-muted"
                    >
                      <Eye className="h-3 w-3" />
                      Detail
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>
            Halaman {page} dari {Math.max(1, Math.ceil(total / pageSize))}
          </span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setPage((value) => Math.max(1, value - 1))}
              className="rounded-md border border-border px-3 py-1 font-semibold text-foreground disabled:opacity-50"
              disabled={page === 1}
            >
              Prev
            </button>
            <button
              type="button"
              onClick={() => setPage((value) => value + 1)}
              className="rounded-md border border-border px-3 py-1 font-semibold text-foreground disabled:opacity-50"
              disabled={!hasMore}
            >
              Next
            </button>
          </div>
        </div>
        </div>
      </SectionCard>

      {selectedAttempt && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-end bg-black/40 p-4 sm:items-stretch"
          role="dialog"
          aria-modal="true"
          aria-labelledby="audit-export-attempt-drawer-title"
          data-testid="audit-export-attempt-drawer"
        >
          <div className="flex max-h-full w-full max-w-xl flex-col overflow-hidden rounded-lg border border-border bg-card shadow-xl">
            <div className="flex items-center justify-between border-b border-border px-4 py-3">
              <div>
                <p
                  id="audit-export-attempt-drawer-title"
                  className="text-sm font-bold text-foreground"
                >
                  Detail Attempt Export
                </p>
                <p className="text-xs text-muted-foreground">
                  {selectedAttempt.allowed ? "Allowed" : "Blocked"} - {selectedAttempt.scope}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedAttempt(null)}
                data-testid="audit-export-attempt-close"
                className="rounded-md border border-border p-2 text-muted-foreground hover:bg-muted hover:text-foreground"
                aria-label="Tutup detail attempt export"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-4 overflow-y-auto p-4 text-xs">
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-md border border-border/70 bg-muted/30 p-3">
                  <p className="font-bold text-muted-foreground">Actor ID</p>
                  <p className="mt-1 break-all text-foreground">
                    {selectedAttempt.actorId || "-"}
                  </p>
                </div>
                <div className="rounded-md border border-border/70 bg-muted/30 p-3">
                  <p className="font-bold text-muted-foreground">Actor Role</p>
                  <p className="mt-1 text-foreground">{selectedAttempt.actorRole || "-"}</p>
                </div>
                <div className="rounded-md border border-border/70 bg-muted/30 p-3">
                  <p className="font-bold text-muted-foreground">Attempt Time</p>
                  <p className="mt-1 text-foreground">
                    {formatDateTime(selectedAttempt.attemptedAt)}
                  </p>
                </div>
                <div className="rounded-md border border-border/70 bg-muted/30 p-3">
                  <p className="font-bold text-muted-foreground">Window Start</p>
                  <p className="mt-1 text-foreground">
                    {formatDateTime(selectedAttempt.windowStartedAt)}
                  </p>
                </div>
              </div>

              <div
                className={
                  selectedAttempt.allowed
                    ? "rounded-md border border-emerald-200 bg-emerald-50 p-3 text-emerald-700 dark:border-emerald-900/40 dark:bg-emerald-950/20 dark:text-emerald-300"
                    : "rounded-md border border-red-200 bg-red-50 p-3 text-red-700 dark:border-red-900/40 dark:bg-red-950/20 dark:text-red-300"
                }
              >
                <p className="font-bold">
                  {selectedAttempt.allowed ? "Export diizinkan" : "Export diblokir"}
                </p>
                <p className="mt-1">
                  Attempt {selectedAttempt.attemptsInWindow}/{selectedAttempt.maxAttempts} dalam{" "}
                  {selectedAttempt.windowSeconds} detik.
                </p>
                {!selectedAttempt.allowed && retryAt && (
                  <p className="mt-1">Perkiraan window terbuka lagi: {formatDateTime(retryAt)}.</p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {isCleanupOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="audit-export-cleanup-title"
          data-testid="audit-export-cleanup-dialog"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              setIsCleanupOpen(false);
            }
          }}
        >
          <div
            className="w-full max-w-2xl overflow-hidden rounded-lg border border-border bg-card shadow-xl"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-border px-4 py-3">
              <div>
                <p
                  id="audit-export-cleanup-title"
                  className="text-sm font-bold text-foreground"
                >
                  Cleanup Attempt Export Audit
                </p>
                <p className="text-xs text-muted-foreground">
                  Jalankan dry-run sebelum execute untuk melihat estimasi data lama.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsCleanupOpen(false)}
                data-testid="audit-export-cleanup-close"
                className="rounded-md border border-border p-2 text-muted-foreground hover:bg-muted hover:text-foreground"
                aria-label="Tutup cleanup attempt export audit"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-4 p-4 text-xs">
              <div className="grid gap-3 sm:grid-cols-3">
                <label className="space-y-1 font-semibold text-foreground">
                  Retensi Allowed
                  <input
                    type="number"
                    min={1}
                    max={3650}
                    value={cleanupAllowedRetentionDays}
                    onChange={(event) => {
                      setCleanupAllowedRetentionDays(Number(event.target.value || 1));
                      resetCleanupResult();
                    }}
                    data-testid="audit-export-cleanup-allowed-days"
                    className="h-9 w-full rounded-md border border-input bg-background px-3 text-xs font-medium outline-none focus:ring-2 focus:ring-primary/40"
                  />
                </label>
                <label className="space-y-1 font-semibold text-foreground">
                  Retensi Blocked
                  <input
                    type="number"
                    min={1}
                    max={3650}
                    value={cleanupBlockedRetentionDays}
                    onChange={(event) => {
                      setCleanupBlockedRetentionDays(Number(event.target.value || 1));
                      resetCleanupResult();
                    }}
                    data-testid="audit-export-cleanup-blocked-days"
                    className="h-9 w-full rounded-md border border-input bg-background px-3 text-xs font-medium outline-none focus:ring-2 focus:ring-primary/40"
                  />
                </label>
                <label className="space-y-1 font-semibold text-foreground">
                  Batch Limit
                  <input
                    type="number"
                    min={1}
                    max={10000}
                    value={cleanupLimit}
                    onChange={(event) => {
                      setCleanupLimit(Number(event.target.value || 1));
                      resetCleanupResult();
                    }}
                    data-testid="audit-export-cleanup-limit"
                    className="h-9 w-full rounded-md border border-input bg-background px-3 text-xs font-medium outline-none focus:ring-2 focus:ring-primary/40"
                  />
                </label>
              </div>

              {cleanupError && (
                <div
                  data-testid="audit-export-cleanup-error"
                  className="rounded-md border border-red-200 bg-red-50 px-3 py-2 font-medium text-red-700 dark:border-red-900/40 dark:bg-red-950/20 dark:text-red-300"
                >
                  {cleanupError}
                </div>
              )}

              {cleanupResult && (
                <div
                  data-testid="audit-export-cleanup-result"
                  className={
                    cleanupResult.dryRun
                      ? "rounded-md border border-blue-200 bg-blue-50 px-3 py-3 text-blue-800 dark:border-blue-900/40 dark:bg-blue-950/20 dark:text-blue-200"
                      : "rounded-md border border-emerald-200 bg-emerald-50 px-3 py-3 text-emerald-800 dark:border-emerald-900/40 dark:bg-emerald-950/20 dark:text-emerald-200"
                  }
                >
                  <p className="font-bold">
                    {cleanupResult.dryRun ? "Dry-run selesai" : "Cleanup selesai"}
                  </p>
                  <p className="mt-1">
                    Allowed lama: {cleanupResult.deletedAllowed} · Blocked lama:{" "}
                    {cleanupResult.deletedBlocked}
                  </p>
                  <p className="mt-1 text-[11px] opacity-80">
                    Cutoff allowed {formatDateTime(cleanupResult.allowedBefore)}, cutoff blocked{" "}
                    {formatDateTime(cleanupResult.blockedBefore)}.
                  </p>
                </div>
              )}

              <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-amber-800 dark:border-amber-900/40 dark:bg-amber-950/20 dark:text-amber-200">
                Execute hanya menghapus attempt export lama sesuai cutoff dan limit. Event audit
                cleanup akan dicatat setelah execute berhasil.
              </div>

              <div className="flex flex-wrap items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => void runCleanup(true)}
                  data-testid="audit-export-cleanup-dry-run"
                  className="inline-flex h-9 items-center gap-2 rounded-md border border-border px-3 font-semibold text-foreground hover:bg-muted disabled:opacity-60"
                  disabled={isCleanupLoading}
                >
                  <RefreshCcw className="h-3.5 w-3.5" />
                  {isCleanupLoading ? "Memproses" : "Dry-run"}
                </button>
                <button
                  type="button"
                  onClick={() => void runCleanup(false)}
                  data-testid="audit-export-cleanup-execute"
                  className="inline-flex h-9 items-center gap-2 rounded-md border border-red-200 bg-red-50 px-3 font-semibold text-red-700 hover:bg-red-100 disabled:opacity-50 dark:border-red-900/40 dark:bg-red-950/20 dark:text-red-300 dark:hover:bg-red-950/30"
                  disabled={isCleanupLoading || !cleanupResult?.dryRun}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  Execute Cleanup
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
