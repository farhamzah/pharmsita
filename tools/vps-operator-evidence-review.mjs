import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

const usage = `Usage:
  npm.cmd run release:operator-evidence:review -- --evidence-dir releases/live-evidence-task110-db --remediation-dir releases/remediation-task110-db --allow-incomplete --force
  npm run release:operator-evidence:review -- --evidence-dir /tmp/pharmsita-live-evidence --remediation-dir /tmp/pharmsita-remediation --require-go --reviewer "<nama-reviewer>"

Options:
  --evidence-dir <path>        Directory containing GO-NO-GO.md and evidence-manifest.json.
  --manifest <path>            Explicit evidence-manifest.json path.
  --remediation-dir <path>     Optional directory containing REMEDIATION.md and remediation-plan.json.
  --output-dir <path>          Output directory. Default: evidence directory.
  --expected-release <value>   Expected release ID/label.
  --reviewer <name>            Reviewer name/identifier.
  --operator <name>            Operator name/identifier.
  --notes <text>               Free-form review notes.
  --require-go                 Fail unless evidence decision is GO and all required review checks pass.
  --allow-incomplete           Do not fail command when evidence is INCOMPLETE; useful for local/operator-output intake.
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

const sha256File = async (filename) =>
  crypto.createHash("sha256").update(await fs.readFile(filename)).digest("hex");

const parseArgs = (argv) => {
  const options = {
    evidenceDir: "",
    manifest: "",
    remediationDir: "",
    outputDir: "",
    expectedRelease: "",
    reviewer: "",
    operator: "",
    notes: "",
    requireGo: false,
    allowIncomplete: false,
    force: false,
    help: false,
  };

  const args = [...argv];
  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    if (arg === "--evidence-dir") {
      options.evidenceDir = path.resolve(args[++index] || "");
    } else if (arg === "--manifest") {
      options.manifest = path.resolve(args[++index] || "");
    } else if (arg === "--remediation-dir") {
      options.remediationDir = path.resolve(args[++index] || "");
    } else if (arg === "--output-dir") {
      options.outputDir = path.resolve(args[++index] || "");
    } else if (arg === "--expected-release") {
      options.expectedRelease = args[++index] || "";
    } else if (arg === "--reviewer") {
      options.reviewer = args[++index] || "";
    } else if (arg === "--operator") {
      options.operator = args[++index] || "";
    } else if (arg === "--notes") {
      options.notes = args[++index] || "";
    } else if (arg === "--require-go") {
      options.requireGo = true;
    } else if (arg === "--allow-incomplete") {
      options.allowIncomplete = true;
    } else if (arg === "--force") {
      options.force = true;
    } else if (arg === "--help" || arg === "-h") {
      options.help = true;
    } else {
      throw new Error(`Unknown argument: ${arg}`);
    }
  }

  if (!options.manifest) {
    options.evidenceDir = options.evidenceDir || path.join(rootDir, "releases", "live-evidence");
    options.manifest = path.join(options.evidenceDir, "evidence-manifest.json");
  } else if (!options.evidenceDir) {
    options.evidenceDir = path.dirname(options.manifest);
  }

  options.outputDir = options.outputDir || options.evidenceDir;
  return options;
};

const addCheck = (checks, name, status, detail = "") => {
  checks.push({ name, status, detail });
};

const loadRemediation = async (options) => {
  if (!options.remediationDir) return null;
  const planPath = path.join(options.remediationDir, "remediation-plan.json");
  if (!await pathExists(planPath)) return null;
  return readJson(planPath);
};

const resolveEvidencePath = (options, entry) => {
  const filename = entry.file || entry;
  return path.join(options.evidenceDir, filename);
};

const requiredEvidenceFiles = (decision) => {
  const base = [
    "GO-NO-GO.md",
    "evidence-manifest.json",
    "artifact-evidence.txt",
    "current-symlink.txt",
    "live-cutover-qa-command.txt",
  ];

  if (decision === "GO" || decision === "GO WITH REVIEW") {
    base.push(
      "raw-nginx-test.txt",
      "raw-systemctl-is-active.txt",
      "raw-systemctl-status.txt",
      "raw-journalctl-tail.txt",
      "raw-http-health.json",
      "raw-http-ready.json",
      "raw-http-frontend.json"
    );
  }

  return base;
};

const scanSecrets = async (filename) => {
  if (!await pathExists(filename)) return [];
  const stat = await fs.stat(filename);
  if (stat.size > 1_000_000) return [];

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

const reviewEvidence = async (options, manifest, remediation) => {
  const checks = [];
  const decision = manifest.decision || "";
  const gates = Array.isArray(manifest.gates) ? manifest.gates : [];
  const evidence = Array.isArray(manifest.evidence) ? manifest.evidence : [];

  addCheck(checks, "Evidence manifest", "PASS", options.manifest);

  const goNoGoPath = path.join(options.evidenceDir, "GO-NO-GO.md");
  addCheck(
    checks,
    "GO-NO-GO report",
    await pathExists(goNoGoPath) ? "PASS" : "FAIL",
    goNoGoPath
  );

  if (options.expectedRelease) {
    addCheck(
      checks,
      "Expected release",
      manifest.releaseId === options.expectedRelease ? "PASS" : "FAIL",
      `expected=${options.expectedRelease}; actual=${manifest.releaseId || "-"}`
    );
  }

  const failedGates = gates.filter((gate) => gate.status === "FAIL");
  const warnGates = gates.filter((gate) => gate.status === "WARN");
  const skippedGates = gates.filter((gate) => gate.status === "SKIP");

  addCheck(
    checks,
    "Evidence decision",
    decision === "GO" ? "PASS" : decision === "GO WITH REVIEW" ? "WARN" : "FAIL",
    decision || "-"
  );
  addCheck(
    checks,
    "Failed gates",
    failedGates.length === 0 ? "PASS" : "FAIL",
    failedGates.map((gate) => gate.name).join(", ")
  );
  addCheck(
    checks,
    "Warning gates",
    warnGates.length === 0 ? "PASS" : "WARN",
    warnGates.map((gate) => gate.name).join(", ")
  );
  addCheck(
    checks,
    "Skipped gates",
    skippedGates.length === 0 ? "PASS" : "FAIL",
    skippedGates.map((gate) => gate.name).join(", ")
  );

  const manifestFiles = new Set(evidence.map((entry) => entry.file));
  const missingRequired = [];
  for (const filename of requiredEvidenceFiles(decision)) {
    const filePath = path.join(options.evidenceDir, filename);
    if (!await pathExists(filePath)) {
      missingRequired.push(filename);
    }
  }
  addCheck(
    checks,
    "Required evidence files",
    missingRequired.length === 0 ? "PASS" : "FAIL",
    missingRequired.join(", ")
  );

  const checksumMismatches = [];
  for (const entry of evidence) {
    const filePath = resolveEvidencePath(options, entry);
    if (!await pathExists(filePath)) {
      checksumMismatches.push(`${entry.file}: missing`);
      continue;
    }
    const actual = await sha256File(filePath);
    if (entry.sha256 && actual !== entry.sha256) {
      checksumMismatches.push(`${entry.file}: checksum mismatch`);
    }
  }
  addCheck(
    checks,
    "Evidence file checksums",
    checksumMismatches.length === 0 ? "PASS" : "FAIL",
    checksumMismatches.join(", ")
  );

  const unlistedFiles = [];
  for (const filename of requiredEvidenceFiles(decision)) {
    if (!manifestFiles.has(filename) && filename !== "GO-NO-GO.md" && filename !== "evidence-manifest.json") {
      unlistedFiles.push(filename);
    }
  }
  addCheck(
    checks,
    "Manifest evidence listing",
    unlistedFiles.length === 0 ? "PASS" : "WARN",
    unlistedFiles.join(", ")
  );

  const secretFindings = [];
  const filesToScan = [
    goNoGoPath,
    ...evidence.map((entry) => resolveEvidencePath(options, entry)),
  ];
  for (const filePath of filesToScan) {
    const findings = await scanSecrets(filePath);
    if (findings.length > 0) {
      secretFindings.push(`${path.basename(filePath)}: ${findings.join(", ")}`);
    }
  }
  addCheck(
    checks,
    "Secret redaction",
    secretFindings.length === 0 ? "PASS" : "FAIL",
    secretFindings.join("; ")
  );

  if (remediation) {
    const items = Array.isArray(remediation.items) ? remediation.items : [];
    const blockerItems = items.filter((item) => item.severity === "Extra High" || item.status === "FAIL");
    addCheck(
      checks,
      "Remediation plan",
      items.length === 0 ? "PASS" : blockerItems.length === 0 ? "WARN" : "FAIL",
      `items=${items.length}; blockers=${blockerItems.length}; decision=${remediation.remediationDecision || "-"}`
    );
  } else if (decision !== "GO") {
    addCheck(
      checks,
      "Remediation plan",
      "FAIL",
      "Decision is not GO but remediation-plan.json was not provided."
    );
  } else {
    addCheck(checks, "Remediation plan", "PASS", "Not required for GO evidence.");
  }

  return checks;
};

const decideReview = (checks, options) => {
  const failures = checks.filter((check) => check.status === "FAIL");
  const warnings = checks.filter((check) => check.status === "WARN");
  const skipped = checks.filter((check) => check.status === "SKIP");

  if (failures.length > 0) return "BLOCKED";
  if (options.requireGo && warnings.length > 0) return "BLOCKED";
  if (warnings.length > 0 || skipped.length > 0) return "NEEDS REVIEW";
  return "APPROVED";
};

const writeReports = async (options, manifest, remediation, checks) => {
  await fs.mkdir(options.outputDir, { recursive: true });
  const markdownPath = path.join(options.outputDir, "OPERATOR-EVIDENCE-REVIEW.md");
  const jsonPath = path.join(options.outputDir, "operator-evidence-review.json");

  if (!options.force) {
    for (const target of [markdownPath, jsonPath]) {
      if (await pathExists(target)) {
        throw new Error(`Output already exists: ${target}. Use --force to replace it.`);
      }
    }
  }

  const generatedAt = new Date().toISOString();
  const reviewDecision = decideReview(checks, options);
  const failed = checks.filter((check) => check.status === "FAIL");
  const warned = checks.filter((check) => check.status === "WARN");

  const markdown = `# PharmSITA Operator Evidence Review

Generated at: ${generatedAt}

Review decision: **${reviewDecision}**

Evidence decision: **${manifest.decision || "-"}**

Release: \`${manifest.releaseId || "-"}\`

Operator: \`${options.operator || manifest.operator || "-"}\`

Reviewer: \`${options.reviewer || "-"}\`

Notes: ${options.notes || "-"}

## Checks

| Check | Status | Detail |
|---|---|---|
${checks.map((check) => `| ${check.name} | ${check.status} | ${String(check.detail || "").replace(/\|/g, "\\|")} |`).join("\n")}

## Review Loop

${failed.length === 0 && warned.length === 0 ? "- Evidence approved. Store this review with release artifacts." : ""}
${failed.length > 0 ? "- Fix all FAIL checks, regenerate evidence on VPS, rerun remediation if needed, then rerun this review." : ""}
${warned.length > 0 ? "- Review WARN checks and add operator sign-off before opening wider production traffic." : ""}

## Required Operator Package

- \`GO-NO-GO.md\`
- \`evidence-manifest.json\`
- raw evidence files listed in \`evidence-manifest.json\`
- \`REMEDIATION.md\` and \`remediation-plan.json\` when evidence decision is not GO
- this \`OPERATOR-EVIDENCE-REVIEW.md\`
`;

  await fs.writeFile(markdownPath, markdown);
  await fs.writeFile(
    jsonPath,
    `${JSON.stringify({
      generatedAt,
      reviewDecision,
      evidenceDecision: manifest.decision || "",
      releaseId: manifest.releaseId || "",
      operator: options.operator || manifest.operator || "",
      reviewer: options.reviewer || "",
      notes: options.notes || "",
      sourceManifest: options.manifest,
      remediationDecision: remediation?.remediationDecision || "",
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

  if (!await pathExists(options.manifest)) {
    throw new Error(`Evidence manifest not found: ${options.manifest}`);
  }

  const manifest = await readJson(options.manifest);
  const remediation = await loadRemediation(options);
  const checks = await reviewEvidence(options, manifest, remediation);
  const result = await writeReports(options, manifest, remediation, checks);

  console.table(checks.map((check) => ({
    check: check.name,
    status: check.status,
    detail: check.detail,
  })));
  console.log(`Operator evidence review: ${result.markdownPath}`);
  console.log(`Operator evidence review JSON: ${result.jsonPath}`);
  console.log(`Review decision: ${result.reviewDecision}`);

  if (result.reviewDecision === "BLOCKED" && !options.allowIncomplete) {
    throw new Error("Operator evidence review is BLOCKED.");
  }
  if (result.reviewDecision !== "APPROVED" && options.requireGo) {
    throw new Error("Operator evidence review did not meet --require-go.");
  }
};

run().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
