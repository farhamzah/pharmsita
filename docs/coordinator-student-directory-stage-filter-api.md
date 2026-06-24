# Task 141: Coordinator Student Directory Stage Filter API Contract dan Backend Query Parameter Support

Tanggal: 2026-06-24

## Tujuan

Memindahkan filter drilldown lifecycle dari sekadar filter frontend menjadi kontrak API backend agar student directory koordinator dapat difilter berdasarkan tahap lifecycle secara efisien.

## Endpoint

Endpoint lama tetap berlaku:

```http
GET /api/v1/coordinator/students
GET /api/v1/kordinator/students
```

Endpoint sekarang mendukung query:

```http
GET /api/v1/coordinator/students?stage=PROPOSAL_SEMINAR
GET /api/v1/kordinator/students?stage=PROPOSAL_SEMINAR
```

## Stage Code yang Didukung

| Stage Code | Boundary Student Directory |
|---|---|
| `UNREGISTERED` | belum selesai dan belum punya active step atau masih `pendaftaran-ta` |
| `PROPOSAL_GUIDANCE` | `bimbingan-pra-proposal` |
| `PROPOSAL_SEMINAR` | `sidang-proposal` |
| `PROPOSAL_REVISION` | `revisi-proposal` |
| `FINAL_GUIDANCE` | `bimbingan-pra-sidang` |
| `FINAL_DEFENSE` | `sidang` |
| `FINAL_REVISION` | `revisi-sidang` |
| `COMPLETED` | seluruh progress selesai |

Invalid stage dikembalikan sebagai `400 VALIDATION_ERROR`.

## Response Metadata

Response menyertakan stage filter yang dipakai:

```json
{
  "data": [],
  "meta": {
    "scope": "coordinator",
    "stage": "PROPOSAL_SEMINAR"
  }
}
```

## Implementation Notes

- `UserRepository.listStudentDirectory()` menerima opsi `stage`.
- Persistent JSON repository melakukan filter fallback lokal.
- PostgreSQL repository menerapkan filter di SQL query pada read model `canonical_student_directory_summary`.
- Frontend facade `coordinatorWorkflowApi.listStudents({ stage })` mengirim query parameter ke HTTP adapter.
- Mock adapter ikut mendukung filter agar behavior dev/mock sama dengan HTTP mode.
- Halaman monitoring koordinator sekarang meminta data dengan stage dari URL drilldown.

## QA

Perintah yang perlu dijalankan:

```bash
npm.cmd run backend:check
npm.cmd run build
node --check tools/postgres-final-project-registration-smoke-test.mjs
```

Smoke PostgreSQL diperluas dengan check:

```text
Coordinator student directory filters canonical lifecycle stage
```

## Next Task Recommendation

Task 142: Coordinator Student Directory Pagination dan Search Query Backend Support

Prioritas: Medium

Reason: Stage filter sudah pindah ke backend, tetapi search dan pagination monitoring mahasiswa masih belum menjadi kontrak backend. Untuk data production besar, list mahasiswa perlu `q`, `page`, `limit`, dan metadata total.
