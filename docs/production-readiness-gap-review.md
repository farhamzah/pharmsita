# Production Readiness Gap Review Setelah Profile QA Gate

Tanggal review: 2026-06-09  
Baseline terakhir: `bc8a9da` (`Stabilize role profile QA gate`)  
Scope: PharmSITA standalone. Tidak mengaitkan Core/Farmasi UBP workspace.

## Ringkasan Keputusan

Status saat ini: **NO-GO untuk open production traffic penuh**.

Alasannya bukan karena aplikasi belum punya pondasi produksi, tetapi karena bukti operasional produksi belum lengkap. Setelah profile QA gate, PharmSITA sudah layak masuk fase staging/cutover rehearsal, namun belum layak diumumkan sebagai production-ready sampai evidence VPS, database backup/restore, secrets, bootstrap admin, dan smoke test domain asli selesai.

## Yang Sudah Siap

1. Git baseline sudah bersih dan sudah dipush.
2. Frontend production build sudah lolos pada baseline Task 123.
3. Role profile smoke test sudah tersedia dan lolos untuk Mahasiswa, Dosen, Koordinator, dan Admin.
4. Release bundle dry run sudah membuktikan tool QA profile ikut masuk artifact.
5. PostgreSQL migration runner, production bootstrap CLI, health/readiness endpoint, production smoke script, request logging, deployment template, release packaging, backup/restore drill, dan production evidence runbook sudah tersedia.
6. Production guard sudah ada untuk mencegah konfigurasi berbahaya seperti demo mode, placeholder secret, CORS tidak aman, dan adapter database non-PostgreSQL.
7. Nginx, systemd, dan logrotate template sudah tersedia di `deploy/vps`.

## Gap Produksi

### Extra High

1. **Real VPS/domain evidence belum final.**  
   Production belum boleh GO sebelum health, readiness, systemd, nginx, HTTPS, domain asli, dan smoke test dibuktikan dari VPS tanpa skip flag.

2. **Backup, restore drill, dan migration safety gate belum terbukti di target production database.**  
   Sebelum migrasi production, harus ada backup manifest, checksum verification, restore drill ke database terpisah, lalu migration gate PASS.

3. **Production secrets dan environment final belum diverifikasi di VPS.**  
   `AUTH_SECRET`, `DATABASE_URL`, `CORS_ORIGIN`, `NODE_ENV=production`, `DB_ADAPTER=postgres`, dan demo flags harus final dan lolos startup guard.

### High

4. **Bootstrap admin dan first-login production belum punya evidence final.**  
   Admin awal harus dibuat dengan password sementara, login, wajib ganti password/profile completion, lalu akses admin diverifikasi.

5. **File storage production belum final.**  
   Jika MVP hanya menyimpan link dokumen, ini bisa diterima dengan catatan operasional. Jika wajib upload file asli, ini menjadi blocker produksi.

6. **Email invitation/reset password belum production-grade.**  
   Saat ini alur password awal/reset masih bergantung pada admin/manual flow. Ini bisa diterima untuk limited launch, tetapi harus tertulis sebagai SOP dan risk acceptance.

7. **Observability produksi belum dibuktikan live.**  
   Request ID, error correlation, journal/systemd log, logrotate, dan cara membaca incident evidence harus diuji di VPS.

8. **Business workflow E2E selain profile perlu evidence terbaru.**  
   Profile gate sudah kuat, tetapi alur pendaftaran TA, bimbingan, sidang, revisi, completion gate, dan audit export masih perlu staging/live smoke evidence sebelum full rollout.

### Medium

9. **Token auth masih HMAC scaffold internal, belum JWT/OIDC standard.**  
   Bisa diterima untuk standalone MVP terbatas jika secret kuat dan HTTPS wajib, tetapi perlu security sign-off.

10. **Role profile smoke test menulis data QA.**  
    Untuk production, harus diputuskan apakah akun `qa119-*` boleh dibuat di database production. Jika tidak, test ini hanya boleh dijalankan di staging/smoke database.

11. **Rollback migration masih manual.**  
    Backup/restore drill mengurangi risiko, tetapi belum ada automatic rollback migration. Operator harus memahami prosedur restore.

12. **Release artifact retention belum dipilih.**  
    Artifact dry run sudah bisa dibuat, tetapi perlu kebijakan release ID, lokasi penyimpanan, retention, dan cleanup.

## Production Go/No-Go Gate

Production dapat berubah dari NO-GO ke GO hanya jika semua item berikut selesai:

1. Production environment VPS final dan lolos `backend:check-production-env`.
2. Database production backup dibuat, diverifikasi, dan restore drill PASS.
3. Migration gate PASS, lalu migration production berhasil.
4. Backend berjalan via systemd dengan nginx HTTPS domain asli.
5. `/health`, `/ready`, dan diagnostics endpoint menunjukkan status sesuai.
6. No-demo smoke test PASS terhadap domain/API production.
7. Admin bootstrap/first login/profile completion PASS.
8. Role/profile QA strategy disetujui: staging-only atau production QA accounts.
9. Workflow utama minimal smoke PASS sesuai scope launch.
10. Evidence packet lengkap dan ditandatangani GO.

## Rekomendasi Jalur Berikutnya

### Task 125: Production Evidence Matrix dan Operator Checklist Packet

Prioritas: **Extra High**

Reason: sebelum eksekusi production live, kita perlu satu matriks bukti yang tegas: command apa yang dijalankan, output apa yang wajib dikumpulkan, siapa operatornya, apa status GO/NO-GO, dan blocker mana yang harus diremediasi. Ini mengurangi risiko kebingungan saat cutover VPS dan membuat sign-off tidak berdasarkan asumsi.

Output yang diharapkan:

1. Dokumen evidence matrix production.
2. Checklist operator VPS per tahap.
3. Format GO/NO-GO report.
4. Mapping evidence ke gap Task 124.
5. Daftar command yang boleh dijalankan di VPS dan output yang harus ditempel balik untuk review.

Deliverable Task 125 tersedia di `docs/production-evidence-matrix.md`.

## Catatan Batasan

Review ini tidak mengubah arah arsitektur menjadi terhubung ke Core/Farmasi UBP. PharmSITA tetap berdiri sendiri. Integrasi lintas sistem baru dibahas nanti jika memang ada keputusan produk dan infrastruktur yang jelas.
