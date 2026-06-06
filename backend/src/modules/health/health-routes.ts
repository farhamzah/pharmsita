import type { Router } from "../../http/router";
import { json } from "../../http/response";

export const registerHealthRoutes = (router: Router) => {
  router.get("/health", () =>
    json({
      status: "ok",
      service: "pharmsita-api",
      timestamp: new Date().toISOString(),
    })
  );
};
