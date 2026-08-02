const isBrowser = typeof window !== 'undefined';

// Fallback in-memory storage for environments where localStorage is blocked (e.g. cross-origin iframe without storage access)
const memoryStorage: Record<string, string> = {};

export const safeStorage = {
  getItem(key: string): string | null {
    try {
      if (isBrowser) {
        const val = window.localStorage.getItem(key);
        if (val !== null) return val;
      }
    } catch (e) {
      console.warn(`safeStorage: Failed to read key "${key}" from localStorage. Using in-memory fallback.`, e);
    }
    return memoryStorage[key] || null;
  },

  setItem(key: string, value: string): void {
    try {
      if (isBrowser) {
        window.localStorage.setItem(key, value);
        return;
      }
    } catch (e) {
      console.warn(`safeStorage: Failed to write key "${key}" to localStorage. Using in-memory fallback.`, e);
    }
    memoryStorage[key] = value;
  },

  removeItem(key: string): void {
    try {
      if (isBrowser) {
        window.localStorage.removeItem(key);
        return;
      }
    } catch (e) {
      console.warn(`safeStorage: Failed to remove key "${key}" from localStorage.`, e);
    }
    delete memoryStorage[key];
  },

  clear(): void {
    try {
      if (isBrowser) {
        window.localStorage.clear();
        return;
      }
    } catch (e) {
      console.warn('safeStorage: Failed to clear localStorage.', e);
    }
    for (const key in memoryStorage) {
      delete memoryStorage[key];
    }
  }
};
