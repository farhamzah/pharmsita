import { boolField, numberField } from "../../http/request";
import { json, text } from "../../http/response";
import type { Router } from "../../http/router";
import { authService } from "../auth/auth-service";
import { auditService } from "./audit-service";
import { auditExportCleanupScheduler } from "../../schedulers/audit-export-cleanup-scheduler";
import type {
  AuditExportAttemptFilter,
  AuditExportScope,
  AuditLogFilter,
  UserRole,
} from "../../domain/types";

const clampLimit = (query: URLSearchParams) => {
  const limit = numberField(
    { limit: Number(query.get("limit") || 100) },
    "limit",
    100
  );

  return Math.min(Math.max(limit, 1), 500);
};

const clampOffset = (query: URLSearchParams) => {
  const offset = numberField(
    { offset: Number(query.get("offset") || 0) },
    "offset",
    0
  );

  return Math.max(offset, 0);
};

const clampNumber = (value: number, min: number, max: number) =>
  Math.min(Math.max(Math.trunc(value), min), max);

const nullableQuery = (query: URLSearchParams, key: string) => {
  const value = query.get(key)?.trim();
  return value || null;
};

const dateBoundaryQuery = (
  query: URLSearchParams,
  key: string,
  boundary: "start" | "end"
) => {
  const value = nullableQuery(query, key);
  if (!value) return null;
  if (value.includes("T")) return value;

  const suffix =
    boundary === "start" ? "T00:00:00.000Z" : "T23:59:59.999Z";
  return `${value}${suffix}`;
};

const booleanQuery = (query: URLSearchParams, key: string) => {
  const value = nullableQuery(query, key);
  if (value === "true") return true;
  if (value === "false") return false;
  return null;
};

const readAuditFilter = (query: URLSearchParams): AuditLogFilter => ({
  limit: clampLimit(query),
  offset: clampOffset(query),
  action: nullableQuery(query, "action"),
  resourceType: nullableQuery(query, "resourceType"),
  resourceId: nullableQuery(query, "resourceId"),
  actorRole: nullableQuery(query, "actorRole") as UserRole | null,
  createdFrom: dateBoundaryQuery(query, "createdFrom", "start"),
  createdTo: dateBoundaryQuery(query, "createdTo", "end"),
});

const readAuditExportAttemptFilter = (
  query: URLSearchParams
): AuditExportAttemptFilter => ({
  limit: clampLimit(query),
  offset: clampOffset(query),
  scope: nullableQuery(query, "scope") as AuditExportScope | null,
  actorRole: nullableQuery(query, "actorRole") as UserRole | null,
  allowed: booleanQuery(query, "allowed"),
  createdFrom: dateBoundaryQuery(query, "createdFrom", "start"),
  createdTo: dateBoundaryQuery(query, "createdTo", "end"),
});

const exportScopeLabels: Record<AuditExportScope, string> = {
  admin: "admin",
  koordinator: "koordinator",
};

const csvFilenameValue = (scope: AuditExportScope) => {
  const date = new Date().toISOString().slice(0, 10);
  return `completion-gate-audit-${exportScopeLabels[scope]}-${date}.csv`;
};

const csvDisposition = (filename: string) =>
  `attachment; filename="${filename}"`;

export const registerAuditRoutes = (router: Router) => {
  router.get("/admin/audit-logs", async ({ headers, query }) => {
    await authService.requirePermission(headers, "audit.read");

    return json(await auditService.listPage(readAuditFilter(query)));
  });

  router.get("/admin/audit-export-attempts", async ({ headers, query }) => {
    await authService.requirePermission(headers, "audit.read");

    return json(await auditService.listExportAttemptsPage(readAuditExportAttemptFilter(query)));
  });

  router.get("/admin/audit-export-attempts/cleanup/status", async ({ headers }) => {
    await authService.requirePermission(headers, "audit.read");

    return json({
      data: auditExportCleanupScheduler.getStatus(),
    });
  });

  router.post("/admin/audit-export-attempts/cleanup", async ({ headers, body }) => {
    const actor = await authService.requirePermission(headers, "audit.read");
    const dryRun = boolField(body, "dryRun", true);
    const allowedRetentionDays = clampNumber(
      numberField(body, "allowedRetentionDays", 30),
      1,
      3650
    );
    const blockedRetentionDays = clampNumber(
      numberField(body, "blockedRetentionDays", 90),
      1,
      3650
    );
    const limit = clampNumber(numberField(body, "limit", 1000), 1, 10000);

    return json(
      await auditService.cleanupExportAttempts({
        actor,
        dryRun,
        allowedRetentionDays,
        blockedRetentionDays,
        limit,
      })
    );
  });

  router.get("/admin/audit-logs/export.csv", async ({ headers, query }) => {
    const actor = await authService.requirePermission(headers, "audit.read");
    const filename = csvFilenameValue("admin");
    const exportResult = await auditService.exportCsv({
      actor,
      scope: "admin",
      filter: { ...readAuditFilter(query), limit: 500, offset: 0 },
      filename,
    });

    return text(exportResult.csv, 200, {
      "Content-Disposition": csvDisposition(filename),
      "Content-Type": "text/csv; charset=utf-8",
    });
  });

  router.get("/coordinator/audit-logs/revision-completion-gates", async ({ headers, query }) => {
    await authService.requireAnyPermission(headers, [
      "coordinator.monitoring.read",
      "coordinator.progress.manage",
      "workflow.override",
    ]);
    const studentId = nullableQuery(query, "studentId");
    const stageId = nullableQuery(query, "stageId");
    const resourceId = studentId && stageId ? `${studentId}:${stageId}` : null;
    const filter: AuditLogFilter = {
      limit: clampLimit(query),
      offset: clampOffset(query),
      resourceType: "revision-completion-gate",
      action: nullableQuery(query, "action"),
      createdFrom: dateBoundaryQuery(query, "createdFrom", "start"),
      createdTo: dateBoundaryQuery(query, "createdTo", "end"),
      ...(resourceId ? { resourceId } : {}),
    };

    const result = await auditService.listPage(filter);

    return json({
      ...result,
      meta: {
        ...result.meta,
        studentId,
        stageId,
      },
    });
  });

  router.get("/coordinator/audit-logs/revision-completion-gates/export.csv", async ({ headers, query }) => {
    const actor = await authService.requireAnyPermission(headers, [
      "coordinator.monitoring.read",
      "coordinator.progress.manage",
      "workflow.override",
    ]);
    const studentId = nullableQuery(query, "studentId");
    const stageId = nullableQuery(query, "stageId");
    const resourceId = studentId && stageId ? `${studentId}:${stageId}` : null;
    const filter: AuditLogFilter = {
      limit: 500,
      offset: 0,
      resourceType: "revision-completion-gate",
      action: nullableQuery(query, "action"),
      createdFrom: dateBoundaryQuery(query, "createdFrom", "start"),
      createdTo: dateBoundaryQuery(query, "createdTo", "end"),
      ...(resourceId ? { resourceId } : {}),
    };
    const filename = csvFilenameValue("koordinator");
    const exportResult = await auditService.exportCsv({
      actor,
      scope: "koordinator",
      filter,
      filename,
    });

    return text(exportResult.csv, 200, {
      "Content-Disposition": csvDisposition(filename),
      "Content-Type": "text/csv; charset=utf-8",
    });
  });
};
