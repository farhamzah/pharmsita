export class StorageService {
  get<T>(key: string): T | null {
    if (typeof window === "undefined") return null;

    const raw = window.localStorage.getItem(key);
    if (!raw) return null;

    try {
      return JSON.parse(raw) as T;
    } catch (error) {
      console.error(`Failed to parse storage key "${key}"`, error);
      return null;
    }
  }

  set<T>(key: string, value: T) {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(key, JSON.stringify(value));
  }

  remove(key: string) {
    if (typeof window === "undefined") return;
    window.localStorage.removeItem(key);
  }
}

export const storageService = new StorageService();
