import type { ExamStage } from "../../domain/types";
import { json } from "../../http/response";
import type { Router } from "../../http/router";
import { studentWorkflowRepository } from "../../repositories";
import {
  validateDocsLink,
  validateExamAssessment,
  validateExamStatus,
  validateStringIdBody,
} from "../../validation/request-validators";
import { auditService } from "../audit/audit-service";
import { authService } from "../auth/auth-service";

const readStage = (stageId: string) => stageId as ExamStage;

export const registerExamRoutes = (router: Router) => {
  router.get("/students/me/exams/:stageId", async ({ params, headers }) => {
    const actor = await authService.requirePermission(headers, "student.workflow.read");
    return json({ data: await studentWorkflowRepository.getExam(actor.id, readStage(params.stageId)) });
  });

  router.patch("/students/me/exams/:stageId/status", async ({ body, params, headers }) => {
    const actor = await authService.requirePermission(headers, "student.workflow.submit");
    const stageId = readStage(params.stageId);
    const { status } = validateExamStatus(body);
    const before = await studentWorkflowRepository.getExam(actor.id, stageId);
    const after = await studentWorkflowRepository.updateExam(actor.id, stageId, (workflow) => {
      workflow.status = status;
    });

    await auditService.record({
      actor,
      action: "EXAM_STATUS_UPDATED",
      resourceType: "exam",
      resourceId: `${actor.id}:${stageId}`,
      before,
      after,
    });

    return json({ data: after });
  });

  router.patch("/students/me/exams/:stageId/assessment", async ({ body, params, headers }) => {
    const actor = await authService.requirePermission(headers, "student.workflow.submit");
    const stageId = readStage(params.stageId);
    const { grade, resultStatus } = validateExamAssessment(body);
    const before = await studentWorkflowRepository.getExam(actor.id, stageId);
    const after = await studentWorkflowRepository.updateExam(actor.id, stageId, (workflow) => {
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
      action: "EXAM_ASSESSMENT_UPDATED",
      resourceType: "exam",
      resourceId: `${actor.id}:${stageId}`,
      before,
      after,
    });

    return json({ data: after });
  });

  router.patch("/students/me/exams/:stageId/requirements/toggle", async ({ body, params, headers }) => {
    const actor = await authService.requirePermission(headers, "student.workflow.submit");
    const stageId = readStage(params.stageId);
    const requirementId = validateStringIdBody(body, "requirementId");
    const before = await studentWorkflowRepository.getExam(actor.id, stageId);
    const after = await studentWorkflowRepository.updateExam(actor.id, stageId, (workflow) => {
      const requirement = workflow.requirements.find((item) => item.id === requirementId);
      if (requirement) {
        requirement.fulfilled = !requirement.fulfilled;
      }
    });

    await auditService.record({
      actor,
      action: "EXAM_REQUIREMENT_TOGGLED",
      resourceType: "exam-requirement",
      resourceId: `${actor.id}:${stageId}:${requirementId}`,
      before,
      after,
    });

    return json({ data: after });
  });

  router.patch("/students/me/exams/:stageId/panelists/toggle", async ({ body, params, headers }) => {
    const actor = await authService.requirePermission(headers, "student.workflow.submit");
    const stageId = readStage(params.stageId);
    const panelistId = validateStringIdBody(body, "panelistId");
    const before = await studentWorkflowRepository.getExam(actor.id, stageId);
    const after = await studentWorkflowRepository.updateExam(actor.id, stageId, (workflow) => {
      const panelist = workflow.panelists.find((item) => item.id === panelistId);
      if (panelist) {
        panelist.approved = !panelist.approved;
      }
    });

    await auditService.record({
      actor,
      action: "EXAM_PANELIST_TOGGLED",
      resourceType: "exam-panelist",
      resourceId: `${actor.id}:${stageId}:${panelistId}`,
      before,
      after,
    });

    return json({ data: after });
  });

  router.patch("/students/me/exams/:stageId/docs-link", async ({ body, params, headers }) => {
    const actor = await authService.requirePermission(headers, "student.workflow.submit");
    const stageId = readStage(params.stageId);
    const { link } = validateDocsLink(body);
    const before = await studentWorkflowRepository.getExam(actor.id, stageId);
    const after = await studentWorkflowRepository.updateExam(actor.id, stageId, (workflow) => {
      workflow.googleDocsLink = link;
    });

    await auditService.record({
      actor,
      action: "EXAM_DOCS_LINK_UPDATED",
      resourceType: "exam",
      resourceId: `${actor.id}:${stageId}`,
      before,
      after,
    });

    return json({ data: after });
  });

  router.post("/students/me/exams/:stageId/simulate-all-approved", async ({ params, headers }) => {
    const actor = await authService.requirePermission(headers, "student.workflow.submit");
    const stageId = readStage(params.stageId);
    const before = await studentWorkflowRepository.getExam(actor.id, stageId);
    const after = await studentWorkflowRepository.updateExam(actor.id, stageId, (workflow) => {
      workflow.requirements.forEach((item) => {
        item.fulfilled = true;
      });
      workflow.panelists.forEach((item) => {
        item.approved = true;
      });
    });

    await auditService.record({
      actor,
      action: "EXAM_SIMULATED_ALL_APPROVED",
      resourceType: "exam",
      resourceId: `${actor.id}:${stageId}`,
      before,
      after,
    });

    return json({ data: after });
  });

  router.post("/students/me/exams/:stageId/reset", async ({ params, headers }) => {
    const actor = await authService.requirePermission(headers, "student.workflow.submit");
    const stageId = readStage(params.stageId);
    const before = await studentWorkflowRepository.getExam(actor.id, stageId);
    const after = await studentWorkflowRepository.resetExam(actor.id, stageId);

    await auditService.record({
      actor,
      action: "EXAM_RESET",
      resourceType: "exam",
      resourceId: `${actor.id}:${stageId}`,
      before,
      after,
    });

    return json({ data: after });
  });
};
