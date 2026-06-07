import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import zlib from "node:zlib";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

const usage = `Usage:
  npm.cmd run release:cutover:drill -- --release-archive releases/<release-id>/<release-id>.tar.gz --skip-network --skip-db
  npm.cmd run release:cutover:drill -- --release-archive /tmp/<release-id>.tar.gz --database-url <postgres-url> --backup-manifest <manifest> --api-base-url https://pharmsita.example.ac.id/api/v1

Options:
  --release-archive <path>          Release archive to drill. Defaults to latest non-rollback archive under releases/.
  --artifact-checksums <path>       artifact-checksums.sha256 path. Defaults to archive directory.
  --work-dir <path>                 Drill output directory. Default: releases/cutover-drill.
  --force                           Replace existing work directory.
  --database-url <url>              PostgreSQL URL for backup gate and production smoke.
  --backup-manifest <path>          Verified backup manifest used by db:migrate:gate.
  --require-db-gate                 Fail if database URL or backup manifest is missing.
  --require-restore-drill           Pass restore-drill requirement to db:migrate:gate.
  --max-age-hours <number>          Backup freshness for gate. Default: 24.
  --restore-drill-max-age-hours <n> Restore drill freshness for gate. Default: 168.
  --api-base-url <url>              Live API base URL for VPS dry-run/smoke.
  --frontend-url <url>              Frontend URL when different from API origin.
  --allow-http                      Allow HTTP URL for local/staging checks.
  --allow-degraded-readiness        Treat degraded readiness as WARN in network checks.
  --require-network                 Fail if live URL is missing.
  --skip-network                    Skip live health and smoke checks.
  --skip-db                         Skip backup gate and DB-backed smoke checks.
  --help                            Show this help.
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

const sha256Buffer = (buffer) => crypto.createHash("sha256").update(buffer).digest("hex");

const sha256File = async (filename) => sha256Buffer(await fs.readFile(filename));

const parseNumber = (value, label) => {
  const number = Number(value);
  if (!Number.isFinite(number) || number <= 0) {
    throw new Error(`${label} must be a positive number.`);
  }
  return number;
};

const parseArgs = (argv) => {
  const options = {
    releaseArchive: "",
    artifactChecksums: "",
    workDir: path.join(rootDir, "releases", "cutover-drill"),
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
    skipNetwork: false,
    skipDb: false,
    help: false,
  };

  const args = [...argv];
  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    if (arg === "--release-archive") {
      options.releaseArchive = path.resolve(args[++index] || "");
    } else if (arg === "--artifact-checksums") {
      options.artifactChecksums = path.resolve(args[++index] || "");
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
      options.maxAgeHours = parseNumber(args[++index], "--max-age-hours");
    } else if (arg === "--restore-drill-max-age-hours") {
      options.restoreDrillMaxAgeHours = parseNumber(args[++index], "--restore-drill-max-age-hours");
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
    } else if (arg === "--skip-network") {
      options.skipNetwork = true;
    } else if (arg === "--skip-db") {
      options.skipDb = true;
    } else if (arg === "--help" || arg === "-h") {
      options.help = true;
    } else {
      throw new Error(`Unknown argument: ${arg}`);
    }
  }

  return options;
};

const normalizeEntryPath = (entryPath) => entryPath.replace(/\\/g, "/").replace(/^\/+/, "");

const assertSafeRelativePath = (entryPath) => {
  const normalized = normalizeEntryPath(entryPath);
  if (!normalized || normalized.includes("\0")) {
    throw new Error("Archive contains an empty or invalid path.");
  }
  if (path.isAbsolute(normalized) || normalized.split("/").includes("..")) {
    throw new Error(`Archive contains unsafe path: ${entryPath}`);
  }
  return normalized;
};

const readTarString = (buffer, offset, length) => {
  const slice = buffer.subarray(offset, offset + length);
  const end = slice.indexOf(0);
  return slice.subarray(0, end >= 0 ? end : length).toString("utf8").trim();
};

const readTarOctal = (buffer, offset, length) => {
  const text = readTarString(buffer, offset, length).replace(/\0/g, "").trim();
  return text ? Number.parseInt(text, 8) : 0;
};

const extractTarGz = async (archivePath, targetDir) => {
  const archive = await fs.readFile(archivePath);
  const tar = zlib.gunzipSync(archive);
  const entries = [];
  let offset = 0;

  await fs.mkdir(targetDir, { recursive: true });

  while (offset + 512 <= tar.length) {
    const header = tar.subarray(offset, offset + 512);
    if (header.every((byte) => byte === 0)) break;

    const name = readTarString(header, 0, 100);
    const prefix = readTarString(header, 345, 155);
    const type = readTarString(header, 156, 1) || "0";
    const size = readTarOctal(header, 124, 12);
    const entryPath = assertSafeRelativePath(prefix ? `${prefix}/${name}` : name);
    const contentStart = offset + 512;
    const contentEnd = contentStart + size;
    const outputPath = path.join(targetDir, entryPath);
    const relativeOutput = path.relative(targetDir, outputPath);
    if (relativeOutput.startsWith("..") || path.isAbsolute(relativeOutput)) {
      throw new Error(`Archive extraction escaped work directory: ${entryPath}`);
    }

    entries.push({ path: entryPath, type, size });

    if (type === "5") {
      await fs.mkdir(outputPath, { recursive: true });
    } else if (type === "0" || type === "") {
      await fs.mkdir(path.dirname(outputPath), { recursive: true });
      await fs.writeFile(outputPath, tar.subarray(contentStart, contentEnd));
    }

    offset = contentStart + Math.ceil(size / 512) * 512;
  }

  return entries;
};

const collectFiles = async (directory, base = directory) => {
  const entries = await fs.readdir(directory, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const absolute = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      files.push(...await collectFiles(absolute, base));
    } else if (entry.isFile()) {
      files.push({
        absolute,
        relative: path.relative(base, absolute).replace(/\\/g, "/"),
      });
    }
  }
  return files.sort((left, right) => left.relative.localeCompare(right.relative));
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

const findLatestReleaseArchive = async () => {
  const releasesDir = path.join(rootDir, "releases");
  if (!await pathExists(releasesDir)) return "";

  const releaseDirs = await fs.readdir(releasesDir, { withFileTypes: true });
  const candidates = [];
  for (const entry of releaseDirs) {
    if (!entry.isDirectory()) continue;
    const directory = path.join(releasesDir, entry.name);
    const files = await fs.readdir(directory, { withFileTypes: true });
    for (const file of files) {
      if (!file.isFile() || !file.name.endsWith(".tar.gz") || file.name.endsWith("-rollback.tar.gz")) continue;
      const absolute = path.join(directory, file.name);
      const stats = await fs.stat(absolute);
      candidates.push({ absolute, mtimeMs: stats.mtimeMs });
    }
  }

  candidates.sort((left, right) => right.mtimeMs - left.mtimeMs);
  return candidates[0]?.absolute || "";
};

const verifyArtifactChecksum = async (options) => {
  const checksumFile = options.artifactChecksums || path.join(path.dirname(options.releaseArchive), "artifact-checksums.sha256");
  if (!await pathExists(checksumFile)) {
    addCheck("Artifact checksum file", "WARN", `Not found: ${checksumFile}`);
    return;
  }

  const expected = await parseChecksums(checksumFile);
  const basename = path.basename(options.releaseArchive);
  const entry = expected.find((item) => path.basename(item.path) === basename);
  if (!entry) {
    addCheck("Artifact checksum entry", "FAIL", `${basename} was not listed in ${checksumFile}`);
    return;
  }

  const actual = await sha256File(options.releaseArchive);
  addCheck(
    "Artifact checksum",
    actual === entry.sha256 ? "PASS" : "FAIL",
    actual === entry.sha256 ? basename : `expected=${entry.sha256}; actual=${actual}`
  );
};

const findExtractedReleaseRoot = async (extractDir, entries) => {
  const roots = new Set(
    entries
      .map((entry) => entry.path.split("/")[0])
      .filter(Boolean)
  );
  if (roots.size !== 1) {
    throw new Error(`Expected exactly one archive root directory, found ${roots.size}.`);
  }
  const releaseRoot = path.join(extractDir, [...roots][0]);
  if (!await pathExists(releaseRoot)) {
    throw new Error(`Extracted release root was not found: ${releaseRoot}`);
  }
  return releaseRoot;
};

const verifyPayloadChecksums = async (releaseRoot) => {
  const checksumFile = path.join(releaseRoot, "checksums.sha256");
  if (!await pathExists(checksumFile)) {
    addCheck("Payload checksum file", "FAIL", "checksums.sha256 missing from release root.");
    return;
  }

  const expected = await parseChecksums(checksumFile);
  const mismatches = [];
  for (const entry of expected) {
    const filePath = path.join(releaseRoot, assertSafeRelativePath(entry.path));
    if (!await pathExists(filePath)) {
      mismatches.push(`${entry.path}: missing`);
      continue;
    }
    const actual = await sha256File(filePath);
    if (actual !== entry.sha256) {
      mismatches.push(`${entry.path}: expected=${entry.sha256}; actual=${actual}`);
    }
  }

  addCheck(
    "Payload checksums",
    mismatches.length === 0 ? "PASS" : "FAIL",
    mismatches.length === 0 ? `${expected.length} files verified` : mismatches.slice(0, 5).join("; ")
  );
};

const hasPath = async (releaseRoot, relativePath) => pathExists(path.join(releaseRoot, relativePath));

const validateRequiredPayload = async (releaseRoot) => {
  const required = [
    "dist/index.html",
    "backend/dist/server.js",
    "backend/database/migrations",
    "deploy/vps/backend.env.example",
    "deploy/vps/nginx/pharmsita.conf.example",
    "deploy/vps/systemd/pharmsita-backend.service.example",
    "deploy/vps/logrotate/pharmsita.example",
    "tools/postgres-migrate.mjs",
    "tools/postgres-backup-safety-gate.mjs",
    "tools/postgres-bootstrap-admin.mjs",
    "tools/production-no-demo-smoke-test.mjs",
    "tools/vps-deployment-dry-run.mjs",
    "tools/vps-release-cutover-drill.mjs",
    "tools/vps-live-cutover-qa.mjs",
    "tools/vps-live-evidence-capture.mjs",
    "tools/vps-go-no-go-remediation.mjs",
    "tools/vps-operator-evidence-review.mjs",
    "tools/vps-production-signoff-packet.mjs",
    "tools/vps-real-production-evidence-run.mjs",
    "tools/vps-real-evidence-upload-review.mjs",
    "docs/production-deployment-runbook.md",
    "docs/database-backup-restore-drill.md",
    "docs/release-artifact-packaging.md",
    "docs/vps-deployment-dry-run.md",
    "docs/vps-release-cutover-drill.md",
    "docs/vps-live-cutover-qa.md",
    "docs/vps-live-evidence-capture.md",
    "docs/vps-go-no-go-remediation.md",
    "docs/vps-operator-evidence-review.md",
    "docs/vps-production-signoff-packet.md",
    "docs/vps-real-production-evidence-run.md",
    "docs/vps-real-evidence-upload-review.md",
    "package.json",
    "package-lock.json",
    "manifest.json",
    "checksums.sha256",
    "INSTALL.md",
    "ROLLBACK.md",
  ];

  const missing = [];
  for (const relativePath of required) {
    if (!await hasPath(releaseRoot, relativePath)) missing.push(relativePath);
  }

  addCheck(
    "Required release payload",
    missing.length === 0 ? "PASS" : "FAIL",
    missing.length === 0 ? `${required.length} required paths present` : missing.join(", ")
  );
};

const validateExcludedPaths = async (archiveEntries) => {
  const blocked = [
    { label: ".env secret file", pattern: /(^|\/)\.env$/i },
    { label: "node_modules", pattern: /(^|\/)node_modules(\/|$)/i },
    { label: "local JSON database", pattern: /(^|\/)backend\/\.data(\/|$)/i },
    { label: "demo seeds", pattern: /(^|\/)backend\/database\/seeds(\/|$)/i },
    { label: "backups", pattern: /(^|\/)backups(\/|$)/i },
    { label: "git metadata", pattern: /(^|\/)\.git(\/|$)/i },
  ];

  const violations = [];
  for (const entry of archiveEntries) {
    for (const blockedPath of blocked) {
      if (blockedPath.pattern.test(entry.path)) {
        violations.push(`${blockedPath.label}: ${entry.path}`);
      }
    }
  }

  addCheck(
    "Excluded secret/demo paths",
    violations.length === 0 ? "PASS" : "FAIL",
    violations.length === 0 ? "No secret/demo/runtime cache paths in archive" : violations.slice(0, 8).join("; ")
  );
};

const validateManifest = async (releaseRoot) => {
  try {
    const manifest = await readJson(path.join(releaseRoot, "manifest.json"));
    const packageJson = await readJson(path.join(releaseRoot, "package.json"));
    const matchesPackage = manifest.package?.name === packageJson.name && manifest.package?.version === packageJson.version;
    addCheck(
      "Release manifest",
      matchesPackage ? "PASS" : "FAIL",
      `release=${manifest.releaseId || "-"}; files=${manifest.payloadFileCount ?? "-"}; dirty=${manifest.git?.dirty ? "yes" : "no"}`
    );
  } catch (error) {
    failCheck("Release manifest", error);
  }
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
    child.stdout.on("data", (chunk) => {
      stdout += chunk.toString();
    });
    child.stderr.on("data", (chunk) => {
      stderr += chunk.toString();
    });
    child.on("error", reject);
    child.on("close", (code) => {
      if (code === 0) {
        resolve({ stdout, stderr });
        return;
      }
      reject(new Error(`${command} exited with ${code}: ${stderr || stdout}`.trim()));
    });
  });

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

  const script = path.join(rootDir, "tools", "postgres-backup-safety-gate.mjs");
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
    await runProcess(process.execPath, args);
    addCheck(
      "Backup gate",
      "PASS",
      options.requireRestoreDrill ? "db:migrate:gate passed with restore drill requirement" : "db:migrate:gate passed"
    );
  } catch (error) {
    addCheck("Backup gate", "FAIL", redactText(error.message, options));
  }
};

const runVpsDryRun = async (options, releaseRoot) => {
  if (options.skipNetwork) {
    addCheck("VPS live dry-run", "SKIP", "--skip-network");
    return;
  }

  if (!options.apiBaseUrl) {
    addCheck(
      "VPS live dry-run",
      options.requireNetwork ? "FAIL" : "SKIP",
      "Set --api-base-url or pass --skip-network."
    );
    return;
  }

  const script = path.join(rootDir, "tools", "vps-deployment-dry-run.mjs");
  const args = [
    script,
    "--api-base-url",
    options.apiBaseUrl,
    "--nginx-conf",
    path.join(releaseRoot, "deploy", "vps", "nginx", "pharmsita.conf.example"),
    "--systemd-service",
    path.join(releaseRoot, "deploy", "vps", "systemd", "pharmsita-backend.service.example"),
    "--logrotate-conf",
    path.join(releaseRoot, "deploy", "vps", "logrotate", "pharmsita.example"),
    "--backend-env",
    path.join(releaseRoot, "deploy", "vps", "backend.env.example"),
  ];
  if (options.frontendUrl) args.push("--frontend-url", options.frontendUrl);
  if (options.allowHttp) args.push("--allow-http");
  if (options.allowDegradedReadiness) args.push("--allow-degraded-readiness");

  try {
    await runProcess(process.execPath, args);
    addCheck("VPS live dry-run", "PASS", "deploy:vps:dry-run passed");
  } catch (error) {
    addCheck("VPS live dry-run", "FAIL", redactText(error.message, options));
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

  const script = path.join(rootDir, "tools", "production-no-demo-smoke-test.mjs");
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
    await runProcess(process.execPath, args);
    addCheck("Production no-demo smoke", "PASS", "smoke:production:no-demo --preflight-only passed");
  } catch (error) {
    addCheck("Production no-demo smoke", "FAIL", redactText(error.message, options));
  }
};

const writeCutoverChecklist = async (options, releaseRoot, reportPath) => {
  const manifest = await readJson(path.join(releaseRoot, "manifest.json")).catch(() => ({}));
  const releaseId = manifest.releaseId || path.basename(releaseRoot);
  const databaseText = options.databaseUrl ? redactDatabaseUrl(options.databaseUrl) : "<set DATABASE_URL>";
  const apiText = options.apiBaseUrl || "https://pharmsita.example.ac.id/api/v1";
  const frontendText = options.frontendUrl || "https://pharmsita.example.ac.id";
  const backupManifestText = options.backupManifest || "/var/backups/pharmsita/postgres/<backup>.manifest.json";

  const markdown = `# Cutover Drill ${releaseId}

Generated at: ${new Date().toISOString()}

## Inputs

| Item | Value |
|---|---|
| Release archive | \`${options.releaseArchive}\` |
| Extracted release root | \`${releaseRoot}\` |
| API base URL | \`${apiText}\` |
| Frontend URL | \`${frontendText}\` |
| Database URL | \`${databaseText}\` |
| Backup manifest | \`${backupManifestText}\` |

## Automated Result

| Check | Status | Detail |
|---|---|---|
${checks.map((check) => `| ${check.name} | ${check.status} | ${String(check.detail || "").replace(/\|/g, "\\|")} |`).join("\n")}

## VPS Cutover Commands

Run these on staging/VPS after uploading the release archive and checksum file.

\`\`\`bash
cd /var/www/pharmsita/releases
sha256sum -c artifact-checksums.sha256
tar -xzf ${path.basename(options.releaseArchive)}
cd ${releaseId}
npm ci --omit=dev
npm run backend:check-production-env
npm run db:backup -- --label pre-migration
npm run db:backup:verify -- --manifest ${backupManifestText}
npm run db:restore:drill -- --manifest ${backupManifestText} --confirm-restore-drill
npm run db:migrate:gate -- --manifest ${backupManifestText} --require-restore-drill
npm run db:migrate:status
npm run db:migrate -- --dry-run
npm run db:migrate
sudo ln -sfn /var/www/pharmsita/releases/${releaseId} /var/www/pharmsita/current
sudo nginx -t
sudo systemctl restart pharmsita-backend
sudo systemctl status pharmsita-backend --no-pager
npm run deploy:vps:dry-run -- --api-base-url ${apiText} --frontend-url ${frontendText}
npm run smoke:production:no-demo -- --preflight-only --api-base-url ${apiText}
npm run release:live-cutover:qa -- --release-dir /var/www/pharmsita/current --release-archive /var/www/pharmsita/releases/${releaseId}.tar.gz --artifact-checksums /var/www/pharmsita/releases/artifact-checksums.sha256 --current-symlink /var/www/pharmsita/current --require-current-symlink --database-url "$DATABASE_URL" --backup-manifest ${backupManifestText} --require-db-gate --require-restore-drill --execute-system-checks --require-system --api-base-url ${apiText} --frontend-url ${frontendText} --require-network --force
npm run release:live-evidence:capture -- --release-dir /var/www/pharmsita/current --release-id ${releaseId} --release-archive /var/www/pharmsita/releases/${releaseId}.tar.gz --artifact-checksums /var/www/pharmsita/releases/artifact-checksums.sha256 --current-symlink /var/www/pharmsita/current --require-current-symlink --database-url "$DATABASE_URL" --backup-manifest ${backupManifestText} --require-db-gate --require-restore-drill --execute-system-checks --require-system --api-base-url ${apiText} --frontend-url ${frontendText} --require-network --force
npm run release:go-no-go:remediate -- --evidence-dir releases/live-evidence --operator "<nama-operator>" --force
npm run release:operator-evidence:review -- --evidence-dir releases/live-evidence --remediation-dir releases/live-evidence --reviewer "<nama-reviewer>" --operator "<nama-operator>" --require-go --force
npm run release:production-signoff:packet -- --evidence-dir releases/live-evidence --review-dir releases/live-evidence --remediation-dir releases/live-evidence --release-id ${releaseId} --operator "<nama-operator>" --reviewer "<nama-reviewer>" --signer "<nama-approver>" --require-approved --force
npm run release:production-evidence:run -- --release-id ${releaseId} --release-dir /var/www/pharmsita/current --release-archive /var/www/pharmsita/releases/${releaseId}.tar.gz --artifact-checksums /var/www/pharmsita/releases/artifact-checksums.sha256 --current-symlink /var/www/pharmsita/current --database-url "$DATABASE_URL" --backup-manifest ${backupManifestText} --api-base-url ${apiText} --frontend-url ${frontendText} --operator "<nama-operator>" --reviewer "<nama-reviewer>" --signer "<nama-approver>" --execute --force
npm run release:production-evidence:upload-review -- --upload-dir releases/production-evidence-run --release-id ${releaseId} --reviewer "<nama-reviewer>" --require-signed-off --force
\`\`\`

## Manual Gates

- Do not switch \`current\` before artifact checksum, dependency install, production env guard, backup verify, restore drill, and migration gate pass.
- Run \`sudo nginx -t\` before reload/restart when Nginx config changes.
- Keep previous release directory and rollback bundle available before cutover.
- Do not run demo seed SQL on production.
`;

  await fs.writeFile(reportPath, markdown);
};

const writeJsonReport = async (options, releaseRoot, reportPath) => {
  const manifest = await readJson(path.join(releaseRoot, "manifest.json")).catch(() => ({}));
  await fs.writeFile(
    reportPath,
    `${JSON.stringify({
      generatedAt: new Date().toISOString(),
      releaseArchive: options.releaseArchive,
      releaseRoot,
      releaseId: manifest.releaseId || path.basename(releaseRoot),
      checks,
    }, null, 2)}\n`
  );
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
    throw new Error(`Cutover drill failed: ${failed} failed check(s), ${warned} warning(s).`);
  }
  console.log(`Cutover drill passed with ${warned} warning(s).`);
};

const run = async () => {
  const options = parseArgs(process.argv.slice(2));
  if (options.help) {
    console.log(usage);
    return;
  }

  options.releaseArchive = options.releaseArchive || await findLatestReleaseArchive();
  if (!options.releaseArchive) {
    throw new Error("Release archive is required. Run release:package first or pass --release-archive.");
  }
  if (!await pathExists(options.releaseArchive)) {
    throw new Error(`Release archive was not found: ${options.releaseArchive}`);
  }

  if (await pathExists(options.workDir)) {
    if (!options.force) {
      throw new Error(`Work directory already exists: ${options.workDir}. Use --force to replace it.`);
    }
    await fs.rm(options.workDir, { recursive: true, force: true });
  }
  await fs.mkdir(options.workDir, { recursive: true });

  await verifyArtifactChecksum(options);

  const extractDir = path.join(options.workDir, "extracted");
  let archiveEntries = [];
  let releaseRoot = "";
  try {
    archiveEntries = await extractTarGz(options.releaseArchive, extractDir);
    releaseRoot = await findExtractedReleaseRoot(extractDir, archiveEntries);
    addCheck("Archive extraction", "PASS", `${archiveEntries.length} tar entries extracted`);
  } catch (error) {
    failCheck("Archive extraction", error);
  }

  if (releaseRoot) {
    await validateExcludedPaths(archiveEntries);
    await validateManifest(releaseRoot);
    await verifyPayloadChecksums(releaseRoot);
    await validateRequiredPayload(releaseRoot);
    await runBackupGate(options);
    await runVpsDryRun(options, releaseRoot);
    await runProductionSmoke(options);
    addCheck("Nginx/systemd operator gate", "PASS", "Manual commands written to CUTOVER-DRILL.md");
    await writeCutoverChecklist(options, releaseRoot, path.join(options.workDir, "CUTOVER-DRILL.md"));
    await writeJsonReport(options, releaseRoot, path.join(options.workDir, "cutover-drill-report.json"));
  }

  console.log(`Cutover report: ${path.join(options.workDir, "CUTOVER-DRILL.md")}`);
  console.log(`Cutover JSON: ${path.join(options.workDir, "cutover-drill-report.json")}`);
  summarize();
};

run().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
