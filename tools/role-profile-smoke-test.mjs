import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { spawn } from "node:child_process";

const apiBaseUrl =
  process.env.ROLE_PROFILE_QA_API_BASE_URL ||
  process.env.API_BASE_URL ||
  "http://127.0.0.1:4000/api/v1";
const frontendUrl =
  process.env.ROLE_PROFILE_QA_FRONTEND_URL ||
  process.env.FRONTEND_URL ||
  "http://127.0.0.1:5173";
const adminIdentifier =
  process.env.ROLE_PROFILE_QA_ADMIN_IDENTIFIER || "admin";
const adminPassword =
  process.env.ROLE_PROFILE_QA_ADMIN_PASSWORD || "AdminLocal115!";
const qaTempPassword =
  process.env.ROLE_PROFILE_QA_TEMP_PASSWORD || "Qa119Temp!";
const qaActivePassword =
  process.env.ROLE_PROFILE_QA_ACTIVE_PASSWORD || "Qa119Pass!";
const cdpPort =
  process.env.ROLE_PROFILE_QA_CDP_PORT ||
  String(9500 + Math.floor(Math.random() * 400));
const browserUserDataDir =
  process.env.ROLE_PROFILE_QA_BROWSER_DIR ||
  path.join(os.tmpdir(), `pharmsita-role-profile-browser-${Date.now()}`);
const reportPath =
  process.env.ROLE_PROFILE_QA_REPORT_PATH ||
  path.join(os.tmpdir(), "pharmsita-role-profile-smoke-report.json");
const isLocalApi = (() => {
  try {
    const hostname = new URL(apiBaseUrl).hostname;
    return ["127.0.0.1", "localhost", "::1"].includes(hostname);
  } catch {
    return false;
  }
})();

const chromeCandidates =
  process.platform === "win32"
    ? [
        process.env.CHROME_PATH,
        "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
        "C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe",
        "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
      ].filter(Boolean)
    : [
        process.env.CHROME_PATH,
        "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
        "/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge",
        "/usr/bin/google-chrome",
        "/usr/bin/chromium-browser",
        "/usr/bin/chromium",
      ].filter(Boolean);

const checks = [];

const roleCases = [
  {
    role: "mahasiswa",
    identifier: "qa119-mahasiswa",
    name: "QA 119 Mahasiswa",
    email: "qa119.mahasiswa@pharmsita.local",
    route: "mahasiswa/detail-profil",
    title: "Profil Saya",
    phone: "081211900111",
    address: "Alamat QA Task 119 Mahasiswa",
    profile: {
      nim: "QA119MHS",
      programStudi: "S1 Farmasi",
      angkatan: "2022",
      kelas: "Reguler A",
      skemaTA: "Skripsi",
      jenisTA: "Eksperimental",
    },
  },
  {
    role: "dosen",
    identifier: "qa119-dosen",
    name: "QA 119 Dosen",
    email: "qa119.dosen@pharmsita.local",
    route: "dosen/profil",
    title: "Profil Dosen",
    phone: "081211900222",
    address: "Alamat QA Task 119 Dosen",
    profile: {
      nidn: "QA119DSN",
      programStudi: "S1 Farmasi",
      bidangKeahlian: ["Farmasetika", "QA Profile"],
      jabatanAkademik: "Lektor",
      peranSistem: ["Pembimbing", "Penguji"],
    },
  },
  {
    role: "koordinator",
    identifier: "qa119-koordinator",
    name: "QA 119 Koordinator",
    email: "qa119.koordinator@pharmsita.local",
    route: "kordinator/profil",
    title: "Profil Koordinator",
    phone: "081211900333",
    address: "Alamat QA Task 119 Koordinator",
    profile: {
      jabatan: "Koordinator TA QA",
      programStudi: "S1 Farmasi",
      hakAksesUtama: ["Validasi Persyaratan", "Monitoring TA"],
    },
  },
  {
    role: "admin",
    identifier: adminIdentifier,
    name: "Admin PharmSITA",
    route: "admin/profil",
    title: "Profil Administrator",
    phone: "081211900444",
    address: "Alamat QA Task 119 Admin",
    password: adminPassword,
  },
];

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

    await sleep(250);
  }

  throw new Error(
    `${label} timed out.${lastError ? ` Last error: ${lastError.message}` : ""}`
  );
};

const request = async (
  method,
  pathName,
  { token, body, expectedStatus = 200 } = {}
) => {
  const headers = { Accept: "application/json" };
  if (token) headers.Authorization = `Bearer ${token}`;
  if (body !== undefined) headers["Content-Type"] = "application/json";

  const response = await fetch(`${apiBaseUrl}${pathName}`, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const text = await response.text();
  const payload = text ? JSON.parse(text) : null;

  if (response.status !== expectedStatus) {
    throw new Error(
      `${method} ${pathName} expected ${expectedStatus}, got ${response.status}: ${text}`
    );
  }

  return payload;
};

const login = (identifier, password) =>
  request("POST", "/auth/login", {
    body: { identifier, password },
  });

const completeFirstLoginIfNeeded = async (identifier, temporaryPassword) => {
  const loginPayload = await login(identifier, temporaryPassword);

  if (!loginPayload.requiresFirstLogin) {
    return loginPayload;
  }

  const role = loginPayload.availableRoles?.[0] || "mahasiswa";
  return request("POST", "/auth/first-login", {
    body: {
      loginChallengeId: loginPayload.loginChallengeId,
      role,
      newPassword: qaActivePassword,
    },
  });
};

const ensureQaUsers = async () => {
  const adminSession = await login(adminIdentifier, adminPassword);
  const adminToken = adminSession.accessToken;
  addCheck("Admin login for QA fixture setup", Boolean(adminToken), adminIdentifier);

  const users = await request("GET", "/admin/users", { token: adminToken });
  const existingUsers = users.data || [];

  for (const item of roleCases.filter((roleCase) => roleCase.role !== "admin")) {
    const existing = existingUsers.find((user) => user.identifier === item.identifier);
    const payload = {
      name: item.name,
      identifier: item.identifier,
      role: item.role,
      status: "Aktif",
      email: item.email,
      phone: item.phone,
      address: item.address,
      ...item.profile,
    };

    let record;
    if (existing) {
      const updated = await request("PATCH", `/admin/users/${encodeURIComponent(existing.id)}`, {
        token: adminToken,
        body: payload,
      });
      const reset = await request(
        "POST",
        `/admin/users/${encodeURIComponent(existing.id)}/reset-password`,
        {
          token: adminToken,
          body: { password: qaTempPassword },
        }
      );
      record = reset.data || updated.data;
      addCheck(`QA fixture reset: ${item.role}`, true, item.identifier);
    } else {
      const created = await request("POST", "/admin/users", {
        token: adminToken,
        expectedStatus: 201,
        body: {
          ...payload,
          password: qaTempPassword,
        },
      });
      record = created.data;
      addCheck(`QA fixture created: ${item.role}`, true, item.identifier);
    }

    await completeFirstLoginIfNeeded(item.identifier, qaTempPassword);
    const activeLogin = await login(item.identifier, qaActivePassword);
    addCheck(
      `QA fixture active login: ${item.role}`,
      activeLogin.user?.passwordStatus === "active" &&
        Boolean(activeLogin.accessToken) &&
        Boolean(record?.id),
      item.identifier
    );
  }
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

const spawnLogged = (command, args) => {
  const child = spawn(command, args, {
    stdio: ["ignore", "pipe", "pipe"],
    windowsHide: true,
  });
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
  }
};

const createCdp = async (webSocketDebuggerUrl) => {
  const ws = new WebSocket(webSocketDebuggerUrl);
  let id = 0;
  const pending = new Map();

  ws.onmessage = (event) => {
    const message = JSON.parse(event.data);
    if (!message.id || !pending.has(message.id)) return;

    const { resolve, reject, timer } = pending.get(message.id);
    clearTimeout(timer);
    pending.delete(message.id);

    if (message.error) {
      reject(new Error(JSON.stringify(message.error)));
      return;
    }

    resolve(message.result);
  };

  await new Promise((resolve, reject) => {
    ws.onopen = resolve;
    ws.onerror = reject;
    setTimeout(() => reject(new Error("CDP websocket open timed out")), 5000);
  });

  const send = (method, params = {}, timeoutMs = 10_000) =>
    new Promise((resolve, reject) => {
      const callId = ++id;
      const timer = setTimeout(() => {
        if (pending.has(callId)) {
          pending.delete(callId);
          reject(new Error(`CDP command timed out: ${method}`));
        }
      }, timeoutMs);

      pending.set(callId, { resolve, reject, timer });
      ws.send(JSON.stringify({ id: callId, method, params }));
    });

  const evaluate = async (expression, timeoutMs = 10_000) => {
    const result = await send(
      "Runtime.evaluate",
      {
        expression,
        awaitPromise: true,
        returnByValue: true,
      },
      timeoutMs
    );

    if (result.exceptionDetails) {
      throw new Error(JSON.stringify(result.exceptionDetails));
    }

    return result.result.value;
  };

  return {
    send,
    evaluate,
    close: () => ws.close(),
  };
};

const waitForCdp = (cdp, label, expression, timeoutMs = 20_000) =>
  waitFor(
    label,
    async () =>
      cdp.evaluate(
        `(() => { try { return Boolean(${expression}); } catch { return false; } })()`,
        5000
      ),
    timeoutMs
  );

const installQaHelpers = async (cdp) => {
  await cdp.evaluate(`
    window.__qa = {
      bodyText: () => document.body?.innerText || "",
      clickText: (selector, text) => {
        const el = [...document.querySelectorAll(selector)]
          .find((item) => item.innerText.trim() === text);
        if (!el) throw new Error("Unable to find " + selector + " with text " + text);
        el.click();
      },
      setInput: (selector, value) => {
        const el = document.querySelector(selector);
        if (!el) throw new Error("Unable to find input " + selector);
        const proto = el instanceof HTMLTextAreaElement
          ? HTMLTextAreaElement.prototype
          : HTMLInputElement.prototype;
        const setter = Object.getOwnPropertyDescriptor(proto, "value").set;
        setter.call(el, value);
        el.dispatchEvent(new Event("input", { bubbles: true }));
        el.dispatchEvent(new Event("change", { bubbles: true }));
      },
    };
    true;
  `);
};

const runRoleInBrowser = async (cdp, item) => {
  await cdp.send("Page.navigate", { url: `${frontendUrl}/#/login` });
  await waitForCdp(
    cdp,
    `${item.role} login form`,
    `document.body && document.querySelector('input[name="username"]')`
  );
  await installQaHelpers(cdp);
  await cdp.evaluate("localStorage.clear(); sessionStorage.clear(); true");
  await cdp.send("Page.navigate", { url: `${frontendUrl}/#/login` });
  await waitForCdp(
    cdp,
    `${item.role} login form after clear`,
    `document.body && document.querySelector('input[name="username"]')`
  );
  await installQaHelpers(cdp);
  await cdp.evaluate(`
    __qa.setInput('input[name="username"]', ${JSON.stringify(item.identifier)});
    __qa.setInput('input[name="password"]', ${JSON.stringify(
      item.password || qaActivePassword
    )});
    document.querySelector('button[type="submit"]').click();
    true;
  `);
  await waitForCdp(
    cdp,
    `${item.role} login result`,
    `document.body && (location.hash !== '#/login' || __qa.bodyText().includes('Pilih Role'))`,
    15_000
  );

  const hasRoleSelection = await cdp.evaluate(
    `Boolean(document.body && __qa.bodyText().includes('Pilih Role'))`
  );
  if (hasRoleSelection) {
    await cdp.evaluate("__qa.clickText('button', 'LANJUT'); true;");
    await waitForCdp(
      cdp,
      `${item.role} role selection redirect`,
      `document.body && location.hash !== '#/login'`,
      10_000
    );
  }

  await cdp.send("Page.navigate", { url: `${frontendUrl}/#/${item.route}` });
  await waitForCdp(
    cdp,
    `${item.role} profile page`,
    `document.body && __qa.bodyText().includes(${JSON.stringify(item.title)})`
  );
  await installQaHelpers(cdp);
  const loadingButtonSeen = await cdp.evaluate(
    `Boolean(document.body && __qa.bodyText().includes('Memuat Profil...'))`
  );
  await waitForCdp(
    cdp,
    `${item.role} edit button ready`,
    `document.body && (() => {
      const button = [...document.querySelectorAll('button')]
        .find((el) => el.innerText.trim() === 'Edit Informasi Profil');
      return !!button && !button.disabled;
    })()`
  );
  await cdp.evaluate("__qa.clickText('button', 'Edit Informasi Profil'); true;");
  await waitForCdp(
    cdp,
    `${item.role} edit form`,
    `document.body && __qa.bodyText().includes('Formulir Edit Informasi Profil')`,
    8000
  );
  await sleep(700);
  const stillEditingAfterGuardWindow = await cdp.evaluate(
    `Boolean(document.body && __qa.bodyText().includes('Formulir Edit Informasi Profil'))`
  );
  await cdp.evaluate(`
    __qa.setInput('input[type="tel"]', ${JSON.stringify(item.phone)});
    __qa.setInput('textarea', ${JSON.stringify(item.address)});
    __qa.clickText('button', 'Simpan Perubahan');
    true;
  `);
  await waitForCdp(
    cdp,
    `${item.role} saved view`,
    `document.body && !__qa.bodyText().includes('Formulir Edit Informasi Profil') && __qa.bodyText().includes(${JSON.stringify(item.phone)})`,
    15_000
  );
  await cdp.send("Page.reload");
  await waitForCdp(
    cdp,
    `${item.role} reload persisted view`,
    `document.body && document.body.innerText.includes(${JSON.stringify(item.phone)}) && document.body.innerText.includes(${JSON.stringify(item.address)})`,
    15_000
  );

  const tokenJson = await cdp.evaluate("localStorage.getItem('auth_token')");
  const token = JSON.parse(tokenJson).token;
  const profile = await request("GET", "/auth/profile", { token });
  const apiMatches =
    profile.user?.phone === item.phone && profile.user?.address === item.address;

  return {
    role: item.role,
    route: item.route,
    loadingButtonSeen,
    stillEditingAfterGuardWindow,
    saveViewOk: true,
    reloadPersistOk: true,
    apiMatches,
  };
};

const runBrowserMatrix = async () => {
  const chromePath = await findChrome();
  const browser = spawnLogged(chromePath, [
    "--headless=new",
    `--remote-debugging-port=${cdpPort}`,
    `--user-data-dir=${browserUserDataDir}`,
    "--disable-gpu",
    "--disable-gpu-sandbox",
    "--disable-accelerated-2d-canvas",
    "--disable-accelerated-video-decode",
    "--disable-background-networking",
    "--disable-component-extensions-with-background-pages",
    "--disable-extensions",
    "--disable-features=CalculateNativeWinOcclusion",
    "--disable-dev-shm-usage",
    "--no-sandbox",
    "--use-angle=warp",
    "--no-first-run",
    "--no-default-browser-check",
    "about:blank",
  ]);

  try {
    const targets = await waitFor("Chrome CDP", async () => {
      const response = await fetch(`http://127.0.0.1:${cdpPort}/json/list`);
      if (!response.ok) return null;
      return response.json();
    });
    const target =
      targets.find((item) => item.type === "page" && item.url === "about:blank") ||
      targets.find((item) => item.type === "page");

    if (!target?.webSocketDebuggerUrl) {
      throw new Error("No CDP page target available.");
    }

    const cdp = await createCdp(target.webSocketDebuggerUrl);
    try {
      await cdp.send("Page.enable");
      await cdp.send("Runtime.enable");
      await cdp.send("Emulation.setDeviceMetricsOverride", {
        width: 1440,
        height: 1050,
        deviceScaleFactor: 1,
        mobile: false,
      });

      const results = [];
      for (const item of roleCases) {
        results.push(await runRoleInBrowser(cdp, item));
      }
      return results;
    } finally {
      cdp.close();
    }
  } catch (error) {
    throw new Error(
      `${error.message}\nBrowser output tail:\n${browser.getOutput()}`
    );
  } finally {
    await stopProcessTree(browser);
  }
};

const main = async () => {
  if (!isLocalApi && !process.env.ROLE_PROFILE_QA_ADMIN_PASSWORD) {
    throw new Error(
      "ROLE_PROFILE_QA_ADMIN_PASSWORD is required when API target is not localhost."
    );
  }

  console.log(`Role profile smoke target API: ${apiBaseUrl}`);
  console.log(`Role profile smoke target UI: ${frontendUrl}`);

  await request("GET", "/health");
  addCheck("API liveness", true, "/health");
  await request("GET", "/health/ready");
  addCheck("API readiness", true, "/health/ready");

  await ensureQaUsers();
  const matrix = await runBrowserMatrix();

  for (const result of matrix) {
    addCheck(
      `UI profile save/reload/API match: ${result.role}`,
      result.stillEditingAfterGuardWindow &&
        result.saveViewOk &&
        result.reloadPersistOk &&
        result.apiMatches,
      `route=${result.route}; loadingButtonSeen=${result.loadingButtonSeen}`
    );
  }

  const report = {
    generatedAt: new Date().toISOString(),
    apiBaseUrl,
    frontendUrl,
    checks,
    matrix,
  };
  await fs.writeFile(reportPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");

  console.table(checks);
  const failed = checks.filter((check) => check.result !== "PASS");
  if (failed.length > 0) {
    console.error(`Role profile smoke failed: ${failed.length} check(s) failed.`);
    console.error(`Report: ${reportPath}`);
    process.exit(1);
  }

  console.log(`Role profile smoke passed: ${checks.length} checks.`);
  console.log(`Report: ${reportPath}`);
};

main().catch((error) => {
  console.error(`Role profile smoke failed: ${error.message}`);
  process.exit(1);
});
