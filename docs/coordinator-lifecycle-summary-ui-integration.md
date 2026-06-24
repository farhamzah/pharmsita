# Task 139: Coordinator Reporting Dashboard UI Integration untuk Lifecycle Summary

Tanggal: 2026-06-24

## Tujuan

Menghubungkan endpoint canonical lifecycle summary dari Task 138 ke dashboard koordinator agar koordinator dapat melihat ringkasan jumlah mahasiswa per tahap tugas akhir langsung dari UI.

## Frontend Integration

Halaman yang diintegrasikan:

- `src/features/coordinator/pages/CoordinatorDashboardPage.tsx`

API facade yang digunakan:

```ts
coordinatorWorkflowApi.getLifecycleSummary()
```

Endpoint sumber:

```http
GET /api/v1/coordinator/reports/lifecycle-summary
```

Read model backend:

```text
canonical_coordinator_reporting_summary
```

## Tampilan UI

Dashboard koordinator sekarang menampilkan:

- Total mahasiswa terpantau
- Jumlah tugas akhir aktif
- Jumlah tugas akhir selesai
- Jumlah mahasiswa pada tahap Seminar Proposal
- Panel ringkasan lifecycle per tahap
- Status sinkronisasi data dari API/read model canonical
- Fallback dashboard bila API belum bisa dimuat

## Boundary

- Task ini hanya mengintegrasikan summary lifecycle ke dashboard.
- Tidak mengubah schema database.
- Tidak mengubah endpoint backend.
- Tidak mengubah workflow approval/progress.
- Data fallback hanya dipakai agar dashboard tetap usable ketika API gagal.

## QA

Perintah yang sudah dijalankan:

```bash
npm.cmd run build
npm.cmd run backend:check
```

Hasil:

- Frontend TypeScript dan production build berhasil.
- Backend typecheck berhasil.
- Build masih menampilkan warning chunk size Vite yang sudah ada sebagai warning, bukan error.

## Next Task Recommendation

Task 140: Coordinator Reporting Detail Drilldown dari Lifecycle Summary ke Student Directory

Prioritas: Medium

Reason: Koordinator sudah dapat melihat angka lifecycle di dashboard, tetapi belum bisa klik tahap tertentu untuk membuka daftar mahasiswa yang termasuk dalam tahap tersebut.
