import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Activity,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Download,
  RefreshCcw,
  X,
  XCircle,
} from "lucide-react";
import { auditApi, type AuditLogEntry } from "../../../core/api/domain";
import { ApiError } from "../../../core/api/api-types";
import { SectionCard } from "../../../components/ui/SectionCard";

interface RevisionGateAuditPanelProps {
  scope: "admin" | "coordinator";
  studentId?: string;
  stageId?: string;
}

const actionLabels: Record<string, string> = {
  REVISION_COMPLETION_GATE_READ: "Dibaca",
  REVISION_COMPLETION_GATE_BLOCKED: "Diblokir",
  REVISION_COMPLETION_GATE_ALLOWED: "Diizinkan",
  AUDIT_LOGS_EXPORTED: "Export CSV",
};

const baseActionOptions = [
  { value: "", label: "Semua Event" },
  { value: "REVISION_COMPLETION_GATE_READ", label: "Dibaca" },
  { value: "REVISION_COMPLETION_GATE_BLOCKED", label: "Diblokir" },
  { value: "REVISION_COMPLETION_GATE_ALLOWED", label: "Diizinkan" },
];

const adminActionOptions = [
  ...baseActionOptions,
  { value: "AUDIT_LOGS_EXPORTED", label: "Export CSV" },
];

const formatDateTime = (value: string) =>
  new Date(value).toLocaleString("id-ID", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });

const splitResourceId = (resourceId: string) => {
  const [student, stage] = resourceId.split(":");
  return { student: student || "-", stage: stage || "-" };
};

const pageSize = 10;

const dateStart = (value: string) => (value ? `${value}T00:00:00.000Z` : undefined);
const dateEnd = (value: string) => (value ? `${value}T23:59:59.999Z` : undefined);

type GatePayload = {
  stageId?: string;
  readyForFinalUpload?: boolean;
  readyForProgressCompletion?: boolean;
  finalFile?: string | null;
  blockingReasons?: string[];
  finalUploadBlockingReasons?: string[];
  progressCompletionBlockingReasons?: string[];
  checks?: Array<{
    code?: string;
    label?: string;
    passed?: boolean;
    detail?: string;
  }>;
  evaluatedAt?: string;
};

const readGatePayload = (entry: AuditLogEntry | null): GatePayload | null => {
  if (!entry?.after || typeof entry.after !== "object") return null;
  return entry.after as GatePayload;
};

const formatPayload = (value: unknown) => JSON.stringify(value || {}, null, 2);

const downloadCsv = (filename: string, content: string) => {
  const blob = new Blob([content], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
};

export const RevisionGateAuditPanel: React.FC<RevisionGateAuditPanelProps> = ({
  scope,
  studentId,
  stageId,
}) => {
  const [action, setAction] = useState("");
  const [createdFrom, setCreatedFrom] = useState("");
  const [createdTo, setCreatedTo] = useState("");
  const [page, setPage] = useState(1);
  const [logs, setLogs] = useState<AuditLogEntry[]>([]);
  const [totalLogs, setTotalLogs] = useState(0);
  const [hasMoreLogs, setHasMoreLogs] = useState(false);
  const [selectedLog, setSelectedLog] = useState<AuditLogEntry | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [exportFeedback, setExportFeedback] = useState<string | null>(null);
  const closeButtonRef = useRef<HTMLButtonElement | null>(null);
  const isExportEventFilter = scope === "admin" && action === "AUDIT_LOGS_EXPORTED";

  const query = useMemo(
    () => ({
      limit: pageSize,
      offset: (page - 1) * pageSize,
      ...(action ? { action } : {}),
      ...(studentId ? { studentId } : {}),
      ...(stageId ? { stageId } : {}),
      ...(createdFrom ? { createdFrom: dateStart(createdFrom) } : {}),
      ...(createdTo ? { createdTo: dateEnd(createdTo) } : {}),
      ...(scope === "admin"
        ? { resourceType: isExportEventFilter ? "audit-export" : "revision-completion-gate" }
        : {}),
    }),
    [action, createdFrom, createdTo, isExportEventFilter, page, scope, stageId, studentId]
  );

  const exportQuery = useMemo(
    () => ({
      ...query,
      limit: 500,
      offset: 0,
    }),
    [query]
  );

  const loadLogs = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response =
        scope === "admin"
          ? await auditApi.listAdminAuditLogs(query)
          : await auditApi.listRevisionCompletionGateAuditLogs(query);
      setLogs(response.data);
      setTotalLogs(response.meta?.total ?? response.data.length);
      setHasMoreLogs(response.meta?.hasMore ?? response.data.length === pageSize);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Audit gate revisi belum bisa dimuat.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void loadLogs();
  }, [query]);

  useEffect(() => {
    setPage(1);
  }, [action, createdFrom, createdTo, scope, stageId, studentId]);

  useEffect(() => {
    if (!selectedLog) return;

    closeButtonRef.current?.focus();
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setSelectedLog(null);
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [selectedLog]);

  const selectedResource = selectedLog ? splitResourceId(selectedLog.resourceId) : null;
  const selectedGate = readGatePayload(selectedLog);
  const hasPreviousPage = page > 1;
  const hasNextPage = hasMoreLogs;
  const visibleActionOptions = scope === "admin" ? adminActionOptions : baseActionOptions;

  const exportLogs = async () => {
    setIsExporting(true);
    setError(null);
    setExportFeedback(null);

    try {
      const csv =
        scope === "admin"
          ? await auditApi.exportAdminAuditLogsCsv(exportQuery)
          : await auditApi.exportRevisionCompletionGateAuditLogsCsv(exportQuery);
      const scopeLabel = scope === "admin" ? "admin" : "koordinator";
      downloadCsv(`completion-gate-audit-${scopeLabel}-${new Date().toISOString().slice(0, 10)}.csv`, csv);
      setExportFeedback("Export CSV berhasil dibuat dan dicatat di audit log.");
      if (scope === "admin" && action === "AUDIT_LOGS_EXPORTED") {
        void loadLogs();
      }
    } catch (err) {
      if (err instanceof ApiError && err.payload.code === "TOO_MANY_REQUESTS") {
        const retryAfterSeconds = Number(err.payload.details?.retryAfterSeconds || 60);
        setError(`Export terlalu sering. Coba lagi sekitar ${retryAfterSeconds} detik lagi.`);
      } else {
        setError(err instanceof Error ? err.message : "Export audit gate revisi gagal.");
      }
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <>
      <SectionCard
        title={
          <span className="inline-flex items-center gap-2">
            <Activity className="h-4 w-4 text-primary" />
            Audit Completion Gate Revisi
          </span>
        }
        className="border-border/70 shadow-sm"
        collapsible={false}
      >
        <div className="flex flex-col gap-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2">
              <select
                value={action}
                onChange={(event) => setAction(event.target.value)}
                className="h-9 rounded-md border border-input bg-background px-3 text-xs font-medium outline-none focus:ring-2 focus:ring-primary/40"
                aria-label="Filter event audit completion gate"
              >
                {visibleActionOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
              <input
                type="date"
                value={createdFrom}
                onChange={(event) => setCreatedFrom(event.target.value)}
                className="h-9 rounded-md border border-input bg-background px-3 text-xs font-medium outline-none focus:ring-2 focus:ring-primary/40"
                aria-label="Tanggal awal audit completion gate"
              />
              <input
                type="date"
                value={createdTo}
                onChange={(event) => setCreatedTo(event.target.value)}
                className="h-9 rounded-md border border-input bg-background px-3 text-xs font-medium outline-none focus:ring-2 focus:ring-primary/40"
                aria-label="Tanggal akhir audit completion gate"
              />
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={exportLogs}
                data-testid="revision-gate-audit-export"
                className="inline-flex h-9 items-center gap-2 rounded-md border border-border px-3 text-xs font-semibold text-foreground hover:bg-muted disabled:opacity-60"
                disabled={isExporting}
              >
                <Download className="h-3.5 w-3.5" />
                {isExporting ? "Export" : "CSV"}
              </button>
              <button
                type="button"
                onClick={loadLogs}
                className="inline-flex h-9 items-center gap-2 rounded-md border border-border px-3 text-xs font-semibold text-foreground hover:bg-muted disabled:opacity-60"
                disabled={isLoading}
              >
                <RefreshCcw className="h-3.5 w-3.5" />
                {isLoading ? "Memuat" : "Refresh"}
              </button>
            </div>
          </div>

          {error && (
            <div
              data-testid="revision-gate-audit-error"
              className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-xs font-medium text-red-700 dark:border-red-900/40 dark:bg-red-950/20 dark:text-red-300"
            >
              {error}
            </div>
          )}

          {exportFeedback && (
            <div
              data-testid="revision-gate-audit-export-feedback"
              className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-medium text-emerald-700 dark:border-emerald-900/40 dark:bg-emerald-950/20 dark:text-emerald-300"
            >
              {exportFeedback}
            </div>
          )}

          <div className="overflow-hidden rounded-lg border border-border/60">
            <table className="w-full text-left text-xs">
              <thead className="bg-muted/60 text-[10px] uppercase text-muted-foreground">
                <tr>
                  <th className="px-3 py-2 font-bold">Waktu</th>
                  <th className="px-3 py-2 font-bold">Event</th>
                  <th className="px-3 py-2 font-bold">Resource</th>
                  <th className="px-3 py-2 font-bold">Alasan</th>
                  <th className="px-3 py-2 font-bold">Detail</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {logs.length === 0 && (
                  <tr>
                    <td className="px-3 py-4 text-center text-muted-foreground" colSpan={5}>
                      Belum ada audit gate revisi.
                    </td>
                  </tr>
                )}
                {logs.map((entry) => {
                  const resource = splitResourceId(entry.resourceId);
                  return (
                    <tr
                      key={entry.id}
                      className="bg-card/70"
                      onDoubleClick={() => setSelectedLog(entry)}
                    >
                      <td className="whitespace-nowrap px-3 py-2 text-muted-foreground">
                        {formatDateTime(entry.createdAt)}
                      </td>
                      <td className="px-3 py-2">
                        <span className="rounded-full border border-border bg-muted/40 px-2 py-0.5 font-semibold">
                          {actionLabels[entry.action] || entry.action}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-muted-foreground">
                        <span className="block font-medium text-foreground">{resource.stage}</span>
                        <span className="block truncate max-w-[220px]">{resource.student}</span>
                      </td>
                      <td className="px-3 py-2 text-muted-foreground">
                        {entry.reason || "-"}
                      </td>
                      <td className="px-3 py-2">
                        <button
                          type="button"
                          data-testid="revision-gate-audit-detail"
                          onClick={() => {
                            setSelectedLog(entry);
                          }}
                          className="rounded-md border border-border px-2.5 py-1 text-[11px] font-semibold text-foreground hover:bg-muted"
                        >
                          Lihat Detail
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-muted-foreground">
            <span>
              Halaman {page} · {logs.length} dari {totalLogs} log
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setPage((current) => Math.max(1, current - 1))}
                className="inline-flex h-8 items-center gap-1 rounded-md border border-border px-2.5 font-semibold text-foreground hover:bg-muted disabled:opacity-50"
                disabled={!hasPreviousPage || isLoading}
                aria-label="Halaman audit sebelumnya"
              >
                <ChevronLeft className="h-3.5 w-3.5" />
                Prev
              </button>
              <button
                type="button"
                data-testid="revision-gate-audit-next-page"
                onClick={() => setPage((current) => current + 1)}
                className="inline-flex h-8 items-center gap-1 rounded-md border border-border px-2.5 font-semibold text-foreground hover:bg-muted disabled:opacity-50"
                disabled={!hasNextPage || isLoading}
                aria-label="Halaman audit berikutnya"
              >
                Next
                <ChevronRight className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        </div>
      </SectionCard>

      {selectedLog && (
        <div
          className="fixed inset-0 z-50 flex justify-end bg-black/40"
          data-testid="revision-gate-audit-drawer"
          role="dialog"
          aria-modal="true"
          aria-labelledby="revision-gate-audit-title"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              setSelectedLog(null);
            }
          }}
        >
          <div
            className="h-full w-full max-w-xl overflow-y-auto border-l border-border bg-background shadow-xl"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <div className="sticky top-0 z-10 flex items-center justify-between border-b border-border bg-background px-5 py-4">
              <div>
                <p className="text-[10px] font-bold uppercase text-muted-foreground">Detail Audit Gate</p>
                <h3 id="revision-gate-audit-title" className="text-base font-semibold text-foreground">
                  {actionLabels[selectedLog.action] || selectedLog.action}
                </h3>
              </div>
              <button
                ref={closeButtonRef}
                type="button"
                data-testid="revision-gate-audit-close"
                onClick={() => setSelectedLog(null)}
                className="rounded-md border border-border p-2 text-muted-foreground hover:bg-muted hover:text-foreground"
                aria-label="Tutup detail audit"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-4 p-5">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div className="rounded-lg border border-border/70 bg-card/60 p-3">
                  <p className="text-[10px] font-bold uppercase text-muted-foreground">Actor</p>
                  <p className="mt-1 text-xs font-semibold text-foreground">{selectedLog.actorRole || "-"}</p>
                  <p className="truncate text-[11px] text-muted-foreground">{selectedLog.actorId || "-"}</p>
                </div>
                <div className="rounded-lg border border-border/70 bg-card/60 p-3">
                  <p className="text-[10px] font-bold uppercase text-muted-foreground">Timestamp</p>
                  <p className="mt-1 text-xs font-semibold text-foreground">{formatDateTime(selectedLog.createdAt)}</p>
                  <p className="truncate text-[11px] text-muted-foreground">{selectedLog.createdAt}</p>
                </div>
                <div className="rounded-lg border border-border/70 bg-card/60 p-3">
                  <p className="text-[10px] font-bold uppercase text-muted-foreground">Mahasiswa</p>
                  <p className="mt-1 truncate text-xs font-semibold text-foreground">{selectedResource?.student}</p>
                </div>
                <div className="rounded-lg border border-border/70 bg-card/60 p-3">
                  <p className="text-[10px] font-bold uppercase text-muted-foreground">Tahap</p>
                  <p className="mt-1 text-xs font-semibold text-foreground">{selectedResource?.stage}</p>
                </div>
              </div>

              <div className="rounded-lg border border-border/70 bg-card/60 p-3">
                <p className="text-[10px] font-bold uppercase text-muted-foreground">Alasan</p>
                <p className="mt-1 text-xs font-medium text-foreground">{selectedLog.reason || "-"}</p>
              </div>

              {selectedGate && (
                <div className="rounded-lg border border-border/70 bg-card/60 p-3">
                  <p className="text-[10px] font-bold uppercase text-muted-foreground">Status Gate</p>
                  <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
                    <div className="flex items-center gap-2 rounded-md border border-border/60 px-3 py-2 text-xs">
                      {selectedGate.readyForFinalUpload ? (
                        <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                      ) : (
                        <XCircle className="h-4 w-4 text-amber-500" />
                      )}
                      Siap unggah final
                    </div>
                    <div className="flex items-center gap-2 rounded-md border border-border/60 px-3 py-2 text-xs">
                      {selectedGate.readyForProgressCompletion ? (
                        <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                      ) : (
                        <XCircle className="h-4 w-4 text-amber-500" />
                      )}
                      Siap selesai tahap
                    </div>
                  </div>
                </div>
              )}

              {selectedGate?.blockingReasons && selectedGate.blockingReasons.length > 0 && (
                <div className="rounded-lg border border-amber-200 bg-amber-50/70 p-3 text-xs text-amber-800 dark:border-amber-900/40 dark:bg-amber-950/20 dark:text-amber-200">
                  <p className="font-bold">Blocking Reasons</p>
                  <ul className="mt-2 list-disc space-y-1 pl-4">
                    {selectedGate.blockingReasons.map((reason) => (
                      <li key={reason}>{reason}</li>
                    ))}
                  </ul>
                </div>
              )}

              {selectedGate?.checks && selectedGate.checks.length > 0 && (
                <div className="rounded-lg border border-border/70 bg-card/60 p-3">
                  <p className="text-[10px] font-bold uppercase text-muted-foreground">Checklist Gate</p>
                  <div className="mt-3 space-y-2">
                    {selectedGate.checks.map((check) => (
                      <div
                        key={`${check.code}-${check.label}`}
                        className="flex items-center justify-between gap-3 rounded-md border border-border/60 px-3 py-2 text-xs"
                      >
                        <div className="min-w-0">
                          <p className="font-semibold text-foreground">{check.label || check.code}</p>
                          <p className="truncate text-[11px] text-muted-foreground">{check.detail || "-"}</p>
                        </div>
                        <span className="shrink-0 rounded-full border border-border bg-muted/40 px-2 py-0.5 text-[10px] font-bold">
                          {check.passed ? "OK" : "Menunggu"}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="rounded-lg border border-border/70 bg-slate-950 p-3 text-slate-100">
                <p className="mb-2 text-[10px] font-bold uppercase text-slate-400">Payload Viewer</p>
                <pre
                  data-testid="revision-gate-audit-payload"
                  className="max-h-72 overflow-auto whitespace-pre-wrap break-words text-[11px] leading-relaxed"
                >
                  {formatPayload(selectedLog.after)}
                </pre>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
