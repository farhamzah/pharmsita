import type { ApiAdapter, ApiRequest } from "./api-types";
import { HttpApiAdapter } from "./http-api-adapter";
import { MockApiAdapter } from "./mock-api-adapter";

const defaultApiMode = import.meta.env.PROD ? "http" : "mock";
const apiMode = import.meta.env.VITE_API_MODE === "http"
  ? "http"
  : import.meta.env.VITE_API_MODE === "mock"
    ? "mock"
    : defaultApiMode;
const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || "/api/v1";

export const mockApiAdapter = new MockApiAdapter();

const adapter: ApiAdapter =
  apiMode === "http" ? new HttpApiAdapter(apiBaseUrl) : mockApiAdapter;

export const apiClient = {
  request<TResponse, TBody = unknown>(request: ApiRequest<TBody>) {
    return adapter.request<TResponse, TBody>(request);
  },
  get<TResponse>(path: string, query?: ApiRequest["query"]) {
    return adapter.request<TResponse>({ method: "GET", path, query });
  },
  post<TResponse, TBody = unknown>(path: string, body?: TBody) {
    return adapter.request<TResponse, TBody>({ method: "POST", path, body });
  },
  put<TResponse, TBody = unknown>(path: string, body?: TBody) {
    return adapter.request<TResponse, TBody>({ method: "PUT", path, body });
  },
  patch<TResponse, TBody = unknown>(path: string, body?: TBody) {
    return adapter.request<TResponse, TBody>({ method: "PATCH", path, body });
  },
  delete<TResponse>(path: string) {
    return adapter.request<TResponse>({ method: "DELETE", path });
  },
};
