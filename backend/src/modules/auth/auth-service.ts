import crypto from "node:crypto";
import type { IncomingHttpHeaders } from "node:http";
import { config } from "../../config";
import type { UserAccount, UserRecord, UserRole } from "../../domain/types";
import { badRequest, forbidden, unauthenticated } from "../../http/errors";
import { refreshTokenRepository, userRepository } from "../../repositories";
import { hashPassword, verifyPassword } from "../../security/password";
import {
  createRandomToken,
  hashToken,
  signAccessToken,
  verifyAccessToken,
} from "../../security/token";
import { auditService } from "../audit/audit-service";

const getBearerToken = (headers: IncomingHttpHeaders) => {
  const authorization = headers.authorization;
  if (!authorization || !authorization.startsWith("Bearer ")) {
    return null;
  }

  return authorization.slice("Bearer ".length);
};

const toUserAccount = (record: UserRecord): UserAccount => {
  const { passwordHash: _passwordHash, ...account } = record;
  return account;
};

const userRoles: UserRole[] = ["mahasiswa", "dosen", "admin", "koordinator", "kaprodi", "dekan"];
const challengeTtlMs = 10 * 60 * 1000;

const isUserRole = (value: string): value is UserRole =>
  userRoles.includes(value as UserRole);

const hasFirstLoginPending = (user: UserRecord) =>
  !user.firstLoginCompletedAt ||
  user.forceChangeOnLogin === true ||
  user.passwordStatus === "needs_activation";

interface LoginChallenge {
  id: string;
  userId: string;
  availableRoles: UserRole[];
  requiresFirstLogin: boolean;
  expiresAt: string;
}

export class AuthService {
  private readonly loginChallenges = new Map<string, LoginChallenge>();

  async login(identifier: string, password: string) {
    const user = await userRepository.findAuthRecordByIdentifier(identifier);

    if (!user || user.status !== "Aktif" || !verifyPassword(password, user.passwordHash)) {
      await auditService.record({
        action: "AUTH_LOGIN_FAILED",
        resourceType: "auth",
        resourceId: identifier,
        reason: "Invalid identifier, inactive user, or invalid password.",
      });
      throw unauthenticated("Identifier atau password tidak valid.");
    }

    const now = new Date();
    const availableRoles = await this.getAvailableRoles(user);
    const requiresFirstLogin = hasFirstLoginPending(user);

    if (availableRoles.length > 1 || requiresFirstLogin) {
      const challenge = this.createLoginChallenge(user, availableRoles, requiresFirstLogin, now);
      await auditService.record({
        actor: toUserAccount({ ...user, role: availableRoles[0] || user.role }),
        action: "AUTH_LOGIN_CHALLENGE",
        resourceType: "user",
        resourceId: user.id,
        after: {
          availableRoles,
          requiresRoleSelection: availableRoles.length > 1,
          requiresFirstLogin,
        },
      });

      return this.toChallengeResponse(challenge, user);
    }

    await userRepository.touchLastLogin(user.id, now.toISOString());
    const session = await this.createSession(user, now, availableRoles[0]);
    await auditService.record({
      actor: session.user,
      action: "AUTH_LOGIN_SUCCESS",
      resourceType: "user",
      resourceId: user.id,
    });

    return session;
  }

  async selectRole(loginChallengeId: string, role: UserRole) {
    const now = new Date();
    const challenge = this.getLoginChallenge(loginChallengeId, now);
    const user = await userRepository.findAuthRecordById(challenge.userId);

    if (!user || user.status !== "Aktif") {
      this.loginChallenges.delete(loginChallengeId);
      throw unauthenticated("Login challenge tidak valid.");
    }

    if (challenge.requiresFirstLogin || hasFirstLoginPending(user)) {
      throw badRequest("First login wajib diselesaikan sebelum role dipakai.");
    }

    this.assertRoleAllowed(challenge, role);
    await userRepository.touchLastLogin(user.id, now.toISOString());
    const session = await this.createSession(user, now, role, challenge.availableRoles);
    this.loginChallenges.delete(loginChallengeId);

    await auditService.record({
      actor: session.user,
      action: "AUTH_ROLE_SELECTED",
      resourceType: "user",
      resourceId: user.id,
      after: { role },
    });

    return session;
  }

  async completeFirstLogin(loginChallengeId: string, role: UserRole, newPassword: string) {
    const now = new Date();
    const challenge = this.getLoginChallenge(loginChallengeId, now);
    const user = await userRepository.findAuthRecordById(challenge.userId);

    if (!user || user.status !== "Aktif") {
      this.loginChallenges.delete(loginChallengeId);
      throw unauthenticated("Login challenge tidak valid.");
    }

    this.assertRoleAllowed(challenge, role);

    const completedAt = now.toISOString();
    const updated = await userRepository.completeFirstLogin(
      user.id,
      hashPassword(newPassword),
      completedAt
    );

    if (!updated) {
      throw badRequest("First login gagal diselesaikan.");
    }

    await userRepository.touchLastLogin(user.id, completedAt);
    const refreshedUser = await userRepository.findAuthRecordById(user.id);
    if (!refreshedUser) {
      throw unauthenticated("User tidak ditemukan setelah first login.");
    }

    const session = await this.createSession(refreshedUser, now, role, challenge.availableRoles);
    this.loginChallenges.delete(loginChallengeId);

    await auditService.record({
      actor: session.user,
      action: "AUTH_FIRST_LOGIN_COMPLETED",
      resourceType: "user",
      resourceId: user.id,
      after: {
        role,
        firstLoginCompletedAt: completedAt,
      },
    });

    return session;
  }

  async me(headers: IncomingHttpHeaders) {
    const user = await this.requireAuthenticated(headers);
    return {
      user,
      availableRoles: await userRepository.getRoles(user.id),
      permissions: await userRepository.getPermissions(user.role),
    };
  }

  async updateProfile(headers: IncomingHttpHeaders, input: {
    name?: string;
    email?: string;
    phone?: string;
    address?: string;
    gender?: UserAccount["gender"];
    birthDate?: string;
    nim?: string;
    programStudi?: string;
    angkatan?: string;
    kelas?: string;
    skemaTA?: UserAccount["skemaTA"];
    jenisTA?: string;
    nidn?: string;
    bidangKeahlian?: string[];
    jabatanAkademik?: string;
    peranSistem?: string[];
    jabatan?: string;
    hakAksesUtama?: string[];
    divisi?: string;
    tingkatAkses?: UserAccount["tingkatAkses"];
    cakupanAkses?: string[];
  }) {
    const actor = await this.requireAuthenticated(headers);
    const before = await userRepository.findById(actor.id);
    const timestamp = new Date().toISOString();
    const updated = await userRepository.updateProfile(actor.id, {
      ...input,
      actorId: actor.id,
      timestamp,
    });

    if (!updated) {
      throw badRequest("Profil gagal diperbarui.");
    }

    await auditService.record({
      actor,
      action: "AUTH_PROFILE_UPDATED",
      resourceType: "user-profile",
      resourceId: actor.id,
      before,
      after: updated,
    });

    return {
      user: {
        ...updated,
        role: actor.role,
      },
      availableRoles: await userRepository.getRoles(actor.id),
      permissions: await userRepository.getPermissions(actor.role),
    };
  }

  async refresh(refreshToken: string) {
    const now = new Date();
    const tokenHash = hashToken(refreshToken);
    const activeToken = await refreshTokenRepository.findActiveByHash(
      tokenHash,
      now.toISOString()
    );

    if (!activeToken) {
      await auditService.record({
        action: "AUTH_REFRESH_FAILED",
        resourceType: "auth",
        resourceId: "refresh-token",
        reason: "Refresh token is missing, revoked, expired, or unknown.",
      });
      throw unauthenticated("Refresh token tidak valid.");
    }

    const user = await userRepository.findAuthRecordById(activeToken.userId);
    if (!user || user.status !== "Aktif") {
      await auditService.record({
        action: "AUTH_REFRESH_FAILED",
        resourceType: "user",
        resourceId: activeToken.userId,
        reason: "User not found or inactive.",
      });
      throw unauthenticated("Refresh token tidak valid.");
    }

    await refreshTokenRepository.revokeByHash(tokenHash, now.toISOString());
    const availableRoles = await this.getAvailableRoles(user);
    const role = activeToken.role || user.role;
    if (!availableRoles.includes(role)) {
      throw unauthenticated("Refresh token tidak valid.");
    }

    const session = await this.createSession(user, now, role, availableRoles);
    await auditService.record({
      actor: session.user,
      action: "AUTH_REFRESH_SUCCESS",
      resourceType: "user",
      resourceId: user.id,
    });

    return session;
  }

  async logout(headers: IncomingHttpHeaders, refreshToken?: string) {
    const now = new Date().toISOString();

    if (refreshToken) {
      const revoked = await refreshTokenRepository.revokeByHash(hashToken(refreshToken), now);
      await auditService.record({
        action: "AUTH_LOGOUT",
        resourceType: "refresh-token",
        resourceId: revoked?.id || "unknown",
      });
      return;
    }

    const user = await this.requireAuthenticated(headers);
    await refreshTokenRepository.revokeAllForUser(user.id, now);
    await auditService.record({
      actor: user,
      action: "AUTH_LOGOUT",
      resourceType: "user",
      resourceId: user.id,
    });
  }

  async requireAuthenticated(headers: IncomingHttpHeaders) {
    const token = getBearerToken(headers);
    if (!token) {
      throw unauthenticated();
    }

    const payload = verifyAccessToken(token, config.authSecret);
    if (!payload) {
      throw unauthenticated();
    }

    const user = await userRepository.findAuthRecordById(payload.sub);
    if (!user || user.status !== "Aktif" || !isUserRole(payload.role)) {
      throw unauthenticated();
    }

    const availableRoles = await userRepository.getRoles(user.id);
    if (!availableRoles.includes(payload.role)) {
      throw unauthenticated();
    }

    return toUserAccount({ ...user, role: payload.role });
  }

  async requirePermission(headers: IncomingHttpHeaders, permission: string) {
    const user = await this.requireAuthenticated(headers);
    const permissions = await userRepository.getPermissions(user.role);

    if (!permissions.includes(permission)) {
      throw forbidden();
    }

    return user;
  }

  async requireAnyPermission(headers: IncomingHttpHeaders, requiredPermissions: string[]) {
    const user = await this.requireAuthenticated(headers);
    const permissions = await userRepository.getPermissions(user.role);

    if (!requiredPermissions.some((permission) => permissions.includes(permission))) {
      throw forbidden();
    }

    return user;
  }

  private async createSession(
    user: UserRecord,
    now: Date,
    role: UserRole,
    availableRoles?: UserRole[]
  ) {
    const issuedAt = Math.floor(now.getTime() / 1000);
    const accessExpiresAt = new Date(
      now.getTime() + config.accessTokenTtlSeconds * 1000
    );
    const refreshExpiresAt = new Date(
      now.getTime() + config.refreshTokenTtlSeconds * 1000
    );
    const refreshToken = createRandomToken();

    await refreshTokenRepository.create({
      id: crypto.randomUUID(),
      userId: user.id,
      role,
      tokenHash: hashToken(refreshToken),
      expiresAt: refreshExpiresAt.toISOString(),
      revokedAt: null,
      createdAt: now.toISOString(),
    });

    return {
      accessToken: signAccessToken(
        {
          sub: user.id,
          role,
          iat: issuedAt,
          exp: Math.floor(accessExpiresAt.getTime() / 1000),
        },
        config.authSecret
      ),
      refreshToken,
      expiresAt: accessExpiresAt.toISOString(),
      availableRoles: availableRoles || (await this.getAvailableRoles(user)),
      user: toUserAccount({ ...user, role }),
    };
  }

  private async getAvailableRoles(user: UserRecord) {
    const roles = await userRepository.getRoles(user.id);
    if (roles.length > 0) {
      return roles;
    }

    return [user.role];
  }

  private createLoginChallenge(
    user: UserRecord,
    availableRoles: UserRole[],
    requiresFirstLogin: boolean,
    now: Date
  ) {
    const challenge: LoginChallenge = {
      id: crypto.randomUUID(),
      userId: user.id,
      availableRoles,
      requiresFirstLogin,
      expiresAt: new Date(now.getTime() + challengeTtlMs).toISOString(),
    };

    this.loginChallenges.set(challenge.id, challenge);
    this.pruneExpiredChallenges(now);
    return challenge;
  }

  private getLoginChallenge(loginChallengeId: string, now: Date) {
    const challenge = this.loginChallenges.get(loginChallengeId);
    if (!challenge || challenge.expiresAt <= now.toISOString()) {
      this.loginChallenges.delete(loginChallengeId);
      throw unauthenticated("Login challenge tidak valid atau sudah kedaluwarsa.");
    }

    return challenge;
  }

  private assertRoleAllowed(challenge: LoginChallenge, role: UserRole) {
    if (!challenge.availableRoles.includes(role)) {
      throw forbidden("Role tidak tersedia untuk user ini.");
    }
  }

  private pruneExpiredChallenges(now: Date) {
    const nowIso = now.toISOString();
    this.loginChallenges.forEach((challenge, id) => {
      if (challenge.expiresAt <= nowIso) {
        this.loginChallenges.delete(id);
      }
    });
  }

  private toChallengeResponse(challenge: LoginChallenge, user: UserRecord) {
    return {
      loginChallengeId: challenge.id,
      challengeExpiresAt: challenge.expiresAt,
      requiresRoleSelection: challenge.availableRoles.length > 1,
      requiresFirstLogin: challenge.requiresFirstLogin,
      availableRoles: challenge.availableRoles,
      user: toUserAccount({ ...user, role: challenge.availableRoles[0] || user.role }),
    };
  }
}

export const authService = new AuthService();
