import type { StepId, StepStatus, StudentStep } from "../../../features/student/types/progress";
import { progressService } from "../../../features/student/services/progress-service";
import { apiClient, mockApiAdapter } from "../api-client";

export interface UpdateProgressRequest {
  status: StepStatus;
}

mockApiAdapter.register("GET", "/students/me/progress", () => ({
  data: progressService.getSteps(),
}));

mockApiAdapter.register<UpdateProgressRequest>(
  "PATCH",
  "/students/me/progress/:stepId",
  ({ body, params }) => ({
    data: progressService.updateStepStatus(params.stepId as StepId, body?.status || "active"),
  })
);

mockApiAdapter.register("POST", "/students/me/progress/reset", () => ({
  data: progressService.resetProgress(),
}));

export const progressApi = {
  getSteps() {
    return apiClient.get<{ data: StudentStep[] }>("/students/me/progress");
  },
  updateStepStatus(stepId: StepId, status: StepStatus) {
    return apiClient.patch<{ data: StudentStep[] }, UpdateProgressRequest>(
      `/students/me/progress/${stepId}`,
      { status }
    );
  },
  resetProgress() {
    return apiClient.post<{ data: StudentStep[] }>("/students/me/progress/reset");
  },
};
