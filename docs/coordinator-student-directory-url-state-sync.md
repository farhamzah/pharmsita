# Coordinator Student Directory URL State Sync

Tanggal: 2026-06-24
Task: 147
Prioritas: Medium

## Tujuan

Monitoring mahasiswa koordinator sekarang menyimpan state tabel ke URL hash query agar view dapat di-refresh, dibagikan sebagai deep link, dan dibuka ulang tanpa kehilangan konteks.

## Scope

State yang disinkronkan:

- `stage`: filter tahapan lifecycle dari dashboard/reporting drilldown.
- `q`: pencarian nama atau NIM.
- `page`: halaman aktif.
- `limit`: jumlah baris per halaman.
- `sortBy`: field sorting `name`, `nim`, `stage`, atau `supervisor1`.
- `sortDir`: arah sorting `asc` atau `desc`.

## Implementasi

- `CoordinatorMonitoringPage` membaca initial state dari `window.location.hash` saat halaman dibuka.
- State tabel ditulis ulang ke URL memakai `window.history.replaceState` agar browser history tidak penuh setiap kali user mengetik search.
- Nilai invalid dinormalisasi ke default aman:
  - `page` minimal `1`.
  - `limit` hanya menerima `2`, `5`, `10`, atau `20`.
  - `sortBy` fallback ke `name`.
  - `sortDir` fallback ke `asc`.
  - `stage` hanya diterima jika sesuai stage lifecycle yang dikenal.
- Tombol chip stage menghapus filter stage dari state dan URL tanpa menghapus search, page size, atau sorting aktif.

## QA Checklist

- Direct URL dengan `stage`, `q`, `limit`, `sortBy`, dan `sortDir` memulihkan state UI. Evidence: `#/kordinator/monitoring?stage=PROPOSAL_SEMINAR&q=Sisca&limit=2&sortBy=nim&sortDir=desc` memunculkan search `Sisca`, page size `2`, chip `Seminar Proposal`, NIM `descending`, dan `Menampilkan 1 dari 1 mahasiswa`.
- Perubahan search mengubah `q` dan reset page ke `1`. Evidence: input `Sis` menghasilkan `q=Sis`.
- Perubahan page size mengubah `limit` dan reset page ke `1`. Evidence: select `5` menghasilkan `limit=5`.
- Klik sortable header mengubah `sortBy`/`sortDir` di URL. Evidence: klik NIM dari desc ke asc menghapus `sortDir=desc` dan tetap menyimpan `sortBy=nim`.
- Hapus chip stage menghapus `stage` dari URL. Evidence: URL menjadi `#/kordinator/monitoring?q=Sis&limit=5&sortBy=nim`.
- Query invalid kembali ke default tanpa crash. Evidence: `stage=BAD_STAGE&page=-9&limit=999&sortBy=bad&sortDir=bad` dinormalisasi menjadi `#/kordinator/monitoring`, page size `10`, dan sorting nama ascending.

## Risiko

Risiko rendah-menengah. Perubahan berada di UI koordinator, tetapi menyentuh pengalaman deep link dan state table. Validasi manual browser tetap diperlukan setelah build karena perilaku hash route bergantung pada render router.

## Next Task

Task 148: Coordinator Student Directory Deep Link QA untuk Direct URL dan Invalid Query Normalization.

Prioritas: Medium

Reason: setelah URL state sync masuk, langkah sehat berikutnya adalah memastikan direct link dan query invalid stabil lewat QA browser yang lebih eksplisit sebelum fitur ini dianggap production-ready.
