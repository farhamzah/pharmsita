# Task 145: Coordinator Student Directory Sorting Contract untuk Nama, NIM, Tahap, dan Pembimbing

Tanggal: 2026-06-24

## Tujuan

Menambahkan sorting backend/frontend pada Monitoring Mahasiswa Koordinator agar daftar mahasiswa bisa diurutkan berdasarkan kolom operasional utama.

## Endpoint

Endpoint student directory koordinator sekarang mendukung:

```http
GET /api/v1/coordinator/students?sortBy=name&sortDir=asc
GET /api/v1/coordinator/students?sortBy=nim&sortDir=desc
GET /api/v1/coordinator/students?sortBy=stage&sortDir=asc
GET /api/v1/coordinator/students?sortBy=supervisor1&sortDir=asc
```

Parameter sorting:

| Query | Nilai |
|---|---|
| `sortBy` | `name`, `nim`, `stage`, `supervisor1` |
| `sortDir` | `asc`, `desc` |

Default:

```text
sortBy=name
sortDir=asc
```

## Response Metadata

```json
{
  "data": [],
  "meta": {
    "page": 1,
    "limit": 10,
    "total": 42,
    "totalPages": 5,
    "sortBy": "name",
    "sortDir": "asc"
  }
}
```

## Implementation Notes

- Backend route memvalidasi `sortBy` dan `sortDir`.
- PostgreSQL repository memakai whitelist expression untuk `ORDER BY`.
- Persistent repository memakai sort lokal dengan fallback tie-breaker nama.
- Mock adapter mengikuti kontrak sorting.
- UI Monitoring Mahasiswa mengirim sorting saat header sortable diklik.
- Kolom sortable:
  - NIM
  - Nama Mahasiswa
  - Pembimbing Utama
  - Tahapan Saat Ini

## QA

Perintah yang sudah dijalankan:

```bash
npm.cmd run backend:check
npm.cmd run build
```

Smoke PostgreSQL diperluas dengan check:

```text
Coordinator student directory supports sorting contract
```

## Next Task Recommendation

Task 146: Coordinator Student Directory Sorting UI Browser QA dan Header Accessibility Polish

Prioritas: Low

Reason: kontrak sorting dan integrasi header sudah masuk. QA browser khusus sorting perlu memastikan klik header bolak-balik `asc/desc` terasa jelas dan accessible.
