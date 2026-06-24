# Coordinator Student Directory Deep Link Regression QA

Tanggal: 2026-06-24
Task: 148
Prioritas: Medium

## Tujuan

Memastikan deep link student directory koordinator stabil untuk direct URL, refresh, browser Back/Forward, dan shared URL regression setelah URL state sync.

## Scope QA

- Direct URL dengan kombinasi `stage`, `q`, `limit`, `sortBy`, dan `sortDir`.
- Refresh halaman pada URL yang sama.
- Perpindahan hash ke deep link lain pada route component yang sama.
- Browser Back/Forward antar deep link monitoring.
- Shared URL dengan query invalid yang harus dinormalisasi.

## Hardening

`CoordinatorMonitoringPage` sekarang memasang listener `hashchange` untuk membaca ulang query URL ketika route monitoring tetap sama tetapi query berubah. Ini menutup celah saat browser Back/Forward atau shared URL mengubah hash tanpa full remount component React.

## QA Evidence

- Direct URL A:
  `#/kordinator/monitoring?stage=PROPOSAL_SEMINAR&q=Sisca&limit=2&sortBy=nim&sortDir=desc`
  menghasilkan search `Sisca`, page size `2`, chip `Seminar Proposal`, NIM sort `descending`, dan `Menampilkan 1 dari 1 mahasiswa`.
- Simulated refresh pada URL A mempertahankan state yang sama: search `Sisca`, page size `2`, chip `Seminar Proposal`, NIM sort `descending`.
- Direct URL B:
  `#/kordinator/monitoring?stage=PROPOSAL_GUIDANCE&q=Alif&limit=5`
  menghasilkan search `Alif`, page size `5`, chip `Bimbingan Proposal`, name sort `ascending`, dan `Menampilkan 1 dari 1 mahasiswa`.
- Browser Back dari URL B kembali ke URL A dan state UI ikut kembali ke search `Sisca`, page size `2`, chip `Seminar Proposal`, NIM sort `descending`.
- Browser Forward dari URL A kembali ke URL B dan state UI ikut kembali ke search `Alif`, page size `5`, chip `Bimbingan Proposal`, name sort `ascending`.
- Shared URL invalid:
  `#/kordinator/monitoring?stage=BAD_STAGE&q=&page=-2&limit=999&sortBy=bad&sortDir=bad`
  dinormalisasi menjadi `#/kordinator/monitoring`, search kosong, page size `10`, tanpa stage chip, dan name sort `ascending`.

## Acceptance Criteria

- Search input mengikuti `q` dari URL.
- Stage chip mengikuti `stage` dari URL dan hilang jika stage invalid atau dihapus.
- Page size mengikuti `limit` valid dan fallback ke `10` jika invalid.
- Sort header mengikuti `sortBy`/`sortDir`.
- Back/Forward antar URL monitoring mengubah state UI tanpa perlu reload manual.
- Shared URL invalid tidak crash dan dinormalisasi ke default.

## Next Task

Task 149: Coordinator Student Directory Saved View/Share Link UX Polish.

Prioritas: Low

Reason: deep link sudah stabil; tombol copy/share link bisa membantu operator koordinator membagikan view tertentu, tetapi bukan blocker production utama.
