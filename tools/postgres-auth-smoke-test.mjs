import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawn } from "node:child_process";
import pg from "pg";

const { Pool } = pg;

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const databaseUrl = process.env.DATABASE_URL;
const port = process.env.POSTGRES_AUTH_SMOKE_PORT || process.env.PORT || "4100";
const apiPrefix = process.env.API_PREFIX || "/api/v1";
const apiBaseUrl = (process.env.API_BASE_URL || `http://localhost:${port}${apiPrefix}`).replace(/\/$/, "");
const demoPassword = process.env.API_SMOKE_PASSWORD || "demo";
const shouldStartServer = process.env.POSTGRES_AUTH_SMOKE_SKIP_SERVER !== "1" && !process.env.API_BASE_URL;
const serverPath = path.join(rootDir, "backend", "dist", "server.js");
const databaseSsl = ["1", "true", "yes", "on"].includes(
  (process.env.DATABASE_SSL || "").toLowerCase()
);

const sqlFiles = [
  path.join(rootDir, "backend", "database", "migrations", "001_auth_master_data.sql"),
  path.join(rootDir, "backend", "database", "migrations", "002_permissions_and_workflow.sql"),
  path.join(rootDir, "backend", "database", "migrations", "003_multi_role_first_login.sql"),
  path.join(rootDir, "backend", "database", "migrations", "004_final_project_registration.sql"),
  path.join(rootDir, "backend", "database", "seeds", "001_demo_auth.sql"),
];

const checks = [];

const summarize = (value) => {
  if (!value || typeof value !== "object") return "";
  if (value.user?.role) return `role=${value.user.role}`;
  if (Array.isArray(value.permissions)) return `permissions=${value.permissions.length}`;
  if (Array.isArray(value.data)) return `items=${value.data.length}`;
  if (value.status) return `status=${value.status}`;
  if (value.error?.code) return value.error.code;
  return "";
};

const addResult = (name, expected, actual, passed, detail = "") => {
  checks.push({
    name,
    expected,
    actual,
    result: passed ? "PASS" : "FAIL",
    detail,
  });
};

const assertPass = (name, passed, detail = "") => {
  addResult(name, "PASS", passed ? "PASS" : "FAIL", passed, detail);
};

const formatError = (error) => {
  if (error instanceof AggregateError) {
    return error.errors
      .map((entry) => (entry instanceof Error ? entry.message || entry.stack : String(entry)))
      .join("\n");
  }

  if (error instanceof Error) {
    return error.message || error.stack || String(error);
  }

  return String(error);
};

const request = async (method, pathName, { token, body, expectedStatus = 200 } = {}) => {
  const headers = { Accept: "application/json" };
  if (token) headers.Authorization = `Bearer ${token}`;
  if (body !== undefined) headers["Content-Type"] = "application/json";

  let response;
  let payload = null;

  try {
    response = await fetch(`${apiBaseUrl}${pathName}`, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  } catch (error) {
    return {
      ok: false,
      status: 0,
      expectedStatus,
      payload: null,
      detail: error instanceof Error ? error.message : "Request failed",
    };
  }

  const text = await response.text();
  if (text) {
    try {
      payload = JSON.parse(text);
    } catch {
      payload = text;
    }
  }

  return {
    ok: response.status === expectedStatus,
    status: response.status,
    expectedStatus,
    payload,
    detail: summarize(payload),
  };
};

const addCheck = async (name, method, pathName, options) => {
  const result = await request(method, pathName, options);
  addResult(name, result.expectedStatus, result.status, result.ok, result.detail);
  return result;
};

const login = async (identifier, expectedRole) => {
  const result = await addCheck(`Login ${identifier}/${demoPassword}`, "POST", "/auth/login", {
    body: { identifier, password: demoPassword },
  });
  const role = result.payload?.user?.role;
  const accessToken = result.payload?.accessToken || "";
  const refreshToken = result.payload?.refreshToken || "";
  const passed = result.ok && role === expectedRole && !!accessToken && !!refreshToken;

  addResult(
    `Auth role ${identifier}`,
    expectedRole,
    role || "-",
    passed,
    accessToken && refreshToken ? "tokens present" : "tokens missing"
  );

  return {
    accessToken,
    refreshToken,
    payload: result.payload,
  };
};

const applySqlFiles = async () => {
  if (!databaseUrl) {
    throw new Error("DATABASE_URL is required for PostgreSQL auth smoke test.");
  }

  const pool = new Pool({
    connectionString: databaseUrl,
    ssl: databaseSsl ? { rejectUnauthorized: false } : undefined,
  });

  try {
    for (const file of sqlFiles) {
      const sql = await fs.readFile(file, "utf8");
      await pool.query(sql);
      addResult(`Apply ${path.relative(rootDir, file)}`, "applied", "applied", true);
    }
  } finally {
    await pool.end();
  }
};

const startServer = async () => {
  if (!shouldStartServer) {
    return null;
  }

  try {
    await fs.access(serverPath);
  } catch {
    throw new Error("Backend dist server is missing. Run `npm.cmd run backend:build` first.");
  }

  const child = spawn(process.execPath, [serverPath], {
    cwd: rootDir,
    env: {
      ...process.env,
      DB_ADAPTER: "postgres",
      DATABASE_URL: databaseUrl,
      PORT: port,
      API_PREFIX: apiPrefix,
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

  const stop = async () => {
    if (child.exitCode !== null) {
      return;
    }

    child.kill();
    await new Promise((resolve) => child.once("exit", resolve));
  };

  return { child, stop, getOutput: () => output };
};

const waitForHealth = async (serverHandle) => {
  const startedAt = Date.now();
  const timeoutMs = 15_000;

  while (Date.now() - startedAt < timeoutMs) {
    if (serverHandle && serverHandle.child.exitCode !== null) {
      throw new Error(`PostgreSQL backend exited early.\n${serverHandle.getOutput()}`);
    }

    const result = await request("GET", "/health");
    if (result.status === 200) {
      addResult("Backend health ready", 200, 200, true, result.detail);
      return;
    }

    await new Promise((resolve) => setTimeout(resolve, 500));
  }

  throw new Error(`Timed out waiting for backend health at ${apiBaseUrl}/health.`);
};

const main = async () => {
  console.log(`PostgreSQL auth smoke target: ${apiBaseUrl}`);

  let serverHandle = null;

  try {
    await applySqlFiles();
    serverHandle = await startServer();
    await waitForHealth(serverHandle);

    await addCheck("Invalid login rejected", "POST", "/auth/login", {
      body: { identifier: "mahasiswa", password: "wrong-password" },
      expectedStatus: 401,
    });

    const mahasiswa = await login("mahasiswa", "mahasiswa");
    const mahasiswaMe = await addCheck("Mahasiswa /auth/me", "GET", "/auth/me", {
      token: mahasiswa.accessToken,
    });
    assertPass(
      "Mahasiswa permission lookup",
      mahasiswaMe.payload?.permissions?.includes("student.workflow.read"),
      `permissions=${mahasiswaMe.payload?.permissions?.join(",") || "-"}`
    );

    const refresh = await addCheck("Refresh rotates token", "POST", "/auth/refresh", {
      body: { refreshToken: mahasiswa.refreshToken },
    });
    const rotatedRefreshToken = refresh.payload?.refreshToken || "";
    const rotatedAccessToken = refresh.payload?.accessToken || "";

    await addCheck("Old refresh token rejected", "POST", "/auth/refresh", {
      body: { refreshToken: mahasiswa.refreshToken },
      expectedStatus: 401,
    });

    const dosen = await login("dosen", "dosen");
    await addCheck("Dosen forbidden audit log", "GET", "/admin/audit-logs?limit=5", {
      token: dosen.accessToken,
      expectedStatus: 403,
    });

    const admin = await login("admin", "admin");
    const auditLogs = await addCheck("Admin audit log list", "GET", "/admin/audit-logs?limit=20", {
      token: admin.accessToken,
    });
    assertPass(
      "Audit log persisted",
      Array.isArray(auditLogs.payload?.data) &&
        auditLogs.payload.data.some((entry) => entry.action === "AUTH_LOGIN_SUCCESS"),
      `items=${auditLogs.payload?.data?.length || 0}`
    );

    await addCheck("Logout revoked rotated refresh", "POST", "/auth/logout", {
      token: rotatedAccessToken,
      body: { refreshToken: rotatedRefreshToken },
    });
    await addCheck("Logged out refresh rejected", "POST", "/auth/refresh", {
      body: { refreshToken: rotatedRefreshToken },
      expectedStatus: 401,
    });
  } finally {
    if (serverHandle) {
      await serverHandle.stop();
    }
  }

  console.table(checks);

  const failed = checks.filter((check) => check.result !== "PASS");
  if (failed.length > 0) {
    console.error(`PostgreSQL auth smoke test failed: ${failed.length} check(s) failed.`);
    process.exitCode = 1;
    return;
  }

  console.log(`PostgreSQL auth smoke test passed: ${checks.length} checks.`);
};

main().catch((error) => {
  if (checks.length > 0) {
    console.table(checks);
  }
  console.error(formatError(error));
  process.exitCode = 1;
});
