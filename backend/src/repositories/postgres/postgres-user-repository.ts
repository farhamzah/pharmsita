import type { PostgresQueryExecutor } from "../../database/postgres/connection";
import type { UserAccount, UserRecord, UserRole } from "../../domain/types";
import type { UserRepository } from "../contracts";
import { toUserAccount, toUserRecord, type UserRow } from "./row-mappers";

const userColumns = `
  id,
  role,
  identifier,
  name,
  email,
  status,
  password_hash,
  password_status,
  force_change_on_login,
  last_login_at,
  first_login_completed_at,
  password_changed_at
`;

export class PostgresUserRepository implements UserRepository {
  constructor(private readonly db: PostgresQueryExecutor) {}

  async list() {
    const result = await this.db.query<UserRow>(`
      SELECT ${userColumns}
      FROM users
      ORDER BY role ASC, name ASC
    `);

    return result.rows.map(toUserAccount);
  }

  async replaceAll(_records: UserAccount[]): Promise<UserAccount[]> {
    throw new Error("PostgreSQL user replaceAll is not implemented yet.");
  }

  async findById(id: string) {
    const record = await this.findAuthRecordById(id);
    return record ? this.omitPassword(record) : null;
  }

  async findByIdentifier(identifier: string) {
    const record = await this.findAuthRecordByIdentifier(identifier);
    return record ? this.omitPassword(record) : null;
  }

  async findAuthRecordById(id: string) {
    const result = await this.db.query<UserRow>(
      `
        SELECT ${userColumns}
        FROM users
        WHERE id = $1
        LIMIT 1
      `,
      [id]
    );

    return result.rows[0] ? toUserRecord(result.rows[0]) : null;
  }

  async findAuthRecordByIdentifier(identifier: string) {
    const normalized = identifier.toLowerCase();
    const result = await this.db.query<UserRow>(
      `
        SELECT ${userColumns}
        FROM users
        WHERE LOWER(identifier) = $1 OR LOWER(role) = $1
        ORDER BY CASE WHEN LOWER(identifier) = $1 THEN 0 ELSE 1 END, created_at ASC
        LIMIT 1
      `,
      [normalized]
    );

    return result.rows[0] ? toUserRecord(result.rows[0]) : null;
  }

  async touchLastLogin(userId: string, timestamp: string) {
    const result = await this.db.query<UserRow>(
      `
        UPDATE users
        SET last_login_at = $2, updated_at = NOW()
        WHERE id = $1
        RETURNING ${userColumns}
      `,
      [userId, timestamp]
    );

    return result.rows[0] ? toUserAccount(result.rows[0]) : null;
  }

  async getRoles(userId: string) {
    const result = await this.db.query<{ role: UserRole }>(
      `
        SELECT role
        FROM user_roles
        WHERE user_id = $1
          AND status = 'Aktif'
        ORDER BY role ASC
      `,
      [userId]
    );

    if (result.rows.length > 0) {
      return result.rows.map((row) => row.role);
    }

    const user = await this.findAuthRecordById(userId);
    return user && user.status === "Aktif" ? [user.role] : [];
  }

  async completeFirstLogin(userId: string, passwordHash: string, completedAt: string) {
    const result = await this.db.query<UserRow>(
      `
        UPDATE users
        SET
          password_hash = $2,
          password_status = 'active',
          force_change_on_login = FALSE,
          first_login_completed_at = $3,
          password_changed_at = $3,
          updated_at = NOW()
        WHERE id = $1
        RETURNING ${userColumns}
      `,
      [userId, passwordHash, completedAt]
    );

    return result.rows[0] ? toUserAccount(result.rows[0]) : null;
  }

  async getPermissions(role: UserRole) {
    const result = await this.db.query<{ permission: string }>(
      `
        SELECT permission
        FROM role_permissions
        WHERE role = $1
        ORDER BY permission ASC
      `,
      [role]
    );

    return result.rows.map((row) => row.permission);
  }

  private omitPassword(record: UserRecord): UserAccount {
    const { passwordHash: _passwordHash, ...account } = record;
    return account;
  }
}
