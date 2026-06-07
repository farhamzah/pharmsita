import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

const usage = `Usage:
  npm.cmd run release:production-signoff:packet -- --evidence-dir releases/live-evidence-task110-db --review-dir releases/operator-review-task111-db --remediation-dir releases/remediation-task110-db --allow-blocked --force
  npm run release:production-signoff:packet -- --evidence-dir /tmp/pharmsita-live-evidence --review-dir /tmp/pharmsita-review --remediation-dir /tmp/pharmsita-remediation --release-id <release-id> --operator "<nama-operator>" --reviewer "<nama-reviewer>" --signer "<nama-approver>" --require-approved

Options:
  --evidence-dir <path>       Directory containing GO-NO-GO.md and evidence-manifest.json.
  --manifest <path>           Explicit evidence-manifest.json path.
  --review-dir <path>         Directory containing OPERATOR-EVIDENCE-REVIEW.md and operator-evidence-review.json.
  --review-json <path>        Explicit operator-evidence-review.json path.
  --remediation-dir <path>    Optional directory containing REMEDIATION.md and remediation-plan.json.
  --output-dir <path>         Output directory. Default: releases/production-signoff.
  --release-id <value>        Expected release ID.
  --expected-release <value>  Alias for --release-id.
  --operator <name>           Operator name/identifier.
  --reviewer <name>           Reviewer name/identifier.
  --signer <name>             Final sign-off approver name/identifier.
  --notes <text>              Free-form sign-off notes.
  --require-approved          Fail unless final decision is SIGNED-OFF.
  --allow-blocked             Write packet without failing when evidence/review is blocked.
  --allow-incomplete          Alias for --allow-blocked.
  --force                     Replace existing sign-off output files.
  --help                      Show this help.
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
    reviewDir: "",
    reviewJson: "",
    remediationDir: "",
    outputDir: path.join(rootDir, "releases", "production-signoff"),
    releaseId: "",
    operator: "",
    reviewer: "",
    signer: "",
    notes: "",
    requireApproved: false,
    allowBlocked: false,
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
    } else if (arg === "--review-dir") {
      options.reviewDir = path.resolve(args[++index] || "");
    } else if (arg === "--review-json") {
      options.reviewJson = path.resolve(args[++index] || "");
    } else if (arg === "--remediation-dir") {
      options.remediationDir = path.resolve(args[++index] || "");
    } else if (arg === "--output-dir") {
      options.outputDir = path.resolve(args[++index] || "");
    } else if (arg === "--release-id" || arg === "--expected-release") {
      options.releaseId = args[++index] || "";
    } else if (arg === "--operator") {
      options.operator = args[++index] || "";
    } else if (arg === "--reviewer") {
      options.reviewer = args[++index] || "";
    } else if (arg === "--signer") {
      options.signer = args[++index] || "";
    } else if (arg === "--notes") {
      options.notes = args[++index] || "";
    } else if (arg === "--require-approved") {
      options.requireApproved = true;
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

  if (!options.manifest) {
    options.evidenceDir = options.evidenceDir || path.join(rootDir, "releases", "live-evidence");
    options.manifest = path.join(options.evidenceDir, "evidence-manifest.json");
  } else if (!options.evidenceDir) {
    options.evidenceDir = path.dirname(options.manifest);
  }

  if (!options.reviewJson) {
    options.reviewDir = options.reviewDir || options.evidenceDir;
    options.reviewJson = path.join(options.reviewDir, "operator-evidence-review.json");
  } else if (!options.reviewDir) {
    options.reviewDir = path.dirname(options.reviewJson);
  }

  return options;
};

const addCheck = (checks, name, status, detail = "") => {
  checks.push({ name, status, detail });
};

const collectFile = async (files, label, filename, required = true) => {
  if (!filename) {
    if (required) {
      files.push({ label, path: "", exists: false, bytes: 0, sha256: "" });
    }
    return;
  }

  if (!await pathExists(filename)) {
    if (required) {
      files.push({ label, path: filename, exists: false, bytes: 0, sha256: "" });
    }
    return;
  }

  const stat = await fs.stat(filename);
  if (!stat.isFile()) return;
  files.push({
    label,
    path: filename,
    exists: true,
    bytes: stat.size,
    sha256: await sha256File(filename),
  });
};

const uniqueFiles = (files) => {
  const seen = new Set();
  return files.filter((file) => {
    const key = path.resolve(file.path || `${file.label}:missing`).toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
};

const loadOptionalJson = async (filename) => {
  if (!filename || !await pathExists(filename)) return null;
  return readJson(filename);
};

const scanSecrets = async (filename) => {
  if (!filename || !await pathExists(filename)) return [];
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

const loadInputs = async (options) => {
  const evidenceManifest = await readJson(options.manifest);
  const review = await readJson(options.reviewJson);
  const remediationPath = options.remediationDir
    ? path.join(options.remediationDir, "remediation-plan.json")
    : "";
  const remediation = await loadOptionalJson(remediationPath);

  return { evidenceManifest, review, remediation, remediationPath };
};

const collectSourceFiles = async (options, evidenceManifest) => {
  const files = [];
  await collectFile(files, "Evidence manifest", options.manifest);
  await collectFile(files, "GO-NO-GO report", path.join(options.evidenceDir, "GO-NO-GO.md"));

  const evidenceEntries = Array.isArray(evidenceManifest.evidence) ? evidenceManifest.evidence : [];
  for (const entry of evidenceEntries) {
    const filename = entry.path || path.join(options.evidenceDir, entry.file || "");
    await collectFile(files, `Evidence file: ${entry.file || path.basename(filename)}`, filename, false);
  }

  await collectFile(files, "Operator review JSON", options.reviewJson);
  await collectFile(files, "Operator review report", path.join(options.reviewDir, "OPERATOR-EVIDENCE-REVIEW.md"));

  if (options.remediationDir) {
    await collectFile(files, "Remediation JSON", path.join(options.remediationDir, "remediation-plan.json"), false);
    await collectFile(files, "Remediation report", path.join(options.remediationDir, "REMEDIATION.md"), false);
  }

  return uniqueFiles(files);
};

const buildChecks = async (options, evidenceManifest, review, remediation, sourceFiles) => {
  const checks = [];
  const evidenceDecision = evidenceManifest.decision || "";
  const reviewDecision = review.reviewDecision || "";
  const failedReviewChecks = Array.isArray(review.checks)
    ? review.checks.filter((check) => check.status === "FAIL")
    : [];
  const warnedReviewChecks = Array.isArray(review.checks)
    ? review.checks.filter((check) => check.status === "WARN")
    : [];

  addCheck(checks, "Evidence manifest", await pathExists(options.manifest) ? "PASS" : "FAIL", options.manifest);
  addCheck(checks, "GO-NO-GO report", await pathExists(path.join(options.evidenceDir, "GO-NO-GO.md")) ? "PASS" : "FAIL", path.join(options.evidenceDir, "GO-NO-GO.md"));
  addCheck(checks, "Operator review JSON", await pathExists(options.reviewJson) ? "PASS" : "FAIL", options.reviewJson);
  addCheck(checks, "Operator review report", await pathExists(path.join(options.reviewDir, "OPERATOR-EVIDENCE-REVIEW.md")) ? "PASS" : "FAIL", path.join(options.reviewDir, "OPERATOR-EVIDENCE-REVIEW.md"));

  if (options.releaseId) {
    const releaseMatches = evidenceManifest.releaseId === options.releaseId && review.releaseId === options.releaseId;
    addCheck(checks, "Expected release", releaseMatches ? "PASS" : "FAIL", `expected=${options.releaseId}; evidence=${evidenceManifest.releaseId || "-"}; review=${review.releaseId || "-"}`);
  }

  addCheck(
    checks,
    "Evidence decision",
    evidenceDecision === "GO" ? "PASS" : evidenceDecision === "GO WITH REVIEW" ? "WARN" : "FAIL",
    evidenceDecision || "-"
  );
  addCheck(
    checks,
    "Operator review decision",
    reviewDecision === "APPROVED" ? "PASS" : reviewDecision === "NEEDS REVIEW" ? "WARN" : "FAIL",
    reviewDecision || "-"
  );
  addCheck(
    checks,
    "Review failed checks",
    failedReviewChecks.length === 0 ? "PASS" : "FAIL",
    failedReviewChecks.map((check) => check.name).join(", ")
  );
  addCheck(
    checks,
    "Review warning checks",
    warnedReviewChecks.length === 0 ? "PASS" : "WARN",
    warnedReviewChecks.map((check) => check.name).join(", ")
  );

  const sourceConsistent = (review.releaseId || "") === (evidenceManifest.releaseId || "")
    && (review.evidenceDecision || "") === evidenceDecision;
  addCheck(
    checks,
    "Evidence/review consistency",
    sourceConsistent ? "PASS" : "FAIL",
    `evidenceRelease=${evidenceManifest.releaseId || "-"}; reviewRelease=${review.releaseId || "-"}; evidenceDecision=${evidenceDecision || "-"}; reviewEvidenceDecision=${review.evidenceDecision || "-"}`
  );

  if (evidenceDecision !== "GO") {
    if (!remediation) {
      addCheck(checks, "Remediation packet", "FAIL", "Evidence decision is not GO but remediation-plan.json was not provided.");
    } else {
      const remediationDecision = remediation.remediationDecision || "";
      const blockerItems = Array.isArray(remediation.items)
        ? remediation.items.filter((item) => item.severity === "Extra High" || item.status === "FAIL" || item.status === "SKIP")
        : [];
      addCheck(
        checks,
        "Remediation packet",
        remediationDecision === "GO" ? "PASS" : remediationDecision === "GO WITH REVIEW" ? "WARN" : "FAIL",
        `decision=${remediationDecision || "-"}; blockers=${blockerItems.length}`
      );
    }
  } else {
    addCheck(checks, "Remediation packet", "PASS", remediation ? `provided; decision=${remediation.remediationDecision || "-"}` : "Not required for GO evidence.");
  }

  const missingSources = sourceFiles.filter((file) => !file.exists);
  addCheck(
    checks,
    "Source packet files",
    missingSources.length === 0 ? "PASS" : "FAIL",
    missingSources.map((file) => file.path || file.label).join(", ")
  );

  const secretFindings = [];
  for (const file of sourceFiles.filter((item) => item.exists)) {
    const findings = await scanSecrets(file.path);
    if (findings.length > 0) {
      secretFindings.push(`${path.basename(file.path)}: ${findings.join(", ")}`);
    }
  }
  addCheck(
    checks,
    "Secret redaction",
    secretFindings.length === 0 ? "PASS" : "FAIL",
    secretFindings.join("; ")
  );

  if (!options.operator && !evidenceManifest.operator && !review.operator) {
    addCheck(checks, "Operator identity", "WARN", "Operator name was not supplied.");
  } else {
    addCheck(checks, "Operator identity", "PASS", options.operator || evidenceManifest.operator || review.operator || "-");
  }

  if (!options.reviewer && !review.reviewer) {
    addCheck(checks, "Reviewer identity", "WARN", "Reviewer name was not supplied.");
  } else {
    addCheck(checks, "Reviewer identity", "PASS", options.reviewer || review.reviewer || "-");
  }

  if (!options.signer) {
    addCheck(checks, "Final signer identity", "WARN", "Final signer was not supplied.");
  } else {
    addCheck(checks, "Final signer identity", "PASS", options.signer);
  }

  return checks;
};

const decideSignOff = (checks) => {
  const failed = checks.filter((check) => check.status === "FAIL");
  const warned = checks.filter((check) => check.status === "WARN");

  if (failed.length > 0) return "SIGN-OFF-BLOCKED";
  if (warned.length > 0) return "SIGN-OFF-WITH-REVIEW";
  return "SIGNED-OFF";
};

const markdownTableValue = (value) => String(value || "").replace(/\|/g, "\\|").replace(/\r?\n/g, "<br>");

const writePacket = async (options, evidenceManifest, review, remediation, checks, sourceFiles) => {
  await fs.mkdir(options.outputDir, { recursive: true });

  const markdownPath = path.join(options.outputDir, "PRODUCTION-SIGNOFF.md");
  const jsonPath = path.join(options.outputDir, "production-signoff-packet.json");
  const checksumPath = path.join(options.outputDir, "production-signoff-checksums.sha256");

  if (!options.force) {
    for (const target of [markdownPath, jsonPath, checksumPath]) {
      if (await pathExists(target)) {
        throw new Error(`Output already exists: ${target}. Use --force to replace it.`);
      }
    }
  }

  const generatedAt = new Date().toISOString();
  const signOffDecision = decideSignOff(checks);
  const failed = checks.filter((check) => check.status === "FAIL");
  const warned = checks.filter((check) => check.status === "WARN");
  const releaseId = evidenceManifest.releaseId || review.releaseId || options.releaseId || "";
  const operator = options.operator || evidenceManifest.operator || review.operator || "";
  const reviewer = options.reviewer || review.reviewer || "";

  const markdown = `# PharmSITA Production Sign-Off Packet

Generated at: ${generatedAt}

Sign-off decision: **${signOffDecision}**

Release: \`${releaseId || "-"}\`

Evidence decision: **${evidenceManifest.decision || "-"}**

Operator review decision: **${review.reviewDecision || "-"}**

Operator: \`${operator || "-"}\`

Reviewer: \`${reviewer || "-"}\`

Final signer: \`${options.signer || "-"}\`

Notes: ${options.notes || "-"}

## Final Gate

${signOffDecision === "SIGNED-OFF" ? "- Release evidence is complete and approved. This packet can be attached to production release notes." : ""}
${signOffDecision === "SIGN-OFF-WITH-REVIEW" ? "- Release has no failed gate, but one or more warning/signature item still needs manual approval before wider production traffic." : ""}
${signOffDecision === "SIGN-OFF-BLOCKED" ? "- Do not open production traffic. Fix failed checks, capture fresh VPS evidence, rerun operator review, then regenerate this packet." : ""}

## Checks

| Check | Status | Detail |
|---|---|---|
${checks.map((check) => `| ${markdownTableValue(check.name)} | ${check.status} | ${markdownTableValue(check.detail)} |`).join("\n")}

## Source Packet Files

| File | Bytes | SHA-256 |
|---|---:|---|
${sourceFiles.filter((file) => file.exists).map((file) => `| ${markdownTableValue(file.label)}: \`${markdownTableValue(file.path)}\` | ${file.bytes} | \`${file.sha256}\` |`).join("\n")}

## Included Decisions

| Source | Decision |
|---|---|
| Evidence | ${evidenceManifest.decision || "-"} |
| Operator review | ${review.reviewDecision || "-"} |
| Remediation | ${remediation?.remediationDecision || "not required/provided"} |
| Production sign-off | ${signOffDecision} |

## Required Archive

- \`GO-NO-GO.md\`
- \`evidence-manifest.json\`
- evidence files listed in \`evidence-manifest.json\`
- \`OPERATOR-EVIDENCE-REVIEW.md\`
- \`operator-evidence-review.json\`
- \`REMEDIATION.md\` and \`remediation-plan.json\` when evidence decision is not \`GO\`
- this \`PRODUCTION-SIGNOFF.md\`
- \`production-signoff-packet.json\`
- \`production-signoff-checksums.sha256\`
`;

  const packet = {
    generatedAt,
    signOffDecision,
    releaseId,
    evidenceDecision: evidenceManifest.decision || "",
    reviewDecision: review.reviewDecision || "",
    remediationDecision: remediation?.remediationDecision || "",
    operator,
    reviewer,
    signer: options.signer || "",
    notes: options.notes || "",
    source: {
      evidenceManifest: options.manifest,
      reviewJson: options.reviewJson,
      remediationDir: options.remediationDir || "",
    },
    checks,
    files: sourceFiles,
  };

  await fs.writeFile(markdownPath, markdown);
  await fs.writeFile(jsonPath, `${JSON.stringify(packet, null, 2)}\n`);

  const outputFiles = [
    ...sourceFiles.filter((file) => file.exists),
    {
      label: "Production sign-off report",
      path: markdownPath,
      exists: true,
      bytes: (await fs.stat(markdownPath)).size,
      sha256: await sha256File(markdownPath),
    },
    {
      label: "Production sign-off JSON",
      path: jsonPath,
      exists: true,
      bytes: (await fs.stat(jsonPath)).size,
      sha256: await sha256File(jsonPath),
    },
  ];

  await fs.writeFile(
    checksumPath,
    `${outputFiles.map((file) => `${file.sha256}  ${path.basename(file.path)}`).join("\n")}\n`
  );

  return { markdownPath, jsonPath, checksumPath, signOffDecision };
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
  if (!await pathExists(options.reviewJson)) {
    throw new Error(`Operator evidence review JSON not found: ${options.reviewJson}`);
  }

  const { evidenceManifest, review, remediation } = await loadInputs(options);
  const sourceFiles = await collectSourceFiles(options, evidenceManifest);
  const checks = await buildChecks(options, evidenceManifest, review, remediation, sourceFiles);
  const result = await writePacket(options, evidenceManifest, review, remediation, checks, sourceFiles);

  console.table(checks.map((check) => ({
    check: check.name,
    status: check.status,
    detail: check.detail,
  })));
  console.log(`Production sign-off packet: ${result.markdownPath}`);
  console.log(`Production sign-off JSON: ${result.jsonPath}`);
  console.log(`Production sign-off checksums: ${result.checksumPath}`);
  console.log(`Sign-off decision: ${result.signOffDecision}`);

  if (result.signOffDecision === "SIGN-OFF-BLOCKED" && !options.allowBlocked) {
    throw new Error("Production sign-off is BLOCKED.");
  }
  if (result.signOffDecision !== "SIGNED-OFF" && options.requireApproved) {
    throw new Error("Production sign-off did not meet --require-approved.");
  }
};

run().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
