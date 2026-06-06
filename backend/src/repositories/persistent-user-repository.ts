import type { DatabaseAdapter } from "../database/schema";
import type { UserAccount, UserRecord, UserRole } from "../domain/types";
import { hashPassword } from "../security/password";
import type { UserRepository } from "./contracts";

const toUserAccount = (record: UserRecord): UserAccount => {
  const { passwordHash: _passwordHash, ...account } = record;
  return account;
};

export class PersistentUserRepository implements UserRepository {
  constructor(private readonly database: DatabaseAdapter) {}

  list() {
    return this.database.read().users.map(toUserAccount);
  }

  replaceAll(records: UserAccount[]) {
    return this.database.update((state) => {
      state.users = records.map((record) => {
        const existing = state.users.find((user) => user.id === record.id);

        return {
          ...record,
          passwordHash: existing?.passwordHash || hashPassword("demo"),
          passwordStatus: record.passwordStatus || existing?.passwordStatus || "active",
          forceChangeOnLogin:
            record.forceChangeOnLogin ?? existing?.forceChangeOnLogin ?? false,
          lastLoginAt: record.lastLoginAt ?? existing?.lastLoginAt ?? null,
          firstLoginCompletedAt:
            record.firstLoginCompletedAt ?? existing?.firstLoginCompletedAt ?? null,
          passwordChangedAt: record.passwordChangedAt ?? existing?.passwordChangedAt ?? null,
        };
      });
      const userIds = new Set(state.users.map((user) => user.id));
      state.userRoles = [
        ...state.userRoles.filter((assignment) => userIds.has(assignment.userId)),
      ];
      state.users.forEach((user) => {
        if (
          !state.userRoles.some(
            (assignment) => assignment.userId === user.id && assignment.role === user.role
          )
        ) {
          state.userRoles.push({
            userId: user.id,
            role: user.role,
            status: user.status,
            createdAt: new Date().toISOString(),
            createdBy: null,
          });
        }
      });
    }).users.map(toUserAccount);
  }

  findById(id: string) {
    const record = this.database.read().users.find((user) => user.id === id);
    return record ? toUserAccount(record) : null;
  }

  findByIdentifier(identifier: string) {
    const record = this.findAuthRecordByIdentifier(identifier);
    return record ? toUserAccount(record) : null;
  }

  findAuthRecordById(id: string) {
    return this.database.read().users.find((user) => user.id === id) || null;
  }

  findAuthRecordByIdentifier(identifier: string) {
    const normalized = identifier.toLowerCase();

    return (
      this.database
        .read()
        .users.find(
          (user) =>
            user.identifier.toLowerCase() === normalized ||
            user.role.toLowerCase() === normalized
        ) || null
    );
  }

  touchLastLogin(userId: string, timestamp: string) {
    let updated: UserRecord | null = null;

    this.database.update((state) => {
      updated = state.users.find((user) => user.id === userId) || null;
      if (updated) {
        updated.lastLoginAt = timestamp;
      }
    });

    return updated ? toUserAccount(updated) : null;
  }

  getRoles(userId: string) {
    const state = this.database.read();
    const activeRoles = state.userRoles
      .filter((assignment) => assignment.userId === userId && assignment.status === "Aktif")
      .map((assignment) => assignment.role);
    const user = state.users.find((record) => record.id === userId);

    if (activeRoles.length > 0) {
      return Array.from(new Set(activeRoles));
    }

    return user && user.status === "Aktif" ? [user.role] : [];
  }

  completeFirstLogin(userId: string, passwordHash: string, completedAt: string) {
    let updated: UserRecord | null = null;

    this.database.update((state) => {
      updated = state.users.find((user) => user.id === userId) || null;
      if (updated) {
        updated.passwordHash = passwordHash;
        updated.passwordStatus = "active";
        updated.forceChangeOnLogin = false;
        updated.firstLoginCompletedAt = completedAt;
        updated.passwordChangedAt = completedAt;
      }
    });

    return updated ? toUserAccount(updated) : null;
  }

  getPermissions(role: UserRole) {
    return this.database.read().permissionsByRole[role];
  }
}
