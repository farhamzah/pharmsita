import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import pg from "pg";
import { hashPassword } from "./lib/password-hash.mjs";

const { Pool } = pg;

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const migrationsDir = path.join(rootDir, "backend", "database", "migrations");
const serverPath = path.join(rootDir, "backend", "dist", "server.js");
const migrationTable = "pharmsita_schema_migrations";

const usage = `Usage:
  npm.cmd run smoke:production:no-demo
  npm.cmd run smoke:production:no-demo -- --preflight-only
  npm.cmd run smoke:production:no-demo -- --allow-write --identifier pharmsita-smoke-admin
  npm.cmd run smoke:production:no-demo -- --start-server --allow-degraded-readiness --preflight-only

Required:
  DATABASE_URL, or --database-url <url>

Options:
  --api-base-url <url>              API base URL. Default: API_BASE_URL or http://localhost:4000/api/v1.
  --database-url <url>              PostgreSQL connection string. Defaults to DATABASE_URL.
  --ssl                             Enable PostgreSQL SSL with rejectUnauthorized=false.
  --no-ssl                          Disable PostgreSQL SSL.
  --preflight-only                  Skip authenticated/write workflow. Still runs bootstrap dry-run.
  --allow-write                     Allow dedicated smoke admin reset, first-login, diagnostics, and profile update.
  --allow-degraded-readiness         Do not fail when readiness/migration status is degraded.
  --start-server                    Start backend/dist/server.js temporarily for this smoke run.
  --port <number>                   Port used with --start-server. Default: PRODUCTION_SMOKE_PORT or 4140.
  --identifier <value>              Dedicated smoke admin identifier. Default: PRODUCTION_SMOKE_ADMIN_IDENTIFIER or pharmsita-smoke-admin.
  --email <value>                   Dedicated smoke admin email.
  --employee-number <value>         Dedicated smoke admin employee number.
  --name <value>                    Dedicated smoke admin name.
  --temporary-password <value>      Temporary password for write mode. Defaults to generated value.
  --activated-password <value>      Password after first login. Defaults to generated value.
  --admin-password <value>          Existing admin password for read-only authenticated diagnostics.
  --help                            Show this help.
`;

const checks = [];

const parseBooleanEnv = (value) =>
  ["1", "true", "yes", "on"].includes(String(value || "").toLowerCase());

const addCheck = (name, status, detail = "") => {
  checks.push({ name, status, detail });
};

const failCheck = (name, error) => {
  addCheck(name, "FAIL", error instanceof Error ? error.message : String(error));
};

const parseArgs = (argv) => {
  const port = process.env.PRODUCTION_SMOKE_PORT || "4140";
  const options = {
    apiBaseUrl: (
      process.env.API_BASE_URL || `http://localhost:${port}${process.env.API_PREFIX || "/api/v1"}`
    ).replace(/\/$/, ""),
    databaseUrl: process.env.DATABASE_URL || "",
    ssl:
      process.env.DATABASE_SSL &&
      parseBooleanEnv(process.env.DATABASE_SSL),
    preflightOnly: parseBooleanEnv(process.env.PRODUCTION_SMOKE_PREFLIGHT_ONLY),
    allowWrite: parseBooleanEnv(process.env.PRODUCTION_SMOKE_ALLOW_WRITE),
    allowDegradedReadiness: parseBooleanEnv(
      process.env.PRODUCTION_SMOKE_ALLOW_DEGRADED_READINESS
    ),
    startServer: parseBooleanEnv(process.env.PRODUCTION_SMOKE_START_SERVER),
    port,
    identifier:
      process.env.PRODUCTION_SMOKE_ADMIN_IDENTIFIER || "pharmsita-smoke-admin",
    email:
      process.env.PRODUCTION_SMOKE_ADMIN_EMAIL ||
      "pharmsita-smoke-admin@pharmsita.local",
    employeeNumber:
      process.env.PRODUCTION_SMOKE_ADMIN_EMPLOYEE_NUMBER || "SMOKE-ADMIN-001",
    name: process.env.PRODUCTION_SMOKE_ADMIN_NAME || "PharmSITA Smoke Admin",
    temporaryPassword:
      process.env.PRODUCTION_SMOKE_TEMPORARY_PASSWORD ||
      `Tmp-${crypto.randomUUID()}-Aa1`,
    activatedPassword:
      process.env.PRODUCTION_SMOKE_ACTIVATED_PASSWORD ||
      `Active-${crypto.randomUUID()}-Aa1`,
    adminPassword: process.env.PRODUCTION_SMOKE_ADMIN_PASSWORD || "",
    help: false,
  };

  const args = [...argv];
  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];

    if (arg === "--api-base-url") {
      options.apiBaseUrl = (args[++index] || "").replace(/\/$/, "");
    } else if (arg === "--database-url") {
      options.databaseUrl = args[++index] || "";
    } else if (arg === "--ssl") {
      options.ssl = true;
    } else if (arg === "--no-ssl") {
      options.ssl = false;
    } else if (arg === "--preflight-only") {
      options.preflightOnly = true;
    } else if (arg === "--allow-write") {
      options.allowWrite = true;
    } else if (arg === "--allow-degraded-readiness") {
      options.allowDegradedReadiness = true;
    } else if (arg === "--start-server") {
      options.startServer = true;
    } else if (arg === "--port") {
      options.port = args[++index] || "";
    } else if (arg === "--identifier") {
      options.identifier = args[++index] || "";
    } else if (arg === "--email") {
      options.email = args[++index] || "";
    } else if (arg === "--employee-number") {
      options.employeeNumber = args[++index] || "";
    } else if (arg === "--name") {
      options.name = args[++index] || "";
    } else if (arg === "--temporary-password") {
      options.temporaryPassword = args[++index] || "";
    } else if (arg === "--activated-password") {
      options.activatedPassword = args[++index] || "";
    } else if (arg === "--admin-password") {
      options.adminPassword = args[++index] || "";
    } else if (arg === "--help" || arg === "-h") {
      options.help = true;
    } else {
      throw new Error(`Unknown argument: ${arg}`);
    }
  }

  options.identifier = options.identifier.trim();
  options.email = options.email.trim();
  options.employeeNumber = options.employeeNumber.trim();
  options.name = options.name.trim();

  return options;
};

const createPool = (options) => {
  if (!options.databaseUrl) {
    throw new Error("DATABASE_URL is required.");
  }

  return new Pool({
    connectionString: options.databaseUrl,
    ssl: options.ssl ? { rejectUnauthorized: false } : undefined,
  });
};

const readLocalMigrations = async () => {
  const filenames = (await fs.readdir(migrationsDir))
    .filter((filename) => /^\d+_.+\.sql$/.test(filename))
    .sort();

  return filenames.map((filename) => ({
    version: filename.split("_")[0],
    filename,
  }));
};

const checkMigrationStatus = async (pool, options) => {
  const localMigrations = await readLocalMigrations();
  const tableResult = await pool.query(
    "SELECT to_regclass($1) IS NOT NULL AS exists",
    [migrationTable]
  );

  if (!tableResult.rows[0]?.exists) {
    const detail = `${migrationTable} missing; pending=${localMigrations.length}`;
    addCheck(
      "Versioned migration table",
      options.allowDegradedReadiness ? "WARN" : "FAIL",
      detail
    );
    return { ready: false, pendingCount: localMigrations.length };
  }

  const appliedResult = await pool.query(
    `
      SELECT version, filename
      FROM ${migrationTable}
      ORDER BY version ASC
    `
  );
  const appliedVersions = new Set(appliedResult.rows.map((row) => row.version));
  const pending = localMigrations.filter(
    (migration) => !appliedVersions.has(migration.version)
  );
  const unknownApplied = appliedResult.rows.filter(
    (row) =>
      !localMigrations.some(
        (migration) =>
          migration.version === row.version && migration.filename === row.filename
      )
  );
  const ok = pending.length === 0 && unknownApplied.length === 0;
  const status = ok ? "PASS" : options.allowDegradedReadiness ? "WARN" : "FAIL";

  addCheck(
    "Versioned migration status",
    status,
    `applied=${appliedResult.rows.length}; pending=${pending.length}; unknown=${unknownApplied.length}`
  );

  return {
    ready: ok,
    pendingCount: pending.length,
    unknownAppliedCount: unknownApplied.length,
  };
};

const assertRequiredSchema = async (pool) => {
  const result = await pool.query(
    `
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
        AND table_name = ANY($1)
    `,
    [["users", "user_roles", "admin_profiles"]]
  );
  const existingTables = new Set(result.rows.map((row) => row.table_name));
  const missing = ["users", "user_roles", "admin_profiles"].filter(
    (tableName) => !existingTables.has(tableName)
  );

  if (missing.length > 0) {
    throw new Error(`Required tables are missing: ${missing.join(", ")}`);
  }
};

const findExistingUser = async (client, identifier) => {
  const result = await client.query(
    "SELECT id, identifier, name, email FROM users WHERE identifier = $1",
    [identifier]
  );
  return result.rows[0] || null;
};

const upsertSmokeAdmin = async (client, options, { resetPassword, dryRun }) => {
  if (!options.identifier || !options.name || !options.employeeNumber) {
    throw new Error("Smoke admin identifier, name, and employee number are required.");
  }

  if (resetPassword && options.temporaryPassword.length < 8) {
    throw new Error("Temporary password must be at least 8 characters.");
  }

  const existingUser = await findExistingUser(client, options.identifier);
  const now = new Date();
  let userId = existingUser?.id || null;
  let action = existingUser ? "updated_without_password_reset" : "created";

  await client.query("BEGIN");
  try {
    if (!existingUser) {
      const result = await client.query(
        `
          INSERT INTO users (
            role,
            identifier,
            name,
            email,
            status,
            password_hash,
            password_status,
            force_change_on_login,
            created_at
          )
          VALUES ('admin', $1, $2, $3, 'Aktif', $4, 'needs_activation', TRUE, $5)
          RETURNING id
        `,
        [
          options.identifier,
          options.name,
          options.email,
          hashPassword(options.temporaryPassword),
          now,
        ]
      );
      userId = result.rows[0].id;
      action = "created";
    } else if (resetPassword) {
      await client.query(
        `
          UPDATE users
          SET
            role = 'admin',
            name = $1,
            email = COALESCE($2, email),
            status = 'Aktif',
            password_hash = $3,
            password_status = 'needs_activation',
            force_change_on_login = TRUE,
            updated_at = $4
          WHERE id = $5
        `,
        [
          options.name,
          options.email,
          hashPassword(options.temporaryPassword),
          now,
          existingUser.id,
        ]
      );
      action = "updated_with_password_reset";
    }

    await client.query(
      `
        INSERT INTO user_roles (user_id, role, status, created_at, updated_at)
        VALUES ($1, 'admin', 'Aktif', $2, $2)
        ON CONFLICT (user_id, role) DO UPDATE
        SET status = 'Aktif', updated_at = EXCLUDED.updated_at
      `,
      [userId, now]
    );

    await client.query(
      `
        INSERT INTO admin_profiles (
          user_id,
          employee_number,
          divisi,
          tingkat_akses,
          cakupan_akses,
          created_at,
          updated_at
        )
        VALUES ($1, $2, 'Administrasi PharmSITA', 'Superadmin', $3::JSONB, $4, $4)
        ON CONFLICT (user_id) DO UPDATE
        SET
          employee_number = EXCLUDED.employee_number,
          divisi = EXCLUDED.divisi,
          tingkat_akses = EXCLUDED.tingkat_akses,
          cakupan_akses = EXCLUDED.cakupan_akses,
          updated_at = EXCLUDED.updated_at
      `,
      [
        userId,
        options.employeeNumber,
        JSON.stringify(["Manajemen Akun", "Master Data", "Audit Log"]),
        now,
      ]
    );

    if (dryRun) {
      await client.query("ROLLBACK");
    } else {
      await client.query("COMMIT");
    }

    return {
      action: dryRun ? `${action}_dry_run` : action,
      userId,
      requiresFirstLogin: !existingUser || resetPassword,
    };
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  }
};

const startServer = async (options) => {
  if (!options.startServer) {
    return null;
  }

  await fs.access(serverPath);

  const child = spawn(process.execPath, [serverPath], {
    cwd: rootDir,
    env: {
      ...process.env,
      DB_ADAPTER: "postgres",
      DATABASE_URL: options.databaseUrl,
      DATABASE_SSL: options.ssl ? "true" : "false",
      PORT: options.port,
      API_PREFIX: process.env.API_PREFIX || "/api/v1",
    },
    stdio: ["ignore", "pipe", "pipe"],
    windowsHide: true,
  });

  let output = "";
  const capture = (chunk) => {
    output += chunk.toString();
    output = output.slice(-4000);
  };

  child.stdout.on("data", capture);
  child.stderr.on("data", capture);

  return {
    child,
    getOutput: () => output,
    stop: async () => {
      if (child.exitCode !== null) return;
      child.kill();
      await new Promise((resolve) => child.once("exit", resolve));
    },
  };
};

const request = async (
  options,
  method,
  pathName,
  { token, body, expectedStatuses = [200] } = {}
) => {
  const headers = { Accept: "application/json" };
  if (token) headers.Authorization = `Bearer ${token}`;
  if (body !== undefined) headers["Content-Type"] = "application/json";

  let response;
  let payload = null;
  try {
    response = await fetch(`${options.apiBaseUrl}${pathName}`, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  } catch (error) {
    throw new Error(error instanceof Error ? error.message : String(error));
  }

  const text = await response.text();
  if (text) {
    try {
      payload = JSON.parse(text);
    } catch {
      payload = text;
    }
  }

  if (!expectedStatuses.includes(response.status)) {
    throw new Error(
      `${method} ${pathName} returned ${response.status}; expected ${expectedStatuses.join(", ")}`
    );
  }

  return { status: response.status, payload };
};

const waitForHealth = async (options, serverHandle) => {
  const startedAt = Date.now();
  const timeoutMs = 15_000;

  while (Date.now() - startedAt < timeoutMs) {
    if (serverHandle && serverHandle.child.exitCode !== null) {
      throw new Error(`Backend exited early.\n${serverHandle.getOutput()}`);
    }

    try {
      const health = await request(options, "GET", "/health");
      if (health.payload?.status === "ok") {
        addCheck("Liveness /health", "PASS", "status=ok");
        return;
      }
    } catch {
      // retry
    }

    await new Promise((resolve) => setTimeout(resolve, 500));
  }

  throw new Error(`Timed out waiting for ${options.apiBaseUrl}/health.`);
};

const checkReadiness = async (options) => {
  const ready = await request(options, "GET", "/health/ready", {
    expectedStatuses: options.allowDegradedReadiness ? [200, 503] : [200],
  });
  const readinessStatus = ready.payload?.status || "unknown";
  const ok = readinessStatus === "ready";
  const tolerated = options.allowDegradedReadiness && readinessStatus === "degraded";

  addCheck(
    "Readiness /health/ready",
    ok ? "PASS" : tolerated ? "WARN" : "FAIL",
    `status=${readinessStatus}; db=${ready.payload?.checks?.database?.status || "-"}; migrations=${ready.payload?.checks?.migrations?.status || "-"}`
  );
};

const login = async (options, identifier, password, expectedStatuses = [200]) =>
  request(options, "POST", "/auth/login", {
    body: { identifier, password },
    expectedStatuses,
  });

const runReadOnlyAuthenticatedChecks = async (options) => {
  if (!options.adminPassword) {
    addCheck(
      "Read-only admin authenticated checks",
      "SKIP",
      "Set PRODUCTION_SMOKE_ADMIN_PASSWORD or use --admin-password."
    );
    return;
  }

  const loginResult = await login(options, options.identifier, options.adminPassword, [200]);

  if (loginResult.payload?.loginChallengeId) {
    addCheck(
      "Admin login",
      "WARN",
      "Login returned first-login challenge; use --allow-write to complete smoke activation."
    );
    return;
  }

  const token = loginResult.payload?.accessToken;
  if (!token) {
    throw new Error("Admin login did not return accessToken.");
  }

  addCheck("Admin login", "PASS", `role=${loginResult.payload?.user?.role || "-"}`);

  const diagnostics = await request(options, "GET", "/admin/deployment/diagnostics", {
    token,
  });
  addCheck(
    "Admin diagnostics",
    "PASS",
    `status=${diagnostics.payload?.data?.status || "-"}; mode=${diagnostics.payload?.data?.repositoryMode || "-"}`
  );

  const profile = await request(options, "GET", "/auth/profile", { token });
  addCheck(
    "Admin profile read",
    "PASS",
    `identifier=${profile.payload?.user?.identifier || "-"}`
  );
};

const runWriteWorkflow = async (pool, options) => {
  if (!options.allowWrite) {
    await runReadOnlyAuthenticatedChecks(options);
    return;
  }

  const client = await pool.connect();
  try {
    const bootstrap = await upsertSmokeAdmin(client, options, {
      resetPassword: true,
      dryRun: false,
    });
    addCheck(
      "Smoke admin reset/bootstrap",
      "PASS",
      `${bootstrap.action}; requiresFirstLogin=${bootstrap.requiresFirstLogin}`
    );
  } finally {
    client.release();
  }

  const firstLoginChallenge = await login(options, options.identifier, options.temporaryPassword);
  const challengeId = firstLoginChallenge.payload?.loginChallengeId;
  if (!challengeId || firstLoginChallenge.payload?.requiresFirstLogin !== true) {
    throw new Error("Expected first-login challenge after smoke admin reset.");
  }
  addCheck("First-login challenge", "PASS", "challenge=present");

  const activated = await request(options, "POST", "/auth/first-login", {
    body: {
      loginChallengeId: challengeId,
      role: "admin",
      newPassword: options.activatedPassword,
    },
  });
  const token = activated.payload?.accessToken;
  if (!token) {
    throw new Error("First-login did not return accessToken.");
  }
  addCheck("First-login completion", "PASS", `role=${activated.payload?.user?.role || "-"}`);

  await login(options, options.identifier, options.temporaryPassword, [401]);
  addCheck("Temporary password rejected after first-login", "PASS", "status=401");

  const relogin = await login(options, options.identifier, options.activatedPassword);
  const reloginToken = relogin.payload?.accessToken;
  if (!reloginToken) {
    throw new Error("Activated password login did not return accessToken.");
  }
  addCheck("Activated admin login", "PASS", `role=${relogin.payload?.user?.role || "-"}`);

  const diagnostics = await request(options, "GET", "/admin/deployment/diagnostics", {
    token: reloginToken,
  });
  addCheck(
    "Admin diagnostics",
    "PASS",
    `status=${diagnostics.payload?.data?.status || "-"}; mode=${diagnostics.payload?.data?.repositoryMode || "-"}`
  );

  const profilePatch = {
    phone: "08000000100",
    address: "Production smoke verification",
    gender: "Laki-laki",
    birthDate: "2000-01-01",
    divisi: "Administrasi PharmSITA",
    tingkatAkses: "Superadmin",
    cakupanAkses: ["Manajemen Akun", "Master Data", "Audit Log"],
  };
  const updatedProfile = await request(options, "PATCH", "/auth/profile", {
    token: reloginToken,
    body: profilePatch,
  });
  const profileOk =
    updatedProfile.payload?.user?.phone === profilePatch.phone &&
    updatedProfile.payload?.user?.address === profilePatch.address;
  addCheck(
    "Admin profile update",
    profileOk ? "PASS" : "FAIL",
    `phone=${updatedProfile.payload?.user?.phone || "-"}`
  );
};

const run = async () => {
  const options = parseArgs(process.argv.slice(2));
  if (options.help) {
    console.log(usage);
    return;
  }

  if (options.allowWrite && options.preflightOnly) {
    throw new Error("--allow-write cannot be combined with --preflight-only.");
  }

  const pool = createPool(options);
  let serverHandle = null;

  try {
    await pool.query("SELECT 1");
    addCheck("PostgreSQL connection", "PASS", "SELECT 1");

    await assertRequiredSchema(pool);
    addCheck("Required production tables", "PASS", "users,user_roles,admin_profiles");

    await checkMigrationStatus(pool, options);

    const client = await pool.connect();
    try {
      const bootstrapDryRun = await upsertSmokeAdmin(client, options, {
        resetPassword: true,
        dryRun: true,
      });
      addCheck(
        "Bootstrap admin dry-run",
        "PASS",
        `${bootstrapDryRun.action}; no changes committed`
      );
    } finally {
      client.release();
    }

    serverHandle = await startServer(options);
    await waitForHealth(options, serverHandle);
    await checkReadiness(options);

    if (options.preflightOnly) {
      addCheck("Authenticated workflow", "SKIP", "preflight-only mode");
    } else {
      await runWriteWorkflow(pool, options);
    }
  } finally {
    if (serverHandle) {
      await serverHandle.stop();
    }
    await pool.end();
  }

  console.table(checks);
  const hasFailure = checks.some((check) => check.status === "FAIL");
  if (hasFailure) {
    throw new Error("Production no-demo smoke test failed.");
  }

  console.log(`Production no-demo smoke test passed with ${checks.length} checks.`);
};

run().catch((error) => {
  if (checks.length > 0) {
    console.table(checks);
  }
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
