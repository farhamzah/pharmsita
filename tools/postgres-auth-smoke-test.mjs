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
  path.join(rootDir, "backend", "database", "migrations", "005_guidance_type_materials.sql"),
  path.join(rootDir, "backend", "database", "migrations", "006_audit_export_guard.sql"),
  path.join(rootDir, "backend", "database", "migrations", "007_user_profile_contact.sql"),
  path.join(rootDir, "backend", "database", "migrations", "008_role_profile_fields.sql"),
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

const request = async (
  method,
  pathName,
  { token, body, expectedStatus = 200, headers: extraHeaders = {} } = {}
) => {
  const headers = { Accept: "application/json", ...extraHeaders };
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
    const adminUsers = await addCheck("Admin list users before provisioning", "GET", "/admin/users", {
      token: admin.accessToken,
    });
    const provisionedIdentifier = `task93user${Date.now()}`;
    const provisionedPassword = "Task93pass!";
    const resetPassword = "Task93reset!";
    const provisionedEmail = `${provisionedIdentifier}@pharmsita.local`;
    const updatedEmail = `${provisionedIdentifier}.updated@pharmsita.local`;
    await addCheck(
      "Admin create user rejects short password",
      "POST",
      "/admin/users",
      {
        token: admin.accessToken,
        body: {
          role: "mahasiswa",
          identifier: `${provisionedIdentifier}-short`,
          name: "Task 95 Short Password",
          email: `${provisionedIdentifier}.short@pharmsita.local`,
          status: "Aktif",
          password: "short",
        },
        expectedStatus: 422,
      }
    );
    const createdUser = await addCheck(
      "Admin creates user with initial password",
      "POST",
      "/admin/users",
      {
        token: admin.accessToken,
        body: {
          role: "mahasiswa",
          identifier: provisionedIdentifier,
          name: "Task 93 Provisioned User",
          email: provisionedEmail,
          status: "Aktif",
          password: provisionedPassword,
        },
        expectedStatus: 201,
      }
    );
    await addCheck(
      "Admin create user rejects duplicate identifier",
      "POST",
      "/admin/users",
      {
        token: admin.accessToken,
        body: {
          role: "mahasiswa",
          identifier: provisionedIdentifier,
          name: "Task 95 Duplicate User",
          email: `${provisionedIdentifier}.duplicate@pharmsita.local`,
          status: "Aktif",
          password: provisionedPassword,
        },
        expectedStatus: 409,
      }
    );
    const provisionedUser = createdUser.payload?.data;
    assertPass(
      "Provisioned user requires first login",
      provisionedUser?.passwordStatus === "needs_activation" &&
        provisionedUser?.forceChangeOnLogin === true &&
        !("password" in (provisionedUser || {})),
      `status=${provisionedUser?.passwordStatus || "-"}; force=${provisionedUser?.forceChangeOnLogin}`
    );
    const updatedUser = await addCheck(
      "Admin updates single user metadata",
      "PATCH",
      `/admin/users/${provisionedUser?.id}`,
      {
        token: admin.accessToken,
        body: {
          name: "Task 93 Updated User",
          email: updatedEmail,
          programStudi: "S1 Farmasi",
          angkatan: "2022",
          kelas: "FA-22-93",
        },
      }
    );
    assertPass(
      "Admin user update returns single updated user",
      updatedUser.payload?.data?.name === "Task 93 Updated User" &&
        updatedUser.payload?.data?.kelas === "FA-22-93",
      `name=${updatedUser.payload?.data?.name || "-"}; kelas=${updatedUser.payload?.data?.kelas || "-"}`
    );
    const inactiveUser = await addCheck(
      "Admin deactivates single user",
      "PATCH",
      `/admin/users/${provisionedUser?.id}/status`,
      {
        token: admin.accessToken,
        body: { status: "Nonaktif" },
      }
    );
    assertPass(
      "Admin status update returns inactive user",
      inactiveUser.payload?.data?.status === "Nonaktif",
      `status=${inactiveUser.payload?.data?.status || "-"}`
    );
    await addCheck("Inactive provisioned user cannot login", "POST", "/auth/login", {
      body: { identifier: provisionedIdentifier, password: provisionedPassword },
      expectedStatus: 401,
    });
    const reactivatedUser = await addCheck(
      "Admin reactivates single user",
      "PATCH",
      `/admin/users/${provisionedUser?.id}/status`,
      {
        token: admin.accessToken,
        body: { status: "Aktif" },
      }
    );
    assertPass(
      "Admin status update returns active user",
      reactivatedUser.payload?.data?.status === "Aktif",
      `status=${reactivatedUser.payload?.data?.status || "-"}`
    );
    const resetUser = await addCheck(
      "Admin resets single user password",
      "POST",
      `/admin/users/${provisionedUser?.id}/reset-password`,
      {
        token: admin.accessToken,
        body: { password: resetPassword },
      }
    );
    assertPass(
      "Admin password reset requires activation",
      resetUser.payload?.data?.passwordStatus === "needs_activation" &&
        resetUser.payload?.data?.forceChangeOnLogin === true,
      `status=${resetUser.payload?.data?.passwordStatus || "-"}; force=${resetUser.payload?.data?.forceChangeOnLogin}`
    );
    await addCheck("Old provisioned password rejected after reset", "POST", "/auth/login", {
      body: { identifier: provisionedIdentifier, password: provisionedPassword },
      expectedStatus: 401,
    });
    const provisionedLogin = await addCheck(
      "Provisioned user can login with reset password",
      "POST",
      "/auth/login",
      {
        body: { identifier: provisionedIdentifier, password: resetPassword },
      }
    );
    assertPass(
      "Provisioned login returns first-login challenge",
      provisionedLogin.payload?.requiresFirstLogin === true &&
        !!provisionedLogin.payload?.loginChallengeId,
      `requiresFirstLogin=${provisionedLogin.payload?.requiresFirstLogin}`
    );
    const provisionedFirstLogin = await addCheck(
      "Provisioned user completes first login password change",
      "POST",
      "/auth/first-login",
      {
        body: {
          loginChallengeId: provisionedLogin.payload?.loginChallengeId,
          role: "mahasiswa",
          newPassword: "Task93newpass!",
        },
      }
    );
    assertPass(
      "Provisioned first login creates active session",
      !!provisionedFirstLogin.payload?.accessToken &&
        provisionedFirstLogin.payload?.user?.passwordStatus === "active" &&
        provisionedFirstLogin.payload?.user?.forceChangeOnLogin === false,
      `status=${provisionedFirstLogin.payload?.user?.passwordStatus || "-"}; force=${provisionedFirstLogin.payload?.user?.forceChangeOnLogin}`
    );
    const activatedMe = await addCheck("Activated user /auth/me opens profile session", "GET", "/auth/me", {
      token: provisionedFirstLogin.payload?.accessToken,
    });
    assertPass(
      "Activated profile session maps to provisioned user",
      activatedMe.payload?.user?.identifier === provisionedIdentifier &&
        activatedMe.payload?.user?.name === "Task 93 Updated User" &&
        activatedMe.payload?.user?.passwordStatus === "active",
      `identifier=${activatedMe.payload?.user?.identifier || "-"}; status=${activatedMe.payload?.user?.passwordStatus || "-"}`
    );
    const profileUpdate = await addCheck(
      "Activated user updates profile contact",
      "PATCH",
      "/auth/profile",
      {
        token: provisionedFirstLogin.payload?.accessToken,
        body: {
          email: updatedEmail,
          phone: "081234567890",
          address: "Jl. Profil Standalone No. 90",
          gender: "Laki-laki",
          birthDate: "2002-02-20",
          programStudi: "S1 Farmasi",
          angkatan: "2022",
          kelas: "FA-22-90",
          skemaTA: "Skripsi",
          jenisTA: "Penelitian",
        },
      }
    );
    assertPass(
      "Profile update response is persistent user",
      profileUpdate.payload?.user?.email === updatedEmail &&
        profileUpdate.payload?.user?.phone === "081234567890" &&
        profileUpdate.payload?.user?.address === "Jl. Profil Standalone No. 90" &&
        profileUpdate.payload?.user?.birthDate === "2002-02-20" &&
        profileUpdate.payload?.user?.programStudi === "S1 Farmasi" &&
        profileUpdate.payload?.user?.kelas === "FA-22-90",
      `email=${profileUpdate.payload?.user?.email || "-"}; phone=${profileUpdate.payload?.user?.phone || "-"}`
    );
    const profileReload = await addCheck("Reloaded /auth/profile keeps contact", "GET", "/auth/profile", {
      token: provisionedFirstLogin.payload?.accessToken,
    });
    assertPass(
      "Profile contact persisted after reload",
        profileReload.payload?.user?.email === updatedEmail &&
        profileReload.payload?.user?.phone === "081234567890" &&
        profileReload.payload?.user?.address === "Jl. Profil Standalone No. 90" &&
        profileReload.payload?.user?.kelas === "FA-22-90",
      `email=${profileReload.payload?.user?.email || "-"}; phone=${profileReload.payload?.user?.phone || "-"}`
    );
    const adminUsersAfterProfile = await addCheck("Admin review sees updated profile fields", "GET", "/admin/users", {
      token: admin.accessToken,
    });
    const reviewedProfile = adminUsersAfterProfile.payload?.data?.find(
      (user) => user.identifier === provisionedIdentifier
    );
    assertPass(
      "Admin profile review includes role-specific fields",
      reviewedProfile?.email === updatedEmail &&
        reviewedProfile?.phone === "081234567890" &&
        reviewedProfile?.kelas === "FA-22-90",
      `email=${reviewedProfile?.email || "-"}; kelas=${reviewedProfile?.kelas || "-"}`
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
