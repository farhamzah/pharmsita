# PharmSITA Frontend

PharmSITA adalah aplikasi web frontend untuk alur pendaftaran dan monitoring tugas akhir mahasiswa. Aplikasi ini dibangun dengan React, TypeScript, Vite, dan Tailwind CSS.

Status saat ini: frontend prototype dengan backend API scaffold awal. Backend HTTP mode sudah punya password hashing, signed access token, refresh token store, RBAC guard workflow dasar, endpoint dosen/koordinator, request validation, dan audit log foundation. PostgreSQL adapter dan file storage production belum dibuat.

## Ringkasan Sistem

Aplikasi memakai routing berbasis hash, contoh `#/mahasiswa` dan `#/admin`. Data demo disediakan melalui mock data dan sebagian state disimpan di `localStorage`.

Role yang tersedia:

| Role | Route utama | Catatan |
|---|---|---|
| Mahasiswa | `#/mahasiswa` | Alur tugas akhir, pendaftaran, seminar, sidang, revisi, profil |
| Dosen | `#/dosen` | Bimbingan, jadwal, penilaian, revisi, monitoring, profil |
| Koordinator | `#/kordinator` | Validasi, pengajuan, tahapan akademik, penjadwalan, kuota pembimbing |
| Admin | `#/admin` | User management, master data, syarat, informasi, dokumen, pengaturan |

Catatan: route internal saat ini memakai ejaan `kordinator`. Login tetap menerima alias `koordinator` dan `coordinator`.

## Teknologi

| Teknologi | Keterangan |
|---|---|
| React 19 | Library UI utama |
| TypeScript 5.9 | Type checking |
| Vite 7 | Dev server dan build tool |
| Tailwind CSS 4 | Styling utility-first |
| Lucide React | Ikon UI |

## Cara Menjalankan

Install dependency:

```bash
npm install
```

Jalankan development server:

```bash
npm run dev
```

Buka aplikasi di:

```text
http://localhost:5173
```

Build production:

```bash
npm run build
```

Preview hasil build:

```bash
npm run preview
```

## Demo Login Frontend Mock Mode

Jika frontend berjalan dengan API mode default `mock`, autentikasi masih mock. Username harus sesuai daftar berikut, sedangkan password cukup diisi dengan teks non-kosong.

| Username | Role |
|---|---|
| `mahasiswa` atau `student` | Mahasiswa |
| `dosen` atau `lecturer` | Dosen |
| `admin` atau `administrator` | Admin |
| `kordinator`, `koordinator`, atau `coordinator` | Koordinator |

Username di luar daftar akan ditolak.

Untuk backend HTTP mode, username sama seperti tabel di atas dan password default seed adalah:

```text
demo
```

## Demo Mode

Secara default panel simulator, bypass, dan tombol reset demo disembunyikan. Untuk menampilkan fitur demo internal, jalankan app dengan environment variable:

```powershell
$env:VITE_DEMO_MODE="true"
npm run dev
```

Jika memakai terminal bash:

```bash
VITE_DEMO_MODE=true npm run dev
```

## API Mode

Aplikasi sekarang memiliki API client layer dengan dua mode:

| Mode | Keterangan |
|---|---|
| `mock` | Default saat ini. API facade memakai mock adapter dan data prototype. |
| `http` | Untuk backend nanti. API facade memakai `fetch` ke backend. |

Facade HTTP yang sudah tersedia:

| Facade | Scope |
|---|---|
| `authApi` | Login, session, logout |
| `adminApi` | User dan master data |
| `studentWorkflowApi`, `progressApi`, `guidanceApi`, `examApi`, `revisionApi` | Workflow mahasiswa `/students/me/*` |
| `lecturerWorkflowApi` | Mapping endpoint dosen `/lecturer/students/:studentId/*`; sudah dipakai UI dosen untuk guidance approval, exam assessment, dan revision review |
| `coordinatorWorkflowApi` | Mapping endpoint koordinator `/coordinator/students/:studentId/*`; sudah dipakai UI koordinator untuk progress, validasi persyaratan, keputusan pengajuan TA, dan status sidang |

Menjalankan dengan backend HTTP:

```powershell
$env:VITE_API_MODE="http"
$env:VITE_API_BASE_URL="http://localhost:4000/api/v1"
npm run dev
```

Jika environment variable tidak diisi, aplikasi tetap memakai mock mode.

Runbook lengkap HTTP mode, termasuk CORS dan QA port khusus, tersedia di [docs/http-mode-runbook.md](docs/http-mode-runbook.md).

## Data dan Backend

Backend scaffold awal tersedia di folder `backend/`. Backend ini memakai Node.js + TypeScript dengan native HTTP server. Auth + Master Data sudah memakai persistent JSON database adapter untuk memvalidasi contract awal tanpa dependency database driver.

Menjalankan backend:

```bash
npm run backend:build
npm run backend:start
```

Health check:

```text
http://localhost:4000/api/v1/health
```

Backend membaca `CORS_ORIGIN` sebagai daftar origin yang dipisah koma. Default dev menerima `http://localhost:5173` dan `http://127.0.0.1:5173`.

Kondisi backend saat ini:

| Area | Kondisi saat ini |
|---|---|
| Auth | Password hash, signed access token, hashed refresh token, RBAC guard dasar |
| Database | Persistent JSON file untuk Auth, Master Data, dan Student Workflow |
| API | Scaffold route awal `/api/v1` |
| Validation | Runtime validation untuk Auth, Admin/Master, dan Student Workflow payload |
| Audit log | Persistent audit foundation untuk Auth, Admin/Master, dan Student Workflow aksi |
| File upload | Simulasi/frontend only |
| Role permission | Guard aktif untuk Auth/Admin/Master, Student Workflow, dan endpoint Dosen/Koordinator |
| Password | Tidak ditampilkan di UI dan backend HTTP mode sudah memakai hash |

Beberapa area frontend non-workflow masih memakai mock/localStorage. Untuk production, data ini perlu dipindahkan ke backend dengan autentikasi, otorisasi role, audit trail, dan database.

Draft kontrak backend awal tersedia di [docs/backend-contract-draft.md](docs/backend-contract-draft.md).

Schema database Auth + Master Data tersedia di [001_auth_master_data.sql](backend/database/migrations/001_auth_master_data.sql).

Planning boundary migrasi PostgreSQL tersedia di [docs/postgresql-adapter-plan.md](docs/postgresql-adapter-plan.md).

## Struktur Folder

```text
src/
  components/          Komponen UI bersama
  core/services/       Service inti seperti auth mock
  features/
    admin/             Fitur admin
    auth/              Login dan autentikasi mock
    coordinator/       Fitur koordinator
    lecturer/          Fitur dosen
    student/           Fitur mahasiswa
    thesis-form/       Form pendaftaran tugas akhir
  layouts/             Layout per role
  lib/                 Helper umum
  mock-data/           Data prototype
  router/              Router hash-based dan daftar route
  types/               Type global
```

## Route Utama

| Route | Modul |
|---|---|
| `#/login` | Login |
| `#/mahasiswa` | Dashboard mahasiswa |
| `#/mahasiswa/pendaftaran/tugas-akhir` | Pendaftaran tugas akhir |
| `#/mahasiswa/seminar-proposal` | Seminar proposal |
| `#/mahasiswa/sidang-akhir` | Sidang akhir |
| `#/mahasiswa/revisi-finalisasi` | Revisi dan finalisasi |
| `#/dosen` | Dashboard dosen |
| `#/dosen/mahasiswa-bimbingan` | Mahasiswa bimbingan |
| `#/dosen/jadwal-penilaian` | Jadwal dan penilaian |
| `#/kordinator` | Dashboard koordinator |
| `#/kordinator/validasi-persyaratan` | Validasi persyaratan |
| `#/kordinator/pengajuan` | Pengajuan |
| `#/kordinator/monitoring` | Monitoring koordinator |
| `#/admin` | Dashboard admin |
| `#/admin/user-management` | Manajemen user |
| `#/admin/master-data` | Master data |
| `#/admin/settings` | Pengaturan |

## Quality Check Saat Ini

Build terakhir berhasil dengan:

```bash
npm run build
```

Catatan build: Vite memberi warning ukuran chunk di atas 500 kB. Ini belum error, tetapi nanti perlu dipantau saat aplikasi makin besar.

## Prioritas Pengembangan Berikutnya

1. Backend contract dan service boundary untuk mengganti mock/localStorage secara bertahap.
2. PostgreSQL adapter, workflow repository, dan hardening auth production.
3. API untuk mahasiswa, dosen, koordinator, admin, dokumen, jadwal, dan penilaian.
4. File upload dan document management yang tersimpan di backend.
5. Audit trail untuk aksi penting seperti validasi, approval, revisi, dan perubahan akun.
