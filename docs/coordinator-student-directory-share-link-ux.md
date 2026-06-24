# Coordinator Student Directory Share Link UX Polish

Tanggal: 2026-06-24
Task: 149
Prioritas: Low

## Tujuan

Memudahkan koordinator menyalin link view monitoring mahasiswa yang sedang aktif, termasuk filter tahapan, search, page size, pagination, dan sorting yang sudah tersimpan di URL hash.

## Implementasi

- Menambahkan tombol `Salin link view` di toolbar `CoordinatorMonitoringPage`.
- Link yang disalin memakai format canonical frontend:
  `origin + pathname + hash`.
- Query sementara sebelum hash tidak ikut disalin, sehingga link QA/dev seperti `?qa=...#/kordinator/monitoring?...` tetap dibagikan sebagai `#/kordinator/monitoring?...`.
- Tombol memberi feedback inline:
  - `Link tersalin` saat clipboard berhasil.
  - `Gagal salin` saat clipboard/browser menolak akses.
- Feedback juga tersedia melalui `aria-live` untuk screen reader.
- Fallback copy menggunakan hidden textarea jika `navigator.clipboard.writeText` tidak tersedia.

## QA Evidence

- Browser QA pada `http://localhost:5173/?qa=149copy2#/kordinator/monitoring?stage=PROPOSAL_SEMINAR&q=Sisca&limit=2&sortBy=nim&sortDir=desc`.
- Tombol `Salin link view` muncul di toolbar monitoring bersama chip `Seminar Proposal`.
- Canonical share URL yang dibentuk:
  `http://localhost:5173/#/kordinator/monitoring?stage=PROPOSAL_SEMINAR&q=Sisca&limit=2&sortBy=nim&sortDir=desc`.
- Query sementara sebelum hash (`?qa=149copy2`) tidak ikut masuk canonical share URL.
- Environment browser QA tidak menyediakan `navigator.clipboard` dan `document.execCommand`; tombol menampilkan `Gagal salin` dan `aria-live` membaca `Link view monitoring gagal disalin.`
- URL state monitoring tetap utuh setelah klik copy: `#/kordinator/monitoring?stage=PROPOSAL_SEMINAR&q=Sisca&limit=2&sortBy=nim&sortDir=desc`.

## Risiko

Risiko rendah. Perubahan hanya menambah affordance copy link di UI monitoring dan tidak mengubah kontrak backend atau query API.

## Next Task

Task 150: Coordinator Student Directory Share Link Browser QA dan Clipboard Fallback Evidence.

Prioritas: Low

Reason: fitur share link sudah kecil dan non-blocking, tetapi clipboard behavior bisa berbeda antar browser/domain. QA fallback akan memastikan UX tetap jelas saat clipboard ditolak.
