import { numberField } from "../../http/request";
import { json } from "../../http/response";
import type { Router } from "../../http/router";
import { authService } from "../auth/auth-service";
import { auditService } from "./audit-service";

export const registerAuditRoutes = (router: Router) => {
  router.get("/admin/audit-logs", async ({ headers, query }) => {
    await authService.requirePermission(headers, "audit.read");
    const limit = numberField(
      { limit: Number(query.get("limit") || 100) },
      "limit",
      100
    );

    return json({
      data: await auditService.list(Math.min(Math.max(limit, 1), 500)),
    });
  });
};
