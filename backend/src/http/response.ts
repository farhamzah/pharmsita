export interface RouteResponse {
  status: number;
  body: unknown;
  headers?: Record<string, string>;
}

export const json = (body: unknown, status = 200): RouteResponse => ({
  status,
  body,
});

export const text = (
  body: string,
  status = 200,
  headers: Record<string, string> = {}
): RouteResponse => ({
  status,
  body,
  headers: {
    "Content-Type": "text/plain; charset=utf-8",
    ...headers,
  },
});
