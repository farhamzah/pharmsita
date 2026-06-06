import type { PostgresQueryExecutor } from "../../database/postgres/connection";
import type { RefreshTokenRecord } from "../../domain/types";
import type { RefreshTokenRepository } from "../contracts";
import { toRefreshTokenRecord, type RefreshTokenRow } from "./row-mappers";

const refreshTokenColumns = `
  id,
  user_id,
  role,
  token_hash,
  expires_at,
  revoked_at,
  created_at
`;

export class PostgresRefreshTokenRepository implements RefreshTokenRepository {
  constructor(private readonly db: PostgresQueryExecutor) {}

  async create(record: RefreshTokenRecord) {
    const result = await this.db.query<RefreshTokenRow>(
      `
        INSERT INTO refresh_tokens (
          id,
          user_id,
          role,
          token_hash,
          expires_at,
          revoked_at,
          created_at
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        RETURNING ${refreshTokenColumns}
      `,
      [
        record.id,
        record.userId,
        record.role || null,
        record.tokenHash,
        record.expiresAt,
        record.revokedAt,
        record.createdAt,
      ]
    );

    return toRefreshTokenRecord(result.rows[0]);
  }

  async findActiveByHash(tokenHash: string, nowIso: string) {
    const result = await this.db.query<RefreshTokenRow>(
      `
        SELECT ${refreshTokenColumns}
        FROM refresh_tokens
        WHERE token_hash = $1
          AND revoked_at IS NULL
          AND expires_at > $2
        LIMIT 1
      `,
      [tokenHash, nowIso]
    );

    return result.rows[0] ? toRefreshTokenRecord(result.rows[0]) : null;
  }

  async revokeByHash(tokenHash: string, revokedAt: string) {
    const result = await this.db.query<RefreshTokenRow>(
      `
        UPDATE refresh_tokens
        SET revoked_at = $2
        WHERE token_hash = $1
        RETURNING ${refreshTokenColumns}
      `,
      [tokenHash, revokedAt]
    );

    return result.rows[0] ? toRefreshTokenRecord(result.rows[0]) : null;
  }

  async revokeAllForUser(userId: string, revokedAt: string) {
    const result = await this.db.query<RefreshTokenRow>(
      `
        UPDATE refresh_tokens
        SET revoked_at = $2
        WHERE user_id = $1
          AND revoked_at IS NULL
        RETURNING ${refreshTokenColumns}
      `,
      [userId, revokedAt]
    );

    return result.rows.map(toRefreshTokenRecord);
  }
}
