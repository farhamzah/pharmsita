import type { Role } from "../../../types/roles";
import { AuthService } from "../../services/auth-service";
import { apiClient, mockApiAdapter } from "../api-client";
import { ApiError } from "../api-types";

export interface LoginRequest {
  identifier: string;
  password: string;
}

export interface AuthUser {
  id: string;
  role: Role | "koordinator";
  name: string;
  identifier: string;
  email?: string;
  phone?: string;
  address?: string;
  gender?: "Laki-laki" | "Perempuan";
  birthDate?: string;
  nim?: string;
  programStudi?: string;
  angkatan?: string;
  kelas?: string;
  skemaTA?: "Skripsi" | "Non Skripsi";
  jenisTA?: string;
  nidn?: string;
  bidangKeahlian?: string[];
  jabatanAkademik?: string;
  peranSistem?: string[];
  jabatan?: string;
  hakAksesUtama?: string[];
  divisi?: string;
  tingkatAkses?: "Superadmin" | "Admin Prodi";
  cakupanAkses?: string[];
  status: "Aktif" | "Nonaktif";
  passwordStatus?: "active" | "needs_activation" | "reset_requested";
  forceChangeOnLogin?: boolean;
  lastLoginAt?: string | null;
  firstLoginCompletedAt?: string | null;
  passwordChangedAt?: string | null;
}

export interface AuthSessionResponse {
  accessToken: string;
  refreshToken: string;
  expiresAt: string;
  availableRoles?: Array<Role | "koordinator">;
  user: AuthUser;
}

export interface AuthChallengeResponse {
  loginChallengeId: string;
  challengeExpiresAt: string;
  requiresRoleSelection: boolean;
  requiresFirstLogin: boolean;
  availableRoles: Array<Role | "koordinator">;
  user: AuthUser;
}

export type LoginResponse = AuthSessionResponse | AuthChallengeResponse;

export interface RoleSelectionRequest {
  loginChallengeId: string;
  role: Role | "koordinator";
}

export interface FirstLoginRequest extends RoleSelectionRequest {
  newPassword: string;
}

export interface MeResponse {
  user: AuthUser;
  availableRoles?: Array<Role | "koordinator">;
  permissions: string[];
}

const authService = new AuthService();
const mockChallenges = new Map<string, AuthChallengeResponse>();

export const normalizeApiRole = (role: AuthUser["role"]): Role =>
  role === "koordinator" ? "kordinator" : role;

export const isAuthSessionResponse = (
  response: LoginResponse
): response is AuthSessionResponse => "accessToken" in response;

const rolePermissions: Record<Role, string[]> = {
  mahasiswa: ["student.workflow.read", "student.workflow.submit"],
  dosen: ["lecturer.guidance.read", "lecturer.guidance.approve"],
  admin: ["admin.users.manage", "admin.master.manage", "audit.read"],
  kordinator: ["coordinator.validation.manage", "coordinator.monitoring.read"],
};

const buildMockUser = (role: Role, identifier: string, name?: string): AuthUser => ({
  id: `mock_${role}`,
  role,
  name: name || authService.getUsername() || "PharmSITA User",
  identifier,
  email: `${role}@pharmsita.local`,
  status: "Aktif",
});

const buildMockSession = (
  role: Role | "koordinator",
  identifier: string,
  name?: string
): AuthSessionResponse => {
  const normalizedRole = normalizeApiRole(role);
  const token = btoa(`${identifier}:${normalizedRole}:${Date.now()}`);
  const user = buildMockUser(normalizedRole, identifier, name);
  authService.setToken(token, user.name, normalizedRole);

  return {
    accessToken: token,
    refreshToken: `mock_refresh_${Date.now()}`,
    expiresAt: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
    availableRoles: [role],
    user: {
      ...user,
      role,
    },
  };
};

const buildMockChallenge = (
  identifier: string,
  availableRoles: Array<Role | "koordinator">,
  requiresFirstLogin: boolean
): AuthChallengeResponse => {
  const id = `mock_challenge_${Date.now()}_${Math.random().toString(16).slice(2)}`;
  const primaryRole = availableRoles[0] || "mahasiswa";
  const challenge: AuthChallengeResponse = {
    loginChallengeId: id,
    challengeExpiresAt: new Date(Date.now() + 10 * 60 * 1000).toISOString(),
    requiresRoleSelection: availableRoles.length > 1,
    requiresFirstLogin,
    availableRoles,
    user: {
      ...buildMockUser(normalizeApiRole(primaryRole), identifier),
      role: primaryRole,
      passwordStatus: requiresFirstLogin ? "needs_activation" : "active",
      forceChangeOnLogin: requiresFirstLogin,
      firstLoginCompletedAt: requiresFirstLogin ? null : new Date().toISOString(),
    },
  };

  mockChallenges.set(id, challenge);
  return challenge;
};

mockApiAdapter.register<LoginRequest>("POST", "/auth/login", ({ body }) => {
  const identifier = body?.identifier || "";

  if (identifier.toLowerCase() === "multi" && body?.password) {
    return buildMockChallenge(identifier, ["dosen", "koordinator"], false);
  }

  if (identifier.toLowerCase() === "firstlogin" && body?.password) {
    return buildMockChallenge(identifier, ["mahasiswa"], true);
  }

  const role = authService.loginMock(identifier, body?.password || "");

  if (!role) {
    throw new ApiError(401, {
      code: "UNAUTHENTICATED",
      message: "Identifier atau password tidak valid.",
    });
  }

  return buildMockSession(role, identifier, authService.getUsername() || undefined);
});

mockApiAdapter.register<RoleSelectionRequest>("POST", "/auth/select-role", ({ body }) => {
  const challenge = body?.loginChallengeId
    ? mockChallenges.get(body.loginChallengeId)
    : null;

  if (!challenge || !body?.role || !challenge.availableRoles.includes(body.role)) {
    throw new ApiError(401, {
      code: "UNAUTHENTICATED",
      message: "Login challenge tidak valid.",
    });
  }

  if (challenge.requiresFirstLogin) {
    throw new ApiError(400, {
      code: "BAD_REQUEST",
      message: "First login wajib diselesaikan sebelum role dipakai.",
    });
  }

  mockChallenges.delete(body.loginChallengeId);
  return buildMockSession(body.role, challenge.user.identifier, challenge.user.name);
});

mockApiAdapter.register<FirstLoginRequest>("POST", "/auth/first-login", ({ body }) => {
  const challenge = body?.loginChallengeId
    ? mockChallenges.get(body.loginChallengeId)
    : null;

  if (!challenge || !body?.role || !challenge.availableRoles.includes(body.role)) {
    throw new ApiError(401, {
      code: "UNAUTHENTICATED",
      message: "Login challenge tidak valid.",
    });
  }

  if (!body.newPassword || body.newPassword.length < 8) {
    throw new ApiError(422, {
      code: "VALIDATION_ERROR",
      message: "Password baru minimal 8 karakter.",
    });
  }

  mockChallenges.delete(body.loginChallengeId);
  return buildMockSession(body.role, challenge.user.identifier, challenge.user.name);
});

mockApiAdapter.register("GET", "/auth/me", () => {
  const role = authService.getRole();
  const token = authService.getToken();

  if (!role || !token) {
    throw new ApiError(401, {
      code: "UNAUTHENTICATED",
      message: "Session tidak ditemukan.",
    });
  }

  return {
    user: buildMockUser(role, role, authService.getUsername() || undefined),
    availableRoles: [role],
    permissions: rolePermissions[role],
  } satisfies MeResponse;
});

mockApiAdapter.register("POST", "/auth/logout", () => {
  authService.clear();
  return { message: "Logout berhasil." };
});

export const authApi = {
  login(payload: LoginRequest) {
    return apiClient.post<LoginResponse, LoginRequest>("/auth/login", payload);
  },
  selectRole(payload: RoleSelectionRequest) {
    return apiClient.post<AuthSessionResponse, RoleSelectionRequest>(
      "/auth/select-role",
      payload
    );
  },
  firstLogin(payload: FirstLoginRequest) {
    return apiClient.post<AuthSessionResponse, FirstLoginRequest>(
      "/auth/first-login",
      payload
    );
  },
  me() {
    return apiClient.get<MeResponse>("/auth/me");
  },
  logout() {
    return apiClient.post<{ message: string }>("/auth/logout");
  },
};
