import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawn } from "node:child_process";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const port = process.env.AUTH_ALIGNMENT_SMOKE_PORT || process.env.PORT || "4101";
const apiPrefix = process.env.API_PREFIX || "/api/v1";
const apiBaseUrl = (process.env.API_BASE_URL || `http://localhost:${port}${apiPrefix}`).replace(/\/$/, "");
const demoPassword = process.env.API_SMOKE_PASSWORD || "demo";
const firstLoginPassword = process.env.API_FIRST_LOGIN_PASSWORD || "demo1234";
const shouldStartServer = process.env.AUTH_ALIGNMENT_SMOKE_SKIP_SERVER !== "1" && !process.env.API_BASE_URL;
const serverPath = path.join(rootDir, "backend", "dist", "server.js");
const databaseFile =
  process.env.AUTH_ALIGNMENT_SMOKE_DATABASE_FILE ||
  path.join(os.tmpdir(), `pharmsita-auth-alignment-${Date.now()}.json`);

const checks = [];

const summarize = (value) => {
  if (!value || typeof value !== "object") return "";
  if (value.loginChallengeId) {
    return `roles=${(value.availableRoles || []).join(",")}`;
  }
  if (value.user?.role) return `role=${value.user.role}`;
  if (Array.isArray(value.permissions)) return `permissions=${value.permissions.length}`;
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

const startServer = async () => {
  if (!shouldStartServer) {
    return null;
  }

  try {
    await fs.access(serverPath);
  } catch {
    throw new Error("Backend dist server is missing. Run `npm.cmd run backend:build` first.");
  }

  await fs.mkdir(path.dirname(databaseFile), { recursive: true });

  const child = spawn(process.execPath, [serverPath], {
    cwd: rootDir,
    env: {
      ...process.env,
      DB_ADAPTER: "json",
      DATABASE_FILE: databaseFile,
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
      throw new Error(`Backend exited early.\n${serverHandle.getOutput()}`);
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
  console.log(`Auth alignment smoke target: ${apiBaseUrl}`);
  console.log(`Auth alignment database file: ${databaseFile}`);

  let serverHandle = null;

  try {
    serverHandle = await startServer();
    await waitForHealth(serverHandle);

    const multiLogin = await addCheck("Multi-role login returns challenge", "POST", "/auth/login", {
      body: { identifier: "multi", password: demoPassword },
    });
    const multiChallengeId = multiLogin.payload?.loginChallengeId || "";
    const multiRoles = multiLogin.payload?.availableRoles || [];
    assertPass(
      "Multi-role challenge has no token",
      !!multiChallengeId && !multiLogin.payload?.accessToken,
      `challenge=${multiChallengeId ? "present" : "missing"}`
    );
    assertPass(
      "Multi-role roles available",
      multiRoles.includes("dosen") && multiRoles.includes("koordinator"),
      `roles=${multiRoles.join(",") || "-"}`
    );

    const selected = await addCheck("Select koordinator role", "POST", "/auth/select-role", {
      body: { loginChallengeId: multiChallengeId, role: "koordinator" },
    });
    const selectedToken = selected.payload?.accessToken || "";
    assertPass(
      "Selected role token",
      selected.payload?.user?.role === "koordinator" && !!selectedToken,
      selected.payload?.user?.role || "-"
    );

    const selectedMe = await addCheck("Selected role /auth/me", "GET", "/auth/me", {
      token: selectedToken,
    });
    assertPass(
      "Selected role permissions",
      selectedMe.payload?.permissions?.includes("coordinator.workflow.read"),
      `permissions=${selectedMe.payload?.permissions?.join(",") || "-"}`
    );

    const refreshed = await addCheck("Refresh preserves selected role", "POST", "/auth/refresh", {
      body: { refreshToken: selected.payload?.refreshToken },
    });
    assertPass(
      "Refreshed role koordinator",
      refreshed.payload?.user?.role === "koordinator",
      refreshed.payload?.user?.role || "-"
    );

    const firstLogin = await addCheck("First-login account returns challenge", "POST", "/auth/login", {
      body: { identifier: "firstlogin", password: demoPassword },
    });
    const firstChallengeId = firstLogin.payload?.loginChallengeId || "";
    assertPass(
      "First-login challenge requires activation",
      firstLogin.payload?.requiresFirstLogin === true && !!firstChallengeId,
      `challenge=${firstChallengeId ? "present" : "missing"}`
    );

    const activated = await addCheck("Complete first login", "POST", "/auth/first-login", {
      body: {
        loginChallengeId: firstChallengeId,
        role: "mahasiswa",
        newPassword: firstLoginPassword,
      },
    });
    assertPass(
      "First-login returns session",
      activated.payload?.user?.role === "mahasiswa" && !!activated.payload?.accessToken,
      activated.payload?.user?.role || "-"
    );

    await addCheck("Old first-login password rejected", "POST", "/auth/login", {
      body: { identifier: "firstlogin", password: demoPassword },
      expectedStatus: 401,
    });

    const relogin = await addCheck("Activated account direct login", "POST", "/auth/login", {
      body: { identifier: "firstlogin", password: firstLoginPassword },
    });
    assertPass(
      "Activated login has no challenge",
      !!relogin.payload?.accessToken && !relogin.payload?.loginChallengeId,
      relogin.payload?.accessToken ? "accessToken present" : "accessToken missing"
    );
  } finally {
    if (serverHandle) {
      await serverHandle.stop();
    }
  }

  console.table(checks);

  const failed = checks.filter((check) => check.result !== "PASS");
  if (failed.length > 0) {
    console.error(`Auth alignment smoke test failed: ${failed.length} check(s) failed.`);
    process.exitCode = 1;
    return;
  }

  console.log(`Auth alignment smoke test passed: ${checks.length} checks.`);
};

main().catch((error) => {
  if (checks.length > 0) {
    console.table(checks);
  }
  console.error(error instanceof Error ? error.message || error.stack : String(error));
  process.exitCode = 1;
});
