# Canonical Reporting API Endpoint

## Task

Task 138: Canonical Reporting API Endpoint untuk Coordinator Lifecycle Summary

Prioritas: **Medium**

## Tujuan

Task ini menambahkan endpoint reporting khusus koordinator untuk membaca agregasi lifecycle canonical tanpa harus menghitung ulang dari daftar mahasiswa.

Endpoint:

```text
GET /api/v1/coordinator/reports/lifecycle-summary
GET /api/v1/kordinator/reports/lifecycle-summary
```

Sumber data PostgreSQL:

```text
canonical_coordinator_reporting_summary
```

## Response Contract

```ts
interface CoordinatorLifecycleSummaryItem {
  stageCode: string;
  stageName: string;
  lifecycleStatus: string;
  studentCount: number;
  activeThesisCount: number;
  completedThesisCount: number;
}
```

Response wrapper tetap mengikuti pola role workflow:

```json
{
  "data": [
    {
      "stageCode": "PROPOSAL_SEMINAR",
      "stageName": "Seminar Proposal",
      "lifecycleStatus": "IN_PROGRESS",
      "studentCount": 1,
      "activeThesisCount": 1,
      "completedThesisCount": 0
    }
  ],
  "meta": {
    "scope": "coordinator",
    "source": "canonical_coordinator_reporting_summary"
  }
}
```

## Permission

Endpoint menerima role dengan salah satu permission:

- `coordinator.monitoring.read`
- `coordinator.workflow.read`
- `workflow.override`

## Frontend Facade

`coordinatorWorkflowApi.getLifecycleSummary()` sudah tersedia dan mengembalikan:

```ts
RoleWorkflowResponse<CoordinatorLifecycleSummaryItem[]>
```

Mock adapter juga menyediakan response untuk mode non-HTTP.

## QA

Static checks:

- `npm.cmd run backend:check`
- `node --check tools/postgres-final-project-registration-smoke-test.mjs`
- `node --check tools/student-workflow-postgres-ui-http-qa.mjs`
- `node --check tools/create-release-bundle.mjs`

Smoke script PostgreSQL diperbarui untuk memastikan:

- Endpoint `/coordinator/reports/lifecycle-summary` tersedia.
- Response membaca canonical reporting view melalui `meta.source`.
- Stage canonical yang sudah maju, seperti `PROPOSAL_SEMINAR`, muncul dengan `studentCount >= 1`.

## Next Task

**Task 139: Coordinator Reporting Dashboard UI Integration untuk Lifecycle Summary**

Prioritas: **Medium**

Reason: endpoint reporting canonical sudah tersedia, tapi UI koordinator belum menampilkan ringkasan lifecycle dari endpoint tersebut. Integrasi UI akan membuat data canonical terlihat langsung di dashboard/monitoring koordinator.
