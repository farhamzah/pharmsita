# Final Project Registration Contract

Status: Task 37 runtime JSON implemented.

Tanggal: 2026-06-06

## Tujuan

Contract ini menggantikan konsep lama `thesis_submissions` untuk Flow B-C lampiran A-I. `thesis_submissions` tetap hidup sebagai compatibility layer sampai frontend facade dimigrasikan.

Aggregate baru:

```text
final_project_registrations
final_project_registration_requirements
supervisor_assignments
```

## Status

```ts
type FinalProjectRegistrationStatus =
  | "Draft"
  | "Menunggu Validasi Koordinator"
  | "Disetujui"
  | "Ditolak";
```

Transition:

```text
Draft -> Menunggu Validasi Koordinator
Menunggu Validasi Koordinator -> Disetujui
Menunggu Validasi Koordinator -> Ditolak
Ditolak -> new registration allowed
Disetujui -> locked from resubmit unless admin override
```

## DTO

```ts
interface FinalProjectRegistration {
  id: string;
  studentId: string;
  academicPeriodId?: string | null;
  requirementDriveLink: string;
  paymentProofFileRef?: string;
  paymentProofLink?: string;
  skema?: "Skripsi" | "Non Skripsi";
  thesisTypeId?: string | null;
  thesisTypeName?: string;
  judulTA?: string;
  deskripsiTA?: string;
  requestedSupervisor1Id?: string | null;
  requestedSupervisor1Name?: string;
  status: FinalProjectRegistrationStatus;
  coordinatorNote?: string;
  submittedAt?: string | null;
  validatedAt?: string | null;
  validatedBy?: string | null;
  requirements: FinalProjectRegistrationRequirement[];
  supervisorAssignments: SupervisorAssignment[];
}
```

## Student API

### GET /students/me/final-project-registration

Mengambil pendaftaran aktif milik mahasiswa. Jika belum ada, backend boleh mengembalikan `data: null`.

Response:

```json
{
  "data": {
    "id": "uuid",
    "studentId": "uuid",
    "requirementDriveLink": "https://drive.google.com/drive/folders/example",
    "paymentProofLink": "https://drive.google.com/file/d/example",
    "skema": "Skripsi",
    "thesisTypeId": "uuid",
    "thesisTypeName": "Skripsi Penelitian",
    "judulTA": "Formulasi dan Evaluasi Sediaan Gel Ekstrak Daun Sirih",
    "deskripsiTA": "Rencana penelitian...",
    "requestedSupervisor1Id": "uuid",
    "requestedSupervisor1Name": "Dr. Budi Harto, M.Farm.",
    "status": "Menunggu Validasi Koordinator",
    "requirements": [],
    "supervisorAssignments": []
  }
}
```

### POST /students/me/final-project-registration

Membuat atau mengirim pendaftaran TA. Untuk submit ke koordinator, request wajib lengkap.

Request:

```json
{
  "requirementDriveLink": "https://drive.google.com/drive/folders/example",
  "paymentProofLink": "https://drive.google.com/file/d/example",
  "skema": "Skripsi",
  "thesisTypeId": "uuid",
  "judulTA": "Formulasi dan Evaluasi Sediaan Gel Ekstrak Daun Sirih",
  "deskripsiTA": "Rencana penelitian...",
  "requestedSupervisor1Id": "uuid",
  "submit": true
}
```

Rules:

1. Mahasiswa hanya boleh punya satu pendaftaran aktif dengan status `Draft`, `Menunggu Validasi Koordinator`, atau `Disetujui`.
2. `submit: true` mengubah status menjadi `Menunggu Validasi Koordinator`.
3. Submit wajib punya link persyaratan, bukti kuitansi, skema, jenis TA, judul, deskripsi, dan rekomendasi pembimbing 1.
4. Jika status sudah `Menunggu Validasi Koordinator`, mahasiswa tidak boleh overwrite tanpa mekanisme revisi/admin override.

## Coordinator API

### GET /coordinator/final-project-registrations

Query:

```text
?status=Menunggu%20Validasi%20Koordinator&q=dimas&page=1&limit=20
```

Response:

```json
{
  "data": [],
  "meta": {
    "page": 1,
    "limit": 20,
    "total": 0,
    "totalPages": 0
  }
}
```

### GET /coordinator/final-project-registrations/:registrationId

Mengambil detail lengkap pendaftaran TA, requirement, dan assignment pembimbing.

### PATCH /coordinator/final-project-registrations/:registrationId/validation

Approve:

```json
{
  "status": "Disetujui",
  "pembimbing1Id": "uuid",
  "pembimbing2Id": "uuid",
  "catatanKoordinator": "Disetujui."
}
```

Reject:

```json
{
  "status": "Ditolak",
  "catatanKoordinator": "Judul perlu diperbaiki."
}
```

Rules:

1. Validasi hanya boleh dari `Menunggu Validasi Koordinator`.
2. `Ditolak` wajib punya `catatanKoordinator`.
3. `Disetujui` wajib menetapkan pembimbing 1 dan 2.
4. Saat `Disetujui`, backend membuat `supervisor_assignments` order 1 dan 2.
5. Saat `Disetujui`, progress `pendaftaran-ta` dapat menjadi `completed`.
6. Semua validasi masuk audit log.

## Permission

| Role | Permission |
|---|---|
| Mahasiswa | `student.final-project-registration.read`, `student.final-project-registration.submit` |
| Dosen | `lecturer.final-project-registration.read` |
| Koordinator | `coordinator.final-project-registration.read`, `coordinator.final-project-registration.validate` |
| Admin | `admin.final-project-registration.override` |

## Compatibility

`thesis_submissions` tetap dipakai oleh endpoint scaffold lama:

```text
/students/me/thesis-submissions
/coordinator/students/:studentId/thesis-submissions
```

Runtime JSON sudah memiliki repository, route, validation, audit, dan smoke test:

```powershell
npm.cmd run api:smoke:final-project
```

Task berikutnya perlu membuat frontend facade/UI integration dan menentukan kapan compatibility layer membaca/menulis aggregate baru.
