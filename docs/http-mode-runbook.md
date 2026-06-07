# HTTP Mode Runbook

Panduan ini dipakai untuk menjalankan PharmSITA frontend dengan backend scaffold HTTP.

## Endpoint

| Service | Default URL |
|---|---|
| Backend API | `http://localhost:4000/api/v1` |
| Backend health check | `http://localhost:4000/api/v1/health` |
| Frontend Vite | `http://localhost:5173` |

## Backend

Build backend:

```powershell
npm.cmd run backend:build
```

Jalankan backend:

```powershell
npm.cmd run backend:start
```

Jalankan backend dengan database QA sementara:

```powershell
$env:DATABASE_FILE="C:\tmp\pharmsita-http-qa.json"
npm.cmd run backend:start
```

## CORS

Backend membaca `CORS_ORIGIN` sebagai daftar origin yang dipisah koma.

Default yang diterima:

```text
http://localhost:5173
http://127.0.0.1:5173
```

Jika frontend dijalankan di host atau port lain, samakan `CORS_ORIGIN` dengan origin frontend:

```powershell
$env:CORS_ORIGIN="http://localhost:5173,http://127.0.0.1:5174"
npm.cmd run backend:start
```

Gejala CORS mismatch:

1. Health check backend berhasil dari terminal.
2. Login UI gagal dengan pesan koneksi atau username/password.
3. Browser console menunjukkan request diblokir CORS.

Solusi:

1. Pastikan `VITE_API_BASE_URL` mengarah ke backend benar.
2. Pastikan origin frontend ada di `CORS_ORIGIN`.
3. Restart backend setelah mengubah `CORS_ORIGIN`.

## Frontend HTTP Mode

Jalankan frontend dengan backend HTTP:

```powershell
$env:VITE_API_MODE="http"
$env:VITE_API_BASE_URL="http://localhost:4000/api/v1"
npm.cmd run dev
```

Jika memakai port khusus:

```powershell
$env:VITE_API_MODE="http"
$env:VITE_API_BASE_URL="http://localhost:4000/api/v1"
npm.cmd run dev -- --host 127.0.0.1 --port 5174
```

Untuk port khusus, backend perlu origin yang sama:

```powershell
$env:CORS_ORIGIN="http://127.0.0.1:5174"
npm.cmd run backend:start
```

## Demo Login

Password default seed backend HTTP mode:

```text
demo
```

| Username | Role |
|---|---|
| `mahasiswa` atau `student` | Mahasiswa |
| `dosen` atau `lecturer` | Dosen |
| `admin` atau `administrator` | Admin |
| `kordinator`, `koordinator`, atau `coordinator` | Koordinator |

Backend memakai role canonical `koordinator`; frontend masih memetakan role itu ke route `#/kordinator`.

## Smoke Test Manual

1. Buka `http://localhost:5173/#/login`.
2. Login sebagai `dosen` dengan password `demo`.
3. Pastikan redirect ke `#/dosen`.
4. Buka menu mahasiswa bimbingan, jadwal/penilaian, dan revisi.
5. Logout atau bersihkan `localStorage`.
6. Login sebagai `kordinator` dengan password `demo`.
7. Pastikan redirect ke `#/kordinator`.
8. Buka validasi persyaratan, pengajuan, tahapan akademik, dan penjadwalan.

## API Smoke Test

Automated smoke test:

```powershell
npm.cmd run api:smoke
```

Jika backend berjalan di URL lain:

```powershell
$env:API_BASE_URL="http://localhost:4000/api/v1"
npm.cmd run api:smoke
```

Script ini mengecek:

1. Health check.
2. Login Dosen dan Koordinator.
3. Endpoint workflow Dosen.
4. Endpoint workflow Koordinator.
5. Alias `/kordinator`.
6. Negative RBAC `403` untuk akses lintas role yang tidak boleh.
7. Isolasi workflow antar `studentId`.

## PostgreSQL Auth Smoke Test

Auth/RBAC PostgreSQL smoke test:

```powershell
$env:DATABASE_URL="postgres://user:pass@localhost:5432/pharmsita"
npm.cmd run backend:build
npm.cmd run api:smoke:postgres-auth
```

Default behavior:

1. Menjalankan migration `001_auth_master_data.sql`.
2. Menjalankan migration `002_permissions_and_workflow.sql`.
3. Menjalankan seed `001_demo_auth.sql`.
4. Start backend sementara dengan `DB_ADAPTER=postgres` di port `4100`.
5. Test invalid login, login mahasiswa/dosen/admin, `/auth/me`, refresh rotation, logout, RBAC audit log, dan audit persistence.

Jika backend PostgreSQL sudah berjalan manual:

```powershell
$env:DATABASE_URL="postgres://user:pass@localhost:5432/pharmsita"
$env:API_BASE_URL="http://localhost:4000/api/v1"
npm.cmd run api:smoke:postgres-auth
```

Manual login check:

Login:

```powershell
$body = @{ identifier = "dosen"; password = "demo" } | ConvertTo-Json
Invoke-RestMethod -Method Post -Uri "http://localhost:4000/api/v1/auth/login" -ContentType "application/json" -Body $body
```

Health check:

```powershell
Invoke-RestMethod "http://localhost:4000/api/v1/health"
```

Expected health response:

```json
{
  "status": "ok",
  "service": "pharmsita-api"
}
```

## Audit Export Attempt Cleanup

Cleanup attempt export audit memakai backend API, jadi jalankan setelah backend HTTP mode hidup.

Dry-run:

```powershell
$env:API_BASE_URL="http://localhost:4000/api/v1"
$env:AUDIT_CLEANUP_ADMIN_IDENTIFIER="admin"
$env:AUDIT_CLEANUP_ADMIN_PASSWORD="demo"
npm.cmd run audit:cleanup:export-attempts
```

Execute:

```powershell
npm.cmd run audit:cleanup:export-attempts -- --execute --confirm-cleanup
```

Default script adalah `dryRun=true`; execute mencatat audit event `AUDIT_EXPORT_ATTEMPTS_CLEANED`.

Scheduler optional:

```powershell
$env:AUDIT_EXPORT_CLEANUP_ENABLED="true"
$env:AUDIT_EXPORT_CLEANUP_INTERVAL_SECONDS="86400"
$env:AUDIT_EXPORT_ALLOWED_RETENTION_DAYS="30"
$env:AUDIT_EXPORT_BLOCKED_RETENTION_DAYS="90"
$env:AUDIT_EXPORT_CLEANUP_BATCH_SIZE="1000"
```

Biarkan `AUDIT_EXPORT_CLEANUP_ENABLED=false` untuk local QA biasa. Saat PostgreSQL aktif, scheduler memakai advisory lock agar hanya satu instance menjalankan cleanup.

Status scheduler:

```powershell
$body = @{ identifier = "admin"; password = "demo" } | ConvertTo-Json
$login = Invoke-RestMethod -Method Post -Uri "http://localhost:4000/api/v1/auth/login" -ContentType "application/json" -Body $body
Invoke-RestMethod -Uri "http://localhost:4000/api/v1/admin/audit-export-attempts/cleanup/status" -Headers @{ Authorization = "Bearer $($login.accessToken)" }
```

Field penting: `enabled`, `running`, `lastResult`, `lastError`, dan `lastSkip`.
