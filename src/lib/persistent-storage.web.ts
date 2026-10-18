type WebStorage = {
  getItem: (key: string) => Promise<string | null>;
  setItem: (key: string, value: string) => Promise<void>;
  removeItem: (key: string) => Promise<void>;
};

const fallback = new Map<string, string>();

function storage() {
  try {
    return typeof window === 'undefined' ? null : window.localStorage;
  } catch {
    return null;
  }
}

const webStorage: WebStorage = {
  async getItem(key) {
    try { return storage()?.getItem(key) ?? fallback.get(key) ?? null; } catch { return fallback.get(key) ?? null; }
  },
  async setItem(key, value) {
    fallback.set(key, value);
    try { storage()?.setItem(key, value); } catch { /* Private browsing can deny browser storage. */ }
  },
  async removeItem(key) {
    fallback.delete(key);
    try { storage()?.removeItem(key); } catch { /* Keep the in-memory fallback consistent. */ }
  },
};

export default webStorage;
