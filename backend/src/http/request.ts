export const asRecord = (body: unknown): Record<string, unknown> => {
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return {};
  }

  return body as Record<string, unknown>;
};

export const stringField = (
  body: unknown,
  key: string,
  fallback = ""
): string => {
  const value = asRecord(body)[key];
  return typeof value === "string" ? value : fallback;
};

export const boolField = (
  body: unknown,
  key: string,
  fallback = false
): boolean => {
  const value = asRecord(body)[key];
  return typeof value === "boolean" ? value : fallback;
};

export const numberField = (
  body: unknown,
  key: string,
  fallback = 0
): number => {
  const value = asRecord(body)[key];
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
};
