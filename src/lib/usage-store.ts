import { Redis } from "@upstash/redis";

const KEY_PREFIX = "rm:v1:usage:";

let redis: Redis | null = null;
let warnedMissingRedis = false;

export function isRedisConfigured(): boolean {
  return Boolean(
    process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN
  );
}

function getRedis(): Redis {
  if (!isRedisConfigured()) {
    throw new Error("Upstash Redis is not configured");
  }

  if (!redis) {
    redis = new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL!,
      token: process.env.UPSTASH_REDIS_REST_TOKEN!,
    });
  }

  return redis;
}

function toStoreKey(key: string): string {
  return `${KEY_PREFIX}${key}`;
}

function maxCount(values: (number | null)[]): number {
  return values.reduce<number>((max, value) => {
    const count = typeof value === "number" && Number.isFinite(value) ? value : 0;
    return Math.max(max, count);
  }, 0);
}

export function buildUsageKeys(deviceId: string, fingerprint: string): string[] {
  return [`device:${deviceId}`, `fp:${fingerprint}`];
}

export async function getUsageCount(keys: string[]): Promise<number> {
  if (!isRedisConfigured()) {
    warnMissingRedis();
    return 0;
  }

  const client = getRedis();
  const values = await Promise.all(keys.map((key) => client.get<number>(toStoreKey(key))));
  return maxCount(values);
}

export async function incrementUsage(keys: string[]): Promise<number> {
  if (!isRedisConfigured()) {
    warnMissingRedis();
    return 1;
  }

  const client = getRedis();
  const counts = await Promise.all(
    keys.map(async (key) => {
      const storeKey = toStoreKey(key);
      return client.incr(storeKey);
    })
  );

  return maxCount(counts);
}

function warnMissingRedis(): void {
  if (warnedMissingRedis || process.env.NODE_ENV === "production") return;
  warnedMissingRedis = true;
  console.warn(
    "UPSTASH_REDIS_REST_URL/TOKEN not set — usage limits fall back to in-memory dev counter only."
  );
}

const devFallbackCounts = new Map<string, number>();

export function getDevFallbackCount(keys: string[]): number {
  return maxCount(keys.map((key) => devFallbackCounts.get(key) ?? 0));
}

export function incrementDevFallbackCount(keys: string[]): number {
  let effective = 0;

  for (const key of keys) {
    const next = (devFallbackCounts.get(key) ?? 0) + 1;
    devFallbackCounts.set(key, next);
    effective = Math.max(effective, next);
  }

  return effective;
}
