# PharmSITA Full Workflow Alignment 26 Flows

Status: Task 53 alignment and technical backlog.

Date: 2026-06-07

Primary source:

- `docs/Alur Aplikasi PharmSITA.pdf`

Related existing planning:

- `docs/business-workflow-alignment-a-i.md`
- `docs/final-project-registration-contract.md`
- `docs/backend-contract-draft.md`
- `docs/postgresql-adapter-plan.md`

## Purpose

The PDF expands the previous A-I alignment into 26 full product flows. This document maps those flows to the current implementation and turns the gaps into a technical backlog for Task 54 onward.

Status legend:

- Done: implemented enough for the current HTTP/PostgreSQL MVP.
- Partial: some backend/frontend pieces exist, but the PDF flow is not fully represented.
- Needs Revision: implementation exists, but the model does not match the PDF flow and should be reshaped.
- Missing: no production-ready backend/frontend/data model yet.

## Executive Summary

The current PharmSITA implementation is strongest in the foundation layer:

- Auth, multi-role selection, first-login challenge.
- Final Project Registration aggregate.
- Coordinator validation and supervisor assignment.
- Lecturer and student directory for role workflows.
- Lecturer quota persistence.
- Basic progress, guidance, exam, and revision workflow persistence in PostgreSQL.

The largest mismatch is in the middle of the academic workflow:

- The PDF treats guidance as 4 guidance types, while the app still has 2 stage IDs.
- The PDF treats guidance progress as validated materials, while the app still centers on sessions and chats.
- Seminar Proposal and Final Defense need submission gates before scheduling.
- Revision completion needs coordinator validation as a separate submission.
- Scheduling needs conflict validation for lecturers, chair, room, date, and time.
- Assessment needs rubric scores: presentation, writing, and Q&A.
- Pimpinan role, archive, monitoring document, and reporting are still outside the current production model.

## Flow Alignment Table

| No | PDF Flow | Current status | Current implementation evidence | Main gap |
|---:|---|---|---|---|
| 1 | Login Sistem | Partial | `auth-routes.ts`, multi-role auth, first-login challenge, frontend login wizard | First-login biodata persistence is not complete; role `pimpinan` is missing. |
| 2 | Mengajukan Pendaftaran Tugas Akhir | Done | `final_project_registrations`, `/students/me/final-project-registration`, student UI integration | File resource is still link/reference based, not native upload storage. |
| 3 | Memvalidasi Pendaftaran Tugas Akhir | Done | `/coordinator/final-project-registrations/:id/validation`, `supervisor_assignments`, audit log | PDF says status becomes `TA Aktif`; current canonical status is `Disetujui`. UI label can map this. |
| 4 | Mengajukan Bimbingan | Needs Revision | `/students/me/guidance/:stageId/request`, `guidance_workflows` | Only 2 stages exist; PDF requires 4 guidance types and rejected status. |
| 5 | Memvalidasi Pengajuan Bimbingan | Needs Revision | Lecturer request approval route exists | No rejection flow, limited actor model for revision guidance, no guidance request list endpoint. |
| 6 | Mengajukan Materi Bimbingan | Missing | Current sessions/chats are not equivalent | Need `guidance_materials` entity for normal and revision guidance. |
| 7 | Memvalidasi Materi Bimbingan | Missing | No material validation route | Need lecturer validation to `Valid` or `Ditolak`, with attempt history. |
| 8 | Mengajukan Seminar Proposal | Needs Revision | `exams.stage_id = sidang-proposal`, student UI exists | Need separate seminar proposal submission gate and 8 valid material prerequisite. |
| 9 | Memvalidasi Seminar Proposal | Missing | Coordinator can read/update exam status, but no submission gate | Need coordinator validation entity before scheduling. |
| 10 | Mengajukan Sidang Akhir | Needs Revision | `exams.stage_id = sidang`, student UI exists | Need final defense submission gate after seminar proposal complete. |
| 11 | Memvalidasi Sidang Akhir | Missing | Coordinator exam status exists but not a submission validation flow | Need coordinator validation of final defense requirements and Google Docs progress. |
| 12 | Mengajukan Penyelesaian Revisi | Partial | `/students/me/revisions/:stageId/final-file` exists | Need explicit revision completion submission status `Menunggu Validasi Koordinator`. |
| 13 | Memvalidasi Penyelesaian Revisi | Needs Revision | Lecturer revision approval exists | PDF says coordinator validates completion; current final completion is mostly lecturer/chair based. |
| 14 | Mengelola Jadwal Seminar Proposal dan Sidang Akhir | Partial | Coordinator scheduling UI exists; exam schedule columns exist | No production schedule CRUD endpoint and no conflict validation. |
| 15 | Melihat Jadwal Seminar Proposal dan Sidang Akhir | Partial | Student/lecturer schedule UI surfaces exist | Need schedule list endpoints scoped by student and lecturer. |
| 16 | Memberikan Penilaian Seminar Proposal dan Sidang Akhir | Partial | Lecturer exam assessment can persist grade/result/revision notes | Backend lacks rubric scores for presentation, writing, and Q&A. |
| 17 | Memantau Mahasiswa Bimbingan | Partial | `/lecturer/students`, directory and workflow detail exist | Needs validated material count and Google Docs/document monitoring model. |
| 18 | Mengelola Program Studi | Missing | `student_profiles.program_studi` exists as text only | Need `study_programs` master table and admin CRUD. |
| 19 | Mengelola Periode Akademik | Done | `academic_periods` table, admin/master API | Needs UI QA and reporting usage, but model exists. |
| 20 | Mengelola Item Persyaratan | Partial | `requirement_definitions` table and admin/master API | Category names need alignment with PDF: Pendaftaran TA, Seminar Proposal, Sidang Akhir. |
| 21 | Mengelola Item Skema Tugas Akhir | Partial | `thesis_types.skema` exists | PDF describes scheme items as own managed category; current model folds scheme into thesis type. |
| 22 | Mengelola Akun | Partial | `users`, `user_roles`, admin users API, first-login auth | Admin user CRUD still needs full multi-role/profile management persistence. |
| 23 | Mengelola Kuota Bimbingan Dosen | Done | `lecturer_profiles.quota_limit`, `/coordinator/lecturers/:id/quota` | Needs dedicated UI E2E and admin RBAC QA. |
| 24 | Melihat Arsip Tugas Akhir | Missing | No archive aggregate | Need completed TA archive, search, filters, and detail endpoint. |
| 25 | Monitoring Dokumen Tugas Akhir | Partial | Coordinator/admin monitoring pages and workflow directory exist | Need production document monitoring model plus role `pimpinan`. |
| 26 | Melihat Laporan Tugas Akhir | Missing | No reporting aggregate/API | Need role `pimpinan`, report queries, filters, charts, and export boundary. |

## Domain Decisions

### 1. Canonical Status Mapping

The PDF says approval of Final Project Registration changes status to `TA Aktif`. Current backend uses `Disetujui`.

Decision:

- Keep `Disetujui` as stored registration status.
- UI may display `TA Aktif` for approved/active students.
- Student progress step `pendaftaran-ta` remains the workflow indicator.

### 2. Guidance Must Move From Session-Centric To Material-Centric

Current model:

- `guidance_workflows`
- `guidance_sessions`
- `guidance_chats`

PDF model:

- Guidance request activates a guidance type.
- Student submits materials/topics.
- Lecturer validates materials.
- 8 valid materials unlock seminar proposal or final defense.

Decision:

- Keep sessions/chats as support tools.
- Add `guidance_requests` or extend `guidance_workflows` with 4 `guidance_type` values.
- Add `guidance_materials` as the source of truth for progress count.

### 3. Seminar Proposal And Final Defense Need Submission Gates

Current model jumps toward `exams` for proposal/final defense.

PDF model requires:

- Student submission.
- Coordinator validation.
- Only then scheduling.

Decision:

- Add `seminar_proposal_submissions`.
- Add `final_defense_submissions`.
- Keep `exams` for schedule, panelists, assessment, and post-event result.

### 4. Revision Completion Is A Coordinator Validation Flow

Current model supports:

- Revision items.
- Student item submissions.
- Lecturer/chair approval.
- Final file upload.

PDF adds:

- Student submits revision completion.
- Coordinator validates completion.
- If accepted, progress moves to next stage.

Decision:

- Add `revision_completion_submissions`.
- Preserve lecturer item approvals as prerequisite.

### 5. Scheduling Needs Its Own Conflict Boundary

Current exam table can store schedule fields, but PDF requires conflict checking.

Decision:

- Introduce schedule CRUD around exams.
- Validate conflicts across:
  - Room.
  - Penguji 1.
  - Penguji 2.
  - Ketua Sidang.
  - Date/time overlap.

### 6. Pimpinan Role Is A New Product Boundary

PDF introduces `Pimpinan` for archive, monitoring, and reporting.

Decision:

- Add role `pimpinan`.
- Add permissions:
  - `leader.archive.read`
  - `leader.monitoring.read`
  - `leader.reporting.read`
- Add frontend route group only after backend RBAC is ready.

## Backlog From Task 54 Onward

| Task | Title | Priority | Reason |
|---:|---|---|---|
| 54 | Guidance Type Contract Revision for 4 PDF Guidance Types | Extra High | This is the biggest mismatch before seminar/sidang can be aligned. |
| 55 | PostgreSQL Migration Draft for Guidance Requests and Guidance Materials | Extra High | The current schema has no material entity, so progress cannot match PDF rules. |
| 56 | Backend Repository/API for Guidance Requests and Material Validation | Extra High | Required for student submission and lecturer validation of guidance. |
| 57 | Frontend Integration for 4 Guidance Types and Material Submission | High | UI must stop treating sessions as the primary progress source. |
| 58 | Seminar Proposal Submission Gate Contract and Schema | Extra High | PDF requires validation before scheduling proposal seminar. |
| 59 | Backend API for Seminar Proposal Submission and Coordinator Validation | Extra High | Needed to unlock scheduling and progress transition correctly. |
| 60 | Frontend Seminar Proposal Submission and Coordinator Validation UI | High | Student and coordinator screens need to follow the new gate. |
| 61 | Final Defense Submission Gate Contract and Schema | Extra High | Same gate pattern is required before Sidang Akhir scheduling. |
| 62 | Backend/API/UI for Final Defense Submission Validation | High | Connects Sidang Akhir flow to requirements and bimbingan progress. |
| 63 | Revision Completion Submission Contract and Coordinator Validation | High | PDF makes coordinator validation explicit after revision materials are valid. |
| 64 | Scheduling API with Conflict Validation for Room and Panelists | Extra High | Current scheduling lacks the most important safety rule in the PDF. |
| 65 | Lecturer Schedule and Assessment Rubric Persistence | High | Assessment needs presentasi, penulisan TA, tanya jawab, and revision notes. |
| 66 | Admin Master Data Expansion: Program Studi and Scheme Items | Medium | Required for full admin scope, but less blocking than workflow gates. |
| 67 | Admin Multi-Role Account/Profile Management Hardening | High | PDF requires admin to assign one or multiple roles reliably. |
| 68 | Pimpinan Role, Archive, Monitoring, and Reporting Contract | Medium | Important for complete product scope but after core academic workflow is stable. |
| 69 | Archive and Monitoring Document Backend/UI Implementation | Medium | Depends on completed workflow and document model. |
| 70 | Reporting Backend Queries and Pimpinan Dashboard | Medium | Depends on final data shape for submissions, schedules, assessments, and archive. |
| 71 | End-to-End QA for Full TA Lifecycle PDF Flow | Extra High | Needed after the new gates are implemented to prevent workflow regressions. |

## Recommended Next Task

Task 54 should be:

```text
Task 54: Guidance Type Contract Revision for 4 PDF Guidance Types
```

Priority:

```text
Extra High
```

Reason:

The current application still models guidance as two stages and session approvals, while the PDF requires four guidance types and material validation. This mismatch blocks correct implementation of Seminar Proposal, Sidang Akhir, Revisi Proposal, and Revisi Sidang flows.

Expected Task 54 output:

1. Domain type revision proposal.
2. API contract for student guidance requests.
3. API contract for lecturer validation.
4. Mapping from existing `bimbingan-pra-proposal` and `bimbingan-pra-sidang` to the four PDF guidance types.
5. Migration boundary for Task 55.

## Not Included In Task 53

No application code changes are included in this task. This is an alignment and backlog document only.

