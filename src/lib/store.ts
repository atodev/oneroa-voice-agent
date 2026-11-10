import { Redis } from "@upstash/redis";

/**
 * Tiny key-value store. Uses Upstash Redis when its env vars are set
 * (Vercel Marketplace adds them), otherwise falls back to memory.
 * Memory is fine for local dev but does NOT persist on Vercel, where
 * each function instance has its own memory.
 */
export interface Store {
  incrBy(key: string, by: number, ttlSeconds?: number): Promise<number>;
  get(key: string): Promise<number>;
  pushJson(key: string, value: unknown, maxItems: number): Promise<void>;
  listJson<T>(key: string, count: number): Promise<T[]>;
}

class RedisStore implements Store {
  constructor(private redis: Redis) {}

  async incrBy(key: string, by: number, ttlSeconds?: number) {
    const value = await this.redis.incrby(key, by);
    if (ttlSeconds && value === by) await this.redis.expire(key, ttlSeconds);
    return value;
  }

  async get(key: string) {
    return Number((await this.redis.get<number>(key)) ?? 0);
  }

  async pushJson(key: string, value: unknown, maxItems: number) {
    await this.redis.lpush(key, JSON.stringify(value));
    await this.redis.ltrim(key, 0, maxItems - 1);
  }

  async listJson<T>(key: string, count: number) {
    const rows = await this.redis.lrange<string | T>(key, 0, count - 1);
    // Upstash auto-parses JSON strings, so rows may already be objects.
    return rows.map((r) => (typeof r === "string" ? (JSON.parse(r) as T) : r));
  }
}

class MemoryStore implements Store {
  private counters = new Map<string, { value: number; expiresAt?: number }>();
  private lists = new Map<string, string[]>();

  async incrBy(key: string, by: number, ttlSeconds?: number) {
    const now = Date.now();
    const current = this.counters.get(key);
    const live = current && (!current.expiresAt || current.expiresAt > now) ? current : undefined;
    const value = (live?.value ?? 0) + by;
    const expiresAt = live?.expiresAt ?? (ttlSeconds ? now + ttlSeconds * 1000 : undefined);
    this.counters.set(key, { value, expiresAt });
    return value;
  }

  async get(key: string) {
    const c = this.counters.get(key);
    if (!c || (c.expiresAt && c.expiresAt <= Date.now())) return 0;
    return c.value;
  }

  async pushJson(key: string, value: unknown, maxItems: number) {
    const list = this.lists.get(key) ?? [];
    list.unshift(JSON.stringify(value));
    this.lists.set(key, list.slice(0, maxItems));
  }

  async listJson<T>(key: string, count: number) {
    return (this.lists.get(key) ?? []).slice(0, count).map((r) => JSON.parse(r) as T);
  }
}

function createStore(): Store {
  const url = process.env.UPSTASH_REDIS_REST_URL ?? process.env.KV_REST_API_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN ?? process.env.KV_REST_API_TOKEN;
  if (url && token) return new RedisStore(new Redis({ url, token }));
  if (process.env.VERCEL) {
    console.warn("No Redis configured: using in-memory store, data will not persist.");
  }
  return new MemoryStore();
}

// Reuse one store per server instance (and across dev hot reloads).
const globalForStore = globalThis as unknown as { __store?: Store };
export const store: Store = globalForStore.__store ?? (globalForStore.__store = createStore());

export function usingPersistentStore() {
  return Boolean(
    (process.env.UPSTASH_REDIS_REST_URL ?? process.env.KV_REST_API_URL) &&
      (process.env.UPSTASH_REDIS_REST_TOKEN ?? process.env.KV_REST_API_TOKEN),
  );
}
