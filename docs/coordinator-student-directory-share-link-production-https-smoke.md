# Coordinator Student Directory Share Link Production HTTPS Smoke Checklist

Tanggal: 2026-06-24
Task: 151
Prioritas: Low

## Tujuan

Checklist ini dipakai saat PharmSITA sudah berjalan di domain HTTPS production untuk memastikan tombol `Salin link view` pada Coordinator Student Directory tetap menghasilkan canonical URL yang benar dan clipboard browser mengizinkan copy.

## Prasyarat

- Domain production aktif, contoh: `https://pharmsita.example.ac.id`.
- HTTPS valid tanpa mixed-content warning.
- User koordinator bisa login normal.
- Endpoint frontend dan backend production sehat.
- Browser yang diuji minimal satu Chromium browser normal, seperti Edge atau Chrome.

## Test URL

Gunakan salah satu view monitoring dengan state lengkap:

```text
https://<domain-production>/#/kordinator/monitoring?stage=PROPOSAL_SEMINAR&q=Sisca&limit=2&sortBy=nim&sortDir=desc
```

Jika data production tidak punya mahasiswa `Sisca`, ganti `q` dengan nama/NIM mahasiswa nyata, tetapi pertahankan struktur query `stage`, `limit`, `sortBy`, dan `sortDir`.

## Checklist Operator

1. Buka domain production via HTTPS.
2. Login sebagai koordinator.
3. Buka URL monitoring dengan state lengkap.
4. Pastikan browser menunjukkan secure context:
   - address bar memakai `https://`;
   - tidak ada certificate warning;
   - tidak ada mixed-content warning.
5. Pastikan UI memulihkan state dari URL:
   - search input sesuai `q`;
   - page size sesuai `limit`;
   - chip tahapan sesuai `stage`;
   - header sort sesuai `sortBy` dan `sortDir`.
6. Klik tombol `Salin link view`.
7. Pastikan tombol berubah menjadi `Link tersalin`.
8. Paste clipboard ke tempat aman, misalnya tab editor kosong.
9. Pastikan clipboard berisi canonical URL production:
   - origin harus domain production HTTPS;
   - tidak membawa query sementara sebelum hash;
   - hash route dan query monitoring tetap utuh.
10. Buka hasil paste di tab browser baru.
11. Pastikan tab baru membuka view monitoring yang sama.
12. Klik Back/Forward browser antara dua view monitoring berbeda untuk memastikan state tetap sinkron.

## Expected Evidence

Catat hasil berikut dalam production sign-off:

```text
Domain:
Browser:
User role:
Input URL:
Button feedback:
Clipboard result:
Reopened shared link result:
Back/Forward result:
Decision: GO / NO-GO
Operator:
Timestamp:
```

## GO Criteria

- HTTPS valid.
- Tombol `Salin link view` tampil.
- Klik tombol menampilkan `Link tersalin`.
- Clipboard berisi URL dengan domain production HTTPS.
- Shared URL yang dibuka ulang memulihkan state filter/search/page size/sorting.
- Browser Back/Forward tidak membuat state monitoring tertukar.

## NO-GO Criteria

- Clipboard kosong atau berbeda dari canonical URL.
- Clipboard memakai `http://`, localhost, IP internal, atau query sementara sebelum hash.
- Tombol selalu menampilkan `Gagal salin` pada browser normal HTTPS.
- Shared URL tidak bisa dibuka ulang oleh user koordinator yang sudah login.
- Reverse proxy mengubah path/hash sehingga route monitoring tidak terbuka.

## Troubleshooting

- Jika clipboard ditolak, cek permission browser untuk domain production dan ulangi dengan klik mouse user langsung.
- Jika canonical URL salah domain, cek konfigurasi reverse proxy dan apakah frontend diakses lewat domain final, bukan origin internal.
- Jika shared URL membuka login, itu normal untuk user belum login. Setelah login, user koordinator harus bisa membuka route monitoring.
- Jika hash hilang setelah reload, cek konfigurasi static hosting/Nginx agar `index.html` melayani SPA route.
- Jika mixed-content warning muncul, pastikan API base URL production juga HTTPS.

## Evidence Lokal Sebelumnya

Task 150 sudah membuktikan clipboard success di Microsoft Edge normal pada secure context localhost:

```text
http://localhost:5173/#/kordinator/monitoring?stage=PROPOSAL_SEMINAR&q=Sisca&limit=2&sortBy=nim&sortDir=desc
```

Clipboard success production tetap perlu dicek ulang karena domain, HTTPS certificate, reverse proxy, dan browser permission production bisa berbeda dari local QA.

## Next Task

Task 152: Coordinator Student Directory Production HTTPS Smoke Evidence Intake dan Sign-Off Update.

Prioritas: Low

Reason: checklist sudah siap; task berikutnya hanya diperlukan setelah operator menjalankan smoke test di domain production dan mengirim evidence aktual.
