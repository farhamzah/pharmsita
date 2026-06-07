export interface ApiErrorBody {
  error: {
    code: string;
    message: string;
    requestId?: string;
    details?: unknown;
  };
}

export class HttpError extends Error {
  status: number;
  code: string;
  details?: unknown;

  constructor(status: number, code: string, message: string, details?: unknown) {
    super(message);
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

export const badRequest = (message: string, details?: unknown) =>
  new HttpError(400, "BAD_REQUEST", message, details);

export const unauthenticated = (message = "Token tidak ada atau tidak valid.") =>
  new HttpError(401, "UNAUTHENTICATED", message);

export const forbidden = (message = "Role tidak punya akses.") =>
  new HttpError(403, "FORBIDDEN", message);

export const tooManyRequests = (
  message = "Terlalu banyak request dalam waktu singkat.",
  details?: unknown
) => new HttpError(429, "TOO_MANY_REQUESTS", message, details);

export const conflict = (
  message = "Resource bertabrakan dengan aturan workflow.",
  details?: unknown
) => new HttpError(409, "CONFLICT", message, details);

export const notFound = (message = "Resource tidak ditemukan.") =>
  new HttpError(404, "NOT_FOUND", message);

export const validationError = (message: string, details?: unknown) =>
  new HttpError(422, "VALIDATION_ERROR", message, details);

export const toErrorBody = (error: HttpError, requestId?: string): ApiErrorBody => ({
  error: {
    code: error.code,
    message: error.message,
    ...(requestId ? { requestId } : {}),
    ...(error.details === undefined ? {} : { details: error.details }),
  },
});
