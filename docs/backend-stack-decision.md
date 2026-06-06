# Backend Stack Decision

Status: accepted for MVP scaffold.

Tanggal: 2026-06-06

## Keputusan

Backend awal PharmSITA memakai Node.js + TypeScript dengan HTTP native Node untuk scaffold MVP.

Folder backend dibuat terpisah di `backend/` agar frontend Vite tetap bersih dan backend bisa berkembang mandiri.

## Alasan

1. Frontend sudah memakai TypeScript, sehingga contract, DTO, dan service boundary lebih mudah diselaraskan.
2. Scaffold bisa dibuild tanpa dependency backend baru, cocok untuk tahap awal dan lingkungan offline/restricted.
3. Struktur route, controller, repository, dan response sudah cukup jelas untuk migrasi bertahap ke database production.
4. Jika kebutuhan backend membesar, struktur ini bisa dinaikkan ke Fastify atau NestJS tanpa mengubah contract frontend.

## Non-goal MVP

1. Belum ada database production aktif penuh; PostgreSQL schema, connection boundary, dan Auth/RBAC repository sudah tersedia.
2. Access token masih HMAC scaffold, belum JWT standard production.
3. Password hashing sudah ada untuk scaffold, tetapi belum ada password reset/email flow production.
4. Belum ada file storage production.
5. RBAC guard dasar sudah ada, tetapi policy workflow penuh belum selesai.

## Target Berikutnya

1. Revisi auth model untuk multi-role dan first login sesuai alignment A-I.
2. Tambahkan runtime QA harness untuk Auth/RBAC PostgreSQL setelah schema auth final.
3. Implement PostgreSQL repository untuk master data dan student workflow.
3. Perluas validasi payload ke reporting, file, dan notification route.
4. Perluas audit log ke workflow lintas role dan event otomatis.
5. Tambahkan test API untuk route critical.

## Local Run

Build backend:

```bash
npm.cmd run backend:build
```

Start backend setelah build:

```bash
npm.cmd run backend:start
```

Base URL:

```text
http://localhost:4000/api/v1
```

Frontend HTTP mode:

```text
VITE_API_MODE=http
VITE_API_BASE_URL=http://localhost:4000/api/v1
```

CORS dev origin:

```text
CORS_ORIGIN=http://localhost:5173,http://127.0.0.1:5173
```

Runbook detail:

```text
docs/http-mode-runbook.md
```

PostgreSQL adapter planning:

```text
docs/postgresql-adapter-plan.md
```

Business workflow alignment:

```text
docs/business-workflow-alignment-a-i.md
```
