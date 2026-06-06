import { ApiError, type ApiAdapter, type ApiMethod, type ApiRequest } from "./api-types";

type MockRequest<TBody = unknown> = ApiRequest<TBody> & {
  params: Record<string, string>;
};

type MockHandler<TBody = unknown> = (request: MockRequest<TBody>) => unknown | Promise<unknown>;

interface MockRoute {
  method: ApiMethod;
  path: string;
  handler: MockHandler;
}

const routeKey = (method: ApiMethod, path: string) => `${method} ${path}`;

export class MockApiAdapter implements ApiAdapter {
  private handlers = new Map<string, MockHandler>();
  private routes: MockRoute[] = [];

  register<TBody = unknown>(method: ApiMethod, path: string, handler: MockHandler<TBody>) {
    const typedHandler = handler as MockHandler;
    this.handlers.set(routeKey(method, path), typedHandler);
    this.routes.push({ method, path, handler: typedHandler });
  }

  async request<TResponse, TBody = unknown>(
    request: ApiRequest<TBody>
  ): Promise<TResponse> {
    const handler = this.handlers.get(routeKey(request.method, request.path));

    if (!handler) {
      const dynamicMatch = this.findDynamicRoute(request.method, request.path);
      if (dynamicMatch) {
        return dynamicMatch.route.handler({
          ...request,
          params: dynamicMatch.params,
        }) as Promise<TResponse>;
      }

      throw new ApiError(404, {
        code: "MOCK_ROUTE_NOT_FOUND",
        message: `Mock API route not registered: ${request.method} ${request.path}`,
      });
    }

    return handler({ ...request, params: {} }) as Promise<TResponse>;
  }

  private findDynamicRoute(method: ApiMethod, path: string) {
    const actualSegments = path.split("/").filter(Boolean);

    for (const route of this.routes) {
      if (route.method !== method || !route.path.includes(":")) continue;

      const routeSegments = route.path.split("/").filter(Boolean);
      if (routeSegments.length !== actualSegments.length) continue;

      const params: Record<string, string> = {};
      const isMatch = routeSegments.every((segment, index) => {
        if (segment.startsWith(":")) {
          params[segment.slice(1)] = decodeURIComponent(actualSegments[index]);
          return true;
        }

        return segment === actualSegments[index];
      });

      if (isMatch) {
        return { route, params };
      }
    }

    return null;
  }
}
