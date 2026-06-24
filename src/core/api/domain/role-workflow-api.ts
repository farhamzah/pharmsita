import type { StepId, StepStatus, StudentStep } from "../../../features/student/types/progress";
import type { BimbinganData } from "../../../features/student/types/bimbingan";
import type {
  RevisiData,
  RevisionCompletionGateStatus,
} from "../../../features/student/types/revisi";
import type { SidangData } from "../../../features/student/types/sidang";
import { bimbinganService } from "../../../features/student/services/bimbingan-service";
import { progressService } from "../../../features/student/services/progress-service";
import { revisiService } from "../../../features/student/services/revisi-service";
import { sidangService } from "../../../features/student/services/sidang-service";
import {
  loadInitialRequirements,
  loadStageRequirements,
  loadThesisSubmissions,
  saveInitialRequirements,
  saveStageRequirements,
  saveThesisSubmissions,
  type RequirementBundle,
  type ThesisSubmission,
} from "../../../features/student/services/student-workflow-service";
import { apiClient, mockApiAdapter } from "../api-client";
import {
  createEmptyGuidanceData,
  getGuidanceTypeForStage,
  mapGuidanceRequestToBimbinganData,
} from "./guidance-api";
import type {
  ApproveGuidanceRequest,
  ApproveSessionGuidanceRequest,
  GuidanceRequestAggregate,
  ValidateGuidanceMaterialPayload,
  ValidateGuidanceRequestPayload,
  UpdateGuidanceApprovalRequest,
} from "./guidance-api";
import type {
  ExamStage,
  UpdateExamAssessmentRequest,
  UpdateExamStatusRequest,
} from "./exam-api";
import type {
  RevisionStage,
  UpdateRevisionApprovalRequest,
  UpdateRevisionItemStatusRequest,
} from "./revision-api";
import { buildMockRevisionCompletionGateStatus } from "./revision-api";
import type { SaveRequirementBundleRequest } from "./student-workflow-api";

type RoleWorkflowResponse<TData> = {
  data: TData;
  meta?: {
    studentId?: string;
    scope?: string;
    lecturerId?: string;
    source?: string;
    stage?: string | null;
    q?: string | null;
    page?: number;
    limit?: number;
    total?: number;
    totalPages?: number;
    sortBy?: string;
    sortDir?: "asc" | "desc";
  };
};

export interface StudentDirectoryItem {
  id: string;
  name: string;
  identifier: string;
  email?: string;
  status: "Aktif" | "Nonaktif";
  nim?: string;
  programStudi?: string;
  angkatan?: string;
  kelas?: string;
  thesisTitle?: string;
  activeStepId?: StepId | null;
  activeStepLabel: string;
  activeStepStatus?: StepStatus | null;
  isCompleted: boolean;
  supervisor1Id?: string | null;
  supervisor1Name?: string;
  supervisor2Id?: string | null;
  supervisor2Name?: string;
  supervisorRole?: "pembimbing-1" | "pembimbing-2" | null;
}

export type CoordinatorLifecycleStageCode =
  | "UNREGISTERED"
  | "PROPOSAL_GUIDANCE"
  | "PROPOSAL_SEMINAR"
  | "PROPOSAL_REVISION"
  | "FINAL_GUIDANCE"
  | "FINAL_DEFENSE"
  | "FINAL_REVISION"
  | "COMPLETED";

export type StudentDirectorySortBy = "name" | "nim" | "stage" | "supervisor1";
export type SortDirection = "asc" | "desc";

export interface LecturerDirectoryItem {
  id: string;
  name: string;
  identifier: string;
  email?: string;
  status: "Aktif" | "Nonaktif";
  nidn?: string;
  expertise?: string;
  programStudi?: string;
  jabatan?: string;
  quotaLimit: number;
  p1Active: number;
  p2Active: number;
  completedCount: number;
}

export interface CoordinatorLifecycleSummaryItem {
  stageCode: string;
  stageName: string;
  lifecycleStatus: string;
  studentCount: number;
  activeThesisCount: number;
  completedThesisCount: number;
}

type ProgressUpdateRequest = {
  status: StepStatus;
};

type SupervisorAssignmentsUpdateRequest = {
  pembimbing1Id: string;
  pembimbing2Id: string;
  coordinatorNote?: string;
};

type LecturerQuotaUpdateRequest = {
  quotaLimit: number;
};

const postgresDemoStudentId =
  import.meta.env.VITE_DEMO_STUDENT_ID ||
  "00000000-0000-4000-8000-000000000001";
const uuidPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const resolveWorkflowStudentId = (studentId: string) => {
  if (import.meta.env.VITE_API_MODE === "http" && !uuidPattern.test(studentId)) {
    return postgresDemoStudentId;
  }

  return studentId;
};

const lecturerBase = (studentId: string) =>
  `/lecturer/students/${resolveWorkflowStudentId(studentId)}`;
const coordinatorBase = (studentId: string) =>
  `/coordinator/students/${resolveWorkflowStudentId(studentId)}`;
const pickGuidanceAggregate = (
  requests: GuidanceRequestAggregate[],
  studentId: string,
  stageId: string
) => {
  const resolvedStudentId = resolveWorkflowStudentId(studentId);
  const guidanceType = getGuidanceTypeForStage(stageId);

  return (
    requests.find(
      (request) =>
        request.guidanceType === guidanceType &&
        (request.studentId === resolvedStudentId || request.studentId === "mock_student")
    ) || null
  );
};

const createEmptyRoleGuidanceData = (stageId: string): BimbinganData => ({
  ...createEmptyGuidanceData(stageId),
  guidanceRequestId: undefined,
  guidanceType: getGuidanceTypeForStage(stageId),
  requestStatus: "Draft",
  guidanceStatus: "idle",
  guidanceRequestedAt: null,
  guidanceApprovedAt: null,
  guidanceNote: null,
  guidanceApprovalNote: null,
});

const mockStudentDirectory: StudentDirectoryItem[] = [
  {
    id: "10",
    name: "Alif Fikri",
    identifier: "10123001",
    nim: "10123001",
    status: "Aktif",
    thesisTitle: "Sistem Deteksi Anomali Jaringan IoT menggunakan Deep Learning",
    activeStepId: "bimbingan-pra-proposal",
    activeStepLabel: "Bimbingan Pra Proposal",
    activeStepStatus: "active",
    isCompleted: false,
    supervisor1Id: "mock_dosen",
    supervisor2Id: "2",
    supervisorRole: "pembimbing-1",
  },
  {
    id: "6",
    name: "Sisca Kaila",
    identifier: "887766554",
    nim: "887766554",
    status: "Aktif",
    thesisTitle: "Sistem Deteksi Intrusi Jaringan Nirkabel Terdistribusi",
    activeStepId: "sidang-proposal",
    activeStepLabel: "Seminar Proposal",
    activeStepStatus: "active",
    isCompleted: false,
    supervisor1Id: "mock_dosen",
    supervisor2Id: "3",
    supervisorRole: "pembimbing-1",
  },
  {
    id: "11",
    name: "Ratna Sari",
    identifier: "10123002",
    nim: "10123002",
    status: "Aktif",
    thesisTitle: "Pengembangan Aplikasi Monitoring Pasien Hipertensi",
    activeStepId: "sidang",
    activeStepLabel: "Sidang Akhir",
    activeStepStatus: "active",
    isCompleted: false,
    supervisor1Id: "3",
    supervisor2Id: "mock_dosen",
    supervisorRole: "pembimbing-2",
  },
  {
    id: "13",
    name: "Dewi Lestari",
    identifier: "10123004",
    nim: "10123004",
    status: "Aktif",
    thesisTitle: "Penerapan Metode Agile pada Pengembangan Sistem Informasi Akademik",
    activeStepId: "revisi-sidang",
    activeStepLabel: "Revisi Sidang",
    activeStepStatus: "active",
    isCompleted: false,
    supervisor1Id: "4",
    supervisor2Id: "5",
    supervisorRole: null,
  },
  {
    id: "9",
    name: "Hendra Setiawan",
    identifier: "121212121",
    nim: "121212121",
    status: "Aktif",
    thesisTitle: "Pengaruh Smartphone terhadap Prestasi Belajar",
    activeStepId: null,
    activeStepLabel: "Selesai",
    activeStepStatus: null,
    isCompleted: true,
    supervisor1Id: "mock_dosen",
    supervisor2Id: "2",
    supervisorRole: "pembimbing-1",
  },
];

const mockLecturerDirectory: LecturerDirectoryItem[] = [
  {
    id: "mock_dosen",
    name: "Dr. Budi Harto, M.Farm.",
    identifier: "dosen",
    email: "dosen@pharmsita.local",
    status: "Aktif",
    nidn: "221011401065",
    expertise: "Farmasetika",
    programStudi: "S1 Farmasi",
    jabatan: "Dosen Farmasetika",
    quotaLimit: 8,
    p1Active: 2,
    p2Active: 1,
    completedCount: 0,
  },
  {
    id: "mock_multi",
    name: "Dr. Multi Peran, M.Farm.",
    identifier: "multi",
    email: "multi@pharmsita.local",
    status: "Aktif",
    nidn: "221011401099",
    expertise: "Manajemen Farmasi",
    programStudi: "S1 Farmasi",
    jabatan: "Dosen Manajemen Farmasi",
    quotaLimit: 8,
    p1Active: 0,
    p2Active: 0,
    completedCount: 0,
  },
];

const mockCoordinatorLifecycleSummary: CoordinatorLifecycleSummaryItem[] = [
  {
    stageCode: "PROPOSAL_GUIDANCE",
    stageName: "Bimbingan Proposal",
    lifecycleStatus: "IN_PROGRESS",
    studentCount: 1,
    activeThesisCount: 1,
    completedThesisCount: 0,
  },
  {
    stageCode: "PROPOSAL_SEMINAR",
    stageName: "Seminar Proposal",
    lifecycleStatus: "IN_PROGRESS",
    studentCount: 1,
    activeThesisCount: 1,
    completedThesisCount: 0,
  },
  {
    stageCode: "FINAL_DEFENSE",
    stageName: "Sidang Akhir",
    lifecycleStatus: "IN_PROGRESS",
    studentCount: 1,
    activeThesisCount: 1,
    completedThesisCount: 0,
  },
  {
    stageCode: "FINAL_REVISION",
    stageName: "Revisi Sidang Akhir",
    lifecycleStatus: "IN_PROGRESS",
    studentCount: 1,
    activeThesisCount: 1,
    completedThesisCount: 0,
  },
  {
    stageCode: "COMPLETED",
    stageName: "Selesai",
    lifecycleStatus: "COMPLETED",
    studentCount: 1,
    activeThesisCount: 0,
    completedThesisCount: 1,
  },
];

const lifecycleStageToStepId: Partial<
  Record<CoordinatorLifecycleStageCode, StudentDirectoryItem["activeStepId"]>
> = {
  PROPOSAL_GUIDANCE: "bimbingan-pra-proposal",
  PROPOSAL_SEMINAR: "sidang-proposal",
  PROPOSAL_REVISION: "revisi-proposal",
  FINAL_GUIDANCE: "bimbingan-pra-sidang",
  FINAL_DEFENSE: "sidang",
  FINAL_REVISION: "revisi-sidang",
};

const filterMockStudentDirectoryByStage = (
  students: StudentDirectoryItem[],
  stage?: string | number | boolean | null
) => {
  if (!stage || typeof stage !== "string") {
    return students;
  }

  if (stage === "COMPLETED") {
    return students.filter((student) => student.isCompleted);
  }

  if (stage === "UNREGISTERED") {
    return students.filter(
      (student) =>
        !student.isCompleted &&
        (!student.activeStepId || student.activeStepId === "pendaftaran-ta")
    );
  }

  const activeStepId = lifecycleStageToStepId[stage as CoordinatorLifecycleStageCode];
  if (!activeStepId) {
    return students;
  }

  return students.filter((student) => student.activeStepId === activeStepId);
};

const filterMockStudentDirectoryBySearch = (
  students: StudentDirectoryItem[],
  q?: string | number | boolean | null
) => {
  if (!q || typeof q !== "string") {
    return students;
  }

  const normalized = q.trim().toLowerCase();
  if (!normalized) {
    return students;
  }

  return students.filter((student) =>
    [
      student.name,
      student.identifier,
      student.nim,
      student.email,
      student.thesisTitle,
      student.supervisor1Name,
      student.supervisor2Name,
    ]
      .filter(Boolean)
      .some((value) => String(value).toLowerCase().includes(normalized))
  );
};

const paginateMockStudentDirectory = (
  students: StudentDirectoryItem[],
  pageValue?: string | number | boolean | null,
  limitValue?: string | number | boolean | null
) => {
  const page = Math.max(1, Number(pageValue || 1) || 1);
  const limit = Math.max(1, Number(limitValue || 20) || 20);
  const total = students.length;
  const totalPages = Math.max(1, Math.ceil(total / limit));
  const start = (page - 1) * limit;

  return {
    data: students.slice(start, start + limit),
    meta: { page, limit, total, totalPages },
  };
};

const readMockSortValue = (
  student: StudentDirectoryItem,
  sortBy: StudentDirectorySortBy
) => {
  if (sortBy === "nim") return student.nim || student.identifier;
  if (sortBy === "stage") return student.activeStepLabel;
  if (sortBy === "supervisor1") return student.supervisor1Name || "";
  return student.name;
};

const sortMockStudentDirectory = (
  students: StudentDirectoryItem[],
  sortBy?: string | number | boolean | null,
  sortDir?: string | number | boolean | null
) => {
  const resolvedSortBy: StudentDirectorySortBy =
    sortBy === "nim" || sortBy === "stage" || sortBy === "supervisor1"
      ? sortBy
      : "name";
  const resolvedSortDir: SortDirection = sortDir === "desc" ? "desc" : "asc";
  const direction = resolvedSortDir === "desc" ? -1 : 1;

  return [...students].sort((left, right) => {
    const primary = readMockSortValue(left, resolvedSortBy).localeCompare(
      readMockSortValue(right, resolvedSortBy),
      "id",
      { numeric: true, sensitivity: "base" }
    );

    if (primary !== 0) {
      return primary * direction;
    }

    return left.name.localeCompare(right.name, "id", {
      numeric: true,
      sensitivity: "base",
    });
  });
};

mockApiAdapter.register("GET", "/lecturer/students", () => ({
  data: mockStudentDirectory,
  meta: { scope: "lecturer", lecturerId: "mock_dosen" },
}));

mockApiAdapter.register("GET", "/lecturer/students/:studentId/progress", ({ params }) => ({
  data: progressService.getSteps(),
  meta: { studentId: params.studentId },
}));

mockApiAdapter.register("GET", "/lecturer/students/:studentId/guidance/:stageId", ({ params }) => ({
  data: bimbinganService.getBimbinganData(params.stageId),
  meta: { studentId: params.studentId },
}));

mockApiAdapter.register<UpdateGuidanceApprovalRequest>(
  "PATCH",
  "/lecturer/students/:studentId/guidance/:stageId/approval",
  ({ body, params }) => ({
    data: bimbinganService.updateApproval(
      params.stageId,
      body?.pembimbingNum || 1,
      !!body?.approved
    ),
  })
);

mockApiAdapter.register<ApproveGuidanceRequest>(
  "PATCH",
  "/lecturer/students/:studentId/guidance/:stageId/request",
  ({ body, params }) => ({
    data: bimbinganService.approveGuidance(
      params.stageId,
      body?.startDate || "",
      body?.startTime || "",
      body?.approvalNote || ""
    ),
  })
);

mockApiAdapter.register<ApproveSessionGuidanceRequest>(
  "PATCH",
  "/lecturer/students/:studentId/guidance/:stageId/sessions/:sessionId/approval",
  ({ body, params }) => ({
    data: bimbinganService.approveSessionGuidance(
      params.stageId,
      Number(params.sessionId),
      body?.startDate || "",
      body?.startTime || ""
    ),
  })
);

mockApiAdapter.register("GET", "/lecturer/students/:studentId/exams/:stageId", ({ params }) => ({
  data: sidangService.getData(params.stageId as ExamStage),
  meta: { studentId: params.studentId },
}));

mockApiAdapter.register<UpdateExamAssessmentRequest>(
  "PATCH",
  "/lecturer/students/:studentId/exams/:stageId/assessment",
  ({ body, params }) => ({
    data: sidangService.updateAssessment(
      params.stageId as ExamStage,
      body?.grade ?? null,
      body?.resultStatus || "belum-dinilai"
    ),
  })
);

mockApiAdapter.register("GET", "/lecturer/students/:studentId/revisions/:stageId", ({ params }) => ({
  data: revisiService.getData(params.stageId as RevisionStage),
  meta: { studentId: params.studentId },
}));

mockApiAdapter.register("GET", "/lecturer/students/:studentId/revisions/:stageId/completion-gate", ({ params }) => ({
  data: buildMockRevisionCompletionGateStatus(revisiService.getData(params.stageId as RevisionStage)),
  meta: { studentId: params.studentId },
}));

mockApiAdapter.register<UpdateRevisionItemStatusRequest>(
  "PATCH",
  "/lecturer/students/:studentId/revisions/:stageId/items/:itemId/status",
  ({ body, params }) => ({
    data: revisiService.updateItemStatus(
      params.stageId as RevisionStage,
      Number(params.itemId),
      body?.status || "pending"
    ),
  })
);

mockApiAdapter.register<UpdateRevisionApprovalRequest>(
  "PATCH",
  "/lecturer/students/:studentId/revisions/:stageId/approval",
  ({ body, params }) => ({
    data: revisiService.updateApproval(
      params.stageId as RevisionStage,
      body?.role || "penguji1",
      body?.status ?? false
    ),
  })
);

const registerCoordinatorMockRoutes = (prefix: "/coordinator" | "/kordinator") => {
  mockApiAdapter.register("GET", `${prefix}/lecturers`, () => ({
    data: mockLecturerDirectory,
    meta: { scope: prefix.replace("/", "") },
  }));

  mockApiAdapter.register<LecturerQuotaUpdateRequest>(
    "PATCH",
    `${prefix}/lecturers/:lecturerId/quota`,
    ({ body, params }) => {
      const lecturer = mockLecturerDirectory.find(
        (item) => item.id === params.lecturerId
      );

      if (lecturer && typeof body?.quotaLimit === "number") {
        lecturer.quotaLimit = body.quotaLimit;
      }

      return {
        data: lecturer || null,
        meta: { lecturerId: params.lecturerId },
      };
    }
  );

  mockApiAdapter.register("GET", `${prefix}/students`, ({ query }) => {
    const filtered = filterMockStudentDirectoryBySearch(
      filterMockStudentDirectoryByStage(mockStudentDirectory, query?.stage),
      query?.q
    );
    const sorted = sortMockStudentDirectory(filtered, query?.sortBy, query?.sortDir);
    const paged = paginateMockStudentDirectory(sorted, query?.page, query?.limit);

    return {
      data: paged.data,
      meta: {
        ...paged.meta,
        scope: prefix.replace("/", ""),
        stage: query?.stage || null,
        q: query?.q || null,
        sortBy: query?.sortBy || "name",
        sortDir: query?.sortDir === "desc" ? "desc" : "asc",
      },
    };
  });

  mockApiAdapter.register("GET", `${prefix}/reports/lifecycle-summary`, () => ({
    data: mockCoordinatorLifecycleSummary,
    meta: {
      scope: prefix.replace("/", ""),
      source: "canonical_coordinator_reporting_summary",
    },
  }));

  mockApiAdapter.register<SupervisorAssignmentsUpdateRequest>(
    "PATCH",
    `${prefix}/students/:studentId/supervisor-assignments`,
    ({ body, params }) => ({
      data: {
        id: `mock_registration_${params.studentId}`,
        studentId: params.studentId,
        status: "Disetujui",
        supervisorAssignments: [
          {
            id: "mock_assignment_1",
            lecturerId: body?.pembimbing1Id,
            supervisorOrder: 1,
            lecturerName:
              mockLecturerDirectory.find((item) => item.id === body?.pembimbing1Id)?.name ||
              "Pembimbing 1",
            status: "Aktif",
            assignedAt: new Date().toISOString(),
          },
          {
            id: "mock_assignment_2",
            lecturerId: body?.pembimbing2Id,
            supervisorOrder: 2,
            lecturerName:
              mockLecturerDirectory.find((item) => item.id === body?.pembimbing2Id)?.name ||
              "Pembimbing 2",
            status: "Aktif",
            assignedAt: new Date().toISOString(),
          },
        ],
      },
      meta: { studentId: params.studentId },
    })
  );

  mockApiAdapter.register("GET", `${prefix}/students/:studentId/progress`, ({ params }) => ({
    data: progressService.getSteps(),
    meta: { studentId: params.studentId },
  }));

  mockApiAdapter.register<ProgressUpdateRequest>(
    "PATCH",
    `${prefix}/students/:studentId/progress/:stepId`,
    ({ body, params }) => ({
      data: progressService.updateStepStatus(
        params.stepId as StepId,
        body?.status || "active"
      ),
    })
  );

  mockApiAdapter.register("GET", `${prefix}/students/:studentId/requirements/initial`, ({ params }) => ({
    data: loadInitialRequirements(),
    meta: { studentId: params.studentId },
  }));

  mockApiAdapter.register<SaveRequirementBundleRequest>(
    "PUT",
    `${prefix}/students/:studentId/requirements/initial`,
    ({ body }) => ({
      data: saveInitialRequirements(body?.requirements || [], body?.driveLink || ""),
    })
  );

  mockApiAdapter.register("GET", `${prefix}/students/:studentId/requirements/stages/:stageId`, ({ params }) => ({
    data: loadStageRequirements(params.stageId, []),
    meta: { studentId: params.studentId },
  }));

  mockApiAdapter.register<SaveRequirementBundleRequest>(
    "PUT",
    `${prefix}/students/:studentId/requirements/stages/:stageId`,
    ({ body, params }) => ({
      data: saveStageRequirements(
        params.stageId,
        body?.requirements || [],
        body?.driveLink || ""
      ),
    })
  );

  mockApiAdapter.register("GET", `${prefix}/students/:studentId/thesis-submissions`, ({ params }) => ({
    data: loadThesisSubmissions(),
    meta: { studentId: params.studentId },
  }));

  mockApiAdapter.register<ThesisSubmission[]>(
    "PUT",
    `${prefix}/students/:studentId/thesis-submissions`,
    ({ body }) => ({
      data: saveThesisSubmissions(body || []),
    })
  );

  mockApiAdapter.register("GET", `${prefix}/students/:studentId/guidance/:stageId`, ({ params }) => ({
    data: bimbinganService.getBimbinganData(params.stageId),
    meta: { studentId: params.studentId },
  }));

  mockApiAdapter.register("GET", `${prefix}/students/:studentId/exams/:stageId`, ({ params }) => ({
    data: sidangService.getData(params.stageId as ExamStage),
    meta: { studentId: params.studentId },
  }));

  mockApiAdapter.register<UpdateExamStatusRequest>(
    "PATCH",
    `${prefix}/students/:studentId/exams/:stageId/status`,
    ({ body, params }) => ({
      data: sidangService.updateStatus(
        params.stageId as ExamStage,
        body?.status || "belum-daftar"
      ),
    })
  );

  mockApiAdapter.register("GET", `${prefix}/students/:studentId/revisions/:stageId`, ({ params }) => ({
    data: revisiService.getData(params.stageId as RevisionStage),
    meta: { studentId: params.studentId },
  }));

  mockApiAdapter.register("GET", `${prefix}/students/:studentId/revisions/:stageId/completion-gate`, ({ params }) => ({
    data: buildMockRevisionCompletionGateStatus(revisiService.getData(params.stageId as RevisionStage)),
    meta: { studentId: params.studentId },
  }));
};

registerCoordinatorMockRoutes("/coordinator");
registerCoordinatorMockRoutes("/kordinator");

export const lecturerWorkflowApi = {
  listStudents() {
    return apiClient.get<RoleWorkflowResponse<StudentDirectoryItem[]>>(
      "/lecturer/students"
    );
  },
  getProgress(studentId: string) {
    return apiClient.get<RoleWorkflowResponse<StudentStep[]>>(
      `${lecturerBase(studentId)}/progress`
    );
  },
  getGuidance(studentId: string, stageId: string) {
    return apiClient.get<RoleWorkflowResponse<BimbinganData>>(
      `${lecturerBase(studentId)}/guidance/${stageId}`
    );
  },
  async getGuidanceAggregate(studentId: string, stageId: string) {
    const response = await apiClient.get<RoleWorkflowResponse<GuidanceRequestAggregate[]>>(
      "/lecturer/guidance-requests"
    );
    const request = pickGuidanceAggregate(response.data, studentId, stageId);

    return {
      data: request
        ? mapGuidanceRequestToBimbinganData(request)
        : createEmptyRoleGuidanceData(stageId),
      meta: response.meta,
    };
  },
  async getGuidanceRequestAggregate(studentId: string, stageId: string) {
    const response = await apiClient.get<RoleWorkflowResponse<GuidanceRequestAggregate[]>>(
      "/lecturer/guidance-requests"
    );
    return {
      data: pickGuidanceAggregate(response.data, studentId, stageId),
      meta: response.meta,
    };
  },
  async validateGuidanceRequest(
    guidanceRequestId: string,
    payload: ValidateGuidanceRequestPayload
  ) {
    const response = await apiClient.patch<
      { data: GuidanceRequestAggregate },
      ValidateGuidanceRequestPayload
    >(`/lecturer/guidance-requests/${guidanceRequestId}/validation`, payload);

    return { data: mapGuidanceRequestToBimbinganData(response.data) };
  },
  async validateGuidanceMaterial(
    guidanceRequestId: string,
    materialId: string,
    payload: ValidateGuidanceMaterialPayload
  ) {
    await apiClient.patch<{ data: unknown }, ValidateGuidanceMaterialPayload>(
      `/lecturer/guidance-requests/${guidanceRequestId}/materials/${materialId}/validation`,
      payload
    );
    const detail = await apiClient.get<{ data: GuidanceRequestAggregate }>(
      `/lecturer/guidance-requests/${guidanceRequestId}`
    );

    return { data: mapGuidanceRequestToBimbinganData(detail.data) };
  },
  updateGuidanceApproval(
    studentId: string,
    stageId: string,
    payload: UpdateGuidanceApprovalRequest
  ) {
    return apiClient.patch<RoleWorkflowResponse<BimbinganData>, UpdateGuidanceApprovalRequest>(
      `${lecturerBase(studentId)}/guidance/${stageId}/approval`,
      payload
    );
  },
  approveGuidanceRequest(
    studentId: string,
    stageId: string,
    payload: ApproveGuidanceRequest
  ) {
    return apiClient.patch<RoleWorkflowResponse<BimbinganData>, ApproveGuidanceRequest>(
      `${lecturerBase(studentId)}/guidance/${stageId}/request`,
      payload
    );
  },
  approveSessionGuidance(
    studentId: string,
    stageId: string,
    sessionId: number,
    payload: ApproveSessionGuidanceRequest
  ) {
    return apiClient.patch<RoleWorkflowResponse<BimbinganData>, ApproveSessionGuidanceRequest>(
      `${lecturerBase(studentId)}/guidance/${stageId}/sessions/${sessionId}/approval`,
      payload
    );
  },
  getExam(studentId: string, stageId: ExamStage) {
    return apiClient.get<RoleWorkflowResponse<SidangData>>(
      `${lecturerBase(studentId)}/exams/${stageId}`
    );
  },
  updateExamAssessment(
    studentId: string,
    stageId: ExamStage,
    payload: UpdateExamAssessmentRequest
  ) {
    return apiClient.patch<RoleWorkflowResponse<SidangData>, UpdateExamAssessmentRequest>(
      `${lecturerBase(studentId)}/exams/${stageId}/assessment`,
      payload
    );
  },
  getRevision(studentId: string, stageId: RevisionStage) {
    return apiClient.get<RoleWorkflowResponse<RevisiData>>(
      `${lecturerBase(studentId)}/revisions/${stageId}`
    );
  },
  getRevisionCompletionGate(studentId: string, stageId: RevisionStage) {
    return apiClient.get<RoleWorkflowResponse<RevisionCompletionGateStatus>>(
      `${lecturerBase(studentId)}/revisions/${stageId}/completion-gate`
    );
  },
  updateRevisionItemStatus(
    studentId: string,
    stageId: RevisionStage,
    itemId: number,
    status: UpdateRevisionItemStatusRequest["status"]
  ) {
    return apiClient.patch<RoleWorkflowResponse<RevisiData>, UpdateRevisionItemStatusRequest>(
      `${lecturerBase(studentId)}/revisions/${stageId}/items/${itemId}/status`,
      { status }
    );
  },
  updateRevisionApproval(
    studentId: string,
    stageId: RevisionStage,
    payload: UpdateRevisionApprovalRequest
  ) {
    return apiClient.patch<RoleWorkflowResponse<RevisiData>, UpdateRevisionApprovalRequest>(
      `${lecturerBase(studentId)}/revisions/${stageId}/approval`,
      payload
    );
  },
};

export const coordinatorWorkflowApi = {
  listLecturers() {
    return apiClient.get<RoleWorkflowResponse<LecturerDirectoryItem[]>>(
      "/coordinator/lecturers"
    );
  },
  updateLecturerQuota(lecturerId: string, payload: LecturerQuotaUpdateRequest) {
    return apiClient.patch<RoleWorkflowResponse<LecturerDirectoryItem>, LecturerQuotaUpdateRequest>(
      `/coordinator/lecturers/${lecturerId}/quota`,
      payload
    );
  },
  listStudents(
    options: {
      stage?: CoordinatorLifecycleStageCode | null;
      q?: string | null;
      page?: number;
      limit?: number;
      sortBy?: StudentDirectorySortBy;
      sortDir?: SortDirection;
    } = {}
  ) {
    return apiClient.get<RoleWorkflowResponse<StudentDirectoryItem[]>>(
      "/coordinator/students",
      {
        stage: options.stage || undefined,
        q: options.q || undefined,
        page: options.page,
        limit: options.limit,
        sortBy: options.sortBy,
        sortDir: options.sortDir,
      }
    );
  },
  getLifecycleSummary() {
    return apiClient.get<RoleWorkflowResponse<CoordinatorLifecycleSummaryItem[]>>(
      "/coordinator/reports/lifecycle-summary"
    );
  },
  updateSupervisorAssignments(
    studentId: string,
    payload: SupervisorAssignmentsUpdateRequest
  ) {
    return apiClient.patch<RoleWorkflowResponse<unknown>, SupervisorAssignmentsUpdateRequest>(
      `${coordinatorBase(studentId)}/supervisor-assignments`,
      payload
    );
  },
  getProgress(studentId: string) {
    return apiClient.get<RoleWorkflowResponse<StudentStep[]>>(
      `${coordinatorBase(studentId)}/progress`
    );
  },
  updateProgressStep(studentId: string, stepId: StepId, status: StepStatus) {
    return apiClient.patch<RoleWorkflowResponse<StudentStep[]>, ProgressUpdateRequest>(
      `${coordinatorBase(studentId)}/progress/${stepId}`,
      { status }
    );
  },
  getInitialRequirements(studentId: string) {
    return apiClient.get<RoleWorkflowResponse<RequirementBundle>>(
      `${coordinatorBase(studentId)}/requirements/initial`
    );
  },
  saveInitialRequirements(studentId: string, payload: SaveRequirementBundleRequest) {
    return apiClient.put<RoleWorkflowResponse<RequirementBundle>, SaveRequirementBundleRequest>(
      `${coordinatorBase(studentId)}/requirements/initial`,
      payload
    );
  },
  getStageRequirements(studentId: string, stageId: string) {
    return apiClient.get<RoleWorkflowResponse<RequirementBundle>>(
      `${coordinatorBase(studentId)}/requirements/stages/${stageId}`
    );
  },
  saveStageRequirements(
    studentId: string,
    stageId: string,
    payload: SaveRequirementBundleRequest
  ) {
    return apiClient.put<RoleWorkflowResponse<RequirementBundle>, SaveRequirementBundleRequest>(
      `${coordinatorBase(studentId)}/requirements/stages/${stageId}`,
      payload
    );
  },
  listThesisSubmissions(studentId: string) {
    return apiClient.get<RoleWorkflowResponse<ThesisSubmission[]>>(
      `${coordinatorBase(studentId)}/thesis-submissions`
    );
  },
  replaceThesisSubmissions(studentId: string, submissions: ThesisSubmission[]) {
    return apiClient.put<RoleWorkflowResponse<ThesisSubmission[]>, ThesisSubmission[]>(
      `${coordinatorBase(studentId)}/thesis-submissions`,
      submissions
    );
  },
  getGuidance(studentId: string, stageId: string) {
    return apiClient.get<RoleWorkflowResponse<BimbinganData>>(
      `${coordinatorBase(studentId)}/guidance/${stageId}`
    );
  },
  async getGuidanceAggregate(studentId: string, stageId: string) {
    const response = await apiClient.get<RoleWorkflowResponse<GuidanceRequestAggregate[]>>(
      `${coordinatorBase(studentId)}/guidance-requests`
    );
    const request = pickGuidanceAggregate(response.data, studentId, stageId);

    return {
      data: request
        ? mapGuidanceRequestToBimbinganData(request)
        : createEmptyRoleGuidanceData(stageId),
      meta: response.meta,
    };
  },
  async getGuidanceRequestAggregate(studentId: string, stageId: string) {
    const response = await apiClient.get<RoleWorkflowResponse<GuidanceRequestAggregate[]>>(
      `${coordinatorBase(studentId)}/guidance-requests`
    );
    return {
      data: pickGuidanceAggregate(response.data, studentId, stageId),
      meta: response.meta,
    };
  },
  getExam(studentId: string, stageId: ExamStage) {
    return apiClient.get<RoleWorkflowResponse<SidangData>>(
      `${coordinatorBase(studentId)}/exams/${stageId}`
    );
  },
  updateExamStatus(studentId: string, stageId: ExamStage, status: UpdateExamStatusRequest["status"]) {
    return apiClient.patch<RoleWorkflowResponse<SidangData>, UpdateExamStatusRequest>(
      `${coordinatorBase(studentId)}/exams/${stageId}/status`,
      { status }
    );
  },
  getRevision(studentId: string, stageId: RevisionStage) {
    return apiClient.get<RoleWorkflowResponse<RevisiData>>(
      `${coordinatorBase(studentId)}/revisions/${stageId}`
    );
  },
  getRevisionCompletionGate(studentId: string, stageId: RevisionStage) {
    return apiClient.get<RoleWorkflowResponse<RevisionCompletionGateStatus>>(
      `${coordinatorBase(studentId)}/revisions/${stageId}/completion-gate`
    );
  },
};
