import {
  loadInitialRequirements,
  loadStageRequirements,
  loadThesisSubmissions,
  saveInitialRequirements,
  saveStageRequirements,
  saveThesisSubmissions,
  type RequirementBundle,
  type RequirementItem,
  type ThesisSubmission,
} from "../../../features/student/services/student-workflow-service";
import { apiClient, mockApiAdapter } from "../api-client";

export interface SaveRequirementBundleRequest {
  requirements: RequirementItem[];
  driveLink: string;
}

mockApiAdapter.register("GET", "/students/me/requirements/initial", () => ({
  data: loadInitialRequirements(),
}));

mockApiAdapter.register<SaveRequirementBundleRequest>(
  "PUT",
  "/students/me/requirements/initial",
  ({ body }) => ({
    data: saveInitialRequirements(body?.requirements || [], body?.driveLink || ""),
  })
);

mockApiAdapter.register("GET", "/students/me/thesis-submissions", () => ({
  data: loadThesisSubmissions(),
}));

mockApiAdapter.register<ThesisSubmission[]>("PUT", "/students/me/thesis-submissions", ({ body }) => ({
  data: saveThesisSubmissions(body || []),
}));

export const studentWorkflowApi = {
  getInitialRequirements() {
    return apiClient.get<{ data: RequirementBundle }>("/students/me/requirements/initial");
  },
  saveInitialRequirements(payload: SaveRequirementBundleRequest) {
    return apiClient.put<{ data: RequirementBundle }, SaveRequirementBundleRequest>(
      "/students/me/requirements/initial",
      payload
    );
  },
  getStageRequirements(stageId: string, defaultRequirements: RequirementItem[]) {
    if (import.meta.env.VITE_API_MODE === "http") {
      return apiClient.get<{ data: RequirementBundle }>(
        `/students/me/requirements/stages/${stageId}`
      );
    }

    return Promise.resolve({
      data: loadStageRequirements(stageId, defaultRequirements),
    });
  },
  saveStageRequirements(
    stageId: string,
    payload: SaveRequirementBundleRequest
  ) {
    if (import.meta.env.VITE_API_MODE === "http") {
      return apiClient.put<{ data: RequirementBundle }, SaveRequirementBundleRequest>(
        `/students/me/requirements/stages/${stageId}`,
        payload
      );
    }

    return Promise.resolve({
      data: saveStageRequirements(stageId, payload.requirements, payload.driveLink),
    });
  },
  listThesisSubmissions() {
    return apiClient.get<{ data: ThesisSubmission[] }>("/students/me/thesis-submissions");
  },
  replaceThesisSubmissions(submissions: ThesisSubmission[]) {
    return apiClient.put<{ data: ThesisSubmission[] }, ThesisSubmission[]>(
      "/students/me/thesis-submissions",
      submissions
    );
  },
};
