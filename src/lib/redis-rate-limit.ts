import { createHmac } from "crypto";
import type { NextRequest } from "next/server";
import { Redis } from "@upstash/redis";
import {
  ANALYZE_BURST_LIMIT,
  ANALYZE_BURST_WINDOW_SEC,
  ANALYZE_GLOBAL_DAILY_LIMIT,
  ANALYZE_GLOBAL_DAILY_WINDOW_SEC,
  ANALYZE_IP_DAILY_LIMIT,
  ANALYZE_IP_DAILY_WINDOW_SEC,
  UNLOCK_RATE_LIMIT,
  UNLOCK_RATE_WINDOW_SEC,
} from "./constants";
import { getClientIp } from "./rate-limit";
import { isRedisConfigured } from "./usage-store";

const RL_PREFIX = "rm:v1:rl:";

let redis: Redis | null = null;

interface DevBucket {
  count: number;
  resetAt: number;
}

const devBuckets = new Map<string, DevBucket>();

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

function hashIp(ip: string): string {
  const secret = process.env.COOKIE_SECRET || "dev-rate-limit";
  return createHmac("sha256", secret).update(ip).digest("hex");
}

export interface RateLimitResult {
  allowed: boolean;
  retryAfterSec?: number;
}

async function incrementWindow(
  key: string,
  limit: number,
  windowSec: number
): Promise<RateLimitResult> {
  if (!isRedisConfigured()) {
    return incrementDevWindow(key, limit, windowSec);
  }

  const client = getRedis();
  const storeKey = `${RL_PREFIX}${key}`;
  const count = await client.incr(storeKey);

  if (count === 1) {
    await client.expire(storeKey, windowSec);
  }

  if (count > limit) {
    const ttl = await client.ttl(storeKey);
    return {
      allowed: false,
      retryAfterSec: Math.max(1, ttl > 0 ? ttl : windowSec),
    };
  }

  return { allowed: true };
}

function incrementDevWindow(
  key: string,
  limit: number,
  windowSec: number
): RateLimitResult {
  const now = Date.now();
  const bucket = devBuckets.get(key);

  if (!bucket || now >= bucket.resetAt) {
    devBuckets.set(key, { count: 1, resetAt: now + windowSec * 1000 });
    return { allowed: true };
  }

  bucket.count += 1;

  if (bucket.count > limit) {
    return {
      allowed: false,
      retryAfterSec: Math.max(1, Math.ceil((bucket.resetAt - now) / 1000)),
    };
  }

  return { allowed: true };
}

async function checkLimit(
  key: string,
  limit: number,
  windowSec: number
): Promise<RateLimitResult> {
  const result = await incrementWindow(key, limit, windowSec);
  return result;
}

export async function checkAnalyzeRateLimit(
  request: NextRequest,
  options: { unlocked: boolean }
): Promise<RateLimitResult> {
  if (options.unlocked) {
    return { allowed: true };
  }

  const ipHash = hashIp(getClientIp(request));

  const global = await checkLimit(
    "global:day",
    ANALYZE_GLOBAL_DAILY_LIMIT,
    ANALYZE_GLOBAL_DAILY_WINDOW_SEC
  );
  if (!global.allowed) return global;

  const burst = await checkLimit(
    `ip:${ipHash}:burst`,
    ANALYZE_BURST_LIMIT,
    ANALYZE_BURST_WINDOW_SEC
  );
  if (!burst.allowed) return burst;

  const daily = await checkLimit(
    `ip:${ipHash}:day`,
    ANALYZE_IP_DAILY_LIMIT,
    ANALYZE_IP_DAILY_WINDOW_SEC
  );
  if (!daily.allowed) return daily;

  return { allowed: true };
}

export async function checkUnlockRateLimit(request: NextRequest): Promise<RateLimitResult> {
  const ipHash = hashIp(getClientIp(request));
  return checkLimit(`unlock:${ipHash}`, UNLOCK_RATE_LIMIT, UNLOCK_RATE_WINDOW_SEC);
}
