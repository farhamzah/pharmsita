# Canonical PharmSITA Schema Boundary Migration

## Task

Task 132: Canonical PharmSITA Schema Boundary Migration dari Referensi Database Detail

Prioritas: **Extra High**

## Tujuan

Migration `009_canonical_pharmsita_schema_boundary.sql` menyelaraskan database PostgreSQL lokal/production dengan referensi detail:

- `docs/reference/pharmsita-detail-2026-06-24/database-Pharmsita.txt`
- `docs/reference/pharmsita-detail-2026-06-24/Alur Sistem PharmSITA Detail.pdf`

Pendekatannya **additive dan non-destruktif**. Tabel lama yang sudah dipakai backend/frontend tetap dipertahankan, lalu ditambahkan table/kolom canonical dan bridge data awal.

## Output Schema

Migration menambahkan atau menyelaraskan area berikut:

| Area | Output |
|---|---|
| Role canonical | `roles`, `user_roles.role_id`, `user_roles.assigned_at` |
| Profile canonical | `users.username`, `users.full_name`, `users.study_program_id`, `users.first_login`, `users.is_active` |
| Master akademik | `faculties`, `study_programs`, `thesis_schemes`, tambahan `thesis_types.scheme_id` |
| Requirement canonical | `requirement_categories`, `requirements` |
| Thesis lifecycle | `thesis_stages`, `thesis_stage_histories` |
| Registrasi TA | `thesis_registrations` bridge dari `final_project_registrations` |
| TA aktif | `theses` dari registrasi yang sudah approved |
| Pembimbing/kuota | `thesis_committees`, `lecturer_quotas` |
| Bimbingan | `guidance_requests`, kolom canonical di `guidance_materials` |
| Pengajuan tahap | `stage_submissions`, `stage_submission_requirement_validations` |
| Jadwal/penilaian | `thesis_schedules`, `thesis_assessments` |
| Revisi | `revision_notes` bridge dari `revision_items` |
| Operasional | `notifications`, `system_settings` |
| Read model | `canonical_thesis_lifecycle_summary`, `canonical_guidance_material_summary` |

## Boundary Lama ke Canonical

| Model lama | Model canonical |
|---|---|
| `final_project_registrations` | `thesis_registrations` |
| `supervisor_assignments` | `thesis_committees` |
| `lecturer_profiles.quota_limit` | `lecturer_quotas.supervisor_1_quota`, `supervisor_2_quota` |
| `guidance_workflows` | `guidance_requests` |
| `guidance_materials.status` | `guidance_materials.canonical_status` |
| `exams` | `stage_submissions`, `thesis_schedules` |
| `exam_panelists` | `thesis_assessments` |
| `revision_workflows` | `stage_submissions` untuk tahap revisi |
| `revision_items` | `revision_notes` |
| `student_progress_steps` | `thesis_stages`, `thesis_stage_histories` |

## Kenapa Tidak Rename Langsung

Rename langsung berisiko tinggi karena service frontend/backend saat ini masih membaca tabel lama seperti `final_project_registrations`, `guidance_workflows`, `exams`, dan `revision_workflows`.

Dengan bridge additive:

- Aplikasi lama tetap jalan.
- Data lama bisa dibackfill ke canonical.
- Repository/API dapat dimigrasikan bertahap.
- Rollback aplikasi lebih aman karena migration tidak menghapus tabel/kolom lama.

## QA yang Wajib Sebelum Production

Sebelum migration ini diterapkan di VPS production:

1. Jalankan backup safety gate.
2. Jalankan restore drill.
3. Jalankan `npm.cmd run db:migrate -- --dry-run`.
4. Jalankan `npm.cmd run db:migrate`.
5. Cek view:
   - `canonical_thesis_lifecycle_summary`
   - `canonical_guidance_material_summary`
6. Jalankan smoke test no-demo dan role profile smoke.

## Next Technical Boundary

Setelah migration ini masuk, repository/API belum otomatis memakai seluruh model canonical. Task berikutnya harus mulai mengalihkan write path:

- Approve registrasi TA menulis/memperbarui `thesis_registrations`, `theses`, `thesis_committees`, dan `thesis_stage_histories`.
- Guidance workflow menulis/membaca `guidance_requests`.
- Exam/revision workflow menulis/membaca `stage_submissions`, `thesis_schedules`, `thesis_assessments`, dan `revision_notes`.

Rekomendasi task berikutnya:

**Task 133: Canonical Repository/API Write Path untuk Registrasi TA, Thesis Aktif, Committee, dan Stage History**

Prioritas: **Extra High**

## Task 133 Implementation Note

Task 133 sudah diimplementasikan melalui:

- `backend/src/repositories/postgres/postgres-final-project-registration-repository.ts`
- `docs/canonical-registration-write-path.md`

Write path approval pendaftaran TA sekarang melakukan sync ke `thesis_registrations`, `theses`, `thesis_committees`, dan `thesis_stage_histories`.

Rekomendasi task berikutnya:

**Task 134: Canonical Guidance Request Write Path untuk 4 Jenis Bimbingan dan Material Boundary**

Prioritas: **High**

## Task 134 Implementation Note

Task 134 sudah diimplementasikan melalui:

- `backend/src/repositories/postgres/postgres-guidance-request-repository.ts`
- `docs/canonical-guidance-write-path.md`

Rekomendasi task berikutnya:

**Task 135: Canonical Stage Submission, Schedule, Assessment, dan Revision Note Write Path**

Prioritas: **High**

## Task 135 Implementation Note

Task 135 sudah diimplementasikan melalui:

- `backend/src/repositories/postgres/postgres-student-workflow-repository.ts`
- `docs/canonical-stage-exam-revision-write-path.md`
