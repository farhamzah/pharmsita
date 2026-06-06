import type { GuidanceStage } from "../../domain/types";
import { json } from "../../http/response";
import type { Router } from "../../http/router";
import { studentWorkflowRepository } from "../../repositories";
import {
  validateChatMessage,
  validateDocsLink,
  validateFinalFile,
  validateGuidanceApproval,
  validateGuidanceRequest,
  validateGuidanceRequestApproval,
  validateGuidanceSessionUpdate,
  validateScheduleApproval,
} from "../../validation/request-validators";
import { auditService } from "../audit/audit-service";
import { authService } from "../auth/auth-service";

const readStage = (stageId: string) => stageId as GuidanceStage;

export const registerGuidanceRoutes = (router: Router) => {
  router.get("/students/me/guidance/:stageId", async ({ params, headers }) => {
    const actor = await authService.requirePermission(headers, "student.workflow.read");
    return json({ data: await studentWorkflowRepository.getGuidance(actor.id, readStage(params.stageId)) });
  });

  router.patch("/students/me/guidance/:stageId/docs-link", async ({ body, params, headers }) => {
    const actor = await authService.requirePermission(headers, "student.workflow.submit");
    const stageId = readStage(params.stageId);
    const { link } = validateDocsLink(body);
    const before = await studentWorkflowRepository.getGuidance(actor.id, stageId);
    const after = await studentWorkflowRepository.updateGuidance(actor.id, stageId, (workflow) => {
      workflow.googleDocsLink = link;
    });

    await auditService.record({
      actor,
      action: "GUIDANCE_DOCS_LINK_UPDATED",
      resourceType: "guidance",
      resourceId: `${actor.id}:${stageId}`,
      before,
      after,
    });

    return json({ data: after });
  });

  router.patch("/students/me/guidance/:stageId/approval", async ({ body, params, headers }) => {
    const actor = await authService.requirePermission(headers, "student.workflow.submit");
    const stageId = readStage(params.stageId);
    const { pembimbingNum, approved } = validateGuidanceApproval(body);
    const before = await studentWorkflowRepository.getGuidance(actor.id, stageId);
    const after = await studentWorkflowRepository.updateGuidance(actor.id, stageId, (workflow) => {
      if (pembimbingNum === 1) {
        workflow.pembimbing1Approved = approved;
      }

      if (pembimbingNum === 2) {
        workflow.pembimbing2Approved = approved;
      }
    });

    await auditService.record({
      actor,
      action: "GUIDANCE_APPROVAL_UPDATED",
      resourceType: "guidance",
      resourceId: `${actor.id}:${stageId}`,
      before,
      after,
    });

    return json({ data: after });
  });

  router.patch("/students/me/guidance/:stageId/sessions/:sessionId", async ({ body, params, headers }) => {
    const actor = await authService.requirePermission(headers, "student.workflow.submit");
    const stageId = readStage(params.stageId);
    const sessionId = Number(params.sessionId);
    const { title, status } = validateGuidanceSessionUpdate(body);
    const before = await studentWorkflowRepository.getGuidance(actor.id, stageId);
    const after = await studentWorkflowRepository.updateGuidance(actor.id, stageId, (workflow) => {
      const session = workflow.sessions.find((item) => item.id === sessionId);
      if (session) {
        session.title = title;
        session.status = status;
      }
    });

    await auditService.record({
      actor,
      action: "GUIDANCE_SESSION_UPDATED",
      resourceType: "guidance-session",
      resourceId: `${actor.id}:${stageId}:${sessionId}`,
      before,
      after,
    });

    return json({ data: after });
  });

  router.post("/students/me/guidance/:stageId/sessions/:sessionId/chats", async ({ body, params, headers }) => {
    const actor = await authService.requirePermission(headers, "student.workflow.submit");
    const stageId = readStage(params.stageId);
    const sessionId = Number(params.sessionId);
    const chat = validateChatMessage(body);
    const before = await studentWorkflowRepository.getGuidance(actor.id, stageId);
    const after = await studentWorkflowRepository.updateGuidance(actor.id, stageId, (workflow) => {
      const session = workflow.sessions.find((item) => item.id === sessionId);
      session?.chats.push({
        id: `chat_${Date.now()}`,
        ...chat,
        timestamp: new Date().toISOString(),
      });
    });

    await auditService.record({
      actor,
      action: "GUIDANCE_CHAT_ADDED",
      resourceType: "guidance-session",
      resourceId: `${actor.id}:${stageId}:${sessionId}`,
      before,
      after,
    });

    return json({ data: after });
  });

  router.post("/students/me/guidance/:stageId/final-file", async ({ body, params, headers }) => {
    const actor = await authService.requirePermission(headers, "student.workflow.submit");
    const stageId = readStage(params.stageId);
    const { fileName } = validateFinalFile(body);
    const before = await studentWorkflowRepository.getGuidance(actor.id, stageId);
    const after = await studentWorkflowRepository.updateGuidance(actor.id, stageId, (workflow) => {
      workflow.finalFile = fileName;
    });

    await auditService.record({
      actor,
      action: "GUIDANCE_FINAL_FILE_UPLOADED",
      resourceType: "guidance",
      resourceId: `${actor.id}:${stageId}`,
      before,
      after,
    });

    return json({ data: after });
  });

  router.post("/students/me/guidance/:stageId/reset", async ({ params, headers }) => {
    const actor = await authService.requirePermission(headers, "student.workflow.submit");
    const stageId = readStage(params.stageId);
    const before = await studentWorkflowRepository.getGuidance(actor.id, stageId);
    const after = await studentWorkflowRepository.resetGuidance(actor.id, stageId);

    await auditService.record({
      actor,
      action: "GUIDANCE_RESET",
      resourceType: "guidance",
      resourceId: `${actor.id}:${stageId}`,
      before,
      after,
    });

    return json({ data: after });
  });

  router.post("/students/me/guidance/:stageId/request", async ({ body, params, headers }) => {
    const actor = await authService.requirePermission(headers, "student.workflow.submit");
    const stageId = readStage(params.stageId);
    const { note } = validateGuidanceRequest(body);
    const before = await studentWorkflowRepository.getGuidance(actor.id, stageId);
    const after = await studentWorkflowRepository.updateGuidance(actor.id, stageId, (workflow) => {
      workflow.guidanceStatus = "requested";
      workflow.guidanceNote = note;
      workflow.guidanceRequestedAt = new Date().toISOString();
    });

    await auditService.record({
      actor,
      action: "GUIDANCE_REQUESTED",
      resourceType: "guidance",
      resourceId: `${actor.id}:${stageId}`,
      before,
      after,
    });

    return json({ data: after });
  });

  router.patch("/students/me/guidance/:stageId/request", async ({ body, params, headers }) => {
    const actor = await authService.requirePermission(headers, "student.workflow.submit");
    const stageId = readStage(params.stageId);
    const { startDate, startTime, approvalNote } = validateGuidanceRequestApproval(body);
    const before = await studentWorkflowRepository.getGuidance(actor.id, stageId);
    const after = await studentWorkflowRepository.updateGuidance(actor.id, stageId, (workflow) => {
      workflow.guidanceStatus = "approved";
      workflow.guidanceStartDate = startDate;
      workflow.guidanceTime = startTime;
      workflow.guidanceApprovalNote = approvalNote;
      workflow.guidanceApprovedAt = new Date().toISOString();
    });

    await auditService.record({
      actor,
      action: "GUIDANCE_REQUEST_APPROVED",
      resourceType: "guidance",
      resourceId: `${actor.id}:${stageId}`,
      before,
      after,
    });

    return json({ data: after });
  });

  router.post("/students/me/guidance/:stageId/sessions/:sessionId/request", async ({ params, headers }) => {
    const actor = await authService.requirePermission(headers, "student.workflow.submit");
    const stageId = readStage(params.stageId);
    const sessionId = Number(params.sessionId);
    const before = await studentWorkflowRepository.getGuidance(actor.id, stageId);
    const after = await studentWorkflowRepository.updateGuidance(actor.id, stageId, (workflow) => {
      const session = workflow.sessions.find((item) => item.id === sessionId);
      if (session) {
        session.sessionStatus = "requested";
      }
    });

    await auditService.record({
      actor,
      action: "GUIDANCE_SESSION_REQUESTED",
      resourceType: "guidance-session",
      resourceId: `${actor.id}:${stageId}:${sessionId}`,
      before,
      after,
    });

    return json({ data: after });
  });

  router.patch("/students/me/guidance/:stageId/sessions/:sessionId/approval", async ({ body, params, headers }) => {
    const actor = await authService.requirePermission(headers, "student.workflow.submit");
    const stageId = readStage(params.stageId);
    const sessionId = Number(params.sessionId);
    const { startDate, startTime } = validateScheduleApproval(body);
    const before = await studentWorkflowRepository.getGuidance(actor.id, stageId);
    const after = await studentWorkflowRepository.updateGuidance(actor.id, stageId, (workflow) => {
      const session = workflow.sessions.find((item) => item.id === sessionId);
      if (session) {
        session.sessionStatus = "approved";
        session.sessionStartDate = startDate;
        session.sessionStartTime = startTime;
      }
    });

    await auditService.record({
      actor,
      action: "GUIDANCE_SESSION_APPROVED",
      resourceType: "guidance-session",
      resourceId: `${actor.id}:${stageId}:${sessionId}`,
      before,
      after,
    });

    return json({ data: after });
  });

  router.post("/students/me/guidance/:stageId/request/reset", async ({ params, headers }) => {
    const actor = await authService.requirePermission(headers, "student.workflow.submit");
    const stageId = readStage(params.stageId);
    const before = await studentWorkflowRepository.getGuidance(actor.id, stageId);
    const after = await studentWorkflowRepository.updateGuidance(actor.id, stageId, (workflow) => {
      workflow.guidanceStatus = "idle";
      workflow.guidanceRequestedAt = null;
      workflow.guidanceApprovedAt = null;
      workflow.guidanceStartDate = null;
      workflow.guidanceTime = null;
      workflow.guidanceNote = null;
      workflow.guidanceApprovalNote = null;
    });

    await auditService.record({
      actor,
      action: "GUIDANCE_REQUEST_RESET",
      resourceType: "guidance",
      resourceId: `${actor.id}:${stageId}`,
      before,
      after,
    });

    return json({ data: after });
  });
};
