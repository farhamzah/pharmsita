import type {
  GuidanceMaterial,
  GuidanceRequest,
  GuidanceType,
  RevisionStage,
  UserAccount,
} from "../../domain/types";
import { conflict, forbidden, notFound } from "../../http/errors";
import { json } from "../../http/response";
import type { Router } from "../../http/router";
import {
  finalProjectRegistrationRepository,
  guidanceRequestRepository,
  studentWorkflowRepository,
} from "../../repositories";
import {
  validateGuidanceMaterialSubmission,
  validateGuidanceMaterialValidation,
  validateGuidanceRequestSubmission,
  validateGuidanceRequestValidation,
} from "../../validation/request-validators";
import { auditService } from "../audit/audit-service";
import { authService } from "../auth/auth-service";

const studentReadPermissions = [
  "student.guidance-request.read",
  "student.workflow.read",
  "workflow.override",
];

const studentSubmitPermissions = [
  "student.guidance-request.submit",
  "student.workflow.submit",
  "workflow.override",
];

const studentMaterialSubmitPermissions = [
  "student.guidance-material.submit",
  "student.workflow.submit",
  "workflow.override",
];

const lecturerReadPermissions = [
  "lecturer.guidance-request.read",
  "lecturer.guidance-material.read",
  "lecturer.guidance.read",
  "lecturer.workflow.read",
  "workflow.override",
];

const lecturerRequestValidationPermissions = [
  "lecturer.guidance-request.validate",
  "lecturer.guidance.approve",
  "workflow.override",
];

const lecturerMaterialValidationPermissions = [
  "lecturer.guidance-material.validate",
  "lecturer.guidance.approve",
  "workflow.override",
];

const coordinatorGuidanceReadPermissions = [
  "coordinator.guidance.read",
  "coordinator.workflow.read",
  "coordinator.monitoring.read",
  "workflow.override",
];

const revisionStageByGuidanceType: Partial<Record<GuidanceType, RevisionStage>> = {
  "revisi-seminar-proposal": "revisi-proposal",
  "revisi-sidang-akhir": "revisi-sidang",
};

const ensureApprovedRegistration = async (studentId: string) => {
  const registration =
    await finalProjectRegistrationRepository.getActiveByStudentId(studentId);

  if (!registration || registration.status !== "Disetujui") {
    throw conflict(
      "Pendaftaran TA harus sudah disetujui sebelum mengajukan bimbingan."
    );
  }
};

const ensureLecturerCanAccess = async (
  actor: UserAccount,
  request: GuidanceRequest
) => {
  if (actor.role === "admin") {
    return;
  }

  const allowed = (await guidanceRequestRepository.listForLecturer(actor.id)).some(
    (item) => item.id === request.id
  );

  if (!allowed) {
    throw forbidden("Dosen tidak punya akses ke request bimbingan ini.");
  }
};

const readRequestOrThrow = async (id: string) => {
  const request = await guidanceRequestRepository.findById(id);

  if (!request) {
    throw notFound("Request bimbingan tidak ditemukan.");
  }

  return request;
};

const readStudentRequestOrThrow = async (studentId: string, id: string) => {
  const request = await guidanceRequestRepository.getForStudent(studentId, id);

  if (!request) {
    throw notFound("Request bimbingan tidak ditemukan.");
  }

  return request;
};

const syncRevisionMaterialValidation = async (
  actor: UserAccount,
  request: GuidanceRequest,
  beforeMaterial: GuidanceMaterial,
  afterMaterial: GuidanceMaterial
) => {
  if (
    afterMaterial.materialType !== "revision" ||
    !afterMaterial.sourceRevisionItemId
  ) {
    return null;
  }

  const revisionStage = revisionStageByGuidanceType[request.guidanceType];
  if (!revisionStage) {
    return null;
  }

  const beforeRevision = await studentWorkflowRepository.getRevision(
    request.studentId,
    revisionStage
  );
  const targetBefore = beforeRevision.items.find(
    (item) => item.sourceRevisionItemId === afterMaterial.sourceRevisionItemId
  );

  if (!targetBefore) {
    return null;
  }
  const targetBeforeSnapshot = JSON.parse(JSON.stringify(targetBefore));

  const nextStatus = afterMaterial.status === "Valid" ? "done" : "pending";
  const afterRevision = await studentWorkflowRepository.updateRevision(
    request.studentId,
    revisionStage,
    (workflow) => {
      const item = workflow.items.find(
        (entry) =>
          entry.sourceRevisionItemId === afterMaterial.sourceRevisionItemId
      );

      if (item) {
        item.status = nextStatus;
      }
    }
  );

  await auditService.record({
    actor,
    action: "LECTURER_REVISION_MATERIAL_STATUS_SYNCED",
    resourceType: "revision-item",
    resourceId: `${request.studentId}:${revisionStage}:${afterMaterial.sourceRevisionItemId}`,
    before: {
      material: beforeMaterial,
      revisionItem: targetBeforeSnapshot,
    },
    after: {
      material: afterMaterial,
      revisionItem:
        afterRevision.items.find(
          (item) =>
            item.sourceRevisionItemId === afterMaterial.sourceRevisionItemId
        ) || null,
    },
  });

  return afterRevision;
};

export const registerGuidanceRequestRoutes = (router: Router) => {
  router.get("/students/me/guidance-requests", async ({ headers }) => {
    const actor = await authService.requireAnyPermission(headers, studentReadPermissions);
    return json({
      data: await guidanceRequestRepository.listForStudent(actor.id),
    });
  });

  router.post("/students/me/guidance-requests", async ({ body, headers }) => {
    const actor = await authService.requireAnyPermission(
      headers,
      studentSubmitPermissions
    );
    await ensureApprovedRegistration(actor.id);
    const payload = validateGuidanceRequestSubmission(body);
    const before = (await guidanceRequestRepository.listForStudent(actor.id)).find(
      (item) => item.guidanceType === payload.guidanceType
    ) || null;
    const now = new Date().toISOString();
    const after = await guidanceRequestRepository.createForStudent(actor.id, {
      ...payload,
      actorId: actor.id,
      timestamp: now,
    });

    await auditService.record({
      actor,
      action: "GUIDANCE_REQUEST_SUBMITTED",
      resourceType: "guidance-request",
      resourceId: after.id,
      before,
      after,
    });

    return json({ data: after }, before ? 200 : 201);
  });

  router.get(
    "/students/me/guidance-requests/:guidanceRequestId",
    async ({ params, headers }) => {
      const actor = await authService.requireAnyPermission(
        headers,
        studentReadPermissions
      );
      return json({
        data: await readStudentRequestOrThrow(actor.id, params.guidanceRequestId),
      });
    }
  );

  router.get(
    "/students/me/guidance-requests/:guidanceRequestId/materials",
    async ({ params, headers }) => {
      const actor = await authService.requireAnyPermission(
        headers,
        studentReadPermissions
      );
      await readStudentRequestOrThrow(actor.id, params.guidanceRequestId);
      return json({
        data: await guidanceRequestRepository.listMaterials(
          params.guidanceRequestId
        ),
      });
    }
  );

  router.post(
    "/students/me/guidance-requests/:guidanceRequestId/materials",
    async ({ body, params, headers }) => {
      const actor = await authService.requireAnyPermission(
        headers,
        studentMaterialSubmitPermissions
      );
      const request = await readStudentRequestOrThrow(
        actor.id,
        params.guidanceRequestId
      );
      if (request.status !== "Disetujui") {
        throw conflict("Request bimbingan harus disetujui sebelum submit materi.");
      }

      const payload = validateGuidanceMaterialSubmission(body);
      const now = new Date().toISOString();
      const after = await guidanceRequestRepository.submitMaterial(request.id, {
        ...payload,
        actorId: actor.id,
        timestamp: now,
      });

      if (!after) {
        throw notFound("Request bimbingan tidak ditemukan.");
      }

      await auditService.record({
        actor,
        action: "GUIDANCE_MATERIAL_SUBMITTED",
        resourceType: "guidance-material",
        resourceId: after.id,
        after,
      });

      return json({ data: after }, 201);
    }
  );

  router.post(
    "/students/me/guidance-requests/:guidanceRequestId/revision-items/:revisionItemId/materials",
    async ({ body, params, headers }) => {
      const actor = await authService.requireAnyPermission(
        headers,
        studentMaterialSubmitPermissions
      );
      const request = await readStudentRequestOrThrow(
        actor.id,
        params.guidanceRequestId
      );
      if (request.status !== "Disetujui") {
        throw conflict("Request bimbingan harus disetujui sebelum submit materi.");
      }

      const payload = validateGuidanceMaterialSubmission(
        body,
        params.revisionItemId
      );
      const now = new Date().toISOString();
      const after = await guidanceRequestRepository.submitMaterial(request.id, {
        ...payload,
        actorId: actor.id,
        timestamp: now,
      });

      if (!after) {
        throw notFound("Request bimbingan tidak ditemukan.");
      }

      await auditService.record({
        actor,
        action: "GUIDANCE_REVISION_MATERIAL_SUBMITTED",
        resourceType: "guidance-material",
        resourceId: after.id,
        after,
      });

      return json({ data: after }, 201);
    }
  );

  registerLecturerGuidanceRequestRoutes(router);
  registerCoordinatorGuidanceRequestRoutes(router, "/coordinator");
  registerCoordinatorGuidanceRequestRoutes(router, "/kordinator");
};

const registerLecturerGuidanceRequestRoutes = (router: Router) => {
  router.get("/lecturer/guidance-requests", async ({ headers }) => {
    const actor = await authService.requireAnyPermission(
      headers,
      lecturerReadPermissions
    );

    return json({
      data:
        actor.role === "admin"
          ? []
          : await guidanceRequestRepository.listForLecturer(actor.id),
    });
  });

  router.get(
    "/lecturer/guidance-requests/:guidanceRequestId",
    async ({ params, headers }) => {
      const actor = await authService.requireAnyPermission(
        headers,
        lecturerReadPermissions
      );
      const request = await readRequestOrThrow(params.guidanceRequestId);
      await ensureLecturerCanAccess(actor, request);
      return json({ data: request });
    }
  );

  router.patch(
    "/lecturer/guidance-requests/:guidanceRequestId/validation",
    async ({ body, params, headers }) => {
      const actor = await authService.requireAnyPermission(
        headers,
        lecturerRequestValidationPermissions
      );
      const before = await readRequestOrThrow(params.guidanceRequestId);
      await ensureLecturerCanAccess(actor, before);

      if (before.status !== "Menunggu Validasi Dosen") {
        throw conflict("Request bimbingan belum berada pada status menunggu validasi.");
      }

      const payload = validateGuidanceRequestValidation(body);
      const after = await guidanceRequestRepository.validateRequest(before.id, {
        ...payload,
        actorId: actor.id,
        timestamp: new Date().toISOString(),
      });

      if (!after) {
        throw notFound("Request bimbingan tidak ditemukan.");
      }

      await auditService.record({
        actor,
        action: "LECTURER_GUIDANCE_REQUEST_VALIDATED",
        resourceType: "guidance-request",
        resourceId: after.id,
        before,
        after,
      });

      return json({ data: after });
    }
  );

  router.get(
    "/lecturer/guidance-requests/:guidanceRequestId/materials",
    async ({ params, headers }) => {
      const actor = await authService.requireAnyPermission(
        headers,
        lecturerReadPermissions
      );
      const request = await readRequestOrThrow(params.guidanceRequestId);
      await ensureLecturerCanAccess(actor, request);
      return json({
        data: await guidanceRequestRepository.listMaterials(request.id),
      });
    }
  );

  router.patch(
    "/lecturer/guidance-requests/:guidanceRequestId/materials/:materialId/validation",
    async ({ body, params, headers }) => {
      const actor = await authService.requireAnyPermission(
        headers,
        lecturerMaterialValidationPermissions
      );
      const request = await readRequestOrThrow(params.guidanceRequestId);
      await ensureLecturerCanAccess(actor, request);
      const before =
        (await guidanceRequestRepository.listMaterials(request.id)).find(
          (item) => item.id === params.materialId
        ) || null;

      if (!before) {
        throw notFound("Materi bimbingan tidak ditemukan.");
      }

      const payload = validateGuidanceMaterialValidation(body);
      const after = await guidanceRequestRepository.validateMaterial(before.id, {
        ...payload,
        actorId: actor.id,
        timestamp: new Date().toISOString(),
      });

      if (!after) {
        throw notFound("Materi bimbingan tidak ditemukan.");
      }

      const revisionSync = await syncRevisionMaterialValidation(
        actor,
        request,
        before,
        after
      );

      await auditService.record({
        actor,
        action: "LECTURER_GUIDANCE_MATERIAL_VALIDATED",
        resourceType: "guidance-material",
        resourceId: after.id,
        before,
        after: {
          material: after,
          revisionSync,
        },
      });

      return json({ data: after });
    }
  );
};

const registerCoordinatorGuidanceRequestRoutes = (
  router: Router,
  prefix: string
) => {
  router.get(
    `${prefix}/students/:studentId/guidance-requests`,
    async ({ params, headers }) => {
      await authService.requireAnyPermission(
        headers,
        coordinatorGuidanceReadPermissions
      );
      return json({
        data: await guidanceRequestRepository.listForStudent(params.studentId),
        meta: { studentId: params.studentId },
      });
    }
  );

  router.get(
    `${prefix}/students/:studentId/guidance-requests/:guidanceRequestId`,
    async ({ params, headers }) => {
      await authService.requireAnyPermission(
        headers,
        coordinatorGuidanceReadPermissions
      );
      return json({
        data: await readStudentRequestOrThrow(
          params.studentId,
          params.guidanceRequestId
        ),
        meta: { studentId: params.studentId },
      });
    }
  );

  router.get(
    `${prefix}/students/:studentId/guidance-requests/:guidanceRequestId/materials`,
    async ({ params, headers }) => {
      await authService.requireAnyPermission(
        headers,
        coordinatorGuidanceReadPermissions
      );
      await readStudentRequestOrThrow(params.studentId, params.guidanceRequestId);
      return json({
        data: await guidanceRequestRepository.listMaterials(
          params.guidanceRequestId
        ),
        meta: { studentId: params.studentId },
      });
    }
  );
};
