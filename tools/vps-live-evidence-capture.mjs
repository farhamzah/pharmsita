import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

const usage = `Usage:
  npm.cmd run release:live-evidence:capture -- --skip-system --skip-network --skip-db --allow-incomplete --force
  npm run release:live-evidence:capture -- --release-dir /var/www/pharmsita/current --release-archive /var/www/pharmsita/releases/<release-id>.tar.gz --artifact-checksums /var/www/pharmsita/releases/artifact-checksums.sha256 --api-base-url https://pharmsita.example.ac.id/api/v1 --database-url <postgres-url> --backup-manifest <manifest> --execute-system-checks --require-system --require-network --require-db-gate

Options:
  --release-dir <path>              Active release directory. Default: current working directory.
  --release-id <value>              Release label for the report. Defaults to package/manifest value.
  --release-archive <path>          Release archive used for this cutover.
  --artifact-checksums <path>       artifact-checksums.sha256 path for archive verification.
  --current-symlink <path>          Current symlink path. Default: /var/www/pharmsita/current.
  --require-current-symlink         Fail if current symlink does not point to --release-dir.
  --work-dir <path>                 Evidence output directory. Default: releases/live-evidence.
  --force                           Replace existing work directory.
  --operator <name>                 Operator name/identifier for the report.
  --notes <text>                    Free-form report note.
  --database-url <url>              PostgreSQL URL for backup gate and production smoke.
  --backup-manifest <path>          Verified backup manifest used by db:migrate:gate.
  --require-db-gate                 Fail if database URL or backup manifest is missing.
  --require-restore-drill           Pass restore-drill requirement to db:migrate:gate.
  --max-age-hours <number>          Backup freshness for gate. Default: 24.
  --restore-drill-max-age-hours <n> Restore drill freshness for gate. Default: 168.
  --api-base-url <url>              Live API base URL, e.g. https://domain.ac.id/api/v1.
  --frontend-url <url>              Frontend URL when different from API origin.
  --allow-http                      Allow HTTP URL for local/staging checks.
  --allow-degraded-readiness        Treat degraded readiness as WARN in delegated checks.
  --require-network                 Fail if live URL is missing.
  --execute-system-checks           Run nginx/systemctl/journalctl checks. Default on Linux.
  --skip-system                     Skip nginx/systemctl/journalctl raw evidence.
  --require-system                  Fail if system checks are skipped or fail.
  --sudo-system                     Prefix nginx/systemctl/journalctl checks with sudo.
  --service-name <name>             systemd service name. Default: pharmsita-backend.
  --nginx-binary <path>             nginx executable. Default: nginx.
  --systemctl-binary <path>         systemctl executable. Default: systemctl.
  --journalctl-binary <path>        journalctl executable. Default: journalctl.
  --journal-lines <number>          Number of journal lines to capture. Default: 120.
  --skip-network                    Skip live HTTPS evidence.
  --skip-db                         Skip backup gate and DB-backed smoke.
  --allow-incomplete                Allow SKIP/INCOMPLETE result without failing command.
  --timeout-ms <number>             Per-command timeout. Default: 120000.
  --help                            Show this help.
`;

const evidence = [];
const gates = [];

const addGate = (name, status, detail = "") => {
  gates.push({ name, status, detail });
};

const parsePositiveNumber = (value, label) => {
  const number = Number(value);
  if (!Number.isFinite(number) || number <= 0) {
    throw new Error(`${label} must be a positive number.`);
  }
  return number;
};

const pathExists = async (filename) => {
  try {
    await fs.access(filename);
    return true;
  } catch {
    return false;
  }
};

const readJson = async (filename) => JSON.parse(await fs.readFile(filename, "utf8"));

const sha256Buffer = (buffer) => crypto.createHash("sha256").update(buffer).digest("hex");

const sha256File = async (filename) => sha256Buffer(await fs.readFile(filename));

const parseArgs = (argv) => {
  const options = {
    releaseDir: process.cwd(),
    releaseId: "",
    releaseArchive: "",
    artifactChecksums: "",
    currentSymlink: "/var/www/pharmsita/current",
    requireCurrentSymlink: false,
    workDir: path.join(rootDir, "releases", "live-evidence"),
    force: false,
    operator: "",
    notes: "",
    databaseUrl: process.env.DATABASE_URL || "",
    backupManifest: "",
    requireDbGate: false,
    requireRestoreDrill: false,
    maxAgeHours: 24,
    restoreDrillMaxAgeHours: 168,
    apiBaseUrl: (process.env.API_BASE_URL || "").replace(/\/$/, ""),
    frontendUrl: "",
    allowHttp: false,
    allowDegradedReadiness: false,
    requireNetwork: false,
    executeSystemChecks: process.platform === "linux",
    skipSystem: false,
    requireSystem: false,
    sudoSystem: false,
    serviceName: "pharmsita-backend",
    nginxBinary: "nginx",
    systemctlBinary: "systemctl",
    journalctlBinary: "journalctl",
    journalLines: 120,
    skipNetwork: false,
    skipDb: false,
    allowIncomplete: false,
    timeoutMs: 120000,
    help: false,
  };

  const args = [...argv];
  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    if (arg === "--release-dir") {
      options.releaseDir = path.resolve(args[++index] || "");
    } else if (arg === "--release-id") {
      options.releaseId = args[++index] || "";
    } else if (arg === "--release-archive") {
      options.releaseArchive = path.resolve(args[++index] || "");
    } else if (arg === "--artifact-checksums") {
      options.artifactChecksums = path.resolve(args[++index] || "");
    } else if (arg === "--current-symlink") {
      options.currentSymlink = path.resolve(args[++index] || "");
    } else if (arg === "--require-current-symlink") {
      options.requireCurrentSymlink = true;
    } else if (arg === "--work-dir") {
      options.workDir = path.resolve(args[++index] || "");
    } else if (arg === "--force") {
      options.force = true;
    } else if (arg === "--operator") {
      options.operator = args[++index] || "";
    } else if (arg === "--notes") {
      options.notes = args[++index] || "";
    } else if (arg === "--database-url") {
      options.databaseUrl = args[++index] || "";
    } else if (arg === "--backup-manifest") {
      options.backupManifest = path.resolve(args[++index] || "");
    } else if (arg === "--require-db-gate") {
      options.requireDbGate = true;
    } else if (arg === "--require-restore-drill") {
      options.requireRestoreDrill = true;
    } else if (arg === "--max-age-hours") {
      options.maxAgeHours = parsePositiveNumber(args[++index], "--max-age-hours");
    } else if (arg === "--restore-drill-max-age-hours") {
      options.restoreDrillMaxAgeHours = parsePositiveNumber(args[++index], "--restore-drill-max-age-hours");
    } else if (arg === "--api-base-url") {
      options.apiBaseUrl = (args[++index] || "").replace(/\/$/, "");
    } else if (arg === "--frontend-url") {
      options.frontendUrl = (args[++index] || "").replace(/\/$/, "");
    } else if (arg === "--allow-http") {
      options.allowHttp = true;
    } else if (arg === "--allow-degraded-readiness") {
      options.allowDegradedReadiness = true;
    } else if (arg === "--require-network") {
      options.requireNetwork = true;
    } else if (arg === "--execute-system-checks") {
      options.executeSystemChecks = true;
    } else if (arg === "--skip-system") {
      options.skipSystem = true;
      options.executeSystemChecks = false;
    } else if (arg === "--require-system") {
      options.requireSystem = true;
    } else if (arg === "--sudo-system") {
      options.sudoSystem = true;
    } else if (arg === "--service-name") {
      options.serviceName = args[++index] || "";
    } else if (arg === "--nginx-binary") {
      options.nginxBinary = args[++index] || "";
    } else if (arg === "--systemctl-binary") {
      options.systemctlBinary = args[++index] || "";
    } else if (arg === "--journalctl-binary") {
      options.journalctlBinary = args[++index] || "";
    } else if (arg === "--journal-lines") {
      options.journalLines = parsePositiveNumber(args[++index], "--journal-lines");
    } else if (arg === "--skip-network") {
      options.skipNetwork = true;
    } else if (arg === "--skip-db") {
      options.skipDb = true;
    } else if (arg === "--allow-incomplete") {
      options.allowIncomplete = true;
    } else if (arg === "--timeout-ms") {
      options.timeoutMs = parsePositiveNumber(args[++index], "--timeout-ms");
    } else if (arg === "--help" || arg === "-h") {
      options.help = true;
    } else {
      throw new Error(`Unknown argument: ${arg}`);
    }
  }

  return options;
};

const redactDatabaseUrl = (databaseUrl) => {
  if (!databaseUrl) return "";
  try {
    const parsed = new URL(databaseUrl);
    if (parsed.password) parsed.password = "***";
    return parsed.toString();
  } catch {
    return "<invalid database url>";
  }
};

const redactText = (text, options) => {
  let output = String(text || "");
  if (options.databaseUrl) {
    output = output.split(options.databaseUrl).join(redactDatabaseUrl(options.databaseUrl));
  }
  return output.replace(/postgres:\/\/([^:\s]+):([^@\s]+)@/g, "postgres://$1:***@");
};

const writeEvidenceFile = async (options, filename, content) => {
  const safeName = filename.replace(/[^a-zA-Z0-9._-]+/g, "-");
  const target = path.join(options.workDir, safeName);
  const text = redactText(String(content || ""), options);
  await fs.writeFile(target, text);
  const buffer = await fs.readFile(target);
  const entry = {
    file: safeName,
    path: target,
    bytes: buffer.length,
    sha256: sha256Buffer(buffer),
  };
  evidence.push(entry);
  return entry;
};

const runProcess = (command, args, options = {}) =>
  new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd: options.cwd || rootDir,
      env: options.env || process.env,
      stdio: ["ignore", "pipe", "pipe"],
      windowsHide: true,
    });

    let stdout = "";
    let stderr = "";
    let settled = false;
    const finish = (fn, value) => {
      if (settled) return;
      settled = true;
      clearTimeout(timeout);
      fn(value);
    };
    const timeout = setTimeout(() => {
      child.kill("SIGTERM");
      finish(reject, new Error(`${command} timed out after ${options.timeoutMs || 120000}ms`));
    }, options.timeoutMs || 120000);

    child.stdout.on("data", (chunk) => {
      stdout += chunk.toString();
    });
    child.stderr.on("data", (chunk) => {
      stderr += chunk.toString();
    });
    child.on("error", (error) => finish(reject, error));
    child.on("close", (code) => {
      const result = { code, stdout, stderr };
      if (code === 0) {
        finish(resolve, result);
        return;
      }
      finish(reject, Object.assign(new Error(`${command} exited with ${code}`), result));
    });
  });

const commandText = (command, args) => `${command} ${args.join(" ")}`.trim();

const runEvidenceCommand = async (options, name, command, args, { required = true } = {}) => {
  const startedAt = new Date().toISOString();
  try {
    const result = await runProcess(command, args, {
      cwd: options.releaseDir,
      timeoutMs: options.timeoutMs,
    });
    const body = [
      `$ ${commandText(command, args)}`,
      `startedAt=${startedAt}`,
      `exitCode=${result.code}`,
      "",
      "## stdout",
      result.stdout || "",
      "",
      "## stderr",
      result.stderr || "",
    ].join("\n");
    const entry = await writeEvidenceFile(options, `${name}.txt`, body);
    addGate(name, "PASS", entry.file);
    return result;
  } catch (error) {
    const body = [
      `$ ${commandText(command, args)}`,
      `startedAt=${startedAt}`,
      `exitCode=${error.code ?? "error"}`,
      "",
      "## stdout",
      error.stdout || "",
      "",
      "## stderr",
      error.stderr || "",
      "",
      "## error",
      error.message || String(error),
    ].join("\n");
    const entry = await writeEvidenceFile(options, `${name}.txt`, body);
    addGate(name, required ? "FAIL" : "WARN", entry.file);
    return null;
  }
};

const systemCommand = (options, command, args) =>
  options.sudoSystem
    ? { command: "sudo", args: [command, ...args] }
    : { command, args };

const resolveReleaseTool = async (options, relativePath) => {
  const releaseTool = path.join(options.releaseDir, relativePath);
  if (await pathExists(releaseTool)) return releaseTool;
  return path.join(rootDir, relativePath);
};

const readReleaseId = async (options) => {
  if (options.releaseId) return options.releaseId;
  const manifest = await readJson(path.join(options.releaseDir, "manifest.json")).catch(() => null);
  if (manifest?.releaseId) return manifest.releaseId;
  const packageJson = await readJson(path.join(options.releaseDir, "package.json")).catch(() => null);
  if (packageJson?.name || packageJson?.version) {
    return `${packageJson.name || "pharmsita"}@${packageJson.version || "0.0.0"}`;
  }
  return path.basename(options.releaseDir);
};

const captureArtifactEvidence = async (options) => {
  const lines = [];
  lines.push(`# Artifact Evidence`);
  lines.push(`releaseDir=${options.releaseDir}`);
  if (options.releaseArchive && await pathExists(options.releaseArchive)) {
    lines.push(`releaseArchive=${options.releaseArchive}`);
    lines.push(`releaseArchiveSha256=${await sha256File(options.releaseArchive)}`);
    addGate("Artifact file", "PASS", path.basename(options.releaseArchive));
  } else if (options.releaseArchive) {
    lines.push(`releaseArchiveMissing=${options.releaseArchive}`);
    addGate("Artifact file", "FAIL", `Missing: ${options.releaseArchive}`);
  } else {
    lines.push("releaseArchive=not supplied");
    addGate("Artifact file", "SKIP", "No --release-archive");
  }

  if (options.artifactChecksums && await pathExists(options.artifactChecksums)) {
    lines.push(`artifactChecksums=${options.artifactChecksums}`);
    lines.push(`artifactChecksumsSha256=${await sha256File(options.artifactChecksums)}`);
    lines.push("");
    lines.push(await fs.readFile(options.artifactChecksums, "utf8"));
    addGate("Artifact checksum file", "PASS", path.basename(options.artifactChecksums));
  } else if (options.artifactChecksums) {
    lines.push(`artifactChecksumsMissing=${options.artifactChecksums}`);
    addGate("Artifact checksum file", "FAIL", `Missing: ${options.artifactChecksums}`);
  } else {
    lines.push("artifactChecksums=not supplied");
    addGate("Artifact checksum file", "SKIP", "No --artifact-checksums");
  }

  await writeEvidenceFile(options, "artifact-evidence.txt", lines.join("\n"));
};

const captureSymlinkEvidence = async (options) => {
  const lines = [`# Symlink Evidence`, `currentSymlink=${options.currentSymlink}`, `releaseDir=${options.releaseDir}`];
  if (!options.currentSymlink || !await pathExists(options.currentSymlink)) {
    lines.push("status=missing");
    addGate("Current symlink evidence", options.requireCurrentSymlink ? "FAIL" : "SKIP", "Current symlink not found");
    await writeEvidenceFile(options, "current-symlink.txt", lines.join("\n"));
    return;
  }

  try {
    const currentReal = await fs.realpath(options.currentSymlink);
    const releaseReal = await fs.realpath(options.releaseDir);
    lines.push(`currentReal=${currentReal}`);
    lines.push(`releaseReal=${releaseReal}`);
    lines.push(`matches=${currentReal === releaseReal ? "yes" : "no"}`);
    addGate(
      "Current symlink evidence",
      currentReal === releaseReal ? "PASS" : "FAIL",
      `current=${currentReal}; release=${releaseReal}`
    );
  } catch (error) {
    lines.push(`error=${error.message || String(error)}`);
    addGate("Current symlink evidence", "FAIL", error.message || String(error));
  }

  await writeEvidenceFile(options, "current-symlink.txt", lines.join("\n"));
};

const runLiveQa = async (options) => {
  const script = await resolveReleaseTool(options, "tools/vps-live-cutover-qa.mjs");
  const liveQaDir = path.join(options.workDir, "live-qa");
  const args = [
    script,
    "--release-dir",
    options.releaseDir,
    "--work-dir",
    liveQaDir,
    "--force",
  ];

  if (options.releaseArchive) args.push("--release-archive", options.releaseArchive);
  if (options.artifactChecksums) args.push("--artifact-checksums", options.artifactChecksums);
  if (options.currentSymlink) args.push("--current-symlink", options.currentSymlink);
  if (options.requireCurrentSymlink) args.push("--require-current-symlink");

  if (options.skipSystem) args.push("--skip-system");
  else if (options.executeSystemChecks) args.push("--execute-system-checks");
  if (options.requireSystem) args.push("--require-system");
  if (options.sudoSystem) args.push("--sudo-system");
  if (options.serviceName) args.push("--service-name", options.serviceName);
  if (options.nginxBinary) args.push("--nginx-binary", options.nginxBinary);
  if (options.systemctlBinary) args.push("--systemctl-binary", options.systemctlBinary);

  if (options.skipDb) args.push("--skip-db");
  else {
    if (options.databaseUrl) args.push("--database-url", options.databaseUrl);
    if (options.backupManifest) args.push("--backup-manifest", options.backupManifest);
    if (options.requireDbGate) args.push("--require-db-gate");
    if (options.requireRestoreDrill) args.push("--require-restore-drill");
    args.push("--max-age-hours", String(options.maxAgeHours));
    args.push("--restore-drill-max-age-hours", String(options.restoreDrillMaxAgeHours));
  }

  if (options.skipNetwork) args.push("--skip-network");
  else {
    if (options.apiBaseUrl) args.push("--api-base-url", options.apiBaseUrl);
    if (options.frontendUrl) args.push("--frontend-url", options.frontendUrl);
    if (options.allowHttp) args.push("--allow-http");
    if (options.allowDegradedReadiness) args.push("--allow-degraded-readiness");
    if (options.requireNetwork) args.push("--require-network");
  }

  try {
    const result = await runProcess(process.execPath, args, {
      cwd: options.releaseDir,
      timeoutMs: options.timeoutMs,
    });
    await writeEvidenceFile(
      options,
      "live-cutover-qa-command.txt",
      [`$ ${commandText(process.execPath, args)}`, "", result.stdout, "", result.stderr].join("\n")
    );
    addGate("Delegated live cutover QA", "PASS", path.relative(options.workDir, liveQaDir).replace(/\\/g, "/"));
  } catch (error) {
    await writeEvidenceFile(
      options,
      "live-cutover-qa-command.txt",
      [
        `$ ${commandText(process.execPath, args)}`,
        "",
        "## stdout",
        error.stdout || "",
        "",
        "## stderr",
        error.stderr || "",
        "",
        "## error",
        error.message || String(error),
      ].join("\n")
    );
    addGate("Delegated live cutover QA", "FAIL", "release:live-cutover:qa failed");
  }

  const liveQaJson = path.join(liveQaDir, "live-cutover-qa-report.json");
  if (await pathExists(liveQaJson)) {
    const report = await readJson(liveQaJson);
    report.checks?.forEach((check) => {
      addGate(`Live QA: ${check.name}`, check.status, check.detail || "");
    });
  }
};

const captureSystemEvidence = async (options) => {
  if (options.skipSystem || !options.executeSystemChecks) {
    addGate(
      "Raw system evidence",
      options.requireSystem ? "FAIL" : "SKIP",
      options.skipSystem ? "--skip-system" : "Use --execute-system-checks on VPS."
    );
    return;
  }

  const nginx = systemCommand(options, options.nginxBinary, ["-t"]);
  await runEvidenceCommand(options, "raw-nginx-test", nginx.command, nginx.args, { required: options.requireSystem });

  const active = systemCommand(options, options.systemctlBinary, ["is-active", options.serviceName]);
  await runEvidenceCommand(options, "raw-systemctl-is-active", active.command, active.args, { required: options.requireSystem });

  const status = systemCommand(options, options.systemctlBinary, ["status", options.serviceName, "--no-pager"]);
  await runEvidenceCommand(options, "raw-systemctl-status", status.command, status.args, { required: options.requireSystem });

  const journal = systemCommand(options, options.journalctlBinary, [
    "-u",
    options.serviceName,
    "-n",
    String(options.journalLines),
    "--no-pager",
  ]);
  await runEvidenceCommand(options, "raw-journalctl-tail", journal.command, journal.args, { required: false });
};

const responseEvidence = async (url, requestId) => {
  const response = await fetch(url, {
    headers: {
      Accept: "application/json,text/html;q=0.9,*/*;q=0.8",
      "X-Request-Id": requestId,
    },
  });
  const text = await response.text();
  const headers = {};
  response.headers.forEach((value, key) => {
    if (["content-type", "x-request-id", "server", "date", "cache-control"].includes(key.toLowerCase())) {
      headers[key] = value;
    }
  });
  return {
    url,
    status: response.status,
    ok: response.ok,
    headers,
    bodyPreview: text.slice(0, 4000),
  };
};

const captureNetworkEvidence = async (options) => {
  if (options.skipNetwork) {
    addGate("Raw HTTPS evidence", options.requireNetwork ? "FAIL" : "SKIP", "--skip-network");
    return;
  }
  if (!options.apiBaseUrl) {
    addGate("Raw HTTPS evidence", options.requireNetwork ? "FAIL" : "SKIP", "Set --api-base-url");
    return;
  }

  let apiUrl;
  try {
    apiUrl = new URL(options.apiBaseUrl);
  } catch {
    addGate("Raw HTTPS evidence", "FAIL", `Invalid --api-base-url: ${options.apiBaseUrl}`);
    return;
  }

  const isLocal = ["localhost", "127.0.0.1", "::1"].includes(apiUrl.hostname);
  if (apiUrl.protocol !== "https:" && !options.allowHttp && !isLocal) {
    addGate("Raw HTTPS evidence", "FAIL", "Production evidence must use HTTPS unless --allow-http is set.");
    return;
  }

  const frontendUrl = options.frontendUrl || `${apiUrl.protocol}//${apiUrl.host}`;
  const targets = [
    { name: "raw-http-health", url: `${options.apiBaseUrl}/health`, expected: "health" },
    { name: "raw-http-ready", url: `${options.apiBaseUrl}/health/ready`, expected: "ready" },
    { name: "raw-http-frontend", url: frontendUrl, expected: "frontend" },
  ];

  for (const target of targets) {
    try {
      const payload = await responseEvidence(target.url, `task109-${Date.now()}-${target.expected}`);
      await writeEvidenceFile(options, `${target.name}.json`, `${JSON.stringify(payload, null, 2)}\n`);
      if (target.expected === "health") {
        const status = JSON.parse(payload.bodyPreview || "{}").status;
        addGate("HTTP /health evidence", payload.status === 200 && status === "ok" ? "PASS" : "FAIL", `status=${payload.status}; body=${status || "-"}`);
      } else if (target.expected === "ready") {
        const status = JSON.parse(payload.bodyPreview || "{}").status;
        const readyPass = payload.status === 200 && status === "ready";
        const degradedWarn = options.allowDegradedReadiness && status === "degraded";
        addGate(
          "HTTP /health/ready evidence",
          readyPass ? "PASS" : degradedWarn ? "WARN" : "FAIL",
          `status=${payload.status}; body=${status || "-"}`
        );
      } else {
        addGate("HTTP frontend evidence", payload.status === 200 ? "PASS" : "FAIL", `status=${payload.status}`);
      }
    } catch (error) {
      await writeEvidenceFile(options, `${target.name}.txt`, error.stack || error.message || String(error));
      addGate(`HTTP ${target.url} evidence`, "FAIL", error.message || String(error));
    }
  }
};

const decide = (options) => {
  const failures = gates.filter((gate) => gate.status === "FAIL");
  const warnings = gates.filter((gate) => gate.status === "WARN");
  const skips = gates.filter((gate) => gate.status === "SKIP");

  if (failures.length > 0) return { decision: "NO-GO", failures, warnings, skips };
  if (skips.length > 0) return { decision: "INCOMPLETE", failures, warnings, skips };
  if (warnings.length > 0) return { decision: "GO WITH REVIEW", failures, warnings, skips };
  return { decision: "GO", failures, warnings, skips };
};

const writeReports = async (options) => {
  const releaseId = await readReleaseId(options);
  const generatedAt = new Date().toISOString();
  const decision = decide(options);
  const apiText = options.apiBaseUrl || "https://pharmsita.example.ac.id/api/v1";
  const frontendText = options.frontendUrl || "https://pharmsita.example.ac.id";
  const databaseText = options.databaseUrl ? redactDatabaseUrl(options.databaseUrl) : "<not supplied>";
  const backupText = options.backupManifest || "<not supplied>";

  const manifest = {
    generatedAt,
    releaseId,
    decision: decision.decision,
    operator: options.operator,
    notes: options.notes,
    inputs: {
      releaseDir: options.releaseDir,
      releaseArchive: options.releaseArchive,
      artifactChecksums: options.artifactChecksums,
      currentSymlink: options.currentSymlink,
      apiBaseUrl: options.apiBaseUrl,
      frontendUrl: options.frontendUrl,
      databaseUrl: options.databaseUrl ? redactDatabaseUrl(options.databaseUrl) : "",
      backupManifest: options.backupManifest,
      serviceName: options.serviceName,
    },
    gates,
    evidence,
  };

  await fs.writeFile(path.join(options.workDir, "evidence-manifest.json"), `${JSON.stringify(manifest, null, 2)}\n`);

  const markdown = `# PharmSITA Live Cutover Go/No-Go

Generated at: ${generatedAt}

Decision: **${decision.decision}**

## Inputs

| Item | Value |
|---|---|
| Release | \`${releaseId}\` |
| Operator | \`${options.operator || "-"}\` |
| Release directory | \`${options.releaseDir}\` |
| Release archive | \`${options.releaseArchive || "-"}\` |
| API base URL | \`${apiText}\` |
| Frontend URL | \`${frontendText}\` |
| Database URL | \`${databaseText}\` |
| Backup manifest | \`${backupText}\` |
| Service | \`${options.serviceName}\` |
| Notes | ${options.notes || "-"} |

## Gate Results

| Gate | Status | Detail |
|---|---|---|
${gates.map((gate) => `| ${gate.name} | ${gate.status} | ${String(gate.detail || "").replace(/\|/g, "\\|")} |`).join("\n")}

## Evidence Files

| File | Bytes | SHA-256 |
|---|---:|---|
${evidence.map((entry) => `| \`${entry.file}\` | ${entry.bytes} | \`${entry.sha256}\` |`).join("\n")}

## Decision Rule

- **GO**: no FAIL, no unreviewed WARN, and no required evidence skipped.
- **GO WITH REVIEW**: no FAIL, but one or more WARN needs operator sign-off.
- **INCOMPLETE**: no FAIL, but evidence was skipped. Do not open production traffic until missing VPS/domain checks are captured.
- **NO-GO**: at least one required gate failed. Keep or restore previous release.

## Immediate Action

${decision.decision === "GO" ? "- Release can stay open for user traffic." : ""}
${decision.decision === "GO WITH REVIEW" ? "- Review WARN items before opening wider traffic." : ""}
${decision.decision === "INCOMPLETE" ? "- Capture missing VPS/domain/system evidence, then rerun this command without skip flags." : ""}
${decision.decision === "NO-GO" ? "- Stop cutover, keep previous release active or rollback current symlink/service." : ""}
`;

  await fs.writeFile(path.join(options.workDir, "GO-NO-GO.md"), markdown);
};

const summarize = (options) => {
  const decision = decide(options);
  console.table(gates.map((gate) => ({
    gate: gate.name,
    status: gate.status,
    detail: gate.detail,
  })));
  console.log(`Go/No-Go report: ${path.join(options.workDir, "GO-NO-GO.md")}`);
  console.log(`Evidence manifest: ${path.join(options.workDir, "evidence-manifest.json")}`);
  console.log(`Decision: ${decision.decision}`);

  if (decision.decision === "NO-GO") {
    throw new Error("Evidence capture decision is NO-GO.");
  }
  if (decision.decision === "INCOMPLETE" && !options.allowIncomplete) {
    throw new Error("Evidence capture is INCOMPLETE. Use --allow-incomplete only for local/script QA.");
  }
};

const run = async () => {
  const options = parseArgs(process.argv.slice(2));
  if (options.help) {
    console.log(usage);
    return;
  }

  if (await pathExists(options.workDir)) {
    if (!options.force) {
      throw new Error(`Work directory already exists: ${options.workDir}. Use --force to replace it.`);
    }
    await fs.rm(options.workDir, { recursive: true, force: true });
  }
  await fs.mkdir(options.workDir, { recursive: true });

  await captureArtifactEvidence(options);
  await captureSymlinkEvidence(options);
  await runLiveQa(options);
  await captureSystemEvidence(options);
  await captureNetworkEvidence(options);
  await writeReports(options);
  summarize(options);
};

run().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
