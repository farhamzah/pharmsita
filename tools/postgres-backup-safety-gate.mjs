import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import pg from "pg";

const { Pool } = pg;

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const defaultBackupDir = path.join(rootDir, "backups", "postgres");
const migrationTable = "pharmsita_schema_migrations";
const requiredTables = ["users", "user_roles", "admin_profiles"];

const usage = `Usage:
  npm.cmd run db:backup -- --database-url <postgres-url>
  npm.cmd run db:backup:verify -- --manifest backups/postgres/<file>.manifest.json
  npm.cmd run db:restore:drill -- --manifest <manifest> --restore-database-url <postgres-url> --confirm-restore-drill
  npm.cmd run db:migrate:gate -- --database-url <postgres-url> --require-restore-drill
  npm.cmd run db:backup:check-tools

Commands:
  backup          Create a pg_dump custom-format backup and manifest.
  verify          Verify backup file checksum/size from manifest.
  restore-drill   Restore a backup into a non-production drill database and verify core schema.
  gate            Block migration unless a fresh verified backup exists; optionally require restore drill.
  check-tools     Check required PostgreSQL CLI tools.

Options:
  --database-url <url>               Source PostgreSQL URL. Defaults to DATABASE_URL.
  --backup-dir <path>                Backup output directory. Default: backups/postgres.
  --backup-file <path>               Explicit backup file path for verify/restore-drill.
  --manifest <path>                  Explicit backup manifest path.
  --restore-database-url <url>       Drill target PostgreSQL URL. Defaults to RESTORE_DATABASE_URL.
  --max-age-hours <number>           Backup freshness gate. Default: 24.
  --restore-drill-max-age-hours <n>  Restore drill freshness gate. Default: 168.
  --require-restore-drill            Gate requires a matching PASS restore drill manifest.
  --allow-unsafe-restore-target      Allow drill target DB name without restore/drill/test/tmp/scratch marker.
  --label <value>                    Backup filename label.
  --ssl                              Set PGSSLMODE=require for source URL.
  --no-ssl                           Set PGSSLMODE=disable for source URL.
  --restore-ssl                      Set PGSSLMODE=require for restore URL.
  --restore-no-ssl                   Set PGSSLMODE=disable for restore URL.
  --dry-run                          Print planned action without running pg_dump/pg_restore.
  --help                             Show this help.
`;

const parseBooleanEnv = (value) =>
  ["1", "true", "yes", "on"].includes(String(value || "").toLowerCase());

const parseArgs = (argv) => {
  const options = {
    command: "gate",
    databaseUrl: process.env.DATABASE_URL || "",
    restoreDatabaseUrl: process.env.RESTORE_DATABASE_URL || "",
    backupDir: process.env.PHARMSITA_BACKUP_DIR || defaultBackupDir,
    backupFile: "",
    manifest: "",
    label: process.env.PHARMSITA_BACKUP_LABEL || "",
    maxAgeHours: Number(process.env.PHARMSITA_BACKUP_MAX_AGE_HOURS || 24),
    restoreDrillMaxAgeHours: Number(process.env.PHARMSITA_RESTORE_DRILL_MAX_AGE_HOURS || 168),
    requireRestoreDrill: parseBooleanEnv(process.env.PHARMSITA_REQUIRE_RESTORE_DRILL),
    confirmRestoreDrill: false,
    allowUnsafeRestoreTarget: false,
    ssl: process.env.DATABASE_SSL ? parseBooleanEnv(process.env.DATABASE_SSL) : undefined,
    restoreSsl: process.env.RESTORE_DATABASE_SSL
      ? parseBooleanEnv(process.env.RESTORE_DATABASE_SSL)
      : undefined,
    dryRun: false,
    help: false,
  };

  const args = [...argv];
  if (args[0] && !args[0].startsWith("--")) {
    options.command = args.shift();
  }

  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    if (arg === "--database-url") {
      options.databaseUrl = args[++index] || "";
    } else if (arg === "--restore-database-url") {
      options.restoreDatabaseUrl = args[++index] || "";
    } else if (arg === "--backup-dir") {
      options.backupDir = path.resolve(args[++index] || "");
    } else if (arg === "--backup-file") {
      options.backupFile = path.resolve(args[++index] || "");
    } else if (arg === "--manifest") {
      options.manifest = path.resolve(args[++index] || "");
    } else if (arg === "--label") {
      options.label = args[++index] || "";
    } else if (arg === "--max-age-hours") {
      options.maxAgeHours = Number(args[++index]);
    } else if (arg === "--restore-drill-max-age-hours") {
      options.restoreDrillMaxAgeHours = Number(args[++index]);
    } else if (arg === "--require-restore-drill") {
      options.requireRestoreDrill = true;
    } else if (arg === "--confirm-restore-drill") {
      options.confirmRestoreDrill = true;
    } else if (arg === "--allow-unsafe-restore-target") {
      options.allowUnsafeRestoreTarget = true;
    } else if (arg === "--ssl") {
      options.ssl = true;
    } else if (arg === "--no-ssl") {
      options.ssl = false;
    } else if (arg === "--restore-ssl") {
      options.restoreSsl = true;
    } else if (arg === "--restore-no-ssl") {
      options.restoreSsl = false;
    } else if (arg === "--dry-run") {
      options.dryRun = true;
    } else if (arg === "--help" || arg === "-h") {
      options.help = true;
    } else {
      throw new Error(`Unknown argument: ${arg}`);
    }
  }

  if (!["backup", "verify", "restore-drill", "gate", "check-tools"].includes(options.command)) {
    throw new Error(`Unknown command: ${options.command}`);
  }

  if (!Number.isFinite(options.maxAgeHours) || options.maxAgeHours <= 0) {
    throw new Error("--max-age-hours must be a positive number.");
  }

  if (!Number.isFinite(options.restoreDrillMaxAgeHours) || options.restoreDrillMaxAgeHours <= 0) {
    throw new Error("--restore-drill-max-age-hours must be a positive number.");
  }

  return options;
};

const sanitizeLabel = (value) =>
  String(value || "")
    .trim()
    .replace(/[^a-zA-Z0-9._-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);

const parsePostgresUrl = (databaseUrl, label) => {
  if (!databaseUrl) throw new Error(`${label} is required.`);

  let parsed;
  try {
    parsed = new URL(databaseUrl);
  } catch {
    throw new Error(`${label} must be a valid PostgreSQL URL.`);
  }

  if (!["postgres:", "postgresql:"].includes(parsed.protocol)) {
    throw new Error(`${label} must use postgres:// or postgresql://.`);
  }

  const database = decodeURIComponent(parsed.pathname.replace(/^\//, ""));
  if (!database) throw new Error(`${label} must include a database name.`);

  return {
    url: parsed,
    host: parsed.hostname,
    port: parsed.port || "5432",
    database,
    user: decodeURIComponent(parsed.username || ""),
    password: decodeURIComponent(parsed.password || ""),
    sslMode: parsed.searchParams.get("sslmode") || "",
  };
};

const redactDatabaseUrl = (databaseUrl) => {
  const parsed = new URL(databaseUrl);
  if (parsed.password) parsed.password = "***";
  return parsed.toString();
};

const buildPgEnv = (databaseUrl, sslOverride, label = "Database URL") => {
  const info = parsePostgresUrl(databaseUrl, label);
  const env = {
    ...process.env,
    PGHOST: info.host,
    PGPORT: info.port,
    PGDATABASE: info.database,
    PGUSER: info.user,
  };

  if (info.password) env.PGPASSWORD = info.password;
  if (sslOverride === true) env.PGSSLMODE = "require";
  else if (sslOverride === false) env.PGSSLMODE = "disable";
  else if (info.sslMode) env.PGSSLMODE = info.sslMode;

  return { env, info };
};

const runProcess = (binary, args, env) =>
  new Promise((resolve, reject) => {
    const child = spawn(binary, args, {
      env,
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
      reject(new Error(`${binary} exited with ${code}: ${stderr || stdout}`.trim()));
    });
  });

const isIgnorableRestoreVersionWarning = (error) => {
  const message = error instanceof Error ? error.message : String(error);
  return (
    message.includes('unrecognized configuration parameter "transaction_timeout"') &&
    message.includes("errors ignored on restore: 1")
  );
};

const checkTool = async (binary, required) => {
  try {
    const result = await runProcess(binary, ["--version"], process.env);
    return {
      tool: binary,
      status: "PASS",
      detail: (result.stdout || result.stderr).trim(),
    };
  } catch (error) {
    return {
      tool: binary,
      status: required ? "FAIL" : "WARN",
      detail: error instanceof Error ? error.message : String(error),
    };
  }
};

const sha256File = async (filename) =>
  crypto.createHash("sha256").update(await fs.readFile(filename)).digest("hex");

const readJson = async (filename) => JSON.parse(await fs.readFile(filename, "utf8"));

const pathExists = async (filename) => {
  try {
    await fs.access(filename);
    return true;
  } catch {
    return false;
  }
};

const createPool = (databaseUrl, sslOverride) =>
  new Pool({
    connectionString: databaseUrl,
    ssl: sslOverride === true ? { rejectUnauthorized: false } : undefined,
  });

const readDatabaseSummary = async (databaseUrl, sslOverride) => {
  const pool = createPool(databaseUrl, sslOverride);
  try {
    const tableCount = await pool.query(`
      SELECT COUNT(*)::INT AS count
      FROM information_schema.tables
      WHERE table_schema = 'public'
    `);
    const migrationTableResult = await pool.query("SELECT to_regclass($1) IS NOT NULL AS exists", [
      migrationTable,
    ]);

    let migrationSummary = { tableExists: Boolean(migrationTableResult.rows[0]?.exists) };
    if (migrationSummary.tableExists) {
      const migrations = await pool.query(`
        SELECT COUNT(*)::INT AS count, MAX(version) AS latest_version
        FROM ${migrationTable}
      `);
      migrationSummary = {
        tableExists: true,
        appliedCount: migrations.rows[0]?.count || 0,
        latestVersion: migrations.rows[0]?.latest_version || "",
      };
    }

    return {
      publicTableCount: tableCount.rows[0]?.count || 0,
      migrations: migrationSummary,
    };
  } finally {
    await pool.end();
  }
};

const verifyCoreSchema = async (databaseUrl, sslOverride) => {
  const pool = createPool(databaseUrl, sslOverride);
  try {
    const result = await pool.query(
      `
        SELECT table_name
        FROM information_schema.tables
        WHERE table_schema = 'public'
          AND table_name = ANY($1)
      `,
      [requiredTables]
    );
    const found = new Set(result.rows.map((row) => row.table_name));
    const missing = requiredTables.filter((table) => !found.has(table));
    const summary = await readDatabaseSummary(databaseUrl, sslOverride);
    return {
      ok: missing.length === 0,
      missingTables: missing,
      ...summary,
    };
  } finally {
    await pool.end();
  }
};

const resolveBackupFromManifest = async (manifestPath) => {
  const manifest = await readJson(manifestPath);
  if (manifest.type !== "pharmsita-postgres-backup") {
    throw new Error(`Invalid backup manifest type: ${manifest.type || "-"}`);
  }

  const localCandidate = path.join(path.dirname(manifestPath), manifest.backupFileName || "");
  const backupFile =
    manifest.backupFile && await pathExists(manifest.backupFile)
      ? manifest.backupFile
      : localCandidate;

  return { manifest, backupFile };
};

const findLatestBackupManifest = async (backupDir) => {
  if (!await pathExists(backupDir)) {
    throw new Error(`Backup directory does not exist: ${backupDir}`);
  }

  const entries = await fs.readdir(backupDir);
  const manifests = [];
  for (const entry of entries) {
    if (!entry.endsWith(".manifest.json")) continue;
    const manifestPath = path.join(backupDir, entry);
    try {
      const manifest = await readJson(manifestPath);
      if (manifest.type === "pharmsita-postgres-backup") {
        manifests.push({ path: manifestPath, createdAt: new Date(manifest.createdAt).getTime() });
      }
    } catch {
      // Ignore unrelated manifests.
    }
  }

  manifests.sort((left, right) => right.createdAt - left.createdAt);
  if (!manifests[0]) throw new Error(`No backup manifest found in ${backupDir}`);
  return manifests[0].path;
};

const verifyManifest = async (manifestPath) => {
  const { manifest, backupFile } = await resolveBackupFromManifest(manifestPath);
  const stats = await fs.stat(backupFile);
  const actualSha = await sha256File(backupFile);
  const checks = [
    { name: "backup file exists", status: "PASS", detail: backupFile },
    {
      name: "backup size",
      status: stats.size === manifest.sizeBytes ? "PASS" : "FAIL",
      detail: `manifest=${manifest.sizeBytes}; actual=${stats.size}`,
    },
    {
      name: "backup sha256",
      status: actualSha === manifest.sha256 ? "PASS" : "FAIL",
      detail: actualSha,
    },
  ];

  return {
    manifest,
    backupFile,
    stats,
    sha256: actualSha,
    ok: checks.every((check) => check.status === "PASS"),
    checks,
  };
};

const buildBackupFilePath = (options, info) => {
  const timestamp = new Date().toISOString().replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "Z");
  const label = sanitizeLabel(options.label || info.database);
  return path.join(options.backupDir, `${timestamp}-${label}.dump`);
};

const runBackup = async (options) => {
  const { env, info } = buildPgEnv(options.databaseUrl, options.ssl);
  const backupFile = options.backupFile || buildBackupFilePath(options, info);
  const manifestPath = `${backupFile}.manifest.json`;
  await fs.mkdir(path.dirname(backupFile), { recursive: true });

  if (options.dryRun) {
    console.table([
      { item: "database", value: `${info.host}:${info.port}/${info.database}` },
      { item: "backupFile", value: backupFile },
      { item: "manifest", value: manifestPath },
      { item: "action", value: "would run pg_dump --format=custom --no-owner --no-acl" },
    ]);
    return;
  }

  const tool = await checkTool("pg_dump", true);
  if (tool.status !== "PASS") throw new Error(`pg_dump is required: ${tool.detail}`);

  const summary = await readDatabaseSummary(options.databaseUrl, options.ssl);
  await runProcess("pg_dump", ["--format=custom", "--no-owner", "--no-acl", "--file", backupFile], env);

  const stats = await fs.stat(backupFile);
  const sha256 = await sha256File(backupFile);
  const manifest = {
    type: "pharmsita-postgres-backup",
    version: 1,
    createdAt: new Date().toISOString(),
    source: {
      host: info.host,
      port: info.port,
      database: info.database,
      user: info.user,
      sslMode: env.PGSSLMODE || "",
      redactedUrl: redactDatabaseUrl(options.databaseUrl),
    },
    backupFile,
    backupFileName: path.basename(backupFile),
    sizeBytes: stats.size,
    sha256,
    pgDump: { format: "custom", noOwner: true, noAcl: true },
    databaseSummary: summary,
  };

  await fs.writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
  await fs.writeFile(`${backupFile}.sha256`, `${sha256}  ${path.basename(backupFile)}\n`);
  console.table([
    { item: "backup", value: backupFile },
    { item: "manifest", value: manifestPath },
    { item: "sha256", value: sha256 },
    { item: "sizeBytes", value: String(stats.size) },
    { item: "publicTables", value: String(summary.publicTableCount) },
    { item: "migrations", value: String(summary.migrations?.appliedCount ?? "-") },
  ]);
};

const runVerify = async (options) => {
  const manifestPath =
    options.manifest ||
    (options.backupFile ? `${options.backupFile}.manifest.json` : await findLatestBackupManifest(options.backupDir));
  const verification = await verifyManifest(manifestPath);
  console.table(verification.checks);
  if (!verification.ok) throw new Error("Backup verification failed.");
  console.log(`Backup verification passed: ${manifestPath}`);
};

const isSafeRestoreTarget = (source, target) => {
  const sameDatabase =
    source.host === target.host &&
    source.port === target.port &&
    source.database === target.database;

  if (sameDatabase) return { ok: false, reason: "Restore target matches source database." };
  if (/restore|drill|scratch|tmp|test/i.test(target.database)) {
    return { ok: true, reason: "Target database name is marked as drill/test." };
  }
  return {
    ok: false,
    reason: "Restore target database name must include restore, drill, scratch, tmp, or test.",
  };
};

const findRestoreDrillManifest = async (backupDir, backupSha) => {
  if (!await pathExists(backupDir)) return null;
  const entries = await fs.readdir(backupDir);
  const manifests = [];
  for (const entry of entries) {
    if (!entry.endsWith(".restore-drill.json")) continue;
    const manifestPath = path.join(backupDir, entry);
    try {
      const manifest = await readJson(manifestPath);
      if (
        manifest.type === "pharmsita-postgres-restore-drill" &&
        manifest.backup?.sha256 === backupSha &&
        manifest.status === "PASS"
      ) {
        manifests.push({ path: manifestPath, restoredAt: new Date(manifest.restoredAt).getTime() });
      }
    } catch {
      // Ignore unrelated manifests.
    }
  }
  manifests.sort((left, right) => right.restoredAt - left.restoredAt);
  return manifests[0]?.path || null;
};

const runRestoreDrill = async (options) => {
  const manifestPath =
    options.manifest ||
    (options.backupFile ? `${options.backupFile}.manifest.json` : await findLatestBackupManifest(options.backupDir));
  const verification = await verifyManifest(manifestPath);
  if (!verification.ok) {
    console.table(verification.checks);
    throw new Error("Backup verification failed before restore drill.");
  }

  const { env, info: target } = buildPgEnv(
    options.restoreDatabaseUrl,
    options.restoreSsl,
    "Restore database URL"
  );
  const targetSafety = isSafeRestoreTarget(verification.manifest.source, target);
  if (!targetSafety.ok && !options.allowUnsafeRestoreTarget) {
    throw new Error(`${targetSafety.reason} Use a dedicated drill database.`);
  }
  if (targetSafety.reason === "Restore target matches source database.") {
    throw new Error("Restore drill refuses to restore into the source database.");
  }

  if (options.dryRun) {
    console.table([
      { item: "backup", value: verification.backupFile },
      { item: "target", value: `${target.host}:${target.port}/${target.database}` },
      { item: "safety", value: targetSafety.reason },
      { item: "action", value: "would run pg_restore --clean --if-exists" },
    ]);
    return;
  }

  if (!options.confirmRestoreDrill) {
    throw new Error("restore-drill requires --confirm-restore-drill.");
  }

  const tool = await checkTool("pg_restore", true);
  if (tool.status !== "PASS") throw new Error(`pg_restore is required: ${tool.detail}`);

  let restoreWarning = "";
  try {
    await runProcess(
      "pg_restore",
      ["--clean", "--if-exists", "--no-owner", "--no-acl", "--dbname", target.database, verification.backupFile],
      env
    );
  } catch (error) {
    if (!isIgnorableRestoreVersionWarning(error)) throw error;
    restoreWarning = error instanceof Error ? error.message : String(error);
  }

  const schema = await verifyCoreSchema(options.restoreDatabaseUrl, options.restoreSsl);
  const timestamp = new Date().toISOString().replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "Z");
  const drillManifestPath = path.join(
    path.dirname(manifestPath),
    `${path.basename(verification.backupFile)}.${timestamp}.restore-drill.json`
  );
  const drillManifest = {
    type: "pharmsita-postgres-restore-drill",
    version: 1,
    status: schema.ok ? "PASS" : "FAIL",
    restoredAt: new Date().toISOString(),
    backup: {
      manifest: manifestPath,
      file: verification.backupFile,
      sha256: verification.sha256,
      createdAt: verification.manifest.createdAt,
    },
    target: {
      host: target.host,
      port: target.port,
      database: target.database,
      user: target.user,
      sslMode: env.PGSSLMODE || "",
      redactedUrl: redactDatabaseUrl(options.restoreDatabaseUrl),
    },
    restoreWarning,
    checks: schema,
  };
  await fs.writeFile(drillManifestPath, `${JSON.stringify(drillManifest, null, 2)}\n`);
  console.table([
    { item: "restoreDrill", value: drillManifestPath },
    { item: "status", value: drillManifest.status },
    { item: "target", value: `${target.host}:${target.port}/${target.database}` },
    { item: "publicTables", value: String(schema.publicTableCount) },
    { item: "missingTables", value: schema.missingTables.join(", ") || "-" },
    { item: "restoreWarning", value: restoreWarning ? "transaction_timeout ignored after schema PASS" : "-" },
  ]);
  if (!schema.ok) throw new Error("Restore drill failed schema verification.");
};

const ageHours = (isoDate) => (Date.now() - new Date(isoDate).getTime()) / 3_600_000;

const databaseMatchesBackup = (databaseUrl, manifest) => {
  const target = parsePostgresUrl(databaseUrl, "Database URL");
  return (
    target.host === manifest.source.host &&
    target.port === manifest.source.port &&
    target.database === manifest.source.database
  );
};

const runGate = async (options) => {
  if (!options.databaseUrl) throw new Error("gate requires DATABASE_URL or --database-url.");

  const manifestPath = options.manifest || await findLatestBackupManifest(options.backupDir);
  const verification = await verifyManifest(manifestPath);
  const backupAge = ageHours(verification.manifest.createdAt);
  const checks = [
    ...verification.checks,
    {
      name: "backup freshness",
      status: backupAge <= options.maxAgeHours ? "PASS" : "FAIL",
      detail: `ageHours=${backupAge.toFixed(2)}; max=${options.maxAgeHours}`,
    },
    {
      name: "backup source matches DATABASE_URL",
      status: databaseMatchesBackup(options.databaseUrl, verification.manifest) ? "PASS" : "FAIL",
      detail: verification.manifest.source.redactedUrl,
    },
  ];

  let restoreDrillManifestPath = "";
  if (options.requireRestoreDrill) {
    restoreDrillManifestPath = await findRestoreDrillManifest(path.dirname(manifestPath), verification.sha256);
    if (!restoreDrillManifestPath) {
      checks.push({
        name: "restore drill required",
        status: "FAIL",
        detail: "No matching PASS restore drill manifest found.",
      });
    } else {
      const restoreManifest = await readJson(restoreDrillManifestPath);
      const restoreAge = ageHours(restoreManifest.restoredAt);
      checks.push({ name: "restore drill required", status: "PASS", detail: restoreDrillManifestPath });
      checks.push({
        name: "restore drill freshness",
        status: restoreAge <= options.restoreDrillMaxAgeHours ? "PASS" : "FAIL",
        detail: `ageHours=${restoreAge.toFixed(2)}; max=${options.restoreDrillMaxAgeHours}`,
      });
    }
  }

  console.table(checks);
  const ok = checks.every((check) => check.status === "PASS");
  const timestamp = new Date().toISOString().replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "Z");
  const nonce = crypto.randomBytes(4).toString("hex");
  const gateManifestPath = path.join(
    path.dirname(manifestPath),
    `pre-migration-gate-${timestamp}-${nonce}.json`
  );
  await fs.writeFile(
    gateManifestPath,
    `${JSON.stringify({
      type: "pharmsita-pre-migration-safety-gate",
      version: 1,
      status: ok ? "PASS" : "FAIL",
      checkedAt: new Date().toISOString(),
      backup: {
        manifest: manifestPath,
        file: verification.backupFile,
        sha256: verification.sha256,
        createdAt: verification.manifest.createdAt,
        ageHours: Number(backupAge.toFixed(4)),
      },
      requireRestoreDrill: options.requireRestoreDrill,
      restoreDrillManifest: restoreDrillManifestPath,
      checks,
    }, null, 2)}\n`
  );

  if (!ok) throw new Error(`Pre-migration safety gate failed. Details: ${gateManifestPath}`);
  console.log(`Pre-migration safety gate passed: ${gateManifestPath}`);
};

const runCheckTools = async () => {
  const checks = await Promise.all([
    checkTool("pg_dump", true),
    checkTool("pg_restore", true),
    checkTool("psql", false),
  ]);
  console.table(checks);
  if (checks.some((check) => check.status === "FAIL")) {
    throw new Error("Required PostgreSQL CLI tools are missing.");
  }
};

const run = async () => {
  const options = parseArgs(process.argv.slice(2));
  if (options.help) {
    console.log(usage);
    return;
  }

  if (options.command === "backup") await runBackup(options);
  else if (options.command === "verify") await runVerify(options);
  else if (options.command === "restore-drill") await runRestoreDrill(options);
  else if (options.command === "gate") await runGate(options);
  else if (options.command === "check-tools") await runCheckTools();
};

run().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
