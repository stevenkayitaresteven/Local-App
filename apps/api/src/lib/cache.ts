/**
 * A tiny TTL cache abstraction. The default is an in-process Map (perfect for a
 * single node and for tests). The interface mirrors a subset of Redis so a
 * Redis-backed implementation can be dropped in for multi-node deployments
 * without touching call sites — see docs/ARCHITECTURE.md.
 */
export interface Cache {
  get<T>(key: string): Promise<T | null>;
  set<T>(key: string, value: T, ttlSeconds?: number): Promise<void>;
  del(key: string): Promise<void>;
  /** Atomic increment with optional expiry — used by the sliding-window limiter. */
  incr(key: string, ttlSeconds: number): Promise<number>;
}

interface Entry {
  value: unknown;
  expiresAt: number | null;
}

class MemoryCache implements Cache {
  private store = new Map<string, Entry>();

  async get<T>(key: string): Promise<T | null> {
    const entry = this.store.get(key);
    if (!entry) return null;
    if (entry.expiresAt !== null && entry.expiresAt < Date.now()) {
      this.store.delete(key);
      return null;
    }
    return entry.value as T;
  }

  async set<T>(key: string, value: T, ttlSeconds?: number): Promise<void> {
    this.store.set(key, {
      value,
      expiresAt: ttlSeconds ? Date.now() + ttlSeconds * 1000 : null,
    });
  }

  async del(key: string): Promise<void> {
    this.store.delete(key);
  }

  async incr(key: string, ttlSeconds: number): Promise<number> {
    const current = (await this.get<number>(key)) ?? 0;
    const next = current + 1;
    await this.set(key, next, ttlSeconds);
    return next;
  }
}

export const cache: Cache = new MemoryCache();
