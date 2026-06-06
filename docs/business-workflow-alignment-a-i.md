# Business Workflow Alignment A-I

Status: alignment contract draft. Flow A auth alignment implemented in Task 34-35. Flow B-C contract/schema drafted in Task 36 and JSON runtime implemented in Task 37.

Tanggal: 2026-06-06

Sumber: Lampiran alur A sampai I dari user.

## Tujuan

Dokumen ini menyelaraskan kontrak backend PharmSITA dengan alur bisnis:

1. Login.
2. Pengajuan Pendaftaran Tugas Akhir.
3. Validasi Pendaftaran Tugas Akhir.
4. Pengajuan Bimbingan.
5. Validasi Pengajuan Bimbingan.
6. Pengajuan Materi Bimbingan.
7. Validasi Materi Bimbingan.
8. Pengajuan Seminar Proposal.
9. Validasi Seminar Proposal.

Kontrak ini menjadi pagar sebelum perubahan schema PostgreSQL dan repository workflow berikutnya.

## Ringkasan Alignment

| Area | Existing scaffold | Lampiran A-I | Keputusan alignment |
|---|---|---|---|
| Login role | `users.role` single role | User bisa punya lebih dari satu role | Pisahkan identity user dan role assignment |
| First login | `passwordStatus`, `forceChangeOnLogin` | Wajib isi biodata dan ubah password | Tambah flow first login eksplisit |
| Pendaftaran TA | `thesis_submissions` | Form pendaftaran TA lengkap plus berkas dan bukti kuitansi | Jadikan final project registration sebagai aggregate utama |
| Status pendaftaran | `Sedang Proses Validasi`, `Diterima`, `Ditolak` | `Menunggu Validasi Koordinator`, `Disetujui`, `Ditolak` | Pakai status bisnis dari lampiran |
| Dosen pembimbing | Snapshot nama di submission | Koordinator menetapkan pembimbing 1 dan 2 | Tambah assignment pembimbing setelah approval |
| Pengajuan bimbingan | Dua stage guidance | Empat jenis bimbingan | Perlu guidance type lebih luas |
| Validasi bimbingan | `idle/requested/approved` | `Menunggu Validasi Dosen`, `Disetujui`, `Ditolak` | Tambah status rejected dan validation note |
| Materi bimbingan | Session/chats | Materi/topik diajukan lalu divalidasi | Tambah entity `guidance_materials` |
| Seminar proposal | `exams.sidang-proposal` | Pengajuan layak seminar proposal sebelum seminar | Pisahkan submission kelayakan dari exam scheduling |

## A. Login

### Target Flow

1. User login dengan username dan password.
2. Backend memvalidasi credential.
3. Backend membaca role aktif milik user.
4. Jika user punya lebih dari satu role, backend mengembalikan daftar role yang dapat dipilih.
5. User memilih role aktif untuk session.
6. Backend memeriksa status first login untuk identity user.
7. Jika first login belum selesai, user wajib mengisi biodata dan mengganti password.
8. Setelah first login selesai, backend membuat session role yang dipilih.

### Contract Decision

`users` menjadi identity account, bukan sumber tunggal role.

Tabel target:

```text
users
user_roles
role_permissions
student_profiles
lecturer_profiles
coordinator_profiles
admin_profiles
```

Kolom tambahan target pada `users`:

```text
first_login_completed_at
first_login_completed_by
password_changed_at
```

Tabel baru target:

```text
user_roles (
  user_id,
  role,
  status,
  created_at,
  created_by,
  primary key (user_id, role)
)
```

### Auth API Target

Credential login:

```text
POST /auth/login
```

Jika hanya satu role dan first login selesai:

```json
{
  "accessToken": "...",
  "refreshToken": "...",
  "expiresAt": "2026-06-06T11:15:00Z",
  "user": {},
  "activeRole": "mahasiswa",
  "availableRoles": ["mahasiswa"],
  "requiresRoleSelection": false,
  "requiresFirstLogin": false
}
```

Jika role lebih dari satu:

```json
{
  "loginChallengeId": "challenge_01",
  "availableRoles": ["dosen", "koordinator"],
  "requiresRoleSelection": true,
  "requiresFirstLogin": false
}
```

Role selection:

```text
POST /auth/select-role
```

First login completion:

```text
POST /auth/first-login
```

Request minimum:

```json
{
  "loginChallengeId": "challenge_01",
  "role": "mahasiswa",
  "newPassword": "new-secret",
  "profile": {
    "phone": "08123456789",
    "address": "Tangerang Selatan"
  }
}
```

### Impact

Existing `users.role` masih boleh dipertahankan sementara untuk backward compatibility, tetapi source of truth production harus pindah ke `user_roles`.

### Implementation Status Task 34

Task 34 sudah menambahkan:

1. `user_roles` di JSON state dan PostgreSQL migration.
2. Login challenge untuk multi-role dan first-login.
3. `POST /auth/select-role`.
4. `POST /auth/first-login`.
5. Refresh token yang mempertahankan role session.
6. Smoke test otomatis `npm.cmd run api:smoke:auth-alignment`.

### Implementation Status Task 35

Task 35 sudah menambahkan UI login untuk:

1. Response challenge multi-role.
2. Pilihan role sebelum session dibuat.
3. Aktivasi password pertama lewat `POST /auth/first-login`.
4. Mock mode untuk akun `multi` dan `firstlogin`.

Gap tersisa: biodata first-login belum dipersist karena contract profile update belum dibuat.

## B-C. Pendaftaran dan Validasi Tugas Akhir

### Target Flow

Mahasiswa mengisi pendaftaran Tugas Akhir dengan:

1. Link Google Drive persyaratan.
2. Bukti kuitansi pembayaran Tugas Akhir.
3. Skema Tugas Akhir.
4. Jenis Tugas Akhir.
5. Judul Tugas Akhir.
6. Deskripsi judul.
7. Rekomendasi dosen pembimbing pertama.

Setelah submit, status menjadi:

```text
Menunggu Validasi Koordinator
```

Koordinator memvalidasi dokumen, pembayaran, skema, jenis TA, dan kelayakan judul.

Jika disetujui:

1. Koordinator menetapkan pembimbing 1.
2. Koordinator menetapkan pembimbing 2.
3. Status menjadi `Disetujui`.
4. Assignment pembimbing tersimpan.
5. Progress `pendaftaran-ta` bisa menjadi `completed`.

Jika ditolak:

1. Koordinator wajib memberi catatan.
2. Status menjadi `Ditolak`.

### Contract Decision

`thesis_submissions` saat ini terlalu sempit jika dipakai sebagai seluruh pendaftaran TA.

Target aggregate:

```text
final_project_registrations
```

Status target:

```text
Draft
Menunggu Validasi Koordinator
Disetujui
Ditolak
```

Tabel pendukung:

```text
final_project_registration_requirements
supervisor_assignments
```

`thesis_submissions` bisa:

1. Direname secara konseptual menjadi `final_project_registrations`, atau
2. Dipertahankan sebagai compatibility layer sampai migration berikutnya.

### API Target

Mahasiswa:

```text
GET  /students/me/final-project-registration
POST /students/me/final-project-registration
```

Koordinator:

```text
GET   /coordinator/final-project-registrations
GET   /coordinator/final-project-registrations/:registrationId
PATCH /coordinator/final-project-registrations/:registrationId/validation
```

Validation request:

```json
{
  "status": "Disetujui",
  "pembimbing1Id": "uuid",
  "pembimbing2Id": "uuid",
  "catatanKoordinator": "Disetujui."
}
```

Rejected request:

```json
{
  "status": "Ditolak",
  "catatanKoordinator": "Judul perlu diperbaiki."
}
```

### Implementation Status Task 36

Task 36 sudah menambahkan:

1. Contract detail `docs/final-project-registration-contract.md`.
2. PostgreSQL migration `004_final_project_registration.sql`.
3. Tabel `final_project_registrations`.
4. Tabel `final_project_registration_requirements`.
5. Tabel `supervisor_assignments`.
6. Permission key pendaftaran TA untuk mahasiswa, dosen, koordinator, dan admin.

Runtime endpoint dan repository belum dibuat; `thesis_submissions` masih compatibility layer.

### Implementation Status Task 37

Task 37 sudah menambahkan:

1. JSON `FinalProjectRegistrationRepository`.
2. Endpoint mahasiswa `GET/POST /students/me/final-project-registration`.
3. Endpoint koordinator `GET /coordinator/final-project-registrations`.
4. Endpoint koordinator `GET/PATCH /coordinator/final-project-registrations/:registrationId`.
5. Validasi payload submit dan validasi koordinator.
6. Audit log submit/validasi.
7. Auto-complete progress `pendaftaran-ta` saat disetujui.
8. Smoke test `npm.cmd run api:smoke:final-project`.

`thesis_submissions` masih compatibility layer sampai frontend facade dimigrasikan.

## D-E. Pengajuan dan Validasi Bimbingan

### Target Flow

Mahasiswa dapat mengajukan jenis bimbingan:

1. Bimbingan Seminar Proposal.
2. Bimbingan Sidang Akhir.
3. Bimbingan Revisi Seminar Proposal.
4. Bimbingan Revisi Sidang Akhir.

Mahasiswa mengirim link Google Docs dokumen skripsi.

Status setelah submit:

```text
Menunggu Validasi Dosen
```

Dosen memvalidasi dokumen.

Status hasil:

```text
Disetujui
Ditolak
```

### Contract Decision

`GuidanceStage` saat ini hanya:

```text
bimbingan-pra-proposal
bimbingan-pra-sidang
```

Target perlu `guidance_type` yang mencakup empat jenis dari lampiran:

```text
seminar-proposal
sidang-akhir
revisi-seminar-proposal
revisi-sidang-akhir
```

Status target:

```text
Draft
Menunggu Validasi Dosen
Disetujui
Ditolak
```

### API Target

Mahasiswa:

```text
GET  /students/me/guidance-requests
POST /students/me/guidance-requests
```

Dosen:

```text
GET   /lecturer/guidance-requests
PATCH /lecturer/guidance-requests/:guidanceRequestId/validation
```

Request mahasiswa:

```json
{
  "guidanceType": "seminar-proposal",
  "googleDocsLink": "https://docs.google.com/document/d/example"
}
```

Validation request dosen:

```json
{
  "status": "Disetujui",
  "catatanDosen": "Dokumen dapat digunakan untuk bimbingan."
}
```

## F-G. Materi Bimbingan dan Validasi

### Target Flow

Untuk bimbingan Seminar Proposal dan Sidang Akhir:

1. Mahasiswa menginput topik atau materi yang sudah dikerjakan.
2. Mahasiswa mengirim materi.
3. Dosen memeriksa progres pada Google Docs.
4. Jika sesuai, dosen memberi status `Valid`.
5. Jumlah materi valid dihitung sebagai progres bimbingan.
6. Jika tidak sesuai, dosen menolak materi.
7. Mahasiswa dapat mengajukan materi baru.

Untuk bimbingan revisi:

1. Materi revisi berasal dari catatan penguji.
2. Mahasiswa memilih materi revisi yang sudah diselesaikan.
3. Mahasiswa mengajukan validasi penyelesaian.
4. Dosen memberi status `Valid` atau `Ditolak`.
5. Jika ditolak, mahasiswa bisa mengajukan ulang setelah perbaikan.

### Contract Decision

Perlu entity baru:

```text
guidance_materials
```

Field minimum:

```text
id
guidance_workflow_id
material_type
source_revision_item_id
topic
content
status
submitted_at
validated_at
validated_by
lecturer_note
attempt_number
```

Status target:

```text
Draft
Diajukan
Valid
Ditolak
```

Untuk materi reguler yang ditolak, data tetap disimpan untuk audit, tetapi UI boleh menampilkan state sebagai dapat mengajukan materi baru.

Untuk materi revisi yang ditolak, data tetap tampil sebagai histori validasi revisi.

### API Target

Mahasiswa:

```text
GET  /students/me/guidance/:guidanceId/materials
POST /students/me/guidance/:guidanceId/materials
POST /students/me/guidance/:guidanceId/revision-materials/:revisionItemId/submission
```

Dosen:

```text
GET   /lecturer/guidance/:guidanceId/materials
PATCH /lecturer/guidance/:guidanceId/materials/:materialId/validation
```

Validation request:

```json
{
  "status": "Valid",
  "catatanDosen": "Materi sudah sesuai."
}
```

## H-I. Pengajuan dan Validasi Seminar Proposal

### Target Flow

Mahasiswa hanya bisa mengajukan Seminar Proposal jika jumlah materi bimbingan valid sudah memenuhi aturan.

Mahasiswa mengirim:

1. Link Google Drive persyaratan Seminar Proposal.
2. Dokumen bimbingan terakhir.

Status setelah submit:

```text
Menunggu Validasi Koordinator
```

Koordinator memeriksa:

1. Dokumen persyaratan Seminar Proposal.
2. Progres dokumen pada Google Docs.

Jika layak:

```text
Layak Seminar Proposal
```

Jika ditolak:

```text
Ditolak
```

### Contract Decision

`exams.stage_id = sidang-proposal` tidak boleh menjadi satu-satunya representasi pengajuan seminar proposal.

Perlu entity target:

```text
seminar_proposal_submissions
```

Entity ini adalah gate sebelum jadwal seminar proposal atau exam panel dibuat.

Status target:

```text
Draft
Menunggu Validasi Koordinator
Layak Seminar Proposal
Ditolak
```

### API Target

Mahasiswa:

```text
GET  /students/me/seminar-proposal-submission
POST /students/me/seminar-proposal-submission
```

Koordinator:

```text
GET   /coordinator/seminar-proposal-submissions
GET   /coordinator/seminar-proposal-submissions/:submissionId
PATCH /coordinator/seminar-proposal-submissions/:submissionId/validation
```

## Updated Progress Model

Progress step tetap bisa dipakai, tetapi trigger status harus mengikuti flow bisnis:

| Step | Trigger completed |
|---|---|
| `pendaftaran-ta` | Final project registration `Disetujui` |
| `bimbingan-pra-proposal` | Minimum materi valid untuk seminar proposal terpenuhi |
| `sidang-proposal` | Seminar proposal selesai, bukan sekadar submission layak |
| `revisi-proposal` | Semua materi revisi seminar proposal valid |
| `bimbingan-pra-sidang` | Minimum materi valid untuk sidang akhir terpenuhi |
| `sidang` | Sidang akhir selesai |
| `revisi-sidang` | Semua materi revisi sidang akhir valid dan final approval selesai |

## Database Impact

Perlu migration revision setelah Task 33.

Target tambahan atau perubahan:

| Table | Action | Reason |
|---|---|---|
| `users` | Add first login fields | Done Task 34 untuk flow A |
| `user_roles` | Add table | Done Task 34 untuk multi-role |
| `thesis_submissions` | Keep as compatibility layer | Pendaftaran TA production pindah ke aggregate baru |
| `final_project_registrations` | Schema done Task 36, JSON runtime done Task 37 | Aggregate pendaftaran TA |
| `final_project_registration_requirements` | Done Task 36 | Snapshot persyaratan dalam pendaftaran TA |
| `supervisor_assignments` | Done Task 36 | Pembimbing 1 dan 2 ditetapkan koordinator |
| `guidance_workflows` | Extend statuses and type | Mendukung empat jenis bimbingan dan rejection |
| `guidance_materials` | Add table | Materi/topik bimbingan dan validasi dosen |
| `seminar_proposal_submissions` | Add table | Gate kelayakan seminar proposal |
| `exams` | Keep but reposition | Dipakai setelah kelayakan seminar/proposal masuk fase jadwal/sidang |

## API Impact

Endpoint existing scaffold tetap boleh hidup untuk compatibility, tetapi contract production perlu endpoint baru:

```text
POST /auth/select-role
POST /auth/first-login
GET  /auth/me/roles

GET  /students/me/final-project-registration
POST /students/me/final-project-registration
GET  /coordinator/final-project-registrations
PATCH /coordinator/final-project-registrations/:registrationId/validation

GET  /students/me/guidance-requests
POST /students/me/guidance-requests
GET  /lecturer/guidance-requests
PATCH /lecturer/guidance-requests/:guidanceRequestId/validation

GET  /students/me/guidance/:guidanceId/materials
POST /students/me/guidance/:guidanceId/materials
PATCH /lecturer/guidance/:guidanceId/materials/:materialId/validation

GET  /students/me/seminar-proposal-submission
POST /students/me/seminar-proposal-submission
GET  /coordinator/seminar-proposal-submissions
PATCH /coordinator/seminar-proposal-submissions/:submissionId/validation
```

## Acceptance Criteria

Alignment dianggap siap jika:

1. Login dapat menangani single-role dan multi-role user.
2. First login memaksa biodata dan perubahan password sebelum masuk dashboard.
3. Pendaftaran TA memakai status bisnis `Menunggu Validasi Koordinator`, `Disetujui`, dan `Ditolak`.
4. Koordinator dapat menetapkan pembimbing 1 dan 2 saat approval pendaftaran TA.
5. Pengajuan bimbingan mendukung empat jenis bimbingan dari lampiran.
6. Dosen dapat menyetujui atau menolak pengajuan bimbingan.
7. Materi bimbingan menjadi entity yang dapat divalidasi `Valid` atau `Ditolak`.
8. Jumlah materi valid dapat dihitung sebagai syarat seminar proposal atau sidang akhir.
9. Pengajuan Seminar Proposal dipisahkan dari scheduling/panel exam.
10. Semua perubahan status masuk audit log.

## Recommended Next Task

Task 38: Frontend Facade dan UI Integration untuk Final Project Registration.

Reason: Backend Flow B-C sudah punya route JSON dan smoke test. Berikutnya frontend perlu facade/service dan UI pendaftaran TA memakai aggregate baru, bukan `thesis-submissions` legacy.
