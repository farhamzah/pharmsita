import type { IncomingHttpHeaders, IncomingMessage, ServerResponse } from "node:http";
import { badRequest, HttpError, notFound, toErrorBody } from "./errors";
import type { RouteResponse } from "./response";

type HttpMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";

export interface RouteContext {
  method: HttpMethod;
  path: string;
  params: Record<string, string>;
  query: URLSearchParams;
  body: unknown;
  headers: IncomingHttpHeaders;
}

type RouteHandler = (context: RouteContext) => RouteResponse | Promise<RouteResponse>;

interface RouteDefinition {
  method: HttpMethod;
  path: string;
  handler: RouteHandler;
}

export class Router {
  private routes: RouteDefinition[] = [];

  constructor(
    private readonly prefix: string,
    private readonly corsOrigins: string[]
  ) {}

  get(path: string, handler: RouteHandler) {
    this.register("GET", path, handler);
  }

  post(path: string, handler: RouteHandler) {
    this.register("POST", path, handler);
  }

  put(path: string, handler: RouteHandler) {
    this.register("PUT", path, handler);
  }

  patch(path: string, handler: RouteHandler) {
    this.register("PATCH", path, handler);
  }

  delete(path: string, handler: RouteHandler) {
    this.register("DELETE", path, handler);
  }

  async handle(req: IncomingMessage, res: ServerResponse) {
    this.applyCors(req, res);

    if (req.method === "OPTIONS") {
      this.send(res, 204, null);
      return;
    }

    try {
      const method = this.readMethod(req.method);
      const requestUrl = new URL(req.url || "/", "http://localhost");
      const path = requestUrl.pathname;
      const match = this.findRoute(method, path);

      if (!match) {
        throw notFound(`Route ${method} ${path} tidak ditemukan.`);
      }

      const body = await this.readJsonBody(req);
      const result = await match.route.handler({
        method,
        path,
        params: match.params,
        query: requestUrl.searchParams,
        body,
        headers: req.headers,
      });

      this.send(res, result.status, result.body);
    } catch (error) {
      this.handleError(res, error);
    }
  }

  private register(method: HttpMethod, path: string, handler: RouteHandler) {
    this.routes.push({
      method,
      path: this.normalizePath(`${this.prefix}${path}`),
      handler,
    });
  }

  private readMethod(method: string | undefined): HttpMethod {
    const normalized = (method || "GET").toUpperCase();
    if (["GET", "POST", "PUT", "PATCH", "DELETE"].includes(normalized)) {
      return normalized as HttpMethod;
    }

    throw badRequest(`Method ${normalized} belum didukung.`);
  }

  private findRoute(method: HttpMethod, path: string) {
    for (const route of this.routes) {
      if (route.method !== method) {
        continue;
      }

      const params = this.matchPath(route.path, this.normalizePath(path));
      if (params) {
        return { route, params };
      }
    }

    return null;
  }

  private matchPath(routePath: string, requestPath: string) {
    const routeParts = routePath.split("/").filter(Boolean);
    const requestParts = requestPath.split("/").filter(Boolean);

    if (routeParts.length !== requestParts.length) {
      return null;
    }

    const params: Record<string, string> = {};

    for (let i = 0; i < routeParts.length; i += 1) {
      const routePart = routeParts[i];
      const requestPart = requestParts[i];

      if (routePart.startsWith(":")) {
        params[routePart.slice(1)] = decodeURIComponent(requestPart);
        continue;
      }

      if (routePart !== requestPart) {
        return null;
      }
    }

    return params;
  }

  private normalizePath(path: string) {
    return path.replace(/\/+/g, "/").replace(/\/$/, "") || "/";
  }

  private async readJsonBody(req: IncomingMessage) {
    const chunks: Buffer[] = [];

    for await (const chunk of req) {
      chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
    }

    if (chunks.length === 0) {
      return undefined;
    }

    const raw = Buffer.concat(chunks).toString("utf8").trim();
    if (!raw) {
      return undefined;
    }

    try {
      return JSON.parse(raw) as unknown;
    } catch {
      throw badRequest("Request body harus berupa JSON valid.");
    }
  }

  private applyCors(req: IncomingMessage, res: ServerResponse) {
    const requestOrigin = req.headers.origin;
    const allowAnyOrigin = this.corsOrigins.includes("*");
    const fallbackOrigin = this.corsOrigins[0] || "http://localhost:5173";
    const allowedOrigin =
      requestOrigin && (allowAnyOrigin || this.corsOrigins.includes(requestOrigin))
        ? requestOrigin
        : fallbackOrigin;

    res.setHeader("Access-Control-Allow-Origin", allowedOrigin);
    res.setHeader("Access-Control-Allow-Credentials", "true");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
    res.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, PATCH, DELETE, OPTIONS");
    res.setHeader("Vary", "Origin");
  }

  private send(res: ServerResponse, status: number, body: unknown) {
    res.statusCode = status;
    res.setHeader("Content-Type", "application/json; charset=utf-8");
    res.end(JSON.stringify(body));
  }

  private handleError(res: ServerResponse, error: unknown) {
    if (error instanceof HttpError) {
      this.send(res, error.status, toErrorBody(error));
      return;
    }

    console.error(error);
    this.send(res, 500, {
      error: {
        code: "INTERNAL_ERROR",
        message: "Terjadi kesalahan server.",
      },
    });
  }
}
