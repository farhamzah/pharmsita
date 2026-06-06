import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawn } from "node:child_process";
import pg from "pg";

const { Pool } = pg;

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const databaseUrl = process.env.DATABASE_URL;
const port = process.env.POSTGRES_FINAL_PROJECT_SMOKE_PORT || process.env.PORT || "4104";
const apiPrefix = process.env.API_PREFIX || "/api/v1";
const apiBaseUrl = (process.env.API_BASE_URL || `http://localhost:${port}${apiPrefix}`).replace(/\/$/, "");
const demoPassword = process.env.API_SMOKE_PASSWORD || "demo";
const shouldStartServer =
  process.env.POSTGRES_FINAL_PROJECT_SMOKE_SKIP_SERVER !== "1" && !process.env.API_BASE_URL;
const serverPath = path.join(rootDir, "backend", "dist", "server.js");
const databaseSsl = ["1", "true", "yes", "on"].includes(
  (process.env.DATABASE_SSL || "").toLowerCase()
);

const demoIds = {
  student: "00000000-0000-4000-8000-000000000001",
  lecturer1: "00000000-0000-4000-8000-000000000002",
  lecturer2: "00000000-0000-4000-8000-000000000005",
  academicPeriod: "00000000-0000-4000-8000-000000000101",
  thesisType: "00000000-0000-4000-8000-000000000201",
};

const sqlFiles = [
  path.join(rootDir, "backend", "database", "migrations", "001_auth_master_data.sql"),
  path.join(rootDir, "backend", "database", "migrations", "002_permissions_and_workflow.sql"),
  path.join(rootDir, "backend", "database", "migrations", "003_multi_role_first_login.sql"),
  path.join(rootDir, "backend", "database", "migrations", "004_final_project_registration.sql"),
  path.join(rootDir, "backend", "database", "seeds", "001_demo_auth.sql"),
  path.join(rootDir, "backend", "database", "seeds", "002_demo_master_data.sql"),
];

const checks = [];
const uuidPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

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

const formatError = (error) => {
  if (error instanceof AggregateError) {
    return error.errors
      .map((entry) => (entry instanceof Error ? entry.message || entry.stack : String(entry)))
      .join("\n");
  }

  return error instanceof Error ? error.message || error.stack || String(error) : String(error);
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

const applySqlFiles = async () => {
  if (!databaseUrl) {
    throw new Error("DATABASE_URL is required for PostgreSQL final project smoke test.");
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

    await pool.query(
      `
        DELETE FROM final_project_registrations
        WHERE student_id = $1
      `,
      [demoIds.student]
    );
    await pool.query(
      `
        DELETE FROM student_progress_steps
        WHERE student_id = $1
      `,
      [demoIds.student]
    );
    await pool.query(
      `
        DELETE FROM student_requirement_bundles
        WHERE student_id = $1
      `,
      [demoIds.student]
    );
    await pool.query(
      `
        DELETE FROM thesis_submissions
        WHERE student_id = $1
      `,
      [demoIds.student]
    );
    addResult("Reset demo final project data", "reset", "reset", true);
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
  console.log(`PostgreSQL final project smoke target: ${apiBaseUrl}`);

  let serverHandle = null;

  try {
    await applySqlFiles();
    serverHandle = await startServer();
    await waitForHealth(serverHandle);

    const studentToken = await login("mahasiswa", "mahasiswa");
    const coordinatorToken = await login("kordinator", "koordinator");
    const adminToken = await login("admin", "admin");

    const thesisTypes = await addCheck("Student list thesis types", "GET", "/master/thesis-types", {
      token: studentToken,
    });
    const thesisType = thesisTypes.payload?.data?.find((item) => item.id === demoIds.thesisType);
    assertPass(
      "Master thesis type UUID available",
      thesisType?.name === "Penelitian Reguler",
      thesisType?.name || "-"
    );

    const academicPeriods = await addCheck(
      "Student list academic periods",
      "GET",
      "/master/academic-periods",
      { token: studentToken }
    );
    assertPass(
      "Master academic period UUID available",
      academicPeriods.payload?.data?.some((item) => item.id === demoIds.academicPeriod),
      `items=${academicPeriods.payload?.data?.length || 0}`
    );

    const adminThesisTypes = await addCheck(
      "Admin list thesis types",
      "GET",
      "/admin/master/thesis-types",
      { token: adminToken }
    );
    const originalThesisTypes = Array.isArray(adminThesisTypes.payload?.data)
      ? adminThesisTypes.payload.data
      : [];
    const boundaryThesisTypeName = "Task 42 Boundary Non UUID";
    const replacedThesisTypes = await addCheck(
      "Admin replace thesis types with non UUID id",
      "PUT",
      "/admin/master/thesis-types",
      {
        token: adminToken,
        body: [
          ...originalThesisTypes,
          {
            id: "jta_task42_boundary",
            name: boundaryThesisTypeName,
            skema: "Skripsi",
            desc: "Boundary QA untuk ID non UUID dari UI admin.",
            status: "Aktif",
          },
        ],
      }
    );
    const generatedThesisType = replacedThesisTypes.payload?.data?.find(
      (item) => item.name === boundaryThesisTypeName
    );
    assertPass(
      "Admin non UUID thesis type persisted as UUID",
      generatedThesisType?.id &&
        generatedThesisType.id !== "jta_task42_boundary" &&
        uuidPattern.test(generatedThesisType.id),
      generatedThesisType?.id || "-"
    );

    const restoredThesisTypes = await addCheck(
      "Admin restore thesis types",
      "PUT",
      "/admin/master/thesis-types",
      {
        token: adminToken,
        body: originalThesisTypes,
      }
    );
    assertPass(
      "Admin thesis type restore preserved demo UUID",
      restoredThesisTypes.payload?.data?.some((item) => item.id === demoIds.thesisType) &&
        !restoredThesisTypes.payload?.data?.some((item) => item.name === boundaryThesisTypeName),
      `items=${restoredThesisTypes.payload?.data?.length || 0}`
    );

    const initialRequirements = await addCheck(
      "Student get PostgreSQL initial requirements",
      "GET",
      "/students/me/requirements/initial",
      { token: studentToken }
    );
    const initialRequirementItems = Array.isArray(initialRequirements.payload?.data?.requirements)
      ? initialRequirements.payload.data.requirements
      : [];
    assertPass(
      "Initial requirements seeded",
      initialRequirementItems.length >= 4,
      `requirements=${initialRequirementItems.length}`
    );

    const savedInitialRequirements = await addCheck(
      "Student save PostgreSQL initial requirements",
      "PUT",
      "/students/me/requirements/initial",
      {
        token: studentToken,
        body: {
          driveLink: "https://drive.google.com/drive/folders/task45-initial-requirements",
          requirements: initialRequirementItems.map((item, index) =>
            index === 0
              ? {
                  ...item,
                  status: "Menunggu Verifikasi",
                  catatanKoordinator: "Task 45 PostgreSQL smoke.",
                }
              : item
          ),
        },
      }
    );
    assertPass(
      "Initial requirements roundtrip",
      savedInitialRequirements.payload?.data?.driveLink ===
        "https://drive.google.com/drive/folders/task45-initial-requirements" &&
        savedInitialRequirements.payload?.data?.requirements?.[0]?.status ===
          "Menunggu Verifikasi",
      savedInitialRequirements.payload?.data?.requirements?.[0]?.status || "-"
    );

    const emptyThesisSubmissions = await addCheck(
      "Student get empty PostgreSQL thesis submissions",
      "GET",
      "/students/me/thesis-submissions",
      { token: studentToken }
    );
    assertPass(
      "Thesis submissions start empty after reset",
      Array.isArray(emptyThesisSubmissions.payload?.data) &&
        emptyThesisSubmissions.payload.data.length === 0,
      `items=${emptyThesisSubmissions.payload?.data?.length || 0}`
    );

    const savedThesisSubmissions = await addCheck(
      "Student replace PostgreSQL thesis submissions",
      "PUT",
      "/students/me/thesis-submissions",
      {
        token: studentToken,
        body: [
          {
            id: "sub_task45_boundary",
            date: "10 Mei 2026",
            skema: "Skripsi",
            jenisTA: "Penelitian Reguler",
            judulTA: "Task 45 Non UUID Boundary",
            deskripsiTA: "Boundary repository PostgreSQL untuk thesis submissions.",
            pembimbing1: "Dr. Budi Harto, M.Farm.",
            pembimbing2: "Ditentukan Koordinator",
            status: "Ditolak",
            catatanKoordinator: "Non UUID id should be stored as generated UUID.",
            buktiFile: "task45-boundary.pdf",
          },
          {
            id: "00000000-0000-4000-8000-000000004545",
            date: "11 Mei 2026",
            skema: "Skripsi",
            jenisTA: "Penelitian Reguler",
            judulTA: "Task 45 Pending UUID Boundary",
            deskripsiTA: "Boundary pending submission PostgreSQL smoke.",
            pembimbing1: "Dr. Budi Harto, M.Farm.",
            pembimbing2: "Ditentukan Koordinator",
            status: "Sedang Proses Validasi",
            buktiFile: "task45-pending.pdf",
          },
        ],
      }
    );
    const generatedSubmission = savedThesisSubmissions.payload?.data?.find(
      (item) => item.judulTA === "Task 45 Non UUID Boundary"
    );
    assertPass(
      "Non UUID thesis submission stored as UUID",
      generatedSubmission?.id &&
        generatedSubmission.id !== "sub_task45_boundary" &&
        uuidPattern.test(generatedSubmission.id),
      generatedSubmission?.id || "-"
    );

    const persistedThesisSubmissions = await addCheck(
      "Student persisted PostgreSQL thesis submissions",
      "GET",
      "/students/me/thesis-submissions",
      { token: studentToken }
    );
    assertPass(
      "Thesis submissions roundtrip",
      persistedThesisSubmissions.payload?.data?.length === 2 &&
        persistedThesisSubmissions.payload?.data?.some(
          (item) => item.id === "00000000-0000-4000-8000-000000004545"
        ),
      `items=${persistedThesisSubmissions.payload?.data?.length || 0}`
    );

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
          requirementDriveLink: "https://drive.google.com/drive/folders/postgres-final-project-smoke",
          paymentProofLink: "https://drive.google.com/file/d/postgres-payment-smoke",
          academicPeriodId: demoIds.academicPeriod,
          skema: "Skripsi",
          thesisTypeId: demoIds.thesisType,
          judulTA: "PostgreSQL Smoke Formulasi Gel Ekstrak Daun Sirih",
          deskripsiTA: "Rencana penelitian final project PostgreSQL smoke test.",
          requestedSupervisor1Id: demoIds.lecturer1,
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
    assertPass(
      "Submitted thesis type snapshot",
      submitted.payload?.data?.thesisTypeId === demoIds.thesisType &&
        submitted.payload?.data?.thesisTypeName === "Penelitian Reguler",
      submitted.payload?.data?.thesisTypeName || "-"
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

    const detail = await addCheck(
      "Coordinator detail registration",
      "GET",
      `/coordinator/final-project-registrations/${registrationId}`,
      { token: coordinatorToken }
    );
    assertPass(
      "Coordinator detail hydrated",
      detail.payload?.data?.id === registrationId &&
        Array.isArray(detail.payload?.data?.requirements) &&
        Array.isArray(detail.payload?.data?.supervisorAssignments),
      `id=${detail.payload?.data?.id || "-"}`
    );

    const approved = await addCheck(
      "Coordinator approve registration",
      "PATCH",
      `/coordinator/final-project-registrations/${registrationId}/validation`,
      {
        token: coordinatorToken,
        body: {
          status: "Disetujui",
          pembimbing1Id: demoIds.lecturer1,
          pembimbing2Id: demoIds.lecturer2,
          catatanKoordinator: "Final project PostgreSQL smoke approved.",
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
      `/coordinator/students/${demoIds.student}/progress`,
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
    console.error(`PostgreSQL final project smoke failed: ${failed.length} check(s) failed.`);
    process.exitCode = 1;
    return;
  }

  console.log(`PostgreSQL final project smoke passed: ${checks.length} checks.`);
};

main().catch((error) => {
  if (checks.length > 0) {
    console.table(checks);
  }
  console.error(formatError(error));
  process.exitCode = 1;
});
