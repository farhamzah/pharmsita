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

  mockApiAdapter.register("GET", `${prefix}/students`, () => ({
    data: mockStudentDirectory,
    meta: { scope: prefix.replace("/", "") },
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
  listStudents() {
    return apiClient.get<RoleWorkflowResponse<StudentDirectoryItem[]>>(
      "/coordinator/students"
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
