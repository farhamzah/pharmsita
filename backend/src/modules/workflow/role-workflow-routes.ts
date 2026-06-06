import type {
  ExamStage,
  GuidanceStage,
  RevisionStage,
  StepId,
  StepStatus,
} from "../../domain/types";
import { json } from "../../http/response";
import type { Router } from "../../http/router";
import { studentWorkflowRepository } from "../../repositories";
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
  validateProgressUpdate,
} from "../../validation/request-validators";
import { auditService } from "../audit/audit-service";
import { authService } from "../auth/auth-service";

const readGuidanceStage = (stageId: string) => stageId as GuidanceStage;
const readExamStage = (stageId: string) => stageId as ExamStage;
const readRevisionStage = (stageId: string) => stageId as RevisionStage;
const readStepId = (stepId: string) => stepId as StepId;
const resourceId = (studentId: string, itemId: string) => `${studentId}:${itemId}`;

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
};
