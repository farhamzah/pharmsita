# Frontend Route Code-Splitting dan Bundle Size Optimization

Tanggal: 2026-06-27
Task: 180
Prioritas: Medium
Status: PASS

## Tujuan

Task ini mengurangi ukuran initial JavaScript bundle dengan memecah page-level routes menjadi lazy-loaded chunks. Fokusnya memperbaiki warning Vite `Some chunks are larger than 500 kB after minification` tanpa mengubah perilaku routing aplikasi.

## Perubahan

File yang diubah:

- `src/router/Router.tsx`
- `src/router/app-routes.ts`

Perubahan teknis:

- Router sekarang mendukung `React.lazy` route handlers.
- Route rendering dibungkus `Suspense` dengan fallback ringan `Memuat halaman...`.
- `login` tetap eager supaya halaman awal tetap cepat dan stabil.
- Page mahasiswa, dosen, koordinator, dan admin dipindahkan ke dynamic import.

## Build Result

Command:

```powershell
npm.cmd run build
```

Result: PASS

Sebelum optimization:

- Main JS bundle: sekitar `964.34 kB`
- Vite warning: chunk lebih besar dari 500 kB

Sesudah optimization:

- Main JS bundle: sekitar `323.65 kB`
- Vite warning chunk besar: hilang
- Route/page chunks dibuat terpisah untuk halaman mahasiswa, dosen, koordinator, dan admin.

## Impact

Positive impact:

- Initial load lebih ringan.
- Browser tidak perlu mengunduh semua page role sejak login.
- Halaman role besar seperti admin management, coordinator monitoring, dan workflow mahasiswa baru di-load saat route dibuka.

Trade-off:

- Saat membuka route pertama kali, ada tambahan request chunk.
- Suspense fallback akan muncul singkat jika chunk belum cached.

## QA Notes

Build TypeScript dan Vite sudah PASS. Production/browser smoke belum dijalankan dalam task ini karena fokusnya bundle optimization lokal.

Area yang sebaiknya diuji manual/browser berikutnya:

- Login page tetap tampil.
- Redirect role setelah login tetap masuk route yang benar.
- Deep link hash route seperti `#/kordinator/monitoring?...` tetap memuat halaman.
- Dynamic route `:id` tetap match seperti sebelum optimization.

## Task Berikutnya

Task 181: Browser QA untuk Lazy Route Loading, Login Redirect, dan Deep Link

Prioritas: High

Reason:

- Build sudah PASS, tetapi perubahan menyentuh router.
- Perlu browser QA untuk memastikan lazy chunk loading tidak merusak hash routing, role redirect, dan deep link.

## Task 181 Browser QA Record

Task 181 sudah dicatat di `docs/browser-qa-lazy-route-loading-login-deeplink.md`.

Status Task 181: `PASS`

Catatan:

- Login koordinator PASS.
- Lazy route loading PASS.
- Deep link monitoring PASS.
- Dynamic detail route PASS.
- Protected redirect ke login PASS.
- Tidak ada browser console error pada flow yang diuji.
