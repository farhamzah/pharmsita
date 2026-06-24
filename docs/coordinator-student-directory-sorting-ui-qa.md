# Task 146: Coordinator Student Directory Sorting UI Browser QA dan Header Accessibility Polish

Tanggal: 2026-06-24

## Tujuan

Memverifikasi sorting UI Monitoring Mahasiswa Koordinator dan memoles aksesibilitas header sortable.

## Implementasi

File yang diubah:

- `src/components/ui/DataTableHeader.tsx`
- `src/components/ui/DataTable.tsx`
- `src/features/coordinator/pages/CoordinatorMonitoringPage.tsx`

Perubahan:

- Header sortable sekarang memakai native `<button>`.
- Header sortable memiliki `aria-label` berisi aksi sort berikutnya.
- `<th>` aktif memakai `aria-sort="ascending"` atau `aria-sort="descending"`.
- Icon sort diberi `aria-hidden`.
- Kolom `Tahapan Saat Ini` ikut sortable.
- Fallback mock lokal tetap menghormati sorting saat API gagal.

## Browser QA Evidence

Environment:

- URL: `http://localhost:5173/#/kordinator/monitoring`
- Role: `kordinator`
- API mode: mock/dev local

Skenario:

| Skenario | Hasil | Evidence |
|---|---|---|
| Header sortable menjadi button | Pass | NIM, Nama Mahasiswa, Pembimbing Utama, dan Tahapan Saat Ini memiliki button |
| Default sort nama asc | Pass | `Nama Mahasiswa` memiliki `aria-sort="ascending"` |
| Klik Nama Mahasiswa | Pass | `aria-sort` berubah menjadi `descending`; row pertama menjadi `Sisca Kaila` |
| Klik NIM | Pass | `NIM` menjadi `aria-sort="ascending"`; row pertama menjadi `Alif Fikri` |
| Klik NIM lagi | Pass | `NIM` menjadi `aria-sort="descending"`; row pertama menjadi `Sisca Kaila` |
| Header non-sortable | Pass | `Judul Tugas Akhir` dan `Aksi` tetap bukan button |

## Verifikasi Teknis

Perintah yang sudah dijalankan:

```bash
npm.cmd run backend:check
npm.cmd run build
git diff --check
```

Hasil:

- Backend typecheck berhasil.
- Frontend production build berhasil.
- Browser QA sorting berhasil.
- `git diff --check` hanya menampilkan warning LF/CRLF normal Windows.

## Next Task Recommendation

Task 147: Coordinator Student Directory URL State Sync untuk Filter, Search, Pagination, dan Sorting

Prioritas: Low

Reason: sorting, search, pagination, dan filter sudah berjalan. URL state sync akan membuat halaman monitoring bisa dibagikan/bookmark dengan kondisi filter yang sama.
