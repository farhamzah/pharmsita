# UAT Scenario Matrix and Staging/VPS Execution Packet

Task: 190
Date: 2026-06-30 Asia/Jakarta
Baseline artifact: pharmsita-task189-fb1c9da
Baseline commit: fb1c9dafd03482f2752365ee50b93dab9479735b
Priority: Extra High
Status: READY FOR STAGING/CONTROLLED UAT PLANNING

## Purpose

This packet defines the UAT plan for PharmSITA across Admin, Mahasiswa, Dosen, and Koordinator.
It gives testers a controlled scenario matrix, expected results, data requirements, evidence rules,
and GO/BLOCKED criteria before the application is used by real users.

## UAT Boundary

PharmSITA must remain standalone for this UAT.
Do not connect this UAT to Core/Farmasi UBP account provisioning or other external core services.

UAT can start in a staging/VPS environment after deployment preflight passes.
Production approval still requires live VPS evidence, real domain/API, PostgreSQL backup/restore gate,
no-demo smoke, and final sign-off.

## UAT Readiness Gates

| Gate | Required For UAT | Status Before UAT |
| --- | --- | --- |
| Clean artifact with `dirty=false` | Yes | Use `pharmsita-task189-fb1c9da`. |
| Artifact checksum verification | Yes | Must be verified on VPS/staging. |
| PostgreSQL migration applied | Yes | Must PASS on target environment. |
| Production/staging env guard | Yes | Must PASS with no demo/local secret. |
| Admin bootstrap or approved admin account | Yes | Must be available before tester accounts are created. |
| UAT test users | Yes | Must be created through admin/user management or approved bootstrap flow. |
| UAT test data | Yes | Must be prepared before role workflow testing. |
| Backup and restore drill | Required for production-like VPS UAT | Must PASS before migration on shared/prod-like DB. |
| Domain/API health | Required for browser UAT | Must PASS against target URL. |

## UAT Accounts

Do not use demo seed accounts for production-like UAT.
Use these identifiers as naming policy only; passwords must be generated and shared through a secure
operator channel, not committed to Git.

| Account | Role | Purpose | Required State |
| --- | --- | --- | --- |
| `uat-admin` | Admin | User management, master data, profile review, audit visibility | Active, first-login completed |
| `uat-mahasiswa-001` | Mahasiswa | Full student workflow from profile to registration and guidance | Active, profile complete |
| `uat-mahasiswa-002` | Mahasiswa | Negative/blocked workflow and rejected validation evidence | Active, profile complete |
| `uat-dosen-001` | Dosen | Supervisor guidance, assessment, revision review | Active, quota available |
| `uat-dosen-002` | Dosen | Examiner/panelist and alternate supervisor checks | Active |
| `uat-koordinator` | Koordinator | Validation, schedule, reporting, directory, quota assignment | Active, profile complete |
| `uat-multirole-001` | Dosen + Koordinator | Optional multi-role switch/session regression | Active, both roles selectable |

## UAT Data Setup

Prepare these data records before scenario execution.

| Data Area | Minimum Data |
| --- | --- |
| Academic period | 1 active academic period for current UAT cycle |
| Thesis types | At least 2 active thesis types, including one used by `uat-mahasiswa-001` |
| Supporting documents | Initial registration documents, proposal seminar docs, final defense docs |
| Requirement definitions | Initial requirements plus stage-specific requirements for proposal and final defense |
| Lecturers | 2 active lecturers with quota and profile fields complete |
| Students | 2 active students with unique NIM and program study |
| Supervisor assignment | `uat-mahasiswa-001` linked to `uat-dosen-001`; second lecturer available as backup |
| Guidance materials | Valid Google Docs/link-like test URLs for 4 guidance types |
| Schedule slots | At least 1 available seminar proposal schedule and 1 final defense schedule |
| Revision notes | At least 2 revision notes for proposal/final defense validation |

## Evidence Rules

For every UAT scenario, capture:

- tester role and account identifier;
- target URL and API base URL;
- timestamp;
- screenshot or screen recording of the final state;
- API response or visible UI state when relevant;
- expected result versus actual result;
- PASS/FAIL/BLOCKED decision;
- issue ID or remediation note if failed.

Do not capture passwords, tokens, secret env values, or private student documents in screenshots.

## Scenario Matrix - Admin

| ID | Scenario | Steps | Expected Result | Evidence |
| --- | --- | --- | --- | --- |
| ADM-01 | Admin login and first profile completion | Login as `uat-admin`, complete required profile/password if prompted, reload page | Admin lands on admin dashboard; session persists; profile is complete | Dashboard screenshot and profile completion screenshot |
| ADM-02 | Create UAT users | Open admin user management, create or verify UAT users per role | Users are active with correct role and no duplicate identifier | User list screenshot filtered by `uat-` |
| ADM-03 | Edit role-specific profile fields | Edit Mahasiswa, Dosen, Koordinator, and Admin profile fields | Saved values persist after refresh and detail reopen | Before/after screenshot or API evidence |
| ADM-04 | Password reset flow | Reset password for one UAT user, login with temporary password, complete required update | User can login and is forced through safe completion path if configured | Reset confirmation and login evidence |
| ADM-05 | Master data update | Create/edit academic period, thesis type, supporting document, and requirement | Master data saves and is visible to student/coordinator flows | Master data screenshots |
| ADM-06 | Audit visibility | Open audit logs and relevant detail drawer | Audit list loads, detail payload is readable, sensitive data is not exposed | Audit list/detail screenshot |
| ADM-07 | RBAC negative check | Attempt to open student/lecturer/coordinator-only route as admin only where not allowed, or verify admin override where designed | Unauthorized paths are blocked; allowed override paths work as documented | URL and access result evidence |

## Scenario Matrix - Mahasiswa

| ID | Scenario | Steps | Expected Result | Evidence |
| --- | --- | --- | --- | --- |
| MHS-01 | Mahasiswa login and profile | Login as `uat-mahasiswa-001`, open profile, edit contact/student fields | Profile saves and persists after refresh | Profile screenshot |
| MHS-02 | Registration draft | Open Pendaftaran TA, select thesis type, title, supervisor request, save draft | Draft is saved and reloadable | Draft state screenshot |
| MHS-03 | Registration submit | Submit Pendaftaran TA with complete required fields | Status changes to waiting for Koordinator validation | Submit result screenshot |
| MHS-04 | Initial requirement upload/status | Open requirement section, attach test document/link for required items | Requirement records appear with pending/validation status | Requirement list screenshot |
| MHS-05 | Guidance request - proposal | Create bimbingan proposal material request with valid test link | Request appears as pending validation for assigned Dosen | Material request screenshot |
| MHS-06 | Guidance request - result/TA/final variants | Create requests for all 4 supported guidance types | Each type is accepted and visible with correct type label/status | Guidance type screenshots |
| MHS-07 | Proposal seminar submission | Attempt proposal seminar submission after prerequisites are met | Submission is accepted only when gate is complete | Gate/status screenshot |
| MHS-08 | Revision blocked state | Attempt final upload while revision material is not fully valid | System blocks completion and shows blocking reason | Blocking reason screenshot |
| MHS-09 | Final completion path | After Dosen/Koordinator approvals, refresh dashboard/progress | Progress advances to the expected active stage/completed state | Progress screenshot |
| MHS-10 | Logout/session guard | Logout, open protected Mahasiswa URL directly | User is redirected to login | Redirect evidence |

## Scenario Matrix - Dosen

| ID | Scenario | Steps | Expected Result | Evidence |
| --- | --- | --- | --- | --- |
| DSN-01 | Dosen login/profile | Login as `uat-dosen-001`, open profile, update lecturer fields | Profile persists after refresh | Profile screenshot |
| DSN-02 | Student list | Open Mahasiswa Bimbingan | Assigned student appears; unrelated student does not appear | List screenshot |
| DSN-03 | Guidance material validation | Open guidance request from `uat-mahasiswa-001`, approve one item and reject one item with note | Status and notes persist and appear to student | Validation screenshot |
| DSN-04 | Revision review | Review revision material/note and mark item valid/needs revision | Revision state updates and audit trail is visible where applicable | Revision detail screenshot |
| DSN-05 | Exam assessment | Open Jadwal/Penilaian, input assessment for assigned schedule | Assessment saves and status updates | Assessment screenshot |
| DSN-06 | RBAC negative check | Try to access coordinator/admin management URL | Access is denied or redirected | Access result evidence |

## Scenario Matrix - Koordinator

| ID | Scenario | Steps | Expected Result | Evidence |
| --- | --- | --- | --- | --- |
| KOR-01 | Koordinator login/profile | Login as `uat-koordinator`, open profile, update coordinator fields | Profile persists after refresh | Profile screenshot |
| KOR-02 | Validate TA registration | Open submitted registration from `uat-mahasiswa-001`, approve or reject with note | Status changes and student sees result | Validation screenshot |
| KOR-03 | Requirement validation | Open initial/stage requirements and validate one accepted and one rejected item | Status and validation notes persist | Requirement detail screenshot |
| KOR-04 | Supervisor assignment/quota | Assign/change supervisor and update quota | Assignment and quota save; student/dosen mapping updates | Assignment and quota screenshot |
| KOR-05 | Student directory search/filter/sort | Use monitoring directory with search, stage filter, pagination, sorting | Results match query; URL state persists | Directory screenshot and URL |
| KOR-06 | Deep link/share link | Copy/share a monitoring URL and open in fresh tab/session | Same filter/search/page/sort state loads | Shared URL evidence |
| KOR-07 | Schedule proposal/final exam | Create/update seminar/final defense schedule | Schedule appears for student and involved lecturer | Schedule screenshot |
| KOR-08 | Lifecycle reporting | Open coordinator lifecycle summary and drill into student detail | Summary counts and drilldown are consistent | Summary/detail screenshot |
| KOR-09 | Completion gate visibility | Open revision/finalization completion gate status | Blocking reasons/audit are visible and understandable | Gate screenshot |
| KOR-10 | RBAC negative check | Try to access admin-only user management | Access is denied or redirected | Access result evidence |

## Cross-Role Workflow Scenario

Use this as the main end-to-end UAT path.

| Step | Actor | Action | Expected Result |
| --- | --- | --- | --- |
| 1 | Admin | Create/verify UAT users and master data | All test accounts/data active |
| 2 | Mahasiswa | Complete profile and submit Pendaftaran TA | Registration waits for Koordinator |
| 3 | Koordinator | Validate registration and assign supervisor | Thesis becomes active; supervisor mapping exists |
| 4 | Mahasiswa | Submit bimbingan material | Dosen receives pending item |
| 5 | Dosen | Validate bimbingan material | Student progress updates |
| 6 | Mahasiswa | Submit proposal seminar requirement | Request waits for Koordinator |
| 7 | Koordinator | Validate requirement and schedule seminar | Schedule visible to student/dosen |
| 8 | Dosen | Input assessment/revision notes | Revision or next stage is created |
| 9 | Mahasiswa | Upload/submit revision material | Dosen/Koordinator can review |
| 10 | Dosen/Koordinator | Approve revision/final gate | Stage advances or completion is allowed |
| 11 | Koordinator | Verify reporting and directory | Student state appears correctly in monitoring/reporting |

## Non-Functional UAT Checks

| ID | Check | Expected Result |
| --- | --- | --- |
| NF-01 | Page reload on protected route | Session survives if token valid; otherwise redirect to login |
| NF-02 | Browser back/forward on monitoring filters | URL state restores view |
| NF-03 | Responsive layout on laptop/tablet width | No overlapping text or unusable controls |
| NF-04 | Error feedback | API validation errors show clear user-facing message |
| NF-05 | Persistence | Saved profile/master/workflow changes survive refresh/re-login |
| NF-06 | No demo leakage | Demo banners/data/users are absent in staging/production-like UAT |
| NF-07 | Audit | Critical admin/workflow actions produce audit records |
| NF-08 | Performance sanity | Main screens load within acceptable staging network time and no obvious long blank state |

## Staging/VPS UAT Execution Packet

Before UAT starts, operator runs:

```bash
cd /var/www/pharmsita/current

npm run backend:check-production-env
npm run db:migrate:status
npm run smoke:production:no-demo -- --preflight-only --api-base-url "$API_BASE_URL"
```

If UAT is running after a fresh deployment, also attach:

```text
/tmp/pharmsita-cutover-drill/CUTOVER-DRILL.md
/tmp/pharmsita-cutover-drill/cutover-drill-report.json
releases/production-evidence-run/real-vps-evidence-run-result.json
```

## UAT Result Template

Use one row per scenario.

| Scenario ID | Tester | Role | Date/Time | Result | Evidence Path/Link | Issue/Note |
| --- | --- | --- | --- | --- | --- | --- |
| ADM-01 |  | Admin |  | PASS/FAIL/BLOCKED |  |  |
| MHS-01 |  | Mahasiswa |  | PASS/FAIL/BLOCKED |  |  |
| DSN-01 |  | Dosen |  | PASS/FAIL/BLOCKED |  |  |
| KOR-01 |  | Koordinator |  | PASS/FAIL/BLOCKED |  |  |

## GO/BLOCKED Rule

UAT may start when:

- target URL and API URL are known;
- tester accounts exist;
- PostgreSQL migrations are current;
- no-demo smoke preflight passes;
- admin can login;
- at least one Mahasiswa, Dosen, and Koordinator test account can login.

UAT is GO when:

- all Critical/High scenarios pass;
- Medium scenarios either pass or have accepted workaround;
- no data-loss, RBAC, auth, migration, or cross-role workflow blocker remains;
- UAT owner signs the result.

UAT is BLOCKED when:

- login fails for any primary role;
- saved data does not persist;
- role boundary leaks sensitive/admin access;
- Pendaftaran TA cannot complete from submit to coordinator validation;
- guidance/revision completion gate gives incorrect approval/blocking result;
- production/staging environment still uses demo/local secrets;
- migration/readiness/health check fails.

## Current Assessment

Based on Task 189, PharmSITA is ready for controlled staging/VPS UAT preparation.
It is not yet approved for production UAT/full launch until the target VPS/domain/database gates pass
without `--skip-network` and without `--skip-db`.
