import type { RevisionStage } from "../../domain/types";
import { json } from "../../http/response";
import type { Router } from "../../http/router";
import { studentWorkflowRepository } from "../../repositories";
import {
  validateChatMessage,
  validateFinalFile,
  validateRevisionApproval,
  validateRevisionItemStatus,
  validateRevisionResolution,
} from "../../validation/request-validators";
import { auditService } from "../audit/audit-service";
import { authService } from "../auth/auth-service";

const readStage = (stageId: string) => stageId as RevisionStage;

export const registerRevisionRoutes = (router: Router) => {
  router.get("/students/me/revisions/:stageId", async ({ params, headers }) => {
    const actor = await authService.requirePermission(headers, "student.workflow.read");
    return json({ data: await studentWorkflowRepository.getRevision(actor.id, readStage(params.stageId)) });
  });

  router.patch("/students/me/revisions/:stageId/items/:itemId/status", async ({ body, params, headers }) => {
    const actor = await authService.requirePermission(headers, "student.workflow.submit");
    const stageId = readStage(params.stageId);
    const itemId = Number(params.itemId);
    const { status } = validateRevisionItemStatus(body);
    const before = await studentWorkflowRepository.getRevision(actor.id, stageId);
    const after = await studentWorkflowRepository.updateRevision(actor.id, stageId, (workflow) => {
      const item = workflow.items.find((entry) => entry.id === itemId);
      if (item) {
        item.status = status;
      }
    });

    await auditService.record({
      actor,
      action: "REVISION_ITEM_STATUS_UPDATED",
      resourceType: "revision-item",
      resourceId: `${actor.id}:${stageId}:${itemId}`,
      before,
      after,
    });

    return json({ data: after });
  });

  router.post("/students/me/revisions/:stageId/items/:itemId/submission", async ({ body, params, headers }) => {
    const actor = await authService.requirePermission(headers, "student.workflow.submit");
    const stageId = readStage(params.stageId);
    const itemId = Number(params.itemId);
    const { penyelesaian, penyelesaianLink } = validateRevisionResolution(body);
    const submittedAt = new Date().toISOString();
    const before = await studentWorkflowRepository.getRevision(actor.id, stageId);
    const after = await studentWorkflowRepository.updateRevision(actor.id, stageId, (workflow) => {
      const item = workflow.items.find((entry) => entry.id === itemId);
      if (item) {
        item.status = "in progress";
        item.submittedAt = submittedAt;
        item.penyelesaian = penyelesaian;
        item.penyelesaianLink = penyelesaianLink;
        workflow.submittedAt = submittedAt;
      }
    });

    await auditService.record({
      actor,
      action: "REVISION_RESOLUTION_SUBMITTED",
      resourceType: "revision-item",
      resourceId: `${actor.id}:${stageId}:${itemId}`,
      before,
      after,
    });

    return json({ data: after });
  });

  router.post("/students/me/revisions/:stageId/items/:itemId/chats", async ({ body, params, headers }) => {
    const actor = await authService.requirePermission(headers, "student.workflow.submit");
    const stageId = readStage(params.stageId);
    const itemId = Number(params.itemId);
    const chat = validateChatMessage(body);
    const before = await studentWorkflowRepository.getRevision(actor.id, stageId);
    const after = await studentWorkflowRepository.updateRevision(actor.id, stageId, (workflow) => {
      const item = workflow.items.find((entry) => entry.id === itemId);
      item?.chats.push({
        id: `chat_${Date.now()}`,
        ...chat,
        timestamp: new Date().toISOString(),
      });
    });

    await auditService.record({
      actor,
      action: "REVISION_CHAT_ADDED",
      resourceType: "revision-item",
      resourceId: `${actor.id}:${stageId}:${itemId}`,
      before,
      after,
    });

    return json({ data: after });
  });

  router.patch("/students/me/revisions/:stageId/approval", async ({ body, params, headers }) => {
    const actor = await authService.requirePermission(headers, "student.workflow.submit");
    const stageId = readStage(params.stageId);
    const { role, status } = validateRevisionApproval(body);
    const before = await studentWorkflowRepository.getRevision(actor.id, stageId);
    const after = await studentWorkflowRepository.updateRevision(actor.id, stageId, (workflow) => {
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
      action: "REVISION_APPROVAL_UPDATED",
      resourceType: "revision",
      resourceId: `${actor.id}:${stageId}`,
      before,
      after,
    });

    return json({ data: after });
  });

  router.post("/students/me/revisions/:stageId/final-file", async ({ body, params, headers }) => {
    const actor = await authService.requirePermission(headers, "student.workflow.submit");
    const stageId = readStage(params.stageId);
    const { fileName } = validateFinalFile(body);
    const before = await studentWorkflowRepository.getRevision(actor.id, stageId);
    const after = await studentWorkflowRepository.updateRevision(actor.id, stageId, (workflow) => {
      workflow.finalFile = fileName;
      workflow.submittedAt = new Date().toISOString();
    });

    await auditService.record({
      actor,
      action: "REVISION_FINAL_FILE_UPLOADED",
      resourceType: "revision",
      resourceId: `${actor.id}:${stageId}`,
      before,
      after,
    });

    return json({ data: after });
  });

  router.post("/students/me/revisions/:stageId/simulate-all-approved", async ({ params, headers }) => {
    const actor = await authService.requirePermission(headers, "student.workflow.submit");
    const stageId = readStage(params.stageId);
    const now = new Date().toISOString();
    const before = await studentWorkflowRepository.getRevision(actor.id, stageId);
    const after = await studentWorkflowRepository.updateRevision(actor.id, stageId, (workflow) => {
      workflow.items.forEach((item) => {
        item.status = "done";
        item.submittedAt = item.submittedAt || now;
      });
      workflow.submittedAt = now;
      workflow.penguji1Approved = true;
      workflow.penguji2Approved = true;
      workflow.ketuaSidangStatus = "approved";
    });

    await auditService.record({
      actor,
      action: "REVISION_SIMULATED_ALL_APPROVED",
      resourceType: "revision",
      resourceId: `${actor.id}:${stageId}`,
      before,
      after,
    });

    return json({ data: after });
  });

  router.post("/students/me/revisions/:stageId/reset", async ({ params, headers }) => {
    const actor = await authService.requirePermission(headers, "student.workflow.submit");
    const stageId = readStage(params.stageId);
    const before = await studentWorkflowRepository.getRevision(actor.id, stageId);
    const after = await studentWorkflowRepository.resetRevision(actor.id, stageId);

    await auditService.record({
      actor,
      action: "REVISION_RESET",
      resourceType: "revision",
      resourceId: `${actor.id}:${stageId}`,
      before,
      after,
    });

    return json({ data: after });
  });
};
