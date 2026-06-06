import { config } from "./config";
import { Router } from "./http/router";
import { registerAdminRoutes } from "./modules/admin/admin-routes";
import { registerAuditRoutes } from "./modules/audit/audit-routes";
import { registerAuthRoutes } from "./modules/auth/auth-routes";
import { registerHealthRoutes } from "./modules/health/health-routes";
import { registerExamRoutes } from "./modules/student/exam-routes";
import { registerFinalProjectRegistrationRoutes } from "./modules/final-project-registration/final-project-registration-routes";
import { registerGuidanceRoutes } from "./modules/student/guidance-routes";
import { registerProgressRoutes } from "./modules/student/progress-routes";
import { registerRevisionRoutes } from "./modules/student/revision-routes";
import { registerStudentWorkflowRoutes } from "./modules/student/student-workflow-routes";
import { registerRoleWorkflowRoutes } from "./modules/workflow/role-workflow-routes";

export const createApp = () => {
  const router = new Router(config.apiPrefix, config.corsOrigins);

  registerHealthRoutes(router);
  registerAuthRoutes(router);
  registerAuditRoutes(router);
  registerAdminRoutes(router);
  registerFinalProjectRegistrationRoutes(router);
  registerStudentWorkflowRoutes(router);
  registerProgressRoutes(router);
  registerGuidanceRoutes(router);
  registerExamRoutes(router);
  registerRevisionRoutes(router);
  registerRoleWorkflowRoutes(router);

  return router;
};
