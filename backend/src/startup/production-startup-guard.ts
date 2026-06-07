import { config } from "../config";

export interface StartupGuardIssue {
  code: string;
  message: string;
}

export interface StartupGuardResult {
  enforced: boolean;
  status: "ok" | "skipped" | "error";
  issues: StartupGuardIssue[];
}

export class StartupGuardError extends Error {
  constructor(public readonly result: StartupGuardResult) {
    super("Production startup guard failed.");
  }
}

const defaultAuthSecrets = new Set([
  "dev-only-change-this-secret-before-production",
  "change-this-secret-before-production",
]);

const placeholderFragments = [
  "change-this",
  "replace-with",
  "dev-only",
  "example",
  "user:pass",
];

const readRaw = (name: string) => (process.env[name] || "").trim();

const isProduction = () => readRaw("NODE_ENV") === "production";

const hasPlaceholder = (value: string) => {
  const normalized = value.toLowerCase();
  return placeholderFragments.some((fragment) => normalized.includes(fragment));
};

const parseOrigin = (origin: string) => {
  try {
    return new URL(origin);
  } catch {
    return null;
  }
};

const isLocalhost = (hostname: string) => {
  const normalized = hostname.toLowerCase();
  return (
    normalized === "localhost" ||
    normalized === "127.0.0.1" ||
    normalized === "::1" ||
    normalized === "[::1]" ||
    normalized === "0.0.0.0"
  );
};

const readCorsOrigins = () =>
  readRaw("CORS_ORIGIN")
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);

const validateAuthSecret = (issues: StartupGuardIssue[]) => {
  const rawAuthSecret = readRaw("AUTH_SECRET");

  if (!rawAuthSecret) {
    issues.push({
      code: "AUTH_SECRET_REQUIRED",
      message: "AUTH_SECRET wajib diset saat NODE_ENV=production.",
    });
    return;
  }

  if (defaultAuthSecrets.has(rawAuthSecret) || hasPlaceholder(rawAuthSecret)) {
    issues.push({
      code: "AUTH_SECRET_PLACEHOLDER",
      message: "AUTH_SECRET masih memakai nilai default/placeholder.",
    });
  }

  if (rawAuthSecret.length < 32) {
    issues.push({
      code: "AUTH_SECRET_TOO_SHORT",
      message: "AUTH_SECRET production minimal 32 karakter.",
    });
  }
};

const validateDatabase = (issues: StartupGuardIssue[]) => {
  const rawAdapter = readRaw("DB_ADAPTER");
  const rawDatabaseUrl = readRaw("DATABASE_URL");

  if (rawAdapter !== "postgres") {
    issues.push({
      code: "DB_ADAPTER_MUST_BE_POSTGRES",
      message: "DB_ADAPTER wajib bernilai postgres saat NODE_ENV=production.",
    });
  }

  if (!rawDatabaseUrl) {
    issues.push({
      code: "DATABASE_URL_REQUIRED",
      message: "DATABASE_URL wajib diset saat NODE_ENV=production.",
    });
    return;
  }

  let parsedUrl: URL | null = null;
  try {
    parsedUrl = new URL(rawDatabaseUrl);
  } catch {
    issues.push({
      code: "DATABASE_URL_INVALID",
      message: "DATABASE_URL harus berupa PostgreSQL connection string yang valid.",
    });
    return;
  }

  if (!["postgres:", "postgresql:"].includes(parsedUrl.protocol)) {
    issues.push({
      code: "DATABASE_URL_PROTOCOL_INVALID",
      message: "DATABASE_URL production harus memakai protocol postgres/postgresql.",
    });
  }

  if (!parsedUrl.username || !parsedUrl.password || !parsedUrl.pathname.replace("/", "")) {
    issues.push({
      code: "DATABASE_URL_INCOMPLETE",
      message: "DATABASE_URL harus berisi username, password, host, dan nama database.",
    });
  }

  if (hasPlaceholder(rawDatabaseUrl) || parsedUrl.pathname.toLowerCase().includes("smoke")) {
    issues.push({
      code: "DATABASE_URL_PLACEHOLDER_OR_SMOKE",
      message: "DATABASE_URL tidak boleh memakai placeholder atau database smoke.",
    });
  }
};

const validateCors = (issues: StartupGuardIssue[]) => {
  const rawCorsOrigin = readRaw("CORS_ORIGIN");
  const origins = readCorsOrigins();

  if (!rawCorsOrigin || origins.length === 0) {
    issues.push({
      code: "CORS_ORIGIN_REQUIRED",
      message: "CORS_ORIGIN wajib diset eksplisit saat NODE_ENV=production.",
    });
    return;
  }

  origins.forEach((origin) => {
    if (origin === "*") {
      issues.push({
        code: "CORS_ORIGIN_WILDCARD",
        message: "CORS_ORIGIN production tidak boleh wildcard.",
      });
      return;
    }

    const parsedOrigin = parseOrigin(origin);
    if (!parsedOrigin) {
      issues.push({
        code: "CORS_ORIGIN_INVALID",
        message: "CORS_ORIGIN harus berisi origin URL valid.",
      });
      return;
    }

    if (!["http:", "https:"].includes(parsedOrigin.protocol)) {
      issues.push({
        code: "CORS_ORIGIN_PROTOCOL_INVALID",
        message: "CORS_ORIGIN hanya boleh memakai http atau https.",
      });
    }

    if (isLocalhost(parsedOrigin.hostname)) {
      issues.push({
        code: "CORS_ORIGIN_LOCALHOST",
        message: "CORS_ORIGIN production tidak boleh memakai localhost atau loopback.",
      });
    }

    if (hasPlaceholder(origin)) {
      issues.push({
        code: "CORS_ORIGIN_PLACEHOLDER",
        message: "CORS_ORIGIN masih memakai domain placeholder/example.",
      });
    }
  });
};

export const collectProductionStartupIssues = (): StartupGuardResult => {
  if (!isProduction()) {
    return {
      enforced: false,
      status: "skipped",
      issues: [],
    };
  }

  const issues: StartupGuardIssue[] = [];

  validateAuthSecret(issues);
  validateDatabase(issues);
  validateCors(issues);

  return {
    enforced: true,
    status: issues.length === 0 ? "ok" : "error",
    issues,
  };
};

export const assertProductionStartupReady = () => {
  const result = collectProductionStartupIssues();

  if (result.status === "error") {
    throw new StartupGuardError(result);
  }

  return result;
};

export const formatStartupGuardResult = (result: StartupGuardResult) => {
  if (result.status !== "error") {
    return result.enforced
      ? "Production startup guard passed."
      : "Production startup guard skipped because NODE_ENV is not production.";
  }

  return [
    "Production startup guard failed:",
    ...result.issues.map((issue) => `- ${issue.code}: ${issue.message}`),
  ].join("\n");
};

export const hasDefaultAuthSecret = () =>
  defaultAuthSecrets.has(config.authSecret) || hasPlaceholder(config.authSecret);
