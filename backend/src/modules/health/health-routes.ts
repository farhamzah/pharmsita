import type { Router } from "../../http/router";
import { json } from "../../http/response";
import { authService } from "../auth/auth-service";
import { deploymentDiagnosticsService } from "./deployment-diagnostics";

export const registerHealthRoutes = (router: Router) => {
  router.get("/health", () =>
    json({
      status: "ok",
      service: "pharmsita-api",
      timestamp: new Date().toISOString(),
    })
  );

  router.get("/health/ready", async () => {
    const readiness = await deploymentDiagnosticsService.readiness();
    const status = readiness.status === "not_ready" ? 503 : 200;

    return json(readiness, status);
  });

  router.get("/admin/deployment/diagnostics", async ({ headers }) => {
    await authService.requirePermission(headers, "audit.read");

    return json({
      data: await deploymentDiagnosticsService.diagnostics(),
    });
  });
};
