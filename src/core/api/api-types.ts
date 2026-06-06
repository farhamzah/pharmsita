export type ApiMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";

export interface ApiRequest<TBody = unknown> {
  method: ApiMethod;
  path: string;
  body?: TBody;
  query?: Record<string, string | number | boolean | null | undefined>;
  headers?: Record<string, string>;
}

export interface ApiAdapter {
  request<TResponse, TBody = unknown>(request: ApiRequest<TBody>): Promise<TResponse>;
}

export interface ApiErrorPayload {
  code: string;
  message: string;
  details?: Record<string, unknown>;
}

export class ApiError extends Error {
  status: number;
  payload: ApiErrorPayload;

  constructor(status: number, payload: ApiErrorPayload) {
    super(payload.message);
    this.name = "ApiError";
    this.status = status;
    this.payload = payload;
  }
}

export type ApiMode = "mock" | "http";
