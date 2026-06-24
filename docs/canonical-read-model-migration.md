# Canonical Read Model Migration

## Task

Task 136: Canonical Read Model Migration untuk Student Directory, Lecturer Monitoring, dan Coordinator Reporting

Prioritas: **High**

## Tujuan

Task ini mulai memindahkan sisi baca dosen/koordinator ke read model canonical setelah write path canonical aktif untuk registrasi, bimbingan, sidang, assessment, dan revisi.

Perubahan tetap additive:

- Endpoint frontend tidak berubah.
- Payload `StudentDirectoryItem` dan `LecturerDirectoryItem` tidak berubah.
- Tabel legacy masih dipakai sebagai fallback progress step selama `theses.current_stage_id` belum menjadi satu-satunya sumber progress.

## Read Model Baru

Migration `010_canonical_read_models.sql` menambahkan:

| View | Fungsi |
|---|---|
| `canonical_student_directory_summary` | Directory mahasiswa untuk dosen/koordinator: profile, judul TA, tahap canonical, pembimbing canonical |
| `canonical_lecturer_monitoring_summary` | Monitoring dosen: kuota canonical, jumlah aktif pembimbing 1/2, jumlah selesai |
| `canonical_coordinator_reporting_summary` | Agregasi koordinator per stage/status lifecycle |

## Repository Migration

`PostgresUserRepository` sekarang membaca:

- `/lecturer/students` dan `/coordinator/students` dari `canonical_student_directory_summary`
- `/coordinator/lecturers` dari `canonical_lecturer_monitoring_summary`
- update kuota dosen ke `lecturer_profiles` dan `lecturer_quotas`

## Compatibility Boundary

Directory mahasiswa masih memakai fallback legacy untuk active step:

1. `student_progress_steps` active step.
2. `student_progress_steps` next unfinished step.
3. `canonical_student_directory_summary.current_legacy_step_id`.

Alasannya: write path `theses.current_stage_id` belum sepenuhnya menggantikan progress workflow lama. Dengan fallback ini, UI tetap stabil sambil read model canonical mulai dipakai untuk data TA dan pembimbing.

## QA

Static checks:

- `npm.cmd run backend:check`
- `node --check tools/postgres-final-project-registration-smoke-test.mjs`
- `node --check tools/student-workflow-postgres-ui-http-qa.mjs`
- `node --check tools/create-release-bundle.mjs`

Smoke script PostgreSQL diperbarui untuk:

- Apply migration `010`.
- Memastikan directory koordinator setelah approval menampilkan judul TA dan pembimbing dari canonical committee.
- Memastikan lecturer monitoring menampilkan count pembimbing aktif dari canonical committee.
- Memastikan update quota tersinkron ke read model canonical.

## Next Task

**Task 137: Canonical Progress Advancement Write Path untuk Thesis Current Stage dan Stage History**

Prioritas: **High**

Reason: read model sudah mulai memakai canonical view, tetapi active progress masih perlu fallback ke legacy. Agar canonical benar-benar menjadi source of truth lifecycle, update progress harus ikut memajukan `theses.current_stage_id` dan `thesis_stage_histories`.

## Task 137 Implementation Note

Task 137 sudah diimplementasikan melalui:

- `backend/src/repositories/postgres/postgres-student-workflow-repository.ts`
- `docs/canonical-progress-advancement-write-path.md`

Update progress PostgreSQL sekarang ikut menyinkronkan `theses.current_stage_id`, `theses.status`, dan `thesis_stage_histories`.
