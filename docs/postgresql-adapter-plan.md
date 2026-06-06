# PostgreSQL Adapter Plan

Status: planning boundary with business workflow alignment A-I.

Tanggal: 2026-06-06

## Tujuan

Dokumen ini menjadi batas migrasi dari persistent JSON database ke PostgreSQL tanpa mengubah kontrak API frontend yang sudah berjalan.

Target utama:

1. Backend tetap memakai contract route yang sama.
2. Controller/service tidak boleh langsung bergantung pada SQL.
3. Repository contract tetap menjadi boundary utama.
4. JSON adapter tetap tersedia untuk demo/offline sampai PostgreSQL adapter stabil.
5. Automated API smoke test harus PASS untuk JSON dan PostgreSQL mode.

Business workflow alignment source:

```text
docs/business-workflow-alignment-a-i.md
```

Catatan Task 33-37: Lampiran A-I mengubah beberapa asumsi production. Multi-role user dan first login sudah dibuka pada Task 34-35; pendaftaran TA aggregate sudah punya contract/schema draft pada Task 36 dan JSON runtime pada Task 37; empat jenis bimbingan, materi bimbingan, dan pengajuan Seminar Proposal masih menjadi fase berikutnya.

## Keputusan Boundary

PostgreSQL tidak akan dibuat sebagai implementasi `DatabaseAdapter.read/write/update` full-state.

Alasannya:

1. `DatabaseAdapter` saat ini cocok untuk JSON file karena membaca dan menulis satu object `DatabaseState`.
2. PostgreSQL harus bekerja secara query-based dan transactional, bukan serialize seluruh state.
3. Jika PostgreSQL dipaksa mengikuti full-state adapter, risiko race condition dan performa buruk akan tinggi.

Boundary yang dipakai untuk PostgreSQL:

```text
HTTP route -> service -> repository contract -> PostgreSQL repository implementation
```

Dengan kata lain, PostgreSQL adapter akan masuk sebagai implementasi repository, bukan sebagai full-state `DatabaseAdapter`.

## Repository Boundary Saat Ini

Contract tersedia di:

```text
backend/src/repositories/contracts.ts
```

Repository yang sudah ada:

| Repository | Status JSON | Target PostgreSQL |
|---|---|---|
| `UserRepository` | Persistent JSON | SQL repository |
| `RefreshTokenRepository` | Persistent JSON | SQL repository |
| `AuditLogRepository` | Persistent JSON | SQL repository |
| `MasterDataRepository` | Persistent JSON | SQL repository |
| `StudentWorkflowRepository` | Persistent JSON global state | SQL repository scoped by student |

Status Task 31:

| Repository | PostgreSQL status |
|---|---|
| `UserRepository` | Implemented untuk list, lookup auth, touch last login, dan role permission lookup |
| `RefreshTokenRepository` | Implemented untuk create, active lookup, revoke by hash, dan revoke all per user |
| `AuditLogRepository` | Implemented untuk create dan list |
| `UserRepository` multi-role | Implemented untuk `user_roles`, role session, dan first-login completion |
| `MasterDataRepository` | Placeholder eksplisit, belum implemented |
| `StudentWorkflowRepository` | Placeholder eksplisit, belum implemented |

## Boundary Gap Yang Harus Diselesaikan

### 1. Student workflow scoped by student

Route role sudah memiliki `studentId`, contoh:

```text
/coordinator/students/:studentId/progress
/lecturer/students/:studentId/guidance/:stageId
```

Status Task 28: contract `StudentWorkflowRepository` sudah menerima `studentId` pada method workflow, route `/students/me/*` memakai actor ID dari session, dan route Dosen/Koordinator memakai `:studentId` dari URL.

Boundary yang sekarang dipakai sebelum PostgreSQL:

```ts
getProgressSteps(studentId: string): StudentStep[];
updateProgressStep(studentId: string, stepId: StepId, status: StepStatus): StudentStep[];
getInitialRequirements(studentId: string): RequirementBundle;
saveInitialRequirements(studentId: string, bundle: RequirementBundle): RequirementBundle;
listThesisSubmissions(studentId: string): ThesisSubmission[];
replaceThesisSubmissions(studentId: string, submissions: ThesisSubmission[]): ThesisSubmission[];
getGuidance(studentId: string, stageId: GuidanceStage): GuidanceWorkflow;
getExam(studentId: string, stageId: ExamStage): ExamWorkflow;
getRevision(studentId: string, stageId: RevisionStage): RevisionWorkflow;
```

JSON repository sekarang memakai `studentWorkflows[studentId]` sebagai key internal dan tetap menyimpan `studentWorkflow` lama sebagai fallback migrasi untuk database versi lama.

### 2. Permission belum punya tabel SQL eksplisit

Runtime JSON menyimpan:

```text
permissionsByRole
```

Migration `001_auth_master_data.sql` belum memiliki tabel role permission.

Target PostgreSQL:

```sql
role_permissions (
  role TEXT NOT NULL,
  permission TEXT NOT NULL,
  PRIMARY KEY (role, permission)
)
```

Status Task 29: migration `002_permissions_and_workflow.sql` sudah menambahkan tabel `role_permissions` beserta seed permission awal yang sejalan dengan JSON runtime.

### 3. Multi-role dan first login

Status Task 34: migration `003_multi_role_first_login.sql` sudah menambahkan:

| Area | Status |
|---|---|
| `users.first_login_completed_at` | Timestamp aktivasi pertama |
| `users.first_login_completed_by` | Actor penyelesai first login bila diperlukan |
| `users.password_changed_at` | Timestamp pergantian password terakhir |
| `user_roles` | Assignment role aktif per identity user |
| `refresh_tokens.role` | Role session yang harus dipertahankan saat token refresh |

Runtime JSON dan PostgreSQL repository Auth/RBAC sekarang memakai `user_roles` sebagai sumber role aktif, dengan `users.role` sebagai primary/backward-compatible role.

### 4. Pendaftaran TA aggregate

Status Task 36: migration `004_final_project_registration.sql` sudah menambahkan:

| Table | Fungsi |
|---|---|
| `final_project_registrations` | Aggregate pendaftaran TA sesuai Flow B-C |
| `final_project_registration_requirements` | Snapshot persyaratan dan status verifikasi pada pendaftaran |
| `supervisor_assignments` | Pembimbing 1 dan 2 setelah pendaftaran disetujui |

Contract detail:

```text
docs/final-project-registration-contract.md
```

`thesis_submissions` tetap dipertahankan sebagai compatibility layer sampai repository dan frontend dimigrasikan.

Status Task 37: JSON runtime sudah aktif untuk:

```text
GET   /students/me/final-project-registration
POST  /students/me/final-project-registration
GET   /coordinator/final-project-registrations
GET   /coordinator/final-project-registrations/:registrationId
PATCH /coordinator/final-project-registrations/:registrationId/validation
```

PostgreSQL repository untuk aggregate ini masih placeholder.

### 5. Workflow schema belum tersedia

Migration `001_auth_master_data.sql` baru mencakup Auth, profile, master data, requirement definitions, refresh token, dan audit log.

Migration berikutnya perlu menambah tabel workflow:

| Table | Fungsi |
|---|---|
| `student_progress_steps` | Status step per mahasiswa |
| `student_requirement_bundles` | Link folder dan grouping requirement per tahap |
| `student_requirement_records` | Status requirement per item |
| `thesis_submissions` | Pengajuan judul TA |
| `guidance_workflows` | Header bimbingan per mahasiswa dan stage |
| `guidance_sessions` | Sesi bimbingan |
| `guidance_chats` | Chat bimbingan |
| `exams` | Sidang proposal dan sidang akhir |
| `exam_panelists` | Dosen penguji/ketua sidang |
| `exam_requirements` | Checklist requirement sidang |
| `revision_workflows` | Header revisi |
| `revision_items` | Item revisi |
| `revision_chats` | Chat revisi |

Status Task 29: migration `002_permissions_and_workflow.sql` sudah menambahkan draft tabel workflow di atas dengan `student_id` sebagai scope utama, foreign key ke `users`, status checks sesuai domain TypeScript, dan index dasar untuk query per student/stage/status.

## Environment Target

Env baru yang disarankan:

| Env | Contoh | Catatan |
|---|---|---|
| `DB_ADAPTER` | `json` atau `postgres` | Default tetap `json` |
| `DATABASE_FILE` | `C:\tmp\pharmsita-db.json` | Hanya untuk JSON adapter |
| `DATABASE_URL` | `postgres://user:pass@localhost:5432/pharmsita` | Hanya untuk PostgreSQL |
| `DATABASE_SSL` | `false` | Untuk cloud database nanti |
| `DATABASE_POOL_MAX` | `10` | Pool size PostgreSQL |

## File Boundary Target

Struktur target:

```text
backend/src/database/
  json-file-database-adapter.ts
  postgres/
    connection.ts
    transaction.ts

backend/src/repositories/
  index.ts
  persistent-*.ts
  postgres/
    postgres-user-repository.ts
    postgres-refresh-token-repository.ts
    postgres-audit-log-repository.ts
    postgres-master-data-repository.ts
    postgres-student-workflow-repository.ts
```

`backend/src/repositories/index.ts` akan memilih implementation berdasarkan `DB_ADAPTER`.

## Migration Phases

### Phase 1: Contract hardening

Priority: Extra High.

Status: completed in Task 28.

Deliverables:

1. Tambahkan `studentId` ke semua method `StudentWorkflowRepository`. Done.
2. Update route student, lecturer, dan coordinator agar meneruskan `studentId`. Done.
3. JSON repository tetap PASS. Done.
4. `npm.cmd run api:smoke` tetap PASS. Done.

### Phase 2: PostgreSQL schema completion

Priority: Extra High.

Status: workflow base draft completed in Task 29, auth alignment in Task 34, final project registration draft in Task 36.

Deliverables:

1. Tambah migration `002_permissions_and_workflow.sql`. Done.
2. Tambah table `role_permissions`. Done.
3. Tambah table workflow minimum. Done.
4. Tambah migration `003_multi_role_first_login.sql`. Done.
5. Tambah migration `004_final_project_registration.sql`. Done.
6. Tambah seed SQL atau seed script untuk demo users dan workflow awal. Partial: auth seed sudah ada; final project registration seed menunggu repository runtime.

### Phase 3: PostgreSQL infrastructure

Priority: High.

Status: boundary completed in Task 30; SQL repository implementations are still pending.

Deliverables:

1. Tambah dependency PostgreSQL driver. Done.
2. Tambah connection pool. Done.
3. Tambah transaction helper. Done.
4. Tambah repository factory `DB_ADAPTER=json|postgres`. Done.
5. JSON mode tetap default. Done.

### Phase 4: PostgreSQL repository implementation

Priority: Extra High.

Status: Auth/RBAC multi-role implemented through Task 34; final project registration JSON runtime implemented through Task 37; PostgreSQL implementation masih menunggu.

Deliverables:

1. Implement `UserRepository`. Done for Auth/RBAC, multi-role, and first-login completion.
2. Implement `RefreshTokenRepository`. Done.
3. Implement `AuditLogRepository`. Done.
4. Implement `MasterDataRepository`. Pending.
5. Revise schema/API for A-I alignment before implementing `StudentWorkflowRepository`. In progress; Flow A done, Flow B-C JSON runtime done, Flow D-I pending.
6. Implement `StudentWorkflowRepository`. Pending.

### Phase 5: Dual-adapter QA

Priority: High.

Status: Auth/RBAC harness added in Task 32; full dual-adapter workflow QA waits for Master Data and Student Workflow PostgreSQL repositories.

Deliverables:

1. `npm.cmd run api:smoke` PASS dengan JSON.
2. `npm.cmd run api:smoke:postgres-auth` PASS dengan PostgreSQL Auth/RBAC.
3. `npm.cmd run api:smoke` PASS dengan PostgreSQL setelah Master Data dan Student Workflow repository selesai.
4. Login UI HTTP mode PASS untuk Dosen dan Koordinator.
5. Negative RBAC tetap PASS.

## Acceptance Criteria

PostgreSQL migration dianggap siap jika:

1. Semua API route yang sudah ada tetap memakai path dan payload yang sama.
2. `DB_ADAPTER=json` tetap berjalan tanpa PostgreSQL.
3. `DB_ADAPTER=postgres` berjalan dengan `DATABASE_URL`.
4. Password hash dan refresh token tetap tidak pernah dikembalikan ke client.
5. Audit log tetap tercatat untuk auth, admin/master, dan workflow mutation.
6. Data workflow terpisah per `studentId`.
7. Automated smoke test PASS.

## Non-goals

1. Tidak membuat file upload production pada fase adapter.
2. Tidak membuat notification/email/WhatsApp.
3. Tidak mengganti frontend route `kordinator`.
4. Tidak mengganti backend stack Node.js + TypeScript.
5. Tidak memindahkan semua mock UI non-workflow sekaligus.

## Risiko

| Risiko | Dampak | Mitigasi |
|---|---|---|
| Workflow masih global state | Data mahasiswa bercampur | Contract hardening `studentId` sebelum SQL |
| Permission table belum ada | RBAC sulit dipertahankan | Tambah `role_permissions` migration |
| JSON dan PostgreSQL behavior beda | Regression tersembunyi | Jalankan `api:smoke` di kedua adapter |
| Replace-all admin/master besar | Potensi overwrite | Tambahkan transaction dan audit before/after |
| SQL driver menambah setup | Dev onboarding lebih berat | JSON adapter tetap default |

## Task Berikutnya Yang Disarankan

Task 38: Frontend Facade dan UI Integration untuk Final Project Registration.

Reason: Backend Flow B-C sudah punya route JSON dan smoke test. Berikutnya frontend perlu service/facade dan UI pendaftaran TA memakai aggregate baru, sambil menjaga compatibility dengan `thesis-submissions` legacy.
