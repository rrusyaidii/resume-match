import { Redis } from "@upstash/redis";
import {
  decryptGoogleToken,
  encryptGoogleToken,
  type GoogleTokenRecord,
} from "@/lib/google-oauth";
import { isRedisConfigured } from "@/lib/usage-store";

const KEY_PREFIX = "rm:v1:google:token:";

let redis: Redis | null = null;

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

function toKey(deviceId: string): string {
  return `${KEY_PREFIX}${deviceId}`;
}

export async function saveGoogleToken(
  deviceId: string,
  record: GoogleTokenRecord
): Promise<void> {
  const client = getRedis();
  await client.set(toKey(deviceId), encryptGoogleToken(record));
}

export async function getGoogleToken(deviceId: string): Promise<GoogleTokenRecord | null> {
  const client = getRedis();
  const stored = await client.get<string>(toKey(deviceId));
  if (!stored || typeof stored !== "string") return null;
  return decryptGoogleToken(stored);
}

export async function deleteGoogleToken(deviceId: string): Promise<void> {
  const client = getRedis();
  await client.del(toKey(deviceId));
}

export function isGoogleTokenStoreAvailable(): boolean {
  return isRedisConfigured();
}
