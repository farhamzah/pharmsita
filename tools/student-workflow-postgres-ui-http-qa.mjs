import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawn } from "node:child_process";
import pg from "pg";

const { Pool } = pg;

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const databaseUrl = process.env.DATABASE_URL;
const apiPort = process.env.STUDENT_WORKFLOW_UI_QA_API_PORT || "4120";
const frontendPort = process.env.STUDENT_WORKFLOW_UI_QA_FRONTEND_PORT || "5176";
const cdpPort =
  process.env.STUDENT_WORKFLOW_UI_QA_CDP_PORT ||
  String(9400 + Math.floor(Math.random() * 500));
const apiPrefix = process.env.API_PREFIX || "/api/v1";
const apiBaseUrl = `http://127.0.0.1:${apiPort}${apiPrefix}`;
const frontendUrl = `http://127.0.0.1:${frontendPort}`;
const browserUserDataDir =
  process.env.STUDENT_WORKFLOW_UI_QA_BROWSER_DIR ||
  path.join(os.tmpdir(), `pharmsita-student-workflow-browser-${Date.now()}`);
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
  path.join(rootDir, "backend", "database", "migrations", "009_canonical_pharmsita_schema_boundary.sql"),
  path.join(rootDir, "backend", "database", "migrations", "010_canonical_read_models.sql"),
  path.join(rootDir, "backend", "database", "seeds", "001_demo_auth.sql"),
  path.join(rootDir, "backend", "database", "seeds", "002_demo_master_data.sql"),
];

const checks = [];

const addCheck = (name, passed, detail = "") => {
  checks.push({
    name,
    result: passed ? "PASS" : "FAIL",
    detail,
  });
};

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const waitFor = async (label, fn, timeoutMs = 25_000) => {
  const startedAt = Date.now();
  let lastError = null;

  while (Date.now() - startedAt < timeoutMs) {
    try {
      const result = await fn();
      if (result) return result;
    } catch (error) {
      lastError = error;
    }

    await sleep(300);
  }

  throw new Error(
    `${label} timed out.${lastError ? ` Last error: ${lastError.message}` : ""}`
  );
};

const request = async (method, url, { token, body, expectedStatus = 200 } = {}) => {
  const headers = { Accept: "application/json" };
  if (token) headers.Authorization = `Bearer ${token}`;
  if (body !== undefined) headers["Content-Type"] = "application/json";

  const response = await fetch(url, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const text = await response.text();
  const payload = text ? JSON.parse(text) : null;

  if (response.status !== expectedStatus) {
    throw new Error(
      `${method} ${url} expected ${expectedStatus}, got ${response.status}: ${text}`
    );
  }

  return payload;
};

const api = (pathName) => `${apiBaseUrl}${pathName}`;

const loginApi = async (identifier) => {
  const payload = await request("POST", api("/auth/login"), {
    body: { identifier, password: "demo" },
  });
  return payload.accessToken;
};

const applySqlFiles = async () => {
  if (!databaseUrl) {
    throw new Error("DATABASE_URL is required for PostgreSQL student workflow UI QA.");
  }

  const pool = new Pool({
    connectionString: databaseUrl,
    ssl: databaseSsl ? { rejectUnauthorized: false } : undefined,
  });

  try {
    for (const file of sqlFiles) {
      const sql = await fs.readFile(file, "utf8");
      await pool.query(sql);
      addCheck(`Apply ${path.relative(rootDir, file)}`, true);
    }

    await pool.query(
      `
        DELETE FROM guidance_materials
        WHERE submitted_by = $1
           OR guidance_workflow_id IN (
             SELECT id FROM guidance_workflows WHERE student_id = $1
           )
           OR guidance_request_id IN (
             SELECT id FROM guidance_requests WHERE submitted_by = $1
           )
      `,
      [demoIds.student]
    );
    await pool.query(
      `
        DELETE FROM guidance_requests
        WHERE submitted_by = $1
      `,
      [demoIds.student]
    );
    await pool.query(
      `
        DELETE FROM stage_submission_requirement_validations
        WHERE stage_submission_id IN (
          SELECT id FROM stage_submissions WHERE student_id = $1
        )
      `,
      [demoIds.student]
    );
    await pool.query(
      `
        DELETE FROM thesis_assessments
        WHERE schedule_id IN (
          SELECT id FROM thesis_schedules WHERE student_id = $1
        )
      `,
      [demoIds.student]
    );
    await pool.query(
      `
        DELETE FROM thesis_schedules
        WHERE student_id = $1
      `,
      [demoIds.student]
    );
    await pool.query(
      `
        DELETE FROM revision_notes
        WHERE thesis_id IN (
          SELECT id FROM theses WHERE student_id = $1
        )
           OR legacy_revision_item_id IN (
             SELECT item.id
             FROM revision_items item
             JOIN revision_workflows workflow
               ON workflow.id = item.revision_workflow_id
             WHERE workflow.student_id = $1
           )
      `,
      [demoIds.student]
    );
    await pool.query(
      `
        DELETE FROM stage_submissions
        WHERE student_id = $1
      `,
      [demoIds.student]
    );

    for (const table of [
      "audit_export_attempts",
      "thesis_registrations",
      "final_project_registrations",
      "student_progress_steps",
      "student_requirement_bundles",
      "thesis_submissions",
      "guidance_workflows",
      "exams",
      "revision_workflows",
    ]) {
      if (table === "audit_export_attempts") {
        await pool.query(`DELETE FROM ${table} WHERE actor_id = ANY($1::uuid[])`, [
          [demoIds.admin, demoIds.coordinator],
        ]);
      } else {
        await pool.query(`DELETE FROM ${table} WHERE student_id = $1`, [demoIds.student]);
      }
    }
    addCheck("Reset demo PostgreSQL workflow data", true);
  } finally {
    await pool.end();
  }
};

const spawnLogged = (command, args, options) => {
  let child;

  try {
    child = spawn(command, args, {
      ...options,
      stdio: ["ignore", "pipe", "pipe"],
      windowsHide: true,
    });
  } catch (error) {
    throw new Error(
      `Failed to spawn ${command}: ${
        error instanceof Error ? error.message : String(error)
      }`
    );
  }

  let output = "";
  const capture = (chunk) => {
    output += chunk.toString();
    output = output.slice(-8000);
  };
  child.stdout.on("data", capture);
  child.stderr.on("data", capture);
  child.getOutput = () => output;
  return child;
};

const stopProcessTree = async (child) => {
  if (!child || child.exitCode !== null) return;

  try {
    child.kill();
  } catch {
    // continue with platform cleanup
  }

  if (process.platform === "win32") {
    await Promise.race([
      new Promise((resolve) => {
        let killer;
        try {
          killer = spawn("taskkill", ["/pid", String(child.pid), "/T", "/F"], {
            stdio: "ignore",
            windowsHide: true,
          });
        } catch {
          resolve(undefined);
          return;
        }

        killer.once("exit", resolve);
        killer.once("error", resolve);
      }),
      sleep(2500),
    ]);
    return;
  }

  await Promise.race([
    new Promise((resolve) => {
      child.once("exit", resolve);
      child.once("error", resolve);
    }),
    sleep(3000),
  ]);
};

const resolveViteBin = async () => {
  const viteBin = path.join(rootDir, "node_modules", "vite", "bin", "vite.js");
  try {
    await fs.access(viteBin);
    return viteBin;
  } catch {
    throw new Error("Vite binary not found. Run npm.cmd install before UI QA.");
  }
};

const startBackend = async () => {
  const child = spawnLogged(process.execPath, ["backend/dist/server.js"], {
    cwd: rootDir,
    env: {
      ...process.env,
      DB_ADAPTER: "postgres",
      DATABASE_URL: databaseUrl,
      PORT: apiPort,
      API_PREFIX: apiPrefix,
      CORS_ORIGIN: `${frontendUrl},http://localhost:${frontendPort}`,
    },
  });

  try {
    await waitFor("backend health", async () => {
      if (child.exitCode !== null) {
        throw new Error(child.getOutput());
      }
      const response = await fetch(api("/health")).catch(() => null);
      return response?.status === 200;
    });
    addCheck("Backend PostgreSQL health ready", true, apiBaseUrl);
  } catch (error) {
    await stopProcessTree(child);
    throw error;
  }

  return child;
};

const startFrontend = async () => {
  const viteBin = await resolveViteBin();
  const child = spawnLogged(
    process.execPath,
    [viteBin, "--host", "127.0.0.1", "--port", frontendPort, "--strictPort"],
    {
      cwd: rootDir,
      env: {
        ...process.env,
        VITE_API_MODE: "http",
        VITE_API_BASE_URL: apiBaseUrl,
        VITE_DEMO_MODE: "true",
        VITE_DEMO_STUDENT_ID: demoIds.student,
      },
    }
  );

  try {
    await waitFor("frontend dev server", async () => {
      if (child.exitCode !== null) {
        throw new Error(child.getOutput());
      }
      const response = await fetch(frontendUrl).catch(() => null);
      return response?.status === 200;
    });
    addCheck("Frontend HTTP mode ready", true, frontendUrl);
  } catch (error) {
    await stopProcessTree(child);
    throw error;
  }

  return child;
};

const chromeCandidates = [
  process.env.CHROME_PATH,
  "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
  "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
  "C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe",
].filter(Boolean);

const findChrome = async () => {
  for (const candidate of chromeCandidates) {
    try {
      await fs.access(candidate);
      return candidate;
    } catch {
      // try next candidate
    }
  }

  throw new Error("Chrome/Edge executable not found. Set CHROME_PATH to run UI QA.");
};

class CdpClient {
  constructor(wsUrl) {
    this.ws = new WebSocket(wsUrl);
    this.nextId = 1;
    this.pending = new Map();
    this.sessionId = null;

    this.opened = new Promise((resolve, reject) => {
      this.ws.addEventListener("open", resolve, { once: true });
      this.ws.addEventListener("error", reject, { once: true });
    });

    this.ws.addEventListener("message", (event) => {
      const message = JSON.parse(event.data);

      if (message.id) {
        const pending = this.pending.get(message.id);
        if (!pending) return;
        this.pending.delete(message.id);

        if (message.error) {
          pending.reject(new Error(message.error.message));
        } else {
          pending.resolve(message.result);
        }
        return;
      }

      if (message.method === "Page.javascriptDialogOpening") {
        void this.send("Page.handleJavaScriptDialog", { accept: true });
      }
    });
  }

  async send(method, params = {}, options = {}) {
    await this.opened;
    const id = this.nextId++;
    const sessionId =
      Object.prototype.hasOwnProperty.call(options, "sessionId")
        ? options.sessionId
        : this.sessionId;
    const payload = JSON.stringify({
      id,
      method,
      params,
      ...(sessionId ? { sessionId } : {}),
    });

    return new Promise((resolve, reject) => {
      this.pending.set(id, { resolve, reject });
      this.ws.send(payload);
      setTimeout(() => {
        if (this.pending.has(id)) {
          this.pending.delete(id);
          reject(new Error(`CDP command timed out: ${method}`));
        }
      }, 15_000);
    });
  }

  async close() {
    this.ws.close();
  }
}

const startBrowser = async () => {
  const chromePath = await findChrome();
  await fs.mkdir(browserUserDataDir, { recursive: true });
  const child = spawnLogged(
    chromePath,
    [
      "--headless=new",
      "--disable-gpu",
      "--disable-gpu-sandbox",
      "--disable-gpu-compositing",
      "--disable-dev-shm-usage",
      "--disable-features=VizDisplayCompositor",
      "--no-first-run",
      "--no-default-browser-check",
      `--remote-debugging-port=${cdpPort}`,
      `--user-data-dir=${browserUserDataDir}`,
      "about:blank",
    ],
    { cwd: rootDir, env: { ...process.env, CHROME_PATH: chromePath } }
  );

  try {
    const version = await waitFor("Chrome CDP", async () => {
      if (child.exitCode !== null) {
        throw new Error(child.getOutput());
      }
      const response = await fetch(`http://127.0.0.1:${cdpPort}/json/version`).catch(
        () => null
      );
      return response?.ok ? response.json() : null;
    });

    const cdp = new CdpClient(version.webSocketDebuggerUrl);
    const target = await cdp.send(
      "Target.createTarget",
      { url: "about:blank" },
      { sessionId: null }
    );
    const attached = await cdp.send(
      "Target.attachToTarget",
      { targetId: target.targetId, flatten: true },
      { sessionId: null }
    );
    cdp.sessionId = attached.sessionId;
    addCheck("Headless browser ready", true, chromePath);
    return { child, cdp };
  } catch (error) {
    await stopProcessTree(child);
    throw error;
  }
};

const evaluate = async (cdp, expression) => {
  const result = await cdp.send("Runtime.evaluate", {
    expression,
    awaitPromise: true,
    returnByValue: true,
  });

  if (result.exceptionDetails) {
    throw new Error(
      result.exceptionDetails.exception?.description ||
        result.exceptionDetails.text ||
        "Runtime evaluation failed."
    );
  }

  return result.result.value;
};

const navigate = async (cdp, url) => {
  await cdp.send("Page.navigate", { url });
  await waitFor("page ready", async () =>
    evaluate(cdp, "document.readyState === 'complete'")
  );
  await sleep(500);
};

const waitForPageCondition = (cdp, label, expression, timeoutMs = 25_000) =>
  waitFor(label, () => evaluate(cdp, expression), timeoutMs);

const clickCenter = async (cdp, selector) => {
  const selectorLiteral = JSON.stringify(selector);
  const rect = await evaluate(
    cdp,
    `(() => {
      const element = document.querySelector(${selectorLiteral});
      if (!element) throw new Error("Missing selector: " + ${selectorLiteral});
      element.scrollIntoView({ block: "center" });
      const box = element.getBoundingClientRect();
      return { x: box.left + box.width / 2, y: box.top + box.height / 2 };
    })()`
  );
  await cdp.send("Input.dispatchMouseEvent", {
    type: "mousePressed",
    x: rect.x,
    y: rect.y,
    button: "left",
    clickCount: 1,
  });
  await cdp.send("Input.dispatchMouseEvent", {
    type: "mouseReleased",
    x: rect.x,
    y: rect.y,
    button: "left",
    clickCount: 1,
  });
};

const formHelpers = `
  (() => {
    window.__lastAlert = "";
    window.alert = (message) => { window.__lastAlert = String(message || ""); };
    window.confirm = () => true;
    window.__qa = {
      triggerReactChange(element) {
        const reactPropsKey = Object.keys(element).find((key) => key.startsWith("__reactProps$"));
        const props = reactPropsKey ? element[reactPropsKey] : null;
        if (props?.onChange) {
          props.onChange({
            target: element,
            currentTarget: element,
            bubbles: true,
            type: "change",
            nativeEvent: new Event("change", { bubbles: true })
          });
        }
      },
      setInput(selector, value, index = 0) {
        const elements = Array.from(document.querySelectorAll(selector));
        const element = elements[index];
        if (!element) throw new Error("Missing input: " + selector + "[" + index + "]");
        const proto = element instanceof HTMLTextAreaElement
          ? HTMLTextAreaElement.prototype
          : element instanceof HTMLSelectElement
            ? HTMLSelectElement.prototype
            : HTMLInputElement.prototype;
        const previousValue = element.value;
        Object.getOwnPropertyDescriptor(proto, "value").set.call(element, value);
        if (element._valueTracker) {
          element._valueTracker.setValue(previousValue);
        }
        element.dispatchEvent(new Event("input", { bubbles: true }));
        element.dispatchEvent(new Event("change", { bubbles: true }));
        this.triggerReactChange(element);
      },
      setFirstInputByType(type, value) {
        this.setInput('input[type="' + type + '"]', value);
      },
      setTextareaByPlaceholder(fragment, value) {
        const element = Array.from(document.querySelectorAll("textarea")).find((item) =>
          item.placeholder.includes(fragment)
        );
        if (!element) throw new Error("Missing textarea placeholder: " + fragment);
        const previousValue = element.value;
        Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, "value").set.call(element, value);
        if (element._valueTracker) {
          element._valueTracker.setValue(previousValue);
        }
        element.dispatchEvent(new Event("input", { bubbles: true }));
        element.dispatchEvent(new Event("change", { bubbles: true }));
        this.triggerReactChange(element);
      },
      setSelectByOptionValue(value) {
        const select = Array.from(document.querySelectorAll("select")).find((item) =>
          Array.from(item.options).some((option) => option.value === value)
        );
        if (!select) throw new Error("Missing select option value: " + value);
        const previousValue = select.value;
        Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, "value").set.call(select, value);
        if (select._valueTracker) {
          select._valueTracker.setValue(previousValue);
        }
        select.dispatchEvent(new Event("change", { bubbles: true }));
        this.triggerReactChange(select);
      },
      clickText(tag, text, index = 0) {
        const elements = Array.from(document.querySelectorAll(tag)).filter((item) =>
          item.textContent.includes(text)
        );
        const element = elements[index];
        if (!element) throw new Error("Missing " + tag + " text: " + text + "[" + index + "]");
        element.scrollIntoView({ block: "center" });
        element.click();
      },
      clickButton(text, index = 0) {
        this.clickText("button", text, index);
      },
      bodyText() {
        return document.body.innerText;
      }
    };
    return true;
  })()
`;

const installHelpers = (cdp) => evaluate(cdp, formHelpers);

const loginViaUi = async (cdp, identifier) => {
  await navigate(cdp, `${frontendUrl}/#/login`);
  await evaluate(cdp, "localStorage.clear(); sessionStorage.clear(); true");
  await navigate(cdp, `${frontendUrl}/#/login`);
  await installHelpers(cdp);
  await evaluate(
    cdp,
    `__qa.setInput('input[name="username"]', ${JSON.stringify(identifier)});
     __qa.setInput('input[name="password"]', 'demo');
     document.querySelector('form').requestSubmit();
     true;`
  );
};

const setStudentProgressActive = async (token, stepId) => {
  await request("PATCH", api(`/students/me/progress/${stepId}`), {
    token,
    body: { status: "active" },
  });
};

const resetWorkflowState = async (studentToken) => {
  await request("POST", api("/students/me/progress/reset"), { token: studentToken });
  await request("POST", api("/students/me/guidance/bimbingan-pra-proposal/reset"), {
    token: studentToken,
  });
  await request("POST", api("/students/me/exams/sidang/reset"), { token: studentToken });
  await request("POST", api("/students/me/revisions/revisi-sidang/reset"), {
    token: studentToken,
  });
  addCheck("API reset student workflow state", true);
};

const ensureApprovedFinalProjectRegistration = async (studentToken, coordinatorToken) => {
  const submitted = await request("POST", api("/students/me/final-project-registration"), {
    token: studentToken,
    expectedStatus: 201,
    body: {
      requirementDriveLink:
        "https://drive.google.com/drive/folders/task57-student-workflow-ui",
      paymentProofLink: "https://drive.google.com/file/d/task57-payment-proof",
      academicPeriodId: demoIds.academicPeriod,
      skema: "Skripsi",
      thesisTypeId: demoIds.thesisType,
      judulTA: "Task 57 Formulasi Gel Ekstrak Daun Sirih",
      deskripsiTA: "Setup QA untuk approval pendaftaran TA sebelum bimbingan.",
      requestedSupervisor1Id: demoIds.lecturer1,
      submit: true,
    },
  });
  const registrationId = submitted.data?.id;
  const submittedPassed =
    submitted.data?.status === "Menunggu Validasi Koordinator" && Boolean(registrationId);
  addCheck(
    "API setup submit pendaftaran TA sebelum bimbingan",
    submittedPassed,
    submitted.data?.status || "-"
  );
  if (!submittedPassed) {
    throw new Error("Failed to submit final project registration for guidance QA.");
  }

  const approved = await request(
    "PATCH",
    api(`/coordinator/final-project-registrations/${registrationId}/validation`),
    {
      token: coordinatorToken,
      body: {
        status: "Disetujui",
        pembimbing1Id: demoIds.lecturer1,
        pembimbing2Id: demoIds.lecturer2,
        catatanKoordinator: "Task 57 setup approved.",
      },
    }
  );
  const approvedPassed =
    approved.data?.status === "Disetujui" &&
    approved.data?.supervisorAssignments?.length === 2;
  addCheck(
    "API setup approve pendaftaran TA sebelum bimbingan",
    approvedPassed,
    `status=${approved.data?.status || "-"}; assignments=${approved.data?.supervisorAssignments?.length || 0}`
  );
  if (!approvedPassed) {
    throw new Error("Failed to approve final project registration for guidance QA.");
  }
};

const getStudentGuidanceRequest = async (studentToken, guidanceType = "seminar-proposal") => {
  const payload = await request("GET", api("/students/me/guidance-requests"), {
    token: studentToken,
  });
  return (payload.data || []).find((item) => item.guidanceType === guidanceType) || null;
};

const getLecturerGuidanceRequest = async (lecturerToken, guidanceType = "seminar-proposal") => {
  const payload = await request("GET", api("/lecturer/guidance-requests"), {
    token: lecturerToken,
  });
  return (
    (payload.data || []).find(
      (item) => item.studentId === demoIds.student && item.guidanceType === guidanceType
    ) || null
  );
};

const ensureApprovedGuidanceRequest = async (
  studentToken,
  lecturerToken,
  guidanceType,
  googleDocsLink,
  studentNote
) => {
  const submitted = await request("POST", api("/students/me/guidance-requests"), {
    token: studentToken,
    expectedStatus: 201,
    body: {
      guidanceType,
      googleDocsLink,
      studentNote,
    },
  });
  const guidanceRequestId = submitted.data?.id || "";
  const submittedPassed =
    submitted.data?.status === "Menunggu Validasi Dosen" && Boolean(guidanceRequestId);
  addCheck(
    `API setup submit ${guidanceType} guidance request`,
    submittedPassed,
    `id=${guidanceRequestId || "-"}; status=${submitted.data?.status || "-"}`
  );
  if (!submittedPassed) {
    throw new Error(`Failed to submit ${guidanceType} guidance request.`);
  }

  const approved = await request(
    "PATCH",
    api(`/lecturer/guidance-requests/${guidanceRequestId}/validation`),
    {
      token: lecturerToken,
      body: {
        status: "Disetujui",
        catatanDosen: `QA approved ${guidanceType} guidance request.`,
      },
    }
  );
  const approvedPassed = approved.data?.status === "Disetujui";
  addCheck(
    `API setup approve ${guidanceType} guidance request`,
    approvedPassed,
    approved.data?.status || "-"
  );
  if (!approvedPassed) {
    throw new Error(`Failed to approve ${guidanceType} guidance request.`);
  }

  return approved.data;
};

const runStudentGuidanceUiFlow = async (cdp, studentToken, lecturerToken) => {
  const docsLink = "https://docs.google.com/document/d/task49-guidance-ui/edit";
  const topic = "Task 49 UI materi bimbingan PostgreSQL";

  await setStudentProgressActive(studentToken, "bimbingan-pra-proposal");
  await loginViaUi(cdp, "mahasiswa");
  await waitForPageCondition(cdp, "student dashboard route", "location.hash === '#/mahasiswa'");
  await waitForPageCondition(
    cdp,
    "student guidance view",
    "__qa.bodyText().includes('Bimbingan Pra Proposal') && __qa.bodyText().includes('Link Google Docs Bimbingan')"
  );
  addCheck("UI mahasiswa membuka Bimbingan Pra Proposal HTTP mode", true);

  await evaluate(cdp, "__qa.clickButton('Edit Link'); true;");
  await waitForPageCondition(
    cdp,
    "student guidance docs input",
    "document.querySelectorAll('input[type=\"text\"]').length > 0"
  );
  await evaluate(
    cdp,
    `__qa.setInput('input[type="text"]', ${JSON.stringify(docsLink)});
     __qa.clickButton('Simpan');
     true;`
  );
  await waitForPageCondition(
    cdp,
    "student guidance docs link updated",
    `__qa.bodyText().includes(${JSON.stringify(docsLink)})`
  );

  await waitForPageCondition(
    cdp,
    "student guidance request button",
    "__qa.bodyText().includes('Ajukan Bimbingan')"
  );
  await evaluate(cdp, "__qa.clickButton('Ajukan Bimbingan'); true;");
  await waitForPageCondition(
    cdp,
    "student guidance request submitted",
    "__qa.bodyText().includes('Menunggu Validasi Dosen')"
  );

  const guidanceRequest = await waitFor(
    "student guidance request aggregate persistence",
    async () => {
      const requestAggregate = await getStudentGuidanceRequest(studentToken);
      return requestAggregate?.status === "Menunggu Validasi Dosen"
        ? requestAggregate
        : null;
    },
    10_000
  );
  const requestSubmittedPassed =
    guidanceRequest.status === "Menunggu Validasi Dosen" &&
    guidanceRequest.guidanceType === "seminar-proposal" &&
    guidanceRequest.googleDocsLink === docsLink;
  addCheck(
    "API state after UI student guidance request aggregate",
    requestSubmittedPassed,
    `id=${guidanceRequest.id || "-"}; status=${guidanceRequest.status || "-"}`
  );
  if (!requestSubmittedPassed) {
    throw new Error("Student guidance request aggregate was not persisted.");
  }

  const guidanceApproval = await request(
    "PATCH",
    api(`/lecturer/guidance-requests/${guidanceRequest.id}/validation`),
    {
      token: lecturerToken,
      body: {
        status: "Disetujui",
        catatanDosen: "Task 57 request approved via QA API.",
      },
    }
  );
  const requestApprovedPassed = guidanceApproval.data?.status === "Disetujui";
  addCheck(
    "API dosen approve request bimbingan aggregate",
    requestApprovedPassed,
    guidanceApproval.data?.status || "-"
  );
  if (!requestApprovedPassed) {
    throw new Error("Lecturer API did not approve the guidance request aggregate.");
  }

  await navigate(cdp, `${frontendUrl}/#/mahasiswa`);
  await evaluate(cdp, "window.location.reload(); true;");
  await waitFor("page reload after guidance request approval", async () =>
    evaluate(cdp, "document.readyState === 'complete'")
  );
  await sleep(500);
  await installHelpers(cdp);
  await waitForPageCondition(
    cdp,
    "student guidance view after request approval",
    "__qa.bodyText().includes('Bimbingan Pra Proposal') && __qa.bodyText().includes('Riwayat & Materi Bimbingan')"
  );

  await evaluate(cdp, "__qa.clickText('button', 'Riwayat & Materi Bimbingan'); true;");
  await waitForPageCondition(
    cdp,
    "student guidance material button",
    "__qa.bodyText().includes('Ajukan Materi Bimbingan')"
  );
  await evaluate(cdp, "__qa.clickButton('Ajukan Materi Bimbingan'); true;");
  await waitForPageCondition(
    cdp,
    "student guidance material textarea",
    "Array.from(document.querySelectorAll('textarea')).some((item) => item.placeholder.includes('Diskusi draf'))"
  );
  await evaluate(
    cdp,
    `__qa.setTextareaByPlaceholder('Diskusi draf', ${JSON.stringify(topic)});
     true;`
  );
  await waitForPageCondition(
    cdp,
    "student guidance topic textarea filled",
    `Array.from(document.querySelectorAll('textarea')).some((item) =>
      item.placeholder.includes('Diskusi draf') && item.value === ${JSON.stringify(topic)}
    )`
  );
  await sleep(500);
  await evaluate(
    cdp,
    `(() => {
       const element = Array.from(document.querySelectorAll('textarea')).find((item) =>
         item.placeholder.includes('Diskusi draf')
       );
       if (!element?.closest('form')) throw new Error('Missing guidance topic form');
       element.closest('form').requestSubmit();
       return true;
     })()`
  );
  await waitForPageCondition(
    cdp,
    "student guidance material submitted",
    `__qa.bodyText().includes(${JSON.stringify(topic)}) && __qa.bodyText().includes('Menunggu Validasi')`
  );

  const guidance = await request(
    "GET",
    api(`/students/me/guidance-requests/${guidanceRequest.id}`),
    { token: studentToken }
  );
  const session = guidance.data.materials.find((item) => item.topic === topic);
  const guidancePassed =
    guidance.data.googleDocsLink === docsLink &&
    session?.topic === topic &&
    session?.status === "Diajukan";
  addCheck(
    "API state after UI student guidance",
    guidancePassed,
    `docs=${guidance.data.googleDocsLink}; topic=${session?.topic || "-"}; material=${session?.status || "-"}`
  );
  if (!guidancePassed) {
    throw new Error("Student guidance UI did not persist requested material aggregate state.");
  }
};

const runLecturerGuidanceUiFlow = async (cdp, lecturerToken) => {
  const guidanceRequest = await waitFor(
    "lecturer guidance request aggregate available",
    () => getLecturerGuidanceRequest(lecturerToken),
    10_000
  );

  await loginViaUi(cdp, "dosen");
  await waitForPageCondition(cdp, "lecturer dashboard route", "location.hash === '#/dosen'");
  await navigate(cdp, `${frontendUrl}/#/dosen/mahasiswa-bimbingan`);
  await installHelpers(cdp);
  await waitForPageCondition(
    cdp,
    "lecturer student list",
    "__qa.bodyText().includes('Dimas Indra Jaya') && __qa.bodyText().includes('Lihat Detail')"
  );

  await evaluate(cdp, "__qa.clickButton('Lihat Detail'); true;");
  await waitForPageCondition(
    cdp,
    "lecturer guidance detail",
    "__qa.bodyText().includes('Monitoring Progres Mahasiswa') && __qa.bodyText().includes('Bimbingan Pra Proposal')"
  );
  await evaluate(cdp, "__qa.clickText('button', 'Riwayat & Materi Bimbingan'); true;");
  await waitForPageCondition(
    cdp,
    "lecturer sees requested guidance material",
    "__qa.bodyText().includes('Task 49 UI materi bimbingan PostgreSQL') && __qa.bodyText().includes('Setujui Materi')"
  );

  await evaluate(cdp, "__qa.clickButton('Setujui Materi'); true;");
  await waitForPageCondition(
    cdp,
    "lecturer guidance material schedule modal",
    "__qa.bodyText().includes('Setujui & Jadwalkan Sesi Bimbingan') && !!document.querySelector('input[type=\"date\"]')"
  );
  await evaluate(
    cdp,
    `__qa.setInput('input[type="date"]', '2026-06-12');
     __qa.setInput('input[type="time"]', '10:00');
     __qa.clickButton('Konfirmasi Jadwal');
     true;`
  );
  const guidance = await waitFor(
    "lecturer guidance approval API persistence",
    async () => {
      const payload = await request("GET", api(`/lecturer/guidance-requests/${guidanceRequest.id}`), {
        token: lecturerToken,
      });
      return payload.data.materials.find(
        (item) =>
          item.topic === "Task 49 UI materi bimbingan PostgreSQL" &&
          item.status === "Valid"
      )
        ? payload
        : null;
    },
    10_000
  );
  const approvedSession = guidance.data.materials.find(
    (item) => item.topic === "Task 49 UI materi bimbingan PostgreSQL"
  );
  const lecturerGuidancePassed =
    approvedSession?.status === "Valid" &&
    guidance.data.materialSummary?.validCount === 1;
  addCheck(
    "API state after UI lecturer guidance approval",
    lecturerGuidancePassed,
    `${approvedSession?.status || "-"}; valid=${guidance.data.materialSummary?.validCount || 0}`
  );
  if (!lecturerGuidancePassed) {
    throw new Error("Lecturer guidance UI did not persist aggregate material validation.");
  }
};

const runStudentExamAndRevisionUiFlow = async (cdp, studentToken, lecturerToken) => {
  const examLink = "https://docs.google.com/document/d/task49-exam-ui/edit";
  const revisionGuidanceLink = "https://docs.google.com/document/d/task58-revision-guidance/edit";

  await setStudentProgressActive(studentToken, "sidang");
  await loginViaUi(cdp, "mahasiswa");
  await waitForPageCondition(cdp, "student dashboard route for exam", "location.hash === '#/mahasiswa'");
  await waitForPageCondition(
    cdp,
    "student exam view",
    "__qa.bodyText().includes('Susunan Dewan Sidang') && __qa.bodyText().includes('Link Dokumen Utama Sidang')"
  );

  await evaluate(cdp, "__qa.clickButton('Ubah Link'); true;");
  await waitForPageCondition(
    cdp,
    "student exam docs input",
    "document.querySelectorAll('input[type=\"text\"]').length > 0"
  );
  await evaluate(
    cdp,
    `__qa.setInput('input[type="text"]', ${JSON.stringify(examLink)});
     true;`
  );
  await waitForPageCondition(
    cdp,
    "student exam docs input filled",
    `Array.from(document.querySelectorAll('input[type="text"]')).some((item) => item.value === ${JSON.stringify(examLink)})`
  );
  await sleep(500);
  await evaluate(cdp, "__qa.clickButton('Simpan'); true;");
  await waitForPageCondition(
    cdp,
    "student exam docs link updated",
    `__qa.bodyText().includes(${JSON.stringify(examLink)})`
  );

  await evaluate(cdp, "__qa.clickText('button', 'Simulator Dosen & Hasil Sidang'); true;");
  await waitForPageCondition(
    cdp,
    "student exam simulator controls",
    "!!document.querySelector('select') && !!document.querySelector('input[type=\"text\"]')"
  );
  await evaluate(
    cdp,
    `__qa.setInput('input[type="text"]', 'A');
     __qa.setSelectByOptionValue('lulus-dengan-revisi');
     __qa.clickButton('Simpan Simulasi');
     true;`
  );
  await waitForPageCondition(
    cdp,
    "student exam assessment visible",
    "__qa.bodyText().includes('Lulus Dengan Revisi') && __qa.bodyText().includes('Catatan Revisi')"
  );

  const exam = await request("GET", api("/students/me/exams/sidang"), {
    token: studentToken,
  });
  addCheck(
    "API state after UI student exam",
    exam.data.googleDocsLink === examLink &&
      exam.data.grade === "A" &&
      exam.data.resultStatus === "lulus-dengan-revisi",
    `${exam.data.googleDocsLink}; grade=${exam.data.grade}; result=${exam.data.resultStatus}`
  );
  if (
    exam.data.googleDocsLink !== examLink ||
    exam.data.grade !== "A" ||
    exam.data.resultStatus !== "lulus-dengan-revisi"
  ) {
    throw new Error("Student exam UI did not persist PostgreSQL state.");
  }

  await setStudentProgressActive(studentToken, "revisi-sidang");
  const revisionGuidanceRequest = await ensureApprovedGuidanceRequest(
    studentToken,
    lecturerToken,
    "revisi-sidang-akhir",
    revisionGuidanceLink,
    "Task 58 revision guidance request."
  );
  await navigate(cdp, `${frontendUrl}/#/mahasiswa`);
  await installHelpers(cdp);
  await evaluate(
    cdp,
    "window.location.reload(); true;"
  );
  await waitFor("page reload after revision activation", async () =>
    evaluate(cdp, "document.readyState === 'complete'")
  );
  await sleep(500);
  await installHelpers(cdp);
  await waitForPageCondition(
    cdp,
    "student revision view",
    "__qa.bodyText().includes('Revisi Sidang') && __qa.bodyText().includes('Butir Revisi')"
  );
  await waitForPageCondition(
    cdp,
    "student revision guidance approved",
    "__qa.bodyText().includes('Status Bimbingan Revisi') && __qa.bodyText().includes('Disetujui')"
  );

  await evaluate(
    cdp,
    `__qa.clickButton('Ajukan Penyelesaian');
     true;`
  );
  await waitForPageCondition(
    cdp,
    "student revision submitted",
    "__qa.bodyText().includes('Menunggu Validasi') && __qa.bodyText().includes('Material bimbingan')"
  );

  const revisionAfterSubmission = await request("GET", api("/students/me/revisions/revisi-sidang"), {
    token: studentToken,
  });
  const firstRevisionItem = revisionAfterSubmission.data.items[0];
  const revisionGuidanceDetail = await request(
    "GET",
    api(`/students/me/guidance-requests/${revisionGuidanceRequest.id}`),
    { token: studentToken }
  );
  const revisionMaterial = revisionGuidanceDetail.data.materials.find(
    (item) => item.sourceRevisionItemId === firstRevisionItem.sourceRevisionItemId
  );
  const revisionMaterialPassed =
    revisionMaterial?.materialType === "revision" &&
    revisionMaterial?.status === "Diajukan" &&
    revisionMaterial?.topic === firstRevisionItem.topik;
  addCheck(
    "API state after UI student revision material bridge",
    revisionMaterialPassed,
    `source=${firstRevisionItem.sourceRevisionItemId || "-"}; material=${revisionMaterial?.status || "-"}`
  );
  if (!revisionMaterialPassed) {
    throw new Error("Student revision UI did not persist aggregate revision material.");
  }

  const revisionMaterialValidation = await request(
    "PATCH",
    api(
      `/lecturer/guidance-requests/${revisionGuidanceRequest.id}/materials/${revisionMaterial.id}/validation`
    ),
    {
      token: lecturerToken,
      body: {
        status: "Valid",
        catatanDosen: "Task 58 revision material valid.",
      },
    }
  );
  addCheck(
    "API dosen validate revision material bridge",
    revisionMaterialValidation.data?.status === "Valid",
    revisionMaterialValidation.data?.status || "-"
  );
  const revisionAfterMaterialValidation = await request(
    "GET",
    api("/students/me/revisions/revisi-sidang"),
    { token: studentToken }
  );
  const syncedRevisionItem = revisionAfterMaterialValidation.data.items.find(
    (item) => item.sourceRevisionItemId === firstRevisionItem.sourceRevisionItemId
  );
  addCheck(
    "API backend syncs valid revision material to revision item",
    syncedRevisionItem?.status === "done",
    syncedRevisionItem?.status || "-"
  );
  const revisionMaterialRejection = await request(
    "PATCH",
    api(
      `/lecturer/guidance-requests/${revisionGuidanceRequest.id}/materials/${revisionMaterial.id}/validation`
    ),
    {
      token: lecturerToken,
      body: {
        status: "Ditolak",
        catatanDosen: "Task 59 revision material needs changes.",
      },
    }
  );
  addCheck(
    "API dosen reject revision material bridge",
    revisionMaterialRejection.data?.status === "Ditolak",
    revisionMaterialRejection.data?.status || "-"
  );
  const revisionAfterMaterialRejection = await request(
    "GET",
    api("/students/me/revisions/revisi-sidang"),
    { token: studentToken }
  );
  const rejectedRevisionItem = revisionAfterMaterialRejection.data.items.find(
    (item) => item.sourceRevisionItemId === firstRevisionItem.sourceRevisionItemId
  );
  addCheck(
    "API backend syncs rejected revision material to revision item",
    rejectedRevisionItem?.status === "pending",
    rejectedRevisionItem?.status || "-"
  );
  const revisionMaterialRetry = await request(
    "POST",
    api(
      `/students/me/guidance-requests/${revisionGuidanceRequest.id}/revision-items/${firstRevisionItem.sourceRevisionItemId}/materials`
    ),
    {
      token: studentToken,
      expectedStatus: 201,
      body: {
        materialType: "revision",
        sourceRevisionItemId: firstRevisionItem.sourceRevisionItemId,
        topic: firstRevisionItem.topik,
        content: "Task 60 retry material after lecturer rejection.",
      },
    }
  );
  addCheck(
    "API student submit revision material retry attempt",
    revisionMaterialRetry.data?.status === "Diajukan" &&
      revisionMaterialRetry.data?.attemptNumber === 2,
    `status=${revisionMaterialRetry.data?.status || "-"}; attempt=${revisionMaterialRetry.data?.attemptNumber || "-"}`
  );
  const revisionGuidanceAfterRetry = await request(
    "GET",
    api(`/students/me/guidance-requests/${revisionGuidanceRequest.id}`),
    { token: studentToken }
  );
  const revisionMaterialAttempts = revisionGuidanceAfterRetry.data.materials
    .filter((item) => item.sourceRevisionItemId === firstRevisionItem.sourceRevisionItemId)
    .sort((left, right) => left.attemptNumber - right.attemptNumber);
  const rejectedAttempt = revisionMaterialAttempts[0];
  const latestAttempt = revisionMaterialAttempts[revisionMaterialAttempts.length - 1];
  addCheck(
    "API revision material attempt history summary",
    revisionMaterialAttempts.length === 2 &&
      rejectedAttempt?.attemptSummary?.totalAttempts === 2 &&
      rejectedAttempt?.attemptSummary?.isLatestAttempt === false &&
      latestAttempt?.attemptSummary?.totalAttempts === 2 &&
      latestAttempt?.attemptSummary?.isLatestAttempt === true &&
      latestAttempt?.attemptSummary?.latestStatus === "Diajukan" &&
      latestAttempt?.attemptSummary?.latestRejectedNote ===
        "Task 59 revision material needs changes.",
    `attempts=${revisionMaterialAttempts.length}; latest=${latestAttempt?.attemptSummary?.latestStatus || "-"}`
  );
  const revisionRetryValidation = await request(
    "PATCH",
    api(
      `/lecturer/guidance-requests/${revisionGuidanceRequest.id}/materials/${revisionMaterialRetry.data.id}/validation`
    ),
    {
      token: lecturerToken,
      body: {
        status: "Valid",
        catatanDosen: "Task 60 retry revision material valid.",
      },
    }
  );
  addCheck(
    "API dosen validate retry revision material",
    revisionRetryValidation.data?.status === "Valid",
    revisionRetryValidation.data?.status || "-"
  );
  const revisionAfterRetryValidation = await request(
    "GET",
    api("/students/me/revisions/revisi-sidang"),
    { token: studentToken }
  );
  const retrySyncedRevisionItem = revisionAfterRetryValidation.data.items.find(
    (item) => item.sourceRevisionItemId === firstRevisionItem.sourceRevisionItemId
  );
  addCheck(
    "API backend syncs retry revision material to revision item",
    retrySyncedRevisionItem?.status === "done",
    retrySyncedRevisionItem?.status || "-"
  );
  const earlyRevisionFinalFile = await request(
    "POST",
    api("/students/me/revisions/revisi-sidang/final-file"),
    {
      token: studentToken,
      expectedStatus: 409,
      body: { fileName: "task61-too-early-final-revisi.pdf" },
    }
  );
  addCheck(
    "API blocks premature revision final upload",
    earlyRevisionFinalFile.error?.code === "CONFLICT",
    earlyRevisionFinalFile.error?.code || "-"
  );

  await evaluate(cdp, "__qa.clickText('button', 'Simulator Control Panel'); true;");
  await waitForPageCondition(
    cdp,
    "student revision simulator button",
    "__qa.bodyText().includes('Simulasi Semua Disetujui')"
  );
  await evaluate(cdp, "__qa.clickButton('Simulasi Semua Disetujui'); true;");
  await waitFor("API revision simulator persisted", async () => {
    const revision = await request("GET", api("/students/me/revisions/revisi-sidang"), {
      token: studentToken,
    }).catch(() => null);
    return (
      revision?.data?.items?.every((item) => item.status === "done") &&
      revision.data.penguji1Approved === true &&
      revision.data.penguji2Approved === true &&
      revision.data.ketuaSidangStatus === "approved"
    );
  });
  await waitForPageCondition(
    cdp,
    "student revision approved by simulator",
    "__qa.bodyText().includes('2/2 Selesai') && __qa.bodyText().includes('Unggah Dokumen Final')"
  );
  const revisionCompletionGatePanelVisible = await evaluate(
    cdp,
    "(() => { const text = __qa.bodyText().toLowerCase(); return text.includes('sinkronisasi penyelesaian revisi') && text.includes('dokumen final hasil revisi'); })()"
  );
  addCheck(
    "UI shows revision completion gate checklist",
    revisionCompletionGatePanelVisible,
    revisionCompletionGatePanelVisible ? "visible" : "-"
  );
  const revisionCompletionGateReasonVisible = await evaluate(
    cdp,
    "(() => { const text = __qa.bodyText(); return text.includes('Siap Unggah Final') && text.includes('Alasan Belum Lengkap') && text.includes('Dokumen final hasil revisi belum diunggah.'); })()"
  );
  addCheck(
    "UI syncs revision completion gate blocking reason",
    revisionCompletionGateReasonVisible,
    revisionCompletionGateReasonVisible ? "visible" : "-"
  );
  const earlyRevisionProgressCompletion = await request(
    "PATCH",
    api("/students/me/progress/revisi-sidang"),
    {
      token: studentToken,
      expectedStatus: 409,
      body: { status: "completed" },
    }
  );
  addCheck(
    "API blocks revision progress completion before final file",
    earlyRevisionProgressCompletion.error?.code === "CONFLICT",
    earlyRevisionProgressCompletion.error?.code || "-"
  );
  const revisionFinalFile = await request(
    "POST",
    api("/students/me/revisions/revisi-sidang/final-file"),
    {
      token: studentToken,
      body: { fileName: "task61-final-revisi.pdf" },
    }
  );
  addCheck(
    "API allows revision final upload after completion gate",
    revisionFinalFile.data?.finalFile === "task61-final-revisi.pdf",
    revisionFinalFile.data?.finalFile || "-"
  );
  const completedRevisionProgress = await request(
    "PATCH",
    api("/students/me/progress/revisi-sidang"),
    {
      token: studentToken,
      body: { status: "completed" },
    }
  );
  const revisionStep = completedRevisionProgress.data.find(
    (item) => item.id === "revisi-sidang"
  );
  addCheck(
    "API allows revision progress completion after final upload",
    revisionStep?.status === "completed",
    revisionStep?.status || "-"
  );

  const revision = await request("GET", api("/students/me/revisions/revisi-sidang"), {
    token: studentToken,
  });
  addCheck(
    "API state after UI student revision",
    revision.data.items.every((item) => item.status === "done") &&
      revision.data.penguji1Approved === true &&
      revision.data.penguji2Approved === true &&
      revision.data.ketuaSidangStatus === "approved" &&
      revision.data.finalFile === "task61-final-revisi.pdf",
    `items=${revision.data.items.map((item) => item.status).join(",")}; chair=${revision.data.ketuaSidangStatus}; file=${revision.data.finalFile || "-"}`
  );
};

const runLecturerRevisionGateReadUiFlow = async (cdp) => {
  await loginViaUi(cdp, "dosen");
  await waitForPageCondition(cdp, "lecturer dashboard route for revision gate", "location.hash === '#/dosen'");
  await evaluate(
    cdp,
    `sessionStorage.setItem('target_student_id', ${JSON.stringify(demoIds.student)});
     sessionStorage.setItem('target_step_id', 'revisi-sidang');
     true;`
  );
  await navigate(cdp, `${frontendUrl}/#/dosen/mahasiswa-bimbingan`);
  await installHelpers(cdp);
  await waitForPageCondition(
    cdp,
    "lecturer sees revision completion gate",
    "(() => { const text = __qa.bodyText().toLowerCase(); return text.includes('gate penyelesaian revisi') && text.includes('sinkronisasi penyelesaian revisi') && text.includes('task61-final-revisi.pdf'); })()"
  );
  addCheck("UI dosen sees revision completion gate visibility", true);
};

const runCoordinatorRevisionReadUiFlow = async (cdp) => {
  await loginViaUi(cdp, "kordinator");
  await waitForPageCondition(
    cdp,
    "coordinator dashboard route",
    "location.hash === '#/kordinator'"
  );
  await evaluate(
    cdp,
    `sessionStorage.setItem('monitor_student_id', ${JSON.stringify(demoIds.student)});
     sessionStorage.setItem('monitor_step_id', 'revisi-sidang');
     true;`
  );
  await navigate(cdp, `${frontendUrl}/#/kordinator/tahapan-akademik`);
  await installHelpers(cdp);
  await waitForPageCondition(
    cdp,
    "coordinator sees persisted revision",
    "__qa.bodyText().includes('Revisi Sidang') && __qa.bodyText().includes('Selesai') && __qa.bodyText().includes('Butir Revisi')"
  );
  const coordinatorGateVisible = await evaluate(
    cdp,
    "(() => { const text = __qa.bodyText().toLowerCase(); return text.includes('gate penyelesaian revisi') && text.includes('sinkronisasi penyelesaian revisi') && text.includes('task61-final-revisi.pdf'); })()"
  );
  addCheck(
    "UI koordinator sees revision completion gate visibility",
    coordinatorGateVisible,
    coordinatorGateVisible ? "visible" : "-"
  );
  addCheck("UI koordinator membaca workflow revisi PostgreSQL", true);
  await navigate(cdp, `${frontendUrl}/#/kordinator/monitoring`);
  await installHelpers(cdp);
  await waitForPageCondition(
    cdp,
    "coordinator sees revision gate audit panel",
    "__qa.bodyText().includes('Audit Completion Gate Revisi') && __qa.bodyText().includes('Dibaca')"
  );
  await waitForPageCondition(
    cdp,
    "coordinator sees revision gate audit detail button",
    "Boolean(document.querySelector('[data-testid=\"revision-gate-audit-detail\"]'))"
  );
  const auditControlsReady = await evaluate(
    cdp,
    `(() => {
      const dateInputs = document.querySelectorAll('input[type="date"]');
      const exportButton = document.querySelector('[data-testid="revision-gate-audit-export"]');
      const nextButton = document.querySelector('[data-testid="revision-gate-audit-next-page"]');
      return dateInputs.length >= 2 && Boolean(exportButton) && Boolean(nextButton);
    })()`
  );
  addCheck(
    "UI koordinator sees revision gate audit pagination and export controls",
    auditControlsReady,
    auditControlsReady ? "date+csv+pagination" : "-"
  );
  await evaluate(
    cdp,
    "document.querySelector('[data-testid=\"revision-gate-audit-detail\"]').click(); true;"
  );
  await waitForPageCondition(
    cdp,
    "coordinator opens revision gate audit drawer",
    "Boolean(document.querySelector('[data-testid=\"revision-gate-audit-drawer\"]'))"
  );
  const drawerAccessibilityReady = await evaluate(
    cdp,
    `(() => {
      const drawer = document.querySelector('[data-testid="revision-gate-audit-drawer"]');
      const close = document.querySelector('[data-testid="revision-gate-audit-close"]');
      const payload = document.querySelector('[data-testid="revision-gate-audit-payload"]');
      return Boolean(
        drawer &&
        drawer.getAttribute('role') === 'dialog' &&
        drawer.getAttribute('aria-modal') === 'true' &&
        drawer.getAttribute('aria-labelledby') === 'revision-gate-audit-title' &&
        close &&
        document.activeElement === close &&
        payload &&
        payload.textContent.includes('readyForFinalUpload')
      );
    })()`
  );
  addCheck(
    "UI koordinator opens revision gate audit detail drawer",
    drawerAccessibilityReady,
    drawerAccessibilityReady ? "dialog+payload" : "-"
  );
  await cdp.send("Input.dispatchKeyEvent", { type: "keyDown", key: "Escape", code: "Escape" });
  await waitForPageCondition(
    cdp,
    "coordinator closes revision gate audit drawer with Escape",
    "!document.querySelector('[data-testid=\"revision-gate-audit-drawer\"]')"
  );
  await evaluate(
    cdp,
    "document.querySelector('[data-testid=\"revision-gate-audit-detail\"]').click(); true;"
  );
  await waitForPageCondition(
    cdp,
    "coordinator reopens revision gate audit drawer",
    "Boolean(document.querySelector('[data-testid=\"revision-gate-audit-drawer\"]'))"
  );
  await clickCenter(cdp, '[data-testid="revision-gate-audit-close"]');
  await waitForPageCondition(
    cdp,
    "coordinator closes revision gate audit drawer with close button",
    "!document.querySelector('[data-testid=\"revision-gate-audit-drawer\"]')"
  );
  addCheck("UI koordinator sees revision gate audit visibility", true);
  addCheck("UI koordinator sees revision gate audit detail action", true);
  addCheck("UI koordinator closes revision gate audit detail drawer", true);
};

const runAdminAuditExportUiFlow = async (cdp) => {
  await loginViaUi(cdp, "admin");
  await waitForPageCondition(
    cdp,
    "admin dashboard route",
    "location.hash === '#/admin'"
  );
  await navigate(cdp, `${frontendUrl}/#/admin/monitoring`);
  await installHelpers(cdp);
  await waitForPageCondition(
    cdp,
    "admin sees revision gate audit export controls",
    "__qa.bodyText().includes('Audit Completion Gate Revisi') && Boolean(document.querySelector('[data-testid=\"revision-gate-audit-export\"]'))"
  );
  await waitForPageCondition(
    cdp,
    "admin sees audit cleanup scheduler status panel",
    "Boolean(document.querySelector('[data-testid=\"audit-cleanup-scheduler-status-panel\"]')) && __qa.bodyText().includes('Status Scheduler Cleanup') && __qa.bodyText().includes('Nonaktif')"
  );
  await evaluate(
    cdp,
    "document.querySelector('[data-testid=\"audit-cleanup-scheduler-refresh\"]').click(); true;"
  );
  await waitForPageCondition(
    cdp,
    "admin refreshes audit cleanup scheduler status",
    "Boolean(document.querySelector('[data-testid=\"audit-cleanup-scheduler-last-result\"]')) && Boolean(document.querySelector('[data-testid=\"audit-cleanup-scheduler-last-signal\"]'))"
  );
  await evaluate(
    cdp,
    "document.querySelector('[data-testid=\"revision-gate-audit-export\"]').click(); true;"
  );
  await waitForPageCondition(
    cdp,
    "admin sees audit export success feedback",
    "Boolean(document.querySelector('[data-testid=\"revision-gate-audit-export-feedback\"]')) && __qa.bodyText().includes('Export CSV berhasil')"
  );
  await evaluate(cdp, "__qa.setSelectByOptionValue('AUDIT_LOGS_EXPORTED'); true;");
  await waitForPageCondition(
    cdp,
    "admin sees audit export event visibility",
    "__qa.bodyText().includes('Export CSV') && __qa.bodyText().includes('Audit CSV exported.')"
  );
  await evaluate(
    cdp,
    "document.querySelector('[data-testid=\"audit-export-attempt-refresh\"]').click(); true;"
  );
  await waitForPageCondition(
    cdp,
    "admin sees audit export attempt monitoring",
    "Boolean(document.querySelector('[data-testid=\"audit-export-attempt-panel\"]')) && __qa.bodyText().includes('Monitoring Export Audit') && __qa.bodyText().includes('Allowed')"
  );
  for (let exportIndex = 0; exportIndex < 5; exportIndex += 1) {
    await evaluate(
      cdp,
      "document.querySelector('[data-testid=\"revision-gate-audit-export\"]').click(); true;"
    );
    await sleep(250);
  }
  await waitForPageCondition(
    cdp,
    "admin sees audit export rate limit feedback",
    "Boolean(document.querySelector('[data-testid=\"revision-gate-audit-error\"]')) && __qa.bodyText().includes('Export terlalu sering')"
  );
  await evaluate(
    cdp,
    "document.querySelector('[data-testid=\"audit-export-attempt-refresh\"]').click(); true;"
  );
  await waitForPageCondition(
    cdp,
    "admin sees blocked audit export attempt",
    "__qa.bodyText().includes('Blocked') && Boolean(document.querySelector('[data-testid=\"audit-export-attempt-filter-blocked\"]'))"
  );
  await evaluate(
    cdp,
    "document.querySelector('[data-testid=\"audit-export-attempt-filter-blocked\"]').click(); true;"
  );
  await waitForPageCondition(
    cdp,
    "admin filters blocked audit export attempts",
    "Boolean(document.querySelector('[data-testid=\"audit-export-attempt-blocked-detail\"]'))"
  );
  await evaluate(
    cdp,
    "document.querySelector('[data-testid=\"audit-export-attempt-blocked-detail\"]').click(); true;"
  );
  await waitForPageCondition(
    cdp,
    "admin opens blocked audit export attempt detail",
    "Boolean(document.querySelector('[data-testid=\"audit-export-attempt-drawer\"]')) && __qa.bodyText().includes('Export diblokir') && __qa.bodyText().includes('Actor ID')"
  );
  await evaluate(
    cdp,
    "document.querySelector('[data-testid=\"audit-export-attempt-close\"]').click(); true;"
  );
  await waitForPageCondition(
    cdp,
    "admin closes blocked audit export attempt detail",
    "!document.querySelector('[data-testid=\"audit-export-attempt-drawer\"]')"
  );
  await evaluate(
    cdp,
    "document.querySelector('[data-testid=\"audit-export-attempt-cleanup-open\"]').click(); true;"
  );
  await waitForPageCondition(
    cdp,
    "admin opens audit export cleanup dialog",
    "Boolean(document.querySelector('[data-testid=\"audit-export-cleanup-dialog\"]')) && __qa.bodyText().includes('Cleanup Attempt Export Audit')"
  );
  await evaluate(
    cdp,
    "document.querySelector('[data-testid=\"audit-export-cleanup-dry-run\"]').click(); true;"
  );
  await waitForPageCondition(
    cdp,
    "admin dry-runs audit export cleanup",
    "Boolean(document.querySelector('[data-testid=\"audit-export-cleanup-result\"]')) && __qa.bodyText().includes('Dry-run selesai')"
  );
  await evaluate(
    cdp,
    "document.querySelector('[data-testid=\"audit-export-cleanup-execute\"]').click(); true;"
  );
  await waitForPageCondition(
    cdp,
    "admin executes audit export cleanup",
    "Boolean(document.querySelector('[data-testid=\"audit-export-cleanup-result\"]')) && __qa.bodyText().includes('Cleanup selesai')"
  );
  await evaluate(
    cdp,
    "document.querySelector('[data-testid=\"audit-export-cleanup-close\"]').click(); true;"
  );
  await waitForPageCondition(
    cdp,
    "admin closes audit export cleanup dialog",
    "!document.querySelector('[data-testid=\"audit-export-cleanup-dialog\"]')"
  );
  addCheck("UI admin sees audit export success feedback", true);
  addCheck("UI admin sees audit export event visibility", true);
  addCheck("UI admin sees audit cleanup scheduler status panel", true);
  addCheck("UI admin sees audit export attempt monitoring", true);
  addCheck("UI admin filters blocked audit export attempts", true);
  addCheck("UI admin opens blocked audit export attempt detail", true);
  addCheck("UI admin dry-runs audit export cleanup", true);
  addCheck("UI admin executes audit export cleanup", true);
};

const main = async () => {
  console.log(`Student workflow PostgreSQL UI QA frontend: ${frontendUrl}`);
  console.log(`Student workflow PostgreSQL UI QA API: ${apiBaseUrl}`);

  let backend = null;
  let frontend = null;
  let browser = null;

  try {
    await applySqlFiles();
    backend = await startBackend();
    frontend = await startFrontend();
    browser = await startBrowser();

    const { cdp } = browser;
    const studentToken = await loginApi("mahasiswa");
    const lecturerToken = await loginApi("dosen");
    const coordinatorToken = await loginApi("kordinator");

    await resetWorkflowState(studentToken);
    await ensureApprovedFinalProjectRegistration(studentToken, coordinatorToken);
    await runStudentGuidanceUiFlow(cdp, studentToken, lecturerToken);
    await runLecturerGuidanceUiFlow(cdp, lecturerToken);
    await runStudentExamAndRevisionUiFlow(cdp, studentToken, lecturerToken);
    await runLecturerRevisionGateReadUiFlow(cdp);
    await runCoordinatorRevisionReadUiFlow(cdp);
    await runAdminAuditExportUiFlow(cdp);
  } finally {
    if (browser?.cdp) await browser.cdp.close().catch(() => undefined);
    await stopProcessTree(browser?.child);
    await stopProcessTree(frontend);
    await stopProcessTree(backend);
  }

  console.table(checks);
  const failed = checks.filter((check) => check.result !== "PASS");
  if (failed.length > 0) {
    console.error(`Student workflow PostgreSQL UI QA failed: ${failed.length} check(s).`);
    process.exitCode = 1;
    return;
  }

  console.log(`Student workflow PostgreSQL UI QA passed: ${checks.length} checks.`);
};

main().catch((error) => {
  if (checks.length > 0) {
    console.table(checks);
  }
  console.error(error instanceof Error ? error.message || error.stack : String(error));
  process.exitCode = 1;
});
