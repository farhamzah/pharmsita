# Post-Push Baseline Planning untuk Lanjutan Development

Tanggal: 2026-06-27
Task: 178
Prioritas: Medium
Status: BASELINE PLANNED

## Current Baseline

Git baseline:

- Branch: `main`
- Remote: `origin/main`
- Latest commit: `bc165c6 Align canonical workflow and production readiness`
- Working tree: clean

Build baseline:

- Frontend build: PASS
- Backend build: PASS
- Tool syntax check: PASS
- Release package dry run: PASS
- Known warning: frontend JS chunk lebih dari 500 kB

Production baseline:

- Production evidence chain sudah disiapkan.
- Production final sign-off belum bisa diberikan.
- Blocker utama: belum ada attachment/evidence production aktual dari domain HTTPS asli.
- PharmSITA tetap standalone dan tidak dikaitkan dengan Core/Farmasi UBP workspace.

## Development Tracks

### Track A: Production Evidence dan VPS

Prioritas: High/Extra High

Tujuan:

- Melanjutkan dari Task 173.
- Menerima evidence production aktual.
- Menjalankan final sign-off jika attachment lengkap.
- Membuat remediation spesifik jika evidence blocked.

Kapan dipilih:

- Jika domain/API/session production sudah siap.
- Jika operator bisa menyediakan `PRODUCTION-SIGNOFF.md`, packet JSON, checksum, dan evidence folder.

Next task:

- Task 179: Production Evidence Attachment Intake dan Sign-Off Verification

### Track B: Frontend Performance Optimization

Prioritas: Medium

Tujuan:

- Mengurangi warning Vite chunk > 500 kB.
- Memecah route/page berat dengan dynamic import.
- Menjaga build tetap stabil sebelum production.

Kapan dipilih:

- Jika production evidence belum siap, tetapi kita ingin mengurangi risiko performa frontend.

Next task:

- Task 179B: Frontend Route Code-Splitting dan Bundle Size Optimization

### Track C: Local Regression QA

Prioritas: High

Tujuan:

- Menjalankan ulang QA lokal setelah push.
- Memastikan canonical workflow, coordinator reporting, dan PostgreSQL paths tetap aman.

Kapan dipilih:

- Jika ingin baseline local quality lebih kuat sebelum production/VPS.
- Jika database lokal tersedia dan siap dipakai.

Next task:

- Task 179C: Local Regression QA Matrix untuk Canonical Workflow dan Coordinator Reporting

### Track D: Product Feature Continuation

Prioritas: Medium/High

Tujuan:

- Melanjutkan fitur aplikasi dari backlog bisnis.
- Fokus ke area yang belum lengkap secara product, bukan deployment.

Kapan dipilih:

- Jika production deployment ditunda.
- Jika ingin memperkuat UX/fitur mahasiswa, dosen, koordinator, atau admin.

Next task:

- Task 179D: Backlog Product Gap Review Setelah Canonical Alignment

## Recommendation

Rekomendasi utama:

Task 179: Production Evidence Attachment Intake dan Sign-Off Verification

Prioritas: High

Reason:

- Push baseline sudah selesai dan repo bersih.
- Production chain adalah blocker paling besar menuju release nyata.
- Jika evidence belum tersedia, task ini akan cepat mengonfirmasi blocker dan kita bisa pindah ke Track B atau C.

Fallback jika evidence production belum siap:

Task 179B: Frontend Route Code-Splitting dan Bundle Size Optimization

Prioritas: Medium

Reason:

- Ada warning build yang nyata.
- Bisa dikerjakan lokal tanpa domain production.
- Mengurangi risiko performa sebelum deployment.

## Task Berikutnya

Task 179: Production Evidence Attachment Intake dan Sign-Off Verification

Prioritas: High

Reason:

- Ini jalur paling langsung untuk menutup blocker production setelah push.
- Jika attachment belum ada, status akan tetap blocked dan kita lanjut ke optimasi/performance atau local regression QA.

## Task 179 Intake Record

Task 179 sudah dicatat di `docs/production-evidence-attachment-intake-signoff-verification.md`.

Status Task 179: `BLOCKED - NO PRODUCTION ATTACHMENT RECEIVED`

Catatan:

- Attachment production aktual belum diterima.
- Sign-off verification tidak dijalankan.
- Jalur paling produktif sambil menunggu evidence adalah optimasi bundle frontend atau local regression QA.
