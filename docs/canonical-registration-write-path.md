# Canonical Registration Write Path

## Task

Task 133: Canonical Repository/API Write Path untuk Registrasi TA, Thesis Aktif, Committee, dan Stage History

Prioritas: **Extra High**

## Tujuan

Task ini mengaktifkan write path canonical setelah migration `009_canonical_pharmsita_schema_boundary.sql`.

API lama tetap mengembalikan payload `final_project_registrations` agar frontend tidak rusak, tetapi repository PostgreSQL sekarang ikut menulis ke schema canonical dalam transaksi yang sama.

## Write Path yang Diaktifkan

| Aksi | Legacy table | Canonical table |
|---|---|---|
| Mahasiswa save draft pendaftaran TA | `final_project_registrations` | `thesis_registrations` status `DRAFT` |
| Mahasiswa submit pendaftaran TA | `final_project_registrations` | `thesis_registrations` status `PENDING` |
| Koordinator reject pendaftaran TA | `final_project_registrations` | `thesis_registrations` status `REJECTED` |
| Koordinator approve pendaftaran TA | `final_project_registrations`, `supervisor_assignments` | `thesis_registrations`, `theses`, `thesis_committees`, `thesis_stage_histories` |
| Koordinator update pembimbing | `supervisor_assignments` | `thesis_committees` |

## Detail Canonical Saat Approve

Saat koordinator menyetujui pendaftaran TA:

1. `thesis_registrations.status` menjadi `APPROVED`.
2. `theses` dibuat atau di-update untuk mahasiswa tersebut.
3. `theses.current_stage_id` diarahkan ke stage `PROPOSAL_GUIDANCE`.
4. `thesis_stage_histories` membuat active history awal jika belum ada.
5. `thesis_committees` diisi atau di-update untuk:
   - `SUPERVISOR_1`
   - `SUPERVISOR_2`

Semua proses ini berjalan di transaksi yang sama dengan update legacy table.

## Compatibility Boundary

Frontend masih aman karena:

- Endpoint lama tidak berubah.
- Response `FinalProjectRegistration` tidak berubah.
- Table lama tetap menjadi read model utama untuk API saat ini.

Canonical schema mulai menjadi source of truth tambahan untuk lifecycle TA dan akan dipakai bertahap oleh task berikutnya.

## QA

Static checks:

- `npm.cmd run backend:check`

Smoke script yang diperbarui:

- `tools/postgres-final-project-registration-smoke-test.mjs`
- `tools/student-workflow-postgres-ui-http-qa.mjs`

`postgres-final-project-registration-smoke-test.mjs` sekarang mengecek bahwa approval pendaftaran TA menghasilkan:

- `thesis_registrations.status = APPROVED`
- `theses.status = ACTIVE`
- `thesis_stages.code = PROPOSAL_GUIDANCE`
- 2 row `thesis_committees`
- 1 active row `thesis_stage_histories`

## Next Task

**Task 134: Canonical Guidance Request Write Path untuk 4 Jenis Bimbingan dan Material Boundary**

Prioritas: **High**

Reason: registration lifecycle canonical sudah aktif. Berikutnya guidance request/material perlu menulis langsung ke `guidance_requests` dan kolom canonical `guidance_materials` agar bimbingan proposal, revisi proposal, bimbingan akhir, dan revisi sidang memakai boundary baru secara konsisten.

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
