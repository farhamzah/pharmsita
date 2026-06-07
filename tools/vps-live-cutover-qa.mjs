import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

const usage = `Usage:
  npm.cmd run release:live-cutover:qa -- --skip-system --skip-network --skip-db
  npm run release:live-cutover:qa -- --release-dir /var/www/pharmsita/current --api-base-url https://pharmsita.example.ac.id/api/v1 --database-url <postgres-url> --backup-manifest <manifest> --require-system --require-network --require-db-gate

Options:
  --release-dir <path>             Active release directory. Default: current working directory.
  --release-archive <path>         Release archive used for this cutover.
  --artifact-checksums <path>      artifact-checksums.sha256 path for archive verification.
  --current-symlink <path>         Current symlink path. Default: /var/www/pharmsita/current.
  --require-current-symlink        Fail if current symlink does not point to --release-dir.
  --work-dir <path>                Report output directory. Default: releases/live-cutover-qa.
  --force                          Replace existing work directory.
  --database-url <url>             PostgreSQL URL for backup gate and production smoke.
  --backup-manifest <path>         Verified backup manifest used by db:migrate:gate.
  --require-db-gate                Fail if database URL or backup manifest is missing.
  --require-restore-drill          Pass restore-drill requirement to db:migrate:gate.
  --max-age-hours <number>         Backup freshness for gate. Default: 24.
  --restore-drill-max-age-hours <n> Restore drill freshness for gate. Default: 168.
  --api-base-url <url>             Live API base URL, e.g. https://domain.ac.id/api/v1.
  --frontend-url <url>             Frontend URL when different from API origin.
  --allow-http                     Allow HTTP URL for local/staging checks.
  --allow-degraded-readiness       Treat degraded readiness as WARN in delegated checks.
  --require-network                Fail if live URL is missing.
  --execute-system-checks          Run nginx/systemctl checks. Default on Linux.
  --skip-system                    Skip nginx/systemctl checks.
  --require-system                 Fail if system checks are skipped or fail.
  --sudo-system                    Prefix nginx/systemctl checks with sudo.
  --service-name <name>            systemd service name. Default: pharmsita-backend.
  --nginx-binary <path>            nginx executable. Default: nginx.
  --systemctl-binary <path>        systemctl executable. Default: systemctl.
  --skip-network                   Skip live HTTPS dry-run and no-demo smoke.
  --skip-db                        Skip backup gate and DB-backed smoke.
  --timeout-ms <number>            Per-command timeout. Default: 120000.
  --help                           Show this help.
`;

const checks = [];

const addCheck = (name, status, detail = "") => {
  checks.push({ name, status, detail });
};

const failCheck = (name, error) => {
  addCheck(name, "FAIL", error instanceof Error ? error.message : String(error));
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

const sha256File = async (filename) =>
  crypto.createHash("sha256").update(await fs.readFile(filename)).digest("hex");

const parsePositiveNumber = (value, label) => {
  const number = Number(value);
  if (!Number.isFinite(number) || number <= 0) {
    throw new Error(`${label} must be a positive number.`);
  }
  return number;
};

const parseArgs = (argv) => {
  const options = {
    releaseDir: process.cwd(),
    releaseArchive: "",
    artifactChecksums: "",
    currentSymlink: "/var/www/pharmsita/current",
    requireCurrentSymlink: false,
    workDir: path.join(rootDir, "releases", "live-cutover-qa"),
    force: false,
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
    skipNetwork: false,
    skipDb: false,
    timeoutMs: 120000,
    help: false,
  };

  const args = [...argv];
  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    if (arg === "--release-dir") {
      options.releaseDir = path.resolve(args[++index] || "");
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
    } else if (arg === "--skip-network") {
      options.skipNetwork = true;
    } else if (arg === "--skip-db") {
      options.skipDb = true;
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

const parseChecksums = async (filename) => {
  const content = await fs.readFile(filename, "utf8");
  return content
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const match = line.match(/^([a-fA-F0-9]{64})\s+\*?(.+)$/);
      if (!match) throw new Error(`Invalid checksum line in ${filename}: ${line}`);
      return { sha256: match[1].toLowerCase(), path: match[2].trim() };
    });
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
    const timeout = setTimeout(() => {
      child.kill("SIGTERM");
      reject(new Error(`${command} timed out after ${options.timeoutMs || 120000}ms`));
    }, options.timeoutMs || 120000);

    child.stdout.on("data", (chunk) => {
      stdout += chunk.toString();
    });
    child.stderr.on("data", (chunk) => {
      stderr += chunk.toString();
    });
    child.on("error", (error) => {
      clearTimeout(timeout);
      reject(error);
    });
    child.on("close", (code) => {
      clearTimeout(timeout);
      if (code === 0) {
        resolve({ stdout, stderr });
        return;
      }
      reject(new Error(`${command} exited with ${code}: ${stderr || stdout}`.trim()));
    });
  });

const systemCommand = (options, command, args) =>
  options.sudoSystem
    ? { command: "sudo", args: [command, ...args] }
    : { command, args };

const resolveReleaseTool = async (options, relativePath) => {
  const releaseTool = path.join(options.releaseDir, relativePath);
  if (await pathExists(releaseTool)) return releaseTool;
  return path.join(rootDir, relativePath);
};

const validateReleaseDir = async (options) => {
  const required = [
    "package.json",
    "dist/index.html",
    "backend/dist/server.js",
    "tools/postgres-backup-safety-gate.mjs",
    "tools/vps-deployment-dry-run.mjs",
    "tools/production-no-demo-smoke-test.mjs",
    "tools/vps-live-cutover-qa.mjs",
  ];
  const missing = [];
  for (const relativePath of required) {
    if (!await pathExists(path.join(options.releaseDir, relativePath))) missing.push(relativePath);
  }

  if (missing.length > 0) {
    addCheck("Active release directory", "FAIL", `Missing: ${missing.join(", ")}`);
    return;
  }

  try {
    const packageJson = await readJson(path.join(options.releaseDir, "package.json"));
    const scripts = packageJson.scripts || {};
    const requiredScripts = [
      "db:migrate:gate",
      "deploy:vps:dry-run",
      "smoke:production:no-demo",
      "release:live-cutover:qa",
    ];
    const missingScripts = requiredScripts.filter((script) => !scripts[script]);
    addCheck(
      "Active release directory",
      missingScripts.length === 0 ? "PASS" : "FAIL",
      missingScripts.length === 0
        ? `${packageJson.name || "package"}@${packageJson.version || "0.0.0"}`
        : `Missing scripts: ${missingScripts.join(", ")}`
    );
  } catch (error) {
    failCheck("Active release package.json", error);
  }
};

const verifyArtifactChecksum = async (options) => {
  if (!options.releaseArchive) {
    addCheck("Artifact checksum", "SKIP", "Set --release-archive to verify archive checksum.");
    return;
  }
  if (!await pathExists(options.releaseArchive)) {
    addCheck("Artifact checksum", "FAIL", `Archive not found: ${options.releaseArchive}`);
    return;
  }

  const checksumFile = options.artifactChecksums || path.join(path.dirname(options.releaseArchive), "artifact-checksums.sha256");
  if (!await pathExists(checksumFile)) {
    addCheck("Artifact checksum", "FAIL", `Checksum file not found: ${checksumFile}`);
    return;
  }

  const expected = await parseChecksums(checksumFile);
  const basename = path.basename(options.releaseArchive);
  const entry = expected.find((item) => path.basename(item.path) === basename);
  if (!entry) {
    addCheck("Artifact checksum", "FAIL", `${basename} was not listed in ${checksumFile}`);
    return;
  }

  const actual = await sha256File(options.releaseArchive);
  addCheck(
    "Artifact checksum",
    actual === entry.sha256 ? "PASS" : "FAIL",
    actual === entry.sha256 ? basename : `expected=${entry.sha256}; actual=${actual}`
  );
};

const validateCurrentSymlink = async (options) => {
  if (!options.currentSymlink) {
    addCheck("Current symlink", "SKIP", "No --current-symlink provided.");
    return;
  }

  if (!await pathExists(options.currentSymlink)) {
    addCheck(
      "Current symlink",
      options.requireCurrentSymlink ? "FAIL" : "SKIP",
      `Not found: ${options.currentSymlink}`
    );
    return;
  }

  try {
    const [currentReal, releaseReal] = await Promise.all([
      fs.realpath(options.currentSymlink),
      fs.realpath(options.releaseDir),
    ]);
    addCheck(
      "Current symlink",
      currentReal === releaseReal ? "PASS" : "FAIL",
      `current=${currentReal}; release=${releaseReal}`
    );
  } catch (error) {
    failCheck("Current symlink", error);
  }
};

const runSystemChecks = async (options) => {
  if (options.skipSystem || !options.executeSystemChecks) {
    addCheck(
      "System checks",
      options.requireSystem ? "FAIL" : "SKIP",
      options.skipSystem ? "--skip-system" : "Use --execute-system-checks on VPS."
    );
    return;
  }

  const commands = [
    {
      name: "Nginx config test",
      ...systemCommand(options, options.nginxBinary, ["-t"]),
    },
    {
      name: "systemd service active",
      ...systemCommand(options, options.systemctlBinary, ["is-active", options.serviceName]),
    },
    {
      name: "systemd service status",
      ...systemCommand(options, options.systemctlBinary, ["status", options.serviceName, "--no-pager"]),
    },
  ];

  for (const commandSpec of commands) {
    try {
      const result = await runProcess(commandSpec.command, commandSpec.args, {
        cwd: options.releaseDir,
        timeoutMs: options.timeoutMs,
      });
      const detail = `${result.stdout || result.stderr}`.trim().split(/\r?\n/).slice(0, 3).join(" | ");
      addCheck(commandSpec.name, "PASS", detail || `${commandSpec.command} ${commandSpec.args.join(" ")}`);
    } catch (error) {
      addCheck(commandSpec.name, "FAIL", redactText(error.message, options));
    }
  }
};

const runBackupGate = async (options) => {
  if (options.skipDb) {
    addCheck("Backup gate", "SKIP", "--skip-db");
    return;
  }

  if (!options.databaseUrl || !options.backupManifest) {
    addCheck(
      "Backup gate",
      options.requireDbGate ? "FAIL" : "SKIP",
      "Set --database-url and --backup-manifest to run db:migrate:gate."
    );
    return;
  }

  const script = await resolveReleaseTool(options, "tools/postgres-backup-safety-gate.mjs");
  const args = [
    script,
    "gate",
    "--database-url",
    options.databaseUrl,
    "--manifest",
    options.backupManifest,
    "--max-age-hours",
    String(options.maxAgeHours),
    "--restore-drill-max-age-hours",
    String(options.restoreDrillMaxAgeHours),
  ];
  if (options.requireRestoreDrill) args.push("--require-restore-drill");

  try {
    await runProcess(process.execPath, args, { cwd: options.releaseDir, timeoutMs: options.timeoutMs });
    addCheck(
      "Backup gate",
      "PASS",
      options.requireRestoreDrill ? "db:migrate:gate passed with restore drill requirement" : "db:migrate:gate passed"
    );
  } catch (error) {
    addCheck("Backup gate", "FAIL", redactText(error.message, options));
  }
};

const runLiveDryRun = async (options) => {
  if (options.skipNetwork) {
    addCheck("Live HTTPS dry-run", "SKIP", "--skip-network");
    return;
  }

  if (!options.apiBaseUrl) {
    addCheck(
      "Live HTTPS dry-run",
      options.requireNetwork ? "FAIL" : "SKIP",
      "Set --api-base-url or pass --skip-network."
    );
    return;
  }

  const script = await resolveReleaseTool(options, "tools/vps-deployment-dry-run.mjs");
  const args = [script, "--api-base-url", options.apiBaseUrl];
  if (options.frontendUrl) args.push("--frontend-url", options.frontendUrl);
  if (options.allowHttp) args.push("--allow-http");
  if (options.allowDegradedReadiness) args.push("--allow-degraded-readiness");

  try {
    await runProcess(process.execPath, args, { cwd: options.releaseDir, timeoutMs: options.timeoutMs });
    addCheck("Live HTTPS dry-run", "PASS", "deploy:vps:dry-run passed");
  } catch (error) {
    addCheck("Live HTTPS dry-run", "FAIL", redactText(error.message, options));
  }
};

const runProductionSmoke = async (options) => {
  if (options.skipNetwork || options.skipDb) {
    addCheck("Production no-demo smoke", "SKIP", options.skipNetwork ? "--skip-network" : "--skip-db");
    return;
  }

  if (!options.apiBaseUrl || !options.databaseUrl) {
    addCheck(
      "Production no-demo smoke",
      options.requireNetwork || options.requireDbGate ? "FAIL" : "SKIP",
      "Set --api-base-url and --database-url to run preflight smoke."
    );
    return;
  }

  const script = await resolveReleaseTool(options, "tools/production-no-demo-smoke-test.mjs");
  const args = [
    script,
    "--preflight-only",
    "--api-base-url",
    options.apiBaseUrl,
    "--database-url",
    options.databaseUrl,
  ];
  if (options.allowDegradedReadiness) args.push("--allow-degraded-readiness");

  try {
    await runProcess(process.execPath, args, { cwd: options.releaseDir, timeoutMs: options.timeoutMs });
    addCheck("Production no-demo smoke", "PASS", "smoke:production:no-demo --preflight-only passed");
  } catch (error) {
    addCheck("Production no-demo smoke", "FAIL", redactText(error.message, options));
  }
};

const writeReports = async (options) => {
  const packageJson = await readJson(path.join(options.releaseDir, "package.json")).catch(() => ({}));
  const generatedAt = new Date().toISOString();
  const apiText = options.apiBaseUrl || "https://pharmsita.example.ac.id/api/v1";
  const frontendText = options.frontendUrl || "https://pharmsita.example.ac.id";
  const databaseText = options.databaseUrl ? redactDatabaseUrl(options.databaseUrl) : "<set DATABASE_URL>";
  const manifestText = options.backupManifest || "/var/backups/pharmsita/postgres/<backup>.manifest.json";

  await fs.mkdir(options.workDir, { recursive: true });
  await fs.writeFile(
    path.join(options.workDir, "live-cutover-qa-report.json"),
    `${JSON.stringify({
      generatedAt,
      releaseDir: options.releaseDir,
      releaseArchive: options.releaseArchive,
      apiBaseUrl: options.apiBaseUrl,
      frontendUrl: options.frontendUrl,
      databaseUrl: options.databaseUrl ? redactDatabaseUrl(options.databaseUrl) : "",
      backupManifest: options.backupManifest,
      package: {
        name: packageJson.name || "",
        version: packageJson.version || "",
      },
      checks,
    }, null, 2)}\n`
  );

  const markdown = `# VPS Live Cutover QA

Generated at: ${generatedAt}

## Inputs

| Item | Value |
|---|---|
| Release directory | \`${options.releaseDir}\` |
| Release archive | \`${options.releaseArchive || "-"}\` |
| API base URL | \`${apiText}\` |
| Frontend URL | \`${frontendText}\` |
| Database URL | \`${databaseText}\` |
| Backup manifest | \`${manifestText}\` |
| systemd service | \`${options.serviceName}\` |

## Result

| Check | Status | Detail |
|---|---|---|
${checks.map((check) => `| ${check.name} | ${check.status} | ${String(check.detail || "").replace(/\|/g, "\\|")} |`).join("\n")}

## Pass Criteria

- Artifact checksum PASS when release archive is supplied.
- Current symlink points to the active release.
- \`nginx -t\` PASS and \`${options.serviceName}\` is active.
- Backup gate PASS, including restore drill when required.
- Live HTTPS dry-run PASS for \`/health\`, \`/health/ready\`, and frontend root.
- Production no-demo smoke preflight PASS.

## Suggested Live Command

\`\`\`bash
cd /var/www/pharmsita/current
npm run release:live-cutover:qa -- \\
  --release-dir /var/www/pharmsita/current \\
  --release-archive /var/www/pharmsita/releases/<release-id>.tar.gz \\
  --artifact-checksums /var/www/pharmsita/releases/artifact-checksums.sha256 \\
  --current-symlink /var/www/pharmsita/current \\
  --require-current-symlink \\
  --database-url "$DATABASE_URL" \\
  --backup-manifest ${manifestText} \\
  --require-db-gate \\
  --require-restore-drill \\
  --execute-system-checks \\
  --require-system \\
  --api-base-url ${apiText} \\
  --frontend-url ${frontendText} \\
  --require-network \\
  --force
\`\`\`
`;

  await fs.writeFile(path.join(options.workDir, "LIVE-CUTOVER-QA.md"), markdown);
};

const summarize = () => {
  const failed = checks.filter((check) => check.status === "FAIL").length;
  const warned = checks.filter((check) => check.status === "WARN").length;
  console.table(checks.map((check) => ({
    check: check.name,
    status: check.status,
    detail: check.detail,
  })));
  if (failed > 0) {
    throw new Error(`Live cutover QA failed: ${failed} failed check(s), ${warned} warning(s).`);
  }
  console.log(`Live cutover QA passed with ${warned} warning(s).`);
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

  await validateReleaseDir(options);
  await verifyArtifactChecksum(options);
  await validateCurrentSymlink(options);
  await runSystemChecks(options);
  await runBackupGate(options);
  await runLiveDryRun(options);
  await runProductionSmoke(options);
  await writeReports(options);

  console.log(`Live QA report: ${path.join(options.workDir, "LIVE-CUTOVER-QA.md")}`);
  console.log(`Live QA JSON: ${path.join(options.workDir, "live-cutover-qa-report.json")}`);
  summarize();
};

run().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
