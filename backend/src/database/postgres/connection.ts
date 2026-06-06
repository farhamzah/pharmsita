import { Pool, type PoolClient, type QueryResult, type QueryResultRow } from "pg";
import { config } from "../../config";

export type PostgresQueryExecutor = {
  query<T extends QueryResultRow = QueryResultRow>(
    text: string,
    values?: unknown[]
  ): Promise<QueryResult<T>>;
};

export type PostgresConnectionPool = Pool;
export type PostgresTransactionClient = PoolClient;

let pool: Pool | null = null;

export const createPostgresPool = () => {
  if (!config.databaseUrl) {
    throw new Error("DATABASE_URL is required when DB_ADAPTER=postgres.");
  }

  return new Pool({
    connectionString: config.databaseUrl,
    max: config.databasePoolMax,
    ssl: config.databaseSsl ? { rejectUnauthorized: false } : undefined,
  });
};

export const getPostgresPool = () => {
  pool ||= createPostgresPool();
  return pool;
};

export const closePostgresPool = async () => {
  if (!pool) {
    return;
  }

  await pool.end();
  pool = null;
};
