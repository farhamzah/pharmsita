# Canonical Guidance Write Path

## Task

Task 134: Canonical Guidance Request Write Path untuk 4 Jenis Bimbingan dan Material Boundary

Prioritas: **High**

## Tujuan

Task ini mengaktifkan write path canonical untuk request bimbingan dan material bimbingan setelah registration lifecycle canonical aktif.

API lama tetap kompatibel karena response masih memakai kontrak `GuidanceRequest` dan `GuidanceMaterial` yang sudah dipakai frontend. Di belakangnya, repository PostgreSQL sekarang ikut menyinkronkan data ke:

- `guidance_requests`
- kolom canonical di `guidance_materials`

## Write Path yang Diaktifkan

| Aksi | Legacy/current table | Canonical boundary |
|---|---|---|
| Mahasiswa submit request bimbingan | `guidance_workflows` | `guidance_requests` status `PENDING` |
| Dosen approve/reject request | `guidance_workflows` | `guidance_requests` status `APPROVED` atau `REJECTED` |
| Mahasiswa submit material normal | `guidance_materials` | `guidance_request_id`, `submitted_by`, `title`, `canonical_status = PENDING` |
| Mahasiswa submit material revisi | `guidance_materials` | `revision_note_id` diisi dari bridge `revision_notes.legacy_revision_item_id` bila tersedia |
| Dosen validasi material | `guidance_materials.status` | `canonical_status = VALID` atau `REJECTED` |

## Mapping 4 Jenis Bimbingan

| Guidance type API | Legacy `stage_id` | Canonical `thesis_stages.code` |
|---|---|---|
| `seminar-proposal` | `bimbingan-pra-proposal` | `PROPOSAL_GUIDANCE` |
| `revisi-seminar-proposal` | `revisi-proposal` | `PROPOSAL_REVISION` |
| `sidang-akhir` | `bimbingan-pra-sidang` | `FINAL_GUIDANCE` |
| `revisi-sidang-akhir` | `revisi-sidang` | `FINAL_REVISION` |

## Compatibility Boundary

Frontend tetap aman karena:

- Endpoint guidance request tidak berubah.
- Payload response `GuidanceRequest` tidak berubah.
- Material summary tetap dihitung dari status legacy `Valid`, `Diajukan`, dan `Ditolak`.
- Canonical fields hanya menjadi persistence boundary untuk repository/API berikutnya.

## QA

Static checks:

- `npm.cmd run backend:check`
- `node --check tools/postgres-final-project-registration-smoke-test.mjs`
- `node --check tools/student-workflow-postgres-ui-http-qa.mjs`

Smoke script PostgreSQL diperbarui untuk:

- Apply migration `009`.
- Cleanup canonical `guidance_requests` dan canonical-linked `guidance_materials`.
- Memastikan request approved menghasilkan `guidance_requests.status = APPROVED`.
- Memastikan material valid menghasilkan `guidance_materials.canonical_status = VALID`.

## Next Task

**Task 135: Canonical Stage Submission, Schedule, Assessment, dan Revision Note Write Path**

Prioritas: **High**

Reason: registration dan guidance canonical sudah aktif. Berikutnya pengajuan seminar/sidang, jadwal, penilaian, dan butir revisi perlu mulai menulis ke `stage_submissions`, `thesis_schedules`, `thesis_assessments`, dan `revision_notes` agar lifecycle sidang/revisi tidak hanya bergantung pada tabel legacy.

## Task 135 Implementation Note

Task 135 sudah diimplementasikan melalui:

- `backend/src/repositories/postgres/postgres-student-workflow-repository.ts`
- `docs/canonical-stage-exam-revision-write-path.md`

Write path sidang/revisi sekarang melakukan sync ke `stage_submissions`, `thesis_schedules`, `thesis_assessments`, `revision_notes`, dan bridge material revisi ke `guidance_materials.revision_note_id`.
