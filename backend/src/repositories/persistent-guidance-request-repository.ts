import crypto from "node:crypto";
import type {
  DatabaseAdapter,
  GuidanceRequestState,
} from "../database/schema";
import type {
  FinalProjectRegistration,
  GuidanceMaterial,
  GuidanceRequest,
  GuidanceRequestStatus,
} from "../domain/types";
import type {
  GuidanceMaterialSubmissionInput,
  GuidanceMaterialValidationInput,
  GuidanceRequestRepository,
  GuidanceRequestSaveInput,
  GuidanceRequestValidationInput,
} from "./contracts";

const requiredValidMaterialCount = 8;

const cloneRequest = (request: GuidanceRequest): GuidanceRequest =>
  JSON.parse(JSON.stringify(request)) as GuidanceRequest;

const cloneMaterial = (material: GuidanceMaterial): GuidanceMaterial =>
  JSON.parse(JSON.stringify(material)) as GuidanceMaterial;

const materialAttemptGroupKey = (material: GuidanceMaterial) =>
  material.materialType === "revision" && material.sourceRevisionItemId
    ? `revision:${material.sourceRevisionItemId}`
    : `normal:${material.topic}`;

const byAttemptOldest = (left: GuidanceMaterial, right: GuidanceMaterial) => {
  if (left.attemptNumber !== right.attemptNumber) {
    return left.attemptNumber - right.attemptNumber;
  }

  const leftTime = left.submittedAt || left.createdAt || left.updatedAt || left.id;
  const rightTime = right.submittedAt || right.createdAt || right.updatedAt || right.id;
  return leftTime.localeCompare(rightTime);
};

const withAttemptSummaries = (materials: GuidanceMaterial[]) => {
  const groups = new Map<string, GuidanceMaterial[]>();

  for (const material of materials) {
    const key = materialAttemptGroupKey(material);
    const current = groups.get(key) || [];
    current.push(material);
    groups.set(key, current);
  }

  for (const group of groups.values()) {
    group.sort(byAttemptOldest);
    const latest = group[group.length - 1];
    const latestRejected = [...group]
      .reverse()
      .find((item) => item.status === "Ditolak");

    for (const material of group) {
      material.attemptSummary = {
        totalAttempts: group.length,
        latestAttemptNumber: latest.attemptNumber,
        latestMaterialId: latest.id,
        latestStatus: latest.status,
        isLatestAttempt: material.id === latest.id,
        hasRejectedAttempt: group.some((item) => item.status === "Ditolak"),
        latestRejectedNote: latestRejected?.lecturerNote,
        latestRejectedAt:
          latestRejected?.validatedAt || latestRejected?.updatedAt || null,
      };
    }
  }

  return materials;
};

const byNewest = (
  left: GuidanceRequestState | GuidanceRequest,
  right: GuidanceRequestState | GuidanceRequest
) => {
  const leftTime =
    left.updatedAt || left.submittedAt || left.validatedAt || left.createdAt || left.id;
  const rightTime =
    right.updatedAt || right.submittedAt || right.validatedAt || right.createdAt || right.id;
  return rightTime.localeCompare(leftTime);
};

const byNewestRegistration = (
  left: FinalProjectRegistration,
  right: FinalProjectRegistration
) => {
  const leftTime =
    left.updatedAt || left.submittedAt || left.validatedAt || left.createdAt || left.id;
  const rightTime =
    right.updatedAt || right.submittedAt || right.validatedAt || right.createdAt || right.id;
  return rightTime.localeCompare(leftTime);
};

const findApprovedRegistration = (
  registrations: FinalProjectRegistration[],
  studentId: string
) =>
  registrations
    .filter((item) => item.studentId === studentId && item.status === "Disetujui")
    .sort(byNewestRegistration)[0] || null;

export class PersistentGuidanceRequestRepository
  implements GuidanceRequestRepository
{
  constructor(private readonly database: DatabaseAdapter) {}

  listForStudent(studentId: string) {
    return this.database
      .read()
      .guidanceRequests.filter((item) => item.studentId === studentId)
      .sort(byNewest)
      .map((request) => cloneRequest(this.hydrate(request)));
  }

  findById(id: string) {
    const request =
      this.database.read().guidanceRequests.find((item) => item.id === id) || null;
    return request ? cloneRequest(this.hydrate(request)) : null;
  }

  getForStudent(studentId: string, id: string) {
    const request =
      this.database
        .read()
        .guidanceRequests.find(
          (item) => item.id === id && item.studentId === studentId
        ) || null;
    return request ? cloneRequest(this.hydrate(request)) : null;
  }

  createForStudent(studentId: string, input: GuidanceRequestSaveInput) {
    let saved: GuidanceRequestState | null = null;

    this.database.update((state) => {
      const existing = state.guidanceRequests.find(
        (item) =>
          item.studentId === studentId && item.guidanceType === input.guidanceType
      );
      const nextStatus: GuidanceRequestStatus = "Menunggu Validasi Dosen";

      if (existing) {
        existing.googleDocsLink = input.googleDocsLink;
        existing.studentNote = input.studentNote;
        existing.status = nextStatus;
        existing.submittedAt = input.timestamp;
        existing.validatedAt = null;
        existing.validatedBy = null;
        existing.lecturerNote = undefined;
        existing.updatedAt = input.timestamp;
        existing.updatedBy = input.actorId;
        saved = existing;
        return;
      }

      const request: GuidanceRequestState = {
        id: crypto.randomUUID(),
        studentId,
        guidanceType: input.guidanceType,
        googleDocsLink: input.googleDocsLink,
        status: nextStatus,
        studentNote: input.studentNote,
        lecturerNote: undefined,
        submittedAt: input.timestamp,
        validatedAt: null,
        validatedBy: null,
        activeLecturerId: null,
        activeLecturerName: undefined,
        createdAt: input.timestamp,
        updatedAt: input.timestamp,
        updatedBy: input.actorId,
      };

      state.guidanceRequests.push(request);
      saved = request;
    });

    if (!saved) {
      throw new Error("Guidance request was not saved.");
    }

    return cloneRequest(this.hydrate(saved));
  }

  listForLecturer(lecturerId: string) {
    const state = this.database.read();
    const supervisedStudentIds = new Set(
      state.finalProjectRegistrations
        .filter((registration) => registration.status === "Disetujui")
        .filter((registration) =>
          registration.supervisorAssignments.some(
            (assignment) =>
              assignment.status === "Aktif" && assignment.lecturerId === lecturerId
          )
        )
        .map((registration) => registration.studentId)
    );

    return state.guidanceRequests
      .filter((item) => supervisedStudentIds.has(item.studentId))
      .sort(byNewest)
      .map((request) => cloneRequest(this.hydrate(request)));
  }

  validateRequest(id: string, input: GuidanceRequestValidationInput) {
    let updated: GuidanceRequestState | null = null;

    this.database.update((state) => {
      const request = state.guidanceRequests.find((item) => item.id === id);
      if (!request) {
        return;
      }

      request.status = input.status;
      request.lecturerNote = input.lecturerNote;
      request.validatedAt = input.timestamp;
      request.validatedBy = input.actorId;
      request.updatedAt = input.timestamp;
      request.updatedBy = input.actorId;
      updated = request;
    });

    return updated ? cloneRequest(this.hydrate(updated)) : null;
  }

  listMaterials(id: string) {
    const materials = this.database
      .read()
      .guidanceMaterials.filter((item) => item.guidanceRequestId === id)
      .sort((left, right) => left.attemptNumber - right.attemptNumber)
      .map(cloneMaterial);

    return withAttemptSummaries(materials).map(cloneMaterial);
  }

  submitMaterial(id: string, input: GuidanceMaterialSubmissionInput) {
    let saved: GuidanceMaterial | null = null;

    this.database.update((state) => {
      const request = state.guidanceRequests.find((item) => item.id === id);
      if (!request) {
        return;
      }

      const existingAttempts = state.guidanceMaterials.filter(
        (item) =>
          item.guidanceRequestId === id &&
          item.materialType === input.materialType &&
          (input.materialType === "normal" ||
            item.sourceRevisionItemId === input.sourceRevisionItemId)
      );
      const attemptNumber =
        Math.max(0, ...existingAttempts.map((item) => item.attemptNumber)) + 1;
      const material: GuidanceMaterial = {
        id: crypto.randomUUID(),
        guidanceRequestId: id,
        materialType: input.materialType,
        sourceRevisionItemId: input.sourceRevisionItemId ?? null,
        topic: input.topic,
        content: input.content,
        status: "Diajukan",
        attemptNumber,
        submittedAt: input.timestamp,
        validatedAt: null,
        validatedBy: null,
        lecturerNote: undefined,
        createdAt: input.timestamp,
        updatedAt: input.timestamp,
        updatedBy: input.actorId,
      };

      request.updatedAt = input.timestamp;
      request.updatedBy = input.actorId;
      state.guidanceMaterials.push(material);
      saved = material;
    });

    return saved ? cloneMaterial(saved) : null;
  }

  validateMaterial(id: string, input: GuidanceMaterialValidationInput) {
    let updated: GuidanceMaterial | null = null;

    this.database.update((state) => {
      const material = state.guidanceMaterials.find((item) => item.id === id);
      if (!material) {
        return;
      }

      material.status = input.status;
      material.lecturerNote = input.lecturerNote;
      material.validatedAt = input.timestamp;
      material.validatedBy = input.actorId;
      material.updatedAt = input.timestamp;
      material.updatedBy = input.actorId;

      const request = state.guidanceRequests.find(
        (item) => item.id === material.guidanceRequestId
      );
      if (request) {
        request.updatedAt = input.timestamp;
        request.updatedBy = input.actorId;
      }

      updated = material;
    });

    return updated ? cloneMaterial(updated) : null;
  }

  private hydrate(request: GuidanceRequestState): GuidanceRequest {
    const state = this.database.read();
    const registration = findApprovedRegistration(
      state.finalProjectRegistrations,
      request.studentId
    );
    const activeLecturer =
      registration?.supervisorAssignments.find(
        (assignment) => assignment.status === "Aktif" && assignment.supervisorOrder === 1
      ) ||
      registration?.supervisorAssignments.find(
        (assignment) => assignment.status === "Aktif"
      ) ||
      null;
    const materials = state.guidanceMaterials
      .filter((item) => item.guidanceRequestId === request.id)
      .sort((left, right) => left.attemptNumber - right.attemptNumber)
      .map(cloneMaterial);
    withAttemptSummaries(materials);
    const validCount = materials.filter((item) => item.status === "Valid").length;
    const pendingCount = materials.filter((item) => item.status === "Diajukan").length;
    const rejectedCount = materials.filter((item) => item.status === "Ditolak").length;
    const hydrated: GuidanceRequest = {
      ...request,
      activeLecturerId: activeLecturer?.lecturerId ?? request.activeLecturerId ?? null,
      activeLecturerName:
        activeLecturer?.lecturerName || request.activeLecturerName || undefined,
      materialSummary: {
        validCount,
        requiredValidCount: requiredValidMaterialCount,
        pendingCount,
        rejectedCount,
        canSubmitNextGate: validCount >= requiredValidMaterialCount,
      },
      materials,
    };

    return cloneRequest(hydrated);
  }
}
