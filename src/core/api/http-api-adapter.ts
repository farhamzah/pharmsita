import { AuthService } from "../services/auth-service";
import { ApiError, type ApiAdapter, type ApiRequest } from "./api-types";

const buildUrl = (
  baseUrl: string,
  path: string,
  query?: ApiRequest["query"]
) => {
  const url = new URL(`${baseUrl.replace(/\/$/, "")}${path}`);

  Object.entries(query || {}).forEach(([key, value]) => {
    if (value !== null && value !== undefined) {
      url.searchParams.set(key, String(value));
    }
  });

  return url.toString();
};

export class HttpApiAdapter implements ApiAdapter {
  private baseUrl: string;
  private authService: AuthService;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
    this.authService = new AuthService();
  }

  async request<TResponse, TBody = unknown>(
    request: ApiRequest<TBody>
  ): Promise<TResponse> {
    const token = this.authService.getToken();
    const response = await fetch(buildUrl(this.baseUrl, request.path, request.query), {
      method: request.method,
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...request.headers,
      },
      body: request.body === undefined ? undefined : JSON.stringify(request.body),
    });

    const contentType = response.headers.get("content-type") || "";
    const payload = contentType.includes("application/json")
      ? await response.json()
      : await response.text();

    if (!response.ok) {
      throw new ApiError(response.status, {
        code: payload?.error?.code || "HTTP_ERROR",
        message: payload?.error?.message || response.statusText,
        details: payload?.error?.details,
      });
    }

    return payload as TResponse;
  }
}
