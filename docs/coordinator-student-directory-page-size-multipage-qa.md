# Task 144: Coordinator Student Directory Page Size Control dan Multi-Page Fixture QA

Tanggal: 2026-06-24

## Tujuan

Menambahkan kontrol jumlah data per halaman pada Monitoring Mahasiswa Koordinator agar pagination bisa diuji nyata memakai fixture lokal.

## Implementasi

File utama:

- `src/features/coordinator/pages/CoordinatorMonitoringPage.tsx`

Perubahan UI:

- Menambahkan kontrol `Per halaman`.
- Opsi page size: `2`, `5`, `10`, `20`.
- Perubahan page size mengembalikan halaman ke page 1.
- Search tetap mengembalikan halaman ke page 1.
- Query API tetap memakai kontrak Task 142: `{ stage, q, page, limit }`.

## Browser QA Evidence

Environment:

- URL: `http://localhost:5173/#/kordinator/monitoring`
- Role: `kordinator`
- API mode: mock/dev local

Skenario:

| Skenario | Hasil | Evidence |
|---|---|---|
| Default page size | Pass | `10`, total `5 dari 5`, page `1 / 1` |
| Ubah page size ke 2 | Pass | total `2 dari 5`, page `1 / 3` |
| Page 1 boundary | Pass | `Sebelumnya` disabled, `Berikutnya` enabled |
| Klik Berikutnya | Pass | page menjadi `2 / 3`, row berubah ke data berikutnya |
| Klik Sebelumnya | Pass | page kembali `1 / 3` |
| Search setelah page size 2 | Pass | query `Ratna` menghasilkan `1 dari 1`, page `1 / 1` |

## Catatan

- Fixture lokal sekarang bisa memverifikasi multi-page tanpa menambah data dummy baru.
- Kontrol page size memakai native select agar keyboard/accessibility tetap sederhana.
- Tidak ada perubahan backend tambahan; backend sudah mendukung `limit` dari Task 142.

## Verifikasi Teknis

Perintah yang sudah dijalankan:

```bash
npm.cmd run backend:check
npm.cmd run build
```

Hasil:

- Backend typecheck berhasil.
- Frontend production build berhasil.
- Browser QA multi-page berhasil.

## Next Task Recommendation

Task 145: Coordinator Student Directory Sorting Contract untuk Nama, NIM, Tahap, dan Pembimbing

Prioritas: Low

Reason: search, filter, dan pagination sudah stabil. Sorting backend/frontend akan membuat monitoring lebih ergonomis saat data mahasiswa bertambah.
