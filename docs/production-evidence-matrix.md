# Production Evidence Matrix dan Operator Checklist Packet

Tanggal: 2026-06-09  
Task: 125  
Scope: PharmSITA standalone. Tidak terhubung ke Core/Farmasi UBP workspace.

## Tujuan

Dokumen ini adalah paket kerja operator untuk mengubah status production dari asumsi menjadi evidence. Setiap tahap punya command, output bukti, kriteria PASS, dan mapping ke gap Task 124.

Dokumen ini belum mengeksekusi deployment. Ini adalah checklist dan format evidence yang harus dipakai saat VPS/domain asli sudah siap.

## Boundary Aman

1. Jangan masukkan `.env`, password database, token, refresh token, atau password user ke folder evidence.
2. Untuk sign-off production asli, jangan pakai `--skip-system`, `--skip-network`, `--skip-db`, atau `--allow-incomplete`.
3. `DATABASE_URL` diset lewat environment di VPS, bukan ditulis penuh di laporan.
4. Domain placeholder seperti `pharmsita.example.ac.id` hanya boleh untuk contoh. Evidence production wajib memakai domain asli.
5. Role profile smoke di production hanya boleh dijalankan jika akun QA production disetujui. Jika tidak, jalankan di staging/smoke database.

## Peran

| Peran | Tanggung jawab |
|---|---|
| Operator | Menjalankan command di VPS, menyimpan output evidence, dan mencatat blocker. |
| Reviewer | Mengecek evidence, memastikan tidak ada skip flag, dan memutuskan evidence `APPROVED` atau `BLOCKED`. |
| Signer | Memberi final production sign-off setelah reviewer approve. |

## Input Wajib

| Input | Contoh | Catatan |
|---|---|---|
| `release-id` | `pharmsita-2026-06-09-001` | Harus sama di artifact, symlink, dan evidence. |
| `frontend-url` | `https://<domain-asli>` | Domain production asli. |
| `api-base-url` | `https://<domain-asli>/api/v1` | API production asli. |
| `release-dir` | `/var/www/pharmsita/current` | Symlink release aktif. |
| `release-archive` | `/var/www/pharmsita/releases/<release-id>.tar.gz` | Artifact release. |
| `artifact-checksums` | `/var/www/pharmsita/releases/artifact-checksums.sha256` | Manifest checksum artifact. |
| `backup-manifest` | `/var/backups/pharmsita/postgres/<backup>.manifest.json` | Manifest backup yang sudah diverifikasi. |
| `operator` | Nama operator | Untuk jejak sign-off. |
| `reviewer` | Nama reviewer | Untuk review evidence. |
| `signer` | Nama approver | Untuk final approval. |

## Evidence Matrix

| Tahap | Priority | Gap Task 124 | Command utama | Evidence wajib | PASS criteria |
|---|---|---|---|---|---|
| Artifact baseline | High | Release artifact retention | `npm run release:package` | release manifest, artifact checksum, commit id | Release id, checksum, dan commit cocok dengan target deploy. |
| Production env guard | Extra High | Secrets/env final | `npm run backend:check-production-env` | output PASS tanpa secret | Guard menerima `NODE_ENV=production`, `DB_ADAPTER=postgres`, `DATABASE_URL`, `AUTH_SECRET`, dan `CORS_ORIGIN`. |
| PostgreSQL tools | Extra High | Backup/migration gate | `npm run db:backup:check-tools` | output `pg_dump` dan `pg_restore` tersedia | Tool backup/restore tersedia di VPS. |
| Backup production | Extra High | Backup/migration gate | `npm run db:backup -- --label pre-migration` | `.dump`, `.sha256`, `.manifest.json` | Backup dibuat di folder backup production. |
| Verify backup | Extra High | Backup/migration gate | `npm run db:backup:verify -- --manifest <backup-manifest>` | output verification PASS | Checksum dan metadata backup valid. |
| Restore drill | Extra High | Backup/migration gate | `npm run db:restore:drill -- --manifest <backup-manifest> --confirm-restore-drill` | restore drill json | Restore berhasil ke database terpisah, bukan database production. |
| Migration safety gate | Extra High | Backup/migration gate | `npm run db:migrate:gate -- --max-age-hours 24 --require-restore-drill --restore-drill-max-age-hours 168` | pre-migration gate json | Gate status `PASS`. |
| Migration execution | Extra High | Real DB readiness | `npm run db:migrate:status`, `npm run db:migrate -- --dry-run`, `npm run db:migrate` | migration status dan log apply | Dry-run aman dan migration sukses tanpa error. |
| Systemd/Nginx | Extra High | Real VPS/domain evidence | `sudo nginx -t`, `sudo systemctl status pharmsita-backend --no-pager` | nginx config test, service status | Nginx valid, service active, backend listen internal. |
| Health/readiness | Extra High | Real VPS/domain evidence | `curl -fsS https://<domain-asli>/api/v1/health`, `curl -fsS https://<domain-asli>/api/v1/health/ready` | JSON health/readiness | Health OK dan readiness `ready` atau tidak ada blocker production. |
| Bootstrap admin | High | Bootstrap admin/first login | `npm run db:bootstrap-admin -- --dry-run`, lalu `npm run db:bootstrap-admin` jika disetujui | output bootstrap tanpa password di evidence | Admin awal tersedia, password sementara disimpan aman, first login wajib update profile/password. |
| No-demo preflight smoke | High | No-demo production proof | `npm run smoke:production:no-demo -- --preflight-only` | smoke log PASS | Tidak ada demo mode, DB production terbaca, health/readiness valid. |
| Optional write smoke | High | Admin/profile live proof | `npm run smoke:production:no-demo -- --allow-write --identifier pharmsita-smoke-admin` | smoke log PASS | Hanya memakai akun smoke khusus, bukan admin harian. |
| Role profile QA | Medium | Profile gate production strategy | `npm run ui:qa:role-profile` | role profile smoke log | PASS jika akun QA production disetujui; jika tidak, evidence staging cukup. |
| Business workflow smoke | High | Workflow E2E selain profile | `npm run ui:qa:postgres-student-workflow` sesuai target | workflow smoke log | Minimal alur utama scope launch PASS. |
| Production evidence run | Extra High | Evidence final | `npm run release:production-evidence:run -- ... --execute --force` | `REAL-VPS-EVIDENCE-RUN.md`, `GO-NO-GO.md`, review, signoff, result json | Final status `SIGNED-OFF`. |
| Upload review | Extra High | Final sign-off | `npm run release:production-evidence:upload-review -- --upload-dir <folder-output> --release-id <release-id> --reviewer "<nama-reviewer>" --require-signed-off --force` | upload review output | Reviewer status `APPROVED`. |

## Checklist Operator VPS

### 1. Persiapan Release

- [ ] Pastikan release id final sudah dipilih.
- [ ] Pastikan artifact release dan checksum ada di VPS.
- [ ] Pastikan symlink `/var/www/pharmsita/current` mengarah ke release aktif.
- [ ] Pastikan `/etc/pharmsita/backend.env` sudah berisi value production final.
- [ ] Pastikan tidak ada secret yang ditempel ke catatan evidence.

### 2. Environment dan Service

- [ ] Jalankan `npm run backend:check-production-env`.
- [ ] Jalankan `sudo nginx -t`.
- [ ] Restart/reload service sesuai runbook.
- [ ] Jalankan `sudo systemctl status pharmsita-backend --no-pager`.
- [ ] Capture status tanpa menampilkan isi env file.

### 3. Database Safety Gate

- [ ] Jalankan `npm run db:backup:check-tools`.
- [ ] Set `DATABASE_URL` lewat environment.
- [ ] Jalankan `npm run db:backup -- --label pre-migration`.
- [ ] Jalankan `npm run db:backup:verify -- --manifest <backup-manifest>`.
- [ ] Buat database restore drill terpisah.
- [ ] Set `RESTORE_DATABASE_URL` lewat environment.
- [ ] Jalankan `npm run db:restore:drill -- --manifest <backup-manifest> --confirm-restore-drill`.
- [ ] Jalankan `npm run db:migrate:gate -- --max-age-hours 24 --require-restore-drill --restore-drill-max-age-hours 168`.

### 4. Migration dan Runtime

- [ ] Jalankan `npm run db:migrate:status`.
- [ ] Jalankan `npm run db:migrate -- --dry-run`.
- [ ] Jalankan `npm run db:migrate`.
- [ ] Restart backend jika migration memerlukan reload runtime.
- [ ] Jalankan health dan readiness dari domain asli.

### 5. Admin dan Smoke

- [ ] Jalankan `npm run db:bootstrap-admin -- --dry-run`.
- [ ] Buat/reset admin awal hanya jika disetujui.
- [ ] Login admin awal dan lakukan profile/password completion.
- [ ] Jalankan `npm run smoke:production:no-demo -- --preflight-only`.
- [ ] Jalankan write smoke hanya jika akun smoke production disetujui.
- [ ] Tentukan apakah `ui:qa:role-profile` dijalankan di production atau staging.

### 6. Evidence Orchestrator

Jalankan dari release aktif:

```bash
cd /var/www/pharmsita/current

npm run release:production-evidence:run -- \
  --release-id <release-id> \
  --release-dir /var/www/pharmsita/current \
  --release-archive /var/www/pharmsita/releases/<release-id>.tar.gz \
  --artifact-checksums /var/www/pharmsita/releases/artifact-checksums.sha256 \
  --current-symlink /var/www/pharmsita/current \
  --database-url "$DATABASE_URL" \
  --backup-manifest <backup-manifest> \
  --api-base-url https://<domain-asli>/api/v1 \
  --frontend-url https://<domain-asli> \
  --operator "<nama-operator>" \
  --reviewer "<nama-reviewer>" \
  --signer "<nama-approver>" \
  --execute \
  --force
```

### 7. Review dan Sign-Off

- [ ] Upload folder output evidence ke reviewer.
- [ ] Reviewer menjalankan upload review dengan `--require-signed-off`.
- [ ] Production hanya boleh GO jika result `APPROVED` dan signoff `SIGNED-OFF`.
- [ ] Jika bukan `SIGNED-OFF`, catat blocker dan ulangi evidence run setelah remediation.

## Required Evidence Folder

Folder evidence production minimal harus berisi:

| File/folder | Wajib | Fungsi |
|---|---|---|
| `REAL-VPS-EVIDENCE-RUN.md` | Ya | Ringkasan command packet dan input. |
| `real-vps-evidence-run.json` | Ya | Packet machine-readable. |
| `01-live-cutover-qa.log` | Ya | Log cutover QA. |
| `02-live-evidence-capture.log` | Ya | Log evidence capture. |
| `evidence/GO-NO-GO.md` | Ya | Keputusan Go/No-Go. |
| `review/OPERATOR-EVIDENCE-REVIEW.md` | Ya | Review operator/reviewer. |
| `signoff/PRODUCTION-SIGNOFF.md` | Ya | Final sign-off packet. |
| `real-vps-evidence-run-result.json` | Ya | Ringkasan final execution. |
| `03-remediation-plan.log` | Jika ada blocker | Bukti remediation plan. |

## Format GO/NO-GO Manual

Jika perlu membuat ringkasan manual untuk manajemen, gunakan format ini:

```text
Release ID:
Commit:
Frontend URL:
API Base URL:
Operator:
Reviewer:
Signer:
Backup Manifest:
Migration Gate:
Health:
Readiness:
No-Demo Smoke:
Role/Profile QA:
Workflow Smoke:
Evidence Folder:

Decision: GO / NO-GO
Reason:
Blocker:
Remediation:
Tanggal/Jam:
```

## Mapping Gap Task 124 ke Evidence

| Gap Task 124 | Evidence penutup |
|---|---|
| Real VPS/domain evidence belum final | `release:production-evidence:run --execute`, `GO-NO-GO.md`, health/readiness domain asli. |
| Backup/restore/migration gate belum terbukti | backup manifest, verify PASS, restore drill json, migration gate PASS. |
| Production secrets/env belum diverifikasi | `backend:check-production-env` PASS tanpa secret leakage. |
| Bootstrap admin/first login belum final | bootstrap admin output, login/profile completion evidence, no-demo smoke. |
| File storage production belum final | Catatan risk acceptance: link-only MVP atau blocker upload file. |
| Email invitation/reset password belum final | SOP manual password/reset dan risk acceptance. |
| Observability belum live | systemd status, request-id/error correlation evidence, logrotate/nginx evidence. |
| Workflow E2E selain profile belum fresh | workflow smoke log sesuai scope launch. |
| Token HMAC scaffold | security sign-off dan HTTPS/secret policy. |
| Role profile smoke menulis data QA | keputusan staging-only atau production QA accounts. |
| Rollback migration manual | backup/restore drill PASS dan operator restore SOP. |
| Artifact retention belum dipilih | release id, artifact path, checksum, retention location. |

## Keputusan Task 125

Status Task 125: **DONE sebagai planning/evidence packet**.

Production tetap **NO-GO** sampai checklist ini dijalankan di VPS/domain asli dan menghasilkan `SIGNED-OFF`.

## Task Berikutnya

### Task 126: Production Environment Finalization dan Evidence Dry Run dengan Domain Asli

Prioritas: **Extra High**

Reason: setelah matriks evidence tersedia, langkah aman berikutnya adalah mengisi value nyata seperti domain, release id, path artifact, backup path, nama operator/reviewer/signer, lalu menjalankan dry run evidence packet tanpa membuka traffic production. Ini memastikan tidak ada placeholder dan command production sudah siap sebelum eksekusi live.

Deliverable Task 126 tersedia di `docs/production-environment-finalization.md`. Statusnya masih blocked untuk final dry-run domain asli karena domain/API production, `DATABASE_URL`, dan verified backup manifest belum tersedia.
