# PharmSITA Production Deployment Runbook

Dokumen ini menjadi batas operasional production untuk PharmSITA standalone. PharmSITA tidak bergantung ke `core-farmasi`; integrasi lintas aplikasi tetap dianggap fase terpisah.

## Prinsip Production

- Backend production memakai `DB_ADAPTER=postgres`.
- Frontend production memakai `VITE_API_MODE=http` dan `VITE_DEMO_MODE=false`.
- Seed `backend/database/seeds/001_demo_auth.sql` dan `002_demo_master_data.sql` hanya untuk QA lokal/staging data dummy, bukan production.
- Admin pertama dibuat melalui bootstrap terkontrol dengan password sementara dan wajib ganti password saat login pertama.
- Migration harus dijalankan berurutan dan database di-backup sebelum upgrade.

## Environment Backend

Gunakan `backend/.env.production.example` sebagai template process manager atau VPS env:

```text
NODE_ENV=production
PORT=4000
API_PREFIX=/api/v1
CORS_ORIGIN=https://pharmsita.example.ac.id
DB_ADAPTER=postgres
DATABASE_URL=postgres://pharmsita_user:change-this-password@127.0.0.1:5432/pharmsita
DATABASE_SSL=false
DATABASE_POOL_MAX=10
AUTH_SECRET=replace-with-a-long-random-secret
ACCESS_TOKEN_TTL_SECONDS=3600
REFRESH_TOKEN_TTL_SECONDS=604800
AUDIT_EXPORT_CLEANUP_ENABLED=false
```

Production guard:

- `AUTH_SECRET` wajib unik dan panjang untuk setiap environment.
- `AUTH_SECRET` tidak boleh memakai placeholder seperti `change-this`, `replace-with`, atau `dev-only`.
- `CORS_ORIGIN` harus berisi domain frontend production, bukan wildcard, localhost, loopback, atau domain example.
- `DATABASE_URL` wajib PostgreSQL, lengkap dengan username/password/database, dan tidak boleh diarahkan ke database smoke.
- `DB_ADAPTER` wajib `postgres`.
- `AUDIT_EXPORT_CLEANUP_ENABLED` tetap `false` sampai operator menyetujui scheduler cleanup.

## Environment Frontend

Gunakan `.env.production.example` sebagai template build frontend:

```text
VITE_API_MODE=http
VITE_API_BASE_URL=https://pharmsita.example.ac.id/api/v1
VITE_DEMO_MODE=false
```

Jika backend memakai subdomain terpisah, contoh:

```text
VITE_API_BASE_URL=https://api-pharmsita.example.ac.id/api/v1
```

Samakan origin frontend di `CORS_ORIGIN`.

## Build

Perintah build dari root project:

```powershell
npm.cmd install
npm.cmd run build
npm.cmd run backend:build
```

Artifact:

- Frontend: `dist/`
- Backend: `backend/dist/`

Paket release:

```powershell
npm.cmd run release:package
```

Output berada di `releases/<release-id>/` dan berisi archive utama, rollback bundle, manifest, serta checksum SHA-256. Detail tersedia di:

```text
docs/release-artifact-packaging.md
```

Backend start command:

```powershell
npm.cmd run backend:start
```

Validasi env production sebelum start/restart backend:

```powershell
$env:NODE_ENV="production"
npm.cmd run backend:check-production-env
```

Command ini memakai startup guard yang sama dengan server production. Jika guard gagal, backend production juga akan menolak start.

Di VPS Linux, process manager menjalankan perintah ekuivalen:

```bash
node backend/dist/server.js
```

## Reverse Proxy, Process Manager, dan Log Rotation

Template deployment VPS tersedia di:

```text
deploy/vps/
```

Isi template:

| File | Target VPS | Fungsi |
|---|---|---|
| `deploy/vps/backend.env.example` | `/etc/pharmsita/backend.env` | Env backend production untuk systemd |
| `deploy/vps/nginx/pharmsita.conf.example` | `/etc/nginx/conf.d/pharmsita.conf` | Serve frontend `dist/` dan proxy `/api/v1` ke backend |
| `deploy/vps/systemd/pharmsita-backend.service.example` | `/etc/systemd/system/pharmsita-backend.service` | Process manager backend Node.js |
| `deploy/vps/logrotate/pharmsita.example` | `/etc/logrotate.d/pharmsita` | Rotasi log backend dan Nginx PharmSITA |

Layout release yang diasumsikan:

```text
/var/www/pharmsita/current
  dist/
  backend/dist/
  package.json
  node_modules/
```

Backend hanya bind ke `127.0.0.1:4000` melalui env `PORT=4000`; trafik publik masuk dari Nginx. Nginx template meneruskan header berikut ke backend:

```text
Host
X-Real-IP
X-Forwarded-For
X-Forwarded-Proto
X-Forwarded-Host
X-Request-Id
```

`X-Request-Id` dipertahankan jika client/reverse proxy upstream sudah mengirim nilai valid. Jika kosong, Nginx membuat request ID dan backend tetap membuat fallback UUID jika header tidak ada.

Setup awal di VPS:

```bash
sudo useradd --system --home /var/www/pharmsita --shell /usr/sbin/nologin pharmsita
sudo mkdir -p /etc/pharmsita /var/www/pharmsita/current /var/log/pharmsita
sudo chown -R pharmsita:pharmsita /var/www/pharmsita /var/log/pharmsita
sudo cp deploy/vps/backend.env.example /etc/pharmsita/backend.env
sudo cp deploy/vps/systemd/pharmsita-backend.service.example /etc/systemd/system/pharmsita-backend.service
sudo cp deploy/vps/nginx/pharmsita.conf.example /etc/nginx/conf.d/pharmsita.conf
sudo cp deploy/vps/logrotate/pharmsita.example /etc/logrotate.d/pharmsita
sudo chmod 640 /etc/pharmsita/backend.env
```

Sebelum start:

1. Edit domain di Nginx dan frontend env.
2. Pasang sertifikat TLS atau sesuaikan path `ssl_certificate`.
3. Isi `DATABASE_URL`, `AUTH_SECRET`, dan `CORS_ORIGIN` production di `/etc/pharmsita/backend.env`.
4. Jalankan build, production env guard, migration, dan preflight smoke test.

Validasi service dan proxy:

```bash
sudo nginx -t
sudo systemctl daemon-reload
sudo systemctl enable pharmsita-backend
sudo systemctl start pharmsita-backend
sudo systemctl status pharmsita-backend
curl -I https://pharmsita.example.ac.id/api/v1/health
```

Validasi log rotation:

```bash
sudo logrotate -d /etc/logrotate.d/pharmsita
```

Jika distro memakai user/group Nginx berbeda dari `www-data:adm`, sesuaikan bagian `create` di template logrotate.

Dry-run template dan HTTPS health check:

```bash
npm run deploy:vps:dry-run -- --api-base-url https://pharmsita.example.ac.id/api/v1
```

Jika frontend dan backend memakai domain berbeda:

```bash
npm run deploy:vps:dry-run -- --api-base-url https://api-pharmsita.example.ac.id/api/v1 --frontend-url https://pharmsita.example.ac.id
```

Untuk validasi template lokal tanpa memanggil domain luar:

```powershell
npm.cmd run deploy:vps:dry-run -- --skip-network
```

Detail dry-run tersedia di:

```text
docs/vps-deployment-dry-run.md
```

## Migration Production

Jalankan migration dengan versioned runner agar database mencatat migration yang sudah applied:

```powershell
$env:DATABASE_URL="postgres://pharmsita_user:***@127.0.0.1:5432/pharmsita"
npm.cmd run db:backup -- --label pre-migration
npm.cmd run db:backup:verify -- --manifest backups/postgres/<file>.manifest.json
npm.cmd run db:restore:drill -- --manifest backups/postgres/<file>.manifest.json --restore-database-url "postgres://pharmsita_user:***@127.0.0.1:5432/pharmsita_restore_drill" --confirm-restore-drill
npm.cmd run db:migrate:gate -- --require-restore-drill
npm.cmd run db:migrate:status
npm.cmd run db:migrate -- --dry-run
npm.cmd run db:migrate
```

Detail backup, restore drill, dan pre-migration gate tersedia di:

```text
docs/database-backup-restore-drill.md
```

Runner membuat tabel `pharmsita_schema_migrations`, memvalidasi checksum migration yang sudah applied, dan memakai PostgreSQL advisory lock agar dua proses tidak menjalankan migration bersamaan.

Migration schema yang dikelola runner:

```text
backend/database/migrations/001_auth_master_data.sql
backend/database/migrations/002_permissions_and_workflow.sql
backend/database/migrations/003_multi_role_first_login.sql
backend/database/migrations/004_final_project_registration.sql
backend/database/migrations/005_guidance_type_materials.sql
backend/database/migrations/006_audit_export_guard.sql
backend/database/migrations/007_user_profile_contact.sql
backend/database/migrations/008_role_profile_fields.sql
```

Jangan jalankan file berikut di production:

```text
backend/database/seeds/001_demo_auth.sql
backend/database/seeds/002_demo_master_data.sql
```

Jika database production lama sudah pernah dimigrasikan manual sebelum runner ini ada, lakukan baseline satu kali setelah memastikan schema sudah sesuai:

```powershell
$env:DATABASE_URL="postgres://pharmsita_user:***@127.0.0.1:5432/pharmsita"
npm.cmd run db:migrate:baseline -- --confirm-baseline
npm.cmd run db:migrate:status
```

## No-Demo Bootstrap Admin

Setelah migration selesai, database masih kosong. Buat satu admin awal dengan password sementara.

1. Set password sementara melalui environment agar tidak masuk shell history:

```powershell
$env:DATABASE_URL="postgres://pharmsita_user:***@127.0.0.1:5432/pharmsita"
$env:PHARMSITA_BOOTSTRAP_PASSWORD="Temporary-Password-Change-Me-123"
$env:PHARMSITA_BOOTSTRAP_EMAIL="admin@example.ac.id"
```

2. Jalankan dry-run:

```powershell
npm.cmd run db:bootstrap-admin -- --dry-run
```

3. Commit bootstrap:

```powershell
npm.cmd run db:bootstrap-admin
```

Default identifier adalah `superadmin`, nama `Super Admin PharmSITA`, dan employee number `SUPERADMIN-001`. Untuk mengganti:

```powershell
npm.cmd run db:bootstrap-admin -- --identifier superadmin --name "Super Admin PharmSITA" --email admin@example.ac.id
```

Jika akun bootstrap sudah ada dan perlu reset password:

```powershell
$env:PHARMSITA_BOOTSTRAP_PASSWORD="New-Temporary-Password-123"
npm.cmd run db:bootstrap-admin -- --reset-password
```

4. Login sebagai `superadmin` dengan password sementara.
5. Selesaikan first-login wizard dan ganti password.
6. Buat admin personal lain dari UI Admin User Management.
7. Nonaktifkan atau reset ulang akun bootstrap jika tidak lagi dipakai harian.

## Master Data Production

Setelah admin aktif, isi master data lewat UI admin/API:

- Periode akademik aktif.
- Jenis TA production.
- Dokumen pendukung.
- Requirement definition.
- Dosen dan koordinator dengan profile lengkap.
- Kuota pembimbing.

Master data demo SQL tidak dipakai agar production tidak membawa akun/data dummy.

## Pre-Release QA Checklist

Wajib sebelum deploy:

```powershell
npm.cmd run build
npm.cmd run backend:build
npm.cmd run backend:check
npm.cmd run deploy:vps:dry-run -- --skip-network
npm.cmd run release:package
npm.cmd run db:backup:check-tools
git diff --check
```

Smoke test PostgreSQL boleh dijalankan di database staging atau database smoke terpisah:

```powershell
$env:DATABASE_URL="postgres://user:pass@localhost:5432/pharmsita_smoke"
npm.cmd run api:smoke:postgres-auth
npm.cmd run api:smoke:postgres-final-project
```

Jangan menjalankan smoke test yang memakai seed demo ke database production.

Smoke test no-demo production/staging:

```powershell
$env:DATABASE_URL="postgres://user:pass@localhost:5432/pharmsita"
$env:API_BASE_URL="https://pharmsita.example.ac.id/api/v1"
npm.cmd run smoke:production:no-demo -- --preflight-only
```

Preflight mode mengecek PostgreSQL, tabel production wajib, migration version table, bootstrap admin dry-run, `/health`, dan `/health/ready`. Mode ini tidak membuat atau mengubah user.

Untuk staging atau akun smoke production yang memang disiapkan, jalankan write workflow:

```powershell
$env:DATABASE_URL="postgres://user:pass@localhost:5432/pharmsita_staging"
$env:API_BASE_URL="https://staging-pharmsita.example.ac.id/api/v1"
npm.cmd run smoke:production:no-demo -- --allow-write --identifier pharmsita-smoke-admin
```

Write workflow hanya menyentuh akun dedicated smoke admin: reset/bootstrap admin smoke, first-login, diagnostics admin, dan profile update. Jangan gunakan identifier admin operasional harian.

## Release Cutover Drill

Sebelum window production, lakukan rehearsal di staging atau VPS dengan artifact yang sama:

```bash
cd /var/www/pharmsita/releases
sha256sum -c artifact-checksums.sha256
tar -xzf <release-id>.tar.gz
cd <release-id>
npm ci --omit=dev
npm run release:cutover:drill \
  --release-archive ../<release-id>.tar.gz \
  --artifact-checksums ../artifact-checksums.sha256 \
  --work-dir /tmp/pharmsita-cutover-drill \
  --database-url "$DATABASE_URL" \
  --backup-manifest /var/backups/pharmsita/postgres/<backup>.manifest.json \
  --require-db-gate \
  --require-restore-drill \
  --api-base-url https://pharmsita.example.ac.id/api/v1 \
  --frontend-url https://pharmsita.example.ac.id \
  --force
```

Output `CUTOVER-DRILL.md` menjadi checklist operator. Jika ada status `FAIL`, jangan lanjutkan symlink/restart service.

## Live Cutover QA

Setelah symlink `current` diarahkan ke release baru dan `pharmsita-backend` di-restart, jalankan live QA:

```bash
cd /var/www/pharmsita/current
npm run release:live-cutover:qa \
  --release-dir /var/www/pharmsita/current \
  --release-archive /var/www/pharmsita/releases/<release-id>.tar.gz \
  --artifact-checksums /var/www/pharmsita/releases/artifact-checksums.sha256 \
  --current-symlink /var/www/pharmsita/current \
  --require-current-symlink \
  --database-url "$DATABASE_URL" \
  --backup-manifest /var/backups/pharmsita/postgres/<backup>.manifest.json \
  --require-db-gate \
  --require-restore-drill \
  --execute-system-checks \
  --require-system \
  --api-base-url https://pharmsita.example.ac.id/api/v1 \
  --frontend-url https://pharmsita.example.ac.id \
  --require-network \
  --force
```

Jika `nginx -t` butuh root, jalankan command dengan `--sudo-system` atau eksekusi dari user operator yang punya izin.

## Evidence Capture dan Go/No-Go

Setelah live QA PASS, ambil bukti operasional dan buat keputusan Go/No-Go:

```bash
cd /var/www/pharmsita/current
npm run release:live-evidence:capture \
  --release-dir /var/www/pharmsita/current \
  --release-id <release-id> \
  --release-archive /var/www/pharmsita/releases/<release-id>.tar.gz \
  --artifact-checksums /var/www/pharmsita/releases/artifact-checksums.sha256 \
  --current-symlink /var/www/pharmsita/current \
  --require-current-symlink \
  --database-url "$DATABASE_URL" \
  --backup-manifest /var/backups/pharmsita/postgres/<backup>.manifest.json \
  --require-db-gate \
  --require-restore-drill \
  --execute-system-checks \
  --require-system \
  --api-base-url https://pharmsita.example.ac.id/api/v1 \
  --frontend-url https://pharmsita.example.ac.id \
  --require-network \
  --operator "<nama-operator>" \
  --notes "Production cutover evidence" \
  --force
```

Simpan `GO-NO-GO.md` dan `evidence-manifest.json` sebagai lampiran release. Jika decision `NO-GO` atau `INCOMPLETE`, jangan buka traffic production penuh.

Jika decision bukan `GO`, buat remediation plan:

```bash
cd /var/www/pharmsita/current
npm run release:go-no-go:remediate \
  --evidence-dir releases/live-evidence \
  --operator "<nama-operator>" \
  --notes "Remediation after real VPS evidence run" \
  --force
```

Selesaikan item `Extra High` sebelum membuka traffic user. Setelah remediation, jalankan ulang evidence capture tanpa skip flags.

Review paket evidence operator sebelum membuka traffic penuh:

```bash
npm run release:operator-evidence:review \
  --evidence-dir releases/live-evidence \
  --remediation-dir releases/live-evidence \
  --reviewer "<nama-reviewer>" \
  --operator "<nama-operator>" \
  --require-go \
  --force
```

Simpan `OPERATOR-EVIDENCE-REVIEW.md` sebagai lampiran release.

Buat packet sign-off produksi hanya jika review sudah `APPROVED`:

```bash
npm run release:production-signoff:packet \
  --evidence-dir releases/live-evidence \
  --review-dir releases/live-evidence \
  --remediation-dir releases/live-evidence \
  --release-id <release-id> \
  --operator "<nama-operator>" \
  --reviewer "<nama-reviewer>" \
  --signer "<nama-approver>" \
  --require-approved \
  --force
```

Simpan `PRODUCTION-SIGNOFF.md`, `production-signoff-packet.json`, dan `production-signoff-checksums.sha256` sebagai lampiran final release.

Alternatif Task 113: jalankan satu orchestrator dari VPS untuk membuat semua bukti final sekaligus:

```bash
npm run release:production-evidence:run \
  --release-id <release-id> \
  --release-dir /var/www/pharmsita/current \
  --release-archive /var/www/pharmsita/releases/<release-id>.tar.gz \
  --artifact-checksums /var/www/pharmsita/releases/artifact-checksums.sha256 \
  --current-symlink /var/www/pharmsita/current \
  --database-url "$DATABASE_URL" \
  --backup-manifest <backup-manifest> \
  --api-base-url https://pharmsita.example.ac.id/api/v1 \
  --frontend-url https://pharmsita.example.ac.id \
  --operator "<nama-operator>" \
  --reviewer "<nama-reviewer>" \
  --signer "<nama-approver>" \
  --execute \
  --force
```

Untuk production asli, jangan gunakan `--skip-system`, `--skip-network`, `--skip-db`, atau `--allow-incomplete`.
Ganti `https://pharmsita.example.ac.id` dengan domain PharmSITA asli sebelum menjalankan `--execute`.
Setelah folder output operator di-upload ke reviewer, jalankan `npm run release:production-evidence:upload-review -- --upload-dir <folder-output-operator> --release-id <release-id> --reviewer "<nama-reviewer>" --require-signed-off --force`.

## Deployment Checklist VPS

1. Pull artifact atau source release yang sudah diuji.
2. Verifikasi `artifact-checksums.sha256`.
3. Extract archive ke release directory baru, misalnya `/var/www/pharmsita/releases/<release-id>`.
4. Install dependency production dengan `npm ci --omit=dev`.
5. Copy dan edit template `deploy/vps/backend.env.example` bila env belum dibuat.
6. Copy dan edit template Nginx, systemd, dan logrotate dari `deploy/vps/` bila belum dibuat.
7. Jalankan `npm run backend:check-production-env`.
8. Jalankan `npm run db:backup -- --label pre-migration`.
9. Jalankan `npm run db:backup:verify -- --manifest <backup-manifest>`.
10. Jalankan restore drill ke database non-production.
11. Jalankan `npm run db:migrate:gate -- --require-restore-drill`.
12. Jalankan `npm run release:cutover:drill -- --release-archive ../<release-id>.tar.gz --artifact-checksums ../artifact-checksums.sha256 --work-dir /tmp/pharmsita-cutover-drill --database-url "$DATABASE_URL" --backup-manifest <backup-manifest> --require-db-gate --require-restore-drill --api-base-url https://pharmsita.example.ac.id/api/v1 --force`.
13. Jalankan `npm run db:migrate:status`.
14. Jalankan `npm run db:migrate -- --dry-run`.
15. Jalankan `npm run db:migrate`.
16. Bootstrap admin pertama jika database baru.
17. Update symlink `/var/www/pharmsita/current` ke release baru.
18. Validasi `sudo nginx -t`.
19. Start/restart backend via `systemctl`.
20. Serve frontend `dist/` melalui Nginx.
21. Pastikan reverse proxy meneruskan request `/api/v1` ke backend atau frontend memakai API subdomain yang benar.
22. Jalankan `npm run deploy:vps:dry-run -- --api-base-url https://pharmsita.example.ac.id/api/v1`.
23. Cek `/api/v1/health` untuk liveness.
24. Cek `/api/v1/health/ready` untuk database dan migration readiness.
25. Jalankan `npm run smoke:production:no-demo -- --preflight-only`.
26. Jalankan `npm run release:live-cutover:qa -- --release-dir /var/www/pharmsita/current --release-archive /var/www/pharmsita/releases/<release-id>.tar.gz --artifact-checksums /var/www/pharmsita/releases/artifact-checksums.sha256 --current-symlink /var/www/pharmsita/current --require-current-symlink --database-url "$DATABASE_URL" --backup-manifest <backup-manifest> --require-db-gate --require-restore-drill --execute-system-checks --require-system --api-base-url https://pharmsita.example.ac.id/api/v1 --require-network --force`.
27. Jalankan `npm run release:live-evidence:capture -- --release-dir /var/www/pharmsita/current --release-id <release-id> --release-archive /var/www/pharmsita/releases/<release-id>.tar.gz --artifact-checksums /var/www/pharmsita/releases/artifact-checksums.sha256 --current-symlink /var/www/pharmsita/current --require-current-symlink --database-url "$DATABASE_URL" --backup-manifest <backup-manifest> --require-db-gate --require-restore-drill --execute-system-checks --require-system --api-base-url https://pharmsita.example.ac.id/api/v1 --require-network --operator "<nama-operator>" --force`.
28. Jika decision bukan `GO`, jalankan `npm run release:go-no-go:remediate -- --evidence-dir releases/live-evidence --operator "<nama-operator>" --force`, selesaikan item blocker, lalu ulangi evidence capture.
29. Jalankan `npm run release:operator-evidence:review -- --evidence-dir releases/live-evidence --remediation-dir releases/live-evidence --reviewer "<nama-reviewer>" --operator "<nama-operator>" --require-go --force`.
30. Jalankan `npm run release:production-signoff:packet -- --evidence-dir releases/live-evidence --review-dir releases/live-evidence --remediation-dir releases/live-evidence --release-id <release-id> --operator "<nama-operator>" --reviewer "<nama-reviewer>" --signer "<nama-approver>" --require-approved --force`.
31. Alternatif untuk langkah 26-30: jalankan `npm run release:production-evidence:run -- --release-id <release-id> --release-dir /var/www/pharmsita/current --release-archive /var/www/pharmsita/releases/<release-id>.tar.gz --artifact-checksums /var/www/pharmsita/releases/artifact-checksums.sha256 --current-symlink /var/www/pharmsita/current --database-url "$DATABASE_URL" --backup-manifest <backup-manifest> --api-base-url https://pharmsita.example.ac.id/api/v1 --frontend-url https://pharmsita.example.ac.id --operator "<nama-operator>" --reviewer "<nama-reviewer>" --signer "<nama-approver>" --execute --force`.
32. Login admin, cek `/api/v1/admin/deployment/diagnostics`, lalu test first-login password change, profile edit, admin user create/edit, dan logout.

Readiness status:

- `ready`: backend bisa melayani trafik.
- `degraded`: backend hidup tetapi ada hal yang perlu review, misalnya migration pending.
- `not_ready`: backend tidak boleh menerima trafik production, biasanya karena DB/migration gagal.

## Backup dan Rollback

Sebelum migration:

```bash
npm run db:backup -- --label pre-migration
npm run db:backup:verify -- --manifest /var/backups/pharmsita/postgres/<file>.manifest.json
npm run db:restore:drill -- --manifest /var/backups/pharmsita/postgres/<file>.manifest.json --confirm-restore-drill
npm run db:migrate:gate -- --require-restore-drill
```

Rollback aplikasi:

- Kembalikan artifact release sebelumnya.
- Jika memakai layout `/var/www/pharmsita/releases/<release-id>`, pindahkan symlink `current` ke release sebelumnya.
- Restart `pharmsita-backend` dan jalankan VPS dry-run lagi.
- Restore database hanya jika migration menyebabkan data/state rusak dan sudah disetujui operator.
- Jangan menjalankan seed demo sebagai rollback production.

## Request Logging

Backend menulis structured log satu baris JSON per request:

```json
{"event":"request.completed","requestId":"...","method":"GET","path":"/api/v1/health","status":200,"durationMs":3}
```

Setiap response membawa header `X-Request-Id`. Client atau reverse proxy boleh mengirim `X-Request-Id`; jika kosong backend membuat UUID baru.

Untuk error server, response memuat `error.requestId` yang sama dengan log. Gunakan nilai ini untuk mencari log terkait di VPS. Log tidak mencatat token, password, refresh token, atau body request.

## Residual Risk

- Belum ada rollback migration otomatis; runner saat ini hanya `status`, `up`, dan `baseline`.
- Belum ada file storage production final.
- Belum ada email invitation/reset password.
- Token masih HMAC scaffold internal, belum JWT standard lintas service.
- Production monitoring dan structured logging masih perlu hardening.
