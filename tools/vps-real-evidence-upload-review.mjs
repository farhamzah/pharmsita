import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

const usage = `Usage:
  npm.cmd run release:production-evidence:upload-review -- --upload-dir releases/production-evidence-task113-local --release-id task113-test --allow-blocked --force
  npm run release:production-evidence:upload-review -- --upload-dir /tmp/pharmsita-production-evidence-run --release-id <release-id> --reviewer "<nama-reviewer>" --require-signed-off --force

Options:
  --upload-dir <path>          Folder uploaded by the VPS operator. Default: releases/production-evidence-run.
  --output-dir <path>          Review output directory. Default: upload directory.
  --release-id <value>         Expected release ID.
  --reviewer <name>            Reviewer name/identifier.
  --notes <text>               Free-form review notes.
  --require-signed-off         Fail unless upload review decision is APPROVED.
  --allow-blocked              Write review without failing when evidence is blocked.
  --force                      Replace existing review output files.
  --help                       Show this help.
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
    uploadDir: path.join(rootDir, "releases", "production-evidence-run"),
    outputDir: "",
    releaseId: "",
    reviewer: "",
    notes: "",
    requireSignedOff: false,
    allowBlocked: false,
    force: false,
    help: false,
  };

  const args = [...argv];
  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    if (arg === "--upload-dir") {
      options.uploadDir = path.resolve(args[++index] || "");
    } else if (arg === "--output-dir") {
      options.outputDir = path.resolve(args[++index] || "");
    } else if (arg === "--release-id" || arg === "--expected-release") {
      options.releaseId = args[++index] || "";
    } else if (arg === "--reviewer") {
      options.reviewer = args[++index] || "";
    } else if (arg === "--notes") {
      options.notes = args[++index] || "";
    } else if (arg === "--require-signed-off") {
      options.requireSignedOff = true;
    } else if (arg === "--allow-blocked" || arg === "--allow-incomplete") {
      options.allowBlocked = true;
    } else if (arg === "--force") {
      options.force = true;
    } else if (arg === "--help" || arg === "-h") {
      options.help = true;
    } else {
      throw new Error(`Unknown argument: ${arg}`);
    }
  }

  options.outputDir = options.outputDir || options.uploadDir;
  return options;
};

const addCheck = (checks, name, status, detail = "") => {
  checks.push({ name, status, detail });
};

const loadJson = async (checks, label, filename, required = true) => {
  if (!await pathExists(filename)) {
    addCheck(checks, label, required ? "FAIL" : "WARN", `Missing: ${filename}`);
    return null;
  }

  try {
    const value = await readJson(filename);
    addCheck(checks, label, "PASS", filename);
    return value;
  } catch (error) {
    addCheck(checks, label, "FAIL", error instanceof Error ? error.message : String(error));
    return null;
  }
};

const requireFile = async (checks, label, filename, required = true) => {
  const exists = await pathExists(filename);
  addCheck(checks, label, exists ? "PASS" : required ? "FAIL" : "WARN", exists ? filename : `Missing: ${filename}`);
  return exists;
};

const scanSecrets = async (filename) => {
  if (!await pathExists(filename)) return [];
  const stat = await fs.stat(filename);
  if (!stat.isFile() || stat.size > 1_000_000) return [];

  const text = await fs.readFile(filename, "utf8").catch(() => "");
  const findings = [];
  const patterns = [
    {
      name: "postgres password URL",
      pattern: /postgres(?:ql)?:\/\/[^:\s]+:(?!\*\*\*)[^@\s]+@/i,
    },
    {
      name: "AUTH_SECRET value",
      pattern: /\bAUTH_SECRET=([^\s"]{8,})/i,
    },
    {
      name: "password assignment",
      pattern: /\b(password|temporaryPassword|activatedPassword)\b\s*[:=]\s*["']?(?!\*\*\*)[^\s"',}]{8,}/i,
    },
    {
      name: "bearer token",
      pattern: /\bBearer\s+[A-Za-z0-9._~+/=-]{20,}/,
    },
  ];

  patterns.forEach((item) => {
    if (item.pattern.test(text)) findings.push(item.name);
  });
  return findings;
};

const collectFiles = async (directory) => {
  if (!await pathExists(directory)) return [];
  const entries = await fs.readdir(directory, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const absolute = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      files.push(...await collectFiles(absolute));
    } else if (entry.isFile()) {
      files.push(absolute);
    }
  }
  return files.sort();
};

const decide = (checks, signoffDecision) => {
  const failed = checks.filter((check) => check.status === "FAIL");
  const warned = checks.filter((check) => check.status === "WARN");
  if (failed.length > 0 || signoffDecision !== "SIGNED-OFF") return "BLOCKED";
  if (warned.length > 0) return "NEEDS REVIEW";
  return "APPROVED";
};

const markdownValue = (value) => String(value || "").replace(/\|/g, "\\|").replace(/\r?\n/g, "<br>");

const writeReview = async (options, checks, context) => {
  await fs.mkdir(options.outputDir, { recursive: true });
  const markdownPath = path.join(options.outputDir, "REAL-VPS-EVIDENCE-UPLOAD-REVIEW.md");
  const jsonPath = path.join(options.outputDir, "real-vps-evidence-upload-review.json");

  if (!options.force) {
    for (const target of [markdownPath, jsonPath]) {
      if (await pathExists(target)) {
        throw new Error(`Output already exists: ${target}. Use --force to replace it.`);
      }
    }
  }

  const generatedAt = new Date().toISOString();
  const reviewDecision = decide(checks, context.signoffDecision);

  const markdown = `# Real VPS Evidence Upload Review

Generated at: ${generatedAt}

Review decision: **${reviewDecision}**

Expected release: \`${options.releaseId || "-"}\`

Evidence decision: **${context.evidenceDecision || "-"}**

Operator review decision: **${context.operatorReviewDecision || "-"}**

Sign-off decision: **${context.signoffDecision || "-"}**

Reviewer: \`${options.reviewer || "-"}\`

Notes: ${options.notes || "-"}

## Checks

| Check | Status | Detail |
|---|---|---|
${checks.map((check) => `| ${markdownValue(check.name)} | ${check.status} | ${markdownValue(check.detail)} |`).join("\n")}

## Decision Rule

- \`APPROVED\`: upload lengkap, release ID konsisten, evidence \`GO\`, operator review \`APPROVED\`, sign-off \`SIGNED-OFF\`, dan tidak ada secret leak.
- \`NEEDS REVIEW\`: tidak ada failed check, tetapi masih ada warning.
- \`BLOCKED\`: upload belum bisa jadi dasar production approval.
`;

  await fs.writeFile(markdownPath, markdown);
  await fs.writeFile(
    jsonPath,
    `${JSON.stringify({
      generatedAt,
      reviewDecision,
      reviewer: options.reviewer,
      notes: options.notes,
      uploadDir: options.uploadDir,
      expectedRelease: options.releaseId,
      ...context,
      checks,
    }, null, 2)}\n`
  );

  return { markdownPath, jsonPath, reviewDecision };
};

const run = async () => {
  const options = parseArgs(process.argv.slice(2));
  if (options.help) {
    console.log(usage);
    return;
  }

  const checks = [];
  const runMd = path.join(options.uploadDir, "REAL-VPS-EVIDENCE-RUN.md");
  const runJsonPath = path.join(options.uploadDir, "real-vps-evidence-run.json");
  const resultJsonPath = path.join(options.uploadDir, "real-vps-evidence-run-result.json");
  const evidenceDir = path.join(options.uploadDir, "evidence");
  const reviewDir = path.join(options.uploadDir, "review");
  const remediationDir = path.join(options.uploadDir, "remediation");
  const signoffDir = path.join(options.uploadDir, "signoff");

  await requireFile(checks, "Evidence upload folder", options.uploadDir);
  await requireFile(checks, "Runner markdown", runMd);
  const runJson = await loadJson(checks, "Runner JSON", runJsonPath);
  const resultJson = await loadJson(checks, "Runner result JSON", resultJsonPath);
  const evidence = await loadJson(checks, "Evidence manifest", path.join(evidenceDir, "evidence-manifest.json"));
  await requireFile(checks, "GO-NO-GO report", path.join(evidenceDir, "GO-NO-GO.md"));
  const operatorReview = await loadJson(checks, "Operator review JSON", path.join(reviewDir, "operator-evidence-review.json"));
  await requireFile(checks, "Operator review report", path.join(reviewDir, "OPERATOR-EVIDENCE-REVIEW.md"));
  const signoff = await loadJson(checks, "Production sign-off JSON", path.join(signoffDir, "production-signoff-packet.json"));
  await requireFile(checks, "Production sign-off report", path.join(signoffDir, "PRODUCTION-SIGNOFF.md"));
  await requireFile(checks, "Production sign-off checksums", path.join(signoffDir, "production-signoff-checksums.sha256"));

  const evidenceDecision = evidence?.decision || "";
  const operatorReviewDecision = operatorReview?.reviewDecision || "";
  const signoffDecision = signoff?.signOffDecision || "";
  const resultDecisions = resultJson?.decisions || {};
  const releaseValues = [
    evidence?.releaseId,
    operatorReview?.releaseId,
    signoff?.releaseId,
    runJson?.inputs?.releaseId,
  ].filter(Boolean);
  const uniqueReleaseValues = new Set(releaseValues);

  if (options.releaseId) {
    addCheck(
      checks,
      "Expected release",
      [...uniqueReleaseValues].every((value) => value === options.releaseId) ? "PASS" : "FAIL",
      `expected=${options.releaseId}; found=${[...uniqueReleaseValues].join(", ") || "-"}`
    );
  } else {
    addCheck(checks, "Expected release", "WARN", "No --release-id supplied.");
  }

  addCheck(checks, "Release ID consistency", uniqueReleaseValues.size <= 1 ? "PASS" : "FAIL", [...uniqueReleaseValues].join(", "));
  addCheck(checks, "Evidence decision", evidenceDecision === "GO" ? "PASS" : evidenceDecision === "GO WITH REVIEW" ? "WARN" : "FAIL", evidenceDecision || "-");
  addCheck(checks, "Operator review decision", operatorReviewDecision === "APPROVED" ? "PASS" : operatorReviewDecision === "NEEDS REVIEW" ? "WARN" : "FAIL", operatorReviewDecision || "-");
  addCheck(checks, "Sign-off decision", signoffDecision === "SIGNED-OFF" ? "PASS" : signoffDecision === "SIGN-OFF-WITH-REVIEW" ? "WARN" : "FAIL", signoffDecision || "-");

  addCheck(
    checks,
    "Runner decision consistency",
    resultDecisions.evidence === evidenceDecision
      && resultDecisions.review === operatorReviewDecision
      && resultDecisions.signoff === signoffDecision
      ? "PASS"
      : "FAIL",
    `runner=${resultDecisions.evidence || "-"} / ${resultDecisions.review || "-"} / ${resultDecisions.signoff || "-"}`
  );

  if (evidenceDecision !== "GO") {
    await loadJson(checks, "Remediation JSON", path.join(remediationDir, "remediation-plan.json"));
    await requireFile(checks, "Remediation report", path.join(remediationDir, "REMEDIATION.md"));
  } else {
    await requireFile(checks, "Remediation JSON", path.join(remediationDir, "remediation-plan.json"), false);
  }

  const logFiles = [
    "01-live-cutover-qa.log",
    "02-live-evidence-capture.log",
    "04-operator-review.log",
    "05-production-signoff.log",
  ];
  for (const logFile of logFiles) {
    await requireFile(checks, `Execution log: ${logFile}`, path.join(options.uploadDir, logFile));
  }
  if (evidenceDecision !== "GO") {
    await requireFile(checks, "Execution log: 03-remediation-plan.log", path.join(options.uploadDir, "03-remediation-plan.log"));
  }

  const files = await collectFiles(options.uploadDir);
  const secretFindings = [];
  for (const file of files) {
    const findings = await scanSecrets(file);
    if (findings.length > 0) secretFindings.push(`${path.relative(options.uploadDir, file)}: ${findings.join(", ")}`);
  }
  addCheck(checks, "Secret redaction", secretFindings.length === 0 ? "PASS" : "FAIL", secretFindings.join("; "));

  const result = await writeReview(options, checks, {
    evidenceDecision,
    operatorReviewDecision,
    signoffDecision,
  });

  console.table(checks.map((check) => ({
    check: check.name,
    status: check.status,
    detail: check.detail,
  })));
  console.log(`Evidence upload review: ${result.markdownPath}`);
  console.log(`Evidence upload review JSON: ${result.jsonPath}`);
  console.log(`Review decision: ${result.reviewDecision}`);

  if (result.reviewDecision === "BLOCKED" && !options.allowBlocked) {
    throw new Error("Evidence upload review is BLOCKED.");
  }
  if (result.reviewDecision !== "APPROVED" && options.requireSignedOff) {
    throw new Error("Evidence upload review did not meet --require-signed-off.");
  }
};

run().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
