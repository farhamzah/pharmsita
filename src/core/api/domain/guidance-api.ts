import type {
  BimbinganData,
  BimbinganSession,
  GuidanceMaterial,
  GuidanceMaterialStatus,
  GuidanceRequestAggregate,
  GuidanceRequestStatus,
  GuidanceType,
} from "../../../features/student/types/bimbingan";
import { bimbinganService } from "../../../features/student/services/bimbingan-service";
import { apiClient, mockApiAdapter } from "../api-client";

export type {
  GuidanceMaterial,
  GuidanceMaterialStatus,
  GuidanceMaterialSummary,
  GuidanceRequestAggregate,
  GuidanceRequestStatus,
  GuidanceType,
} from "../../../features/student/types/bimbingan";

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

export interface SubmitGuidanceRequestPayload {
  guidanceType: GuidanceType;
  googleDocsLink: string;
  studentNote?: string;
}

export interface SubmitGuidanceMaterialRequest {
  materialType?: GuidanceMaterial["materialType"];
  sourceRevisionItemId?: string | null;
  topic: string;
  content?: string;
}

export interface ValidateGuidanceRequestPayload {
  status: Extract<GuidanceRequestStatus, "Disetujui" | "Ditolak">;
  catatanDosen?: string;
  lecturerNote?: string;
}

export interface ValidateGuidanceMaterialPayload {
  status: Extract<GuidanceMaterialStatus, "Valid" | "Ditolak">;
  catatanDosen?: string;
  lecturerNote?: string;
}

const isHttpMode = import.meta.env.VITE_API_MODE === "http";
const requiredValidMaterialCount = 8;
const guidanceTypeByStageId: Record<string, GuidanceType> = {
  "bimbingan-pra-proposal": "seminar-proposal",
  "bimbingan-pra-sidang": "sidang-akhir",
  "revisi-proposal": "revisi-seminar-proposal",
  "revisi-sidang": "revisi-sidang-akhir",
};
const stageIdByGuidanceType: Record<GuidanceType, string> = {
  "seminar-proposal": "bimbingan-pra-proposal",
  "sidang-akhir": "bimbingan-pra-sidang",
  "revisi-seminar-proposal": "revisi-proposal",
  "revisi-sidang-akhir": "revisi-sidang",
};

export const getGuidanceTypeForStage = (stageId: string): GuidanceType =>
  guidanceTypeByStageId[stageId] || "seminar-proposal";

export const getStageIdForGuidanceType = (guidanceType: GuidanceType): string =>
  stageIdByGuidanceType[guidanceType];

const createEmptyGuidanceSessions = (): BimbinganSession[] =>
  Array.from({ length: requiredValidMaterialCount }, (_, index) => ({
    id: index + 1,
    title: `Bimbingan ${index + 1} (Belum diisi)`,
    status: "pending",
    sessionStatus: "idle",
    sessionStartDate: null,
    sessionStartTime: null,
    chats: [],
  }));

export const createEmptyGuidanceData = (stageId: string): BimbinganData => ({
  stageId,
  guidanceType: getGuidanceTypeForStage(stageId),
  googleDocsLink: "",
  pembimbing1Approved: false,
  pembimbing2Approved: false,
  sessions: createEmptyGuidanceSessions(),
  finalFile: null,
  guidanceStatus: "idle",
  guidanceRequestedAt: null,
  guidanceApprovedAt: null,
  guidanceStartDate: null,
  guidanceTime: null,
  guidanceNote: null,
  guidanceApprovalNote: null,
});

const requestStatusToGuidanceStatus = (
  status: GuidanceRequestStatus
): BimbinganData["guidanceStatus"] => {
  if (status === "Menunggu Validasi Dosen") {
    return "requested";
  }

  if (status === "Disetujui") {
    return "approved";
  }

  return "idle";
};

const materialToSession = (material: GuidanceMaterial, index: number): BimbinganSession => {
  const isValid = material.status === "Valid";
  const isSubmitted = material.status === "Diajukan";
  const isRejected = material.status === "Ditolak";

  return {
    id: index + 1,
    title:
      material.topic ||
      (material.materialType === "revision"
        ? `Materi Revisi ${index + 1}`
        : `Materi Bimbingan ${index + 1}`),
    status: isValid ? "approved" : "pending",
    sessionStatus: isValid ? "approved" : isSubmitted ? "requested" : "idle",
    sessionStartDate: null,
    sessionStartTime: null,
    chats: material.content
      ? [
          {
            id: `${material.id}_content`,
            senderName: "Mahasiswa",
            senderRole: "mahasiswa",
            message: material.content,
            timestamp: material.submittedAt || material.createdAt || new Date().toISOString(),
          },
        ]
      : [],
    materialId: material.id,
    materialStatus: material.status,
    lecturerNote: material.lecturerNote,
    attemptNumber: material.attemptNumber,
    submittedAt: material.submittedAt,
    validatedAt: material.validatedAt,
    ...(isRejected ? { sessionStatus: "idle" as const } : {}),
  };
};

export const mapGuidanceRequestToBimbinganData = (
  request: GuidanceRequestAggregate
): BimbinganData => {
  const stageId = getStageIdForGuidanceType(request.guidanceType);
  const sortedMaterials = [...(request.materials || [])].sort((left, right) => {
    const leftTime = left.createdAt || left.submittedAt || left.id;
    const rightTime = right.createdAt || right.submittedAt || right.id;
    return leftTime.localeCompare(rightTime);
  });
  const materialSessions = sortedMaterials
    .slice(0, requiredValidMaterialCount)
    .map(materialToSession);
  const emptySessions = createEmptyGuidanceSessions().slice(materialSessions.length);
  const canSubmitNextGate =
    request.materialSummary?.canSubmitNextGate ||
    (request.materialSummary?.validCount || 0) >= requiredValidMaterialCount;

  return {
    ...createEmptyGuidanceData(stageId),
    guidanceRequestId: request.id,
    guidanceType: request.guidanceType,
    requestStatus: request.status,
    googleDocsLink: request.googleDocsLink,
    activeLecturerId: request.activeLecturerId,
    activeLecturerName: request.activeLecturerName,
    materialSummary: request.materialSummary,
    pembimbing1Approved: canSubmitNextGate,
    pembimbing2Approved: canSubmitNextGate,
    sessions: [...materialSessions, ...emptySessions].map((session, index) => ({
      ...session,
      id: index + 1,
    })),
    guidanceStatus: requestStatusToGuidanceStatus(request.status),
    guidanceRequestedAt: request.submittedAt || null,
    guidanceApprovedAt: request.status === "Disetujui" ? request.validatedAt || null : null,
    guidanceNote: request.studentNote || null,
    guidanceApprovalNote: request.lecturerNote || null,
  };
};

const mockGuidanceTypes: GuidanceType[] = [
  "seminar-proposal",
  "sidang-akhir",
  "revisi-seminar-proposal",
  "revisi-sidang-akhir",
];

const mockRequestId = (guidanceType: GuidanceType) => `mock_guidance_${guidanceType}`;
const mockMaterialId = (guidanceType: GuidanceType, sessionId: number) =>
  `mock_material_${guidanceType}_${sessionId}`;
const parseMockGuidanceType = (id: string): GuidanceType =>
  mockGuidanceTypes.find((guidanceType) => id === mockRequestId(guidanceType)) ||
  "seminar-proposal";
const parseMockMaterial = (materialId: string) => {
  const guidanceType =
    mockGuidanceTypes.find((type) => materialId.startsWith(`mock_material_${type}_`)) ||
    "seminar-proposal";
  const sessionId = Number(materialId.replace(`mock_material_${guidanceType}_`, "")) || 1;
  return { guidanceType, sessionId };
};

const toMockGuidanceRequest = (guidanceType: GuidanceType): GuidanceRequestAggregate => {
  const stageId = getStageIdForGuidanceType(guidanceType);
  const data = bimbinganService.getBimbinganData(stageId);
  const materials: GuidanceMaterial[] = data.sessions
    .filter(
      (session) =>
        session.status !== "pending" ||
        session.sessionStatus === "requested" ||
        !session.title.includes("Belum diisi")
    )
    .map((session) => {
      const status: GuidanceMaterialStatus =
        session.materialStatus ||
        (session.status === "approved" || session.sessionStatus === "approved"
          ? "Valid"
          : session.sessionStatus === "requested"
            ? "Diajukan"
            : "Draft");

      return {
        id: session.materialId || mockMaterialId(guidanceType, session.id),
        guidanceRequestId: mockRequestId(guidanceType),
        materialType: guidanceType.startsWith("revisi") ? "revision" : "normal",
        sourceRevisionItemId: null,
        topic: session.title,
        content: session.chats[0]?.message,
        status,
        attemptNumber: session.attemptNumber || 1,
        submittedAt: session.submittedAt || data.guidanceRequestedAt,
        validatedAt: session.validatedAt || data.guidanceApprovedAt,
        lecturerNote: session.lecturerNote,
      };
    });
  const validCount = materials.filter((item) => item.status === "Valid").length;
  const pendingCount = materials.filter((item) => item.status === "Diajukan").length;
  const rejectedCount = materials.filter((item) => item.status === "Ditolak").length;
  const status: GuidanceRequestStatus =
    data.guidanceStatus === "approved"
      ? "Disetujui"
      : data.guidanceStatus === "requested"
        ? "Menunggu Validasi Dosen"
        : "Draft";

  return {
    id: mockRequestId(guidanceType),
    studentId: "mock_student",
    guidanceType,
    googleDocsLink: data.googleDocsLink,
    status,
    studentNote: data.guidanceNote || undefined,
    lecturerNote: data.guidanceApprovalNote || undefined,
    submittedAt: data.guidanceRequestedAt,
    validatedAt: data.guidanceApprovedAt,
    validatedBy: null,
    activeLecturerId: "mock_dosen",
    activeLecturerName: "Dr. Budi Harto, M.Farm.",
    materialSummary: {
      validCount,
      requiredValidCount: requiredValidMaterialCount,
      pendingCount,
      rejectedCount,
      canSubmitNextGate: validCount >= requiredValidMaterialCount,
    },
    materials,
  };
};

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

mockApiAdapter.register("GET", "/students/me/guidance-requests", () => ({
  data: mockGuidanceTypes.map(toMockGuidanceRequest),
}));

mockApiAdapter.register<SubmitGuidanceRequestPayload>(
  "POST",
  "/students/me/guidance-requests",
  ({ body }) => {
    const guidanceType = body?.guidanceType || "seminar-proposal";
    const stageId = getStageIdForGuidanceType(guidanceType);
    if (body?.googleDocsLink) {
      bimbinganService.updateGoogleDocsLink(stageId, body.googleDocsLink);
    }
    bimbinganService.requestGuidance(stageId, body?.studentNote || "");
    return { data: toMockGuidanceRequest(guidanceType) };
  }
);

mockApiAdapter.register(
  "GET",
  "/students/me/guidance-requests/:guidanceRequestId",
  ({ params }) => ({
    data: toMockGuidanceRequest(parseMockGuidanceType(params.guidanceRequestId)),
  })
);

mockApiAdapter.register(
  "GET",
  "/students/me/guidance-requests/:guidanceRequestId/materials",
  ({ params }) => ({
    data: toMockGuidanceRequest(parseMockGuidanceType(params.guidanceRequestId)).materials,
  })
);

mockApiAdapter.register<SubmitGuidanceMaterialRequest>(
  "POST",
  "/students/me/guidance-requests/:guidanceRequestId/materials",
  ({ body, params }) => {
    const guidanceType = parseMockGuidanceType(params.guidanceRequestId);
    const stageId = getStageIdForGuidanceType(guidanceType);
    const data = bimbinganService.getBimbinganData(stageId);
    const nextSession =
      data.sessions.find(
        (session) =>
          session.status === "pending" &&
          (session.sessionStatus === "idle" || !session.sessionStatus)
      ) || data.sessions[data.sessions.length - 1];

    bimbinganService.updateSession(
      stageId,
      nextSession.id,
      body?.topic || `Materi Bimbingan ${nextSession.id}`,
      nextSession.status
    );
    bimbinganService.requestSessionGuidance(stageId, nextSession.id);

    return {
      data: toMockGuidanceRequest(guidanceType).materials.find(
        (item) => item.id === mockMaterialId(guidanceType, nextSession.id)
      ),
    };
  }
);

mockApiAdapter.register<SubmitGuidanceMaterialRequest>(
  "POST",
  "/students/me/guidance-requests/:guidanceRequestId/revision-items/:revisionItemId/materials",
  ({ body, params }) => {
    const guidanceType = parseMockGuidanceType(params.guidanceRequestId);
    const stageId = getStageIdForGuidanceType(guidanceType);
    const data = bimbinganService.getBimbinganData(stageId);
    const nextSession =
      data.sessions.find(
        (session) =>
          session.status === "pending" &&
          (session.sessionStatus === "idle" || !session.sessionStatus)
      ) || data.sessions[data.sessions.length - 1];

    bimbinganService.updateSession(
      stageId,
      nextSession.id,
      body?.topic || `Materi Revisi ${params.revisionItemId}`,
      nextSession.status
    );
    bimbinganService.requestSessionGuidance(stageId, nextSession.id);

    return {
      data: toMockGuidanceRequest(guidanceType).materials.find(
        (item) => item.id === mockMaterialId(guidanceType, nextSession.id)
      ),
    };
  }
);

mockApiAdapter.register("GET", "/lecturer/guidance-requests", () => ({
  data: mockGuidanceTypes.map(toMockGuidanceRequest),
}));

mockApiAdapter.register(
  "GET",
  "/lecturer/guidance-requests/:guidanceRequestId",
  ({ params }) => ({
    data: toMockGuidanceRequest(parseMockGuidanceType(params.guidanceRequestId)),
  })
);

mockApiAdapter.register<ValidateGuidanceRequestPayload>(
  "PATCH",
  "/lecturer/guidance-requests/:guidanceRequestId/validation",
  ({ body, params }) => {
    const guidanceType = parseMockGuidanceType(params.guidanceRequestId);
    const stageId = getStageIdForGuidanceType(guidanceType);
    if (body?.status === "Disetujui") {
      bimbinganService.approveGuidance(
        stageId,
        new Date().toISOString().slice(0, 10),
        "10:00",
        body.catatanDosen || body.lecturerNote || "Disetujui."
      );
    } else {
      bimbinganService.resetGuidance(stageId);
    }

    return { data: toMockGuidanceRequest(guidanceType) };
  }
);

mockApiAdapter.register(
  "GET",
  "/lecturer/guidance-requests/:guidanceRequestId/materials",
  ({ params }) => ({
    data: toMockGuidanceRequest(parseMockGuidanceType(params.guidanceRequestId)).materials,
  })
);

mockApiAdapter.register<ValidateGuidanceMaterialPayload>(
  "PATCH",
  "/lecturer/guidance-requests/:guidanceRequestId/materials/:materialId/validation",
  ({ body, params }) => {
    const guidanceType = parseMockGuidanceType(params.guidanceRequestId);
    const stageId = getStageIdForGuidanceType(guidanceType);
    const { sessionId } = parseMockMaterial(params.materialId);
    const data = bimbinganService.getBimbinganData(stageId);
    const session = data.sessions.find((item) => item.id === sessionId);

    if (session) {
      if (body?.status === "Valid") {
        bimbinganService.updateSession(stageId, sessionId, session.title, "approved");
      } else {
        session.status = "pending";
        session.sessionStatus = "idle";
        session.materialStatus = "Ditolak";
        session.lecturerNote = body?.catatanDosen || body?.lecturerNote || "Perlu revisi.";
        bimbinganService.saveBimbinganData(stageId, data);
      }
    }

    return {
      data: toMockGuidanceRequest(guidanceType).materials.find(
        (item) => item.id === params.materialId
      ),
    };
  }
);

const registerCoordinatorGuidanceMockRoutes = (prefix: "/coordinator" | "/kordinator") => {
  mockApiAdapter.register(
    "GET",
    `${prefix}/students/:studentId/guidance-requests`,
    ({ params }) => ({
      data: mockGuidanceTypes.map(toMockGuidanceRequest),
      meta: { studentId: params.studentId },
    })
  );

  mockApiAdapter.register(
    "GET",
    `${prefix}/students/:studentId/guidance-requests/:guidanceRequestId`,
    ({ params }) => ({
      data: toMockGuidanceRequest(parseMockGuidanceType(params.guidanceRequestId)),
      meta: { studentId: params.studentId },
    })
  );
};

registerCoordinatorGuidanceMockRoutes("/coordinator");
registerCoordinatorGuidanceMockRoutes("/kordinator");

const pickGuidanceRequest = (
  requests: GuidanceRequestAggregate[],
  stageId: string,
  studentId?: string
) => {
  const guidanceType = getGuidanceTypeForStage(stageId);
  return (
    requests.find(
      (request) =>
        request.guidanceType === guidanceType &&
        (!studentId || request.studentId === studentId || request.studentId === "mock_student")
    ) || null
  );
};

export const guidanceApi = {
  getCached(stageId: string) {
    return isHttpMode ? createEmptyGuidanceData(stageId) : bimbinganService.getBimbinganData(stageId);
  },
  get(stageId: string) {
    return apiClient.get<{ data: BimbinganData }>(`/students/me/guidance/${stageId}`);
  },
  async listRequests() {
    return apiClient.get<{ data: GuidanceRequestAggregate[] }>("/students/me/guidance-requests");
  },
  async getAggregate(stageId: string) {
    const response = await apiClient.get<{ data: GuidanceRequestAggregate[] }>(
      "/students/me/guidance-requests"
    );
    const request = pickGuidanceRequest(response.data, stageId);
    return {
      data: request
        ? mapGuidanceRequestToBimbinganData(request)
        : createEmptyGuidanceData(stageId),
    };
  },
  async getRequestAggregate(stageId: string) {
    const response = await apiClient.get<{ data: GuidanceRequestAggregate[] }>(
      "/students/me/guidance-requests"
    );
    return { data: pickGuidanceRequest(response.data, stageId) };
  },
  async submitRequest(stageId: string, payload: Omit<SubmitGuidanceRequestPayload, "guidanceType">) {
    const response = await apiClient.post<
      { data: GuidanceRequestAggregate },
      SubmitGuidanceRequestPayload
    >("/students/me/guidance-requests", {
      ...payload,
      guidanceType: getGuidanceTypeForStage(stageId),
    });
    return { data: mapGuidanceRequestToBimbinganData(response.data) };
  },
  async submitMaterial(guidanceRequestId: string, payload: SubmitGuidanceMaterialRequest) {
    return apiClient.post<{ data: GuidanceMaterial }, SubmitGuidanceMaterialRequest>(
      `/students/me/guidance-requests/${guidanceRequestId}/materials`,
      payload
    );
  },
  async submitRevisionMaterial(
    guidanceRequestId: string,
    revisionItemId: string,
    payload: SubmitGuidanceMaterialRequest
  ) {
    return apiClient.post<{ data: GuidanceMaterial }, SubmitGuidanceMaterialRequest>(
      `/students/me/guidance-requests/${guidanceRequestId}/revision-items/${revisionItemId}/materials`,
      payload
    );
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
