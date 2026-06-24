# Database

Folder ini berisi draft migration SQL untuk backend PharmSITA.

Dialect awal: PostgreSQL-compatible SQL.

Runtime backend mendukung dua adapter:

- `DB_ADAPTER=json` untuk local/demo/offline dengan persistent JSON database di `backend/.data/pharmsita-db.json`.
- `DB_ADAPTER=postgres` untuk PostgreSQL runtime dan boundary production.

Migration SQL di folder ini adalah acuan schema PostgreSQL. Untuk production, jalankan migration schema saja dan jangan menjalankan seed demo.

## Migration

```text
migrations/001_auth_master_data.sql
migrations/002_permissions_and_workflow.sql
migrations/003_multi_role_first_login.sql
migrations/004_final_project_registration.sql
migrations/005_guidance_type_materials.sql
migrations/006_audit_export_guard.sql
migrations/007_user_profile_contact.sql
migrations/008_role_profile_fields.sql
migrations/009_canonical_pharmsita_schema_boundary.sql
migrations/010_canonical_read_models.sql
```

Scope `001_auth_master_data.sql`:

- Auth identity
- Refresh token
- Profile per role
- Master data akademik
- Requirement definitions
- Audit log awal

Scope `002_permissions_and_workflow.sql`:

- Role permission table dan seed permission awal
- Progress step per mahasiswa
- Requirement bundle dan requirement record per mahasiswa/tahap
- Thesis submission
- Guidance workflow, session, dan chat
- Exam workflow, panelist, dan requirement checklist
- Revision workflow, item, dan chat

Scope `003_multi_role_first_login.sql`:

- Field first login dan password changed pada `users`
- Tabel `user_roles` untuk identity multi-role
- Role session pada `refresh_tokens`

Scope `004_final_project_registration.sql`:

- Permission pendaftaran TA aggregate
- Tabel `final_project_registrations`
- Tabel `final_project_registration_requirements`
- Tabel `supervisor_assignments`

Scope `005_guidance_type_materials.sql`:

- Permission guidance request/material alignment
- Kolom `guidance_type` dan status request target pada `guidance_workflows`
- Backfill stage lama ke 4 guidance type PDF
- Tabel `guidance_materials`
- Index query untuk guidance type, status, validator, dan valid material count

Scope `006_audit_export_guard.sql`:

- Tabel `audit_export_attempts` untuk rate limit export CSV audit
- Penyimpanan attempt allowed/blocked per actor, role, dan scope export
- Index guard window dan observability query untuk production multi-instance
- Retention dan cleanup planning: `../../docs/audit-export-attempt-retention-plan.md`

Scope `007_user_profile_contact.sql`:

- Field profile kontak umum pada `users`: `phone`, `address`, `gender`, dan `birth_date`
- Persistence untuk endpoint standalone `GET/PATCH /api/v1/auth/profile`

Scope `008_role_profile_fields.sql`:

- Field khusus mahasiswa: `skema_ta`, `jenis_ta`
- Field khusus dosen: `program_studi`, `jabatan_akademik`, `peran_sistem`
- Field khusus koordinator: `jabatan`, `program_studi`, `hak_akses_utama`
- Field khusus admin: `divisi`, `tingkat_akses`, `cakupan_akses`

Scope `009_canonical_pharmsita_schema_boundary.sql`:

- Boundary schema canonical dari referensi database detail PharmSITA
- Role canonical, faculty/study program, thesis scheme/stage, requirement category
- Bridge `final_project_registrations` ke `thesis_registrations` dan `theses`
- Bridge supervisor assignment ke `thesis_committees` dan lecturer quota canonical
- Bridge guidance, stage submission, schedule, assessment, dan revision note
- Read model `canonical_thesis_lifecycle_summary` dan `canonical_guidance_material_summary`
- Repository write path pendaftaran TA dijelaskan di `../../docs/canonical-registration-write-path.md`
- Repository write path bimbingan dijelaskan di `../../docs/canonical-guidance-write-path.md`
- Repository write path sidang, jadwal, assessment, dan revisi dijelaskan di `../../docs/canonical-stage-exam-revision-write-path.md`

Scope `010_canonical_read_models.sql`:

- View `canonical_student_directory_summary` untuk directory mahasiswa dosen/koordinator
- View `canonical_lecturer_monitoring_summary` untuk monitoring kuota dan beban pembimbing
- View `canonical_coordinator_reporting_summary` untuk agregasi lifecycle mahasiswa per tahap/status
- Repository read path dijelaskan di `../../docs/canonical-read-model-migration.md`

## Seed

```text
seeds/001_demo_auth.sql
seeds/002_demo_master_data.sql
```

Scope `001_demo_auth.sql`:

- Demo users untuk role mahasiswa, dosen, admin, koordinator, multi-role, dan first-login
- Password demo: `demo`
- Profile minimum per role

Scope `002_demo_master_data.sql`:

- Periode akademik aktif demo
- Jenis TA demo dengan UUID stabil untuk boundary `thesisTypeId`
- Dokumen pendukung demo
- Definisi persyaratan awal/demo

Urutan lokal PostgreSQL QA yang disarankan:

```text
001_auth_master_data.sql
002_permissions_and_workflow.sql
003_multi_role_first_login.sql
004_final_project_registration.sql
005_guidance_type_materials.sql
006_audit_export_guard.sql
007_user_profile_contact.sql
008_role_profile_fields.sql
009_canonical_pharmsita_schema_boundary.sql
010_canonical_read_models.sql
001_demo_auth.sql
002_demo_master_data.sql
```

Urutan production no-demo:

```text
001_auth_master_data.sql
002_permissions_and_workflow.sql
003_multi_role_first_login.sql
004_final_project_registration.sql
005_guidance_type_materials.sql
006_audit_export_guard.sql
007_user_profile_contact.sql
008_role_profile_fields.sql
009_canonical_pharmsita_schema_boundary.sql
010_canonical_read_models.sql
```

Bootstrap admin production dijelaskan di:

```text
../../docs/production-deployment-runbook.md
```

Versioned migration runner production:

```powershell
npm.cmd run db:migrate:status
npm.cmd run db:migrate -- --dry-run
npm.cmd run db:migrate
```

Planning boundary migrasi PostgreSQL tersedia di:

```text
../../docs/postgresql-adapter-plan.md
```
