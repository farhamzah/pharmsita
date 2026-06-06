import type { PostgresConnectionPool, PostgresTransactionClient } from "./connection";

export const withPostgresTransaction = async <T>(
  pool: PostgresConnectionPool,
  callback: (client: PostgresTransactionClient) => Promise<T>
) => {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");
    const result = await callback(client);
    await client.query("COMMIT");
    return result;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
};
