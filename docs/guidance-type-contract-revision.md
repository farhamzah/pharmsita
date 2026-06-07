# Guidance Type Contract Revision

Status: Task 54 contract revision.

Date: 2026-06-07

Primary source:

- `docs/Alur Aplikasi PharmSITA.pdf`
- `docs/pharmsita-full-workflow-alignment-26-flows.md`

## Purpose

The PDF requires four guidance flows and validated guidance materials. The current application still models guidance as two stage IDs with sessions/chats as the main progress surface.

This document defines the target guidance contract before Task 55 creates the PostgreSQL migration draft.

## Current State

Current domain:

```ts
type GuidanceStage =
  | "bimbingan-pra-proposal"
  | "bimbingan-pra-sidang";

type GuidanceScheduleStatus =
  | "idle"
  | "requested"
  | "approved";
```

Current storage:

- `guidance_workflows`
- `guidance_sessions`
- `guidance_chats`

Current limitation:

- No `Ditolak` status for guidance request.
- No four PDF guidance types.
- No `guidance_materials` entity.
- 8-session approval is treated as progress, while PDF requires 8 valid materials.
- Revision guidance is not represented as its own guidance request type.

## Target Guidance Types

Canonical type:

```ts
type GuidanceType =
  | "seminar-proposal"
  | "sidang-akhir"
  | "revisi-seminar-proposal"
  | "revisi-sidang-akhir";
```

Display mapping:

| Guidance type | Display label | PDF flow |
|---|---|---|
| `seminar-proposal` | Bimbingan Seminar Proposal | Flow 4-7 |
| `sidang-akhir` | Bimbingan Sidang Akhir | Flow 4-7 |
| `revisi-seminar-proposal` | Bimbingan Revisi Proposal | Flow 4-7 and Flow 12-13 prerequisite |
| `revisi-sidang-akhir` | Bimbingan Revisi Sidang | Flow 4-7 and Flow 12-13 prerequisite |

Legacy mapping:

| Legacy stage | Target guidance type | Notes |
|---|---|---|
| `bimbingan-pra-proposal` | `seminar-proposal` | Existing proposal guidance data migrates here. |
| `bimbingan-pra-sidang` | `sidang-akhir` | Existing final defense guidance data migrates here. |
| `revisi-proposal` | `revisi-seminar-proposal` | Created from proposal exam revision items. |
| `revisi-sidang` | `revisi-sidang-akhir` | Created from final defense revision items. |

Compatibility decision:

- Keep existing `GuidanceStage` and `/students/me/guidance/:stageId` routes temporarily.
- New APIs use `guidanceType`.
- Existing routes should read/write the matching `guidanceType` through an adapter during migration.

## Target Statuses

Guidance request status:

```ts
type GuidanceRequestStatus =
  | "Draft"
  | "Menunggu Validasi Dosen"
  | "Disetujui"
  | "Ditolak";
```

Guidance material status:

```ts
type GuidanceMaterialStatus =
  | "Draft"
  | "Diajukan"
  | "Valid"
  | "Ditolak";
```

Status mapping from legacy:

| Legacy status | Target status |
|---|---|
| `idle` | `Draft` |
| `requested` | `Menunggu Validasi Dosen` |
| `approved` | `Disetujui` |

There is no legacy equivalent for `Ditolak`; Task 55/56 must add it.

## Target DTOs

### Guidance Request

```ts
interface GuidanceRequest {
  id: string;
  studentId: string;
  guidanceType: GuidanceType;
  googleDocsLink: string;
  status: GuidanceRequestStatus;
  studentNote?: string;
  lecturerNote?: string;
  submittedAt?: string | null;
  validatedAt?: string | null;
  validatedBy?: string | null;
  activeLecturerId?: string | null;
  activeLecturerName?: string;
  materialSummary: {
    validCount: number;
    requiredValidCount: number;
    pendingCount: number;
    rejectedCount: number;
    canSubmitNextGate: boolean;
  };
  materials: GuidanceMaterial[];
}
```

### Guidance Material

```ts
interface GuidanceMaterial {
  id: string;
  guidanceRequestId: string;
  materialType: "normal" | "revision";
  sourceRevisionItemId?: string | null;
  topic: string;
  content?: string;
  status: GuidanceMaterialStatus;
  attemptNumber: number;
  submittedAt?: string | null;
  validatedAt?: string | null;
  validatedBy?: string | null;
  lecturerNote?: string;
}
```

## Business Rules

### Guidance Request

1. Student can create one active guidance request per `guidanceType`.
2. `seminar-proposal` is available after Final Project Registration is approved.
3. `sidang-akhir` is available after Seminar Proposal flow is completed.
4. `revisi-seminar-proposal` is available after proposal exam creates revision items.
5. `revisi-sidang-akhir` is available after final defense exam creates revision items.
6. Student submission requires a Google Docs link.
7. Lecturer can approve or reject.
8. If rejected, lecturer note is required.
9. If approved, the guidance process becomes active.

### Normal Guidance Materials

Applies to:

- `seminar-proposal`
- `sidang-akhir`

Rules:

1. Student submits a topic or material.
2. Material status becomes `Diajukan`.
3. Lecturer validates as `Valid` or `Ditolak`.
4. Only `Valid` materials count toward guidance progress.
5. Minimum 8 valid materials are required before the next submission gate:
   - `seminar-proposal` unlocks Seminar Proposal submission.
   - `sidang-akhir` unlocks Final Defense submission.
6. Rejected normal material stays in audit/history, but does not count.

### Revision Guidance Materials

Applies to:

- `revisi-seminar-proposal`
- `revisi-sidang-akhir`

Rules:

1. Materials originate from `revision_items`.
2. Student selects a revision item and submits completion evidence.
3. Lecturer, examiner, or chair validates as `Valid` or `Ditolak`.
4. All revision materials must be `Valid` before student can submit revision completion to coordinator.
5. Rejected revision material remains visible as validation history and can be resubmitted with a higher `attemptNumber`.

## Actor Rules

| Guidance type | Student actor | Validator actor |
|---|---|---|
| `seminar-proposal` | Student owner | Active supervisor 1 or 2 |
| `sidang-akhir` | Student owner | Active supervisor 1 or 2 |
| `revisi-seminar-proposal` | Student owner | Proposal examiner 1, examiner 2, or chair |
| `revisi-sidang-akhir` | Student owner | Final defense examiner 1, examiner 2, or chair |

Access rule:

- Coordinator can read guidance for monitoring.
- Coordinator does not validate guidance request or material.
- Admin can override through `workflow.override`.

## Target API Contract

### Student Guidance Requests

```text
GET  /students/me/guidance-requests
GET  /students/me/guidance-requests/:guidanceRequestId
POST /students/me/guidance-requests
```

Create request:

```json
{
  "guidanceType": "seminar-proposal",
  "googleDocsLink": "https://docs.google.com/document/d/example",
  "studentNote": "Saya mengajukan bimbingan seminar proposal."
}
```

Response:

```json
{
  "data": {
    "id": "uuid",
    "studentId": "uuid",
    "guidanceType": "seminar-proposal",
    "googleDocsLink": "https://docs.google.com/document/d/example",
    "status": "Menunggu Validasi Dosen",
    "materialSummary": {
      "validCount": 0,
      "requiredValidCount": 8,
      "pendingCount": 0,
      "rejectedCount": 0,
      "canSubmitNextGate": false
    },
    "materials": []
  }
}
```

### Lecturer Guidance Validation

```text
GET   /lecturer/guidance-requests
GET   /lecturer/guidance-requests/:guidanceRequestId
PATCH /lecturer/guidance-requests/:guidanceRequestId/validation
```

Validation request:

```json
{
  "status": "Disetujui",
  "catatanDosen": "Dokumen dapat digunakan untuk bimbingan."
}
```

Reject request:

```json
{
  "status": "Ditolak",
  "catatanDosen": "Dokumen belum layak untuk bimbingan."
}
```

### Student Materials

```text
GET  /students/me/guidance-requests/:guidanceRequestId/materials
POST /students/me/guidance-requests/:guidanceRequestId/materials
POST /students/me/guidance-requests/:guidanceRequestId/revision-materials/:revisionItemId/submission
```

Normal material request:

```json
{
  "topic": "Perbaikan latar belakang penelitian",
  "content": "Bagian latar belakang sudah diperjelas pada Google Docs."
}
```

Revision material request:

```json
{
  "content": "Revisi metode sampling sudah diperbaiki pada Bab 3."
}
```

### Lecturer Material Validation

```text
GET   /lecturer/guidance-requests/:guidanceRequestId/materials
PATCH /lecturer/guidance-requests/:guidanceRequestId/materials/:materialId/validation
```

Validation request:

```json
{
  "status": "Valid",
  "catatanDosen": "Materi sudah sesuai."
}
```

Reject request:

```json
{
  "status": "Ditolak",
  "catatanDosen": "Analisis belum menjawab rumusan masalah."
}
```

### Coordinator Monitoring Read

```text
GET /coordinator/students/:studentId/guidance-requests
GET /coordinator/students/:studentId/guidance-requests/:guidanceRequestId
```

Coordinator endpoints are read-only for guidance request/material validation.

## Legacy Compatibility API

Existing API stays alive during migration:

```text
GET   /students/me/guidance/:stageId
POST  /students/me/guidance/:stageId/request
PATCH /lecturer/students/:studentId/guidance/:stageId/request
GET   /lecturer/students/:studentId/guidance/:stageId
GET   /coordinator/students/:studentId/guidance/:stageId
```

Adapter mapping:

| Legacy route param | Guidance type |
|---|---|
| `bimbingan-pra-proposal` | `seminar-proposal` |
| `bimbingan-pra-sidang` | `sidang-akhir` |

Compatibility behavior:

- Legacy `sessions` can be derived from the first 8 valid normal materials for display.
- Legacy `guidanceStatus` maps from target request status.
- Legacy route should not create revision guidance.
- New UI should use the new `guidance-requests` facade.

## PostgreSQL Migration Boundary For Task 55

Task 55 should draft migration `005_guidance_type_materials.sql`.

Required changes:

1. Add `guidance_type` to `guidance_workflows`.
2. Backfill:
   - `bimbingan-pra-proposal` to `seminar-proposal`.
   - `bimbingan-pra-sidang` to `sidang-akhir`.
3. Add target guidance statuses or introduce a new target status column.
4. Add `guidance_materials`.
5. Add indexes for student, guidance type, status, and validator queries.
6. Add role permissions for material validation if needed.

Recommended schema direction:

```sql
ALTER TABLE guidance_workflows
  ADD COLUMN IF NOT EXISTS guidance_type TEXT;
```

Target check:

```text
guidance_type IN (
  'seminar-proposal',
  'sidang-akhir',
  'revisi-seminar-proposal',
  'revisi-sidang-akhir'
)
```

New table draft:

```text
guidance_materials (
  id,
  guidance_workflow_id,
  material_type,
  source_revision_item_id,
  topic,
  content,
  status,
  attempt_number,
  submitted_at,
  validated_at,
  validated_by,
  lecturer_note,
  created_at,
  updated_at,
  updated_by
)
```

Indexes:

```text
guidance_materials(guidance_workflow_id)
guidance_materials(status)
guidance_materials(validated_by)
guidance_workflows(student_id, guidance_type)
guidance_workflows(guidance_type, guidance_status)
```

Backward compatibility:

- Keep `stage_id` in `guidance_workflows` during Task 55.
- Make `guidance_type` non-null only after backfill is verified.
- Do not drop `guidance_sessions` or `guidance_chats`.

## Repository Boundary For Task 56

New repository shape:

```ts
interface GuidanceRequestRepository {
  listForStudent(studentId: string): Awaitable<GuidanceRequest[]>;
  getForStudent(studentId: string, guidanceRequestId: string): Awaitable<GuidanceRequest | null>;
  createForStudent(studentId: string, input: CreateGuidanceRequestInput): Awaitable<GuidanceRequest>;
  listForLecturer(lecturerId: string): Awaitable<GuidanceRequest[]>;
  validateRequest(guidanceRequestId: string, input: ValidateGuidanceRequestInput): Awaitable<GuidanceRequest | null>;
  listMaterials(guidanceRequestId: string): Awaitable<GuidanceMaterial[]>;
  submitMaterial(guidanceRequestId: string, input: SubmitGuidanceMaterialInput): Awaitable<GuidanceMaterial>;
  validateMaterial(materialId: string, input: ValidateGuidanceMaterialInput): Awaitable<GuidanceMaterial | null>;
}
```

Existing `StudentWorkflowRepository.getGuidance()` remains as compatibility until UI migration is complete.

## Frontend Boundary For Task 57

New frontend facade:

```text
guidanceRequestApi
lecturerGuidanceRequestApi
coordinatorGuidanceRequestApi
```

Initial migration target:

1. Student dashboard guidance panels use `guidanceType`.
2. Lecturer pages show pending guidance request validations.
3. Student material submission UI appears after guidance request is approved.
4. Valid material count replaces approved-session count for progress gates.

## QA Boundary

Minimum smoke checks after implementation:

1. Student submits `seminar-proposal` guidance request.
2. Lecturer rejects request and note is required.
3. Student resubmits or creates corrected request.
4. Lecturer approves request.
5. Student submits 8 normal materials.
6. Lecturer validates 7 materials and seminar gate remains locked.
7. Lecturer validates the 8th material and seminar gate unlocks.
8. Revision guidance material can be submitted from a revision item.
9. Rejected revision material can be resubmitted with incremented attempt number.
10. Coordinator can read but cannot validate guidance material.

## Recommended Next Task

```text
Task 55: PostgreSQL Migration Draft for Guidance Requests and Guidance Materials
```

Priority:

```text
Extra High
```

Reason:

The contract now requires `guidance_type` and `guidance_materials`. Without the migration draft, backend implementation would keep forcing the PDF flow into the old two-stage/session model.

## Not Included In Task 54

Task 54 is a contract revision only. It does not change runtime backend routes, repositories, database migrations, or frontend UI.

