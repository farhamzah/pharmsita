# Production Environment Finalization dan Evidence Dry Run

Tanggal: 2026-06-09  
Task: 126  
Baseline commit: `bc8a9da`  
Scope: PharmSITA standalone. Tidak terhubung ke Core/Farmasi UBP workspace.

## Ringkasan Status

Status Task 126: **BLOCKED untuk final production dry run dengan domain asli**.

Repo belum menyimpan domain PharmSITA production asli. Pencarian hanya menemukan placeholder `pharmsita.example.ac.id`. Karena domain adalah input production yang sensitif, domain tidak boleh ditebak dari domain sistem lain seperti Core.

Dry-run evidence lokal sudah dijalankan dan berhasil membuat packet, tetapi hasilnya **FAIL sesuai harapan** karena input production wajib belum tersedia:

1. `DATABASE_URL` belum tersedia.
2. `backup-manifest` belum tersedia.
3. `api-base-url` atau domain API asli belum tersedia.
4. HTTPS API production belum bisa divalidasi.

Artinya: tooling siap, tetapi environment production belum final.

## Nilai Production yang Sudah Bisa Dikunci

| Item | Nilai |
|---|---|
| Release id kandidat | `pharmsita-task126-bc8a9da` |
| Release dir VPS | `/var/www/pharmsita/current` |
| Release archive VPS | `/var/www/pharmsita/releases/pharmsita-task126-bc8a9da.tar.gz` |
| Artifact checksum VPS | `/var/www/pharmsita/releases/artifact-checksums.sha256` |
| Current symlink | `/var/www/pharmsita/current` |
| Backend env file | `/etc/pharmsita/backend.env` |
| Backend service | `pharmsita-backend` |
| Backend internal port | `4000` |
| API prefix | `/api/v1` |
| Database adapter | `postgres` |
| Database name rekomendasi | `pharmsita` |
| Backup dir rekomendasi | `/var/backups/pharmsita/postgres` |

## Input yang Masih Wajib Diisi

| Input | Status | Catatan |
|---|---|---|
| Frontend production domain | Missing | Contoh format: `https://<domain-asli>`. |
| API production base URL | Missing | Contoh format: `https://<domain-asli>/api/v1`. |
| `CORS_ORIGIN` production | Missing | Harus sama dengan frontend production origin. |
| `DATABASE_URL` production | Missing | Jangan commit. Simpan hanya di `/etc/pharmsita/backend.env` atau env VPS. |
| `AUTH_SECRET` production | Missing | Harus long random secret unik production. |
| Backup manifest verified | Missing | Dibuat setelah `db:backup` dan `db:backup:verify`. |
| Restore drill evidence | Missing | Dibuat setelah `db:restore:drill`. |
| Operator/reviewer/signer final | Missing | Saat ini masih `Operator TBD`, `Reviewer TBD`, `Signer TBD`. |

## Backend Env Production Target

File target VPS:

```text
/etc/pharmsita/backend.env
```

Template aman tanpa secret:

```bash
NODE_ENV=production
PORT=4000
API_PREFIX=/api/v1
CORS_ORIGIN=https://<domain-asli>

DB_ADAPTER=postgres
DATABASE_URL=postgres://pharmsita_user:<password-kuat>@127.0.0.1:5432/pharmsita
DATABASE_SSL=false
DATABASE_POOL_MAX=10
MIGRATION_ADVISORY_LOCK_KEY=810098

AUTH_SECRET=<long-random-production-secret>
ACCESS_TOKEN_TTL_SECONDS=3600
REFRESH_TOKEN_TTL_SECONDS=604800

AUDIT_EXPORT_CLEANUP_ENABLED=false
AUDIT_EXPORT_CLEANUP_INTERVAL_SECONDS=86400
AUDIT_EXPORT_ALLOWED_RETENTION_DAYS=30
AUDIT_EXPORT_BLOCKED_RETENTION_DAYS=90
AUDIT_EXPORT_CLEANUP_BATCH_SIZE=1000
AUDIT_EXPORT_CLEANUP_ADVISORY_LOCK_KEY=810081
```

Boundary:

1. Jangan commit file env production berisi secret.
2. Jangan menempel `DATABASE_URL` asli ke chat atau evidence packet.
3. Jalankan `npm run backend:check-production-env` di VPS setelah env diisi.

## Frontend Env Production Target

File build-time:

```text
.env.production
```

Template:

```bash
VITE_API_MODE=http
VITE_API_BASE_URL=https://<domain-asli>/api/v1
VITE_DEMO_MODE=false
```

Build frontend production harus dibuat ulang setelah `VITE_API_BASE_URL` final.

## Dry Run yang Sudah Dijalankan

Command lokal:

```powershell
npm.cmd run release:production-evidence:run -- --release-id pharmsita-task126-bc8a9da --release-dir /var/www/pharmsita/current --release-archive /var/www/pharmsita/releases/pharmsita-task126-bc8a9da.tar.gz --artifact-checksums /var/www/pharmsita/releases/artifact-checksums.sha256 --current-symlink /var/www/pharmsita/current --operator "Operator TBD" --reviewer "Reviewer TBD" --signer "Signer TBD" --work-dir releases/task126-production-evidence-dry-run --force
```

Output lokal:

```text
releases/task126-production-evidence-dry-run/REAL-VPS-EVIDENCE-RUN.md
releases/task126-production-evidence-dry-run/real-vps-evidence-run.json
```

Validation result:

| Type | Detail |
|---|---|
| FAIL | `DATABASE_URL or --database-url is required unless --skip-db is used.` |
| FAIL | `--backup-manifest is required unless --skip-db is used.` |
| FAIL | `--api-base-url or API_BASE_URL is required unless --skip-network is used.` |
| FAIL | `Production API URL must be HTTPS unless --allow-http is used for staging.` |
| WARN | `Dry-run only. Pass --execute on the VPS to run the evidence chain.` |

Catatan: dry-run lokal di Windows menormalisasi path Linux menjadi path Windows di packet. Untuk packet final, jalankan dry-run ulang di VPS supaya path tetap `/var/www/pharmsita/...`.

## Command Dry Run Final di VPS

Jalankan setelah domain asli, env production, release artifact, dan backup manifest tersedia:

```bash
cd /var/www/pharmsita/current

export DATABASE_URL='postgres://pharmsita_user:***@127.0.0.1:5432/pharmsita'

npm run release:production-evidence:run -- \
  --release-id pharmsita-task126-bc8a9da \
  --release-dir /var/www/pharmsita/current \
  --release-archive /var/www/pharmsita/releases/pharmsita-task126-bc8a9da.tar.gz \
  --artifact-checksums /var/www/pharmsita/releases/artifact-checksums.sha256 \
  --current-symlink /var/www/pharmsita/current \
  --database-url "$DATABASE_URL" \
  --backup-manifest /var/backups/pharmsita/postgres/<backup>.manifest.json \
  --api-base-url https://<domain-asli>/api/v1 \
  --frontend-url https://<domain-asli> \
  --operator "<nama-operator>" \
  --reviewer "<nama-reviewer>" \
  --signer "<nama-approver>" \
  --work-dir releases/task126-production-evidence-dry-run \
  --force
```

Expected dry-run result setelah input final:

1. Tidak ada `FAIL`.
2. Hanya ada `WARN` bahwa ini dry-run.
3. Packet command sudah memakai domain asli.
4. `DATABASE_URL` tampil sebagai `"$DATABASE_URL"` atau redacted.
5. Tidak ada `--skip-system`, `--skip-network`, `--skip-db`, atau `--allow-incomplete`.

## Command Execute Production Evidence

Command ini belum boleh dijalankan sampai dry-run final PASS:

```bash
npm run release:production-evidence:run -- \
  --release-id pharmsita-task126-bc8a9da \
  --release-dir /var/www/pharmsita/current \
  --release-archive /var/www/pharmsita/releases/pharmsita-task126-bc8a9da.tar.gz \
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

## Keputusan Task 126

Task 126 menghasilkan:

1. Finalization packet environment production.
2. Dry-run evidence lokal yang membuktikan blocker input.
3. Command VPS dry-run final yang siap dijalankan setelah domain asli dan database evidence tersedia.

Production tetap **NO-GO**.

## Task Berikutnya

### Task 127: Real Domain, DATABASE_URL, dan Backup Manifest Intake untuk VPS Dry Run PASS

Prioritas: **Extra High**

Reason: Task 126 membuktikan tooling siap tetapi input production belum final. Task berikutnya harus mengisi domain asli, database URL production di VPS, backup manifest verified, dan nama operator/reviewer/signer, lalu menjalankan ulang dry-run evidence di VPS sampai validation tidak memiliki `FAIL`.
