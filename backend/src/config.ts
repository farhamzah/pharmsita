import path from "node:path";

const readNumber = (value: string | undefined, fallback: number) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const readCsv = (value: string | undefined, fallback: string[]) => {
  const items = (value || "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);

  return items.length > 0 ? items : fallback;
};

const readBoolean = (value: string | undefined, fallback: boolean) => {
  if (!value) {
    return fallback;
  }

  return ["1", "true", "yes", "on"].includes(value.toLowerCase());
};

const readDatabaseAdapter = (value: string | undefined): "json" | "postgres" => {
  if (!value || value === "json") {
    return "json";
  }

  if (value === "postgres") {
    return "postgres";
  }

  throw new Error(`Unsupported DB_ADAPTER "${value}". Use "json" or "postgres".`);
};

export const config = {
  port: readNumber(process.env.PORT, 4000),
  apiPrefix: process.env.API_PREFIX || "/api/v1",
  corsOrigins: readCsv(process.env.CORS_ORIGIN, [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
  ]),
  databaseFile:
    process.env.DATABASE_FILE ||
    path.resolve(__dirname, "..", ".data", "pharmsita-db.json"),
  databaseAdapter: readDatabaseAdapter(process.env.DB_ADAPTER),
  databaseUrl: process.env.DATABASE_URL || "",
  databaseSsl: readBoolean(process.env.DATABASE_SSL, false),
  databasePoolMax: readNumber(process.env.DATABASE_POOL_MAX, 10),
  authSecret:
    process.env.AUTH_SECRET ||
    "dev-only-change-this-secret-before-production",
  accessTokenTtlSeconds: readNumber(process.env.ACCESS_TOKEN_TTL_SECONDS, 60 * 60),
  refreshTokenTtlSeconds: readNumber(
    process.env.REFRESH_TOKEN_TTL_SECONDS,
    60 * 60 * 24 * 7
  ),
};
