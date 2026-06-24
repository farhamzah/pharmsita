# Coordinator Student Directory Clipboard Success QA

Tanggal: 2026-06-24
Task: 150
Prioritas: Low

## Tujuan

Memvalidasi jalur sukses clipboard untuk tombol `Salin link view` pada Coordinator Student Directory di browser normal/secure context, sekaligus mempertahankan evidence fallback dari sandbox browser.

## Browser Normal QA

Environment:

- Browser: Microsoft Edge `Edg/149.0.4022.80`
- URL: `http://localhost:5173/#/kordinator/monitoring?stage=PROPOSAL_SEMINAR&q=Sisca&limit=2&sortBy=nim&sortDir=desc`
- Secure context: `true`
- `navigator.clipboard`: tersedia
- `document.execCommand`: tersedia
- Auth test: localStorage koordinator QA pada profile Edge sementara `C:\tmp\pharmsita-edge-qa-150b`

Metode:

- Edge dijalankan dengan remote debugging port dan user profile sementara.
- App dibuka sebagai koordinator.
- Tombol `Salin link view` diklik lewat Chrome DevTools Protocol `Input.dispatchMouseEvent`, bukan `Runtime.evaluate(...click())`, agar user activation mendekati klik nyata.
- Clipboard dibaca ulang lewat DevTools Protocol setelah permission clipboard diberikan untuk `http://localhost:5173`.

## Evidence

Sebelum klik:

- Tombol: `Salin link view`
- Search: `Sisca`
- Page size: `2`
- Link aktif: `http://localhost:5173/#/kordinator/monitoring?stage=PROPOSAL_SEMINAR&q=Sisca&limit=2&sortBy=nim&sortDir=desc`

Setelah klik:

- Tombol berubah menjadi `Link tersalin`.
- `aria-live` membaca `Link view monitoring berhasil disalin.`
- Hash route tetap:
  `#/kordinator/monitoring?stage=PROPOSAL_SEMINAR&q=Sisca&limit=2&sortBy=nim&sortDir=desc`
- Clipboard berisi:
  `http://localhost:5173/#/kordinator/monitoring?stage=PROPOSAL_SEMINAR&q=Sisca&limit=2&sortBy=nim&sortDir=desc`
- Clipboard exception: `null`

## Fallback Evidence

Sandbox in-app browser tidak menyediakan `navigator.clipboard` maupun `document.execCommand`. Pada environment tersebut tombol menampilkan `Gagal salin` dan `aria-live` membaca `Link view monitoring gagal disalin.` Ini membuktikan failure feedback tetap jelas saat browser membatasi clipboard.

## Catatan Teknis

Percobaan awal memakai `Runtime.evaluate(...button.click())` di Edge normal tetap masuk failure state karena DevTools runtime click tidak membawa user activation penuh untuk operasi clipboard asynchronous. QA final memakai mouse event CDP asli dan berhasil.

## Kesimpulan

Jalur sukses clipboard dan fallback error sudah tervalidasi. Fitur share link siap dipakai untuk localhost secure context dan seharusnya lebih stabil di HTTPS production.

## Next Task

Task 151: Coordinator Student Directory Share Link Production HTTPS Smoke Checklist.

Prioritas: Low

Reason: local secure-context clipboard sudah terbukti. Checklist HTTPS production hanya diperlukan saat domain production aktif untuk memastikan permission browser dan reverse proxy tidak mengubah URL canonical.
