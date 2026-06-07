import type { StepId, StepStatus } from "../../domain/types";
import { json } from "../../http/response";
import type { Router } from "../../http/router";
import { studentWorkflowRepository } from "../../repositories";
import { validateProgressUpdate } from "../../validation/request-validators";
import { auditService } from "../audit/audit-service";
import { authService } from "../auth/auth-service";
import {
  assertRevisionStepCanBeCompleted,
  isRevisionStepId,
} from "./revision-completion-gate";

export const registerProgressRoutes = (router: Router) => {
  router.get("/students/me/progress", async ({ headers }) => {
    const actor = await authService.requirePermission(headers, "student.workflow.read");
    return json({ data: await studentWorkflowRepository.getProgressSteps(actor.id) });
  });

  router.patch("/students/me/progress/:stepId", async ({ body, params, headers }) => {
    const actor = await authService.requirePermission(headers, "student.workflow.submit");
    const { status } = validateProgressUpdate(body);
    const stepId = params.stepId as StepId;
    if (status === "completed" && isRevisionStepId(stepId)) {
      await assertRevisionStepCanBeCompleted(actor.id, stepId, actor);
    }
    const before = await studentWorkflowRepository.getProgressSteps(actor.id);
    const after = await studentWorkflowRepository.updateProgressStep(
      actor.id,
      stepId,
      status as StepStatus
    );

    await auditService.record({
      actor,
      action: "STUDENT_PROGRESS_UPDATED",
      resourceType: "student-progress",
      resourceId: `${actor.id}:${stepId}`,
      before,
      after,
    });

    return json({ data: after });
  });

  router.post("/students/me/progress/reset", async ({ headers }) => {
    const actor = await authService.requirePermission(headers, "student.workflow.submit");
    const before = await studentWorkflowRepository.getProgressSteps(actor.id);
    const after = await studentWorkflowRepository.resetProgressSteps(actor.id);

    await auditService.record({
      actor,
      action: "STUDENT_PROGRESS_RESET",
      resourceType: "student-progress",
      resourceId: actor.id,
      before,
      after,
    });

    return json({ data: after });
  });
};
