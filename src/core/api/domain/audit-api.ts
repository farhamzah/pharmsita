import { apiClient, mockApiAdapter } from "../api-client";
import { ApiError } from "../api-types";

export type AuditRole = "mahasiswa" | "dosen" | "admin" | "koordinator";

export interface AuditLogEntry {
  id: string;
  actorId: string | null;
  actorRole: AuditRole | null;
  action: string;
  resourceType: string;
  resourceId: string;
  before?: unknown;
  after?: unknown;
  reason?: string;
  createdAt: string;
}

export interface AuditLogQuery {
  limit?: number;
  offset?: number;
  action?: string;
  resourceType?: string;
  resourceId?: string;
  actorRole?: AuditRole;
  studentId?: string;
  stageId?: string;
  createdFrom?: string;
  createdTo?: string;
}

export interface AuditLogResponse {
  data: AuditLogEntry[];
  meta?: {
    filter?: Record<string, unknown>;
    studentId?: string | null;
    stageId?: string | null;
    total?: number;
    limit?: number;
    offset?: number;
    hasMore?: boolean;
  };
}

export interface AuditExportAttempt {
  id: string;
  actorId: string | null;
  actorRole: AuditRole | null;
  scope: "admin" | "koordinator";
  attemptedAt: string;
  allowed: boolean;
  windowStartedAt: string;
  attemptsInWindow: number;
  maxAttempts: number;
  windowSeconds: number;
}

export interface AuditExportAttemptQuery {
  limit?: number;
  offset?: number;
  scope?: "admin" | "koordinator";
  actorRole?: AuditRole;
  allowed?: boolean;
  createdFrom?: string;
  createdTo?: string;
}

export interface AuditExportAttemptResponse {
  data: AuditExportAttempt[];
  meta?: {
    filter?: Record<string, unknown>;
    total?: number;
    limit?: number;
    offset?: number;
    hasMore?: boolean;
    summary?: {
      allowed?: number;
      blocked?: number;
    };
  };
}

export interface AuditExportAttemptCleanupInput {
  dryRun: boolean;
  allowedRetentionDays: number;
  blockedRetentionDays: number;
  limit: number;
}

export interface AuditExportAttemptCleanupResult {
  dryRun: boolean;
  allowedRetentionDays: number;
  blockedRetentionDays: number;
  allowedBefore: string;
  blockedBefore: string;
  limit: number;
  deletedAllowed: number;
  deletedBlocked: number;
}

export interface AuditExportAttemptCleanupResponse {
  data: AuditExportAttemptCleanupResult;
}

export interface AuditExportCleanupSchedulerStatus {
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
  lastResult: AuditExportAttemptCleanupResult | null;
  lastError: {
    message: string;
    at: string;
  } | null;
  lastSkip: {
    reason: "already-running" | "advisory-lock-held";
    at: string;
  } | null;
}

export interface AuditExportCleanupSchedulerStatusResponse {
  data: AuditExportCleanupSchedulerStatus;
}

const mockGatePayload = {
  stageId: "revisi-sidang",
  readyForFinalUpload: true,
  readyForProgressCompletion: false,
  finalFile: null,
  finalUploadBlockingReasons: [],
  progressCompletionBlockingReasons: ["Dokumen final hasil revisi belum diunggah."],
  blockingReasons: ["Dokumen final hasil revisi belum diunggah."],
  checks: [
    {
      code: "REVISION_ITEMS_DONE",
      label: "Semua butir revisi selesai",
      passed: true,
      detail: "2/2 butir selesai",
      requiredFor: ["final-upload", "progress-completion"],
    },
    {
      code: "FINAL_FILE_UPLOADED",
      label: "Dokumen final hasil revisi",
      passed: false,
      detail: "Belum diunggah",
      requiredFor: ["progress-completion"],
    },
  ],
  evaluatedAt: new Date().toISOString(),
};

const mockRevisionGateAudits: AuditLogEntry[] = [
  {
    id: "mock_gate_read",
    actorId: "mock_coordinator",
    actorRole: "koordinator",
    action: "REVISION_COMPLETION_GATE_READ",
    resourceType: "revision-completion-gate",
    resourceId: "00000000-0000-4000-8000-000000000001:revisi-sidang",
    reason: "Coordinator read revision completion gate.",
    after: mockGatePayload,
    createdAt: new Date().toISOString(),
  },
  {
    id: "mock_gate_blocked",
    actorId: "mock_student",
    actorRole: "mahasiswa",
    action: "REVISION_COMPLETION_GATE_BLOCKED",
    resourceType: "revision-completion-gate",
    resourceId: "00000000-0000-4000-8000-000000000001:revisi-sidang",
    reason: "Dokumen final hasil revisi belum diunggah.",
    after: mockGatePayload,
    createdAt: new Date(Date.now() - 60000).toISOString(),
  },
  {
    id: "mock_gate_allowed",
    actorId: "mock_student",
    actorRole: "mahasiswa",
    action: "REVISION_COMPLETION_GATE_ALLOWED",
    resourceType: "revision-completion-gate",
    resourceId: "00000000-0000-4000-8000-000000000001:revisi-sidang",
    reason: "Progress completion gate allowed.",
    after: {
      ...mockGatePayload,
      readyForProgressCompletion: true,
      finalFile: "task61-final-revisi.pdf",
      progressCompletionBlockingReasons: [],
      blockingReasons: [],
      checks: mockGatePayload.checks.map((check) =>
        check.code === "FINAL_FILE_UPLOADED"
          ? { ...check, passed: true, detail: "task61-final-revisi.pdf" }
          : check
      ),
    },
    createdAt: new Date(Date.now() - 120000).toISOString(),
  },
];

const mockExportAttempts: number[] = [];
const mockAuditExportAttempts: AuditExportAttempt[] = [];
const mockExportGuardWindowMs = 60000;
const mockExportGuardMaxAttempts = 5;
let mockCleanupSchedulerStatus: AuditExportCleanupSchedulerStatus = {
  enabled: false,
  running: false,
  repositoryMode: "json",
  intervalSeconds: 86400,
  retention: {
    allowedDays: 30,
    blockedDays: 90,
  },
  batchSize: 1000,
  advisoryLockKey: 810081,
  startedAt: null,
  lastStartedAt: null,
  lastFinishedAt: null,
  lastResult: null,
  lastError: null,
  lastSkip: null,
};

const recordMockExport = (scope: "admin" | "koordinator", query?: AuditLogQuery) => {
  const now = Date.now();
  const recentAttempts = mockExportAttempts.filter(
    (timestamp) => now - timestamp < mockExportGuardWindowMs
  );
  mockExportAttempts.splice(0, mockExportAttempts.length, ...recentAttempts);

  const allowed = mockExportAttempts.length < mockExportGuardMaxAttempts;
  const attempt: AuditExportAttempt = {
    id: `mock_audit_export_attempt_${scope}_${now}`,
    actorId: `mock_${scope}`,
    actorRole: scope === "admin" ? "admin" : "koordinator",
    scope,
    attemptedAt: new Date(now).toISOString(),
    allowed,
    windowStartedAt: new Date(
      recentAttempts[0] || now - mockExportGuardWindowMs
    ).toISOString(),
    attemptsInWindow: recentAttempts.length + 1,
    maxAttempts: mockExportGuardMaxAttempts,
    windowSeconds: Math.ceil(mockExportGuardWindowMs / 1000),
  };
  mockAuditExportAttempts.unshift(attempt);

  if (!allowed) {
    throw new ApiError(429, {
      code: "TOO_MANY_REQUESTS",
      message: "Export audit terlalu sering. Coba lagi beberapa saat.",
      details: {
        retryAfterSeconds: 60,
        attemptsInWindow: attempt.attemptsInWindow,
        attemptId: attempt.id,
        maxAttempts: mockExportGuardMaxAttempts,
      },
    });
  }

  mockExportAttempts.push(now);
  mockRevisionGateAudits.unshift({
    id: `mock_audit_export_${scope}_${now}`,
    actorId: `mock_${scope}`,
    actorRole: scope === "admin" ? "admin" : "koordinator",
    action: "AUDIT_LOGS_EXPORTED",
    resourceType: "audit-export",
    resourceId: scope,
    reason: "Audit CSV exported.",
    after: {
      scope,
      filter: query || {},
      rowCount: filterMockAudits(query).length,
      filename: `completion-gate-audit-${scope}-${new Date().toISOString().slice(0, 10)}.csv`,
    },
    createdAt: new Date().toISOString(),
  });
};

const filterMockAudits = (query?: AuditLogQuery) =>
  mockRevisionGateAudits
    .filter((entry) =>
      (!query?.action || entry.action === query.action) &&
      (!query?.resourceType || entry.resourceType === query.resourceType) &&
      (!query?.resourceId || entry.resourceId === query.resourceId) &&
      (!query?.actorRole || entry.actorRole === query.actorRole) &&
      (!query?.createdFrom || entry.createdAt >= query.createdFrom) &&
      (!query?.createdTo || entry.createdAt <= query.createdTo)
    )
    .slice(query?.offset || 0, (query?.offset || 0) + (query?.limit || 20));

const countMockAudits = (query?: AuditLogQuery) =>
  mockRevisionGateAudits.filter(
    (entry) =>
      (!query?.action || entry.action === query.action) &&
      (!query?.resourceType || entry.resourceType === query.resourceType) &&
      (!query?.resourceId || entry.resourceId === query.resourceId) &&
      (!query?.actorRole || entry.actorRole === query.actorRole) &&
      (!query?.createdFrom || entry.createdAt >= query.createdFrom) &&
      (!query?.createdTo || entry.createdAt <= query.createdTo)
  ).length;

const toMockMeta = (query?: AuditLogQuery) => {
  const limit = query?.limit || 20;
  const offset = query?.offset || 0;
  const total = countMockAudits(query);

  return {
    filter: query as Record<string, unknown> | undefined,
    total,
    limit,
    offset,
    hasMore: offset + filterMockAudits(query).length < total,
  };
};

const filterMockExportAttempts = (query?: AuditExportAttemptQuery) =>
  mockAuditExportAttempts
    .filter((entry) =>
      (!query?.scope || entry.scope === query.scope) &&
      (!query?.actorRole || entry.actorRole === query.actorRole) &&
      (query?.allowed === undefined || entry.allowed === query.allowed) &&
      (!query?.createdFrom || entry.attemptedAt >= query.createdFrom) &&
      (!query?.createdTo || entry.attemptedAt <= query.createdTo)
    )
    .slice(query?.offset || 0, (query?.offset || 0) + (query?.limit || 20));

const countMockExportAttempts = (query?: AuditExportAttemptQuery) =>
  mockAuditExportAttempts.filter(
    (entry) =>
      (!query?.scope || entry.scope === query.scope) &&
      (!query?.actorRole || entry.actorRole === query.actorRole) &&
      (query?.allowed === undefined || entry.allowed === query.allowed) &&
      (!query?.createdFrom || entry.attemptedAt >= query.createdFrom) &&
      (!query?.createdTo || entry.attemptedAt <= query.createdTo)
  ).length;

const toMockExportAttemptMeta = (query?: AuditExportAttemptQuery) => {
  const limit = query?.limit || 20;
  const offset = query?.offset || 0;
  const total = countMockExportAttempts(query);

  return {
    filter: query as Record<string, unknown> | undefined,
    total,
    limit,
    offset,
    hasMore: offset + filterMockExportAttempts(query).length < total,
    summary: {
      allowed: countMockExportAttempts({ ...query, allowed: true }),
      blocked: countMockExportAttempts({ ...query, allowed: false }),
    },
  };
};

const sensitiveKeyPattern =
  /(password|passcode|token|secret|hash|authorization|credential|session|cookie)/i;

const redactSensitivePayload = (value: unknown): unknown => {
  if (Array.isArray(value)) {
    return value.map(redactSensitivePayload);
  }

  if (!value || typeof value !== "object") {
    return value;
  }

  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>).map(([key, entryValue]) => [
      key,
      sensitiveKeyPattern.test(key) ? "[REDACTED]" : redactSensitivePayload(entryValue),
    ])
  );
};

const buildAuditCsv = (entries: AuditLogEntry[]) => {
  const rows = [
    ["createdAt", "action", "actorRole", "actorId", "resourceType", "resourceId", "reason", "before", "after"],
    ...entries.map((entry) => [
      entry.createdAt,
      entry.action,
      entry.actorRole || "",
      entry.actorId || "",
      entry.resourceType,
      entry.resourceId,
      entry.reason || "",
      JSON.stringify(redactSensitivePayload(entry.before ?? {})),
      JSON.stringify(redactSensitivePayload(entry.after ?? {})),
    ]),
  ];

  return rows
    .map((row) => row.map((value) => `"${String(value ?? "").replace(/"/g, '""')}"`).join(","))
    .join("\n");
};

const toQueryRecord = (query?: AuditLogQuery) =>
  query as Record<string, string | number | boolean | null | undefined> | undefined;

const toExportAttemptQueryRecord = (query?: AuditExportAttemptQuery) =>
  query as Record<string, string | number | boolean | null | undefined> | undefined;

const cleanupMockExportAttempts = (input: AuditExportAttemptCleanupInput) => {
  const allowedBefore = new Date(
    Date.now() - input.allowedRetentionDays * 24 * 60 * 60 * 1000
  ).toISOString();
  const blockedBefore = new Date(
    Date.now() - input.blockedRetentionDays * 24 * 60 * 60 * 1000
  ).toISOString();
  const candidates = mockAuditExportAttempts
    .filter((entry) =>
      entry.allowed
        ? entry.attemptedAt < allowedBefore
        : entry.attemptedAt < blockedBefore
    )
    .sort((first, second) => first.attemptedAt.localeCompare(second.attemptedAt))
    .slice(0, input.limit);
  const deletedAllowed = candidates.filter((entry) => entry.allowed).length;
  const deletedBlocked = candidates.filter((entry) => !entry.allowed).length;

  if (!input.dryRun) {
    const deletedIds = new Set(candidates.map((entry) => entry.id));
    mockAuditExportAttempts.splice(
      0,
      mockAuditExportAttempts.length,
      ...mockAuditExportAttempts.filter((entry) => !deletedIds.has(entry.id))
    );
    mockRevisionGateAudits.unshift({
      id: `mock_audit_export_cleanup_${Date.now()}`,
      actorId: "mock_admin",
      actorRole: "admin",
      action: "AUDIT_EXPORT_ATTEMPTS_CLEANED",
      resourceType: "audit-export-attempt",
      resourceId: "cleanup",
      reason: "Audit export attempt cleanup executed.",
      after: {
        ...input,
        allowedBefore,
        blockedBefore,
        deletedAllowed,
        deletedBlocked,
      },
      createdAt: new Date().toISOString(),
    });
  }

  const result = {
    ...input,
    allowedBefore,
    blockedBefore,
    deletedAllowed,
    deletedBlocked,
  };

  return {
    data: result,
  };
};

mockApiAdapter.register("GET", "/admin/audit-logs", ({ query }) => ({
  data: filterMockAudits(query as AuditLogQuery),
  meta: toMockMeta(query as AuditLogQuery),
}));

mockApiAdapter.register("GET", "/admin/audit-export-attempts", ({ query }) => ({
  data: filterMockExportAttempts(query as AuditExportAttemptQuery),
  meta: toMockExportAttemptMeta(query as AuditExportAttemptQuery),
}));

mockApiAdapter.register("POST", "/admin/audit-export-attempts/cleanup", ({ body }) =>
  {
    const response = cleanupMockExportAttempts(body as AuditExportAttemptCleanupInput);
    mockCleanupSchedulerStatus = {
      ...mockCleanupSchedulerStatus,
      lastStartedAt: new Date().toISOString(),
      lastFinishedAt: new Date().toISOString(),
      lastResult: response.data,
      lastError: null,
    };
    return response;
  }
);

mockApiAdapter.register("GET", "/admin/audit-export-attempts/cleanup/status", () => ({
  data: mockCleanupSchedulerStatus,
}));

mockApiAdapter.register("GET", "/admin/audit-logs/export.csv", ({ query }) =>
  {
    const exportQuery = { ...(query as AuditLogQuery), limit: 500, offset: 0 };
    recordMockExport("admin", exportQuery);
    return buildAuditCsv(filterMockAudits(exportQuery));
  }
);

mockApiAdapter.register("GET", "/coordinator/audit-logs/revision-completion-gates", ({ query }) => ({
  data: filterMockAudits({
    ...(query as AuditLogQuery),
    resourceType: "revision-completion-gate",
  }),
  meta: toMockMeta({
    ...(query as AuditLogQuery),
    resourceType: "revision-completion-gate",
  }),
}));

mockApiAdapter.register("GET", "/coordinator/audit-logs/revision-completion-gates/export.csv", ({ query }) =>
  {
    const exportQuery = {
      ...(query as AuditLogQuery),
      resourceType: "revision-completion-gate",
      limit: 500,
      offset: 0,
    };
    recordMockExport("koordinator", exportQuery);
    return buildAuditCsv(filterMockAudits(exportQuery));
  }
);

export const auditApi = {
  listAdminAuditLogs(query?: AuditLogQuery) {
    return apiClient.get<AuditLogResponse>("/admin/audit-logs", toQueryRecord(query));
  },
  listAdminAuditExportAttempts(query?: AuditExportAttemptQuery) {
    return apiClient.get<AuditExportAttemptResponse>(
      "/admin/audit-export-attempts",
      toExportAttemptQueryRecord(query)
    );
  },
  cleanupAdminAuditExportAttempts(input: AuditExportAttemptCleanupInput) {
    return apiClient.post<
      AuditExportAttemptCleanupResponse,
      AuditExportAttemptCleanupInput
    >("/admin/audit-export-attempts/cleanup", input);
  },
  getAdminAuditExportCleanupSchedulerStatus() {
    return apiClient.get<AuditExportCleanupSchedulerStatusResponse>(
      "/admin/audit-export-attempts/cleanup/status"
    );
  },
  listRevisionCompletionGateAuditLogs(query?: AuditLogQuery) {
    return apiClient.get<AuditLogResponse>(
      "/coordinator/audit-logs/revision-completion-gates",
      toQueryRecord(query)
    );
  },
  exportAdminAuditLogsCsv(query?: AuditLogQuery) {
    return apiClient.get<string>("/admin/audit-logs/export.csv", toQueryRecord(query));
  },
  exportRevisionCompletionGateAuditLogsCsv(query?: AuditLogQuery) {
    return apiClient.get<string>(
      "/coordinator/audit-logs/revision-completion-gates/export.csv",
      toQueryRecord(query)
    );
  },
};
