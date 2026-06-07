import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

const usage = `Usage:
  npm.cmd run release:go-no-go:remediate -- --evidence-dir releases/live-evidence-task109-db --force
  npm run release:go-no-go:remediate -- --manifest /tmp/pharmsita-live-evidence/evidence-manifest.json --output-dir /tmp/pharmsita-remediation --operator "<nama-operator>"

Options:
  --evidence-dir <path>       Directory containing evidence-manifest.json.
  --manifest <path>           Explicit evidence-manifest.json path.
  --output-dir <path>         Output directory. Default: evidence directory.
  --operator <name>           Operator name/identifier.
  --notes <text>              Free-form notes appended to remediation report.
  --force                     Replace existing remediation output files.
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

const parseArgs = (argv) => {
  const options = {
    evidenceDir: "",
    manifest: "",
    outputDir: "",
    operator: "",
    notes: "",
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
    } else if (arg === "--output-dir") {
      options.outputDir = path.resolve(args[++index] || "");
    } else if (arg === "--operator") {
      options.operator = args[++index] || "";
    } else if (arg === "--notes") {
      options.notes = args[++index] || "";
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

const normalize = (value) => String(value || "").toLowerCase();

const severityForGate = (gate) => {
  if (gate.status === "FAIL") return "Extra High";
  if (gate.status === "WARN") return "High";
  if (gate.status === "SKIP") {
    const name = normalize(gate.name);
    if (name.includes("https") || name.includes("system") || name.includes("backup") || name.includes("smoke")) {
      return "Extra High";
    }
    return "High";
  }
  return "Medium";
};

const categoryForGate = (gate) => {
  const name = normalize(gate.name);
  const detail = normalize(gate.detail);
  const text = `${name} ${detail}`;

  if (text.includes("artifact") || text.includes("checksum")) return "Artifact Integrity";
  if (text.includes("symlink") || text.includes("current")) return "Release Activation";
  if (text.includes("nginx")) return "Nginx";
  if (text.includes("system") || text.includes("systemctl") || text.includes("systemd") || text.includes("journal")) return "Systemd/Backend Service";
  if (text.includes("backup") || text.includes("restore") || text.includes("database") || text.includes("db:migrate")) return "Database Safety";
  if (text.includes("health/ready") || text.includes("readiness") || text.includes("ready")) return "Readiness";
  if (text.includes("https") || text.includes("health") || text.includes("http")) return "HTTPS/Domain";
  if (text.includes("frontend")) return "Frontend/Nginx Root";
  if (text.includes("smoke")) return "Production Smoke";
  return "Operational Review";
};

const remediationForGate = (gate, manifest) => {
  const category = categoryForGate(gate);
  const releaseId = manifest.releaseId || "<release-id>";
  const inputs = manifest.inputs || {};
  const releaseDir = inputs.releaseDir || "/var/www/pharmsita/current";
  const releaseArchive = inputs.releaseArchive || `/var/www/pharmsita/releases/${releaseId}.tar.gz`;
  const artifactChecksums = inputs.artifactChecksums || "/var/www/pharmsita/releases/artifact-checksums.sha256";
  const currentSymlink = inputs.currentSymlink || "/var/www/pharmsita/current";
  const apiBaseUrl = inputs.apiBaseUrl || "https://pharmsita.example.ac.id/api/v1";
  const frontendUrl = inputs.frontendUrl || "https://pharmsita.example.ac.id";
  const backupManifest = inputs.backupManifest || "/var/backups/pharmsita/postgres/<backup>.manifest.json";
  const serviceName = inputs.serviceName || "pharmsita-backend";

  const common = {
    evidence: gate.detail || "-",
    verify: `Rerun evidence capture after remediation: npm run release:live-evidence:capture -- --release-dir ${releaseDir} --release-id ${releaseId} --release-archive ${releaseArchive} --artifact-checksums ${artifactChecksums} --current-symlink ${currentSymlink} --require-current-symlink --database-url "$DATABASE_URL" --backup-manifest ${backupManifest} --require-db-gate --require-restore-drill --execute-system-checks --require-system --api-base-url ${apiBaseUrl} --frontend-url ${frontendUrl} --require-network --force`,
  };

  if (category === "Artifact Integrity") {
    return {
      ...common,
      summary: "Artifact atau checksum belum tervalidasi.",
      action: [
        `Pastikan file artifact ada: ${releaseArchive}`,
        `Pastikan checksum file ada: ${artifactChecksums}`,
        "Jalankan `sha256sum -c artifact-checksums.sha256` dari folder release upload.",
        "Jika mismatch, upload ulang artifact dan checksum dari release package terbaru, jangan lanjutkan symlink/restart.",
      ],
    };
  }

  if (category === "Release Activation") {
    return {
      ...common,
      summary: "Symlink `current` belum mengarah ke release aktif yang benar.",
      action: [
        `Pastikan release target ada dan lengkap: ${releaseDir}`,
        `Jalankan: sudo ln -sfn /var/www/pharmsita/releases/${releaseId} ${currentSymlink}`,
        `Verifikasi: readlink -f ${currentSymlink}`,
        `Restart service setelah symlink benar: sudo systemctl restart ${serviceName}`,
      ],
    };
  }

  if (category === "Nginx") {
    return {
      ...common,
      summary: "Nginx config atau reverse proxy perlu diperbaiki.",
      action: [
        "Jalankan `sudo nginx -t` dan baca file evidence `raw-nginx-test.txt`.",
        "Cek server_name, TLS certificate path, root `dist/`, dan proxy `/api/v1` ke backend.",
        "Setelah config diperbaiki: `sudo nginx -t && sudo systemctl reload nginx`.",
        `Verifikasi HTTPS: npm run deploy:vps:dry-run -- --api-base-url ${apiBaseUrl} --frontend-url ${frontendUrl}`,
      ],
    };
  }

  if (category === "Systemd/Backend Service") {
    return {
      ...common,
      summary: "Service backend belum aktif/stabil.",
      action: [
        `Jalankan: sudo systemctl status ${serviceName} --no-pager`,
        `Baca log: sudo journalctl -u ${serviceName} -n 200 --no-pager`,
        "Cek `/etc/pharmsita/backend.env`, `NODE_ENV=production`, `DB_ADAPTER=postgres`, `DATABASE_URL`, `AUTH_SECRET`, dan `CORS_ORIGIN`.",
        `Jalankan production guard dari release aktif: cd ${releaseDir} && npm run backend:check-production-env`,
        `Restart setelah fix: sudo systemctl restart ${serviceName}`,
      ],
    };
  }

  if (category === "Database Safety") {
    return {
      ...common,
      summary: "Backup/migration gate database belum aman.",
      action: [
        "Buat backup baru: `npm run db:backup -- --label pre-migration`.",
        `Verifikasi backup: npm run db:backup:verify -- --manifest ${backupManifest}`,
        `Jalankan restore drill ke database non-production.`,
        `Jalankan gate: npm run db:migrate:gate -- --manifest ${backupManifest} --require-restore-drill`,
        "Jangan jalankan migration production jika gate belum PASS.",
      ],
    };
  }

  if (category === "Readiness") {
    return {
      ...common,
      summary: "`/health/ready` belum `ready`.",
      action: [
        `Cek readiness: curl -sS ${apiBaseUrl}/health/ready`,
        "Cek migration status: `npm run db:migrate:status`.",
        "Jika migration pending dan backup gate PASS, jalankan `npm run db:migrate -- --dry-run`, lalu `npm run db:migrate`.",
        "Cek koneksi DB, tabel wajib, dan env production.",
      ],
    };
  }

  if (category === "HTTPS/Domain") {
    return {
      ...common,
      summary: "Domain/HTTPS/API health belum tervalidasi.",
      action: [
        `Cek DNS/domain mengarah ke VPS: ${frontendUrl}`,
        `Cek API health: curl -i ${apiBaseUrl}/health`,
        "Cek TLS certificate, firewall, Nginx upstream, dan backend bind host/port.",
        `Jalankan ulang: npm run deploy:vps:dry-run -- --api-base-url ${apiBaseUrl} --frontend-url ${frontendUrl}`,
      ],
    };
  }

  if (category === "Frontend/Nginx Root") {
    return {
      ...common,
      summary: "Frontend root belum tervalidasi.",
      action: [
        `Cek frontend URL: curl -I ${frontendUrl}`,
        "Pastikan `dist/index.html` ada di release aktif.",
        "Pastikan Nginx root menunjuk ke `/var/www/pharmsita/current/dist` dan SPA fallback aktif.",
        "Jika API subdomain berbeda, pastikan frontend build memakai `VITE_API_MODE=http` dan base URL production yang benar.",
      ],
    };
  }

  if (category === "Production Smoke") {
    return {
      ...common,
      summary: "Production no-demo smoke belum PASS.",
      action: [
        `Jalankan smoke preflight: npm run smoke:production:no-demo -- --preflight-only --api-base-url ${apiBaseUrl}`,
        "Cek tabel wajib, migration table, bootstrap admin dry-run, `/health`, dan `/health/ready`.",
        "Jangan jalankan seed demo untuk memperbaiki production.",
      ],
    };
  }

  return {
    ...common,
    summary: "Temuan operasional butuh review manual.",
    action: [
      "Buka evidence file terkait dari `evidence-manifest.json`.",
      "Tentukan apakah temuan ini blocker production atau hanya warning yang perlu sign-off.",
      "Rerun evidence capture setelah tindakan selesai.",
    ],
  };
};

const buildItems = (manifest) => {
  const gates = Array.isArray(manifest.gates) ? manifest.gates : [];
  return gates
    .filter((gate) => ["FAIL", "WARN", "SKIP"].includes(gate.status))
    .map((gate, index) => ({
      id: `R${String(index + 1).padStart(3, "0")}`,
      gate: gate.name,
      status: gate.status,
      severity: severityForGate(gate),
      category: categoryForGate(gate),
      ...remediationForGate(gate, manifest),
    }));
};

const nextDecision = (items, manifest) => {
  if (items.some((item) => item.status === "FAIL")) return "NO-GO";
  if (items.some((item) => item.status === "SKIP")) return "INCOMPLETE";
  if (items.some((item) => item.status === "WARN")) return "GO WITH REVIEW";
  return manifest.decision || "GO";
};

const writeReports = async (options, manifest, items) => {
  await fs.mkdir(options.outputDir, { recursive: true });
  const remediationPath = path.join(options.outputDir, "REMEDIATION.md");
  const jsonPath = path.join(options.outputDir, "remediation-plan.json");

  if (!options.force) {
    for (const target of [remediationPath, jsonPath]) {
      if (await pathExists(target)) {
        throw new Error(`Output already exists: ${target}. Use --force to replace it.`);
      }
    }
  }

  const generatedAt = new Date().toISOString();
  const decision = nextDecision(items, manifest);
  const releaseId = manifest.releaseId || "<release-id>";

  const markdown = `# PharmSITA Go/No-Go Remediation

Generated at: ${generatedAt}

Release: \`${releaseId}\`

Source decision: **${manifest.decision || "-"}**

Remediation decision: **${decision}**

Operator: \`${options.operator || manifest.operator || "-"}\`

Notes: ${options.notes || manifest.notes || "-"}

## Summary

| Status | Count |
|---|---:|
| FAIL | ${items.filter((item) => item.status === "FAIL").length} |
| WARN | ${items.filter((item) => item.status === "WARN").length} |
| SKIP | ${items.filter((item) => item.status === "SKIP").length} |

## Remediation Items

${items.length === 0 ? "No remediation item. Evidence decision is GO.\n" : items.map((item) => `### ${item.id} - ${item.category}

Severity: **${item.severity}**

Gate: \`${item.gate}\`

Status: \`${item.status}\`

Finding: ${item.summary}

Evidence: \`${item.evidence}\`

Actions:
${item.action.map((action) => `- ${action}`).join("\n")}

Verify:

\`\`\`bash
${item.verify}
\`\`\`
`).join("\n")}

## Operator Rule

- Jika ada \`Extra High\`, jangan buka traffic user sampai item PASS.
- Jika decision tetap \`INCOMPLETE\`, jalankan evidence capture di VPS/domain asli tanpa skip flags.
- Jika decision \`NO-GO\`, rollback atau pertahankan release sebelumnya sampai blocker selesai.
`;

  await fs.writeFile(remediationPath, markdown);
  await fs.writeFile(
    jsonPath,
    `${JSON.stringify({
      generatedAt,
      sourceManifest: options.manifest,
      sourceDecision: manifest.decision || "",
      remediationDecision: decision,
      releaseId,
      operator: options.operator || manifest.operator || "",
      notes: options.notes || manifest.notes || "",
      items,
    }, null, 2)}\n`
  );

  return { remediationPath, jsonPath, decision };
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
  const items = buildItems(manifest);
  const result = await writeReports(options, manifest, items);

  console.table(items.map((item) => ({
    id: item.id,
    severity: item.severity,
    status: item.status,
    category: item.category,
    gate: item.gate,
  })));
  console.log(`Remediation report: ${result.remediationPath}`);
  console.log(`Remediation JSON: ${result.jsonPath}`);
  console.log(`Decision: ${result.decision}`);
};

run().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
