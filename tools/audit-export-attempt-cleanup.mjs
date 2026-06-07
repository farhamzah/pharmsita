const defaultApiBaseUrl = "http://localhost:4000/api/v1";

const options = {
  apiBaseUrl: process.env.API_BASE_URL || defaultApiBaseUrl,
  identifier: process.env.AUDIT_CLEANUP_ADMIN_IDENTIFIER || "admin",
  password: process.env.AUDIT_CLEANUP_ADMIN_PASSWORD || process.env.API_SMOKE_PASSWORD || "demo",
  allowedRetentionDays: Number(process.env.AUDIT_CLEANUP_ALLOWED_RETENTION_DAYS || 30),
  blockedRetentionDays: Number(process.env.AUDIT_CLEANUP_BLOCKED_RETENTION_DAYS || 90),
  limit: Number(process.env.AUDIT_CLEANUP_LIMIT || 1000),
  execute: false,
  confirmCleanup: false,
};

const helpText = `
PharmSITA audit export attempt cleanup

Default mode is dry-run. It estimates cleanup candidates without deleting rows.

Usage:
  npm.cmd run audit:cleanup:export-attempts
  npm.cmd run audit:cleanup:export-attempts -- --execute --confirm-cleanup

Options:
  --api-base-url <url>              API base URL. Default: API_BASE_URL or ${defaultApiBaseUrl}
  --identifier <value>              Admin login identifier. Default: AUDIT_CLEANUP_ADMIN_IDENTIFIER or admin
  --password <value>                Admin login password. Default: AUDIT_CLEANUP_ADMIN_PASSWORD or API_SMOKE_PASSWORD or demo
  --allowed-retention-days <days>   Retention for allowed attempts. Default: 30
  --blocked-retention-days <days>   Retention for blocked attempts. Default: 90
  --limit <rows>                    Max rows per cleanup batch. Default: 1000
  --execute                         Delete matching old attempts instead of dry-run
  --confirm-cleanup                 Required together with --execute
  --help                            Show this help
`;

const readArgValue = (args, index, name) => {
  const value = args[index + 1];
  if (!value || value.startsWith("--")) {
    throw new Error(`${name} requires a value.`);
  }
  return value;
};

const parseArgs = (args) => {
  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    switch (arg) {
      case "--help":
      case "-h":
        console.log(helpText.trim());
        process.exit(0);
        break;
      case "--api-base-url":
        options.apiBaseUrl = readArgValue(args, index, arg);
        index += 1;
        break;
      case "--identifier":
        options.identifier = readArgValue(args, index, arg);
        index += 1;
        break;
      case "--password":
        options.password = readArgValue(args, index, arg);
        index += 1;
        break;
      case "--allowed-retention-days":
        options.allowedRetentionDays = Number(readArgValue(args, index, arg));
        index += 1;
        break;
      case "--blocked-retention-days":
        options.blockedRetentionDays = Number(readArgValue(args, index, arg));
        index += 1;
        break;
      case "--limit":
        options.limit = Number(readArgValue(args, index, arg));
        index += 1;
        break;
      case "--execute":
        options.execute = true;
        break;
      case "--confirm-cleanup":
        options.confirmCleanup = true;
        break;
      default:
        throw new Error(`Unknown option: ${arg}`);
    }
  }
};

const assertNumberRange = (name, value, min, max) => {
  if (!Number.isFinite(value) || !Number.isInteger(value) || value < min || value > max) {
    throw new Error(`${name} must be an integer between ${min} and ${max}.`);
  }
};

const requestJson = async (method, path, { token, body } = {}) => {
  const headers = {
    Accept: "application/json",
  };
  if (token) headers.Authorization = `Bearer ${token}`;
  if (body !== undefined) headers["Content-Type"] = "application/json";

  const response = await fetch(`${options.apiBaseUrl.replace(/\/$/, "")}${path}`, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const text = await response.text();
  const payload = text ? JSON.parse(text) : null;

  if (!response.ok) {
    const message = payload?.message || payload?.error || `HTTP ${response.status}`;
    throw new Error(`${method} ${path} failed: ${message}`);
  }

  return payload;
};

const main = async () => {
  parseArgs(process.argv.slice(2));

  assertNumberRange("allowed-retention-days", options.allowedRetentionDays, 1, 3650);
  assertNumberRange("blocked-retention-days", options.blockedRetentionDays, 1, 3650);
  assertNumberRange("limit", options.limit, 1, 10000);

  if (options.execute && !options.confirmCleanup) {
    throw new Error("--execute requires --confirm-cleanup.");
  }

  const dryRun = !options.execute;
  console.log(`Audit export attempt cleanup target: ${options.apiBaseUrl.replace(/\/$/, "")}`);
  console.log(`Mode: ${dryRun ? "dry-run" : "execute"}`);

  const login = await requestJson("POST", "/auth/login", {
    body: {
      identifier: options.identifier,
      password: options.password,
    },
  });

  const accessToken = login?.accessToken;
  if (!accessToken) {
    throw new Error("Admin login did not return an access token.");
  }
  if (login?.user?.role !== "admin") {
    throw new Error(`Cleanup requires admin role, got ${login?.user?.role || "-"}.`);
  }

  const response = await requestJson("POST", "/admin/audit-export-attempts/cleanup", {
    token: accessToken,
    body: {
      dryRun,
      allowedRetentionDays: options.allowedRetentionDays,
      blockedRetentionDays: options.blockedRetentionDays,
      limit: options.limit,
    },
  });
  const data = response?.data || {};

  console.table([
    {
      mode: data.dryRun ? "dry-run" : "execute",
      allowedRetentionDays: data.allowedRetentionDays,
      blockedRetentionDays: data.blockedRetentionDays,
      limit: data.limit,
      deletedAllowed: data.deletedAllowed,
      deletedBlocked: data.deletedBlocked,
    },
  ]);
  console.log(JSON.stringify(data, null, 2));
};

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
