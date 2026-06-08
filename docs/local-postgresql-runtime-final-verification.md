# Local PostgreSQL Runtime Final Verification

Tanggal: 2026-06-09  
Task: 127  
Scope: Frontend, backend, dan database lokal PharmSITA.

## Ringkasan Keputusan

Status lokal: **PASS**.

Frontend, backend, dan database lokal sudah terbukti berjalan memakai PostgreSQL lokal khusus PharmSITA. Database yang dipakai bukan `karawangku`.

## Target Lokal

| Item | Nilai |
|---|---|
| Container database | `pharmsita-postgres` |
| Image | `postgis/postgis:16-3.4` |
| Host port | `5433` |
| Container port | `5432` |
| Database | `pharmsita_local` |
| User | `pharmsita_user` |
| Catatan penting | Port `5432` host masih dipakai `karawangku-postgis`; PharmSITA lokal memakai `5433`. |

`DATABASE_URL` lokal diset dari password container secara sementara:

```powershell
$dbPass = docker exec pharmsita-postgres printenv POSTGRES_PASSWORD
$env:DATABASE_URL = "postgres://pharmsita_user:$dbPass@localhost:5433/pharmsita_local"
```

Password container tidak dicatat di dokumen dan tidak boleh dicommit.

## Hasil Verifikasi Database

### Docker/PostgreSQL

Container `pharmsita-postgres` aktif dan menerima koneksi.

Query koneksi:

```sql
SELECT current_database(), current_user;
```

Hasil:

```text
current_database = pharmsita_local
current_user     = pharmsita_user
```

### Migration Status

Command:

```powershell
npm.cmd run db:migrate:status
```

Hasil:

```text
Applied: 8; Pending: 0
001_auth_master_data.sql           applied
002_permissions_and_workflow.sql   applied
003_multi_role_first_login.sql     applied
004_final_project_registration.sql applied
005_guidance_type_materials.sql    applied
006_audit_export_guard.sql         applied
007_user_profile_contact.sql       applied
008_role_profile_fields.sql        applied
```

Dry run dan migration ulang:

```powershell
npm.cmd run db:migrate -- --dry-run
npm.cmd run db:migrate
```

Hasil:

```text
Database schema is up to date.
Database schema is up to date.
```

## Hasil Build

### Backend

Command:

```powershell
npm.cmd run backend:build
```

Hasil: **PASS**.

### Frontend

Command:

```powershell
npm.cmd run build
```

Hasil: **PASS**.

Catatan: Vite masih memberi warning ukuran bundle `index-*.js` lebih dari 500 kB. Ini bukan blocker runtime lokal, tetapi bisa menjadi task optimasi nanti.

## Bootstrap Admin Lokal

Admin lokal dibuat/reset dengan:

```powershell
npm.cmd run db:bootstrap-admin -- --identifier superadmin --name "Super Admin PharmSITA" --email admin@pharmsita.local --employee-number LOCALADMIN-127 --reset-password
```

Hasil:

```json
{
  "status": "ok",
  "action": "created",
  "identifier": "superadmin",
  "requiresFirstLogin": true
}
```

Admin lalu diaktifkan melalui write smoke first-login flow.

Credential lokal untuk QA:

```text
identifier: superadmin
password: <local-admin-password>
```

Credential aktual hanya dipakai saat QA lokal Task 127 dan tidak dicatat di repository. Jangan memakai credential lokal untuk staging atau production.

## Smoke Test Backend + Database

### No-Demo Preflight

Command:

```powershell
npm.cmd run smoke:production:no-demo -- --preflight-only --start-server --port 4140
```

Hasil: **PASS**, 7 checks.

Checks utama:

```text
PostgreSQL connection      PASS
Required production tables PASS
Versioned migration status PASS applied=8; pending=0; unknown=0
Bootstrap admin dry-run    PASS
Liveness /health           PASS
Readiness /health/ready    PASS status=ready; db=ok; migrations=ok
Authenticated workflow     SKIP preflight-only mode
```

### Write Smoke untuk Admin Lokal

Command:

```powershell
npm.cmd run smoke:production:no-demo -- --allow-write --start-server --port 4142 --api-base-url http://localhost:4142/api/v1 --identifier superadmin --employee-number LOCALADMIN-127 --email admin@pharmsita.local --temporary-password <temporary-password> --activated-password <local-admin-password>
```

Hasil: **PASS**, 13 checks.

Checks utama:

```text
Smoke admin reset/bootstrap                   PASS
First-login challenge                         PASS
First-login completion                        PASS role=admin
Temporary password rejected after first-login PASS status=401
Activated admin login                         PASS role=admin
Admin diagnostics                             PASS status=ready; mode=postgres
Admin profile update                          PASS
```

## Frontend UI QA dengan PostgreSQL Lokal

Target sementara:

| Service | URL |
|---|---|
| Backend | `http://127.0.0.1:4150/api/v1` |
| Frontend | `http://127.0.0.1:5176` |

Command QA:

```powershell
npm.cmd run ui:qa:role-profile
```

Env QA:

```powershell
$env:ROLE_PROFILE_QA_API_BASE_URL = "http://127.0.0.1:4150/api/v1"
$env:ROLE_PROFILE_QA_FRONTEND_URL = "http://127.0.0.1:5176"
$env:ROLE_PROFILE_QA_ADMIN_IDENTIFIER = "superadmin"
$env:ROLE_PROFILE_QA_ADMIN_PASSWORD = "<local-admin-password>"
```

Hasil: **PASS**, 13 checks.

Checks utama:

```text
API liveness                                  PASS
API readiness                                 PASS
Admin login for QA fixture setup              PASS superadmin
QA fixture reset/login: mahasiswa             PASS
QA fixture reset/login: dosen                 PASS
QA fixture reset/login: koordinator           PASS
UI profile save/reload/API match: mahasiswa   PASS
UI profile save/reload/API match: dosen       PASS
UI profile save/reload/API match: koordinator PASS
UI profile save/reload/API match: admin       PASS
```

Report UI QA:

```text
C:\tmp\pharmsita-task127-role-profile-report.json
```

## Known Notes

1. PharmSITA lokal memakai PostgreSQL di `localhost:5433`, bukan `localhost:5432`.
2. `localhost:5432` masih mengarah ke container `karawangku-postgis`.
3. Untuk smoke test dengan port non-default, `--api-base-url` harus diberikan eksplisit agar health check tidak tetap mengarah ke default `4140`.
4. Frontend bundle size warning belum menjadi blocker, tetapi layak dioptimasi sebelum production polish.

## Keputusan Task 127

Task 127: **DONE / PASS**.

Secara aplikasi lokal:

1. Frontend: **beres**.
2. Backend: **beres**.
3. Database PostgreSQL lokal: **beres**.
4. Login admin lokal: **beres**.
5. First-login flow: **beres**.
6. Profile save/reload/API sync lintas role: **beres**.

## Task Berikutnya

### Task 128: Local PostgreSQL Backup/Restore Drill dan Migration Safety Gate

Prioritas: **High**

Reason: runtime lokal sudah PASS. Sebelum kembali ke VPS/production, kita sebaiknya membuktikan backup, verify, restore drill, dan migration gate juga berjalan terhadap database PharmSITA lokal. Ini menjadi latihan aman sebelum prosedur yang sama dipakai di production.
