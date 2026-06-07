import fs from "node:fs/promises";
import path from "node:path";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

const usage = `Usage:
  npm.cmd run release:production-evidence:run -- --release-id task113-test --dry-run --force
  npm run release:production-evidence:run -- --release-id <release-id> --release-dir /var/www/pharmsita/current --release-archive /var/www/pharmsita/releases/<release-id>.tar.gz --artifact-checksums /var/www/pharmsita/releases/artifact-checksums.sha256 --current-symlink /var/www/pharmsita/current --database-url "$DATABASE_URL" --backup-manifest /var/backups/pharmsita/postgres/<backup>.manifest.json --api-base-url https://pharmsita.example.ac.id/api/v1 --frontend-url https://pharmsita.example.ac.id --operator "<nama-operator>" --reviewer "<nama-reviewer>" --signer "<nama-approver>" --execute --force

Options:
  --release-id <value>              Release ID being validated.
  --release-dir <path>              Active release directory. Default: current directory.
  --release-archive <path>          Release archive path.
  --artifact-checksums <path>       artifact-checksums.sha256 path.
  --current-symlink <path>          Current symlink path. Default: /var/www/pharmsita/current.
  --database-url <url>              PostgreSQL URL. Default: DATABASE_URL.
  --backup-manifest <path>          Verified backup manifest path.
  --api-base-url <url>              Production API base URL. Default: API_BASE_URL.
  --frontend-url <url>              Production frontend URL.
  --operator <name>                 Operator name/identifier.
  --reviewer <name>                 Reviewer name/identifier.
  --signer <name>                   Final approver name/identifier.
  --work-dir <path>                 Output root. Default: releases/production-evidence-run.
  --evidence-dir <path>             Evidence output directory. Default: <work-dir>/evidence.
  --review-dir <path>               Review output directory. Default: <work-dir>/review.
  --remediation-dir <path>          Remediation output directory. Default: <work-dir>/remediation.
  --signoff-dir <path>              Sign-off output directory. Default: <work-dir>/signoff.
  --service-name <name>             systemd service name. Default: pharmsita-backend.
  --allow-http                      Allow HTTP URLs for staging.
  --allow-degraded-readiness        Treat degraded readiness as WARN in network checks.
  --allow-placeholder-domain        Allow example/localhost URLs for documentation or staging drills.
  --skip-system                     Skip systemd/nginx raw system evidence.
  --skip-network                    Skip HTTPS/domain checks.
  --skip-db                         Skip backup gate and DB smoke checks.
  --allow-incomplete                Continue local/incomplete run and allow blocked review/sign-off.
  --execute                         Execute the chain. Without this, only command packet is written.
  --dry-run                         Alias for default non-executing mode.
  --force                           Replace existing output directory/files.
  --help                            Show this help.
`;

const pathExists = async (filename) => {
  try {
    await fs.access(filename);
    return true;
  } catch {
    return false;
  }
};

const readJson = async (filename) => JSON.parse(await fs.readFile(filename, "utf8"));

const parseArgs = (argv) => {
  const options = {
    releaseId: "",
    releaseDir: rootDir,
    releaseArchive: "",
    artifactChecksums: "",
    currentSymlink: "/var/www/pharmsita/current",
    databaseUrl: process.env.DATABASE_URL || "",
    backupManifest: "",
    apiBaseUrl: (process.env.API_BASE_URL || "").replace(/\/$/, ""),
    frontendUrl: "",
    operator: "",
    reviewer: "",
    signer: "",
    workDir: path.join(rootDir, "releases", "production-evidence-run"),
    evidenceDir: "",
    reviewDir: "",
    remediationDir: "",
    signoffDir: "",
    serviceName: "pharmsita-backend",
    allowHttp: false,
    allowDegradedReadiness: false,
    allowPlaceholderDomain: false,
    skipSystem: false,
    skipNetwork: false,
    skipDb: false,
    allowIncomplete: false,
    execute: false,
    force: false,
    help: false,
  };

  const args = [...argv];
  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    if (arg === "--release-id") {
      options.releaseId = args[++index] || "";
    } else if (arg === "--release-dir") {
      options.releaseDir = path.resolve(args[++index] || "");
    } else if (arg === "--release-archive") {
      options.releaseArchive = path.resolve(args[++index] || "");
    } else if (arg === "--artifact-checksums") {
      options.artifactChecksums = path.resolve(args[++index] || "");
    } else if (arg === "--current-symlink") {
      options.currentSymlink = args[++index] || "";
    } else if (arg === "--database-url") {
      options.databaseUrl = args[++index] || "";
    } else if (arg === "--backup-manifest") {
      options.backupManifest = path.resolve(args[++index] || "");
    } else if (arg === "--api-base-url") {
      options.apiBaseUrl = (args[++index] || "").replace(/\/$/, "");
    } else if (arg === "--frontend-url") {
      options.frontendUrl = (args[++index] || "").replace(/\/$/, "");
    } else if (arg === "--operator") {
      options.operator = args[++index] || "";
    } else if (arg === "--reviewer") {
      options.reviewer = args[++index] || "";
    } else if (arg === "--signer") {
      options.signer = args[++index] || "";
    } else if (arg === "--work-dir") {
      options.workDir = path.resolve(args[++index] || "");
    } else if (arg === "--evidence-dir") {
      options.evidenceDir = path.resolve(args[++index] || "");
    } else if (arg === "--review-dir") {
      options.reviewDir = path.resolve(args[++index] || "");
    } else if (arg === "--remediation-dir") {
      options.remediationDir = path.resolve(args[++index] || "");
    } else if (arg === "--signoff-dir") {
      options.signoffDir = path.resolve(args[++index] || "");
    } else if (arg === "--service-name") {
      options.serviceName = args[++index] || "";
    } else if (arg === "--allow-http") {
      options.allowHttp = true;
    } else if (arg === "--allow-degraded-readiness") {
      options.allowDegradedReadiness = true;
    } else if (arg === "--allow-placeholder-domain") {
      options.allowPlaceholderDomain = true;
    } else if (arg === "--skip-system") {
      options.skipSystem = true;
    } else if (arg === "--skip-network") {
      options.skipNetwork = true;
    } else if (arg === "--skip-db") {
      options.skipDb = true;
    } else if (arg === "--allow-incomplete") {
      options.allowIncomplete = true;
    } else if (arg === "--execute") {
      options.execute = true;
    } else if (arg === "--dry-run") {
      options.execute = false;
    } else if (arg === "--force") {
      options.force = true;
    } else if (arg === "--help" || arg === "-h") {
      options.help = true;
    } else {
      throw new Error(`Unknown argument: ${arg}`);
    }
  }

  options.evidenceDir = options.evidenceDir || path.join(options.workDir, "evidence");
  options.reviewDir = options.reviewDir || path.join(options.workDir, "review");
  options.remediationDir = options.remediationDir || path.join(options.workDir, "remediation");
  options.signoffDir = options.signoffDir || path.join(options.workDir, "signoff");

  return options;
};

const redactDatabaseUrl = (databaseUrl) => {
  if (!databaseUrl) return "";
  try {
    const parsed = new URL(databaseUrl);
    if (parsed.password) parsed.password = "***";
    return parsed.toString();
  } catch {
    return "<invalid database url>";
  }
};

const displayValue = (value) => {
  if (!value) return "";
  const text = String(value);
  if (text === process.env.DATABASE_URL) return "\"$DATABASE_URL\"";
  if (/^postgres(?:ql)?:\/\//i.test(text)) return "\"$DATABASE_URL\"";
  return text.includes(" ") ? `"${text.replace(/"/g, "\\\"")}"` : text;
};

const commandLine = (command) => `node ${command.script.replace(/\\/g, "/")} ${command.args.map(displayValue).join(" ")}`;

const npmLine = (script, args) => `npm run ${script} -- ${args.map(displayValue).join(" ")}`;

const pushOptional = (args, flag, value) => {
  if (value) args.push(flag, value);
};

const pushFlag = (args, flag, enabled) => {
  if (enabled) args.push(flag);
};

const baseRuntimeArgs = (options, workDir) => {
  const args = [
    "--release-dir",
    options.releaseDir,
    "--work-dir",
    workDir,
    "--service-name",
    options.serviceName,
  ];
  pushOptional(args, "--release-archive", options.releaseArchive);
  pushOptional(args, "--artifact-checksums", options.artifactChecksums);
  pushOptional(args, "--current-symlink", options.currentSymlink);
  pushOptional(args, "--database-url", options.databaseUrl);
  pushOptional(args, "--backup-manifest", options.backupManifest);
  pushOptional(args, "--api-base-url", options.apiBaseUrl);
  pushOptional(args, "--frontend-url", options.frontendUrl);
  pushFlag(args, "--allow-http", options.allowHttp);
  pushFlag(args, "--allow-degraded-readiness", options.allowDegradedReadiness);
  pushFlag(args, "--force", true);
  return args;
};

const buildCommands = (options) => {
  const liveQaArgs = baseRuntimeArgs(options, path.join(options.workDir, "live-qa"));
  pushFlag(liveQaArgs, "--require-current-symlink", Boolean(options.currentSymlink) && !options.allowIncomplete);
  pushFlag(liveQaArgs, "--require-db-gate", !options.skipDb && !options.allowIncomplete);
  pushFlag(liveQaArgs, "--require-restore-drill", !options.skipDb && !options.allowIncomplete);
  pushFlag(liveQaArgs, "--execute-system-checks", !options.skipSystem);
  pushFlag(liveQaArgs, "--require-system", !options.skipSystem && !options.allowIncomplete);
  pushFlag(liveQaArgs, "--require-network", !options.skipNetwork && !options.allowIncomplete);
  pushFlag(liveQaArgs, "--skip-system", options.skipSystem);
  pushFlag(liveQaArgs, "--skip-network", options.skipNetwork);
  pushFlag(liveQaArgs, "--skip-db", options.skipDb);

  const evidenceArgs = baseRuntimeArgs(options, options.evidenceDir);
  pushOptional(evidenceArgs, "--release-id", options.releaseId);
  pushOptional(evidenceArgs, "--operator", options.operator);
  pushOptional(evidenceArgs, "--notes", "Real VPS production evidence run");
  pushFlag(evidenceArgs, "--require-current-symlink", Boolean(options.currentSymlink) && !options.allowIncomplete);
  pushFlag(evidenceArgs, "--require-db-gate", !options.skipDb && !options.allowIncomplete);
  pushFlag(evidenceArgs, "--require-restore-drill", !options.skipDb && !options.allowIncomplete);
  pushFlag(evidenceArgs, "--execute-system-checks", !options.skipSystem);
  pushFlag(evidenceArgs, "--require-system", !options.skipSystem && !options.allowIncomplete);
  pushFlag(evidenceArgs, "--require-network", !options.skipNetwork && !options.allowIncomplete);
  pushFlag(evidenceArgs, "--skip-system", options.skipSystem);
  pushFlag(evidenceArgs, "--skip-network", options.skipNetwork);
  pushFlag(evidenceArgs, "--skip-db", options.skipDb);
  pushFlag(evidenceArgs, "--allow-incomplete", options.allowIncomplete);

  const remediationArgs = [
    "--evidence-dir",
    options.evidenceDir,
    "--output-dir",
    options.remediationDir,
    "--operator",
    options.operator || "operator",
    "--notes",
    "Generated during real VPS production evidence run",
    "--force",
  ];

  const reviewArgs = [
    "--evidence-dir",
    options.evidenceDir,
    "--remediation-dir",
    options.remediationDir,
    "--output-dir",
    options.reviewDir,
    "--reviewer",
    options.reviewer || "reviewer",
    "--operator",
    options.operator || "operator",
    "--notes",
    "Real VPS production evidence review",
    "--force",
  ];
  pushOptional(reviewArgs, "--expected-release", options.releaseId);
  pushFlag(reviewArgs, "--require-go", !options.allowIncomplete);
  pushFlag(reviewArgs, "--allow-incomplete", options.allowIncomplete);

  const signoffArgs = [
    "--evidence-dir",
    options.evidenceDir,
    "--review-dir",
    options.reviewDir,
    "--remediation-dir",
    options.remediationDir,
    "--output-dir",
    options.signoffDir,
    "--operator",
    options.operator || "operator",
    "--reviewer",
    options.reviewer || "reviewer",
    "--signer",
    options.signer || "approver",
    "--notes",
    "Final production sign-off review",
    "--force",
  ];
  pushOptional(signoffArgs, "--release-id", options.releaseId);
  pushFlag(signoffArgs, "--require-approved", !options.allowIncomplete);
  pushFlag(signoffArgs, "--allow-blocked", options.allowIncomplete);

  return [
    {
      id: "live-cutover-qa",
      title: "Live cutover QA",
      npmScript: "release:live-cutover:qa",
      script: path.join(rootDir, "tools", "vps-live-cutover-qa.mjs"),
      args: liveQaArgs,
      logFile: path.join(options.workDir, "01-live-cutover-qa.log"),
      required: true,
    },
    {
      id: "live-evidence-capture",
      title: "Live evidence capture",
      npmScript: "release:live-evidence:capture",
      script: path.join(rootDir, "tools", "vps-live-evidence-capture.mjs"),
      args: evidenceArgs,
      logFile: path.join(options.workDir, "02-live-evidence-capture.log"),
      required: true,
    },
    {
      id: "remediation-plan",
      title: "Remediation plan when evidence is not GO",
      npmScript: "release:go-no-go:remediate",
      script: path.join(rootDir, "tools", "vps-go-no-go-remediation.mjs"),
      args: remediationArgs,
      logFile: path.join(options.workDir, "03-remediation-plan.log"),
      required: false,
    },
    {
      id: "operator-review",
      title: "Operator evidence review",
      npmScript: "release:operator-evidence:review",
      script: path.join(rootDir, "tools", "vps-operator-evidence-review.mjs"),
      args: reviewArgs,
      logFile: path.join(options.workDir, "04-operator-review.log"),
      required: true,
    },
    {
      id: "production-signoff",
      title: "Production sign-off packet",
      npmScript: "release:production-signoff:packet",
      script: path.join(rootDir, "tools", "vps-production-signoff-packet.mjs"),
      args: signoffArgs,
      logFile: path.join(options.workDir, "05-production-signoff.log"),
      required: true,
    },
  ];
};

const placeholderUrl = (value) => {
  if (!value) return false;
  try {
    const parsed = new URL(value);
    return [
      "localhost",
      "127.0.0.1",
      "::1",
    ].includes(parsed.hostname) || parsed.hostname.includes("example.") || parsed.hostname.endsWith(".example");
  } catch {
    return true;
  }
};

const placeholderPath = (value) => !value || /<[^>]+>|example|placeholder/i.test(String(value));

const validateOptions = async (options) => {
  const warnings = [];
  const failures = [];

  if (!options.releaseId) warnings.push("Set --release-id to bind evidence to the expected release.");
  if (!options.operator) warnings.push("Set --operator for accountable evidence capture.");
  if (!options.reviewer) warnings.push("Set --reviewer for accountable review.");
  if (!options.signer) warnings.push("Set --signer for accountable final sign-off.");
  if (!options.releaseArchive) warnings.push("Set --release-archive to verify artifact identity.");
  if (!options.artifactChecksums) warnings.push("Set --artifact-checksums to verify artifact checksum.");
  if (options.execute && !options.allowIncomplete && !options.releaseArchive) failures.push("--release-archive is required for production execution.");
  if (options.execute && !options.allowIncomplete && !options.artifactChecksums) failures.push("--artifact-checksums is required for production execution.");
  if (options.execute && !await pathExists(options.releaseDir)) failures.push(`--release-dir was not found: ${options.releaseDir}`);
  if (options.execute && options.releaseArchive && !await pathExists(options.releaseArchive)) failures.push(`--release-archive was not found: ${options.releaseArchive}`);
  if (options.execute && options.artifactChecksums && !await pathExists(options.artifactChecksums)) failures.push(`--artifact-checksums was not found: ${options.artifactChecksums}`);
  if (!options.skipDb && !options.databaseUrl) failures.push("DATABASE_URL or --database-url is required unless --skip-db is used.");
  if (!options.skipDb && !options.backupManifest) failures.push("--backup-manifest is required unless --skip-db is used.");
  if (!options.skipDb && options.backupManifest && placeholderPath(options.backupManifest)) failures.push("--backup-manifest must be a real verified manifest path, not a placeholder.");
  if (options.execute && !options.skipDb && options.backupManifest && !await pathExists(options.backupManifest)) failures.push(`--backup-manifest was not found: ${options.backupManifest}`);
  if (!options.skipNetwork && !options.apiBaseUrl) failures.push("--api-base-url or API_BASE_URL is required unless --skip-network is used.");
  if (!options.skipNetwork && !/^https:\/\//i.test(options.apiBaseUrl) && !options.allowHttp) {
    failures.push("Production API URL must be HTTPS unless --allow-http is used for staging.");
  }
  if (!options.skipNetwork && !options.allowPlaceholderDomain && placeholderUrl(options.apiBaseUrl)) {
    failures.push("--api-base-url must be the real production domain, not example/localhost/invalid URL.");
  }
  if (!options.skipNetwork && options.frontendUrl && !options.allowPlaceholderDomain && placeholderUrl(options.frontendUrl)) {
    failures.push("--frontend-url must be the real production domain, not example/localhost/invalid URL.");
  }
  if (!options.execute) warnings.push("Dry-run only. Pass --execute on the VPS to run the evidence chain.");
  if (options.allowIncomplete) warnings.push("--allow-incomplete is for local/intake mode only; production sign-off should run without it.");

  return { warnings, failures };
};

const writePacket = async (options, commands, validation) => {
  await fs.mkdir(options.workDir, { recursive: true });
  const markdownPath = path.join(options.workDir, "REAL-VPS-EVIDENCE-RUN.md");
  const jsonPath = path.join(options.workDir, "real-vps-evidence-run.json");

  if (!options.force) {
    for (const target of [markdownPath, jsonPath]) {
      if (await pathExists(target)) {
        throw new Error(`Output already exists: ${target}. Use --force to replace it.`);
      }
    }
  }

  const generatedAt = new Date().toISOString();
  const safeInputs = {
    releaseId: options.releaseId,
    releaseDir: options.releaseDir,
    releaseArchive: options.releaseArchive,
    artifactChecksums: options.artifactChecksums,
    currentSymlink: options.currentSymlink,
    apiBaseUrl: options.apiBaseUrl,
    frontendUrl: options.frontendUrl,
    databaseUrl: redactDatabaseUrl(options.databaseUrl),
    backupManifest: options.backupManifest,
    operator: options.operator,
    reviewer: options.reviewer,
    signer: options.signer,
    workDir: options.workDir,
    evidenceDir: options.evidenceDir,
    reviewDir: options.reviewDir,
    remediationDir: options.remediationDir,
    signoffDir: options.signoffDir,
    execute: options.execute,
    allowIncomplete: options.allowIncomplete,
  };

  const markdown = `# Real VPS Production Evidence Run

Generated at: ${generatedAt}

Mode: **${options.execute ? "EXECUTE" : "DRY-RUN"}**

Release: \`${options.releaseId || "-"}\`

## Inputs

| Item | Value |
|---|---|
${Object.entries(safeInputs).map(([key, value]) => `| ${key} | \`${String(value || "-").replace(/\|/g, "\\|")}\` |`).join("\n")}

## Validation

| Type | Detail |
|---|---|
${validation.failures.map((failure) => `| FAIL | ${failure.replace(/\|/g, "\\|")} |`).join("\n")}
${validation.warnings.map((warning) => `| WARN | ${warning.replace(/\|/g, "\\|")} |`).join("\n")}
${validation.failures.length === 0 && validation.warnings.length === 0 ? "| PASS | Inputs are complete for production evidence execution. |" : ""}

## Commands

${commands.map((command, index) => `### ${index + 1}. ${command.title}

\`\`\`bash
${npmLine(command.npmScript, command.args)}
\`\`\`

Log file when executed by this runner: \`${command.logFile}\`
`).join("\n")}

## Final Decision Rule

- Production can be signed off only when \`PRODUCTION-SIGNOFF.md\` says \`SIGNED-OFF\`.
- If the final packet says \`SIGN-OFF-BLOCKED\`, keep production traffic closed or rollback to the previous release.
- Do not use \`--allow-incomplete\` for real production approval.
`;

  await fs.writeFile(markdownPath, markdown);
  await fs.writeFile(
    jsonPath,
    `${JSON.stringify({
      generatedAt,
      mode: options.execute ? "EXECUTE" : "DRY-RUN",
      inputs: safeInputs,
      validation,
      commands: commands.map((command) => ({
        id: command.id,
        title: command.title,
        npmScript: command.npmScript,
        script: command.script,
        args: command.args.map((arg) => (/^postgres(?:ql)?:\/\//i.test(arg) ? redactDatabaseUrl(arg) : arg)),
        logFile: command.logFile,
      })),
    }, null, 2)}\n`
  );

  return { markdownPath, jsonPath };
};

const runProcess = (command) =>
  new Promise((resolve) => {
    const child = spawn(process.execPath, [command.script, ...command.args], {
      cwd: rootDir,
      env: process.env,
      stdio: ["ignore", "pipe", "pipe"],
      windowsHide: true,
    });

    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (chunk) => {
      stdout += chunk.toString();
    });
    child.stderr.on("data", (chunk) => {
      stderr += chunk.toString();
    });
    child.on("error", (error) => {
      resolve({ code: 1, stdout, stderr: `${stderr}\n${error.message}`.trim() });
    });
    child.on("close", (code) => {
      resolve({ code: code ?? 1, stdout, stderr });
    });
  });

const writeLog = async (filename, command, result) => {
  await fs.mkdir(path.dirname(filename), { recursive: true });
  await fs.writeFile(
    filename,
    [
      `# ${command.title}`,
      `Command: ${commandLine(command)}`,
      `Exit code: ${result.code}`,
      "",
      "## STDOUT",
      result.stdout || "",
      "",
      "## STDERR",
      result.stderr || "",
      "",
    ].join("\n")
  );
};

const executeCommands = async (options, commands) => {
  const results = [];

  for (const command of commands) {
    if (command.id === "remediation-plan") {
      const manifestPath = path.join(options.evidenceDir, "evidence-manifest.json");
      const manifest = await readJson(manifestPath).catch(() => null);
      if (manifest?.decision === "GO") {
        results.push({ id: command.id, title: command.title, status: "SKIP", detail: "Evidence decision is GO." });
        continue;
      }
    }

    const result = await runProcess(command);
    await writeLog(command.logFile, command, result);
    results.push({
      id: command.id,
      title: command.title,
      status: result.code === 0 ? "PASS" : "FAIL",
      detail: command.logFile,
    });

    if (result.code !== 0 && command.required && !options.allowIncomplete) {
      break;
    }
  }

  const decisions = {
    evidence: "",
    review: "",
    signoff: "",
  };
  const evidenceManifest = await readJson(path.join(options.evidenceDir, "evidence-manifest.json")).catch(() => null);
  const review = await readJson(path.join(options.reviewDir, "operator-evidence-review.json")).catch(() => null);
  const signoff = await readJson(path.join(options.signoffDir, "production-signoff-packet.json")).catch(() => null);
  decisions.evidence = evidenceManifest?.decision || "";
  decisions.review = review?.reviewDecision || "";
  decisions.signoff = signoff?.signOffDecision || "";

  const reportPath = path.join(options.workDir, "real-vps-evidence-run-result.json");
  await fs.writeFile(reportPath, `${JSON.stringify({
    generatedAt: new Date().toISOString(),
    decisions,
    results,
  }, null, 2)}\n`);
  return { decisions, results, reportPath };
};

const run = async () => {
  const options = parseArgs(process.argv.slice(2));
  if (options.help) {
    console.log(usage);
    return;
  }

  if (await pathExists(options.workDir)) {
    if (!options.force) {
      throw new Error(`Work directory already exists: ${options.workDir}. Use --force to replace it.`);
    }
    await fs.rm(options.workDir, { recursive: true, force: true });
  }

  const validation = await validateOptions(options);
  const commands = buildCommands(options);
  const packet = await writePacket(options, commands, validation);

  console.log(`Real VPS evidence run packet: ${packet.markdownPath}`);
  console.log(`Real VPS evidence run JSON: ${packet.jsonPath}`);

  if (!options.execute) {
    console.table([
      ...validation.failures.map((detail) => ({ type: "FAIL", detail })),
      ...validation.warnings.map((detail) => ({ type: "WARN", detail })),
    ]);
    return;
  }

  if (validation.failures.length > 0 && !options.allowIncomplete) {
    throw new Error(`Cannot execute production evidence run: ${validation.failures.join("; ")}`);
  }

  const result = await executeCommands(options, commands);
  console.table(result.results);
  console.table([result.decisions]);
  console.log(`Execution result JSON: ${result.reportPath}`);

  const failed = result.results.filter((item) => item.status === "FAIL");
  if (failed.length > 0 && !options.allowIncomplete) {
    throw new Error(`Real VPS evidence run failed: ${failed.map((item) => item.id).join(", ")}`);
  }
};

run().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
