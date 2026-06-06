export interface RouteResponse {
  status: number;
  body: unknown;
}

export const json = (body: unknown, status = 200): RouteResponse => ({
  status,
  body,
});
