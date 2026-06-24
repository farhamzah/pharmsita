# Task 140: Coordinator Reporting Detail Drilldown dari Lifecycle Summary ke Student Directory

Tanggal: 2026-06-24

## Tujuan

Membuat angka lifecycle pada dashboard koordinator dapat ditelusuri ke daftar mahasiswa yang berada pada tahap tersebut.

## Implementasi

Halaman yang diubah:

- `src/features/coordinator/pages/CoordinatorDashboardPage.tsx`
- `src/features/coordinator/pages/CoordinatorMonitoringPage.tsx`
- `src/router/Router.tsx`

Alur UI:

1. Koordinator membuka dashboard.
2. Koordinator klik salah satu item pada panel `Ringkasan Lifecycle Tugas Akhir`.
3. Aplikasi membuka:

```text
#/kordinator/monitoring?stage=<STAGE_CODE>
```

4. Halaman monitoring membaca query `stage`.
5. Halaman monitoring mengambil data dari:

```ts
coordinatorWorkflowApi.listStudents()
```

6. Data student directory difilter berdasarkan tahap lifecycle yang dipilih.

## Stage Filter Mapping

| Lifecycle Stage | Student Directory Boundary |
|---|---|
| `UNREGISTERED` | `activeStepId = null` dan belum selesai |
| `PROPOSAL_GUIDANCE` | `bimbingan-pra-proposal` |
| `PROPOSAL_SEMINAR` | `sidang-proposal` |
| `PROPOSAL_REVISION` | `revisi-proposal` |
| `FINAL_GUIDANCE` | `bimbingan-pra-sidang` |
| `FINAL_DEFENSE` | `sidang` |
| `FINAL_REVISION` | `revisi-sidang` |
| `COMPLETED` | `isCompleted = true` |

## Router Boundary

Router hash sekarang memisahkan query string dari route name. Ini membuat route seperti berikut tetap masuk ke halaman `kordinator/monitoring`:

```text
#/kordinator/monitoring?stage=PROPOSAL_SEMINAR
```

## UX

Halaman monitoring sekarang menampilkan:

- Filter tahap aktif dari lifecycle dashboard.
- Tombol hapus filter.
- Loading state saat student directory dimuat.
- Fallback lokal bila endpoint student directory belum bisa diakses.

## QA

Perintah yang sudah dijalankan:

```bash
npm.cmd run build
npm.cmd run backend:check
node --check tools/create-release-bundle.mjs
```

Hasil:

- Frontend TypeScript dan production build berhasil.
- Backend typecheck berhasil.
- Release bundle script syntax check berhasil.
- Build masih menampilkan warning chunk size Vite yang sudah ada sebagai warning, bukan error.

## Next Task Recommendation

Task 141: Coordinator Student Directory Stage Filter API Contract dan Backend Query Parameter Support

Prioritas: Medium

Reason: Saat ini filter tahap dilakukan di frontend setelah mengambil student directory. Untuk data production yang besar, backend perlu mendukung query parameter agar pagination/filtering tetap efisien.
