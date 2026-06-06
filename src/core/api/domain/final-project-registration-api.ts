import { progressService } from "../../../features/student/services/progress-service";
import { storageService } from "../../services/storage-service";
import { ApiError } from "../api-types";
import { apiClient, mockApiAdapter } from "../api-client";

export type FinalProjectRegistrationStatus =
  | "Draft"
  | "Menunggu Validasi Koordinator"
  | "Disetujui"
  | "Ditolak";

export type FinalProjectRequirementStatus =
  | "Valid"
  | "Menunggu Verifikasi"
  | "Perlu Revisi"
  | "Belum Upload"
  | "Ditolak";

export interface FinalProjectRegistrationRequirement {
  id: string;
  requirementDefinitionId?: string | null;
  requirementKey?: string;
  label: string;
  wajib: boolean;
  status: FinalProjectRequirementStatus;
  fileRef?: string;
  linkBerkas?: string;
  catatanMahasiswa?: string;
  catatanKoordinator?: string;
  uploadedAt?: string | null;
  verifiedAt?: string | null;
  verifiedBy?: string | null;
}

export interface SupervisorAssignment {
  id: string;
  lecturerId?: string | null;
  supervisorOrder: 1 | 2;
  lecturerName: string;
  lecturerIdentifier?: string;
  status: "Aktif" | "Nonaktif";
  assignedAt: string;
  assignedBy?: string | null;
  coordinatorNote?: string;
}

export interface FinalProjectRegistration {
  id: string;
  studentId: string;
  academicPeriodId?: string | null;
  requirementDriveLink: string;
  paymentProofFileRef?: string;
  paymentProofLink?: string;
  skema?: "Skripsi" | "Non Skripsi";
  thesisTypeId?: string | null;
  thesisTypeName?: string;
  judulTA?: string;
  deskripsiTA?: string;
  requestedSupervisor1Id?: string | null;
  requestedSupervisor1Name?: string;
  status: FinalProjectRegistrationStatus;
  coordinatorNote?: string;
  submittedAt?: string | null;
  validatedAt?: string | null;
  validatedBy?: string | null;
  createdAt?: string;
  createdBy?: string | null;
  updatedAt?: string;
  updatedBy?: string | null;
  requirements: FinalProjectRegistrationRequirement[];
  supervisorAssignments: SupervisorAssignment[];
}

export interface SaveFinalProjectRegistrationRequest {
  academicPeriodId?: string | null;
  requirementDriveLink: string;
  paymentProofFileRef?: string;
  paymentProofLink?: string;
  skema?: "Skripsi" | "Non Skripsi";
  thesisTypeId?: string | null;
  thesisTypeName?: string;
  judulTA?: string;
  deskripsiTA?: string;
  requestedSupervisor1Id?: string | null;
  requestedSupervisor1Name?: string;
  submit: boolean;
}

export interface FinalProjectRegistrationListQuery
  extends Record<string, string | number | boolean | null | undefined> {
  status?: FinalProjectRegistrationStatus | null;
  q?: string;
  page?: number;
  limit?: number;
}

export interface FinalProjectRegistrationListResponse {
  data: FinalProjectRegistration[];
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface ValidateFinalProjectRegistrationRequest {
  status: Extract<FinalProjectRegistrationStatus, "Disetujui" | "Ditolak">;
  pembimbing1Id?: string;
  pembimbing2Id?: string;
  catatanKoordinator?: string;
}

const MOCK_REGISTRATION_KEY = "pharmsita_final_project_registrations_v1";
const MOCK_STUDENT_ID = "mock_mahasiswa";

const lecturerNamesById: Record<string, string> = {
  usr_dosen_01: "Dr. Budi Harto, M.Farm.",
  usr_multi_01: "Dr. Multi Peran, M.Farm.",
  mock_lecturer_1: "Dr. Ahmad",
  mock_lecturer_2: "Dr. Citra",
};

const cloneRegistration = (
  registration: FinalProjectRegistration
): FinalProjectRegistration =>
  JSON.parse(JSON.stringify(registration)) as FinalProjectRegistration;

const createDefaultRegistrations = (): FinalProjectRegistration[] => [
  {
    id: "sub-1",
    studentId: "mock_student_budi",
    requirementDriveLink: "https://drive.google.com/drive/folders/mock-budi",
    paymentProofFileRef: "Bukti_Kuitansi_Budi.pdf",
    skema: "Skripsi",
    thesisTypeId: "thesis_type_01",
    thesisTypeName: "Penelitian",
    judulTA: "Sistem Informasi Manajemen Perpustakaan Berbasis AI",
    deskripsiTA:
      "Penelitian ini bertujuan mengembangkan sistem informasi manajemen perpustakaan dengan dukungan teknologi kecerdasan buatan.",
    requestedSupervisor1Id: "mock_lecturer_1",
    requestedSupervisor1Name: "Dr. Ahmad",
    status: "Menunggu Validasi Koordinator",
    submittedAt: "2026-06-05T09:00:00.000Z",
    validatedAt: null,
    validatedBy: null,
    createdAt: "2026-06-05T09:00:00.000Z",
    createdBy: "mock_student_budi",
    updatedAt: "2026-06-05T09:00:00.000Z",
    updatedBy: "mock_student_budi",
    requirements: [],
    supervisorAssignments: [],
  },
];

const readRegistrations = () => {
  const saved = storageService.get<FinalProjectRegistration[]>(MOCK_REGISTRATION_KEY);
  if (Array.isArray(saved)) {
    return saved.map(cloneRegistration);
  }

  const initial = createDefaultRegistrations();
  storageService.set(MOCK_REGISTRATION_KEY, initial);
  return initial.map(cloneRegistration);
};

const writeRegistrations = (registrations: FinalProjectRegistration[]) => {
  storageService.set(MOCK_REGISTRATION_KEY, registrations);
  return registrations.map(cloneRegistration);
};

const byNewest = (left: FinalProjectRegistration, right: FinalProjectRegistration) => {
  const leftTime = left.updatedAt || left.submittedAt || left.createdAt || left.id;
  const rightTime = right.updatedAt || right.submittedAt || right.createdAt || right.id;
  return rightTime.localeCompare(leftTime);
};

const isActiveStudentRegistration = (registration: FinalProjectRegistration) =>
  registration.studentId === MOCK_STUDENT_ID &&
  ["Draft", "Menunggu Validasi Koordinator", "Disetujui"].includes(
    registration.status
  );

const findActiveStudentRegistration = () =>
  readRegistrations().filter(isActiveStudentRegistration).sort(byNewest)[0] || null;

const buildSupervisorAssignment = (
  lecturerId: string,
  supervisorOrder: 1 | 2,
  note?: string
): SupervisorAssignment => ({
  id: `mock_assignment_${Date.now()}_${supervisorOrder}`,
  lecturerId,
  supervisorOrder,
  lecturerName: lecturerNamesById[lecturerId] || lecturerId,
  lecturerIdentifier: lecturerId,
  status: "Aktif",
  assignedAt: new Date().toISOString(),
  assignedBy: "mock_coordinator",
  coordinatorNote: note,
});

mockApiAdapter.register("GET", "/students/me/final-project-registration", () => ({
  data: findActiveStudentRegistration(),
}));

mockApiAdapter.register<SaveFinalProjectRegistrationRequest>(
  "POST",
  "/students/me/final-project-registration",
  ({ body }) => {
    const registrations = readRegistrations();
    const existing = registrations.filter(isActiveStudentRegistration).sort(byNewest)[0];

    if (existing && existing.status !== "Draft") {
      throw new ApiError(409, {
        code: "CONFLICT",
        message:
          "Pendaftaran TA aktif sudah terkirim atau disetujui dan tidak bisa diubah.",
      });
    }

    const now = new Date().toISOString();
    const status: FinalProjectRegistrationStatus = body?.submit
      ? "Menunggu Validasi Koordinator"
      : "Draft";
    const nextRegistration: FinalProjectRegistration = {
      id: existing?.id || `mock_fpr_${Date.now()}`,
      studentId: MOCK_STUDENT_ID,
      academicPeriodId: body?.academicPeriodId ?? existing?.academicPeriodId ?? null,
      requirementDriveLink: body?.requirementDriveLink || "",
      paymentProofFileRef: body?.paymentProofFileRef,
      paymentProofLink: body?.paymentProofLink,
      skema: body?.skema,
      thesisTypeId: body?.thesisTypeId ?? null,
      thesisTypeName: body?.thesisTypeName,
      judulTA: body?.judulTA,
      deskripsiTA: body?.deskripsiTA,
      requestedSupervisor1Id: body?.requestedSupervisor1Id ?? null,
      requestedSupervisor1Name: body?.requestedSupervisor1Name,
      status,
      submittedAt: body?.submit ? now : existing?.submittedAt ?? null,
      validatedAt: existing?.validatedAt ?? null,
      validatedBy: existing?.validatedBy ?? null,
      createdAt: existing?.createdAt || now,
      createdBy: existing?.createdBy || MOCK_STUDENT_ID,
      updatedAt: now,
      updatedBy: MOCK_STUDENT_ID,
      requirements: existing?.requirements || [],
      supervisorAssignments: existing?.supervisorAssignments || [],
    };

    const updated = existing
      ? registrations.map((registration) =>
          registration.id === existing.id ? nextRegistration : registration
        )
      : [nextRegistration, ...registrations];

    writeRegistrations(updated);
    return { data: cloneRegistration(nextRegistration) };
  }
);

const registerCoordinatorMockRoutes = (prefix: "/coordinator" | "/kordinator") => {
  mockApiAdapter.register(
    "GET",
    `${prefix}/final-project-registrations`,
    ({ query }) => {
      const status = query?.status as FinalProjectRegistrationStatus | undefined;
      const q = String(query?.q || "").trim().toLowerCase();
      const page = Math.max(1, Number(query?.page || 1));
      const limit = Math.min(100, Math.max(1, Number(query?.limit || 20)));
      const filtered = readRegistrations()
        .filter((registration) => {
          if (status && registration.status !== status) {
            return false;
          }

          if (!q) {
            return true;
          }

          return [
            registration.id,
            registration.studentId,
            registration.judulTA,
            registration.thesisTypeName,
            registration.status,
          ]
            .filter(Boolean)
            .join(" ")
            .toLowerCase()
            .includes(q);
        })
        .sort(byNewest);
      const total = filtered.length;
      const start = (page - 1) * limit;

      return {
        data: filtered.slice(start, start + limit),
        meta: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      } satisfies FinalProjectRegistrationListResponse;
    }
  );

  mockApiAdapter.register(
    "GET",
    `${prefix}/final-project-registrations/:registrationId`,
    ({ params }) => {
      const registration =
        readRegistrations().find((item) => item.id === params.registrationId) || null;

      if (!registration) {
        throw new ApiError(404, {
          code: "NOT_FOUND",
          message: "Pendaftaran TA tidak ditemukan.",
        });
      }

      return { data: registration };
    }
  );

  mockApiAdapter.register<ValidateFinalProjectRegistrationRequest>(
    "PATCH",
    `${prefix}/final-project-registrations/:registrationId/validation`,
    ({ body, params }) => {
      const registrations = readRegistrations();
      const registration = registrations.find(
        (item) => item.id === params.registrationId
      );

      if (!registration) {
        throw new ApiError(404, {
          code: "NOT_FOUND",
          message: "Pendaftaran TA tidak ditemukan.",
        });
      }

      if (registration.status !== "Menunggu Validasi Koordinator") {
        throw new ApiError(409, {
          code: "CONFLICT",
          message: "Pendaftaran TA belum berada pada status menunggu validasi.",
        });
      }

      if (body?.status === "Ditolak" && !body.catatanKoordinator?.trim()) {
        throw new ApiError(422, {
          code: "VALIDATION_ERROR",
          message: "Catatan wajib diisi saat ditolak.",
        });
      }

      if (body?.status === "Disetujui") {
        if (!body.pembimbing1Id || !body.pembimbing2Id) {
          throw new ApiError(422, {
            code: "VALIDATION_ERROR",
            message: "Pembimbing 1 dan 2 wajib diisi.",
          });
        }

        if (body.pembimbing1Id === body.pembimbing2Id) {
          throw new ApiError(422, {
            code: "VALIDATION_ERROR",
            message: "Pembimbing 1 dan 2 harus berbeda.",
          });
        }
      }

      const now = new Date().toISOString();
      const updatedRegistration: FinalProjectRegistration = {
        ...registration,
        status: body?.status || "Ditolak",
        coordinatorNote: body?.catatanKoordinator,
        validatedAt: now,
        validatedBy: "mock_coordinator",
        updatedAt: now,
        updatedBy: "mock_coordinator",
        supervisorAssignments:
          body?.status === "Disetujui"
            ? [
                buildSupervisorAssignment(
                  body.pembimbing1Id || "",
                  1,
                  body.catatanKoordinator
                ),
                buildSupervisorAssignment(
                  body.pembimbing2Id || "",
                  2,
                  body.catatanKoordinator
                ),
              ]
            : [],
      };

      writeRegistrations(
        registrations.map((item) =>
          item.id === updatedRegistration.id ? updatedRegistration : item
        )
      );

      if (updatedRegistration.status === "Disetujui") {
        progressService.updateStepStatus("pendaftaran-ta", "completed");
      }

      return {
        data: cloneRegistration(updatedRegistration),
        meta: { progressUpdated: updatedRegistration.status === "Disetujui" },
      };
    }
  );
};

registerCoordinatorMockRoutes("/coordinator");
registerCoordinatorMockRoutes("/kordinator");

export const finalProjectRegistrationApi = {
  getMine() {
    return apiClient.get<{ data: FinalProjectRegistration | null }>(
      "/students/me/final-project-registration"
    );
  },
  saveMine(payload: SaveFinalProjectRegistrationRequest) {
    return apiClient.post<
      { data: FinalProjectRegistration },
      SaveFinalProjectRegistrationRequest
    >("/students/me/final-project-registration", payload);
  },
};

export const coordinatorFinalProjectRegistrationApi = {
  list(query?: FinalProjectRegistrationListQuery) {
    return apiClient.get<FinalProjectRegistrationListResponse>(
      "/coordinator/final-project-registrations",
      query
    );
  },
  getById(registrationId: string) {
    return apiClient.get<{ data: FinalProjectRegistration }>(
      `/coordinator/final-project-registrations/${registrationId}`
    );
  },
  validate(
    registrationId: string,
    payload: ValidateFinalProjectRegistrationRequest
  ) {
    return apiClient.patch<
      { data: FinalProjectRegistration; meta?: { progressUpdated: boolean } },
      ValidateFinalProjectRegistrationRequest
    >(`/coordinator/final-project-registrations/${registrationId}/validation`, payload);
  },
};
