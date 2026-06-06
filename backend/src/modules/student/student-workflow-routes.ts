import { json } from "../../http/response";
import type { Router } from "../../http/router";
import { studentWorkflowRepository } from "../../repositories";
import {
  validateRequirementBundle,
  validateThesisSubmissions,
} from "../../validation/request-validators";
import { auditService } from "../audit/audit-service";
import { authService } from "../auth/auth-service";

export const registerStudentWorkflowRoutes = (router: Router) => {
  router.get("/students/me/requirements/initial", async ({ headers }) => {
    const actor = await authService.requirePermission(headers, "student.workflow.read");
    return json({ data: await studentWorkflowRepository.getInitialRequirements(actor.id) });
  });

  router.put("/students/me/requirements/initial", async ({ body, headers }) => {
    const actor = await authService.requirePermission(headers, "student.workflow.submit");
    const payload = validateRequirementBundle(body);
    const before = await studentWorkflowRepository.getInitialRequirements(actor.id);
    const after = await studentWorkflowRepository.saveInitialRequirements(actor.id, payload);

    await auditService.record({
      actor,
      action: "STUDENT_INITIAL_REQUIREMENTS_REPLACED",
      resourceType: "student-requirements",
      resourceId: `${actor.id}:initial`,
      before,
      after,
    });

    return json({ data: after });
  });

  router.get("/students/me/requirements/stages/:stageId", async ({ params, headers }) => {
    const actor = await authService.requirePermission(headers, "student.workflow.read");
    return json({ data: await studentWorkflowRepository.getStageRequirements(actor.id, params.stageId) });
  });

  router.put("/students/me/requirements/stages/:stageId", async ({ params, body, headers }) => {
    const actor = await authService.requirePermission(headers, "student.workflow.submit");
    const payload = validateRequirementBundle(body);
    const before = await studentWorkflowRepository.getStageRequirements(actor.id, params.stageId);
    const after = await studentWorkflowRepository.saveStageRequirements(actor.id, params.stageId, payload);

    await auditService.record({
      actor,
      action: "STUDENT_STAGE_REQUIREMENTS_REPLACED",
      resourceType: "student-requirements",
      resourceId: `${actor.id}:${params.stageId}`,
      before,
      after,
    });

    return json({ data: after });
  });

  router.get("/students/me/thesis-submissions", async ({ headers }) => {
    const actor = await authService.requirePermission(headers, "student.workflow.read");
    return json({ data: await studentWorkflowRepository.listThesisSubmissions(actor.id) });
  });

  router.put("/students/me/thesis-submissions", async ({ body, headers }) => {
    const actor = await authService.requirePermission(headers, "student.workflow.submit");
    const payload = validateThesisSubmissions(body);
    const before = await studentWorkflowRepository.listThesisSubmissions(actor.id);
    const after = await studentWorkflowRepository.replaceThesisSubmissions(actor.id, payload);

    await auditService.record({
      actor,
      action: "STUDENT_THESIS_SUBMISSIONS_REPLACED",
      resourceType: "thesis-submissions",
      resourceId: actor.id,
      before,
      after,
    });

    return json({ data: after });
  });
};
