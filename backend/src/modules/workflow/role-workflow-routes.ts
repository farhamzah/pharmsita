import crypto from "node:crypto";
import type {
  CoordinatorLifecycleStageCode,
  ExamStage,
  GuidanceStage,
  RevisionStage,
  SortDirection,
  StepId,
  StepStatus,
  StudentDirectorySortBy,
  SupervisorAssignment,
  UserAccount,
} from "../../domain/types";
import { notFound, validationError } from "../../http/errors";
import { json } from "../../http/response";
import type { Router } from "../../http/router";
import {
  finalProjectRegistrationRepository,
  studentWorkflowRepository,
  userRepository,
} from "../../repositories";
import {
  validateExamAssessment,
  validateExamStatus,
  validateGuidanceApproval,
  validateGuidanceRequestApproval,
  validateRequirementBundle,
  validateRevisionApproval,
  validateRevisionItemStatus,
  validateScheduleApproval,
  validateThesisSubmissions,
  validateLecturerQuotaUpdate,
  validateProgressUpdate,
  validateSupervisorAssignmentUpdate,
} from "../../validation/request-validators";
import { auditService } from "../audit/audit-service";
import { authService } from "../auth/auth-service";
import {
  assertRevisionStepCanBeCompleted,
  getRevisionCompletionGateStatus,
  isRevisionStepId,
  recordRevisionCompletionGateAudit,
} from "../student/revision-completion-gate";

const readGuidanceStage = (stageId: string) => stageId as GuidanceStage;
const readExamStage = (stageId: string) => stageId as ExamStage;
const readRevisionStage = (stageId: string) => stageId as RevisionStage;
const readStepId = (stepId: string) => stepId as StepId;
const resourceId = (studentId: string, itemId: string) => `${studentId}:${itemId}`;
const coordinatorLifecycleStageCodes = new Set<CoordinatorLifecycleStageCode>([
  "UNREGISTERED",
  "PROPOSAL_GUIDANCE",
  "PROPOSAL_SEMINAR",
  "PROPOSAL_REVISION",
  "FINAL_GUIDANCE",
  "FINAL_DEFENSE",
  "FINAL_REVISION",
  "COMPLETED",
]);

const readCoordinatorLifecycleStageCode = (
  value: string | null
): CoordinatorLifecycleStageCode | null => {
  if (!value) {
    return null;
  }

  if (coordinatorLifecycleStageCodes.has(value as CoordinatorLifecycleStageCode)) {
    return value as CoordinatorLifecycleStageCode;
  }

  throw validationError("Payload tidak valid.", {
    "query.stage": [
      "Stage harus salah satu dari UNREGISTERED, PROPOSAL_GUIDANCE, PROPOSAL_SEMINAR, PROPOSAL_REVISION, FINAL_GUIDANCE, FINAL_DEFENSE, FINAL_REVISION, atau COMPLETED.",
    ],
  });
};

const readPositiveIntegerQuery = (
  query: URLSearchParams,
  key: string,
  fallback: number,
  max: number
) => {
  const raw = query.get(key);
  if (!raw) {
    return fallback;
  }

  const value = Number(raw);
  if (!Number.isInteger(value) || value < 1) {
    throw validationError("Payload tidak valid.", {
      [`query.${key}`]: [`${key} harus berupa angka positif.`],
    });
  }

  return Math.min(value, max);
};

const readSearchQuery = (query: URLSearchParams) => {
  const value = query.get("q")?.trim() || "";
  return value.length > 0 ? value.slice(0, 120) : null;
};

const studentDirectorySortFields = new Set<StudentDirectorySortBy>([
  "name",
  "nim",
  "stage",
  "supervisor1",
]);

const readStudentDirectorySortBy = (value: string | null): StudentDirectorySortBy => {
  if (!value) {
    return "name";
  }

  if (studentDirectorySortFields.has(value as StudentDirectorySortBy)) {
    return value as StudentDirectorySortBy;
  }

  throw validationError("Payload tidak valid.", {
    "query.sortBy": ["sortBy harus salah satu dari name, nim, stage, atau supervisor1."],
  });
};

const readSortDirection = (value: string | null): SortDirection => {
  if (!value) {
    return "asc";
  }

  if (value === "asc" || value === "desc") {
    return value;
  }

  throw validationError("Payload tidak valid.", {
    "query.sortDir": ["sortDir harus asc atau desc."],
  });
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

const lecturerReadPermissions = [
  "lecturer.workflow.read",
  "lecturer.guidance.read",
  "lecturer.guidance.approve",
  "lecturer.exam.assess",
  "lecturer.revision.review",
  "workflow.override",
];

const coordinatorReadPermissions = [
  "coordinator.workflow.read",
  "coordinator.monitoring.read",
  "coordinator.progress.manage",
  "coordinator.exam.manage",
  "coordinator.validation.manage",
  "workflow.override",
];

export const registerRoleWorkflowRoutes = (router: Router) => {
  router.get("/lecturer/students", async ({ headers }) => {
    const actor = await authService.requireAnyPermission(headers, lecturerReadPermissions);
    const result = await userRepository.listStudentDirectory({ lecturerId: actor.id });
    return json({
      data: result.data,
      meta: { ...result.meta, scope: "lecturer", lecturerId: actor.id },
    });
  });

  router.get("/lecturer/students/:studentId/progress", async ({ params, headers }) => {
    await authService.requireAnyPermission(headers, lecturerReadPermissions);
    return json({
      data: await studentWorkflowRepository.getProgressSteps(params.studentId),
      meta: { studentId: params.studentId },
    });
  });

  router.get("/lecturer/students/:studentId/guidance/:stageId", async ({ params, headers }) => {
    await authService.requireAnyPermission(headers, lecturerReadPermissions);
    return json({
      data: await studentWorkflowRepository.getGuidance(params.studentId, readGuidanceStage(params.stageId)),
      meta: { studentId: params.studentId },
    });
  });

  router.patch("/lecturer/students/:studentId/guidance/:stageId/approval", async ({ body, params, headers }) => {
    const actor = await authService.requireAnyPermission(headers, [
      "lecturer.guidance.approve",
      "workflow.override",
    ]);
    const stageId = readGuidanceStage(params.stageId);
    const { pembimbingNum, approved } = validateGuidanceApproval(body);
    const before = await studentWorkflowRepository.getGuidance(params.studentId, stageId);
    const after = await studentWorkflowRepository.updateGuidance(params.studentId, stageId, (workflow) => {
      if (pembimbingNum === 1) {
        workflow.pembimbing1Approved = approved;
      }

      if (pembimbingNum === 2) {
        workflow.pembimbing2Approved = approved;
      }
    });

    await auditService.record({
      actor,
      action: "LECTURER_GUIDANCE_APPROVAL_UPDATED",
      resourceType: "guidance",
      resourceId: resourceId(params.studentId, stageId),
      before,
      after,
    });

    return json({ data: after });
  });

  router.patch("/lecturer/students/:studentId/guidance/:stageId/request", async ({ body, params, headers }) => {
    const actor = await authService.requireAnyPermission(headers, [
      "lecturer.guidance.approve",
      "workflow.override",
    ]);
    const stageId = readGuidanceStage(params.stageId);
    const { startDate, startTime, approvalNote } = validateGuidanceRequestApproval(body);
    const before = await studentWorkflowRepository.getGuidance(params.studentId, stageId);
    const after = await studentWorkflowRepository.updateGuidance(params.studentId, stageId, (workflow) => {
      workflow.guidanceStatus = "approved";
      workflow.guidanceStartDate = startDate;
      workflow.guidanceTime = startTime;
      workflow.guidanceApprovalNote = approvalNote;
      workflow.guidanceApprovedAt = new Date().toISOString();
    });

    await auditService.record({
      actor,
      action: "LECTURER_GUIDANCE_REQUEST_APPROVED",
      resourceType: "guidance",
      resourceId: resourceId(params.studentId, stageId),
      before,
      after,
    });

    return json({ data: after });
  });

  router.patch("/lecturer/students/:studentId/guidance/:stageId/sessions/:sessionId/approval", async ({ body, params, headers }) => {
    const actor = await authService.requireAnyPermission(headers, [
      "lecturer.guidance.approve",
      "workflow.override",
    ]);
    const stageId = readGuidanceStage(params.stageId);
    const sessionId = Number(params.sessionId);
    const { startDate, startTime } = validateScheduleApproval(body);
    const before = await studentWorkflowRepository.getGuidance(params.studentId, stageId);
    const after = await studentWorkflowRepository.updateGuidance(params.studentId, stageId, (workflow) => {
      const session = workflow.sessions.find((item) => item.id === sessionId);
      if (session) {
        session.sessionStatus = "approved";
        session.sessionStartDate = startDate;
        session.sessionStartTime = startTime;
      }
    });

    await auditService.record({
      actor,
      action: "LECTURER_GUIDANCE_SESSION_APPROVED",
      resourceType: "guidance-session",
      resourceId: resourceId(params.studentId, `${stageId}:${sessionId}`),
      before,
      after,
    });

    return json({ data: after });
  });

  router.get("/lecturer/students/:studentId/exams/:stageId", async ({ params, headers }) => {
    await authService.requireAnyPermission(headers, lecturerReadPermissions);
    return json({
      data: await studentWorkflowRepository.getExam(params.studentId, readExamStage(params.stageId)),
      meta: { studentId: params.studentId },
    });
  });

  router.patch("/lecturer/students/:studentId/exams/:stageId/assessment", async ({ body, params, headers }) => {
    const actor = await authService.requireAnyPermission(headers, [
      "lecturer.exam.assess",
      "workflow.override",
    ]);
    const stageId = readExamStage(params.stageId);
    const { grade, resultStatus } = validateExamAssessment(body);
    const before = await studentWorkflowRepository.getExam(params.studentId, stageId);
    const after = await studentWorkflowRepository.updateExam(params.studentId, stageId, (workflow) => {
      workflow.grade = grade;
      workflow.resultStatus = resultStatus;
      workflow.status = "selesai";
      workflow.revisionNotes =
        resultStatus === "lulus-dengan-revisi"
          ? ["Perjelas latar belakang.", "Tambahkan pembahasan statistik."]
          : [];
    });

    await auditService.record({
      actor,
      action: "LECTURER_EXAM_ASSESSMENT_UPDATED",
      resourceType: "exam",
      resourceId: resourceId(params.studentId, stageId),
      before,
      after,
    });

    return json({ data: after });
  });

  router.get("/lecturer/students/:studentId/revisions/:stageId", async ({ params, headers }) => {
    await authService.requireAnyPermission(headers, lecturerReadPermissions);
    return json({
      data: await studentWorkflowRepository.getRevision(params.studentId, readRevisionStage(params.stageId)),
      meta: { studentId: params.studentId },
    });
  });

  router.get("/lecturer/students/:studentId/revisions/:stageId/completion-gate", async ({ params, headers }) => {
    const actor = await authService.requireAnyPermission(headers, lecturerReadPermissions);
    const stageId = readRevisionStage(params.stageId);
    const gate = await getRevisionCompletionGateStatus(params.studentId, stageId);

    await recordRevisionCompletionGateAudit({
      actor,
      action: "REVISION_COMPLETION_GATE_READ",
      studentId: params.studentId,
      stageId,
      gate,
      reason: "Lecturer read revision completion gate.",
    });

    return json({ data: gate, meta: { studentId: params.studentId } });
  });

  router.patch("/lecturer/students/:studentId/revisions/:stageId/items/:itemId/status", async ({ body, params, headers }) => {
    const actor = await authService.requireAnyPermission(headers, [
      "lecturer.revision.review",
      "workflow.override",
    ]);
    const stageId = readRevisionStage(params.stageId);
    const itemId = Number(params.itemId);
    const { status } = validateRevisionItemStatus(body);
    const before = await studentWorkflowRepository.getRevision(params.studentId, stageId);
    const after = await studentWorkflowRepository.updateRevision(params.studentId, stageId, (workflow) => {
      const item = workflow.items.find((entry) => entry.id === itemId);
      if (item) {
        item.status = status;
      }
    });

    await auditService.record({
      actor,
      action: "LECTURER_REVISION_ITEM_STATUS_UPDATED",
      resourceType: "revision-item",
      resourceId: resourceId(params.studentId, `${stageId}:${itemId}`),
      before,
      after,
    });

    return json({ data: after });
  });

  router.patch("/lecturer/students/:studentId/revisions/:stageId/approval", async ({ body, params, headers }) => {
    const actor = await authService.requireAnyPermission(headers, [
      "lecturer.revision.review",
      "workflow.override",
    ]);
    const stageId = readRevisionStage(params.stageId);
    const { role, status } = validateRevisionApproval(body);
    const before = await studentWorkflowRepository.getRevision(params.studentId, stageId);
    const after = await studentWorkflowRepository.updateRevision(params.studentId, stageId, (workflow) => {
      if (role === "penguji1") {
        workflow.penguji1Approved = Boolean(status);
      }
      if (role === "penguji2") {
        workflow.penguji2Approved = Boolean(status);
      }
      if (role === "ketua-sidang") {
        workflow.ketuaSidangStatus = status as "pending" | "approved" | "rejected";
      }
    });

    await auditService.record({
      actor,
      action: "LECTURER_REVISION_APPROVAL_UPDATED",
      resourceType: "revision",
      resourceId: resourceId(params.studentId, stageId),
      before,
      after,
    });

    return json({ data: after });
  });

  registerCoordinatorWorkflowRoutes(router, "/coordinator");
  registerCoordinatorWorkflowRoutes(router, "/kordinator");
};

const registerCoordinatorWorkflowRoutes = (router: Router, prefix: string) => {
  router.get(`${prefix}/lecturers`, async ({ headers }) => {
    await authService.requireAnyPermission(headers, coordinatorReadPermissions);
    return json({
      data: await userRepository.listLecturerDirectory(),
      meta: { scope: prefix.replace("/", "") },
    });
  });

  router.patch(`${prefix}/lecturers/:lecturerId/quota`, async ({ body, params, headers }) => {
    const actor = await authService.requireAnyPermission(headers, [
      "coordinator.validation.manage",
      "workflow.override",
    ]);
    const payload = validateLecturerQuotaUpdate(body);
    await ensureLecturer(params.lecturerId, "params.lecturerId");
    const before =
      (await userRepository.listLecturerDirectory()).find(
        (item) => item.id === params.lecturerId
      ) || null;

    if (!before) {
      throw notFound("Dosen tidak ditemukan.");
    }

    const activeQuota = Math.max(before.p1Active, before.p2Active);
    if (payload.quotaLimit < activeQuota) {
      throw validationError("Payload tidak valid.", {
        "body.quotaLimit": [
          `Kuota tidak boleh kurang dari mahasiswa aktif (${activeQuota}).`,
        ],
      });
    }

    const after = await userRepository.updateLecturerQuota(params.lecturerId, {
      quotaLimit: payload.quotaLimit,
      actorId: actor.id,
      timestamp: new Date().toISOString(),
    });

    if (!after) {
      throw notFound("Dosen tidak ditemukan.");
    }

    await auditService.record({
      actor,
      action: "COORDINATOR_LECTURER_QUOTA_UPDATED",
      resourceType: "lecturer-quota",
      resourceId: params.lecturerId,
      before,
      after,
    });

    return json({ data: after, meta: { lecturerId: params.lecturerId } });
  });

  router.get(`${prefix}/students`, async ({ headers, query }) => {
    await authService.requireAnyPermission(headers, coordinatorReadPermissions);
    const stage = readCoordinatorLifecycleStageCode(query.get("stage"));
    const page = readPositiveIntegerQuery(query, "page", 1, 100000);
    const limit = readPositiveIntegerQuery(query, "limit", 20, 100);
    const q = readSearchQuery(query);
    const sortBy = readStudentDirectorySortBy(query.get("sortBy"));
    const sortDir = readSortDirection(query.get("sortDir"));
    const result = await userRepository.listStudentDirectory({
      stage,
      q,
      page,
      limit,
      sortBy,
      sortDir,
    });
    return json({
      data: result.data,
      meta: {
        ...result.meta,
        scope: prefix.replace("/", ""),
        stage,
        q,
      },
    });
  });

  router.get(`${prefix}/reports/lifecycle-summary`, async ({ headers }) => {
    await authService.requireAnyPermission(headers, [
      "coordinator.monitoring.read",
      "coordinator.workflow.read",
      "workflow.override",
    ]);
    return json({
      data: await userRepository.listCoordinatorLifecycleSummary(),
      meta: {
        scope: prefix.replace("/", ""),
        source: "canonical_coordinator_reporting_summary",
      },
    });
  });

  router.patch(
    `${prefix}/students/:studentId/supervisor-assignments`,
    async ({ body, params, headers }) => {
      const actor = await authService.requireAnyPermission(headers, [
        "coordinator.validation.manage",
        "coordinator.final-project-registration.validate",
        "workflow.override",
      ]);
      const payload = validateSupervisorAssignmentUpdate(body);
      const before = await finalProjectRegistrationRepository.getActiveByStudentId(
        params.studentId
      );
      const now = new Date().toISOString();
      const supervisor1 = await ensureLecturer(
        payload.pembimbing1Id,
        "body.pembimbing1Id"
      );
      const supervisor2 = await ensureLecturer(
        payload.pembimbing2Id,
        "body.pembimbing2Id"
      );
      const assignments = [
        buildSupervisorAssignment(supervisor1, 1, actor, now, payload.coordinatorNote),
        buildSupervisorAssignment(supervisor2, 2, actor, now, payload.coordinatorNote),
      ];
      const after =
        await finalProjectRegistrationRepository.replaceSupervisorAssignmentsByStudentId(
          params.studentId,
          assignments,
          {
            actorId: actor.id,
            timestamp: now,
            coordinatorNote: payload.coordinatorNote,
          }
        );

      if (!after) {
        throw notFound(
          "Pendaftaran TA disetujui untuk mahasiswa ini tidak ditemukan."
        );
      }

      await auditService.record({
        actor,
        action: "COORDINATOR_SUPERVISOR_ASSIGNMENTS_UPDATED",
        resourceType: "supervisor-assignments",
        resourceId: params.studentId,
        before,
        after,
      });

      return json({ data: after, meta: { studentId: params.studentId } });
    }
  );

  router.get(`${prefix}/students/:studentId/progress`, async ({ params, headers }) => {
    await authService.requireAnyPermission(headers, coordinatorReadPermissions);
    return json({
      data: await studentWorkflowRepository.getProgressSteps(params.studentId),
      meta: { studentId: params.studentId },
    });
  });

  router.patch(`${prefix}/students/:studentId/progress/:stepId`, async ({ body, params, headers }) => {
    const actor = await authService.requireAnyPermission(headers, [
      "coordinator.progress.manage",
      "workflow.override",
    ]);
    const stepId = readStepId(params.stepId);
    const { status } = validateProgressUpdate(body);
    if (status === "completed" && isRevisionStepId(stepId)) {
      await assertRevisionStepCanBeCompleted(params.studentId, stepId, actor);
    }
    const before = await studentWorkflowRepository.getProgressSteps(params.studentId);
    const after = await studentWorkflowRepository.updateProgressStep(
      params.studentId,
      stepId,
      status as StepStatus
    );

    await auditService.record({
      actor,
      action: "COORDINATOR_PROGRESS_UPDATED",
      resourceType: "student-progress",
      resourceId: resourceId(params.studentId, stepId),
      before,
      after,
    });

    return json({ data: after });
  });

  router.get(`${prefix}/students/:studentId/requirements/initial`, async ({ params, headers }) => {
    await authService.requireAnyPermission(headers, coordinatorReadPermissions);
    return json({
      data: await studentWorkflowRepository.getInitialRequirements(params.studentId),
      meta: { studentId: params.studentId },
    });
  });

  router.put(`${prefix}/students/:studentId/requirements/initial`, async ({ body, params, headers }) => {
    const actor = await authService.requireAnyPermission(headers, [
      "coordinator.validation.manage",
      "workflow.override",
    ]);
    const payload = validateRequirementBundle(body);
    const before = await studentWorkflowRepository.getInitialRequirements(params.studentId);
    const after = await studentWorkflowRepository.saveInitialRequirements(params.studentId, payload);

    await auditService.record({
      actor,
      action: "COORDINATOR_INITIAL_REQUIREMENTS_REPLACED",
      resourceType: "student-requirements",
      resourceId: resourceId(params.studentId, "initial"),
      before,
      after,
    });

    return json({ data: after });
  });

  router.get(`${prefix}/students/:studentId/requirements/stages/:stageId`, async ({ params, headers }) => {
    await authService.requireAnyPermission(headers, coordinatorReadPermissions);
    return json({
      data: await studentWorkflowRepository.getStageRequirements(params.studentId, params.stageId),
      meta: { studentId: params.studentId },
    });
  });

  router.put(`${prefix}/students/:studentId/requirements/stages/:stageId`, async ({ body, params, headers }) => {
    const actor = await authService.requireAnyPermission(headers, [
      "coordinator.validation.manage",
      "workflow.override",
    ]);
    const payload = validateRequirementBundle(body);
    const before = await studentWorkflowRepository.getStageRequirements(params.studentId, params.stageId);
    const after = await studentWorkflowRepository.saveStageRequirements(params.studentId, params.stageId, payload);

    await auditService.record({
      actor,
      action: "COORDINATOR_STAGE_REQUIREMENTS_REPLACED",
      resourceType: "student-requirements",
      resourceId: resourceId(params.studentId, params.stageId),
      before,
      after,
    });

    return json({ data: after });
  });

  router.get(`${prefix}/students/:studentId/thesis-submissions`, async ({ params, headers }) => {
    await authService.requireAnyPermission(headers, coordinatorReadPermissions);
    return json({
      data: await studentWorkflowRepository.listThesisSubmissions(params.studentId),
      meta: { studentId: params.studentId },
    });
  });

  router.put(`${prefix}/students/:studentId/thesis-submissions`, async ({ body, params, headers }) => {
    const actor = await authService.requireAnyPermission(headers, [
      "coordinator.validation.manage",
      "workflow.override",
    ]);
    const payload = validateThesisSubmissions(body);
    const before = await studentWorkflowRepository.listThesisSubmissions(params.studentId);
    const after = await studentWorkflowRepository.replaceThesisSubmissions(params.studentId, payload);

    await auditService.record({
      actor,
      action: "COORDINATOR_THESIS_SUBMISSIONS_REPLACED",
      resourceType: "thesis-submissions",
      resourceId: params.studentId,
      before,
      after,
    });

    return json({ data: after });
  });

  router.get(`${prefix}/students/:studentId/guidance/:stageId`, async ({ params, headers }) => {
    await authService.requireAnyPermission(headers, coordinatorReadPermissions);
    return json({
      data: await studentWorkflowRepository.getGuidance(params.studentId, readGuidanceStage(params.stageId)),
      meta: { studentId: params.studentId },
    });
  });

  router.get(`${prefix}/students/:studentId/exams/:stageId`, async ({ params, headers }) => {
    await authService.requireAnyPermission(headers, coordinatorReadPermissions);
    return json({
      data: await studentWorkflowRepository.getExam(params.studentId, readExamStage(params.stageId)),
      meta: { studentId: params.studentId },
    });
  });

  router.patch(`${prefix}/students/:studentId/exams/:stageId/status`, async ({ body, params, headers }) => {
    const actor = await authService.requireAnyPermission(headers, [
      "coordinator.exam.manage",
      "workflow.override",
    ]);
    const stageId = readExamStage(params.stageId);
    const { status } = validateExamStatus(body);
    const before = await studentWorkflowRepository.getExam(params.studentId, stageId);
    const after = await studentWorkflowRepository.updateExam(params.studentId, stageId, (workflow) => {
      workflow.status = status;
    });

    await auditService.record({
      actor,
      action: "COORDINATOR_EXAM_STATUS_UPDATED",
      resourceType: "exam",
      resourceId: resourceId(params.studentId, stageId),
      before,
      after,
    });

    return json({ data: after });
  });

  router.get(`${prefix}/students/:studentId/revisions/:stageId`, async ({ params, headers }) => {
    await authService.requireAnyPermission(headers, coordinatorReadPermissions);
    return json({
      data: await studentWorkflowRepository.getRevision(params.studentId, readRevisionStage(params.stageId)),
      meta: { studentId: params.studentId },
    });
  });

  router.get(`${prefix}/students/:studentId/revisions/:stageId/completion-gate`, async ({ params, headers }) => {
    const actor = await authService.requireAnyPermission(headers, coordinatorReadPermissions);
    const stageId = readRevisionStage(params.stageId);
    const gate = await getRevisionCompletionGateStatus(params.studentId, stageId);

    await recordRevisionCompletionGateAudit({
      actor,
      action: "REVISION_COMPLETION_GATE_READ",
      studentId: params.studentId,
      stageId,
      gate,
      reason: "Coordinator read revision completion gate.",
    });

    return json({ data: gate, meta: { studentId: params.studentId } });
  });
};
