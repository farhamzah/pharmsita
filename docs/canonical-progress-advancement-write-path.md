# Canonical Progress Advancement Write Path

## Task

Task 137: Canonical Progress Advancement Write Path untuk Thesis Current Stage dan Stage History

Prioritas: **High**

## Tujuan

Task ini menyambungkan update progress legacy `student_progress_steps` ke lifecycle canonical:

- `theses.current_stage_id`
- `theses.status`
- `thesis_stage_histories`

Dengan ini, read model canonical dari Task 136 tidak hanya membaca data pendaftaran/pembimbing, tetapi juga mulai menerima pergerakan tahap dari progress workflow.

## Mapping Progress ke Stage Canonical

| Legacy progress step | Canonical `thesis_stages.code` |
|---|---|
| `bimbingan-pra-proposal` | `PROPOSAL_GUIDANCE` |
| `sidang-proposal` | `PROPOSAL_SEMINAR` |
| `revisi-proposal` | `PROPOSAL_REVISION` |
| `bimbingan-pra-sidang` | `FINAL_GUIDANCE` |
| `sidang` | `FINAL_DEFENSE` |
| `revisi-sidang` | `FINAL_REVISION` |
| Semua canonical step completed | `COMPLETED` |

`pendaftaran-ta` tidak punya stage canonical tersendiri karena lifecycle canonical dimulai ketika pendaftaran TA approved dan `theses` dibuat.

## Write Path

Saat `updateProgressStep` atau `resetProgressSteps` berjalan di PostgreSQL repository:

1. Progress lama tetap disimpan ke `student_progress_steps`.
2. Repository mencari active/latest thesis mahasiswa.
3. Repository menentukan first non-completed canonical step sebagai stage aktif.
4. `theses.current_stage_id` diarahkan ke stage aktif.
5. `theses.status` menjadi:
   - `ACTIVE` jika masih di awal canonical lifecycle.
   - `IN_PROGRESS` jika minimal satu canonical stage sudah completed.
   - `COMPLETED` jika semua canonical progress step selesai.
6. `thesis_stage_histories` stage yang selesai ditandai `COMPLETED`.
7. Active stage baru dibuat sebagai history `ACTIVE` bila belum ada.

## Compatibility Boundary

Frontend tetap aman karena:

- Endpoint progress tidak berubah.
- Response `StudentStep[]` tidak berubah.
- Gate revisi/final upload tetap memakai logic lama.
- Canonical advancement hanya berjalan jika mahasiswa sudah punya row `theses`.

Jika mahasiswa belum punya thesis aktif, sync canonical dilewati tanpa error.

## QA

Static checks:

- `npm.cmd run backend:check`
- `node --check tools/postgres-final-project-registration-smoke-test.mjs`
- `node --check tools/student-workflow-postgres-ui-http-qa.mjs`
- `node --check tools/create-release-bundle.mjs`

Smoke script PostgreSQL diperbarui untuk memastikan:

- Setelah approval pendaftaran, lifecycle canonical berada di `PROPOSAL_GUIDANCE`.
- Setelah progress `bimbingan-pra-proposal` completed, lifecycle canonical maju ke `PROPOSAL_SEMINAR`.
- Minimal satu `thesis_stage_histories` menjadi `COMPLETED`.
- Hanya satu active history tersisa untuk thesis tersebut.

## Next Task

**Task 138: Canonical Reporting API Endpoint untuk Coordinator Lifecycle Summary**

Prioritas: **Medium**

Reason: write path dan read model canonical sudah mulai stabil. Berikutnya koordinator perlu endpoint eksplisit yang membaca `canonical_coordinator_reporting_summary`, supaya dashboard/reporting tidak mengambil data mentah dari directory list.

## Task 138 Implementation Note

Task 138 sudah diimplementasikan melalui:

- `backend/src/modules/workflow/role-workflow-routes.ts`
- `backend/src/repositories/postgres/postgres-user-repository.ts`
- `src/core/api/domain/role-workflow-api.ts`
- `docs/canonical-reporting-api-endpoint.md`

Koordinator sekarang punya endpoint lifecycle summary yang membaca `canonical_coordinator_reporting_summary`.
