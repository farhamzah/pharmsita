# Task 142: Coordinator Student Directory Pagination dan Search Query Backend Support

Tanggal: 2026-06-24

## Tujuan

Menjadikan daftar monitoring mahasiswa koordinator siap untuk data production dengan filter backend untuk pencarian dan pagination.

## Endpoint

Endpoint koordinator sekarang mendukung:

```http
GET /api/v1/coordinator/students?stage=PROPOSAL_SEMINAR&q=PostgreSQL&page=1&limit=10
GET /api/v1/kordinator/students?stage=PROPOSAL_SEMINAR&q=PostgreSQL&page=1&limit=10
```

Parameter:

| Query | Fungsi |
|---|---|
| `stage` | Filter lifecycle stage canonical dari Task 141 |
| `q` | Search nama, NIM/identifier, email, judul TA, dan nama pembimbing |
| `page` | Halaman, mulai dari 1 |
| `limit` | Jumlah item per halaman, maksimal 100 |

## Response Metadata

```json
{
  "data": [],
  "meta": {
    "page": 1,
    "limit": 10,
    "total": 42,
    "totalPages": 5,
    "scope": "coordinator",
    "stage": "PROPOSAL_SEMINAR",
    "q": "PostgreSQL"
  }
}
```

## Implementation Notes

- `UserRepository.listStudentDirectory()` sekarang mengembalikan `{ data, meta }`.
- Persistent repository mendukung filter stage, search, dan pagination.
- PostgreSQL repository menerapkan search dan pagination langsung di SQL query melalui `WHERE`, `LIMIT`, dan `OFFSET`.
- Route `/coordinator/students` dan `/kordinator/students` membaca `q`, `page`, `limit`, dan `stage`.
- Frontend `coordinatorWorkflowApi.listStudents()` menerima opsi `{ stage, q, page, limit }`.
- Halaman Monitoring Mahasiswa mengirim search dan pagination ke backend, lalu menampilkan metadata total.
- Mock adapter mengikuti behavior yang sama untuk mode dev/mock.

## Validation

- `page` dan `limit` harus angka positif.
- `limit` dibatasi maksimal 100.
- `q` dipotong maksimal 120 karakter.
- `stage` tetap mengikuti daftar canonical stage code dari Task 141.

## QA

Perintah yang sudah dijalankan:

```bash
npm.cmd run backend:check
npm.cmd run build
node --check tools/postgres-final-project-registration-smoke-test.mjs
```

Smoke PostgreSQL diperluas dengan check:

```text
Coordinator student directory supports search and pagination
```

## Next Task Recommendation

Task 143: Coordinator Student Directory UI QA untuk Pagination, Search, Stage Drilldown, dan Empty State

Prioritas: Medium

Reason: kontrak backend dan integrasi UI sudah ada, tetapi perlu QA interaksi end-to-end di browser untuk memastikan perubahan search, page navigation, stage filter, dan empty state terasa stabil.
