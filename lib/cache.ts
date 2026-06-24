type Entry<T> = { data: T; expiresAt: number };
const store = new Map<string, Entry<unknown>>();

export function getCache<T>(key: string): T | null {
  const entry = store.get(key) as Entry<T> | undefined;
  if (!entry || Date.now() > entry.expiresAt) return null;
  return entry.data;
}

export function setCache<T>(key: string, data: T, ttlMs: number): void {
  store.set(key, { data, expiresAt: Date.now() + ttlMs });
}

export function invalidateCache(key: string): void {
  store.delete(key);
}
