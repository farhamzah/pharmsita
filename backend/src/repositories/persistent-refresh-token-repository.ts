import type { DatabaseAdapter } from "../database/schema";
import type { RefreshTokenRecord } from "../domain/types";
import type { RefreshTokenRepository } from "./contracts";

export class PersistentRefreshTokenRepository implements RefreshTokenRepository {
  constructor(private readonly database: DatabaseAdapter) {}

  create(record: RefreshTokenRecord) {
    this.database.update((state) => {
      state.refreshTokens.push(record);
    });

    return record;
  }

  findActiveByHash(tokenHash: string, nowIso: string) {
    return (
      this.database
        .read()
        .refreshTokens.find(
          (token) =>
            token.tokenHash === tokenHash &&
            !token.revokedAt &&
            token.expiresAt > nowIso
        ) || null
    );
  }

  revokeByHash(tokenHash: string, revokedAt: string) {
    const current = this.database
      .read()
      .refreshTokens.find((token) => token.tokenHash === tokenHash);

    if (!current) {
      return null;
    }

    this.database.update((state) => {
      const updated = state.refreshTokens.find((token) => token.tokenHash === tokenHash);
      if (updated) {
        updated.revokedAt = revokedAt;
      }
    });

    return {
      ...current,
      revokedAt,
    };
  }

  revokeAllForUser(userId: string, revokedAt: string) {
    let revoked: RefreshTokenRecord[] = [];

    this.database.update((state) => {
      revoked = state.refreshTokens.filter(
        (token) => token.userId === userId && !token.revokedAt
      );
      revoked.forEach((token) => {
        token.revokedAt = revokedAt;
      });
    });

    return revoked;
  }
}
