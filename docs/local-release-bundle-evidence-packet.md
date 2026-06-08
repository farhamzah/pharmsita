# Local Release Bundle dan Evidence Packet Setelah DB Safety Gate

Tanggal: 2026-06-09  
Task: 129  
Release ID: `pharmsita-task129-local-evidence-bc8a9da`

## Ringkasan Keputusan

Status Task 129: **PASS**.

Release bundle lokal berhasil dibuat setelah local PostgreSQL runtime verification dan backup/restore safety gate PASS. Evidence packet lokal juga berhasil dibuat tanpa validation failure. Karena ini masih lokal, systemd/nginx dan live domain production tidak dieksekusi.

## Input Baseline

| Item | Nilai |
|---|---|
| Git baseline | `bc8a9da` |
| Release ID | `pharmsita-task129-local-evidence-bc8a9da` |
| Local DB | `pharmsita_local` di `localhost:5433` |
| Backup manifest | `E:\Aplikasi\pharmsita\backups\postgres-task128\20260608T222316Z-task128-local-pre-migration.dump.manifest.json` |
| Restore drill manifest | `E:\Aplikasi\pharmsita\backups\postgres-task128\20260608T222316Z-task128-local-pre-migration.dump.20260608T222458Z.restore-drill.json` |
| Role profile QA report | `C:\tmp\pharmsita-task127-role-profile-report.json` |

## Pre-Release Checks

| Check | Result | Notes |
|---|---|---|
| `node --check tools\create-release-bundle.mjs` | PASS | Release packager syntax valid. |
| `node --check tools\postgres-backup-safety-gate.mjs` | PASS | Backup/restore tool syntax valid. |
| `npm.cmd run backend:build` | PASS | Backend build valid. |
| `npm.cmd run build` | PASS | Frontend production build valid. |
| `npm.cmd run backend:check` | PASS | Backend noEmit TypeScript check valid. |
| `npm.cmd run deploy:vps:dry-run -- --skip-network` | PASS | 45 checks, 1 expected placeholder warning. |
| `npm.cmd run db:migrate:gate -- --require-restore-drill` | PASS | Backup gate passed with restore drill requirement. |

Vite still reports the known large chunk warning. This is not a blocker for local release evidence.

## Release Bundle

Command:

```powershell
npm.cmd run release:package -- --release-id pharmsita-task129-local-evidence-bc8a9da --force
```

Output:

```text
E:\Aplikasi\pharmsita\releases\pharmsita-task129-local-evidence-bc8a9da
```

Primary files:

```text
pharmsita-task129-local-evidence-bc8a9da.tar.gz
pharmsita-task129-local-evidence-bc8a9da-rollback.tar.gz
manifest.json
checksums.sha256
artifact-checksums.sha256
INSTALL.md
ROLLBACK.md
```

Checksum source of truth:

```text
releases/pharmsita-task129-local-evidence-bc8a9da/artifact-checksums.sha256
```

Do not copy checksum values into this document as permanent truth, because changing this report changes the release archive checksum. Always verify the generated `artifact-checksums.sha256` file beside the archive.

## Payload Evidence Docs

The release payload includes:

```text
docs/production-readiness-gap-review.md
docs/production-evidence-matrix.md
docs/production-environment-finalization.md
docs/local-postgresql-runtime-final-verification.md
docs/local-postgresql-backup-restore-drill.md
docs/local-release-bundle-evidence-packet.md
```

## Cutover Drill Local

Command:

```powershell
npm.cmd run release:cutover:drill -- --release-archive releases\pharmsita-task129-local-evidence-bc8a9da\pharmsita-task129-local-evidence-bc8a9da.tar.gz --artifact-checksums releases\pharmsita-task129-local-evidence-bc8a9da\artifact-checksums.sha256 --work-dir releases\task129-local-cutover-drill --database-url $env:DATABASE_URL --backup-manifest <task128-backup-manifest> --require-db-gate --require-restore-drill --skip-network --force
```

Result:

```text
Artifact checksum           PASS
Archive extraction          PASS
Excluded secret/demo paths  PASS
Release manifest            PASS
Payload checksums           PASS
Required release payload    PASS
Backup gate                 PASS
VPS live dry-run            SKIP --skip-network
Production no-demo smoke    SKIP --skip-network
Nginx/systemd operator gate PASS
```

Output:

```text
releases/task129-local-cutover-drill/CUTOVER-DRILL.md
releases/task129-local-cutover-drill/cutover-drill-report.json
```

## Local Evidence Packet

Command:

```powershell
npm.cmd run release:production-evidence:run -- --release-id pharmsita-task129-local-evidence-bc8a9da --release-dir releases\pharmsita-task129-local-evidence-bc8a9da\payload --release-archive releases\pharmsita-task129-local-evidence-bc8a9da\pharmsita-task129-local-evidence-bc8a9da.tar.gz --artifact-checksums releases\pharmsita-task129-local-evidence-bc8a9da\artifact-checksums.sha256 --current-symlink releases\pharmsita-task129-local-evidence-bc8a9da\payload --database-url $env:DATABASE_URL --backup-manifest <task128-backup-manifest> --operator "Codex Local" --reviewer "Codex Local" --signer "Codex Local" --work-dir releases\task129-local-evidence-packet --skip-system --skip-network --force
```

Validation:

```text
failures: []
warnings:
- Dry-run only. Pass --execute on the VPS to run the evidence chain.
```

Output:

```text
releases/task129-local-evidence-packet/REAL-VPS-EVIDENCE-RUN.md
releases/task129-local-evidence-packet/real-vps-evidence-run.json
```

## Boundary

This is local/staging-style evidence only:

1. It proves artifact integrity, payload completeness, local DB gate, and command packet readiness.
2. It does not prove VPS systemd, Nginx, HTTPS, or domain production.
3. Production remains NO-GO until real VPS/domain evidence runs without `--skip-system`, `--skip-network`, `--skip-db`, or `--allow-incomplete`.

## Keputusan Task 129

Task 129: **DONE / PASS**.

The release artifact is locally ready for review/push, but production sign-off still requires real VPS inputs and execution.

## Task Berikutnya

### Task 130: Git Commit dan Push Batch Production Readiness + Local Evidence

Prioritas: **High**

Reason: Tasks 124-129 have produced production readiness docs, local DB verification, backup/restore hardening, and local release evidence. The next step is to commit and push this batch so GitHub becomes the shared baseline before any VPS/domain work resumes.
