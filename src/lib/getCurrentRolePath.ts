import { AuthService } from '../core/services/auth-service';

/**
 * Returns the current authenticated user's role as a URL path prefix.
 * Used by shared pages (e.g. Koordinator ↔ Admin) to build role-aware
 * navigation hashes instead of hardcoding a specific role path.
 *
 * @example
 *   // role = 'admin'  → returns 'admin'
 *   // role = 'kordinator' → returns 'kordinator'
 *   window.location.hash = `#/${getCurrentRolePath()}/pengajuan`;
 */
export function getCurrentRolePath(): string {
  const auth = new AuthService();
  return auth.getRole() || 'login';
}
