import type { BimbinganData } from "../../../features/student/types/bimbingan";
import { bimbinganService } from "../../../features/student/services/bimbingan-service";
import { apiClient, mockApiAdapter } from "../api-client";

export interface UpdateGuidanceDocsLinkRequest {
  link: string;
}

export interface UpdateGuidanceApprovalRequest {
  pembimbingNum: 1 | 2;
  approved: boolean;
}

export interface UpdateGuidanceSessionRequest {
  title: string;
  status: "pending" | "in progress" | "approved";
}

export interface AddGuidanceChatRequest {
  senderName: string;
  senderRole: "mahasiswa" | "dosen";
  message: string;
}

export interface RequestGuidanceRequest {
  note: string;
}

export interface ApproveGuidanceRequest {
  startDate: string;
  startTime: string;
  approvalNote: string;
}

export interface ApproveSessionGuidanceRequest {
  startDate: string;
  startTime: string;
}

mockApiAdapter.register("GET", "/students/me/guidance/:stageId", ({ params }) => ({
  data: bimbinganService.getBimbinganData(params.stageId),
}));

mockApiAdapter.register<UpdateGuidanceDocsLinkRequest>(
  "PATCH",
  "/students/me/guidance/:stageId/docs-link",
  ({ body, params }) => ({
    data: bimbinganService.updateGoogleDocsLink(params.stageId, body?.link || ""),
  })
);

mockApiAdapter.register<UpdateGuidanceApprovalRequest>(
  "PATCH",
  "/students/me/guidance/:stageId/approval",
  ({ body, params }) => ({
    data: bimbinganService.updateApproval(
      params.stageId,
      body?.pembimbingNum || 1,
      !!body?.approved
    ),
  })
);

mockApiAdapter.register<UpdateGuidanceSessionRequest>(
  "PATCH",
  "/students/me/guidance/:stageId/sessions/:sessionId",
  ({ body, params }) => ({
    data: bimbinganService.updateSession(
      params.stageId,
      Number(params.sessionId),
      body?.title || "",
      body?.status || "pending"
    ),
  })
);

mockApiAdapter.register<AddGuidanceChatRequest>(
  "POST",
  "/students/me/guidance/:stageId/sessions/:sessionId/chats",
  ({ body, params }) => ({
    data: bimbinganService.addChatMessage(
      params.stageId,
      Number(params.sessionId),
      body?.senderName || "Mahasiswa",
      body?.senderRole || "mahasiswa",
      body?.message || ""
    ),
  })
);

mockApiAdapter.register<UpdateGuidanceDocsLinkRequest>(
  "POST",
  "/students/me/guidance/:stageId/final-file",
  ({ body, params }) => ({
    data: bimbinganService.uploadFinalFile(params.stageId, body?.link || ""),
  })
);

mockApiAdapter.register("POST", "/students/me/guidance/:stageId/reset", ({ params }) => ({
  data: bimbinganService.resetBimbinganData(params.stageId),
}));

mockApiAdapter.register<RequestGuidanceRequest>(
  "POST",
  "/students/me/guidance/:stageId/request",
  ({ body, params }) => ({
    data: bimbinganService.requestGuidance(params.stageId, body?.note || ""),
  })
);

mockApiAdapter.register<ApproveGuidanceRequest>(
  "PATCH",
  "/students/me/guidance/:stageId/request",
  ({ body, params }) => ({
    data: bimbinganService.approveGuidance(
      params.stageId,
      body?.startDate || "",
      body?.startTime || "",
      body?.approvalNote || ""
    ),
  })
);

mockApiAdapter.register("POST", "/students/me/guidance/:stageId/sessions/:sessionId/request", ({ params }) => ({
  data: bimbinganService.requestSessionGuidance(params.stageId, Number(params.sessionId)),
}));

mockApiAdapter.register<ApproveSessionGuidanceRequest>(
  "PATCH",
  "/students/me/guidance/:stageId/sessions/:sessionId/approval",
  ({ body, params }) => ({
    data: bimbinganService.approveSessionGuidance(
      params.stageId,
      Number(params.sessionId),
      body?.startDate || "",
      body?.startTime || ""
    ),
  })
);

mockApiAdapter.register("POST", "/students/me/guidance/:stageId/request/reset", ({ params }) => ({
  data: bimbinganService.resetGuidance(params.stageId),
}));

export const guidanceApi = {
  getCached(stageId: string) {
    return bimbinganService.getBimbinganData(stageId);
  },
  get(stageId: string) {
    return apiClient.get<{ data: BimbinganData }>(`/students/me/guidance/${stageId}`);
  },
  updateDocsLink(stageId: string, link: string) {
    return apiClient.patch<{ data: BimbinganData }, UpdateGuidanceDocsLinkRequest>(
      `/students/me/guidance/${stageId}/docs-link`,
      { link }
    );
  },
  updateApproval(stageId: string, pembimbingNum: 1 | 2, approved: boolean) {
    return apiClient.patch<{ data: BimbinganData }, UpdateGuidanceApprovalRequest>(
      `/students/me/guidance/${stageId}/approval`,
      { pembimbingNum, approved }
    );
  },
  updateSession(stageId: string, sessionId: number, payload: UpdateGuidanceSessionRequest) {
    return apiClient.patch<{ data: BimbinganData }, UpdateGuidanceSessionRequest>(
      `/students/me/guidance/${stageId}/sessions/${sessionId}`,
      payload
    );
  },
  addChat(stageId: string, sessionId: number, payload: AddGuidanceChatRequest) {
    return apiClient.post<{ data: BimbinganData }, AddGuidanceChatRequest>(
      `/students/me/guidance/${stageId}/sessions/${sessionId}/chats`,
      payload
    );
  },
  uploadFinalFile(stageId: string, fileName: string) {
    return apiClient.post<{ data: BimbinganData }, UpdateGuidanceDocsLinkRequest>(
      `/students/me/guidance/${stageId}/final-file`,
      { link: fileName }
    );
  },
  reset(stageId: string) {
    return apiClient.post<{ data: BimbinganData }>(`/students/me/guidance/${stageId}/reset`);
  },
  requestGuidance(stageId: string, note: string) {
    return apiClient.post<{ data: BimbinganData }, RequestGuidanceRequest>(
      `/students/me/guidance/${stageId}/request`,
      { note }
    );
  },
  approveGuidance(stageId: string, payload: ApproveGuidanceRequest) {
    return apiClient.patch<{ data: BimbinganData }, ApproveGuidanceRequest>(
      `/students/me/guidance/${stageId}/request`,
      payload
    );
  },
  requestSessionGuidance(stageId: string, sessionId: number) {
    return apiClient.post<{ data: BimbinganData }>(
      `/students/me/guidance/${stageId}/sessions/${sessionId}/request`
    );
  },
  approveSessionGuidance(stageId: string, sessionId: number, payload: ApproveSessionGuidanceRequest) {
    return apiClient.patch<{ data: BimbinganData }, ApproveSessionGuidanceRequest>(
      `/students/me/guidance/${stageId}/sessions/${sessionId}/approval`,
      payload
    );
  },
  resetGuidance(stageId: string) {
    return apiClient.post<{ data: BimbinganData }>(
      `/students/me/guidance/${stageId}/request/reset`
    );
  },
};
