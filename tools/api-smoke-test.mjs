const apiBaseUrl = (process.env.API_BASE_URL || "http://localhost:4000/api/v1").replace(/\/$/, "");
const demoPassword = process.env.API_SMOKE_PASSWORD || "demo";
const studentId = process.env.API_SMOKE_STUDENT_ID || "1";

const checks = [];

const summarize = (value) => {
  if (!value || typeof value !== "object") return "";
  if (Array.isArray(value.data)) return `items=${value.data.length}`;
  if (value.data && typeof value.data === "object") {
    if (Array.isArray(value.data.requirements)) {
      return `requirements=${value.data.requirements.length}`;
    }
    if (Array.isArray(value.data.items)) return `items=${value.data.items.length}`;
    if (value.data.status) return `status=${value.data.status}`;
    if (value.data.resultStatus) return `result=${value.data.resultStatus}`;
  }
  if (value.user?.role) return `role=${value.user.role}`;
  if (value.status) return `status=${value.status}`;
  return "";
};

const request = async (method, path, { token, body, expectedStatus = 200 } = {}) => {
  const headers = {
    Accept: "application/json",
  };

  if (token) headers.Authorization = `Bearer ${token}`;
  if (body !== undefined) headers["Content-Type"] = "application/json";

  let response;
  let payload = null;

  try {
    response = await fetch(`${apiBaseUrl}${path}`, {
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

const addCheck = async (name, method, path, options) => {
  const result = await request(method, path, options);
  checks.push({
    name,
    expected: result.expectedStatus,
    actual: result.status,
    result: result.ok ? "PASS" : "FAIL",
    detail: result.detail,
  });
  return result;
};

const addAssertion = (name, passed, detail = "") => {
  checks.push({
    name,
    expected: "PASS",
    actual: passed ? "PASS" : "FAIL",
    result: passed ? "PASS" : "FAIL",
    detail,
  });
};

const login = async (identifier, expectedRole) => {
  const result = await addCheck(`Login ${identifier}/${demoPassword}`, "POST", "/auth/login", {
    body: { identifier, password: demoPassword },
  });

  const role = result.payload?.user?.role;
  const roleOk = result.ok && role === expectedRole && !!result.payload?.accessToken;
  checks.push({
    name: `Auth role ${identifier}`,
    expected: expectedRole,
    actual: role || "-",
    result: roleOk ? "PASS" : "FAIL",
    detail: result.payload?.accessToken ? "accessToken present" : "accessToken missing",
  });

  return result.payload?.accessToken || "";
};

const main = async () => {
  console.log(`API smoke test target: ${apiBaseUrl}`);

  await addCheck("Health check", "GET", "/health");

  const dosenToken = await login("dosen", "dosen");
  await addCheck("Dosen GET lecturer progress", "GET", `/lecturer/students/${studentId}/progress`, {
    token: dosenToken,
  });
  await addCheck(
    "Dosen PATCH guidance approval",
    "PATCH",
    `/lecturer/students/${studentId}/guidance/bimbingan-pra-proposal/approval`,
    {
      token: dosenToken,
      body: { pembimbingNum: 1, approved: true },
    }
  );
  await addCheck(
    "Dosen PATCH exam assessment",
    "PATCH",
    `/lecturer/students/${studentId}/exams/sidang/assessment`,
    {
      token: dosenToken,
      body: { grade: "A", resultStatus: "lulus-dengan-revisi" },
    }
  );
  await addCheck(
    "Dosen PATCH revision item",
    "PATCH",
    `/lecturer/students/${studentId}/revisions/revisi-sidang/items/1/status`,
    {
      token: dosenToken,
      body: { status: "done" },
    }
  );
  await addCheck(
    "Dosen forbidden coordinator progress",
    "PATCH",
    `/coordinator/students/${studentId}/progress/sidang`,
    {
      token: dosenToken,
      body: { status: "completed" },
      expectedStatus: 403,
    }
  );

  const coordinatorToken = await login("kordinator", "koordinator");
  await addCheck("Koordinator GET progress", "GET", `/coordinator/students/${studentId}/progress`, {
    token: coordinatorToken,
  });
  await addCheck(
    "Koordinator PATCH progress",
    "PATCH",
    `/coordinator/students/${studentId}/progress/bimbingan-pra-proposal`,
    {
      token: coordinatorToken,
      body: { status: "completed" },
    }
  );
  const isolatedProgress = await addCheck(
    "Koordinator GET isolated progress student 2",
    "GET",
    "/coordinator/students/2/progress",
    { token: coordinatorToken }
  );
  const isolatedStep = isolatedProgress.payload?.data?.find(
    (step) => step.id === "bimbingan-pra-proposal"
  );
  addAssertion(
    "Student workflow isolation",
    isolatedStep?.status === "pending",
    `student2.bimbingan-pra-proposal=${isolatedStep?.status || "-"}`
  );

  const requirements = await addCheck(
    "Koordinator GET initial requirements",
    "GET",
    `/coordinator/students/${studentId}/requirements/initial`,
    { token: coordinatorToken }
  );
  await addCheck(
    "Koordinator PUT initial requirements",
    "PUT",
    `/coordinator/students/${studentId}/requirements/initial`,
    {
      token: coordinatorToken,
      body: requirements.payload?.data || { driveLink: "", requirements: [] },
    }
  );
  await addCheck(
    "Koordinator PUT stage requirements",
    "PUT",
    `/coordinator/students/${studentId}/requirements/stages/bimbingan-pra-proposal`,
    {
      token: coordinatorToken,
      body: {
        driveLink: "https://drive.google.com/qa-api-smoke",
        requirements: [
          {
            id: "qa-stage-req-1",
            label: "QA stage requirement",
            status: "Valid",
            wajib: true,
            catatanKoordinator: "API smoke test valid",
          },
        ],
      },
    }
  );
  await addCheck(
    "Koordinator PUT thesis submissions",
    "PUT",
    `/coordinator/students/${studentId}/thesis-submissions`,
    {
      token: coordinatorToken,
      body: [
        {
          id: "sub_1",
          date: "10 Mei 2026",
          skema: "Skripsi",
          jenisTA: "Penelitian Reguler",
          judulTA: "Formulasi dan Evaluasi Karakteristik Fisikokimia Sediaan Gel Ekstrak Daun Kelor",
          deskripsiTA: "Penelitian ini berfokus pada formulasi sediaan gel menggunakan ekstrak daun kelor.",
          pembimbing1: "Dr. Apt. Rina Marlina, M.Farm.",
          pembimbing2: "Dr. Apt. Budi Santoso, M.Si. (Ditentukan Koordinator)",
          status: "Diterima",
          catatanKoordinator: "API smoke test diterima",
          buktiFile: "bukti_kwitansi_pembayaran_ta.pdf",
        },
      ],
    }
  );
  await addCheck(
    "Koordinator PATCH exam status",
    "PATCH",
    `/coordinator/students/${studentId}/exams/sidang/status`,
    {
      token: coordinatorToken,
      body: { status: "terjadwal" },
    }
  );
  await addCheck("Alias kordinator GET progress", "GET", `/kordinator/students/${studentId}/progress`, {
    token: coordinatorToken,
  });
  await addCheck(
    "Koordinator forbidden lecturer assessment",
    "PATCH",
    `/lecturer/students/${studentId}/exams/sidang/assessment`,
    {
      token: coordinatorToken,
      body: { grade: "B", resultStatus: "lulus" },
      expectedStatus: 403,
    }
  );

  console.table(checks);

  const failed = checks.filter((check) => check.result !== "PASS");
  if (failed.length > 0) {
    console.error(`API smoke test failed: ${failed.length} check(s) failed.`);
    process.exitCode = 1;
    return;
  }

  console.log(`API smoke test passed: ${checks.length} checks.`);
};

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
