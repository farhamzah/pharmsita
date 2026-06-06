import { stringField } from "../../http/request";
import { json } from "../../http/response";
import type { Router } from "../../http/router";
import {
  validateFirstLoginRequest,
  validateLoginRequest,
  validateRefreshRequest,
  validateRoleSelectionRequest,
} from "../../validation/request-validators";
import { authService } from "./auth-service";

export const registerAuthRoutes = (router: Router) => {
  router.post("/auth/login", async ({ body }) => {
    const { identifier, password } = validateLoginRequest(body);
    return json(await authService.login(identifier, password));
  });

  router.post("/auth/select-role", async ({ body }) => {
    const { loginChallengeId, role } = validateRoleSelectionRequest(body);
    return json(await authService.selectRole(loginChallengeId, role));
  });

  router.post("/auth/first-login", async ({ body }) => {
    const { loginChallengeId, role, newPassword } = validateFirstLoginRequest(body);
    return json(await authService.completeFirstLogin(loginChallengeId, role, newPassword));
  });

  router.get("/auth/me", async ({ headers }) => {
    return json(await authService.me(headers));
  });

  router.post("/auth/refresh", async ({ body }) => {
    const { refreshToken } = validateRefreshRequest(body);
    return json(await authService.refresh(refreshToken));
  });

  router.post("/auth/logout", async ({ body, headers }) => {
    await authService.logout(headers, stringField(body, "refreshToken") || undefined);
    return json({
      message: "Logout berhasil.",
    });
  });
};
