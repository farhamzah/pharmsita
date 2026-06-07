# PharmSITA API Scaffold

Backend scaffold ini mengikuti `docs/backend-contract-draft.md`.

## Stack

- Node.js
- TypeScript
- Native HTTP server
- JSON file database adapter untuk Auth + Master Data MVP
- PostgreSQL driver boundary untuk mode production berikutnya

## Database dan Repository

Schema database awal tersedia di:

```text
backend/database/migrations/001_auth_master_data.sql
backend/database/migrations/002_permissions_and_workflow.sql
backend/database/migrations/003_multi_role_first_login.sql
backend/database/migrations/004_final_project_registration.sql
backend/database/migrations/005_guidance_type_materials.sql
backend/database/migrations/006_audit_export_guard.sql
backend/database/migrations/007_user_profile_contact.sql
backend/database/migrations/008_role_profile_fields.sql
backend/database/seeds/001_demo_auth.sql
backend/database/seeds/002_demo_master_data.sql
```

Repository boundary tersedia di:

```text
backend/src/repositories/
```

Scope repository saat ini:

- `UserRepository`: auth identity, lookup user, permission lookup, admin user list.
- `MasterDataRepository`: academic periods, thesis types, supporting documents, requirement definitions.
- `RefreshTokenRepository`: hashed refresh token, revoke, rotation.
- `StudentWorkflowRepository`: progress, requirements, thesis submissions, guidance, exam, revision.

Implementasi runtime Auth, Master Data, dan Student Workflow saat ini persistent ke file JSON:

```text
backend/.data/pharmsita-db.json
```

Path file bisa dioverride dengan environment variable:

```text
DATABASE_FILE=C:\tmp\pharmsita-db.json
```

Saat database driver production dipasang, ganti implementation adapter/repository tanpa mengubah route Auth/Admin.

Repository factory sekarang membaca:

```text
DB_ADAPTER=json|postgres
```

Default tetap `json`. Mode `postgres` sudah menyiapkan connection pool dan repository Auth/RBAC, Master Data, audit log, refresh token, progress workflow minimum, dan Final Project Registration. Sebagian Student Workflow PostgreSQL di luar progress masih placeholder, jadi mode `postgres` belum siap untuk semua route workflow lama.

## Auth Security

Backend HTTP mode saat ini sudah memakai:

- Password hashing berbasis `scrypt`.
- Signed access token berbasis HMAC SHA-256.
- Refresh token random yang disimpan sebagai SHA-256 hash.
- Refresh token rotation saat `/auth/refresh`.
- Logout/revoke refresh token.
- Multi-role login challenge via `/auth/select-role`.
- First-login activation via `/auth/first-login`.
- Persistent profile read/update via `/auth/profile`.
- RBAC guard untuk `/admin/*`, `/students/me/*`, `/lecturer/*`, dan `/coordinator/*`.

Default seed password untuk semua demo role:

```text
demo
```

Demo tambahan untuk QA auth alignment:

| Identifier | Password | Tujuan |
|---|---|---|
| `multi` | `demo` | User dengan role `dosen` dan `koordinator` |
| `firstlogin` | `demo` | User yang wajib menyelesaikan first login |

Alur akun standalone PharmSITA, password awal, first-login, dan redirect profile:

```text
docs/account-request-approval-flow.md
docs/decoupled-core-pharmsita-boundary-plan.md
```

Task 88 Revisi menetapkan PharmSITA berjalan standalone. Tidak ada endpoint provisioning dari Core, tidak ada secret lintas aplikasi, dan tidak ada live smoke test Core ke PharmSITA pada fase ini.

Endpoint profile standalone:

```text
GET   /api/v1/auth/profile
PATCH /api/v1/auth/profile
```

Field profile yang persistent saat ini: kontak umum, field mahasiswa, field dosen, field koordinator, dan field admin.

## Role-Based Workflow Authorization

Permission workflow aktif:

| Role | Permission utama |
|---|---|
| Mahasiswa | `student.workflow.read`, `student.workflow.submit` |
| Dosen | `lecturer.workflow.read`, `lecturer.guidance.approve`, `lecturer.exam.assess`, `lecturer.revision.review` |
| Koordinator | `coordinator.workflow.read`, `coordinator.progress.manage`, `coordinator.exam.manage`, `coordinator.validation.manage`, `coordinator.monitoring.read` |
| Admin | `workflow.override`, `audit.read` |

Endpoint workflow mahasiswa sekarang dibatasi ke permission `student.workflow.*`.

Endpoint role yang tersedia:

```text
GET   /api/v1/lecturer/students/:studentId/progress
GET   /api/v1/lecturer/students/:studentId/guidance/:stageId
PATCH /api/v1/lecturer/students/:studentId/guidance/:stageId/approval
PATCH /api/v1/lecturer/students/:studentId/guidance/:stageId/request
PATCH /api/v1/lecturer/students/:studentId/guidance/:stageId/sessions/:sessionId/approval
GET   /api/v1/lecturer/students/:studentId/exams/:stageId
PATCH /api/v1/lecturer/students/:studentId/exams/:stageId/assessment
GET   /api/v1/lecturer/students/:studentId/revisions/:stageId
PATCH /api/v1/lecturer/students/:studentId/revisions/:stageId/items/:itemId/status
PATCH /api/v1/lecturer/students/:studentId/revisions/:stageId/approval

GET   /api/v1/coordinator/students/:studentId/progress
PATCH /api/v1/coordinator/students/:studentId/progress/:stepId
GET   /api/v1/coordinator/students/:studentId/requirements/initial
PUT   /api/v1/coordinator/students/:studentId/requirements/initial
GET   /api/v1/coordinator/students/:studentId/requirements/stages/:stageId
PUT   /api/v1/coordinator/students/:studentId/requirements/stages/:stageId
GET   /api/v1/coordinator/students/:studentId/thesis-submissions
PUT   /api/v1/coordinator/students/:studentId/thesis-submissions
GET   /api/v1/coordinator/students/:studentId/guidance/:stageId
GET   /api/v1/coordinator/students/:studentId/exams/:stageId
PATCH /api/v1/coordinator/students/:studentId/exams/:stageId/status
GET   /api/v1/coordinator/students/:studentId/revisions/:stageId
```

Alias `/api/v1/kordinator/*` juga tersedia untuk kompatibilitas frontend saat ini.

## Request Validation

Route Auth dan Admin/Master Data sekarang melakukan validasi payload runtime. Payload tidak valid akan menghasilkan response:

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Payload tidak valid.",
    "details": {}
  }
}
```

Validasi aktif untuk:

- `/auth/login`
- `/auth/refresh`
- `PUT /admin/users`
- `PUT /admin/master/academic-periods`
- `PUT /admin/master/thesis-types`
- `PUT /admin/master/supporting-documents`
- `PUT /admin/master/requirements`
- Progress, requirements, thesis submissions, guidance, exam, dan revision workflow mutation routes.

## Audit Log

Audit log foundation sudah aktif dan persistent ke JSON database.

Endpoint:

```text
GET /api/v1/admin/audit-logs?limit=100
GET /api/v1/admin/audit-export-attempts?scope=admin&allowed=false
GET /api/v1/admin/audit-export-attempts/cleanup/status
POST /api/v1/admin/audit-export-attempts/cleanup
```

Permission:

```text
audit.read
```

Aksi yang sudah dicatat:

- Login berhasil/gagal.
- Refresh token berhasil/gagal.
- Logout.
- Replace admin users.
- Replace master data.
- Student workflow mutation: progress, requirements, thesis submissions, guidance, exam, revision.
- Role workflow mutation dosen/koordinator: guidance approval, exam assessment/status, revision review, requirement validation, thesis validation, progress override.
- Export CSV audit dicatat sebagai `AUDIT_LOGS_EXPORTED`.
- Rate limit export CSV memakai repository persistence. Mode PostgreSQL menyimpan attempt allowed/blocked di `audit_export_attempts`, sehingga guard tetap konsisten untuk deployment multi-instance.
- Cleanup attempt export tersedia manual dengan default `dryRun=true`; eksekusi nyata mencatat audit event `AUDIT_EXPORT_ATTEMPTS_CLEANED`.
- Scheduler cleanup expose status read-only: enabled, running, retention config, last result, last error, dan last skip reason.

Operator CLI:

```powershell
npm.cmd run audit:cleanup:export-attempts
npm.cmd run audit:cleanup:export-attempts -- --execute --confirm-cleanup
```

Retention planning untuk `audit_export_attempts`:

```text
docs/audit-export-attempt-retention-plan.md
```

## Final Project Registration Contract

Task 36-37 menambahkan contract, schema draft, dan runtime JSON pendaftaran TA production:

```text
docs/final-project-registration-contract.md
backend/database/migrations/004_final_project_registration.sql
```

Endpoint aktif:

```text
GET   /api/v1/students/me/final-project-registration
POST  /api/v1/students/me/final-project-registration
GET   /api/v1/coordinator/final-project-registrations
GET   /api/v1/coordinator/final-project-registrations/:registrationId
PATCH /api/v1/coordinator/final-project-registrations/:registrationId/validation
```

Endpoint `thesis-submissions` lama masih menjadi compatibility layer sampai frontend dimigrasikan.

## Guidance Type + Materials Contract

Task 54-55 menambahkan contract dan migration draft untuk alignment bimbingan sesuai PDF 26 alur:

```text
docs/guidance-type-contract-revision.md
backend/database/migrations/005_guidance_type_materials.sql
```

Migration ini menambah `guidance_type` pada `guidance_workflows`, status request target, permission guidance request/material, dan tabel `guidance_materials`. Runtime route lama `/guidance/:stageId` tetap menjadi compatibility layer, sementara aggregate API baru tersedia untuk request bimbingan dan validasi materi:

```text
GET   /api/v1/students/me/guidance-requests
POST  /api/v1/students/me/guidance-requests
GET   /api/v1/students/me/guidance-requests/:guidanceRequestId
POST  /api/v1/students/me/guidance-requests/:guidanceRequestId/materials
GET   /api/v1/lecturer/guidance-requests
PATCH /api/v1/lecturer/guidance-requests/:guidanceRequestId/validation
PATCH /api/v1/lecturer/guidance-requests/:guidanceRequestId/materials/:materialId/validation
GET   /api/v1/coordinator/students/:studentId/guidance-requests
GET   /api/v1/coordinator/students/:studentId/guidance-requests/:guidanceRequestId
```

## Commands

Dari root project:

```bash
npm.cmd run backend:build
npm.cmd run backend:start
```

Health check:

```text
GET http://localhost:4000/api/v1/health
```

Readiness dan diagnostics production:

```text
GET http://localhost:4000/api/v1/health/ready
GET http://localhost:4000/api/v1/admin/deployment/diagnostics
```

`/health` adalah liveness ringan. `/health/ready` mengecek database dan status migration PostgreSQL. Diagnostics membutuhkan token admin dengan permission `audit.read` dan hanya menampilkan metadata aman, bukan secret.

API smoke test dari root project:

```powershell
npm.cmd run api:smoke
```

Auth alignment smoke test:

```powershell
npm.cmd run backend:build
npm.cmd run api:smoke:auth-alignment
```

Script ini menjalankan backend sementara dengan JSON database temp, lalu menguji multi-role challenge, role selection, refresh role, first-login completion, dan direct login setelah aktivasi.

Final Project Registration smoke test:

```powershell
npm.cmd run backend:build
npm.cmd run api:smoke:final-project
```

Script ini menjalankan backend sementara dengan JSON database temp, lalu menguji draft, submit, list koordinator, detail, validasi disetujui, auto-complete progress `pendaftaran-ta`, dan audit log.

PostgreSQL Auth/RBAC smoke test dari root project:

```powershell
$env:DATABASE_URL="postgres://user:pass@localhost:5432/pharmsita"
npm.cmd run backend:build
npm.cmd run api:smoke:postgres-auth
```

Script ini menjalankan migration `001`, migration `002`, migration `003`, migration `004`, seed demo auth, lalu menjalankan backend sementara dengan `DB_ADAPTER=postgres` di port `4100` kecuali `API_BASE_URL` sudah diset.

PostgreSQL Final Project Registration smoke test dari root project:

```powershell
$env:DATABASE_URL="postgres://user:pass@localhost:5432/pharmsita"
npm.cmd run backend:build
npm.cmd run api:smoke:postgres-final-project
```

Script ini menjalankan migration `001` sampai `004`, seed demo auth, seed demo master data, lalu menguji master data `thesisTypeId`, draft/submit pendaftaran TA, validasi koordinator, progress completion, dan audit log dengan `DB_ADAPTER=postgres` di port `4104` kecuali `API_BASE_URL` sudah diset.

## Environment

Backend membaca env berikut:

| Env | Default | Catatan |
|---|---|---|
| `PORT` | `4000` | Port backend API |
| `API_PREFIX` | `/api/v1` | Prefix route API |
| `CORS_ORIGIN` | `http://localhost:5173,http://127.0.0.1:5173` | Daftar origin frontend, dipisah koma |
| `DB_ADAPTER` | `json` | Pilihan repository runtime: `json` atau `postgres` |
| `DATABASE_FILE` | `backend/.data/pharmsita-db.json` | Lokasi persistent JSON database |
| `DATABASE_URL` | empty | Connection string PostgreSQL saat `DB_ADAPTER=postgres` |
| `DATABASE_SSL` | `false` | Aktifkan SSL PostgreSQL untuk cloud database |
| `DATABASE_POOL_MAX` | `10` | Maksimum connection pool PostgreSQL |
| `AUTH_SECRET` | Dev-only secret | Ganti untuk environment non-dev |
| `AUDIT_EXPORT_CLEANUP_ENABLED` | `false` | Aktifkan scheduler cleanup attempt export audit |
| `AUDIT_EXPORT_CLEANUP_INTERVAL_SECONDS` | `86400` | Interval scheduler cleanup |
| `AUDIT_EXPORT_ALLOWED_RETENTION_DAYS` | `30` | Retensi allowed export attempts |
| `AUDIT_EXPORT_BLOCKED_RETENTION_DAYS` | `90` | Retensi blocked export attempts |
| `AUDIT_EXPORT_CLEANUP_BATCH_SIZE` | `1000` | Batas delete per batch cleanup |
| `AUDIT_EXPORT_CLEANUP_ADVISORY_LOCK_KEY` | `810081` | PostgreSQL advisory lock key untuk single-instance guard |

Contoh QA dengan frontend di port khusus:

```powershell
$env:CORS_ORIGIN="http://127.0.0.1:5174"
npm.cmd run backend:start
```

## Frontend HTTP Mode

Buat env frontend dari `.env.http.example`, lalu jalankan frontend seperti biasa:

```text
VITE_API_MODE=http
VITE_API_BASE_URL=http://localhost:4000/api/v1
```

Runbook lengkap tersedia di:

```text
docs/http-mode-runbook.md
```

Runbook production no-demo tersedia di:

```text
docs/production-deployment-runbook.md
```

Template deployment VPS tersedia di:

```text
deploy/vps/
```

Template ini mencakup Nginx reverse proxy, systemd service backend, env file production, dan logrotate backend/Nginx.

Command production helper:

```powershell
npm.cmd run backend:check-production-env
npm.cmd run deploy:vps:dry-run -- --skip-network
npm.cmd run release:package
npm.cmd run db:backup:check-tools
npm.cmd run db:backup -- --label pre-migration
npm.cmd run db:migrate:gate -- --require-restore-drill
npm.cmd run db:migrate:status
npm.cmd run db:migrate
npm.cmd run db:bootstrap-admin
npm.cmd run smoke:production:no-demo -- --preflight-only
```

`backend:check-production-env` harus dijalankan setelah `backend:build`. Saat `NODE_ENV=production`, command ini menolak env yang masih memakai secret placeholder, `DB_ADAPTER` non-PostgreSQL, `DATABASE_URL` kosong/smoke, atau `CORS_ORIGIN` wildcard/localhost/example.

Request logging:

- Setiap response membawa `X-Request-Id`.
- Backend menulis structured JSON log untuk `request.completed`.
- Error `500` menyertakan `error.requestId` agar operator bisa korelasikan response dengan log VPS.

## Catatan

Scaffold ini belum production-ready. Tujuannya menyediakan shape API nyata agar frontend facade bisa mulai diuji dengan HTTP sebelum PostgreSQL adapter, ownership/entity-level policy, workflow automation final, dan file storage final dibuat.
