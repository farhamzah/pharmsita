import crypto from "node:crypto";
import type { IncomingHttpHeaders, IncomingMessage, ServerResponse } from "node:http";
import { config } from "../config";
import { verifyAccessToken } from "../security/token";
import { badRequest, HttpError, notFound, toErrorBody } from "./errors";
import type { RouteResponse } from "./response";

type HttpMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";

export interface RouteContext {
  method: HttpMethod;
  path: string;
  requestId: string;
  params: Record<string, string>;
  query: URLSearchParams;
  body: unknown;
  headers: IncomingHttpHeaders;
}

interface RequestActor {
  userId: string;
  role: string;
}

interface RequestLogContext {
  requestId: string;
  method: string;
  path: string;
  startedAt: number;
  actor: RequestActor | null;
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
    const requestId = this.readRequestId(req.headers);
    const startedAt = Date.now();
    let method = req.method || "GET";
    let path = new URL(req.url || "/", "http://localhost").pathname;
    let actor: RequestActor | null = null;

    this.applyCors(req, res);
    res.setHeader("X-Request-Id", requestId);

    if (req.method === "OPTIONS") {
      this.send(res, 204, null);
      this.logRequest({
        requestId,
        method,
        path,
        startedAt,
        actor,
      }, 204);
      return;
    }

    try {
      const routeMethod = this.readMethod(req.method);
      method = routeMethod;
      const requestUrl = new URL(req.url || "/", "http://localhost");
      path = requestUrl.pathname;
      actor = this.readActor(req.headers);
      const match = this.findRoute(routeMethod, path);

      if (!match) {
        throw notFound(`Route ${method} ${path} tidak ditemukan.`);
      }

      const body = await this.readJsonBody(req);
      const result = await match.route.handler({
        method: routeMethod,
        path,
        requestId,
        params: match.params,
        query: requestUrl.searchParams,
        body,
        headers: req.headers,
      });

      this.send(res, result.status, result.body, result.headers);
      this.logRequest({
        requestId,
        method,
        path,
        startedAt,
        actor,
      }, result.status);
    } catch (error) {
      const status = this.handleError(res, error, requestId);
      this.logRequest({
        requestId,
        method,
        path,
        startedAt,
        actor,
      }, status, error);
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

  private readRequestId(headers: IncomingHttpHeaders) {
    const raw = headers["x-request-id"];
    const value = Array.isArray(raw) ? raw[0] : raw;
    const trimmed = typeof value === "string" ? value.trim() : "";

    if (trimmed && /^[a-zA-Z0-9._:-]{8,128}$/.test(trimmed)) {
      return trimmed;
    }

    return crypto.randomUUID();
  }

  private readActor(headers: IncomingHttpHeaders): RequestActor | null {
    const authorization = headers.authorization;
    if (!authorization || !authorization.startsWith("Bearer ")) {
      return null;
    }

    const payload = verifyAccessToken(
      authorization.slice("Bearer ".length),
      config.authSecret
    );

    if (!payload) {
      return null;
    }

    return {
      userId: payload.sub,
      role: payload.role,
    };
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
    res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization, X-Request-Id");
    res.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, PATCH, DELETE, OPTIONS");
    res.setHeader("Vary", "Origin");
  }

  private send(
    res: ServerResponse,
    status: number,
    body: unknown,
    headers: Record<string, string> = {}
  ) {
    res.statusCode = status;
    Object.entries(headers).forEach(([key, value]) => {
      res.setHeader(key, value);
    });

    const contentType = res.getHeader("Content-Type");
    if (typeof body === "string" && typeof contentType === "string" && !contentType.includes("application/json")) {
      res.end(body);
      return;
    }

    if (!contentType) {
      res.setHeader("Content-Type", "application/json; charset=utf-8");
    }
    res.end(JSON.stringify(body));
  }

  private handleError(res: ServerResponse, error: unknown, requestId: string) {
    if (error instanceof HttpError) {
      this.send(res, error.status, toErrorBody(error, requestId));
      return error.status;
    }

    console.error(JSON.stringify({
      level: "error",
      event: "request.error",
      requestId,
      message: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      timestamp: new Date().toISOString(),
    }));
    this.send(res, 500, {
      error: {
        code: "INTERNAL_ERROR",
        message: "Terjadi kesalahan server.",
        requestId,
      },
    });
    return 500;
  }

  private logRequest(
    context: RequestLogContext,
    status: number,
    error?: unknown
  ) {
    const level = status >= 500 ? "error" : status >= 400 ? "warn" : "info";
    const payload = {
      level,
      event: "request.completed",
      requestId: context.requestId,
      method: context.method,
      path: context.path,
      status,
      durationMs: Date.now() - context.startedAt,
      actor: context.actor
        ? {
            userId: context.actor.userId,
            role: context.actor.role,
          }
        : null,
      errorCode: error instanceof HttpError ? error.code : undefined,
      timestamp: new Date().toISOString(),
    };

    const line = JSON.stringify(payload);
    if (level === "error") {
      console.error(line);
      return;
    }

    if (level === "warn") {
      console.warn(line);
      return;
    }

    console.log(line);
  }
}
