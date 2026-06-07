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
  admin: "00000000-0000-4000-8000-000000000003",
  coordinator: "00000000-0000-4000-8000-000000000004",
  lecturer2: "00000000-0000-4000-8000-000000000005",
  academicPeriod: "00000000-0000-4000-8000-000000000101",
  thesisType: "00000000-0000-4000-8000-000000000201",
};

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
      headers: Object.fromEntries(response.headers.entries()),
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
        DELETE FROM audit_export_attempts
        WHERE actor_id = ANY($1::uuid[])
      `,
      [[demoIds.admin, demoIds.coordinator]]
    );
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
    await pool.query(
      `
        DELETE FROM guidance_workflows
        WHERE student_id = $1
      `,
      [demoIds.student]
    );
    await pool.query(
      `
        DELETE FROM exams
        WHERE student_id = $1
      `,
      [demoIds.student]
    );
    await pool.query(
      `
        DELETE FROM revision_workflows
        WHERE student_id = $1
      `,
      [demoIds.student]
    );
    addResult("Reset demo final project data", "reset", "reset", true);
  } finally {
    await pool.end();
  }
};

const seedSensitiveAuditLog = async () => {
  const pool = new Pool({
    connectionString: databaseUrl,
    ssl: databaseSsl ? { rejectUnauthorized: false } : undefined,
  });

  try {
    await pool.query(
      `
        INSERT INTO audit_logs (
          id,
          actor_id,
          actor_role,
          action,
          resource_type,
          resource_id,
          before_payload,
          after_payload,
          reason,
          created_at
        )
        VALUES (
          '00000000-0000-4000-8000-000000000711',
          NULL,
          'admin',
          'TASK71_SENSITIVE_EXPORT_REDACTION',
          'task71-sensitive-export',
          'task71',
          $1::jsonb,
          $2::jsonb,
          'Task 71 redaction seed.',
          NOW()
        )
        ON CONFLICT (id) DO UPDATE SET
          before_payload = EXCLUDED.before_payload,
          after_payload = EXCLUDED.after_payload,
          created_at = EXCLUDED.created_at
      `,
      [
        JSON.stringify({
          passwordStatus: "needs_activation",
          nested: {
            refreshToken: "raw-refresh-token",
            safeField: "visible",
          },
        }),
        JSON.stringify({
          accessToken: "raw-access-token",
          tokenHash: "raw-token-hash",
          profile: {
            passwordChangedAt: "2026-06-07T00:00:00.000Z",
          },
        }),
      ]
    );
    addResult("Seed sensitive audit export fixture", "seeded", "seeded", true);
  } finally {
    await pool.end();
  }
};

const readAuditExportAttemptSummary = async (actorId, scope) => {
  const pool = new Pool({
    connectionString: databaseUrl,
    ssl: databaseSsl ? { rejectUnauthorized: false } : undefined,
  });

  try {
    const result = await pool.query(
      `
        SELECT
          COUNT(*)::int AS total,
          COUNT(*) FILTER (WHERE allowed = TRUE)::int AS allowed,
          COUNT(*) FILTER (WHERE allowed = FALSE)::int AS blocked,
          MAX(attempts_in_window)::int AS max_attempts_in_window
        FROM audit_export_attempts
        WHERE actor_id = $1
          AND scope = $2
      `,
      [actorId, scope]
    );
    return result.rows[0] || {
      total: 0,
      allowed: 0,
      blocked: 0,
      max_attempts_in_window: 0,
    };
  } finally {
    await pool.end();
  }
};

const seedAuditExportCleanupFixture = async () => {
  const pool = new Pool({
    connectionString: databaseUrl,
    ssl: databaseSsl ? { rejectUnauthorized: false } : undefined,
  });

  try {
    await pool.query(
      `
        INSERT INTO audit_export_attempts (
          id,
          actor_id,
          actor_role,
          scope,
          attempted_at,
          allowed,
          window_started_at,
          attempts_in_window,
          max_attempts,
          window_seconds
        )
        VALUES
          (
            '00000000-0000-4000-8000-000000000781',
            $1,
            'admin',
            'admin',
            NOW() - INTERVAL '45 days',
            TRUE,
            NOW() - INTERVAL '45 days',
            1,
            5,
            60
          ),
          (
            '00000000-0000-4000-8000-000000000782',
            $1,
            'admin',
            'admin',
            NOW() - INTERVAL '120 days',
            FALSE,
            NOW() - INTERVAL '120 days',
            6,
            5,
            60
          ),
          (
            '00000000-0000-4000-8000-000000000783',
            $1,
            'admin',
            'admin',
            NOW() - INTERVAL '5 days',
            TRUE,
            NOW() - INTERVAL '5 days',
            1,
            5,
            60
          )
        ON CONFLICT (id) DO UPDATE SET
          attempted_at = EXCLUDED.attempted_at,
          allowed = EXCLUDED.allowed,
          window_started_at = EXCLUDED.window_started_at,
          attempts_in_window = EXCLUDED.attempts_in_window
      `,
      [demoIds.admin]
    );
    addResult("Seed audit export cleanup fixture", "seeded", "seeded", true);
  } finally {
    await pool.end();
  }
};

const readAuditExportAttemptIds = async () => {
  const pool = new Pool({
    connectionString: databaseUrl,
    ssl: databaseSsl ? { rejectUnauthorized: false } : undefined,
  });

  try {
    const result = await pool.query(
      `
        SELECT id
        FROM audit_export_attempts
        WHERE id IN (
          '00000000-0000-4000-8000-000000000781',
          '00000000-0000-4000-8000-000000000782',
          '00000000-0000-4000-8000-000000000783'
        )
      `
    );
    return new Set(result.rows.map((row) => row.id));
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
    const lecturerToken = await login("dosen", "dosen");
    const coordinatorToken = await login("kordinator", "koordinator");
    const adminToken = await login("admin", "admin");

    const lecturerDirectory = await addCheck(
      "Lecturer list PostgreSQL student directory",
      "GET",
      "/lecturer/students",
      { token: lecturerToken }
    );
    const lecturerDirectoryStudent = lecturerDirectory.payload?.data?.find(
      (item) => item.id === demoIds.student
    );
    assertPass(
      "Lecturer directory uses real student UUID",
      lecturerDirectoryStudent?.id === demoIds.student &&
        uuidPattern.test(lecturerDirectoryStudent.id) &&
        lecturerDirectoryStudent.nim === "220110001",
      lecturerDirectoryStudent
        ? `${lecturerDirectoryStudent.id}; nim=${lecturerDirectoryStudent.nim}; step=${lecturerDirectoryStudent.activeStepId}`
        : "-"
    );

    const coordinatorDirectory = await addCheck(
      "Coordinator list PostgreSQL student directory",
      "GET",
      "/coordinator/students",
      { token: coordinatorToken }
    );
    const coordinatorDirectoryStudent = coordinatorDirectory.payload?.data?.find(
      (item) => item.id === demoIds.student
    );
    assertPass(
      "Coordinator directory hydrates workflow step",
      coordinatorDirectoryStudent?.id === demoIds.student &&
        coordinatorDirectoryStudent.activeStepId === "pendaftaran-ta" &&
        coordinatorDirectoryStudent.activeStepLabel === "Pendaftaran TA",
      coordinatorDirectoryStudent
        ? `${coordinatorDirectoryStudent.id}; step=${coordinatorDirectoryStudent.activeStepId}`
        : "-"
    );

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

    const lecturerGuidance = await addCheck(
      "Lecturer get PostgreSQL guidance",
      "GET",
      `/lecturer/students/${demoIds.student}/guidance/bimbingan-pra-proposal`,
      { token: lecturerToken }
    );
    assertPass(
      "Guidance default sessions seeded",
      lecturerGuidance.payload?.data?.sessions?.length === 8 &&
        lecturerGuidance.payload?.data?.sessions?.[0]?.status === "in progress",
      `sessions=${lecturerGuidance.payload?.data?.sessions?.length || 0}`
    );

    const requestedGuidance = await addCheck(
      "Student request PostgreSQL guidance",
      "POST",
      "/students/me/guidance/bimbingan-pra-proposal/request",
      {
        token: studentToken,
        body: { note: "Task 46 PostgreSQL guidance request." },
      }
    );
    assertPass(
      "Guidance request persisted",
      requestedGuidance.payload?.data?.guidanceStatus === "requested" &&
        requestedGuidance.payload?.data?.guidanceNote ===
          "Task 46 PostgreSQL guidance request.",
      requestedGuidance.payload?.data?.guidanceStatus || "-"
    );

    const approvedGuidance = await addCheck(
      "Lecturer approve PostgreSQL guidance request",
      "PATCH",
      `/lecturer/students/${demoIds.student}/guidance/bimbingan-pra-proposal/request`,
      {
        token: lecturerToken,
        body: {
          startDate: "2026-06-20",
          startTime: "09:30",
          approvalNote: "Task 46 guidance approved.",
        },
      }
    );
    assertPass(
      "Guidance approval persisted",
      approvedGuidance.payload?.data?.guidanceStatus === "approved" &&
        approvedGuidance.payload?.data?.guidanceStartDate === "2026-06-20" &&
        approvedGuidance.payload?.data?.guidanceTime === "09:30",
      `${approvedGuidance.payload?.data?.guidanceStatus || "-"}; ${approvedGuidance.payload?.data?.guidanceTime || "-"}`
    );

    const guidanceWithChat = await addCheck(
      "Student add PostgreSQL guidance chat",
      "POST",
      "/students/me/guidance/bimbingan-pra-proposal/sessions/1/chats",
      {
        token: studentToken,
        body: {
          senderName: "Dimas Indra Jaya",
          senderRole: "mahasiswa",
          message: "Task 46 chat dari mahasiswa.",
        },
      }
    );
    const firstGuidanceChat = guidanceWithChat.payload?.data?.sessions?.[0]?.chats?.[0];
    assertPass(
      "Guidance chat persisted as UUID",
      firstGuidanceChat?.message === "Task 46 chat dari mahasiswa." &&
        uuidPattern.test(firstGuidanceChat?.id || ""),
      firstGuidanceChat?.id || "-"
    );

    const approvedGuidanceSession = await addCheck(
      "Lecturer approve PostgreSQL guidance session",
      "PATCH",
      `/lecturer/students/${demoIds.student}/guidance/bimbingan-pra-proposal/sessions/1/approval`,
      {
        token: lecturerToken,
        body: {
          startDate: "2026-06-21",
          startTime: "10:00",
        },
      }
    );
    assertPass(
      "Guidance session approval persisted",
      approvedGuidanceSession.payload?.data?.sessions?.[0]?.sessionStatus === "approved" &&
        approvedGuidanceSession.payload?.data?.sessions?.[0]?.sessionStartDate ===
          "2026-06-21" &&
        approvedGuidanceSession.payload?.data?.sessions?.[0]?.sessionStartTime === "10:00",
      approvedGuidanceSession.payload?.data?.sessions?.[0]?.sessionStatus || "-"
    );

    const coordinatorGuidance = await addCheck(
      "Coordinator get persisted PostgreSQL guidance",
      "GET",
      `/coordinator/students/${demoIds.student}/guidance/bimbingan-pra-proposal`,
      { token: coordinatorToken }
    );
    assertPass(
      "Coordinator guidance sees persisted chat",
      coordinatorGuidance.payload?.data?.sessions?.[0]?.chats?.some(
        (chat) => chat.message === "Task 46 chat dari mahasiswa."
      ),
      `chats=${coordinatorGuidance.payload?.data?.sessions?.[0]?.chats?.length || 0}`
    );

    const lecturerExam = await addCheck(
      "Lecturer get PostgreSQL exam",
      "GET",
      `/lecturer/students/${demoIds.student}/exams/sidang`,
      { token: lecturerToken }
    );
    assertPass(
      "Exam default data seeded",
      lecturerExam.payload?.data?.requirements?.length === 2 &&
        lecturerExam.payload?.data?.panelists?.length === 3 &&
        lecturerExam.payload?.data?.schedule?.tanggal === "2026-06-16",
      `requirements=${lecturerExam.payload?.data?.requirements?.length || 0}; panelists=${lecturerExam.payload?.data?.panelists?.length || 0}`
    );

    const examWithDocsLink = await addCheck(
      "Student update PostgreSQL exam docs link",
      "PATCH",
      "/students/me/exams/sidang/docs-link",
      {
        token: studentToken,
        body: { link: "https://docs.google.com/document/d/task47-exam/edit" },
      }
    );
    assertPass(
      "Exam docs link persisted",
      examWithDocsLink.payload?.data?.googleDocsLink ===
        "https://docs.google.com/document/d/task47-exam/edit",
      examWithDocsLink.payload?.data?.googleDocsLink || "-"
    );

    const examWithRequirementToggle = await addCheck(
      "Student toggle PostgreSQL exam requirement",
      "PATCH",
      "/students/me/exams/sidang/requirements/toggle",
      {
        token: studentToken,
        body: { requirementId: "req_exam_01" },
      }
    );
    assertPass(
      "Exam requirement toggle persisted",
      examWithRequirementToggle.payload?.data?.requirements?.find(
        (item) => item.id === "req_exam_01"
      )?.fulfilled === false,
      String(
        examWithRequirementToggle.payload?.data?.requirements?.find(
          (item) => item.id === "req_exam_01"
        )?.fulfilled
      )
    );

    const examWithPanelistToggle = await addCheck(
      "Student toggle PostgreSQL exam panelist",
      "PATCH",
      "/students/me/exams/sidang/panelists/toggle",
      {
        token: studentToken,
        body: { panelistId: "panel_02" },
      }
    );
    assertPass(
      "Exam panelist toggle persisted",
      examWithPanelistToggle.payload?.data?.panelists?.find(
        (item) => item.id === "panel_02"
      )?.approved === false,
      String(
        examWithPanelistToggle.payload?.data?.panelists?.find(
          (item) => item.id === "panel_02"
        )?.approved
      )
    );

    const coordinatorExamStatus = await addCheck(
      "Coordinator update PostgreSQL exam status",
      "PATCH",
      `/coordinator/students/${demoIds.student}/exams/sidang/status`,
      {
        token: coordinatorToken,
        body: { status: "menunggu-jadwal" },
      }
    );
    assertPass(
      "Exam status persisted",
      coordinatorExamStatus.payload?.data?.status === "menunggu-jadwal",
      coordinatorExamStatus.payload?.data?.status || "-"
    );

    const lecturerExamAssessment = await addCheck(
      "Lecturer update PostgreSQL exam assessment",
      "PATCH",
      `/lecturer/students/${demoIds.student}/exams/sidang/assessment`,
      {
        token: lecturerToken,
        body: {
          grade: "A",
          resultStatus: "lulus-dengan-revisi",
        },
      }
    );
    assertPass(
      "Exam assessment persisted",
      lecturerExamAssessment.payload?.data?.status === "selesai" &&
        lecturerExamAssessment.payload?.data?.grade === "A" &&
        lecturerExamAssessment.payload?.data?.revisionNotes?.length === 2,
      `${lecturerExamAssessment.payload?.data?.status || "-"}; grade=${lecturerExamAssessment.payload?.data?.grade || "-"}`
    );

    const coordinatorExam = await addCheck(
      "Coordinator get persisted PostgreSQL exam",
      "GET",
      `/coordinator/students/${demoIds.student}/exams/sidang`,
      { token: coordinatorToken }
    );
    assertPass(
      "Coordinator exam sees persisted state",
      coordinatorExam.payload?.data?.googleDocsLink ===
        "https://docs.google.com/document/d/task47-exam/edit" &&
        coordinatorExam.payload?.data?.requirements?.find(
          (item) => item.id === "req_exam_01"
        )?.fulfilled === false &&
        coordinatorExam.payload?.data?.panelists?.find((item) => item.id === "panel_02")
          ?.approved === false &&
        coordinatorExam.payload?.data?.schedule?.waktu === "09:00 - 11:00",
      `status=${coordinatorExam.payload?.data?.status || "-"}; schedule=${coordinatorExam.payload?.data?.schedule?.waktu || "-"}`
    );

    const lecturerRevision = await addCheck(
      "Lecturer get PostgreSQL revision",
      "GET",
      `/lecturer/students/${demoIds.student}/revisions/revisi-sidang`,
      { token: lecturerToken }
    );
    assertPass(
      "Revision default items seeded",
      lecturerRevision.payload?.data?.items?.length === 2 &&
        lecturerRevision.payload?.data?.ketuaSidangStatus === "pending",
      `items=${lecturerRevision.payload?.data?.items?.length || 0}; chair=${lecturerRevision.payload?.data?.ketuaSidangStatus || "-"}`
    );

    const revisionSubmission = await addCheck(
      "Student submit PostgreSQL revision resolution",
      "POST",
      "/students/me/revisions/revisi-sidang/items/1/submission",
      {
        token: studentToken,
        body: {
          penyelesaian: "Task 48 penyelesaian revisi Bab 1.",
          penyelesaianLink: "https://drive.google.com/file/d/task48-revisi",
        },
      }
    );
    assertPass(
      "Revision resolution persisted",
      revisionSubmission.payload?.data?.items?.[0]?.status === "in progress" &&
        revisionSubmission.payload?.data?.items?.[0]?.penyelesaian ===
          "Task 48 penyelesaian revisi Bab 1." &&
        !!revisionSubmission.payload?.data?.submittedAt,
      revisionSubmission.payload?.data?.items?.[0]?.status || "-"
    );

    const revisionWithChat = await addCheck(
      "Student add PostgreSQL revision chat",
      "POST",
      "/students/me/revisions/revisi-sidang/items/1/chats",
      {
        token: studentToken,
        body: {
          senderName: "Dimas Indra Jaya",
          senderRole: "mahasiswa",
          message: "Task 48 chat revisi.",
        },
      }
    );
    const firstRevisionChat = revisionWithChat.payload?.data?.items?.[0]?.chats?.[0];
    assertPass(
      "Revision chat persisted as UUID",
      firstRevisionChat?.message === "Task 48 chat revisi." &&
        uuidPattern.test(firstRevisionChat?.id || ""),
      firstRevisionChat?.id || "-"
    );

    const revisionItemDone = await addCheck(
      "Lecturer update PostgreSQL revision item status",
      "PATCH",
      `/lecturer/students/${demoIds.student}/revisions/revisi-sidang/items/1/status`,
      {
        token: lecturerToken,
        body: { status: "done" },
      }
    );
    assertPass(
      "Revision item status persisted",
      revisionItemDone.payload?.data?.items?.[0]?.status === "done",
      revisionItemDone.payload?.data?.items?.[0]?.status || "-"
    );

    const revisionApproval1 = await addCheck(
      "Lecturer approve PostgreSQL revision penguji1",
      "PATCH",
      `/lecturer/students/${demoIds.student}/revisions/revisi-sidang/approval`,
      {
        token: lecturerToken,
        body: { role: "penguji1", status: true },
      }
    );
    assertPass(
      "Revision penguji1 approval persisted",
      revisionApproval1.payload?.data?.penguji1Approved === true,
      String(revisionApproval1.payload?.data?.penguji1Approved)
    );

    const revisionChairApproval = await addCheck(
      "Lecturer approve PostgreSQL revision chair",
      "PATCH",
      `/lecturer/students/${demoIds.student}/revisions/revisi-sidang/approval`,
      {
        token: lecturerToken,
        body: { role: "ketua-sidang", status: "approved" },
      }
    );
    assertPass(
      "Revision chair approval persisted",
      revisionChairApproval.payload?.data?.ketuaSidangStatus === "approved",
      revisionChairApproval.payload?.data?.ketuaSidangStatus || "-"
    );

    const lecturerBlockedGate = await addCheck(
      "Lecturer read blocked PostgreSQL revision completion gate",
      "GET",
      `/lecturer/students/${demoIds.student}/revisions/revisi-sidang/completion-gate`,
      { token: lecturerToken }
    );
    assertPass(
      "Revision completion gate exposes blocking reasons",
      lecturerBlockedGate.payload?.data?.readyForFinalUpload === false &&
        lecturerBlockedGate.payload?.data?.readyForProgressCompletion === false &&
        lecturerBlockedGate.payload?.data?.checks?.some(
          (check) => check.code === "PENGUJI_2_APPROVED" && check.passed === false
        ),
      `final=${String(lecturerBlockedGate.payload?.data?.readyForFinalUpload)}; progress=${String(lecturerBlockedGate.payload?.data?.readyForProgressCompletion)}`
    );

    const blockedRevisionFinalFile = await addCheck(
      "Student blocked from early PostgreSQL revision final file",
      "POST",
      "/students/me/revisions/revisi-sidang/final-file",
      {
        token: studentToken,
        expectedStatus: 409,
        body: { fileName: "task61-too-early-final-revisi.pdf" },
      }
    );
    assertPass(
      "Revision final file gate rejects incomplete workflow",
      blockedRevisionFinalFile.payload?.error?.code === "CONFLICT" &&
        blockedRevisionFinalFile.payload?.error?.details?.completionGate?.readyForFinalUpload === false &&
        Array.isArray(blockedRevisionFinalFile.payload?.error?.details?.completionGate?.finalUploadBlockingReasons),
      blockedRevisionFinalFile.payload?.error?.code || "-"
    );

    const blockedCoordinatorRevisionProgress = await addCheck(
      "Coordinator blocked from early PostgreSQL revision progress completion",
      "PATCH",
      `/coordinator/students/${demoIds.student}/progress/revisi-sidang`,
      {
        token: coordinatorToken,
        expectedStatus: 409,
        body: { status: "completed" },
      }
    );
    assertPass(
      "Coordinator revision progress gate rejects incomplete workflow",
      blockedCoordinatorRevisionProgress.payload?.error?.code === "CONFLICT" &&
        blockedCoordinatorRevisionProgress.payload?.error?.details?.completionGate?.readyForProgressCompletion === false &&
        blockedCoordinatorRevisionProgress.payload?.error?.details?.completionGate?.progressCompletionBlockingReasons?.includes(
          "Dokumen final hasil revisi belum diunggah."
        ),
      blockedCoordinatorRevisionProgress.payload?.error?.code || "-"
    );

    const revisionItem2Done = await addCheck(
      "Lecturer update PostgreSQL second revision item status",
      "PATCH",
      `/lecturer/students/${demoIds.student}/revisions/revisi-sidang/items/2/status`,
      {
        token: lecturerToken,
        body: { status: "done" },
      }
    );
    assertPass(
      "Second revision item status persisted",
      revisionItem2Done.payload?.data?.items?.[1]?.status === "done",
      revisionItem2Done.payload?.data?.items?.[1]?.status || "-"
    );

    const revisionApproval2 = await addCheck(
      "Lecturer approve PostgreSQL revision penguji2",
      "PATCH",
      `/lecturer/students/${demoIds.student}/revisions/revisi-sidang/approval`,
      {
        token: lecturerToken,
        body: { role: "penguji2", status: true },
      }
    );
    assertPass(
      "Revision penguji2 approval persisted",
      revisionApproval2.payload?.data?.penguji2Approved === true,
      String(revisionApproval2.payload?.data?.penguji2Approved)
    );

    const revisionFinalFile = await addCheck(
      "Student upload PostgreSQL revision final file",
      "POST",
      "/students/me/revisions/revisi-sidang/final-file",
      {
        token: studentToken,
        body: { fileName: "task48-final-revisi.pdf" },
      }
    );
    assertPass(
      "Revision final file persisted",
      revisionFinalFile.payload?.data?.finalFile === "task48-final-revisi.pdf" &&
        !!revisionFinalFile.payload?.data?.submittedAt,
      revisionFinalFile.payload?.data?.finalFile || "-"
    );

    const studentReadyGate = await addCheck(
      "Student read ready PostgreSQL revision completion gate",
      "GET",
      "/students/me/revisions/revisi-sidang/completion-gate",
      { token: studentToken }
    );
    assertPass(
      "Revision completion gate ready after final file",
      studentReadyGate.payload?.data?.readyForFinalUpload === true &&
        studentReadyGate.payload?.data?.readyForProgressCompletion === true &&
        studentReadyGate.payload?.data?.finalFile === "task48-final-revisi.pdf",
      `final=${String(studentReadyGate.payload?.data?.readyForFinalUpload)}; progress=${String(studentReadyGate.payload?.data?.readyForProgressCompletion)}`
    );

    const completedCoordinatorRevisionProgress = await addCheck(
      "Coordinator complete PostgreSQL revision progress after final file",
      "PATCH",
      `/coordinator/students/${demoIds.student}/progress/revisi-sidang`,
      {
        token: coordinatorToken,
        body: { status: "completed" },
      }
    );
    const completedRevisionStep = completedCoordinatorRevisionProgress.payload?.data?.find(
      (step) => step.id === "revisi-sidang"
    );
    assertPass(
      "Coordinator revision progress gate allows completed workflow",
      completedRevisionStep?.status === "completed",
      completedRevisionStep?.status || "-"
    );

    const coordinatorRevision = await addCheck(
      "Coordinator get persisted PostgreSQL revision",
      "GET",
      `/coordinator/students/${demoIds.student}/revisions/revisi-sidang`,
      { token: coordinatorToken }
    );
    assertPass(
      "Coordinator revision sees persisted state",
      coordinatorRevision.payload?.data?.finalFile === "task48-final-revisi.pdf" &&
        coordinatorRevision.payload?.data?.ketuaSidangStatus === "approved" &&
        coordinatorRevision.payload?.data?.items?.[0]?.status === "done" &&
        coordinatorRevision.payload?.data?.items?.[0]?.chats?.some(
          (chat) => chat.message === "Task 48 chat revisi."
        ),
      `file=${coordinatorRevision.payload?.data?.finalFile || "-"}; chair=${coordinatorRevision.payload?.data?.ketuaSidangStatus || "-"}`
    );

    const coordinatorReadyGate = await addCheck(
      "Coordinator read ready PostgreSQL revision completion gate",
      "GET",
      `/coordinator/students/${demoIds.student}/revisions/revisi-sidang/completion-gate`,
      { token: coordinatorToken }
    );
    assertPass(
      "Coordinator completion gate contract remains ready",
      coordinatorReadyGate.payload?.data?.readyForProgressCompletion === true &&
        coordinatorReadyGate.payload?.data?.checks?.some(
          (check) => check.code === "FINAL_FILE_UPLOADED" && check.passed === true
        ),
      `progress=${String(coordinatorReadyGate.payload?.data?.readyForProgressCompletion)}`
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

    const guidanceRequest = await addCheck(
      "Student submit guidance request aggregate",
      "POST",
      "/students/me/guidance-requests",
      {
        token: studentToken,
        body: {
          guidanceType: "seminar-proposal",
          googleDocsLink: "https://docs.google.com/document/d/task56-guidance/edit",
          studentNote: "Task 56 aggregate guidance request.",
        },
      }
    );
    const guidanceRequestId = guidanceRequest.payload?.data?.id || "";
    assertPass(
      "Guidance request aggregate persisted",
      guidanceRequest.payload?.data?.status === "Menunggu Validasi Dosen" &&
        guidanceRequest.payload?.data?.guidanceType === "seminar-proposal" &&
        guidanceRequest.payload?.data?.googleDocsLink ===
          "https://docs.google.com/document/d/task56-guidance/edit" &&
        uuidPattern.test(guidanceRequestId),
      `id=${guidanceRequestId || "-"}; status=${guidanceRequest.payload?.data?.status || "-"}`
    );

    const lecturerGuidanceRequests = await addCheck(
      "Lecturer list guidance request aggregate",
      "GET",
      "/lecturer/guidance-requests",
      { token: lecturerToken }
    );
    assertPass(
      "Lecturer sees assigned guidance request",
      lecturerGuidanceRequests.payload?.data?.some(
        (item) => item.id === guidanceRequestId
      ),
      `items=${lecturerGuidanceRequests.payload?.data?.length || 0}`
    );

    const guidanceValidation = await addCheck(
      "Lecturer validate guidance request aggregate",
      "PATCH",
      `/lecturer/guidance-requests/${guidanceRequestId}/validation`,
      {
        token: lecturerToken,
        body: {
          status: "Disetujui",
          catatanDosen: "Task 56 request approved.",
        },
      }
    );
    assertPass(
      "Guidance request validation persisted",
      guidanceValidation.payload?.data?.status === "Disetujui" &&
        guidanceValidation.payload?.data?.lecturerNote ===
          "Task 56 request approved.",
      guidanceValidation.payload?.data?.status || "-"
    );

    const guidanceMaterial = await addCheck(
      "Student submit guidance material aggregate",
      "POST",
      `/students/me/guidance-requests/${guidanceRequestId}/materials`,
      {
        token: studentToken,
        expectedStatus: 201,
        body: {
          topic: "Task 56 Materi Bimbingan 1",
          content: "Materi diskusi seminar proposal untuk smoke test.",
        },
      }
    );
    const guidanceMaterialId = guidanceMaterial.payload?.data?.id || "";
    assertPass(
      "Guidance material persisted",
      guidanceMaterial.payload?.data?.status === "Diajukan" &&
        guidanceMaterial.payload?.data?.attemptNumber === 1 &&
        uuidPattern.test(guidanceMaterialId),
      `id=${guidanceMaterialId || "-"}; status=${guidanceMaterial.payload?.data?.status || "-"}`
    );

    const invalidGuidanceMaterialValidation = await addCheck(
      "Lecturer reject guidance material without note",
      "PATCH",
      `/lecturer/guidance-requests/${guidanceRequestId}/materials/${guidanceMaterialId}/validation`,
      {
        token: lecturerToken,
        expectedStatus: 422,
        body: {
          status: "Ditolak",
        },
      }
    );
    assertPass(
      "Guidance material reject note enforced",
      invalidGuidanceMaterialValidation.payload?.error?.code === "VALIDATION_ERROR",
      invalidGuidanceMaterialValidation.payload?.error?.code || "-"
    );

    const guidanceMaterialValidation = await addCheck(
      "Lecturer validate guidance material aggregate",
      "PATCH",
      `/lecturer/guidance-requests/${guidanceRequestId}/materials/${guidanceMaterialId}/validation`,
      {
        token: lecturerToken,
        body: {
          status: "Valid",
          catatanDosen: "Task 56 material valid.",
        },
      }
    );
    assertPass(
      "Guidance material validation persisted",
      guidanceMaterialValidation.payload?.data?.status === "Valid" &&
        guidanceMaterialValidation.payload?.data?.lecturerNote ===
          "Task 56 material valid.",
      guidanceMaterialValidation.payload?.data?.status || "-"
    );

    const guidanceDetail = await addCheck(
      "Student get guidance request aggregate detail",
      "GET",
      `/students/me/guidance-requests/${guidanceRequestId}`,
      { token: studentToken }
    );
    assertPass(
      "Guidance request aggregate summary persisted",
      guidanceDetail.payload?.data?.materialSummary?.validCount === 1 &&
        guidanceDetail.payload?.data?.materialSummary?.requiredValidCount === 8 &&
        guidanceDetail.payload?.data?.materials?.some(
          (item) => item.id === guidanceMaterialId && item.status === "Valid"
        ),
      `valid=${guidanceDetail.payload?.data?.materialSummary?.validCount || 0}`
    );

    const coordinatorGuidanceDetail = await addCheck(
      "Coordinator get guidance request aggregate detail",
      "GET",
      `/coordinator/students/${demoIds.student}/guidance-requests/${guidanceRequestId}`,
      { token: coordinatorToken }
    );
    assertPass(
      "Coordinator sees guidance aggregate material summary",
      coordinatorGuidanceDetail.payload?.data?.materialSummary?.validCount === 1 &&
        coordinatorGuidanceDetail.payload?.data?.studentId === demoIds.student,
      `valid=${coordinatorGuidanceDetail.payload?.data?.materialSummary?.validCount || 0}`
    );

    const coordinatorLecturers = await addCheck(
      "Coordinator list PostgreSQL lecturer directory",
      "GET",
      "/coordinator/lecturers",
      { token: coordinatorToken }
    );
    assertPass(
      "Lecturer directory exposes quota counts",
      coordinatorLecturers.payload?.data?.some(
        (item) =>
          item.id === demoIds.lecturer1 &&
          item.nidn === "221011401065" &&
          typeof item.p1Active === "number"
      ) &&
        coordinatorLecturers.payload?.data?.some((item) => item.id === demoIds.lecturer2),
      `items=${coordinatorLecturers.payload?.data?.length || 0}`
    );

    const updatedLecturerQuota = await addCheck(
      "Coordinator update PostgreSQL lecturer quota",
      "PATCH",
      `/coordinator/lecturers/${demoIds.lecturer1}/quota`,
      {
        token: coordinatorToken,
        body: {
          quotaLimit: 9,
        },
      }
    );
    assertPass(
      "Lecturer quota update response persisted",
      updatedLecturerQuota.payload?.data?.id === demoIds.lecturer1 &&
        updatedLecturerQuota.payload?.data?.quotaLimit === 9,
      `quota=${updatedLecturerQuota.payload?.data?.quotaLimit || "-"}`
    );

    const coordinatorLecturersAfterQuota = await addCheck(
      "Coordinator list PostgreSQL lecturer directory after quota update",
      "GET",
      "/coordinator/lecturers",
      { token: coordinatorToken }
    );
    assertPass(
      "Lecturer directory reflects updated quota",
      coordinatorLecturersAfterQuota.payload?.data?.find(
        (item) => item.id === demoIds.lecturer1
      )?.quotaLimit === 9,
      `quota=${
        coordinatorLecturersAfterQuota.payload?.data?.find(
          (item) => item.id === demoIds.lecturer1
        )?.quotaLimit || "-"
      }`
    );

    const updatedAssignments = await addCheck(
      "Coordinator update PostgreSQL supervisor assignments",
      "PATCH",
      `/coordinator/students/${demoIds.student}/supervisor-assignments`,
      {
        token: coordinatorToken,
        body: {
          pembimbing1Id: demoIds.lecturer2,
          pembimbing2Id: demoIds.lecturer1,
          coordinatorNote: "Task 51 swap pembimbing smoke.",
        },
      }
    );
    const assignmentOrders = updatedAssignments.payload?.data?.supervisorAssignments || [];
    assertPass(
      "Supervisor assignment swap persisted",
      assignmentOrders.find((item) => item.supervisorOrder === 1)?.lecturerId ===
        demoIds.lecturer2 &&
        assignmentOrders.find((item) => item.supervisorOrder === 2)?.lecturerId ===
          demoIds.lecturer1,
      assignmentOrders
        .map((item) => `${item.supervisorOrder}:${item.lecturerId}`)
        .join(",")
    );

    const directoryAfterAssignment = await addCheck(
      "Coordinator student directory after supervisor assignment update",
      "GET",
      "/coordinator/students",
      { token: coordinatorToken }
    );
    const assignedStudent = directoryAfterAssignment.payload?.data?.find(
      (item) => item.id === demoIds.student
    );
    assertPass(
      "Student directory reflects updated supervisors",
      assignedStudent?.supervisor1Id === demoIds.lecturer2 &&
        assignedStudent?.supervisor2Id === demoIds.lecturer1,
      assignedStudent
        ? `p1=${assignedStudent.supervisor1Id}; p2=${assignedStudent.supervisor2Id}`
        : "-"
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

    const audit = await addCheck("Admin audit logs", "GET", "/admin/audit-logs?limit=100", {
      token: adminToken,
    });
    assertPass(
      "Final project audit recorded",
      audit.payload?.data?.some(
        (entry) => entry.action === "COORDINATOR_FINAL_PROJECT_REGISTRATION_VALIDATED"
      ),
      `items=${audit.payload?.data?.length || 0}`
    );
      assertPass(
        "Revision completion gate audit recorded",
        audit.payload?.data?.some((entry) => entry.action === "REVISION_COMPLETION_GATE_READ") &&
          audit.payload?.data?.some((entry) => entry.action === "REVISION_COMPLETION_GATE_BLOCKED") &&
          audit.payload?.data?.some((entry) => entry.action === "REVISION_COMPLETION_GATE_ALLOWED"),
        `items=${audit.payload?.data?.length || 0}`
      );
      await seedSensitiveAuditLog();
      const adminGateAudit = await addCheck(
      "Admin filter revision completion gate audit logs",
      "GET",
      "/admin/audit-logs?limit=20&resourceType=revision-completion-gate&action=REVISION_COMPLETION_GATE_BLOCKED",
      { token: adminToken }
    );
    assertPass(
      "Admin audit filter returns blocked gate events",
      adminGateAudit.payload?.data?.length > 0 &&
        adminGateAudit.payload.data.every(
          (entry) =>
            entry.resourceType === "revision-completion-gate" &&
            entry.action === "REVISION_COMPLETION_GATE_BLOCKED"
        ),
      `items=${adminGateAudit.payload?.data?.length || 0}`
    );
    const pagedAdminGateAudit = await addCheck(
      "Admin paginates and date-filters revision completion gate audit logs",
      "GET",
      "/admin/audit-logs?limit=1&offset=1&resourceType=revision-completion-gate&createdFrom=2026-01-01T00:00:00.000Z&createdTo=2099-12-31T23:59:59.999Z",
      { token: adminToken }
    );
    assertPass(
      "Admin audit pagination returns bounded gate events",
      pagedAdminGateAudit.payload?.data?.length <= 1 &&
        Number.isInteger(pagedAdminGateAudit.payload?.meta?.total) &&
        pagedAdminGateAudit.payload?.meta?.limit === 1 &&
        pagedAdminGateAudit.payload?.meta?.offset === 1 &&
        typeof pagedAdminGateAudit.payload?.meta?.hasMore === "boolean" &&
        pagedAdminGateAudit.payload?.data?.every(
          (entry) =>
            entry.resourceType === "revision-completion-gate" &&
            entry.createdAt >= "2026-01-01T00:00:00.000Z"
        ),
      `items=${pagedAdminGateAudit.payload?.data?.length || 0}; total=${pagedAdminGateAudit.payload?.meta?.total ?? "-"}`
    );
    const adminGateAuditCsv = await addCheck(
      "Admin exports revision completion gate audit CSV",
      "GET",
      "/admin/audit-logs/export.csv?resourceType=revision-completion-gate&limit=500",
      { token: adminToken }
    );
      assertPass(
        "Admin audit CSV contains gate columns and events",
        typeof adminGateAuditCsv.payload === "string" &&
          adminGateAuditCsv.payload.includes("createdAt") &&
          adminGateAuditCsv.payload.includes("REVISION_COMPLETION_GATE"),
        typeof adminGateAuditCsv.payload === "string"
          ? `chars=${adminGateAuditCsv.payload.length}`
          : "-"
      );
      assertPass(
        "Admin audit CSV filename follows policy",
        /^attachment; filename="completion-gate-audit-admin-\d{4}-\d{2}-\d{2}\.csv"$/.test(
          adminGateAuditCsv.headers?.["content-disposition"] || ""
        ),
        adminGateAuditCsv.headers?.["content-disposition"] || "-"
      );
      const adminUsersAuditCsv = await addCheck(
        "Admin exports sensitive audit CSV with redaction",
        "GET",
        "/admin/audit-logs/export.csv?resourceType=task71-sensitive-export&action=TASK71_SENSITIVE_EXPORT_REDACTION",
        { token: adminToken }
      );
      assertPass(
        "Admin sensitive audit CSV redacts payload values",
        typeof adminUsersAuditCsv.payload === "string" &&
          adminUsersAuditCsv.payload.includes("[REDACTED]") &&
          adminUsersAuditCsv.payload.includes("visible") &&
          !adminUsersAuditCsv.payload.includes("needs_activation") &&
          !adminUsersAuditCsv.payload.includes("raw-refresh-token") &&
          !adminUsersAuditCsv.payload.includes("raw-access-token") &&
          !adminUsersAuditCsv.payload.includes("raw-token-hash") &&
          !adminUsersAuditCsv.payload.includes("2026-06-07T00:00:00.000Z"),
        typeof adminUsersAuditCsv.payload === "string"
          ? `chars=${adminUsersAuditCsv.payload.length}`
          : "-"
      );
      const adminAuditExportEvents = await addCheck(
        "Admin reads audit export event records",
        "GET",
        "/admin/audit-logs?resourceType=audit-export&resourceId=admin&action=AUDIT_LOGS_EXPORTED&limit=5",
        { token: adminToken }
      );
      assertPass(
        "Admin audit export event recorded with filter and row count",
        adminAuditExportEvents.payload?.data?.some(
          (entry) =>
            entry.actorRole === "admin" &&
            entry.after?.scope === "admin" &&
            typeof entry.after?.rowCount === "number" &&
            entry.after?.filename?.startsWith("completion-gate-audit-admin-") &&
            entry.after?.filter?.limit === 500
        ),
        `items=${adminAuditExportEvents.payload?.data?.length || 0}`
      );
      for (let exportIndex = 1; exportIndex <= 3; exportIndex += 1) {
        await addCheck(
          `Admin audit export guard warmup ${exportIndex}`,
          "GET",
          "/admin/audit-logs/export.csv?resourceType=task71-sensitive-export&action=TASK71_SENSITIVE_EXPORT_REDACTION",
          { token: adminToken }
        );
      }
      const adminExportRateLimited = await addCheck(
        "Admin audit export abuse guard rate limits repeated CSV exports",
        "GET",
        "/admin/audit-logs/export.csv?resourceType=task71-sensitive-export&action=TASK71_SENSITIVE_EXPORT_REDACTION",
        { token: adminToken, expectedStatus: 429 }
      );
      assertPass(
        "Admin audit export abuse guard returns 429",
        adminExportRateLimited.payload?.error?.code === "TOO_MANY_REQUESTS",
        adminExportRateLimited.payload?.error?.code || "-"
      );
      const adminExportAttemptSummary = await readAuditExportAttemptSummary(
        demoIds.admin,
        "admin"
      );
      assertPass(
        "Admin audit export guard persists allowed and blocked attempts",
        Number(adminExportAttemptSummary.allowed) === 5 &&
          Number(adminExportAttemptSummary.blocked) >= 1 &&
          Number(adminExportAttemptSummary.max_attempts_in_window) >= 6,
        `allowed=${adminExportAttemptSummary.allowed}; blocked=${adminExportAttemptSummary.blocked}; maxWindow=${adminExportAttemptSummary.max_attempts_in_window}`
      );
      const adminExportAttemptMonitoring = await addCheck(
        "Admin reads audit export attempt monitoring",
        "GET",
        "/admin/audit-export-attempts?scope=admin&limit=10",
        { token: adminToken }
      );
      assertPass(
        "Admin audit export attempt monitoring exposes allowed and blocked summary",
        Number(adminExportAttemptMonitoring.payload?.meta?.summary?.allowed) === 5 &&
          Number(adminExportAttemptMonitoring.payload?.meta?.summary?.blocked) >= 1 &&
          adminExportAttemptMonitoring.payload?.data?.some(
            (entry) => entry.scope === "admin" && entry.allowed === false
        ),
        `allowed=${adminExportAttemptMonitoring.payload?.meta?.summary?.allowed ?? "-"}; blocked=${adminExportAttemptMonitoring.payload?.meta?.summary?.blocked ?? "-"}`
      );
      const cleanupStatus = await addCheck(
        "Admin reads audit export cleanup scheduler status",
        "GET",
        "/admin/audit-export-attempts/cleanup/status",
        { token: adminToken }
      );
      assertPass(
        "Audit export cleanup scheduler status exposes disabled default and config",
        cleanupStatus.payload?.data?.enabled === false &&
          cleanupStatus.payload?.data?.repositoryMode === "postgres" &&
          cleanupStatus.payload?.data?.retention?.allowedDays === 30 &&
          cleanupStatus.payload?.data?.retention?.blockedDays === 90 &&
          cleanupStatus.payload?.data?.batchSize === 1000,
        `enabled=${cleanupStatus.payload?.data?.enabled}; mode=${cleanupStatus.payload?.data?.repositoryMode}; batch=${cleanupStatus.payload?.data?.batchSize}`
      );
      await seedAuditExportCleanupFixture();
      const cleanupDryRun = await addCheck(
        "Admin dry-runs audit export attempt cleanup",
        "POST",
        "/admin/audit-export-attempts/cleanup",
        {
          token: adminToken,
          body: {
            dryRun: true,
            allowedRetentionDays: 30,
            blockedRetentionDays: 90,
            limit: 10,
          },
        }
      );
      assertPass(
        "Audit export attempt cleanup dry run estimates old attempts",
        cleanupDryRun.payload?.data?.dryRun === true &&
          cleanupDryRun.payload?.data?.deletedAllowed === 1 &&
          cleanupDryRun.payload?.data?.deletedBlocked === 1,
        `allowed=${cleanupDryRun.payload?.data?.deletedAllowed ?? "-"}; blocked=${cleanupDryRun.payload?.data?.deletedBlocked ?? "-"}`
      );
      const cleanupFixtureAfterDryRun = await readAuditExportAttemptIds();
      assertPass(
        "Audit export attempt cleanup dry run keeps data",
        cleanupFixtureAfterDryRun.has("00000000-0000-4000-8000-000000000781") &&
          cleanupFixtureAfterDryRun.has("00000000-0000-4000-8000-000000000782") &&
          cleanupFixtureAfterDryRun.has("00000000-0000-4000-8000-000000000783"),
        `items=${cleanupFixtureAfterDryRun.size}`
      );
      const cleanupRun = await addCheck(
        "Admin executes audit export attempt cleanup",
        "POST",
        "/admin/audit-export-attempts/cleanup",
        {
          token: adminToken,
          body: {
            dryRun: false,
            allowedRetentionDays: 30,
            blockedRetentionDays: 90,
            limit: 10,
          },
        }
      );
      assertPass(
        "Audit export attempt cleanup deletes only old attempts",
        cleanupRun.payload?.data?.dryRun === false &&
          cleanupRun.payload?.data?.deletedAllowed === 1 &&
          cleanupRun.payload?.data?.deletedBlocked === 1,
        `allowed=${cleanupRun.payload?.data?.deletedAllowed ?? "-"}; blocked=${cleanupRun.payload?.data?.deletedBlocked ?? "-"}`
      );
      const cleanupFixtureAfterRun = await readAuditExportAttemptIds();
      assertPass(
        "Audit export attempt cleanup preserves new attempts",
        !cleanupFixtureAfterRun.has("00000000-0000-4000-8000-000000000781") &&
          !cleanupFixtureAfterRun.has("00000000-0000-4000-8000-000000000782") &&
          cleanupFixtureAfterRun.has("00000000-0000-4000-8000-000000000783"),
        `items=${cleanupFixtureAfterRun.size}`
      );
      const cleanupAudit = await addCheck(
        "Admin reads audit export cleanup event",
        "GET",
        "/admin/audit-logs?resourceType=audit-export-attempt&action=AUDIT_EXPORT_ATTEMPTS_CLEANED&limit=5",
        { token: adminToken }
      );
      assertPass(
        "Audit export attempt cleanup records audit event",
        cleanupAudit.payload?.data?.some(
          (entry) =>
            entry.action === "AUDIT_EXPORT_ATTEMPTS_CLEANED" &&
            entry.after?.deletedAllowed === 1 &&
            entry.after?.deletedBlocked === 1 &&
            entry.after?.dryRun === false
        ),
        `items=${cleanupAudit.payload?.data?.length || 0}`
      );
      const studentCleanupDenied = await addCheck(
        "Student cannot cleanup audit export attempts",
        "POST",
        "/admin/audit-export-attempts/cleanup",
        {
          token: studentToken,
          expectedStatus: 403,
          body: { dryRun: true },
        }
      );
      assertPass(
        "Audit export attempt cleanup rejects student role",
        studentCleanupDenied.payload?.error?.code === "FORBIDDEN",
        studentCleanupDenied.payload?.error?.code || "-"
      );
      const studentCleanupStatusDenied = await addCheck(
        "Student cannot read audit export cleanup scheduler status",
        "GET",
        "/admin/audit-export-attempts/cleanup/status",
        { token: studentToken, expectedStatus: 403 }
      );
      assertPass(
        "Audit export cleanup scheduler status rejects student role",
        studentCleanupStatusDenied.payload?.error?.code === "FORBIDDEN",
        studentCleanupStatusDenied.payload?.error?.code || "-"
      );
      const studentAdminCsvDenied = await addCheck(
        "Student cannot export admin audit CSV",
        "GET",
        "/admin/audit-logs/export.csv?resourceType=revision-completion-gate",
        { token: studentToken, expectedStatus: 403 }
      );
      assertPass(
        "Admin audit CSV rejects student role",
        studentAdminCsvDenied.payload?.error?.code === "FORBIDDEN",
        studentAdminCsvDenied.payload?.error?.code || "-"
      );
      const coordinatorAdminCsvDenied = await addCheck(
        "Coordinator cannot export admin audit CSV",
        "GET",
        "/admin/audit-logs/export.csv?resourceType=revision-completion-gate",
        { token: coordinatorToken, expectedStatus: 403 }
      );
      assertPass(
        "Admin audit CSV rejects coordinator role",
        coordinatorAdminCsvDenied.payload?.error?.code === "FORBIDDEN",
        coordinatorAdminCsvDenied.payload?.error?.code || "-"
      );

      const coordinatorGateAudit = await addCheck(
      "Coordinator reads revision completion gate audit logs",
      "GET",
      `/coordinator/audit-logs/revision-completion-gates?limit=20&studentId=${demoIds.student}&stageId=revisi-sidang`,
      { token: coordinatorToken }
    );
    assertPass(
      "Coordinator audit visibility scoped to revision gate",
      coordinatorGateAudit.payload?.data?.length > 0 &&
        coordinatorGateAudit.payload.data.every(
          (entry) =>
            entry.resourceType === "revision-completion-gate" &&
            entry.resourceId === `${demoIds.student}:revisi-sidang`
          ),
      `items=${coordinatorGateAudit.payload?.data?.length || 0}`
    );
    const coordinatorPagedGateAudit = await addCheck(
      "Coordinator paginates and date-filters revision completion gate audit logs",
      "GET",
      `/coordinator/audit-logs/revision-completion-gates?limit=1&offset=0&studentId=${demoIds.student}&stageId=revisi-sidang&createdFrom=2026-01-01T00:00:00.000Z&createdTo=2099-12-31T23:59:59.999Z`,
      { token: coordinatorToken }
    );
    assertPass(
      "Coordinator audit pagination remains student scoped",
      coordinatorPagedGateAudit.payload?.data?.length <= 1 &&
        Number.isInteger(coordinatorPagedGateAudit.payload?.meta?.total) &&
        coordinatorPagedGateAudit.payload?.meta?.limit === 1 &&
        coordinatorPagedGateAudit.payload?.meta?.offset === 0 &&
        typeof coordinatorPagedGateAudit.payload?.meta?.hasMore === "boolean" &&
        coordinatorPagedGateAudit.payload?.data?.every(
          (entry) =>
            entry.resourceType === "revision-completion-gate" &&
            entry.resourceId === `${demoIds.student}:revisi-sidang` &&
            entry.createdAt >= "2026-01-01T00:00:00.000Z"
        ),
      `items=${coordinatorPagedGateAudit.payload?.data?.length || 0}; total=${coordinatorPagedGateAudit.payload?.meta?.total ?? "-"}`
    );
    const coordinatorGateAuditCsv = await addCheck(
      "Coordinator exports revision completion gate audit CSV",
      "GET",
      `/coordinator/audit-logs/revision-completion-gates/export.csv?studentId=${demoIds.student}&stageId=revisi-sidang`,
      { token: coordinatorToken }
    );
      assertPass(
        "Coordinator audit CSV remains student scoped",
        typeof coordinatorGateAuditCsv.payload === "string" &&
          coordinatorGateAuditCsv.payload.includes("createdAt") &&
          coordinatorGateAuditCsv.payload.includes(`${demoIds.student}:revisi-sidang`),
        typeof coordinatorGateAuditCsv.payload === "string"
          ? `chars=${coordinatorGateAuditCsv.payload.length}`
          : "-"
      );
      assertPass(
        "Coordinator audit CSV filename follows policy",
        /^attachment; filename="completion-gate-audit-koordinator-\d{4}-\d{2}-\d{2}\.csv"$/.test(
          coordinatorGateAuditCsv.headers?.["content-disposition"] || ""
        ),
        coordinatorGateAuditCsv.headers?.["content-disposition"] || "-"
      );
      const coordinatorAuditExportEvents = await addCheck(
        "Admin reads coordinator audit export event records",
        "GET",
        "/admin/audit-logs?resourceType=audit-export&resourceId=koordinator&action=AUDIT_LOGS_EXPORTED&limit=5",
        { token: adminToken }
      );
      assertPass(
        "Coordinator audit export event recorded with scoped filter",
        coordinatorAuditExportEvents.payload?.data?.some(
          (entry) =>
            entry.actorRole === "koordinator" &&
            entry.after?.scope === "koordinator" &&
            entry.after?.filter?.resourceType === "revision-completion-gate" &&
            entry.after?.filter?.resourceId === `${demoIds.student}:revisi-sidang` &&
            entry.after?.filename?.startsWith("completion-gate-audit-koordinator-")
        ),
        `items=${coordinatorAuditExportEvents.payload?.data?.length || 0}`
      );
      const lecturerCoordinatorCsvDenied = await addCheck(
        "Lecturer cannot export coordinator audit CSV",
        "GET",
        `/coordinator/audit-logs/revision-completion-gates/export.csv?studentId=${demoIds.student}&stageId=revisi-sidang`,
        { token: lecturerToken, expectedStatus: 403 }
      );
      assertPass(
        "Coordinator audit CSV rejects lecturer role",
        lecturerCoordinatorCsvDenied.payload?.error?.code === "FORBIDDEN",
        lecturerCoordinatorCsvDenied.payload?.error?.code || "-"
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
