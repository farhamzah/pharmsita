import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import zlib from "node:zlib";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

const usage = `Usage:
  npm.cmd run release:package
  npm.cmd run release:package -- --release-id pharmsita-2026.06.08-1
  npm.cmd run release:package -- --previous-release releases/pharmsita-previous/pharmsita-previous.tar.gz

Options:
  --release-id <value>          Release ID. Default: pharmsita-<version>-<timestamp>-<git-sha>.
  --output-dir <path>           Output directory. Default: releases.
  --previous-release <path>     Previous release archive/dir to include in rollback bundle.
  --force                       Replace an existing release output directory with the same ID.
  --help                        Show this help.

Before running:
  npm.cmd run build
  npm.cmd run backend:build
`;

const requiredEntries = [
  ["dist", "dist"],
  ["backend/dist", "backend/dist"],
  ["backend/database/migrations", "backend/database/migrations"],
  ["backend/database/README.md", "backend/database/README.md"],
  ["deploy/vps", "deploy/vps"],
  ["tools/postgres-migrate.mjs", "tools/postgres-migrate.mjs"],
  ["tools/postgres-backup-safety-gate.mjs", "tools/postgres-backup-safety-gate.mjs"],
  ["tools/postgres-bootstrap-admin.mjs", "tools/postgres-bootstrap-admin.mjs"],
  ["tools/production-no-demo-smoke-test.mjs", "tools/production-no-demo-smoke-test.mjs"],
  ["tools/role-profile-smoke-test.mjs", "tools/role-profile-smoke-test.mjs"],
  ["tools/vps-deployment-dry-run.mjs", "tools/vps-deployment-dry-run.mjs"],
  ["tools/vps-release-cutover-drill.mjs", "tools/vps-release-cutover-drill.mjs"],
  ["tools/vps-live-cutover-qa.mjs", "tools/vps-live-cutover-qa.mjs"],
  ["tools/vps-live-evidence-capture.mjs", "tools/vps-live-evidence-capture.mjs"],
  ["tools/vps-go-no-go-remediation.mjs", "tools/vps-go-no-go-remediation.mjs"],
  ["tools/vps-operator-evidence-review.mjs", "tools/vps-operator-evidence-review.mjs"],
  ["tools/vps-production-signoff-packet.mjs", "tools/vps-production-signoff-packet.mjs"],
  ["tools/vps-real-production-evidence-run.mjs", "tools/vps-real-production-evidence-run.mjs"],
  ["tools/vps-real-evidence-upload-review.mjs", "tools/vps-real-evidence-upload-review.mjs"],
  ["tools/audit-export-attempt-cleanup.mjs", "tools/audit-export-attempt-cleanup.mjs"],
  ["tools/lib/password-hash.mjs", "tools/lib/password-hash.mjs"],
  ["docs/production-deployment-runbook.md", "docs/production-deployment-runbook.md"],
  ["docs/production-readiness-gap-review.md", "docs/production-readiness-gap-review.md"],
  ["docs/production-evidence-matrix.md", "docs/production-evidence-matrix.md"],
  ["docs/production-environment-finalization.md", "docs/production-environment-finalization.md"],
  ["docs/operator-production-access-intake-smoke-plan.md", "docs/operator-production-access-intake-smoke-plan.md"],
  ["docs/production-domain-api-session-intake.md", "docs/production-domain-api-session-intake.md"],
  ["docs/production-browser-smoke-execution-koordinator-share-link.md", "docs/production-browser-smoke-execution-koordinator-share-link.md"],
  ["docs/production-browser-smoke-evidence-intake-reviewer-decision.md", "docs/production-browser-smoke-evidence-intake-reviewer-decision.md"],
  ["docs/production-smoke-evidence-closure-remediation.md", "docs/production-smoke-evidence-closure-remediation.md"],
  ["docs/production-smoke-evidence-actual-intake-remediation-task.md", "docs/production-smoke-evidence-actual-intake-remediation-task.md"],
  ["docs/production-access-input-collection-first-browser-smoke-run.md", "docs/production-access-input-collection-first-browser-smoke-run.md"],
  ["docs/production-first-actual-browser-smoke-run-attempt.md", "docs/production-first-actual-browser-smoke-run-attempt.md"],
  ["docs/production-url-api-manual-login-reattempt-handoff.md", "docs/production-url-api-manual-login-reattempt-handoff.md"],
  ["docs/production-browser-smoke-reattempt-session-ready.md", "docs/production-browser-smoke-reattempt-session-ready.md"],
  ["docs/production-evidence-review-go-blocked-decision.md", "docs/production-evidence-review-go-blocked-decision.md"],
  ["docs/production-smoke-remediation-finding-record.md", "docs/production-smoke-remediation-finding-record.md"],
  ["docs/production-final-evidence-closure-signoff-packet.md", "docs/production-final-evidence-closure-signoff-packet.md"],
  ["docs/production-evidence-actual-submission-signoff-execution.md", "docs/production-evidence-actual-submission-signoff-execution.md"],
  ["docs/production-evidence-input-intake-remediation-output.md", "docs/production-evidence-input-intake-remediation-output.md"],
  ["docs/production-evidence-attachment-review-final-approval-routing.md", "docs/production-evidence-attachment-review-final-approval-routing.md"],
  ["docs/production-final-approval-or-specific-remediation-record.md", "docs/production-final-approval-or-specific-remediation-record.md"],
  ["docs/production-attachment-submission-gate-final-signer-capture.md", "docs/production-attachment-submission-gate-final-signer-capture.md"],
  ["docs/pre-push-change-audit-file-inclusion-review.md", "docs/pre-push-change-audit-file-inclusion-review.md"],
  ["docs/build-smoke-verification-before-commit.md", "docs/build-smoke-verification-before-commit.md"],
  ["docs/post-push-baseline-planning-next-development.md", "docs/post-push-baseline-planning-next-development.md"],
  ["docs/production-evidence-attachment-intake-signoff-verification.md", "docs/production-evidence-attachment-intake-signoff-verification.md"],
  ["docs/frontend-route-code-splitting-bundle-optimization.md", "docs/frontend-route-code-splitting-bundle-optimization.md"],
  ["docs/browser-qa-lazy-route-loading-login-deeplink.md", "docs/browser-qa-lazy-route-loading-login-deeplink.md"],
  ["docs/local-release-artifact-integrity-qa.md", "docs/local-release-artifact-integrity-qa.md"],
  ["docs/local-postgresql-runtime-final-verification.md", "docs/local-postgresql-runtime-final-verification.md"],
  ["docs/local-postgresql-backup-restore-drill.md", "docs/local-postgresql-backup-restore-drill.md"],
  ["docs/local-release-bundle-evidence-packet.md", "docs/local-release-bundle-evidence-packet.md"],
  ["docs/pharmsita-detail-source-alignment-2026-06-24.md", "docs/pharmsita-detail-source-alignment-2026-06-24.md"],
  ["docs/canonical-pharmsita-schema-boundary-migration.md", "docs/canonical-pharmsita-schema-boundary-migration.md"],
  ["docs/canonical-registration-write-path.md", "docs/canonical-registration-write-path.md"],
  ["docs/canonical-guidance-write-path.md", "docs/canonical-guidance-write-path.md"],
  ["docs/canonical-stage-exam-revision-write-path.md", "docs/canonical-stage-exam-revision-write-path.md"],
  ["docs/canonical-read-model-migration.md", "docs/canonical-read-model-migration.md"],
  ["docs/canonical-progress-advancement-write-path.md", "docs/canonical-progress-advancement-write-path.md"],
  ["docs/canonical-reporting-api-endpoint.md", "docs/canonical-reporting-api-endpoint.md"],
  ["docs/coordinator-lifecycle-summary-ui-integration.md", "docs/coordinator-lifecycle-summary-ui-integration.md"],
  ["docs/coordinator-lifecycle-drilldown-student-directory.md", "docs/coordinator-lifecycle-drilldown-student-directory.md"],
  ["docs/coordinator-student-directory-stage-filter-api.md", "docs/coordinator-student-directory-stage-filter-api.md"],
  ["docs/coordinator-student-directory-pagination-search-api.md", "docs/coordinator-student-directory-pagination-search-api.md"],
  ["docs/coordinator-student-directory-ui-qa.md", "docs/coordinator-student-directory-ui-qa.md"],
  ["docs/coordinator-student-directory-page-size-multipage-qa.md", "docs/coordinator-student-directory-page-size-multipage-qa.md"],
  ["docs/coordinator-student-directory-sorting-contract.md", "docs/coordinator-student-directory-sorting-contract.md"],
  ["docs/coordinator-student-directory-sorting-ui-qa.md", "docs/coordinator-student-directory-sorting-ui-qa.md"],
  ["docs/coordinator-student-directory-url-state-sync.md", "docs/coordinator-student-directory-url-state-sync.md"],
  ["docs/coordinator-student-directory-deep-link-regression-qa.md", "docs/coordinator-student-directory-deep-link-regression-qa.md"],
  ["docs/coordinator-student-directory-share-link-ux.md", "docs/coordinator-student-directory-share-link-ux.md"],
  ["docs/coordinator-student-directory-clipboard-success-qa.md", "docs/coordinator-student-directory-clipboard-success-qa.md"],
  ["docs/coordinator-student-directory-share-link-production-https-smoke.md", "docs/coordinator-student-directory-share-link-production-https-smoke.md"],
  ["docs/coordinator-student-directory-production-https-smoke-signoff.md", "docs/coordinator-student-directory-production-https-smoke-signoff.md"],
  ["docs/coordinator-student-directory-production-https-evidence-review.md", "docs/coordinator-student-directory-production-https-evidence-review.md"],
  ["docs/coordinator-student-directory-production-evidence-attachment-intake.md", "docs/coordinator-student-directory-production-evidence-attachment-intake.md"],
  ["docs/coordinator-student-directory-production-evidence-review-decision.md", "docs/coordinator-student-directory-production-evidence-review-decision.md"],
  ["docs/database-backup-restore-drill.md", "docs/database-backup-restore-drill.md"],
  ["docs/release-artifact-packaging.md", "docs/release-artifact-packaging.md"],
  ["docs/role-profile-smoke-runbook.md", "docs/role-profile-smoke-runbook.md"],
  ["docs/vps-deployment-dry-run.md", "docs/vps-deployment-dry-run.md"],
  ["docs/vps-release-cutover-drill.md", "docs/vps-release-cutover-drill.md"],
  ["docs/vps-live-cutover-qa.md", "docs/vps-live-cutover-qa.md"],
  ["docs/vps-live-evidence-capture.md", "docs/vps-live-evidence-capture.md"],
  ["docs/vps-go-no-go-remediation.md", "docs/vps-go-no-go-remediation.md"],
  ["docs/vps-operator-evidence-review.md", "docs/vps-operator-evidence-review.md"],
  ["docs/vps-production-signoff-packet.md", "docs/vps-production-signoff-packet.md"],
  ["docs/vps-real-production-evidence-run.md", "docs/vps-real-production-evidence-run.md"],
  ["docs/vps-real-evidence-upload-review.md", "docs/vps-real-evidence-upload-review.md"],
  ["docs/audit-export-attempt-retention-plan.md", "docs/audit-export-attempt-retention-plan.md"],
  ["package.json", "package.json"],
  ["package-lock.json", "package-lock.json"],
  ["README.md", "README.md"],
  ["backend/README.md", "backend/README.md"],
  [".env.production.example", ".env.production.example"],
  ["backend/.env.production.example", "backend/.env.production.example"],
];

const padOctal = (value, length) => {
  const text = value.toString(8);
  return `${"0".repeat(Math.max(0, length - text.length - 1))}${text}\0`;
};

const writeString = (buffer, offset, length, value) => {
  const bytes = Buffer.from(value);
  bytes.copy(buffer, offset, 0, Math.min(bytes.length, length));
};

const splitTarPath = (entryPath) => {
  const normalized = entryPath.replace(/\\/g, "/");
  if (Buffer.byteLength(normalized) <= 100) {
    return { name: normalized, prefix: "" };
  }

  const parts = normalized.split("/");
  for (let index = parts.length - 1; index > 0; index -= 1) {
    const name = parts.slice(index).join("/");
    const prefix = parts.slice(0, index).join("/");
    if (Buffer.byteLength(name) <= 100 && Buffer.byteLength(prefix) <= 155) {
      return { name, prefix };
    }
  }

  throw new Error(`Tar path is too long: ${normalized}`);
};

const createTarHeader = (entryPath, size, type) => {
  const header = Buffer.alloc(512, 0);
  const { name, prefix } = splitTarPath(entryPath);

  writeString(header, 0, 100, name);
  writeString(header, 100, 8, padOctal(type === "5" ? 0o755 : 0o644, 8));
  writeString(header, 108, 8, padOctal(0, 8));
  writeString(header, 116, 8, padOctal(0, 8));
  writeString(header, 124, 12, padOctal(size, 12));
  writeString(header, 136, 12, padOctal(Math.floor(Date.now() / 1000), 12));
  header.fill(0x20, 148, 156);
  writeString(header, 156, 1, type);
  writeString(header, 257, 6, "ustar");
  writeString(header, 263, 2, "00");
  writeString(header, 265, 32, "pharmsita");
  writeString(header, 297, 32, "pharmsita");
  writeString(header, 345, 155, prefix);

  let checksum = 0;
  for (const byte of header) checksum += byte;
  writeString(header, 148, 8, `${checksum.toString(8).padStart(6, "0")}\0 `);

  return header;
};

const hashBuffer = (buffer) => crypto.createHash("sha256").update(buffer).digest("hex");

const hashFile = async (filename) => hashBuffer(await fs.readFile(filename));

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
    outputDir: path.join(rootDir, "releases"),
    releaseId: "",
    previousRelease: "",
    force: false,
    help: false,
  };

  const args = [...argv];
  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    if (arg === "--release-id") {
      options.releaseId = args[++index] || "";
    } else if (arg === "--output-dir") {
      options.outputDir = path.resolve(args[++index] || "");
    } else if (arg === "--previous-release") {
      options.previousRelease = path.resolve(args[++index] || "");
    } else if (arg === "--force") {
      options.force = true;
    } else if (arg === "--help" || arg === "-h") {
      options.help = true;
    } else {
      throw new Error(`Unknown argument: ${arg}`);
    }
  }

  return options;
};

const getGitValue = (args) => {
  try {
    return execFileSync("git", args, {
      cwd: rootDir,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    }).trim();
  } catch {
    return "";
  }
};

const createReleaseId = async () => {
  const packageJson = await readJson(path.join(rootDir, "package.json"));
  const timestamp = new Date().toISOString().replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "Z");
  const gitSha = getGitValue(["rev-parse", "--short", "HEAD"]) || "nogit";
  return `pharmsita-${packageJson.version}-${timestamp}-${gitSha}`;
};

const assertSafeReleaseId = (releaseId) => {
  if (!/^[a-zA-Z0-9._-]+$/.test(releaseId)) {
    throw new Error("Release ID may only contain letters, numbers, dots, underscores, and hyphens.");
  }
};

const copyEntry = async (source, target) => {
  const sourcePath = path.join(rootDir, source);
  const targetPath = path.join(target, source);
  const stats = await fs.stat(sourcePath);
  await fs.mkdir(path.dirname(targetPath), { recursive: true });

  if (stats.isDirectory()) {
    await fs.cp(sourcePath, targetPath, { recursive: true });
    return;
  }

  await fs.copyFile(sourcePath, targetPath);
};

const collectFiles = async (directory, base = directory) => {
  const entries = await fs.readdir(directory, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const absolute = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      files.push(...await collectFiles(absolute, base));
    } else if (entry.isFile()) {
      files.push({
        absolute,
        relative: path.relative(base, absolute).replace(/\\/g, "/"),
      });
    }
  }

  return files.sort((left, right) => left.relative.localeCompare(right.relative));
};

const createChecksums = async (directory) => {
  const files = await collectFiles(directory);
  const entries = [];

  for (const file of files) {
    const stats = await fs.stat(file.absolute);
    entries.push({
      path: file.relative,
      size: stats.size,
      sha256: await hashFile(file.absolute),
    });
  }

  return entries;
};

const createTarGz = async (sourceDir, archivePath, rootName) => {
  const chunks = [];
  const files = await collectFiles(sourceDir);
  const directories = new Set();

  for (const file of files) {
    const parts = file.relative.split("/");
    for (let index = 1; index < parts.length; index += 1) {
      directories.add(`${rootName}/${parts.slice(0, index).join("/")}/`);
    }
  }

  chunks.push(createTarHeader(`${rootName}/`, 0, "5"));
  [...directories].sort().forEach((directory) => {
    chunks.push(createTarHeader(directory, 0, "5"));
  });

  for (const file of files) {
    const content = await fs.readFile(file.absolute);
    chunks.push(createTarHeader(`${rootName}/${file.relative}`, content.length, "0"));
    chunks.push(content);
    const padding = (512 - (content.length % 512)) % 512;
    if (padding > 0) chunks.push(Buffer.alloc(padding, 0));
  }

  chunks.push(Buffer.alloc(1024, 0));
  await fs.writeFile(archivePath, zlib.gzipSync(Buffer.concat(chunks), { level: 9 }));
};

const writeInstallDoc = async (releaseRoot, releaseId) => {
  await fs.writeFile(
    path.join(releaseRoot, "INSTALL.md"),
    `# Install ${releaseId}

1. Upload \`${releaseId}.tar.gz\` ke VPS.
2. Extract ke release directory baru, misalnya \`/var/www/pharmsita/releases/${releaseId}\`.
3. Jalankan \`npm ci --omit=dev\` di directory release jika \`node_modules\` belum disediakan oleh strategi deploy.
4. Pastikan \`/etc/pharmsita/backend.env\` sudah berisi secret production, bukan file example dari artifact.
5. Jalankan \`npm run backend:check-production-env\`.
6. Jalankan \`npm run db:migrate:status\`, \`npm run db:migrate -- --dry-run\`, lalu \`npm run db:migrate\`.
7. Jalankan \`npm run release:cutover:drill -- --release-archive ../${releaseId}.tar.gz --artifact-checksums ../artifact-checksums.sha256 --work-dir /tmp/pharmsita-cutover-drill --database-url "$DATABASE_URL" --backup-manifest <backup-manifest> --require-db-gate --require-restore-drill --api-base-url https://pharmsita.example.ac.id/api/v1 --force\` sebagai final rehearsal.
8. Update symlink \`/var/www/pharmsita/current\` ke release ini.
9. Jalankan \`sudo nginx -t\` lalu reload Nginx jika config berubah.
10. Jalankan \`sudo systemctl restart pharmsita-backend\`.
11. Jalankan \`npm run deploy:vps:dry-run -- --api-base-url https://pharmsita.example.ac.id/api/v1\`.
12. Jalankan \`npm run release:live-cutover:qa -- --release-dir /var/www/pharmsita/current --release-archive /var/www/pharmsita/releases/${releaseId}.tar.gz --artifact-checksums /var/www/pharmsita/releases/artifact-checksums.sha256 --current-symlink /var/www/pharmsita/current --require-current-symlink --database-url "$DATABASE_URL" --backup-manifest <backup-manifest> --require-db-gate --require-restore-drill --execute-system-checks --require-system --api-base-url https://pharmsita.example.ac.id/api/v1 --require-network --force\`.
13. Jalankan \`npm run release:live-evidence:capture -- --release-dir /var/www/pharmsita/current --release-archive /var/www/pharmsita/releases/${releaseId}.tar.gz --artifact-checksums /var/www/pharmsita/releases/artifact-checksums.sha256 --current-symlink /var/www/pharmsita/current --require-current-symlink --database-url "$DATABASE_URL" --backup-manifest <backup-manifest> --require-db-gate --require-restore-drill --execute-system-checks --require-system --api-base-url https://pharmsita.example.ac.id/api/v1 --require-network --force\` dan simpan \`GO-NO-GO.md\`.
14. Jika decision bukan \`GO\`, jalankan \`npm run release:go-no-go:remediate -- --evidence-dir releases/live-evidence --operator "<nama-operator>" --force\` dan selesaikan \`REMEDIATION.md\`.
15. Review paket evidence operator dengan \`npm run release:operator-evidence:review -- --evidence-dir releases/live-evidence --remediation-dir releases/live-evidence --require-go --reviewer "<nama-reviewer>" --force\`.
16. Buat packet sign-off produksi dengan \`npm run release:production-signoff:packet -- --evidence-dir releases/live-evidence --review-dir releases/live-evidence --remediation-dir releases/live-evidence --release-id ${releaseId} --operator "<nama-operator>" --reviewer "<nama-reviewer>" --signer "<nama-approver>" --require-approved --force\`.
17. Alternatif untuk operator VPS: jalankan satu orchestrator \`npm run release:production-evidence:run -- --release-id ${releaseId} --release-dir /var/www/pharmsita/current --release-archive /var/www/pharmsita/releases/${releaseId}.tar.gz --artifact-checksums /var/www/pharmsita/releases/artifact-checksums.sha256 --current-symlink /var/www/pharmsita/current --database-url "$DATABASE_URL" --backup-manifest <backup-manifest> --api-base-url https://pharmsita.example.ac.id/api/v1 --frontend-url https://pharmsita.example.ac.id --operator "<nama-operator>" --reviewer "<nama-reviewer>" --signer "<nama-approver>" --execute --force\`.
18. Setelah folder output operator di-upload, reviewer menjalankan \`npm run release:production-evidence:upload-review -- --upload-dir <folder-output-operator> --release-id ${releaseId} --reviewer "<nama-reviewer>" --require-signed-off --force\`.

Catatan: artifact tidak membawa \`.env\`, \`node_modules\`, \`backend/.data\`, atau seed demo.
`
  );
};

const writeRollbackDoc = async (releaseRoot, releaseId, previousRelease) => {
  await fs.writeFile(
    path.join(releaseRoot, "ROLLBACK.md"),
    `# Rollback ${releaseId}

Rollback aplikasi:

1. Pastikan ada release sebelumnya di \`/var/www/pharmsita/releases/<previous-release>\`.
2. Pindahkan symlink \`/var/www/pharmsita/current\` kembali ke release sebelumnya.
3. Jalankan \`sudo systemctl restart pharmsita-backend\`.
4. Jalankan \`sudo nginx -t\` dan reload Nginx jika config ikut berubah.
5. Jalankan \`npm run deploy:vps:dry-run -- --api-base-url https://pharmsita.example.ac.id/api/v1\`.
6. Cek log \`/var/log/pharmsita/backend.log\` dan \`/var/log/pharmsita/backend-error.log\`.

Rollback database:

- Gunakan backup \`pg_dump\` yang dibuat sebelum migration.
- Restore database hanya jika migration merusak data/state dan sudah disetujui operator.
- Jangan menjalankan seed demo sebagai rollback production.

Previous release bundle:

${previousRelease ? `- Included from: ${previousRelease}` : "- Not included. Operator wajib memastikan artifact release sebelumnya tersedia di VPS."}
`
  );
};

const writeReleaseNotes = async (payloadDir, releaseId, manifest) => {
  await fs.writeFile(
    path.join(payloadDir, "RELEASE.md"),
    `# ${releaseId}

Created at: ${manifest.createdAt}

Git commit: ${manifest.git.commit || "unknown"}

Included runtime content:

- Frontend build \`dist/\`.
- Backend build \`backend/dist/\`.
- PostgreSQL migration SQL files.
- Production support tools for migration, bootstrap admin, no-demo smoke, VPS dry-run, release cutover drill, live cutover QA, live evidence capture, Go/No-Go remediation, operator evidence review, production sign-off packet, real VPS evidence run orchestration, real evidence upload review, and audit cleanup.
- VPS deployment templates and production runbooks.

Not included:

- \`.env\` files with secret values.
- \`node_modules/\`.
- Local JSON database files.
- Demo seed SQL files.
`
  );
};

const createRollbackBundle = async (releaseRoot, releaseId, previousRelease) => {
  const rollbackDir = path.join(releaseRoot, "rollback");
  await fs.mkdir(rollbackDir, { recursive: true });
  await fs.copyFile(path.join(releaseRoot, "ROLLBACK.md"), path.join(rollbackDir, "ROLLBACK.md"));
  await fs.copyFile(path.join(releaseRoot, "manifest.json"), path.join(rollbackDir, "current-release-manifest.json"));
  await fs.copyFile(path.join(releaseRoot, "checksums.sha256"), path.join(rollbackDir, "current-release-checksums.sha256"));

  if (previousRelease) {
    const previousStats = await fs.stat(previousRelease);
    const target = path.join(rollbackDir, "previous-release", path.basename(previousRelease));
    await fs.mkdir(path.dirname(target), { recursive: true });
    if (previousStats.isDirectory()) {
      await fs.cp(previousRelease, target, { recursive: true });
    } else {
      await fs.copyFile(previousRelease, target);
    }
  } else {
    await fs.writeFile(
      path.join(rollbackDir, "PREVIOUS_RELEASE_REQUIRED.txt"),
      "Previous release artifact was not provided. Keep the last known good release on the VPS before switching current symlink.\n"
    );
  }

  const rollbackArchivePath = path.join(releaseRoot, `${releaseId}-rollback.tar.gz`);
  await createTarGz(rollbackDir, rollbackArchivePath, `${releaseId}-rollback`);
  return rollbackArchivePath;
};

const run = async () => {
  const options = parseArgs(process.argv.slice(2));
  if (options.help) {
    console.log(usage);
    return;
  }

  options.releaseId = options.releaseId || await createReleaseId();
  assertSafeReleaseId(options.releaseId);

  if (options.previousRelease && !await pathExists(options.previousRelease)) {
    throw new Error(`Previous release was not found: ${options.previousRelease}`);
  }

  const releaseRoot = path.join(options.outputDir, options.releaseId);
  const payloadDir = path.join(releaseRoot, "payload");

  if (await pathExists(releaseRoot)) {
    if (!options.force) {
      throw new Error(`Release output already exists: ${releaseRoot}. Use --force to replace it.`);
    }
    await fs.rm(releaseRoot, { recursive: true, force: true });
  }

  await fs.mkdir(payloadDir, { recursive: true });

  for (const [source] of requiredEntries) {
    if (!await pathExists(path.join(rootDir, source))) {
      throw new Error(`Required release input is missing: ${source}`);
    }
  }

  for (const [source] of requiredEntries) {
    await copyEntry(source, payloadDir);
  }

  const packageJson = await readJson(path.join(rootDir, "package.json"));
  const payloadChecksums = await createChecksums(payloadDir);
  const manifest = {
    releaseId: options.releaseId,
    createdAt: new Date().toISOString(),
    package: {
      name: packageJson.name,
      version: packageJson.version,
    },
    git: {
      commit: getGitValue(["rev-parse", "HEAD"]),
      shortCommit: getGitValue(["rev-parse", "--short", "HEAD"]),
      branch: getGitValue(["rev-parse", "--abbrev-ref", "HEAD"]),
      dirty: Boolean(getGitValue(["status", "--porcelain"])),
    },
    excluded: [
      ".env",
      ".env.* secret files",
      "backend/.data",
      "node_modules",
      "backend/database/seeds",
    ],
    payloadFileCount: payloadChecksums.length,
    payloadBytes: payloadChecksums.reduce((total, file) => total + file.size, 0),
    files: payloadChecksums,
  };

  await writeReleaseNotes(payloadDir, options.releaseId, manifest);
  const finalChecksums = await createChecksums(payloadDir);
  manifest.payloadFileCount = finalChecksums.length;
  manifest.payloadBytes = finalChecksums.reduce((total, file) => total + file.size, 0);
  manifest.files = finalChecksums;

  await fs.writeFile(path.join(releaseRoot, "manifest.json"), `${JSON.stringify(manifest, null, 2)}\n`);
  await fs.writeFile(
    path.join(releaseRoot, "checksums.sha256"),
    `${finalChecksums.map((entry) => `${entry.sha256}  ${entry.path}`).join("\n")}\n`
  );
  await writeInstallDoc(releaseRoot, options.releaseId);
  await writeRollbackDoc(releaseRoot, options.releaseId, options.previousRelease);

  const archivePath = path.join(releaseRoot, `${options.releaseId}.tar.gz`);
  const archiveSource = path.join(releaseRoot, "_archive-content");
  await fs.mkdir(archiveSource, { recursive: true });
  await fs.cp(payloadDir, archiveSource, { recursive: true });
  await fs.copyFile(path.join(releaseRoot, "manifest.json"), path.join(archiveSource, "manifest.json"));
  await fs.copyFile(path.join(releaseRoot, "checksums.sha256"), path.join(archiveSource, "checksums.sha256"));
  await fs.copyFile(path.join(releaseRoot, "INSTALL.md"), path.join(archiveSource, "INSTALL.md"));
  await fs.copyFile(path.join(releaseRoot, "ROLLBACK.md"), path.join(archiveSource, "ROLLBACK.md"));
  await createTarGz(archiveSource, archivePath, options.releaseId);
  await fs.rm(archiveSource, { recursive: true, force: true });

  const rollbackArchivePath = await createRollbackBundle(
    releaseRoot,
    options.releaseId,
    options.previousRelease
  );

  const artifactChecksums = [
    {
      path: path.basename(archivePath),
      sha256: await hashFile(archivePath),
    },
    {
      path: path.basename(rollbackArchivePath),
      sha256: await hashFile(rollbackArchivePath),
    },
  ];

  await fs.writeFile(
    path.join(releaseRoot, "artifact-checksums.sha256"),
    `${artifactChecksums.map((entry) => `${entry.sha256}  ${entry.path}`).join("\n")}\n`
  );

  console.table([
    { item: "release", value: options.releaseId },
    { item: "output", value: releaseRoot },
    { item: "archive", value: archivePath },
    { item: "rollback", value: rollbackArchivePath },
    { item: "payload files", value: String(manifest.payloadFileCount) },
    { item: "payload bytes", value: String(manifest.payloadBytes) },
    { item: "git dirty", value: manifest.git.dirty ? "yes" : "no" },
  ]);
  console.log("Release package created.");
};

run().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
