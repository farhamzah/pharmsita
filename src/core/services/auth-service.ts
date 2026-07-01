import { StorageService } from "./storage-service";
import type { Role } from "../../types/roles";

type DemoUser = {
  role: Role;
  displayName: string;
};

type AuthTokenPayload = {
  token: string;
  username?: string;
  role?: Role;
};

const DEMO_USERS: Record<string, DemoUser> = {
  mahasiswa: { role: "mahasiswa", displayName: "Mahasiswa Demo" },
  student: { role: "mahasiswa", displayName: "Mahasiswa Demo" },
  dosen: { role: "dosen", displayName: "Dosen Demo" },
  lecturer: { role: "dosen", displayName: "Dosen Demo" },
  admin: { role: "admin", displayName: "Admin Demo" },
  administrator: { role: "admin", displayName: "Admin Demo" },
  kordinator: { role: "kordinator", displayName: "Koordinator Demo" },
  koordinator: { role: "kordinator", displayName: "Koordinator Demo" },
  coordinator: { role: "kordinator", displayName: "Koordinator Demo" },
  kaprodi: { role: "kaprodi", displayName: "Kaprodi Demo" },
  dekan: { role: "dekan", displayName: "Dekan Demo" },
};

export class AuthService {
  private storage = new StorageService();
  private tokenKey = "auth_token";

  isAuthenticated() {
    return !!this.storage.get(this.tokenKey);
  }

  // store token, username and role
  setToken(token: string, username?: string, role?: Role) {
    this.storage.set(this.tokenKey, { token, username, role });
  }

  getToken(): string | null {
    const data = this.storage.get<AuthTokenPayload>(this.tokenKey);
    return data?.token ?? null;
  }

  getUsername(): string | null {
    const data = this.storage.get<AuthTokenPayload>(this.tokenKey);
    return data?.username ?? null;
  }

  getRole(): Role | null {
    const data = this.storage.get<AuthTokenPayload>(this.tokenKey);
    return data?.role ?? null;
  }

  // Mock login helper. The password is accepted for backend-ready shape,
  // but demo mode only checks that it is not empty.
  loginMock(username: string, password: string) {
    const s = (username || '').trim().toLowerCase();
    const hasPassword = (password || '').trim().length > 0;
    const demoUser = DEMO_USERS[s];

    if (!s || !hasPassword || !demoUser) {
      return null;
    }

    const token = btoa(`${s}:${demoUser.role}:${Date.now()}`);
    this.setToken(token, demoUser.displayName, demoUser.role);
    return demoUser.role;
  }

  clear() {
    this.storage.remove(this.tokenKey);
  }
}
