# Operator Production Access Intake dan Smoke Execution Plan

Tanggal: 2026-06-24
Task: 156
Prioritas: High
Status: READY FOR INTAKE

## Tujuan

Dokumen ini menjadi pintu masuk operator sebelum menjalankan smoke test production PharmSITA. Fokusnya adalah memastikan domain, API, akses login, database gate, dan evidence path sudah jelas sebelum command production dijalankan.

Scope tetap PharmSITA standalone. Jangan mengaitkan intake ini dengan Core/Farmasi UBP workspace.

## Current Finding

Production smoke belum bisa dijalankan penuh dari workspace lokal karena input production asli belum tersedia di repo.

| Input | Status | Keterangan |
|---|---|---|
| Frontend production URL | Missing | Repo hanya punya placeholder seperti `https://<domain-asli>` atau `https://pharmsita.example.ac.id`. |
| API production base URL | Missing | Harus format HTTPS, contoh `https://<domain-asli>/api/v1`. |
| Koordinator QA session | Missing | Dibutuhkan untuk UI smoke Coordinator Student Directory dan share link. |
| `DATABASE_URL` production | Missing | Jangan dikirim lewat chat atau commit. Simpan di env VPS. |
| Backup manifest verified | Missing | Wajib sebelum evidence run production final. |
| Operator/reviewer/signer | Missing | Dibutuhkan untuk sign-off packet. |

## Intake Aman

Data yang boleh dikirim ke thread:

- frontend production URL;
- API base URL;
- nama operator/reviewer/signer;
- output command yang sudah disanitasi;
- screenshot yang tidak menampilkan secret, token, password, atau data pribadi berlebihan.

Data yang tidak boleh dikirim ke thread:

- password production utama;
- `DATABASE_URL` lengkap dengan password;
- `AUTH_SECRET`, refresh token, access token, cookie session;
- dump database;
- private key SSH atau credential VPS.

Jika login UI perlu dites, opsi paling aman adalah operator login manual di browser, lalu QA dilanjutkan dari sesi yang sudah aktif.

## Intake Checklist

### Browser QA Intake

| Item | Required | Status |
|---|---|---|
| Frontend URL HTTPS production | Yes | Pending |
| Role koordinator bisa login | Yes | Pending |
| Browser normal, bukan automation-only context | Yes | Pending |
| Data mahasiswa untuk filter/search tersedia | Yes | Pending |
| Izin capture screenshot sanitized | Yes | Pending |

### VPS Operator Intake

| Item | Required | Status |
|---|---|---|
| Release id final | Yes | Pending |
| Release archive path | Yes | Pending |
| Artifact checksum path | Yes | Pending |
| `/var/www/pharmsita/current` symlink aktif | Yes | Pending |
| `/etc/pharmsita/backend.env` terisi production env | Yes | Pending |
| PostgreSQL database `pharmsita` aktif | Yes | Pending |
| Backup manifest verified | Yes | Pending |
| Nginx config valid | Yes | Pending |
| systemd service `pharmsita-backend` healthy | Yes | Pending |

## Smoke Plan

### Phase 1: Preflight Tanpa Secret

Tujuan: memastikan target production bukan placeholder.

Expected:

- frontend URL memakai `https://`;
- API base URL memakai `https://` dan berakhir `/api/v1`;
- domain bukan `localhost`, IP internal, atau `example.ac.id`;
- operator, reviewer, dan signer sudah ditentukan.

### Phase 2: VPS Dry Run

Jalankan dari release aktif di VPS:

```bash
cd /var/www/pharmsita/current

npm run release:production-evidence:run -- \
  --release-id <release-id> \
  --release-dir /var/www/pharmsita/current \
  --release-archive /var/www/pharmsita/releases/<release-id>.tar.gz \
  --artifact-checksums /var/www/pharmsita/releases/artifact-checksums.sha256 \
  --current-symlink /var/www/pharmsita/current \
  --database-url "$DATABASE_URL" \
  --backup-manifest /var/backups/pharmsita/postgres/<backup>.manifest.json \
  --api-base-url https://<domain-asli>/api/v1 \
  --frontend-url https://<domain-asli> \
  --operator "<nama-operator>" \
  --reviewer "<nama-reviewer>" \
  --signer "<nama-approver>" \
  --force
```

GO untuk lanjut execute hanya jika:

- tidak ada `FAIL`;
- `DATABASE_URL` tampil redacted;
- tidak ada flag `--skip-system`, `--skip-network`, `--skip-db`, atau `--allow-incomplete`;
- domain yang muncul adalah domain asli production.

### Phase 3: Execute Evidence Run

Command execute hanya boleh dijalankan setelah Phase 2 PASS:

```bash
npm run release:production-evidence:run -- \
  --release-id <release-id> \
  --release-dir /var/www/pharmsita/current \
  --release-archive /var/www/pharmsita/releases/<release-id>.tar.gz \
  --artifact-checksums /var/www/pharmsita/releases/artifact-checksums.sha256 \
  --current-symlink /var/www/pharmsita/current \
  --database-url "$DATABASE_URL" \
  --backup-manifest /var/backups/pharmsita/postgres/<backup>.manifest.json \
  --api-base-url https://<domain-asli>/api/v1 \
  --frontend-url https://<domain-asli> \
  --operator "<nama-operator>" \
  --reviewer "<nama-reviewer>" \
  --signer "<nama-approver>" \
  --execute \
  --force
```

Final acceptable status:

- `SIGNED-OFF`, atau
- `SIGN-OFF-WITH-REVIEW` jika warning sudah diterima reviewer.

Jika hasil `SIGN-OFF-BLOCKED`, jangan buka traffic production penuh dan lanjut remediation.

### Phase 4: Coordinator Share Link HTTPS Smoke

Gunakan checklist:

- `docs/coordinator-student-directory-share-link-production-https-smoke.md`
- `docs/coordinator-student-directory-production-https-smoke-signoff.md`
- `docs/coordinator-student-directory-production-evidence-attachment-intake.md`
- `docs/coordinator-student-directory-production-evidence-review-decision.md`

Evidence minimal:

- screenshot halaman monitoring koordinator di HTTPS production;
- screenshot state filter/search/sort/page size yang dipulihkan dari URL;
- screenshot feedback `Link tersalin`;
- clipboard canonical URL production;
- screenshot shared URL dibuka ulang;
- browser/version/operator/timestamp.

## Decision Rule

| Decision | Kondisi |
|---|---|
| GO | Semua intake lengkap, dry-run PASS, execute evidence SIGNED-OFF, dan share link HTTPS PASS. |
| GO WITH REVIEW | Tidak ada blocker, tetapi ada warning minor yang disetujui reviewer. |
| BLOCKED | Domain/API belum final, secret bocor di evidence, health check gagal, DB gate gagal, atau UI production smoke gagal. |
| PENDING | Evidence belum diterima atau operator belum punya akses login/domain. |

## Operator Output Template

```text
Operator:
Tanggal/jam:
Frontend URL:
API base URL:
Release id:
Evidence folder:

Dry-run result:
Execute result:
Coordinator share link result:

Finding:
Decision: GO / GO WITH REVIEW / BLOCKED / PENDING
Reason:
Next action:
```

## Report Task 156

Task 156 menetapkan intake production yang aman sebelum operator menjalankan smoke test. Status saat dokumen dibuat adalah `READY FOR INTAKE`, bukan `GO`, karena domain/API/login/evidence production asli belum diterima.

## Task 157 Intake Packet

Dokumen turunan untuk pengisian domain/API/session tersedia di:

```text
docs/production-domain-api-session-intake.md
```

Gunakan dokumen itu sebagai source of truth sebelum browser smoke atau VPS evidence run dijalankan.

## Task Berikutnya Setelah Intake

Task 158: Production Browser Smoke Execution untuk Koordinator Session dan Share Link Evidence.

Prioritas: High

Reason: setelah Task 157 intake terisi, langkah berikutnya adalah menjalankan smoke browser pada domain HTTPS production dengan session koordinator dan menyimpan evidence sanitized.
