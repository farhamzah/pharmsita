import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawn } from "node:child_process";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const port = process.env.FINAL_PROJECT_SMOKE_PORT || process.env.PORT || "4103";
const apiPrefix = process.env.API_PREFIX || "/api/v1";
const apiBaseUrl = (process.env.API_BASE_URL || `http://localhost:${port}${apiPrefix}`).replace(/\/$/, "");
const demoPassword = process.env.API_SMOKE_PASSWORD || "demo";
const shouldStartServer = process.env.FINAL_PROJECT_SMOKE_SKIP_SERVER !== "1" && !process.env.API_BASE_URL;
const serverPath = path.join(rootDir, "backend", "dist", "server.js");
const databaseFile =
  process.env.FINAL_PROJECT_SMOKE_DATABASE_FILE ||
  path.join(os.tmpdir(), `pharmsita-final-project-${Date.now()}.json`);

const checks = [];

const summarize = (value) => {
  if (!value || typeof value !== "object") return "";
  if (Array.isArray(value.data)) return `items=${value.data.length}`;
  if (value.data?.status) return `status=${value.data.status}`;
  if (value.data?.id) return `id=${value.data.id}`;
  if (value.user?.role) return `role=${value.user.role}`;
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

const login = async (identifier, expectedRole) => {
  const result = await addCheck(`Login ${identifier}`, "POST", "/auth/login", {
    body: { identifier, password: demoPassword },
  });
  const token = result.payload?.accessToken || "";
  const role = result.payload?.user?.role;

  assertPass(
    `Auth role ${identifier}`,
    result.ok && role === expectedRole && !!token,
    role || "-"
  );

  return token;
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
  console.log(`Final project registration smoke target: ${apiBaseUrl}`);
  console.log(`Final project registration database file: ${databaseFile}`);

  let serverHandle = null;

  try {
    serverHandle = await startServer();
    await waitForHealth(serverHandle);

    const studentToken = await login("mahasiswa", "mahasiswa");
    const coordinatorToken = await login("kordinator", "koordinator");
    const adminToken = await login("admin", "admin");

    const initial = await addCheck(
      "Student active registration empty",
      "GET",
      "/students/me/final-project-registration",
      { token: studentToken }
    );
    assertPass("Initial registration null", initial.payload?.data === null);

    const draft = await addCheck(
      "Student save draft registration",
      "POST",
      "/students/me/final-project-registration",
      {
        token: studentToken,
        expectedStatus: 201,
        body: {
          requirementDriveLink: "",
          thesisTypeName: "Draft Jenis TA",
          judulTA: "Draft Judul",
          submit: false,
        },
      }
    );
    assertPass("Draft status", draft.payload?.data?.status === "Draft", draft.payload?.data?.status || "-");

    const submitted = await addCheck(
      "Student submit registration",
      "POST",
      "/students/me/final-project-registration",
      {
        token: studentToken,
        body: {
          requirementDriveLink: "https://drive.google.com/drive/folders/final-project-smoke",
          paymentProofLink: "https://drive.google.com/file/d/payment-smoke",
          skema: "Skripsi",
          thesisTypeId: "thesis_type_01",
          judulTA: "Formulasi dan Evaluasi Sediaan Gel Ekstrak Daun Sirih",
          deskripsiTA: "Rencana penelitian final project smoke test.",
          requestedSupervisor1Id: "usr_dosen_01",
          submit: true,
        },
      }
    );
    const registrationId = submitted.payload?.data?.id || "";
    assertPass(
      "Submitted status",
      submitted.payload?.data?.status === "Menunggu Validasi Koordinator" && !!registrationId,
      submitted.payload?.data?.status || "-"
    );

    const list = await addCheck(
      "Coordinator list waiting registrations",
      "GET",
      `/coordinator/final-project-registrations?status=${encodeURIComponent("Menunggu Validasi Koordinator")}`,
      { token: coordinatorToken }
    );
    assertPass(
      "Coordinator list contains registration",
      list.payload?.data?.some((item) => item.id === registrationId),
      `items=${list.payload?.data?.length || 0}`
    );

    await addCheck(
      "Coordinator detail registration",
      "GET",
      `/coordinator/final-project-registrations/${registrationId}`,
      { token: coordinatorToken }
    );

    const approved = await addCheck(
      "Coordinator approve registration",
      "PATCH",
      `/coordinator/final-project-registrations/${registrationId}/validation`,
      {
        token: coordinatorToken,
        body: {
          status: "Disetujui",
          pembimbing1Id: "usr_dosen_01",
          pembimbing2Id: "usr_multi_01",
          catatanKoordinator: "Final project smoke approved.",
        },
      }
    );
    assertPass(
      "Approved assignment count",
      approved.payload?.data?.status === "Disetujui" &&
        approved.payload?.data?.supervisorAssignments?.length === 2,
      `assignments=${approved.payload?.data?.supervisorAssignments?.length || 0}`
    );

    const progress = await addCheck(
      "Coordinator progress completed",
      "GET",
      "/coordinator/students/usr_mhs_01/progress",
      { token: coordinatorToken }
    );
    const registrationStep = progress.payload?.data?.find((step) => step.id === "pendaftaran-ta");
    assertPass(
      "Registration progress completed",
      registrationStep?.status === "completed",
      registrationStep?.status || "-"
    );

    const audit = await addCheck("Admin audit logs", "GET", "/admin/audit-logs?limit=50", {
      token: adminToken,
    });
    assertPass(
      "Final project audit recorded",
      audit.payload?.data?.some(
        (entry) => entry.action === "COORDINATOR_FINAL_PROJECT_REGISTRATION_VALIDATED"
      ),
      `items=${audit.payload?.data?.length || 0}`
    );
  } finally {
    if (serverHandle) {
      await serverHandle.stop();
    }
  }

  console.table(checks);

  const failed = checks.filter((check) => check.result !== "PASS");
  if (failed.length > 0) {
    console.error(`Final project registration smoke failed: ${failed.length} check(s) failed.`);
    process.exitCode = 1;
    return;
  }

  console.log(`Final project registration smoke passed: ${checks.length} checks.`);
};

main().catch((error) => {
  if (checks.length > 0) {
    console.table(checks);
  }
  console.error(error instanceof Error ? error.message || error.stack : String(error));
  process.exitCode = 1;
});
