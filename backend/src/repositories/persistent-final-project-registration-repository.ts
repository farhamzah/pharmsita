import crypto from "node:crypto";
import type { DatabaseAdapter } from "../database/schema";
import type {
  FinalProjectRegistration,
  FinalProjectRegistrationStatus,
} from "../domain/types";
import type {
  FinalProjectRegistrationListResult,
  FinalProjectRegistrationRepository,
  FinalProjectRegistrationSaveInput,
  FinalProjectRegistrationValidationInput,
} from "./contracts";

const activeStatuses: FinalProjectRegistrationStatus[] = [
  "Draft",
  "Menunggu Validasi Koordinator",
  "Disetujui",
];

const cloneRegistration = (
  registration: FinalProjectRegistration
): FinalProjectRegistration =>
  JSON.parse(JSON.stringify(registration)) as FinalProjectRegistration;

const byNewest = (left: FinalProjectRegistration, right: FinalProjectRegistration) => {
  const leftTime = left.updatedAt || left.submittedAt || left.validatedAt || left.createdAt || left.id;
  const rightTime = right.updatedAt || right.submittedAt || right.validatedAt || right.createdAt || right.id;
  return rightTime.localeCompare(leftTime);
};

export class PersistentFinalProjectRegistrationRepository
  implements FinalProjectRegistrationRepository
{
  constructor(private readonly database: DatabaseAdapter) {}

  getActiveByStudentId(studentId: string) {
    const registration = this.database
      .read()
      .finalProjectRegistrations.filter(
        (item) => item.studentId === studentId && activeStatuses.includes(item.status)
      )
      .sort(byNewest)[0];

    return registration ? cloneRegistration(registration) : null;
  }

  findById(id: string) {
    const registration =
      this.database.read().finalProjectRegistrations.find((item) => item.id === id) ||
      null;
    return registration ? cloneRegistration(registration) : null;
  }

  list(filter: {
    status?: FinalProjectRegistrationStatus | null;
    q?: string | null;
    page?: number;
    limit?: number;
  } = {}): FinalProjectRegistrationListResult {
    const state = this.database.read();
    const q = filter.q?.trim().toLowerCase();
    const page = Math.max(1, filter.page || 1);
    const limit = Math.min(100, Math.max(1, filter.limit || 20));

    const filtered = state.finalProjectRegistrations
      .filter((registration) => {
        if (filter.status && registration.status !== filter.status) {
          return false;
        }

        if (!q) {
          return true;
        }

        const student = state.users.find((user) => user.id === registration.studentId);
        const haystack = [
          student?.name,
          student?.identifier,
          registration.judulTA,
          registration.thesisTypeName,
          registration.status,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();

        return haystack.includes(q);
      })
      .sort(byNewest);

    const total = filtered.length;
    const totalPages = Math.ceil(total / limit);
    const start = (page - 1) * limit;

    return {
      data: filtered.slice(start, start + limit).map(cloneRegistration),
      meta: {
        page,
        limit,
        total,
        totalPages,
      },
    };
  }

  saveStudentRegistration(
    studentId: string,
    input: FinalProjectRegistrationSaveInput
  ) {
    let saved: FinalProjectRegistration | null = null;

    this.database.update((state) => {
      const existing = state.finalProjectRegistrations
        .filter(
          (item) => item.studentId === studentId && activeStatuses.includes(item.status)
        )
        .sort(byNewest)[0];
      const status: FinalProjectRegistrationStatus = input.submit
        ? "Menunggu Validasi Koordinator"
        : "Draft";

      if (existing) {
        existing.academicPeriodId = input.academicPeriodId ?? existing.academicPeriodId ?? null;
        existing.requirementDriveLink = input.requirementDriveLink;
        existing.paymentProofFileRef = input.paymentProofFileRef;
        existing.paymentProofLink = input.paymentProofLink;
        existing.skema = input.skema;
        existing.thesisTypeId = input.thesisTypeId ?? null;
        existing.thesisTypeName = input.thesisTypeName;
        existing.judulTA = input.judulTA;
        existing.deskripsiTA = input.deskripsiTA;
        existing.requestedSupervisor1Id = input.requestedSupervisor1Id ?? null;
        existing.requestedSupervisor1Name = input.requestedSupervisor1Name;
        existing.status = status;
        existing.submittedAt = input.submit
          ? input.timestamp
          : existing.submittedAt ?? null;
        existing.updatedAt = input.timestamp;
        existing.updatedBy = input.actorId;
        saved = existing;
        return;
      }

      const registration: FinalProjectRegistration = {
        id: crypto.randomUUID(),
        studentId,
        academicPeriodId: input.academicPeriodId ?? null,
        requirementDriveLink: input.requirementDriveLink,
        paymentProofFileRef: input.paymentProofFileRef,
        paymentProofLink: input.paymentProofLink,
        skema: input.skema,
        thesisTypeId: input.thesisTypeId ?? null,
        thesisTypeName: input.thesisTypeName,
        judulTA: input.judulTA,
        deskripsiTA: input.deskripsiTA,
        requestedSupervisor1Id: input.requestedSupervisor1Id ?? null,
        requestedSupervisor1Name: input.requestedSupervisor1Name,
        status,
        submittedAt: input.submit ? input.timestamp : null,
        validatedAt: null,
        validatedBy: null,
        createdAt: input.timestamp,
        createdBy: input.actorId,
        updatedAt: input.timestamp,
        updatedBy: input.actorId,
        requirements: [],
        supervisorAssignments: [],
      };

      state.finalProjectRegistrations.push(registration);
      saved = registration;
    });

    if (!saved) {
      throw new Error("Final project registration was not saved.");
    }

    return cloneRegistration(saved);
  }

  validateRegistration(
    registrationId: string,
    input: FinalProjectRegistrationValidationInput
  ) {
    let updated: FinalProjectRegistration | null = null;

    this.database.update((state) => {
      const registration = state.finalProjectRegistrations.find(
        (item) => item.id === registrationId
      );

      if (!registration) {
        return;
      }

      registration.status = input.status;
      registration.coordinatorNote = input.coordinatorNote;
      registration.validatedAt = input.timestamp;
      registration.validatedBy = input.actorId;
      registration.updatedAt = input.timestamp;
      registration.updatedBy = input.actorId;
      registration.supervisorAssignments =
        input.status === "Disetujui" ? input.supervisorAssignments || [] : [];
      updated = registration;
    });

    return updated ? cloneRegistration(updated) : null;
  }
}
