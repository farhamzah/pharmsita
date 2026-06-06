import crypto from "node:crypto";
import type {
  FinalProjectRegistrationStatus,
  SupervisorAssignment,
  UserAccount,
} from "../../domain/types";
import { conflict, notFound, validationError } from "../../http/errors";
import { json } from "../../http/response";
import type { Router } from "../../http/router";
import {
  finalProjectRegistrationRepository,
  masterDataRepository,
  studentWorkflowRepository,
  userRepository,
} from "../../repositories";
import {
  validateFinalProjectRegistrationSubmission,
  validateFinalProjectRegistrationValidation,
} from "../../validation/request-validators";
import { auditService } from "../audit/audit-service";
import { authService } from "../auth/auth-service";

const statuses: FinalProjectRegistrationStatus[] = [
  "Draft",
  "Menunggu Validasi Koordinator",
  "Disetujui",
  "Ditolak",
];

const readPositiveInt = (value: string | null, fallback: number) => {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
};

const readStatusFilter = (value: string | null) => {
  if (!value) {
    return null;
  }

  return statuses.includes(value as FinalProjectRegistrationStatus)
    ? (value as FinalProjectRegistrationStatus)
    : null;
};

const resolveThesisTypeName = async (
  thesisTypeId: string | null,
  fallback?: string
) => {
  if (!thesisTypeId) {
    return fallback;
  }

  const thesisTypes = await masterDataRepository.listThesisTypes();
  const thesisType = thesisTypes.find((item) => item.id === thesisTypeId);
  return thesisType?.name || fallback;
};

const ensureLecturer = async (userId: string, path: string) => {
  const user = await userRepository.findById(userId);
  const roles = user ? await userRepository.getRoles(user.id) : [];

  if (!user || !roles.includes("dosen")) {
    throw validationError("Payload tidak valid.", {
      [path]: ["User dosen tidak ditemukan."],
    });
  }

  return user;
};

const buildSupervisorAssignment = (
  lecturer: UserAccount,
  supervisorOrder: 1 | 2,
  actor: UserAccount,
  timestamp: string,
  coordinatorNote?: string
): SupervisorAssignment => ({
  id: crypto.randomUUID(),
  lecturerId: lecturer.id,
  supervisorOrder,
  lecturerName: lecturer.name,
  lecturerIdentifier: lecturer.identifier,
  status: "Aktif",
  assignedAt: timestamp,
  assignedBy: actor.id,
  coordinatorNote,
});

export const registerFinalProjectRegistrationRoutes = (router: Router) => {
  router.get("/students/me/final-project-registration", async ({ headers }) => {
    const actor = await authService.requirePermission(
      headers,
      "student.final-project-registration.read"
    );
    return json({
      data: await finalProjectRegistrationRepository.getActiveByStudentId(actor.id),
    });
  });

  router.post("/students/me/final-project-registration", async ({ body, headers }) => {
    const actor = await authService.requirePermission(
      headers,
      "student.final-project-registration.submit"
    );
    const payload = validateFinalProjectRegistrationSubmission(body);
    const before = await finalProjectRegistrationRepository.getActiveByStudentId(actor.id);

    if (before && before.status !== "Draft") {
      throw conflict(
        "Pendaftaran TA aktif sudah terkirim atau disetujui dan tidak bisa diubah."
      );
    }

    const thesisTypeName = await resolveThesisTypeName(
      payload.thesisTypeId,
      payload.thesisTypeName
    );

    if (payload.submit && !thesisTypeName) {
      throw validationError("Payload tidak valid.", {
        "body.thesisTypeId": ["Jenis TA tidak ditemukan."],
      });
    }

    let requestedSupervisor1Name = payload.requestedSupervisor1Name;
    if (payload.requestedSupervisor1Id) {
      const requestedSupervisor = await ensureLecturer(
        payload.requestedSupervisor1Id,
        "body.requestedSupervisor1Id"
      );
      requestedSupervisor1Name = requestedSupervisor.name;
    }

    const now = new Date().toISOString();
    const after = await finalProjectRegistrationRepository.saveStudentRegistration(
      actor.id,
      {
        ...payload,
        thesisTypeName,
        requestedSupervisor1Name,
        actorId: actor.id,
        timestamp: now,
      }
    );

    await auditService.record({
      actor,
      action: payload.submit
        ? "STUDENT_FINAL_PROJECT_REGISTRATION_SUBMITTED"
        : "STUDENT_FINAL_PROJECT_REGISTRATION_DRAFT_SAVED",
      resourceType: "final-project-registration",
      resourceId: after.id,
      before,
      after,
    });

    return json({ data: after }, before ? 200 : 201);
  });

  registerCoordinatorRoutes(router, "/coordinator");
  registerCoordinatorRoutes(router, "/kordinator");
};

const registerCoordinatorRoutes = (router: Router, prefix: string) => {
  router.get(`${prefix}/final-project-registrations`, async ({ query, headers }) => {
    await authService.requireAnyPermission(headers, [
      "coordinator.final-project-registration.read",
      "admin.final-project-registration.override",
      "workflow.override",
    ]);

    const result = await finalProjectRegistrationRepository.list({
      status: readStatusFilter(query.get("status")),
      q: query.get("q"),
      page: readPositiveInt(query.get("page"), 1),
      limit: readPositiveInt(query.get("limit"), 20),
    });

    return json(result);
  });

  router.get(
    `${prefix}/final-project-registrations/:registrationId`,
    async ({ params, headers }) => {
      await authService.requireAnyPermission(headers, [
        "coordinator.final-project-registration.read",
        "admin.final-project-registration.override",
        "workflow.override",
      ]);
      const registration = await finalProjectRegistrationRepository.findById(
        params.registrationId
      );

      if (!registration) {
        throw notFound("Pendaftaran TA tidak ditemukan.");
      }

      return json({ data: registration });
    }
  );

  router.patch(
    `${prefix}/final-project-registrations/:registrationId/validation`,
    async ({ body, params, headers }) => {
      const actor = await authService.requireAnyPermission(headers, [
        "coordinator.final-project-registration.validate",
        "admin.final-project-registration.override",
        "workflow.override",
      ]);
      const payload = validateFinalProjectRegistrationValidation(body);
      const before = await finalProjectRegistrationRepository.findById(
        params.registrationId
      );

      if (!before) {
        throw notFound("Pendaftaran TA tidak ditemukan.");
      }

      if (before.status !== "Menunggu Validasi Koordinator") {
        throw conflict("Pendaftaran TA belum berada pada status menunggu validasi.");
      }

      const now = new Date().toISOString();
      let supervisorAssignments: SupervisorAssignment[] = [];

      if (payload.status === "Disetujui") {
        const supervisor1 = await ensureLecturer(
          payload.pembimbing1Id || "",
          "body.pembimbing1Id"
        );
        const supervisor2 = await ensureLecturer(
          payload.pembimbing2Id || "",
          "body.pembimbing2Id"
        );

        supervisorAssignments = [
          buildSupervisorAssignment(supervisor1, 1, actor, now, payload.coordinatorNote),
          buildSupervisorAssignment(supervisor2, 2, actor, now, payload.coordinatorNote),
        ];
      }

      const after = await finalProjectRegistrationRepository.validateRegistration(
        params.registrationId,
        {
          status: payload.status,
          coordinatorNote: payload.coordinatorNote,
          supervisorAssignments,
          actorId: actor.id,
          timestamp: now,
        }
      );

      if (!after) {
        throw notFound("Pendaftaran TA tidak ditemukan.");
      }

      let progress = null;
      if (after.status === "Disetujui") {
        progress = await studentWorkflowRepository.updateProgressStep(
          after.studentId,
          "pendaftaran-ta",
          "completed"
        );
      }

      await auditService.record({
        actor,
        action: "COORDINATOR_FINAL_PROJECT_REGISTRATION_VALIDATED",
        resourceType: "final-project-registration",
        resourceId: after.id,
        before,
        after: {
          registration: after,
          progress,
        },
      });

      return json({ data: after, meta: { progressUpdated: Boolean(progress) } });
    }
  );
};
