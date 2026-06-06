# Backend Contract Draft

Dokumen ini adalah draft kontrak backend untuk PharmSITA frontend. Tujuannya menjadi acuan awal sebelum backend, database, auth production, dan API dibuat.

Status: draft v1. Scope utama: Auth, Master Data, dan Student Workflow.

Business workflow alignment dari lampiran A-I tersedia di:

```text
docs/business-workflow-alignment-a-i.md
```

Contract pendaftaran TA aggregate tersedia di:

```text
docs/final-project-registration-contract.md
```

Catatan: dokumen alignment A-I menjadi acuan revisi berikutnya untuk pendaftaran TA, bimbingan, materi bimbingan, dan pengajuan Seminar Proposal. Multi-role auth dan first login sudah mulai diimplementasikan pada Task 34.

## Prinsip Umum

1. Backend menjadi sumber kebenaran untuk auth, role permission, status workflow, data master, file, dan audit trail.
2. Frontend tidak boleh menyimpan password, role final, atau status approval sebagai sumber kebenaran.
3. Semua perubahan status penting harus divalidasi backend berdasarkan role pengguna.
4. Semua aksi penting harus masuk audit log.
5. Response API harus stabil dan tidak bergantung pada label visual UI.

## Konvensi API

Base URL:

```text
/api/v1
```

Format:

```text
Content-Type: application/json
Authorization: Bearer <accessToken>
```

ID:

```text
Gunakan UUID atau ULID string.
```

Waktu:

```text
Timestamp: ISO 8601 UTC, contoh 2026-06-06T10:15:00Z
Tanggal: YYYY-MM-DD
Jam: HH:mm
```

Pagination:

```json
{
  "data": [],
  "meta": {
    "page": 1,
    "limit": 20,
    "total": 100,
    "totalPages": 5
  }
}
```

Error response:

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Data tidak valid.",
    "details": {
      "identifier": ["Identifier wajib diisi."]
    }
  }
}
```

Kode error minimum:

| Code | HTTP | Keterangan |
|---|---:|---|
| UNAUTHENTICATED | 401 | Token tidak ada atau tidak valid |
| FORBIDDEN | 403 | Role tidak punya akses |
| NOT_FOUND | 404 | Resource tidak ditemukan |
| VALIDATION_ERROR | 422 | Payload tidak valid |
| CONFLICT | 409 | Status/resource bertabrakan dengan aturan workflow |
| INTERNAL_ERROR | 500 | Error server |

## Role dan Permission

Role frontend saat ini:

```ts
"mahasiswa" | "dosen" | "admin" | "kordinator"
```

Backend disarankan memakai canonical role:

```ts
"mahasiswa" | "dosen" | "admin" | "koordinator"
```

Catatan kompatibilitas:

```text
Frontend route lama memakai "kordinator". Auth/API boleh mengembalikan "koordinator", lalu frontend mapping ke route "kordinator" sampai route dinormalisasi.
```

Permission ringkas:

| Modul | Mahasiswa | Dosen | Koordinator | Admin |
|---|---|---|---|---|
| Auth sendiri | Read/update password | Read/update password | Read/update password | Read/update password |
| User management | No | No | Read limited | CRUD |
| Master data | Read active | Read active | Read/update workflow-related | CRUD |
| Requirement upload | Create/update own | Read supervised students | Validate | Validate/override |
| Thesis submission | Create/read own | Read supervised | Validate | Read/override |
| Guidance | Create/read own | Approve/respond | Read monitoring | Read/override |
| Exam scheduling | Read own | Approve/assess | Schedule/manage | Manage |
| Revision | Submit own | Review/approve | Monitor/final decision | Manage |
| Audit log | No | Own actions | Related workflow | Full |

Permission key scaffold saat ini:

| Role | Permission |
|---|---|
| Mahasiswa | `student.workflow.read`, `student.workflow.submit`, `student.final-project-registration.read`, `student.final-project-registration.submit` |
| Dosen | `lecturer.workflow.read`, `lecturer.guidance.read`, `lecturer.guidance.approve`, `lecturer.exam.assess`, `lecturer.revision.review`, `lecturer.final-project-registration.read` |
| Koordinator | `coordinator.workflow.read`, `coordinator.progress.manage`, `coordinator.exam.manage`, `coordinator.validation.manage`, `coordinator.monitoring.read`, `coordinator.final-project-registration.read`, `coordinator.final-project-registration.validate` |
| Admin | `admin.users.manage`, `admin.master.manage`, `audit.read`, `workflow.override`, `admin.final-project-registration.override` |

## Shared DTO

User summary:

```ts
type UserRole = "mahasiswa" | "dosen" | "admin" | "koordinator";
type UserStatus = "Aktif" | "Nonaktif";

interface UserSummary {
  id: string;
  role: UserRole;
  name: string;
  identifier: string; // NIM, NIDN, NIP, or admin username
  email?: string;
  status: UserStatus;
}
```

Audit metadata:

```ts
interface AuditMeta {
  createdAt: string;
  createdBy: string;
  updatedAt?: string;
  updatedBy?: string;
}
```

## Auth Contract

### POST /auth/login

Login dengan identifier dan password.

Request:

```json
{
  "identifier": "mahasiswa",
  "password": "secret"
}
```

Response:

```json
{
  "accessToken": "jwt-access-token",
  "refreshToken": "jwt-refresh-token",
  "expiresAt": "2026-06-06T11:15:00Z",
  "availableRoles": ["mahasiswa"],
  "user": {
    "id": "usr_01",
    "role": "mahasiswa",
    "name": "Dimas Indra Jaya",
    "identifier": "220110001",
    "email": "dimas@pharmsita.ac.id",
    "status": "Aktif"
  }
}
```

Jika user punya lebih dari satu role, atau first login belum selesai, response menjadi challenge tanpa token:

```json
{
  "loginChallengeId": "challenge-id",
  "challengeExpiresAt": "2026-06-06T11:15:00Z",
  "requiresRoleSelection": true,
  "requiresFirstLogin": false,
  "availableRoles": ["dosen", "koordinator"],
  "user": {
    "id": "usr_05",
    "role": "dosen",
    "name": "Dr. Multi Peran, M.Farm.",
    "identifier": "multi",
    "status": "Aktif"
  }
}
```

Rules:

1. Reject user `Nonaktif`.
2. Password diverifikasi dari hash backend, bukan dari frontend/localStorage.
3. Response tidak pernah mengembalikan password atau password hash.
4. Role session diambil dari `user_roles`; `users.role` masih dipakai sebagai primary/backward-compatible role.

### POST /auth/select-role

Memilih role dari login challenge multi-role.

Request:

```json
{
  "loginChallengeId": "challenge-id",
  "role": "koordinator"
}
```

Response sama seperti login sukses dan refresh token menyimpan role session yang dipilih.

### POST /auth/first-login

Menyelesaikan aktivasi pertama dan mengganti password.

Request:

```json
{
  "loginChallengeId": "challenge-id",
  "role": "mahasiswa",
  "newPassword": "new-secret"
}
```

Rules:

1. Minimal 8 karakter.
2. Backend mengisi `firstLoginCompletedAt`, `passwordChangedAt`, `passwordStatus = active`, dan `forceChangeOnLogin = false`.
3. Setelah sukses, backend langsung membuat session untuk role yang dipilih.

### GET /auth/me

Mengambil user session aktif.

Response:

```json
{
  "user": {
    "id": "usr_01",
    "role": "mahasiswa",
    "name": "Dimas Indra Jaya",
    "identifier": "220110001",
    "email": "dimas@pharmsita.ac.id",
    "status": "Aktif"
  },
  "availableRoles": ["mahasiswa"],
  "permissions": [
    "student.workflow.read",
    "student.workflow.submit"
  ]
}
```

### POST /auth/refresh

Request:

```json
{
  "refreshToken": "jwt-refresh-token"
}
```

Response sama seperti login, tanpa user detail jika tidak diperlukan.

### POST /auth/logout

Invalidate refresh token.

Response:

```json
{
  "message": "Logout berhasil."
}
```

### PATCH /auth/me/password

Request:

```json
{
  "currentPassword": "old-secret",
  "newPassword": "new-secret"
}
```

Rules:

1. Minimal 8 karakter.
2. Backend hash password.
3. Audit log `PASSWORD_CHANGED`.

## Master Data Contract

### Users

#### GET /admin/users

Query:

```text
?role=mahasiswa&status=Aktif&q=dimas&page=1&limit=20
```

Response:

```json
{
  "data": [
    {
      "id": "usr_01",
      "name": "Dimas Indra Jaya",
      "identifier": "220110001",
      "role": "mahasiswa",
      "status": "Aktif",
      "email": "dimas@pharmsita.ac.id",
      "phone": "08123456789",
      "profile": {
        "programStudi": "S1 Farmasi",
        "angkatan": "2022",
        "kelas": "FA-22-01"
      }
    }
  ],
  "meta": {
    "page": 1,
    "limit": 20,
    "total": 1,
    "totalPages": 1
  }
}
```

#### POST /admin/users

Request:

```json
{
  "name": "Dimas Indra Jaya",
  "identifier": "220110001",
  "role": "mahasiswa",
  "email": "dimas@pharmsita.ac.id",
  "initialPassword": "optional-secret",
  "profile": {
    "programStudi": "S1 Farmasi",
    "angkatan": "2022",
    "kelas": "FA-22-01"
  }
}
```

Response:

```json
{
  "data": {
    "id": "usr_01",
    "name": "Dimas Indra Jaya",
    "identifier": "220110001",
    "role": "mahasiswa",
    "status": "Aktif",
    "email": "dimas@pharmsita.ac.id",
    "passwordStatus": "Diatur awal",
    "passwordUpdatedAt": "2026-06-06T10:15:00Z"
  }
}
```

Rules:

1. `identifier` unik.
2. `initialPassword` tidak disimpan plaintext dan tidak dikembalikan.
3. Jika `initialPassword` kosong, status password menjadi `Perlu aktivasi/reset`.

#### PATCH /admin/users/:id

Update data non-password.

Request:

```json
{
  "name": "Dimas Indra Jaya",
  "email": "dimas@pharmsita.ac.id",
  "profile": {
    "phone": "08123456789",
    "alamat": "Tangerang Selatan"
  }
}
```

#### PATCH /admin/users/:id/status

Request:

```json
{
  "status": "Nonaktif",
  "reason": "Akun tidak aktif semester ini."
}
```

Rules:

1. User `Nonaktif` tidak bisa login.
2. Status change wajib masuk audit log.

#### POST /admin/users/:id/password-reset

Request:

```json
{
  "newPassword": "optional-secret",
  "forceChangeOnLogin": true
}
```

Response:

```json
{
  "message": "Password berhasil direset.",
  "passwordStatus": "Reset diminta",
  "passwordUpdatedAt": "2026-06-06T10:15:00Z"
}
```

Rules:

1. Response tidak mengembalikan password.
2. Jika backend nanti punya email/SMS, password reset bisa diganti flow token.

### Academic Periods

Model:

```ts
interface AcademicPeriod {
  id: string;
  name: string; // "2025/2026"
  semester: "Ganjil" | "Genap";
  startDate: string; // YYYY-MM-DD
  endDate: string; // YYYY-MM-DD
  status: "Aktif" | "Selesai" | "Nonaktif";
}
```

Endpoints:

| Method | Path | Access |
|---|---|---|
| GET | /master/academic-periods | all authenticated |
| POST | /admin/master/academic-periods | admin |
| PATCH | /admin/master/academic-periods/:id | admin |
| DELETE | /admin/master/academic-periods/:id | admin |

Rule:

```text
Hanya satu periode boleh berstatus Aktif per semester berjalan.
```

### Thesis Types

Model:

```ts
interface ThesisType {
  id: string;
  name: string;
  skema: "Skripsi" | "Non Skripsi";
  desc?: string;
  status: "Aktif" | "Nonaktif";
}
```

Endpoints:

| Method | Path | Access |
|---|---|---|
| GET | /master/thesis-types?status=Aktif&skema=Skripsi | all authenticated |
| POST | /admin/master/thesis-types | admin |
| PATCH | /admin/master/thesis-types/:id | admin |
| DELETE | /admin/master/thesis-types/:id | admin |

### Supporting Documents

Model:

```ts
interface SupportingDocument {
  id: string;
  name: string;
  description?: string;
  allowedTypes: string[]; // ["PDF", "Image"]
  isRequired: "Wajib" | "Opsional";
  status: "Aktif" | "Nonaktif";
}
```

Endpoints:

| Method | Path | Access |
|---|---|---|
| GET | /master/supporting-documents | all authenticated |
| POST | /admin/master/supporting-documents | admin |
| PATCH | /admin/master/supporting-documents/:id | admin |
| DELETE | /admin/master/supporting-documents/:id | admin |

### Requirement Definitions

Model:

```ts
type RequirementStage = "Persyaratan Awal" | "Seminar Proposal" | "Sidang Akhir" | "Yudisium";

interface RequirementDefinition {
  id: string;
  tahap: RequirementStage;
  namaPersyaratan: string;
  deskripsiAturan?: string;
  wajib: boolean;
  status: "Aktif" | "Nonaktif";
}
```

Endpoints:

| Method | Path | Access |
|---|---|---|
| GET | /master/requirements?tahap=Persyaratan%20Awal | all authenticated |
| POST | /admin/master/requirements | admin |
| PATCH | /admin/master/requirements/:id | admin |
| DELETE | /admin/master/requirements/:id | admin |

Rule:

```text
Nonaktifkan requirement lama, jangan hard delete jika sudah pernah dipakai student requirement record.
```

## Student Workflow Contract

### Progress Steps

Model:

```ts
type StepId =
  | "pendaftaran-ta"
  | "bimbingan-pra-proposal"
  | "sidang-proposal"
  | "revisi-proposal"
  | "bimbingan-pra-sidang"
  | "sidang"
  | "revisi-sidang";

type StepStatus = "pending" | "active" | "completed";

interface StudentStep {
  id: StepId;
  order: number;
  label: string;
  description: string;
  status: StepStatus;
  isLocked: boolean;
}
```

Endpoints:

| Method | Path | Access |
|---|---|---|
| GET | /students/me/progress | mahasiswa |
| GET | /lecturer/students/:studentId/progress | dosen, admin override |
| GET | /coordinator/students/:studentId/progress | koordinator, admin override |
| PATCH | /coordinator/students/:studentId/progress/:stepId | koordinator, admin override, system |

Rule:

```text
Backend menentukan isLocked berdasarkan status step sebelumnya. Frontend tidak mengirim isLocked.
```

### Student Requirement Records

Status:

```ts
type RequirementValidationStatus =
  | "Belum Upload"
  | "Menunggu Verifikasi"
  | "Valid"
  | "Perlu Revisi"
  | "Ditolak";
```

Model:

```ts
interface StudentRequirementRecord {
  id: string;
  studentId: string;
  requirementId: string;
  tahap: "Persyaratan Awal" | "Seminar Proposal" | "Sidang Akhir" | "Yudisium";
  status: RequirementValidationStatus;
  linkBerkas?: string;
  tanggalUpload?: string;
  catatanMahasiswa?: string;
  tanggalVerifikasi?: string;
  catatanKoordinator?: string;
  diverifikasiOlehId?: string;
}
```

#### GET /students/me/requirements

Query:

```text
?tahap=Persyaratan Awal
```

Response:

```json
{
  "data": {
    "driveLink": "https://drive.google.com/drive/folders/example",
    "requirements": [
      {
        "id": "sreq_01",
        "requirementId": "req_a1",
        "label": "IPK min 3,00 & min 120 SKS",
        "wajib": true,
        "status": "Valid",
        "catatanKoordinator": null
      }
    ]
  }
}
```

#### PUT /students/me/requirements/submission

Mahasiswa submit atau resubmit kumpulan berkas requirement.

Request:

```json
{
  "tahap": "Persyaratan Awal",
  "driveLink": "https://drive.google.com/drive/folders/example",
  "catatanMahasiswa": "Berkas sudah saya perbarui."
}
```

Rules:

1. Requirement dengan status `Belum Upload`, `Perlu Revisi`, atau `Ditolak` berubah menjadi `Menunggu Verifikasi`.
2. Requirement yang sudah `Valid` tetap `Valid`.
3. Backend validasi minimal URL. Integrasi Drive bisa menjadi fase berikutnya.

#### PATCH /coordinator/students/:studentId/requirements/:recordId/validation

Koordinator/admin memvalidasi satu requirement record.

Request:

```json
{
  "status": "Perlu Revisi",
  "catatanKoordinator": "Kwitansi buram, mohon upload ulang."
}
```

Rules:

1. `Perlu Revisi` atau `Ditolak` wajib punya catatan.
2. `tanggalVerifikasi` dan `diverifikasiOlehId` diisi backend.
3. Aksi masuk audit log.

Endpoint scaffold MVP untuk bundle requirement:

| Method | Path | Access |
|---|---|---|
| GET | /coordinator/students/:studentId/requirements/initial | koordinator, admin override |
| PUT | /coordinator/students/:studentId/requirements/initial | koordinator, admin override |
| GET | /coordinator/students/:studentId/requirements/stages/:stageId | koordinator, admin override |
| PUT | /coordinator/students/:studentId/requirements/stages/:stageId | koordinator, admin override |

### Final Project Registration

Contract detail tersedia di:

```text
docs/final-project-registration-contract.md
```

Status:

```ts
type FinalProjectRegistrationStatus =
  | "Draft"
  | "Menunggu Validasi Koordinator"
  | "Disetujui"
  | "Ditolak";
```

Model ringkas:

```ts
interface FinalProjectRegistration {
  id: string;
  studentId: string;
  requirementDriveLink: string;
  paymentProofFileRef?: string;
  paymentProofLink?: string;
  skema?: "Skripsi" | "Non Skripsi";
  thesisTypeId?: string | null;
  thesisTypeName?: string;
  judulTA?: string;
  deskripsiTA?: string;
  requestedSupervisor1Id?: string | null;
  status: FinalProjectRegistrationStatus;
  coordinatorNote?: string;
  requirements: FinalProjectRegistrationRequirement[];
  supervisorAssignments: SupervisorAssignment[];
}
```

Endpoints target:

| Method | Path | Access |
|---|---|---|
| GET | /students/me/final-project-registration | mahasiswa |
| POST | /students/me/final-project-registration | mahasiswa |
| GET | /coordinator/final-project-registrations | koordinator, admin override |
| GET | /coordinator/final-project-registrations/:registrationId | koordinator, admin override |
| PATCH | /coordinator/final-project-registrations/:registrationId/validation | koordinator, admin override |

Rules:

1. Pendaftaran TA menggantikan konsep production `thesis_submissions` karena mencakup persyaratan, kuitansi, skema, jenis TA, judul, deskripsi, dan rekomendasi pembimbing.
2. Mahasiswa hanya boleh punya satu pendaftaran aktif dengan status `Draft`, `Menunggu Validasi Koordinator`, atau `Disetujui`.
3. Submit mahasiswa mengubah status menjadi `Menunggu Validasi Koordinator`.
4. `Disetujui` wajib menetapkan pembimbing 1 dan 2 serta membuat `supervisor_assignments`.
5. `Ditolak` wajib punya catatan koordinator.
6. Jika `Disetujui`, backend dapat menandai progress `pendaftaran-ta` sebagai `completed`.
7. Endpoint `thesis_submissions` lama tetap compatibility layer sampai repository dan frontend dimigrasikan.

### Thesis Submissions

Status:

```ts
type ThesisSubmissionStatus = "Sedang Proses Validasi" | "Diterima" | "Ditolak";
```

Model:

```ts
interface ThesisSubmission {
  id: string;
  studentId: string;
  date: string;
  skema: "Skripsi" | "Non Skripsi";
  jenisTA: string;
  judulTA: string;
  deskripsiTA: string;
  pembimbing1Id: string;
  pembimbing2Id?: string;
  status: ThesisSubmissionStatus;
  catatanKoordinator?: string;
  buktiFileId?: string;
}
```

#### GET /students/me/thesis-submissions

Mahasiswa melihat riwayat pengajuan judul.

#### POST /students/me/thesis-submissions

Request:

```json
{
  "skema": "Skripsi",
  "jenisTAId": "jta_01",
  "judulTA": "Formulasi dan Evaluasi Sediaan Gel Ekstrak Daun Sirih",
  "deskripsiTA": "Rencana penelitian...",
  "pembimbing1Id": "usr_dosen_01",
  "buktiFileId": "file_01"
}
```

Rules:

1. Mahasiswa tidak boleh membuat pengajuan baru jika masih ada pengajuan `Sedang Proses Validasi`.
2. `pembimbing2Id` dapat ditentukan koordinator.
3. Jika diterima, backend dapat membuat assignment pembimbing dan mengaktifkan step berikutnya.

#### GET /coordinator/thesis-submissions

Query:

```text
?status=Sedang%20Proses%20Validasi&q=dimas&page=1&limit=20
```

Access: koordinator, admin.

Endpoint scaffold MVP:

| Method | Path | Access |
|---|---|---|
| GET | /coordinator/students/:studentId/thesis-submissions | koordinator, admin override |
| PUT | /coordinator/students/:studentId/thesis-submissions | koordinator, admin override |

#### PATCH /coordinator/thesis-submissions/:id/validation

Request:

```json
{
  "status": "Diterima",
  "catatanKoordinator": "Judul disetujui.",
  "pembimbing2Id": "usr_dosen_02"
}
```

Rules:

1. `Ditolak` wajib punya catatan.
2. `Diterima` wajib menghasilkan audit log dan assignment pembimbing.
3. Backend update progress `pendaftaran-ta` menjadi `completed` jika syarat awal dan pengajuan judul sudah valid.

### Guidance Workflow

Stage:

```ts
type GuidanceStage = "bimbingan-pra-proposal" | "bimbingan-pra-sidang";
```

Endpoints:

| Method | Path | Access |
|---|---|---|
| GET | /students/me/guidance/:stageId | mahasiswa |
| GET | /lecturer/students/:studentId/guidance/:stageId | dosen pembimbing |
| PATCH | /students/me/guidance/:stageId/docs-link | mahasiswa |
| POST | /students/me/guidance/:stageId/request | mahasiswa |
| PATCH | /lecturer/students/:studentId/guidance/:stageId/request | dosen pembimbing |
| POST | /students/me/guidance/:stageId/sessions/:sessionId/request | mahasiswa |
| PATCH | /lecturer/students/:studentId/guidance/:stageId/sessions/:sessionId/approval | dosen pembimbing |
| POST | /guidance/:guidanceId/sessions/:sessionId/chats | mahasiswa, dosen pembimbing |
| PATCH | /lecturer/students/:studentId/guidance/:stageId/approval | dosen pembimbing |

Session model mengikuti frontend:

```ts
interface BimbinganSession {
  id: number;
  title: string;
  status: "pending" | "in progress" | "approved";
  sessionStatus?: "idle" | "requested" | "approved";
  sessionStartDate?: string | null;
  sessionStartTime?: string | null;
}
```

Rules:

1. Minimal 8 sesi approved untuk lanjut ke sidang terkait.
2. Hanya dosen pembimbing terkait yang dapat approve sesi.
3. Chat tersimpan dengan senderId, senderRole, timestamp.

### Exam Workflow

Stage:

```ts
type ExamStage = "sidang-proposal" | "sidang";
```

Endpoints:

| Method | Path | Access |
|---|---|---|
| GET | /students/me/exams/:stageId | mahasiswa |
| GET | /coordinator/students/:studentId/exams/:stageId | koordinator, admin |
| GET | /lecturer/students/:studentId/exams/:stageId | dosen penguji/ketua sidang |
| POST | /students/me/exams/:stageId/registration | mahasiswa |
| PATCH | /coordinator/students/:studentId/exams/:stageId/status | koordinator, admin |
| PATCH | /coordinator/exams/:examId/schedule | koordinator, admin |
| PATCH | /lecturer/exams/:examId/panelists/:panelistId/approval | dosen terkait |
| PATCH | /lecturer/students/:studentId/exams/:stageId/assessment | dosen/ketua sidang sesuai permission |
| PATCH | /coordinator/exams/:examId/requirements/:requirementId | koordinator, admin |

Schedule request:

```json
{
  "date": "2026-06-16",
  "startTime": "09:00",
  "endTime": "11:00",
  "room": "Ruang Seminar A",
  "location": "Gedung Farmasi Lt. 2",
  "moderatorId": "usr_dosen_02"
}
```

Assessment request:

```json
{
  "grade": "A-",
  "resultStatus": "lulus-dengan-revisi",
  "revisionNotes": [
    "Bab 1 perlu diperjelas.",
    "Tambahkan analisis statistik."
  ]
}
```

Rules:

1. Mahasiswa hanya bisa daftar jika requirements stage terpenuhi.
2. Sidang tidak bisa `terjadwal` tanpa panelist minimal.
3. `lulus-dengan-revisi` otomatis membuat revision workflow.

### Revision Workflow

Stage:

```ts
type RevisionStage = "revisi-proposal" | "revisi-sidang";
```

Endpoints:

| Method | Path | Access |
|---|---|---|
| GET | /students/me/revisions/:stageId | mahasiswa |
| GET | /lecturer/students/:studentId/revisions/:stageId | dosen penguji/ketua sidang |
| POST | /students/me/revisions/:stageId/items/:itemId/submission | mahasiswa |
| POST | /revisions/:revisionId/items/:itemId/chats | mahasiswa, dosen terkait |
| PATCH | /lecturer/students/:studentId/revisions/:stageId/items/:itemId/status | dosen assigned |
| PATCH | /lecturer/students/:studentId/revisions/:stageId/approval | penguji/ketua sidang sesuai role |
| POST | /students/me/revisions/:stageId/final-file | mahasiswa |

Submission request:

```json
{
  "penyelesaian": "Sudah saya perbaiki pada Bab 1 halaman 4.",
  "penyelesaianLink": "https://drive.google.com/document/d/example"
}
```

Approval request:

```json
{
  "role": "penguji1",
  "status": "approved",
  "note": "Revisi sudah sesuai."
}
```

Rules:

1. Dosen hanya bisa update revisi yang assigned ke dia, kecuali ketua sidang/admin.
2. Revisi selesai jika semua item `done`, penguji wajib approve, dan ketua sidang approved.
3. Jika revisi selesai, backend update progress step terkait menjadi `completed`.

## File Contract

MVP dapat memakai external link Google Drive, tetapi backend sebaiknya tetap punya resource file.

### POST /files

Multipart upload.

Response:

```json
{
  "data": {
    "id": "file_01",
    "name": "bukti_kwitansi.pdf",
    "mimeType": "application/pdf",
    "size": 123456,
    "url": "https://storage.example/files/file_01",
    "uploadedAt": "2026-06-06T10:15:00Z"
  }
}
```

Rules:

1. Validate MIME dan ukuran file.
2. File sensitive harus private dan diakses lewat signed URL atau authorized endpoint.
3. Simpan ownerId dan linkedResource.

## Database Draft

Tabel minimum:

| Table | Fungsi |
|---|---|
| users | Auth identity, role, status |
| user_roles | Assignment role aktif per identity user |
| role_permissions | Permission per role untuk RBAC |
| student_profiles | Detail mahasiswa |
| lecturer_profiles | Detail dosen, kuota, bidang keahlian |
| coordinator_profiles | Detail koordinator |
| academic_periods | Periode akademik |
| thesis_types | Jenis TA |
| supporting_documents | Dokumen pendukung |
| requirement_definitions | Master item persyaratan |
| student_requirement_records | Status requirement per mahasiswa |
| final_project_registrations | Aggregate pendaftaran TA production |
| final_project_registration_requirements | Snapshot persyaratan pada pendaftaran TA |
| supervisor_assignments | Assignment pembimbing 1 dan 2 |
| thesis_submissions | Pengajuan judul TA legacy compatibility |
| student_progress_steps | Progress step per mahasiswa |
| guidance_workflows | Header bimbingan per stage |
| guidance_sessions | Sesi bimbingan 1 sampai 8 |
| guidance_chats | Chat bimbingan |
| exams | Sidang proposal/sidang akhir |
| exam_panelists | Panel dosen sidang |
| exam_requirements | Requirement sidang |
| revision_workflows | Header revisi |
| revision_items | Item revisi |
| revision_chats | Chat revisi |
| files | Metadata file |
| audit_logs | Catatan aksi penting |

Audit log fields:

```ts
interface AuditLog {
  id: string;
  actorId: string | null;
  actorRole: UserRole | null;
  action: string;
  resourceType: string;
  resourceId: string;
  before?: unknown;
  after?: unknown;
  reason?: string;
  createdAt: string;
}
```

Audit log endpoint MVP:

| Method | Path | Access |
|---|---|---|
| GET | /admin/audit-logs?limit=100 | admin dengan `audit.read` |

## Status Transition Rules

Requirement:

```text
Belum Upload -> Menunggu Verifikasi -> Valid
Belum Upload -> Menunggu Verifikasi -> Perlu Revisi
Perlu Revisi -> Menunggu Verifikasi -> Valid
Menunggu Verifikasi -> Ditolak
```

Thesis submission:

```text
Sedang Proses Validasi -> Diterima
Sedang Proses Validasi -> Ditolak
Ditolak -> new submission allowed
Diterima -> locked from resubmit unless admin override
```

Final project registration:

```text
Draft -> Menunggu Validasi Koordinator
Menunggu Validasi Koordinator -> Disetujui
Menunggu Validasi Koordinator -> Ditolak
Ditolak -> new registration allowed
Disetujui -> locked from resubmit unless admin override
```

Progress:

```text
pending -> active -> completed
Previous step must be completed before next step becomes active.
Admin/koordinator override must be audited.
```

Guidance session:

```text
idle -> requested -> approved
pending -> in progress -> approved
```

Exam:

```text
belum-daftar -> menunggu-jadwal -> terjadwal -> selesai
```

Revision item:

```text
pending -> in progress -> done
```

## Backend Implementation Phases

### Phase 1: Auth and Master Data

Priority: Extra High.

Deliverables:

1. Users, profiles, roles, login, refresh, logout, me.
2. Admin user management without plaintext password.
3. Academic periods, thesis types, supporting documents, requirement definitions.
4. Basic audit log.

### Phase 2: Student Requirement and Thesis Submission

Priority: Extra High.

Deliverables:

1. Student progress.
2. Requirement upload/link submission.
3. Coordinator validation.
4. Thesis title submission and validation.
5. Assignment of pembimbing after accepted submission.

### Phase 3: Guidance, Exam, Revision

Priority: High.

Deliverables:

1. Guidance sessions and chats.
2. Exam registration, schedule, panelist approval, assessment.
3. Revision items, chats, final approval.
4. Progress auto update.

### Phase 4: Files, Notifications, Reporting

Priority: Medium to High.

Deliverables:

1. File storage.
2. Notification center.
3. Dashboard reporting.
4. Export/reporting for admin and koordinator.

## Frontend Migration Notes

Frontend service boundary yang sudah siap diganti API:

| Frontend service | Backend target |
|---|---|
| auth-service.ts | /auth/* |
| admin-data-service.ts | /admin/users and /admin/master/* |
| student-workflow-service.ts | /students/me/requirements, /students/me/thesis-submissions |
| progress-service.ts | /students/me/progress |
| bimbingan-service.ts | /students/me/guidance/*, /lecturer/students/*/guidance/*, /coordinator/students/*/guidance/* |
| sidang-service.ts | /students/me/exams/*, /lecturer/students/*/exams/*, /coordinator/students/*/exams/* |
| revisi-service.ts | /students/me/revisions/*, /lecturer/students/*/revisions/*, /coordinator/students/*/revisions/* |

Frontend API facade yang sudah tersedia:

| API facade | Scope |
|---|---|
| authApi | Auth login, login challenge, role selection, first-login, me, logout |
| adminApi | Users and master data |
| studentWorkflowApi | Requirement awal, requirement per tahap, thesis submissions |
| progressApi | Student progress steps |
| guidanceApi | Bimbingan workflow, sessions, chats, guidance request |
| examApi | Sidang proposal and sidang akhir |
| revisionApi | Revisi proposal and revisi sidang |
| lecturerWorkflowApi | Role endpoint mapping dosen untuk progress, guidance, exam, dan revision; UI dosen sudah memakai facade ini untuk approval bimbingan, penilaian sidang, dan review revisi |
| coordinatorWorkflowApi | Role endpoint mapping koordinator untuk progress, requirements, thesis submissions, guidance, exam, dan revision; UI koordinator sudah memakai facade ini untuk progress, validasi persyaratan, keputusan pengajuan TA, dan status sidang |

Catatan UI: login page sudah mendukung response challenge, pilihan role, dan aktivasi password pertama. Penyimpanan biodata first-login masih menunggu contract profile persistence.

Backend scaffold status:

| Area | Status |
|---|---|
| Auth | Persistent JSON repository, password hash, signed token, refresh token store |
| Multi-Role Auth | `user_roles`, login challenge, role selection, first-login activation |
| Master Data | Persistent JSON repository, validation, audit |
| Student Workflow | Persistent JSON repository untuk progress, requirements, thesis submissions, guidance, exam, revision |
| Role Workflow Authorization | Permission guard untuk `/students/me/*`, endpoint dosen `/lecturer/*`, endpoint koordinator `/coordinator/*` dan alias `/kordinator/*` |
| Audit Log | Persistent JSON audit foundation |

PostgreSQL adapter planning tersedia di:

```text
docs/postgresql-adapter-plan.md
```

PostgreSQL migration draft tersedia di:

```text
backend/database/migrations/001_auth_master_data.sql
backend/database/migrations/002_permissions_and_workflow.sql
backend/database/migrations/003_multi_role_first_login.sql
backend/database/migrations/004_final_project_registration.sql
```

Recommended migration order:

1. Auth service.
2. Admin data service.
3. Student workflow service.
4. Progress service.
5. Bimbingan, sidang, revisi services.

## Open Questions

1. Apakah role route frontend akan dinormalisasi dari `kordinator` ke `koordinator`?
2. Apakah file upload wajib disimpan server, atau tetap memakai Google Drive link pada MVP?
3. Apakah notifikasi dikirim via email/WhatsApp, atau hanya in-app?
4. Apakah assessment sidang butuh rubrik nilai detail atau cukup grade final di MVP?
5. Apakah user multi-role memakai satu identity login dengan role selection, sesuai lampiran A?
6. Apakah istilah final untuk status approval memakai `Disetujui` atau tetap menerima alias legacy `Diterima`?
