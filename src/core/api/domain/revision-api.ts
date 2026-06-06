import type { RevisiData } from "../../../features/student/types/revisi";
import { revisiService } from "../../../features/student/services/revisi-service";
import { apiClient, mockApiAdapter } from "../api-client";

export type RevisionStage = "revisi-proposal" | "revisi-sidang";

export interface UpdateRevisionItemStatusRequest {
  status: "pending" | "in progress" | "done";
}

export interface SubmitRevisionResolutionRequest {
  penyelesaian: string;
  penyelesaianLink: string;
}

export interface AddRevisionChatRequest {
  senderName: string;
  senderRole: "mahasiswa" | "dosen";
  message: string;
}

export interface UpdateRevisionApprovalRequest {
  role: "penguji1" | "penguji2" | "ketua-sidang";
  status: boolean | "pending" | "approved" | "rejected";
}

export interface UploadRevisionFinalFileRequest {
  fileName: string;
}

mockApiAdapter.register("GET", "/students/me/revisions/:stageId", ({ params }) => ({
  data: revisiService.getData(params.stageId as RevisionStage),
}));

mockApiAdapter.register<UpdateRevisionItemStatusRequest>(
  "PATCH",
  "/students/me/revisions/:stageId/items/:itemId/status",
  ({ body, params }) => ({
    data: revisiService.updateItemStatus(
      params.stageId as RevisionStage,
      Number(params.itemId),
      body?.status || "pending"
    ),
  })
);

mockApiAdapter.register<SubmitRevisionResolutionRequest>(
  "POST",
  "/students/me/revisions/:stageId/items/:itemId/submission",
  ({ body, params }) => ({
    data: revisiService.submitPenyelesaian(
      params.stageId as RevisionStage,
      Number(params.itemId),
      body?.penyelesaian || "",
      body?.penyelesaianLink || ""
    ),
  })
);

mockApiAdapter.register<AddRevisionChatRequest>(
  "POST",
  "/students/me/revisions/:stageId/items/:itemId/chats",
  ({ body, params }) => ({
    data: revisiService.addChatMessage(
      params.stageId as RevisionStage,
      Number(params.itemId),
      body?.senderName || "Mahasiswa",
      body?.senderRole || "mahasiswa",
      body?.message || ""
    ),
  })
);

mockApiAdapter.register<UpdateRevisionApprovalRequest>(
  "PATCH",
  "/students/me/revisions/:stageId/approval",
  ({ body, params }) => ({
    data: revisiService.updateApproval(
      params.stageId as RevisionStage,
      body?.role || "penguji1",
      body?.status ?? false
    ),
  })
);

mockApiAdapter.register<UploadRevisionFinalFileRequest>(
  "POST",
  "/students/me/revisions/:stageId/final-file",
  ({ body, params }) => ({
    data: revisiService.uploadFinalFile(params.stageId as RevisionStage, body?.fileName || ""),
  })
);

mockApiAdapter.register("POST", "/students/me/revisions/:stageId/simulate-all-approved", ({ params }) => ({
  data: revisiService.simulateAllApproved(params.stageId as RevisionStage),
}));

mockApiAdapter.register("POST", "/students/me/revisions/:stageId/reset", ({ params }) => ({
  data: revisiService.reset(params.stageId as RevisionStage),
}));

export const revisionApi = {
  getCached(stageId: RevisionStage) {
    return revisiService.getData(stageId);
  },
  get(stageId: RevisionStage) {
    return apiClient.get<{ data: RevisiData }>(`/students/me/revisions/${stageId}`);
  },
  updateItemStatus(stageId: RevisionStage, itemId: number, status: UpdateRevisionItemStatusRequest["status"]) {
    return apiClient.patch<{ data: RevisiData }, UpdateRevisionItemStatusRequest>(
      `/students/me/revisions/${stageId}/items/${itemId}/status`,
      { status }
    );
  },
  submitResolution(stageId: RevisionStage, itemId: number, payload: SubmitRevisionResolutionRequest) {
    return apiClient.post<{ data: RevisiData }, SubmitRevisionResolutionRequest>(
      `/students/me/revisions/${stageId}/items/${itemId}/submission`,
      payload
    );
  },
  addChat(stageId: RevisionStage, itemId: number, payload: AddRevisionChatRequest) {
    return apiClient.post<{ data: RevisiData }, AddRevisionChatRequest>(
      `/students/me/revisions/${stageId}/items/${itemId}/chats`,
      payload
    );
  },
  updateApproval(stageId: RevisionStage, payload: UpdateRevisionApprovalRequest) {
    return apiClient.patch<{ data: RevisiData }, UpdateRevisionApprovalRequest>(
      `/students/me/revisions/${stageId}/approval`,
      payload
    );
  },
  uploadFinalFile(stageId: RevisionStage, fileName: string) {
    return apiClient.post<{ data: RevisiData }, UploadRevisionFinalFileRequest>(
      `/students/me/revisions/${stageId}/final-file`,
      { fileName }
    );
  },
  simulateAllApproved(stageId: RevisionStage) {
    return apiClient.post<{ data: RevisiData }>(
      `/students/me/revisions/${stageId}/simulate-all-approved`
    );
  },
  reset(stageId: RevisionStage) {
    return apiClient.post<{ data: RevisiData }>(`/students/me/revisions/${stageId}/reset`);
  },
};
