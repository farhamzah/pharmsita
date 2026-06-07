import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

const defaultPaths = {
  nginx: path.join(rootDir, "deploy", "vps", "nginx", "pharmsita.conf.example"),
  systemd: path.join(rootDir, "deploy", "vps", "systemd", "pharmsita-backend.service.example"),
  logrotate: path.join(rootDir, "deploy", "vps", "logrotate", "pharmsita.example"),
  backendEnv: path.join(rootDir, "deploy", "vps", "backend.env.example"),
};

const usage = `Usage:
  npm.cmd run deploy:vps:dry-run
  npm.cmd run deploy:vps:dry-run -- --skip-network
  npm.cmd run deploy:vps:dry-run -- --api-base-url https://pharmsita.example.ac.id/api/v1

Options:
  --api-base-url <url>            HTTPS API base URL, e.g. https://domain.ac.id/api/v1.
  --frontend-url <url>            Frontend URL when it differs from the API origin.
  --allow-http                    Allow HTTP URL for local/staging checks.
  --allow-degraded-readiness       Treat /health/ready degraded as WARN instead of FAIL.
  --skip-network                  Only validate deployment files; skip live health checks.
  --skip-frontend                 Skip frontend root HTML check.
  --nginx-conf <path>             Nginx config/template path.
  --systemd-service <path>        systemd service/template path.
  --logrotate-conf <path>         logrotate config/template path.
  --backend-env <path>            Backend env/template path.
  --help                          Show this help.
`;

const checks = [];

const addCheck = (name, result, detail = "") => {
  checks.push({ name, result, detail });
};

const failCheck = (name, error) => {
  addCheck(name, "FAIL", error instanceof Error ? error.message : String(error));
};

const parseArgs = (argv) => {
  const options = {
    apiBaseUrl: (process.env.VPS_DRY_RUN_API_BASE_URL || process.env.API_BASE_URL || "").replace(/\/$/, ""),
    frontendUrl: (process.env.VPS_DRY_RUN_FRONTEND_URL || "").replace(/\/$/, ""),
    allowHttp: ["1", "true", "yes", "on"].includes(String(process.env.VPS_DRY_RUN_ALLOW_HTTP || "").toLowerCase()),
    allowDegradedReadiness: ["1", "true", "yes", "on"].includes(
      String(process.env.VPS_DRY_RUN_ALLOW_DEGRADED_READINESS || "").toLowerCase()
    ),
    skipNetwork: false,
    skipFrontend: false,
    nginxConf: defaultPaths.nginx,
    systemdService: defaultPaths.systemd,
    logrotateConf: defaultPaths.logrotate,
    backendEnv: defaultPaths.backendEnv,
    help: false,
  };

  const args = [...argv];
  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    if (arg === "--api-base-url") {
      options.apiBaseUrl = (args[++index] || "").replace(/\/$/, "");
    } else if (arg === "--frontend-url") {
      options.frontendUrl = (args[++index] || "").replace(/\/$/, "");
    } else if (arg === "--allow-http") {
      options.allowHttp = true;
    } else if (arg === "--allow-degraded-readiness") {
      options.allowDegradedReadiness = true;
    } else if (arg === "--skip-network") {
      options.skipNetwork = true;
    } else if (arg === "--skip-frontend") {
      options.skipFrontend = true;
    } else if (arg === "--nginx-conf") {
      options.nginxConf = path.resolve(args[++index] || "");
    } else if (arg === "--systemd-service") {
      options.systemdService = path.resolve(args[++index] || "");
    } else if (arg === "--logrotate-conf") {
      options.logrotateConf = path.resolve(args[++index] || "");
    } else if (arg === "--backend-env") {
      options.backendEnv = path.resolve(args[++index] || "");
    } else if (arg === "--help" || arg === "-h") {
      options.help = true;
    } else {
      throw new Error(`Unknown argument: ${arg}`);
    }
  }

  return options;
};

const readRequiredFile = async (label, filename) => {
  const content = await fs.readFile(filename, "utf8");
  addCheck(`${label} file exists`, "PASS", filename);
  return content;
};

const requirePatterns = (label, content, patterns) => {
  patterns.forEach(([name, pattern]) => {
    const passed = typeof pattern === "string" ? content.includes(pattern) : pattern.test(content);
    addCheck(`${label}: ${name}`, passed ? "PASS" : "FAIL", passed ? "" : `Missing ${pattern}`);
  });
};

const parseEnv = (content) => {
  const env = {};
  content.split(/\r?\n/).forEach((line) => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) return;
    const separator = trimmed.indexOf("=");
    if (separator < 1) return;
    env[trimmed.slice(0, separator)] = trimmed.slice(separator + 1);
  });
  return env;
};

const validateBackendEnv = async (filename) => {
  try {
    const content = await readRequiredFile("Backend env", filename);
    const env = parseEnv(content);
    const placeholders = ["example.", "change-this", "replace-with", "dev-only"];

    requirePatterns("Backend env", content, [
      ["NODE_ENV=production", "NODE_ENV=production"],
      ["DB_ADAPTER=postgres", "DB_ADAPTER=postgres"],
      ["DATABASE_URL present", /^DATABASE_URL=postgres:\/\//m],
      ["AUTH_SECRET present", /^AUTH_SECRET=.+/m],
      ["CORS_ORIGIN present", /^CORS_ORIGIN=https:\/\//m],
    ]);

    const hasPlaceholder = Object.values(env).some((value) =>
      placeholders.some((placeholder) => value.includes(placeholder))
    );
    addCheck(
      "Backend env: placeholder review",
      hasPlaceholder ? "WARN" : "PASS",
      hasPlaceholder ? "Replace example domain, database password, and AUTH_SECRET on VPS." : ""
    );
  } catch (error) {
    failCheck("Backend env", error);
  }
};

const validateNginx = async (filename) => {
  try {
    const content = await readRequiredFile("Nginx", filename);
    requirePatterns("Nginx", content, [
      ["HTTPS server block", /listen\s+443\s+ssl/],
      ["HTTP to HTTPS redirect", "return 301 https://$host$request_uri;"],
      ["SPA fallback", "try_files $uri $uri/ /index.html;"],
      ["API proxy location", "location ^~ /api/v1/"],
      ["backend upstream", "upstream pharmsita_backend"],
      ["X-Request-Id map", "map $http_x_request_id $pharmsita_request_id"],
      ["X-Request-Id regex guard", "~^[a-zA-Z0-9._:-]{8,128}$"],
      ["X-Request-Id forwarded", "proxy_set_header X-Request-Id $pharmsita_request_id;"],
      ["upstream X-Request-Id hidden", "proxy_hide_header X-Request-Id;"],
      ["response X-Request-Id exposed", "add_header X-Request-Id $pharmsita_request_id always;"],
      ["X-Forwarded-For", "proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;"],
      ["Nginx access log", "access_log /var/log/nginx/pharmsita_access.log"],
      ["Nginx error log", "error_log /var/log/nginx/pharmsita_error.log"],
      ["security header nosniff", 'add_header X-Content-Type-Options "nosniff" always;'],
    ]);
  } catch (error) {
    failCheck("Nginx", error);
  }
};

const validateSystemd = async (filename) => {
  try {
    const content = await readRequiredFile("systemd", filename);
    requirePatterns("systemd", content, [
      ["service user", "User=pharmsita"],
      ["service group", "Group=pharmsita"],
      ["working directory", "WorkingDirectory=/var/www/pharmsita/current"],
      ["environment file", "EnvironmentFile=/etc/pharmsita/backend.env"],
      ["production guard pre-start", "ExecStartPre=/usr/bin/node backend/dist/server.js --check-production-env"],
      ["backend start", "ExecStart=/usr/bin/node backend/dist/server.js"],
      ["restart on failure", "Restart=on-failure"],
      ["stdout log", "StandardOutput=append:/var/log/pharmsita/backend.log"],
      ["stderr log", "StandardError=append:/var/log/pharmsita/backend-error.log"],
      ["no new privileges", "NoNewPrivileges=true"],
      ["strict filesystem protection", "ProtectSystem=strict"],
      ["log write path", "ReadWritePaths=/var/log/pharmsita"],
      ["file descriptor limit", "LimitNOFILE=65535"],
    ]);
  } catch (error) {
    failCheck("systemd", error);
  }
};

const validateLogrotate = async (filename) => {
  try {
    const content = await readRequiredFile("logrotate", filename);
    requirePatterns("logrotate", content, [
      ["backend log target", "/var/log/pharmsita/*.log"],
      ["nginx log target", "/var/log/nginx/pharmsita_*.log"],
      ["daily rotation", "daily"],
      ["retention", "rotate 14"],
      ["compression", "compress"],
      ["backend copytruncate", "copytruncate"],
      ["nginx reopen signal", "kill -USR1"],
    ]);
  } catch (error) {
    failCheck("logrotate", error);
  }
};

const requestJson = async (url, requestId) => {
  const response = await fetch(url, {
    headers: {
      Accept: "application/json",
      "X-Request-Id": requestId,
    },
  });
  const text = await response.text();
  let payload = null;
  if (text) {
    try {
      payload = JSON.parse(text);
    } catch {
      payload = text;
    }
  }
  return {
    status: response.status,
    requestId: response.headers.get("x-request-id") || "",
    payload,
  };
};

const validateLiveHealth = async (options) => {
  if (options.skipNetwork) {
    addCheck("Live HTTPS health", "SKIP", "--skip-network");
    return;
  }

  if (!options.apiBaseUrl) {
    addCheck("Live HTTPS health", "SKIP", "Set --api-base-url or VPS_DRY_RUN_API_BASE_URL.");
    return;
  }

  let apiUrl;
  try {
    apiUrl = new URL(options.apiBaseUrl);
  } catch {
    addCheck("Live HTTPS health: URL", "FAIL", `Invalid URL: ${options.apiBaseUrl}`);
    return;
  }

  const isLocal = ["localhost", "127.0.0.1", "::1"].includes(apiUrl.hostname);
  const httpsOk = apiUrl.protocol === "https:" || options.allowHttp || isLocal;
  addCheck(
    "Live HTTPS health: scheme",
    httpsOk ? "PASS" : "FAIL",
    httpsOk ? apiUrl.protocol : "Production check must use HTTPS, or pass --allow-http for local testing."
  );

  const requestId = `task104-${Date.now()}`;
  try {
    const health = await requestJson(`${options.apiBaseUrl}/health`, requestId);
    addCheck(
      "Live HTTPS health: /health",
      health.status === 200 && health.payload?.status === "ok" ? "PASS" : "FAIL",
      `status=${health.status}; body=${health.payload?.status || "-"}`
    );
    addCheck(
      "Live HTTPS health: X-Request-Id",
      health.requestId === requestId ? "PASS" : "FAIL",
      `expected=${requestId}; actual=${health.requestId || "-"}`
    );
  } catch (error) {
    failCheck("Live HTTPS health: /health", error);
  }

  try {
    const ready = await requestJson(`${options.apiBaseUrl}/health/ready`, `${requestId}-ready`);
    const readiness = ready.payload?.status || "unknown";
    const pass = ready.status === 200 && readiness === "ready";
    const warn = options.allowDegradedReadiness && readiness === "degraded";
    addCheck(
      "Live HTTPS health: /health/ready",
      pass ? "PASS" : warn ? "WARN" : "FAIL",
      `status=${ready.status}; readiness=${readiness}`
    );
  } catch (error) {
    failCheck("Live HTTPS health: /health/ready", error);
  }

  if (options.skipFrontend) {
    addCheck("Live frontend root", "SKIP", "--skip-frontend");
    return;
  }

  try {
    const frontendUrl = options.frontendUrl || `${apiUrl.protocol}//${apiUrl.host}`;
    const frontend = await fetch(frontendUrl, {
      headers: { Accept: "text/html" },
    });
    const text = await frontend.text();
    addCheck(
      "Live frontend root",
      frontend.status === 200 && /<div\s+id=["']root["']/.test(text) ? "PASS" : "FAIL",
      `url=${frontendUrl}; status=${frontend.status}`
    );
  } catch (error) {
    failCheck("Live frontend root", error);
  }
};

const run = async () => {
  const options = parseArgs(process.argv.slice(2));
  if (options.help) {
    console.log(usage);
    return;
  }

  await validateBackendEnv(options.backendEnv);
  await validateNginx(options.nginxConf);
  await validateSystemd(options.systemdService);
  await validateLogrotate(options.logrotateConf);
  await validateLiveHealth(options);

  console.table(checks);
  const failed = checks.filter((check) => check.result === "FAIL");
  const warnings = checks.filter((check) => check.result === "WARN");

  if (failed.length > 0) {
    throw new Error(`VPS deployment dry-run failed: ${failed.length} failure(s).`);
  }

  console.log(
    `VPS deployment dry-run passed with ${checks.length} checks` +
      (warnings.length ? ` and ${warnings.length} warning(s).` : ".")
  );
};

run().catch((error) => {
  if (checks.length > 0) {
    console.table(checks);
  }
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
