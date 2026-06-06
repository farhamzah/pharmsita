import type { StepId, StepStatus, StudentStep } from "../../../features/student/types/progress";
import type { BimbinganData } from "../../../features/student/types/bimbingan";
import type { RevisiData } from "../../../features/student/types/revisi";
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
import type {
  ApproveGuidanceRequest,
  ApproveSessionGuidanceRequest,
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
import type { SaveRequirementBundleRequest } from "./student-workflow-api";

type RoleWorkflowResponse<TData> = {
  data: TData;
  meta?: {
    studentId: string;
  };
};

type ProgressUpdateRequest = {
  status: StepStatus;
};

const lecturerBase = (studentId: string) => `/lecturer/students/${studentId}`;
const coordinatorBase = (studentId: string) => `/coordinator/students/${studentId}`;

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
};

registerCoordinatorMockRoutes("/coordinator");
registerCoordinatorMockRoutes("/kordinator");

export const lecturerWorkflowApi = {
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
};
