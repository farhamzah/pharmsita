# Canonical Stage, Exam, Assessment, and Revision Write Path

## Task

Task 135: Canonical Stage Submission, Schedule, Assessment, dan Revision Note Write Path

Prioritas: **High**

## Tujuan

Task ini mengaktifkan write path canonical untuk alur seminar/sidang dan revisi. Endpoint dan payload lama tetap dipakai frontend, tetapi repository PostgreSQL sekarang ikut menulis state penting ke tabel canonical:

- `stage_submissions`
- `thesis_schedules`
- `thesis_assessments`
- `revision_notes`
- bridge `guidance_materials.revision_note_id`

## Write Path yang Diaktifkan

| Aksi | Legacy/current table | Canonical boundary |
|---|---|---|
| Mahasiswa update dokumen sidang/seminar | `exams.google_docs_link` | `stage_submissions.requirement_drive_link` |
| Koordinator/dosen ubah status sidang/seminar | `exams.status` | `stage_submissions.status` |
| Jadwal sidang tersedia | `exams.schedule_*` | `thesis_schedules` |
| Panelis sidang tersedia | `exam_panelists` | `thesis_assessments` |
| Hasil assessment menghasilkan catatan revisi | `exams.revision_notes` | `revision_notes` tanpa `legacy_revision_item_id` |
| Mahasiswa submit progres butir revisi | `revision_items` | `revision_notes.legacy_revision_item_id` |
| Mahasiswa upload final file revisi | `revision_workflows.final_file_ref` | `stage_submissions.latest_document_file` |
| Ketua sidang approve/reject revisi | `revision_workflows.ketua_sidang_status` | `stage_submissions.status` |
| Material bimbingan revisi sudah punya item canonical | `guidance_materials.source_revision_item_id` | `guidance_materials.revision_note_id` |

## Stage Mapping

| API stage | Canonical `thesis_stages.code` |
|---|---|
| `sidang-proposal` | `PROPOSAL_SEMINAR` |
| `sidang` | `FINAL_DEFENSE` |
| `revisi-proposal` | `PROPOSAL_REVISION` |
| `revisi-sidang` | `FINAL_REVISION` |

## Status Mapping

### Exam to Stage Submission

| Exam status | Canonical status |
|---|---|
| `belum-daftar` | `DRAFT` |
| `menunggu-jadwal` | `PENDING` |
| `terjadwal` | `SCHEDULED` |
| `selesai` | `COMPLETED` |

### Revision to Stage Submission

| Revision condition | Canonical status |
|---|---|
| Belum submit final file | `DRAFT` |
| Sudah submit final file | `PENDING` |
| Ketua sidang reject | `REJECTED` |
| Ketua sidang approve | `APPROVED` |

### Revision Item to Revision Note

| Revision item status | Canonical status |
|---|---|
| `pending` | `DRAFT` |
| `in progress` | `PENDING` |
| `done` | `COMPLETED` |

## Compatibility Boundary

Frontend tetap aman karena:

- Endpoint student, lecturer, dan coordinator untuk `exams` dan `revisions` tidak berubah.
- Response `ExamWorkflow` dan `RevisionWorkflow` tidak berubah.
- Tabel legacy tetap menjadi sumber response saat ini.
- Tabel canonical menjadi parallel write path untuk read model/reporting berikutnya.

## QA

Static checks:

- `npm.cmd run backend:check`
- `node --check tools/postgres-final-project-registration-smoke-test.mjs`
- `node --check tools/student-workflow-postgres-ui-http-qa.mjs`
- `node --check tools/create-release-bundle.mjs`

Smoke script PostgreSQL diperbarui untuk:

- Cleanup canonical `stage_submissions`, `thesis_schedules`, `thesis_assessments`, dan `revision_notes`.
- Memastikan alur sidang akhir menulis `stage_submissions.status = COMPLETED`.
- Memastikan jadwal sidang masuk ke `thesis_schedules`.
- Memastikan panelis dengan user valid masuk ke `thesis_assessments`.
- Memastikan catatan revisi assessment masuk ke `revision_notes`.
- Memastikan revisi sidang menulis `stage_submissions.status = APPROVED` dan `latest_document_file`.
- Memastikan material bimbingan revisi terhubung ke `revision_notes`.

## Next Task

**Task 136: Canonical Read Model Migration untuk Student Directory, Lecturer Monitoring, dan Coordinator Reporting**

Prioritas: **High**

Reason: write path canonical untuk registration, guidance, exam, schedule, assessment, dan revision sudah aktif. Berikutnya read-side dosen/koordinator perlu mulai memakai canonical table agar monitoring dan reporting tidak terus bergantung pada tabel legacy.

## Task 136 Implementation Note

Task 136 sudah diimplementasikan melalui:

- `backend/database/migrations/010_canonical_read_models.sql`
- `backend/src/repositories/postgres/postgres-user-repository.ts`
- `docs/canonical-read-model-migration.md`

Directory mahasiswa dan monitoring dosen sekarang membaca canonical view dengan fallback legacy untuk active progress step selama canonical stage advancement belum penuh.
