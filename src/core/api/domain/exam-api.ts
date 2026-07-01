import type {
  SidangData,
  SidangResultStatus,
  SidangStatus,
} from "../../../features/student/types/sidang";
import { sidangService } from "../../../features/student/services/sidang-service";
import { apiClient, mockApiAdapter } from "../api-client";

export type ExamStage = "sidang-proposal" | "sidang";
const isHttpMode = import.meta.env.VITE_API_MODE === "http";

export interface UpdateExamStatusRequest {
  status: SidangStatus;
}

export interface UpdateExamAssessmentRequest {
  grade: string | null;
  resultStatus: SidangResultStatus;
}

export interface ToggleExamRequirementRequest {
  requirementId: string;
}

export interface ToggleExamPanelistRequest {
  panelistId: string;
}

export interface UpdateExamDocsLinkRequest {
  link: string;
}

const createEmptyExamData = (stageId: ExamStage): SidangData => ({
  stageId,
  status: "belum-daftar",
  panelists: [],
  schedule: null,
  requirements: [],
  submittedAt: null,
  googleDocsLink: "",
  grade: null,
  resultStatus: "belum-dinilai",
  revisionNotes: [],
});

mockApiAdapter.register("GET", "/students/me/exams/:stageId", ({ params }) => ({
  data: sidangService.getData(params.stageId as ExamStage),
}));

mockApiAdapter.register<UpdateExamStatusRequest>(
  "PATCH",
  "/students/me/exams/:stageId/status",
  ({ body, params }) => ({
    data: sidangService.updateStatus(
      params.stageId as ExamStage,
      body?.status || "belum-daftar"
    ),
  })
);

mockApiAdapter.register<UpdateExamAssessmentRequest>(
  "PATCH",
  "/students/me/exams/:stageId/assessment",
  ({ body, params }) => ({
    data: sidangService.updateAssessment(
      params.stageId as ExamStage,
      body?.grade ?? null,
      body?.resultStatus || "belum-dinilai"
    ),
  })
);

mockApiAdapter.register<ToggleExamRequirementRequest>(
  "PATCH",
  "/students/me/exams/:stageId/requirements/toggle",
  ({ body, params }) => ({
    data: sidangService.toggleRequirement(
      params.stageId as ExamStage,
      body?.requirementId || ""
    ),
  })
);

mockApiAdapter.register<ToggleExamPanelistRequest>(
  "PATCH",
  "/students/me/exams/:stageId/panelists/toggle",
  ({ body, params }) => ({
    data: sidangService.togglePanelistApproval(
      params.stageId as ExamStage,
      body?.panelistId || ""
    ),
  })
);

mockApiAdapter.register<UpdateExamDocsLinkRequest>(
  "PATCH",
  "/students/me/exams/:stageId/docs-link",
  ({ body, params }) => ({
    data: sidangService.updateDocsLink(params.stageId as ExamStage, body?.link || ""),
  })
);

mockApiAdapter.register("POST", "/students/me/exams/:stageId/simulate-all-approved", ({ params }) => ({
  data: sidangService.simulateAllApproved(params.stageId as ExamStage),
}));

mockApiAdapter.register("POST", "/students/me/exams/:stageId/reset", ({ params }) => ({
  data: sidangService.reset(params.stageId as ExamStage),
}));

export const examApi = {
  getCached(stageId: ExamStage) {
    return isHttpMode ? createEmptyExamData(stageId) : sidangService.getData(stageId);
  },
  get(stageId: ExamStage) {
    return apiClient.get<{ data: SidangData }>(`/students/me/exams/${stageId}`);
  },
  updateStatus(stageId: ExamStage, status: SidangStatus) {
    return apiClient.patch<{ data: SidangData }, UpdateExamStatusRequest>(
      `/students/me/exams/${stageId}/status`,
      { status }
    );
  },
  updateAssessment(stageId: ExamStage, payload: UpdateExamAssessmentRequest) {
    return apiClient.patch<{ data: SidangData }, UpdateExamAssessmentRequest>(
      `/students/me/exams/${stageId}/assessment`,
      payload
    );
  },
  toggleRequirement(stageId: ExamStage, requirementId: string) {
    return apiClient.patch<{ data: SidangData }, ToggleExamRequirementRequest>(
      `/students/me/exams/${stageId}/requirements/toggle`,
      { requirementId }
    );
  },
  togglePanelistApproval(stageId: ExamStage, panelistId: string) {
    return apiClient.patch<{ data: SidangData }, ToggleExamPanelistRequest>(
      `/students/me/exams/${stageId}/panelists/toggle`,
      { panelistId }
    );
  },
  updateDocsLink(stageId: ExamStage, link: string) {
    return apiClient.patch<{ data: SidangData }, UpdateExamDocsLinkRequest>(
      `/students/me/exams/${stageId}/docs-link`,
      { link }
    );
  },
  simulateAllApproved(stageId: ExamStage) {
    return apiClient.post<{ data: SidangData }>(
      `/students/me/exams/${stageId}/simulate-all-approved`
    );
  },
  reset(stageId: ExamStage) {
    return apiClient.post<{ data: SidangData }>(`/students/me/exams/${stageId}/reset`);
  },
};
