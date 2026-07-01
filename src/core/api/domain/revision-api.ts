import type {
  RevisiData,
  RevisionCompletionGateStatus,
} from "../../../features/student/types/revisi";
import { revisiService } from "../../../features/student/services/revisi-service";
import { apiClient, mockApiAdapter } from "../api-client";

export type RevisionStage = "revisi-proposal" | "revisi-sidang";
const isHttpMode = import.meta.env.VITE_API_MODE === "http";

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

const createEmptyRevisionData = (stageId: RevisionStage): RevisiData => ({
  stageId,
  penguji1Approved: false,
  penguji2Approved: false,
  ketuaSidangStatus: "pending",
  items: [],
  finalFile: null,
  submittedAt: null,
});

export const buildMockRevisionCompletionGateStatus = (
  workflow: RevisiData
): RevisionCompletionGateStatus => {
  const doneCount = workflow.items.filter((item) => item.status === "done").length;
  const blockingReasonByCode: Record<RevisionCompletionGateStatus["checks"][number]["code"], string> = {
    REVISION_ITEMS_AVAILABLE: "Belum ada butir revisi yang bisa divalidasi.",
    REVISION_ITEMS_DONE: "Semua butir revisi harus berstatus selesai.",
    PENGUJI_1_APPROVED: "Approval Penguji 1 belum disetujui.",
    PENGUJI_2_APPROVED: "Approval Penguji 2 belum disetujui.",
    CHAIR_APPROVED: "Approval Ketua Sidang belum disetujui.",
    FINAL_FILE_UPLOADED: "Dokumen final hasil revisi belum diunggah.",
  };
  const checks: RevisionCompletionGateStatus["checks"] = [
    {
      code: "REVISION_ITEMS_AVAILABLE",
      label: "Butir revisi tersedia",
      passed: workflow.items.length > 0,
      detail:
        workflow.items.length > 0
          ? `${workflow.items.length} butir revisi tersedia`
          : "Belum ada butir revisi yang bisa divalidasi.",
      requiredFor: ["final-upload", "progress-completion"],
    },
    {
      code: "REVISION_ITEMS_DONE",
      label: "Semua butir revisi selesai",
      passed: workflow.items.length > 0 && workflow.items.every((item) => item.status === "done"),
      detail: `${doneCount}/${workflow.items.length} butir selesai`,
      requiredFor: ["final-upload", "progress-completion"],
    },
    {
      code: "PENGUJI_1_APPROVED",
      label: "Approval Penguji 1",
      passed: workflow.penguji1Approved,
      detail: workflow.penguji1Approved ? "Disetujui" : "Belum disetujui",
      requiredFor: ["final-upload", "progress-completion"],
    },
    {
      code: "PENGUJI_2_APPROVED",
      label: "Approval Penguji 2",
      passed: workflow.penguji2Approved,
      detail: workflow.penguji2Approved ? "Disetujui" : "Belum disetujui",
      requiredFor: ["final-upload", "progress-completion"],
    },
    {
      code: "CHAIR_APPROVED",
      label: "Approval Ketua Sidang",
      passed: workflow.ketuaSidangStatus === "approved",
      detail:
        workflow.ketuaSidangStatus === "approved"
          ? "Disetujui"
          : workflow.ketuaSidangStatus === "rejected"
            ? "Ditolak"
            : "Menunggu",
      requiredFor: ["final-upload", "progress-completion"],
    },
    {
      code: "FINAL_FILE_UPLOADED",
      label: "Dokumen final hasil revisi",
      passed: Boolean(workflow.finalFile),
      detail: workflow.finalFile || "Belum diunggah",
      requiredFor: ["progress-completion"],
    },
  ];
  const finalUploadBlockingReasons = checks
    .filter((check) => check.requiredFor.includes("final-upload") && !check.passed)
    .map((check) => blockingReasonByCode[check.code]);
  const progressCompletionBlockingReasons = checks
    .filter((check) => check.requiredFor.includes("progress-completion") && !check.passed)
    .map((check) => blockingReasonByCode[check.code]);

  return {
    stageId: workflow.stageId,
    readyForFinalUpload: finalUploadBlockingReasons.length === 0,
    readyForProgressCompletion: progressCompletionBlockingReasons.length === 0,
    finalFile: workflow.finalFile,
    finalUploadBlockingReasons,
    progressCompletionBlockingReasons,
    blockingReasons: progressCompletionBlockingReasons,
    checks,
    evaluatedAt: new Date().toISOString(),
  };
};

mockApiAdapter.register("GET", "/students/me/revisions/:stageId", ({ params }) => ({
  data: revisiService.getData(params.stageId as RevisionStage),
}));

mockApiAdapter.register("GET", "/students/me/revisions/:stageId/completion-gate", ({ params }) => ({
  data: buildMockRevisionCompletionGateStatus(revisiService.getData(params.stageId as RevisionStage)),
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
    return isHttpMode ? createEmptyRevisionData(stageId) : revisiService.getData(stageId);
  },
  get(stageId: RevisionStage) {
    return apiClient.get<{ data: RevisiData }>(`/students/me/revisions/${stageId}`);
  },
  getCompletionGate(stageId: RevisionStage) {
    return apiClient.get<{ data: RevisionCompletionGateStatus }>(
      `/students/me/revisions/${stageId}/completion-gate`
    );
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
