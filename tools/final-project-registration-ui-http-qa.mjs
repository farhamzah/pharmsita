import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawn } from "node:child_process";

const scriptPath = fileURLToPath(import.meta.url);
const defaultWindowsChrome = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";

if (process.platform === "win32" && !process.env.CHROME_PATH) {
  console.error(
    `Set CHROME_PATH before running this QA harness, for example:\n` +
      `$env:CHROME_PATH='${defaultWindowsChrome}'\n` +
      `node ${scriptPath}`
  );
  process.exit(1);
}

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const apiPort = process.env.FINAL_PROJECT_UI_QA_API_PORT || "4110";
const frontendPort = process.env.FINAL_PROJECT_UI_QA_FRONTEND_PORT || "5174";
const cdpPort =
  process.env.FINAL_PROJECT_UI_QA_CDP_PORT ||
  String(9300 + Math.floor(Math.random() * 500));
const apiPrefix = process.env.API_PREFIX || "/api/v1";
const apiBaseUrl = `http://127.0.0.1:${apiPort}${apiPrefix}`;
const frontendUrl = `http://127.0.0.1:${frontendPort}`;
const databaseFile =
  process.env.FINAL_PROJECT_UI_QA_DATABASE_FILE ||
  path.join(os.tmpdir(), `pharmsita-ui-final-project-${Date.now()}.json`);
const browserUserDataDir =
  process.env.FINAL_PROJECT_UI_QA_BROWSER_DIR ||
  path.join(os.tmpdir(), `pharmsita-ui-browser-${Date.now()}`);

const chromeCandidates = [
  process.env.CHROME_PATH,
  "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
  "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
  "C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe",
].filter(Boolean);

const checks = [];

const addCheck = (name, passed, detail = "") => {
  checks.push({
    name,
    result: passed ? "PASS" : "FAIL",
    detail,
  });
};

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const waitFor = async (label, fn, timeoutMs = 20_000) => {
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

const loginApi = async (identifier) => {
  const payload = await request("POST", `${apiBaseUrl}/auth/login`, {
    body: { identifier, password: "demo" },
  });
  return payload.accessToken;
};

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
    output = output.slice(-6000);
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
          killer = spawn(
            "taskkill",
            ["/pid", String(child.pid), "/T", "/F"],
            { stdio: "ignore", windowsHide: true }
          );
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
  await fs.mkdir(path.dirname(databaseFile), { recursive: true });

  const child = spawnLogged(process.execPath, ["backend/dist/server.js"], {
    cwd: rootDir,
    env: {
      ...process.env,
      DB_ADAPTER: "json",
      DATABASE_FILE: databaseFile,
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
      const response = await fetch(`${apiBaseUrl}/health`).catch(() => null);
      return response?.status === 200;
    });
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
    [
      viteBin,
      "--host",
      "127.0.0.1",
      "--port",
      frontendPort,
      "--strictPort",
    ],
    {
      cwd: rootDir,
      env: {
        ...process.env,
        VITE_API_MODE: "http",
        VITE_API_BASE_URL: apiBaseUrl,
        VITE_DEMO_MODE: "false",
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
  } catch (error) {
    await stopProcessTree(child);
    throw error;
  }

  return child;
};

class CdpClient {
  constructor(wsUrl) {
    this.ws = new WebSocket(wsUrl);
    this.nextId = 1;
    this.pending = new Map();
    this.dialogs = [];
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
        this.dialogs.push(message.params.message);
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
  console.log(`Final project UI HTTP QA browser: ${chromePath}`);
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
    {
      cwd: rootDir,
      env: {
        ...process.env,
        CHROME_PATH: chromePath,
      },
    }
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
    throw new Error(result.exceptionDetails.text || "Runtime evaluation failed.");
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

const waitForPageCondition = (cdp, label, expression, timeoutMs = 20_000) =>
  waitFor(label, () => evaluate(cdp, expression), timeoutMs);

const formHelpers = `
  (() => {
    window.__lastAlert = "";
    window.alert = (message) => { window.__lastAlert = String(message || ""); };
    window.confirm = () => true;
    window.__qa = {
      setInput(selector, value) {
        const element = document.querySelector(selector);
        if (!element) throw new Error("Missing input: " + selector);
        const proto = element instanceof HTMLTextAreaElement
          ? HTMLTextAreaElement.prototype
          : HTMLInputElement.prototype;
        Object.getOwnPropertyDescriptor(proto, "value").set.call(element, value);
        element.dispatchEvent(new Event("input", { bubbles: true }));
      },
      setSelectByOptionText(fragment) {
        const select = Array.from(document.querySelectorAll("select")).find((item) =>
          Array.from(item.options).some((option) => option.textContent.includes(fragment))
        );
        if (!select) throw new Error("Missing select option containing: " + fragment);
        const option = Array.from(select.options).find((item) =>
          item.textContent.includes(fragment)
        );
        Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, "value").set.call(
          select,
          option.value
        );
        select.dispatchEvent(new Event("change", { bubbles: true }));
      },
      clickText(tag, text) {
        const element = Array.from(document.querySelectorAll(tag)).find((item) =>
          item.textContent.includes(text)
        );
        if (!element) throw new Error("Missing " + tag + " text: " + text);
        element.click();
      },
      bodyText() {
        return document.body.innerText;
      }
    };
    return true;
  })()
`;

const loginViaUi = async (cdp, identifier) => {
  await navigate(cdp, `${frontendUrl}/#/login`);
  await evaluate(cdp, "localStorage.clear(); true");
  await navigate(cdp, `${frontendUrl}/#/login`);
  await evaluate(cdp, formHelpers);
  await evaluate(
    cdp,
    `__qa.setInput('input[name="username"]', ${JSON.stringify(identifier)});
     __qa.setInput('input[name="password"]', 'demo');
     document.querySelector('form').requestSubmit();
     true;`
  );
};

const runStudentFlow = async (cdp) => {
  const title = "QA HTTP Mode - Formulasi Gel Ekstrak Daun Sirih";
  const description =
    "Rencana penelitian QA HTTP mode untuk memastikan submit pendaftaran TA berjalan dari UI ke backend.";

  await loginViaUi(cdp, "mahasiswa");
  await waitForPageCondition(
    cdp,
    "student dashboard route",
    "location.hash === '#/mahasiswa'"
  );
  await waitForPageCondition(
    cdp,
    "student registration CTA",
    "__qa.bodyText().includes('Ajukan Pendaftaran')"
  );
  addCheck("UI login mahasiswa HTTP mode", true, "route=#/mahasiswa");

  const browserMasterData = await evaluate(
    cdp,
    `(async () => {
      const raw = localStorage.getItem('auth_token');
      const token = raw ? JSON.parse(raw).token : '';
      const response = await fetch(${JSON.stringify(`${apiBaseUrl}/master/thesis-types`)}, {
        headers: token ? { Authorization: 'Bearer ' + token } : {}
      });
      const payload = await response.json().catch(() => null);
      return { status: response.status, first: payload?.data?.[0] || null };
    })()`
  );
  addCheck(
    "Browser public master thesis types",
    browserMasterData.status === 200 && browserMasterData.first?.id === "thesis_type_01",
    `status=${browserMasterData.status}; first=${browserMasterData.first?.id || "-"}`
  );
  const browserLecturers = await evaluate(
    cdp,
    `(async () => {
      const raw = localStorage.getItem('auth_token');
      const token = raw ? JSON.parse(raw).token : '';
      const response = await fetch(${JSON.stringify(`${apiBaseUrl}/master/lecturers`)}, {
        headers: token ? { Authorization: 'Bearer ' + token } : {}
      });
      const payload = await response.json().catch(() => null);
      return { status: response.status, first: payload?.data?.[0] || null };
    })()`
  );
  addCheck(
    "Browser public lecturer directory",
    browserLecturers.status === 200 && browserLecturers.first?.id === "usr_dosen_01",
    `status=${browserLecturers.status}; first=${browserLecturers.first?.id || "-"}`
  );

  await evaluate(cdp, "__qa.clickText('button', 'Ajukan Pendaftaran'); true");
  await waitForPageCondition(
    cdp,
    "student registration form",
    "__qa.bodyText().includes('Formulir Pengajuan Pendaftaran TA')"
  );

  await evaluate(
    cdp,
    `__qa.setInput('input[placeholder="https://drive.google.com/drive/folders/..."]', 'https://drive.google.com/drive/folders/task39-ui-qa');
     __qa.setInput('textarea[placeholder^="Contoh:"]', ${JSON.stringify(title)});
     __qa.setInput('textarea[placeholder^="Jelaskan secara singkat"]', ${JSON.stringify(description)});
     __qa.setSelectByOptionText('Dr. Budi Harto');
     __qa.clickText('button', 'Kirim Pendaftaran TA');
     true;`
  );

  await waitForPageCondition(
    cdp,
    "student submitted history",
    `__qa.bodyText().includes(${JSON.stringify(title)}) && __qa.bodyText().includes('Menunggu Validasi')`
  );
  addCheck("UI mahasiswa submit pendaftaran TA", true, title);

  return { title };
};

const runCoordinatorFlow = async (cdp, registrationId, title) => {
  await loginViaUi(cdp, "kordinator");
  await waitForPageCondition(
    cdp,
    "coordinator dashboard route",
    "location.hash === '#/kordinator'"
  );
  addCheck("UI login koordinator HTTP mode", true, "route=#/kordinator");

  await navigate(cdp, `${frontendUrl}/#/kordinator/pengajuan`);
  await waitForPageCondition(
    cdp,
    "coordinator list contains registration",
    `__qa.bodyText().includes(${JSON.stringify(title)})`
  );
  addCheck("UI koordinator list membaca pendaftaran TA", true, title);

  await navigate(cdp, `${frontendUrl}/#/kordinator/pengajuan/detail/${registrationId}`);
  await waitForPageCondition(
    cdp,
    "coordinator detail contains registration",
    `__qa.bodyText().includes(${JSON.stringify(title)}) && __qa.bodyText().includes('Keputusan Koordinator')`
  );
  addCheck("UI koordinator detail membaca pendaftaran TA", true, registrationId);

  await evaluate(
    cdp,
    `__qa.clickText('label', 'Setujui Pengajuan');
     __qa.clickText('button', 'Setujui & Tetapkan Pembimbing');
     true;`
  );
  await waitForPageCondition(
    cdp,
    "coordinator approval back to list",
    "location.hash === '#/kordinator/pengajuan'"
  );
  addCheck("UI koordinator approve pendaftaran TA", true, "status=Disetujui");
};

const main = async () => {
  console.log(`Final project UI HTTP QA target frontend: ${frontendUrl}`);
  console.log(`Final project UI HTTP QA target API: ${apiBaseUrl}`);
  console.log(`Final project UI HTTP QA database file: ${databaseFile}`);

  let backend = null;
  let frontend = null;
  let browser = null;

  try {
    backend = await startBackend();
    frontend = await startFrontend();
    browser = await startBrowser();

    const { cdp } = browser;
    const { title } = await runStudentFlow(cdp);

    const studentToken = await loginApi("mahasiswa");
    const submitted = await request(
      "GET",
      `${apiBaseUrl}/students/me/final-project-registration`,
      { token: studentToken }
    );
    const registration = submitted.data;
    addCheck(
      "API state setelah submit UI",
      registration?.status === "Menunggu Validasi Koordinator" &&
        registration?.judulTA === title,
      registration?.status || "-"
    );
    addCheck(
      "API state submit UI membawa thesisTypeId",
      Boolean(registration?.thesisTypeId && registration?.thesisTypeName),
      `thesisTypeId=${registration?.thesisTypeId || "-"}; thesisTypeName=${registration?.thesisTypeName || "-"}`
    );
    addCheck(
      "API state submit UI membawa requestedSupervisor1Id",
      registration?.requestedSupervisor1Id === "usr_dosen_01" &&
        registration?.requestedSupervisor1Name === "Dr. Budi Harto, M.Farm.",
      `requestedSupervisor1Id=${registration?.requestedSupervisor1Id || "-"}; requestedSupervisor1Name=${registration?.requestedSupervisor1Name || "-"}`
    );

    const coordinatorToken = await loginApi("kordinator");
    const list = await request(
      "GET",
      `${apiBaseUrl}/coordinator/final-project-registrations?status=${encodeURIComponent(
        "Menunggu Validasi Koordinator"
      )}`,
      { token: coordinatorToken }
    );
    addCheck(
      "API koordinator list setelah submit UI",
      list.data.some((item) => item.id === registration.id),
      `items=${list.data.length}`
    );

    await runCoordinatorFlow(cdp, registration.id, title);

    const approved = await request(
      "GET",
      `${apiBaseUrl}/coordinator/final-project-registrations/${registration.id}`,
      { token: coordinatorToken }
    );
    addCheck(
      "API state setelah approve UI",
      approved.data.status === "Disetujui" &&
        approved.data.supervisorAssignments?.length === 2,
      `status=${approved.data.status}; assignments=${approved.data.supervisorAssignments?.length || 0}`
    );

    const progress = await request(
      "GET",
      `${apiBaseUrl}/coordinator/students/usr_mhs_01/progress`,
      { token: coordinatorToken }
    );
    const registrationStep = progress.data.find((step) => step.id === "pendaftaran-ta");
    addCheck(
      "Progress pendaftaran TA completed setelah approve UI",
      registrationStep?.status === "completed",
      registrationStep?.status || "-"
    );
  } finally {
    if (browser?.cdp) await browser.cdp.close().catch(() => undefined);
    await stopProcessTree(browser?.child);
    await stopProcessTree(frontend);
    await stopProcessTree(backend);
  }

  console.table(checks);
  const failed = checks.filter((check) => check.result !== "PASS");
  if (failed.length > 0) {
    console.error(`Final project UI HTTP QA failed: ${failed.length} check(s).`);
    process.exitCode = 1;
    return;
  }

  console.log(`Final project UI HTTP QA passed: ${checks.length} checks.`);
};

main().catch((error) => {
  if (checks.length > 0) {
    console.table(checks);
  }
  console.error(error instanceof Error ? error.message || error.stack : String(error));
  process.exitCode = 1;
});
