# Database

Folder ini berisi draft migration SQL untuk backend PharmSITA.

Dialect awal: PostgreSQL-compatible SQL.

Runtime backend saat ini memakai persistent JSON database adapter di `backend/.data/pharmsita-db.json` agar belum membutuhkan dependency database driver. PostgreSQL belum aktif, dan migration SQL di folder ini tetap menjadi acuan schema production berikutnya.

## Migration

```text
migrations/001_auth_master_data.sql
migrations/002_permissions_and_workflow.sql
migrations/003_multi_role_first_login.sql
migrations/004_final_project_registration.sql
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

Urutan lokal PostgreSQL yang disarankan:

```text
001_auth_master_data.sql
002_permissions_and_workflow.sql
003_multi_role_first_login.sql
004_final_project_registration.sql
001_demo_auth.sql
002_demo_master_data.sql
```

Planning boundary migrasi PostgreSQL tersedia di:

```text
../../docs/postgresql-adapter-plan.md
```
