import { Redis } from "@upstash/redis";
import { SHEET_HEADERS_VERSION } from "@/lib/build-sheet-rows";
import { isRedisConfigured } from "@/lib/usage-store";

const KEY_PREFIX = "rm:v1:google:daily-sheet:";
const TTL_SEC = 48 * 60 * 60;
const MALAYSIA_TZ = "Asia/Kuala_Lumpur";

let redis: Redis | null = null;

export interface DailySheetRecord {
  dateKey: string;
  spreadsheetId: string;
  spreadsheetUrl: string;
  headersVersion?: number;
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

function toKey(deviceId: string): string {
  return `${KEY_PREFIX}${deviceId}`;
}

export function getMalaysiaDateKey(date = new Date()): string {
  return date.toLocaleDateString("en-CA", { timeZone: MALAYSIA_TZ });
}

export function isDailySheetCompatible(record: DailySheetRecord): boolean {
  return record.headersVersion === SHEET_HEADERS_VERSION;
}

export async function getDailySheet(deviceId: string): Promise<DailySheetRecord | null> {
  const client = getRedis();
  const stored = await client.get<DailySheetRecord>(toKey(deviceId));
  if (!stored || typeof stored !== "object") return null;
  if (!stored.dateKey || !stored.spreadsheetId || !stored.spreadsheetUrl) return null;
  return stored;
}

export async function setDailySheet(
  deviceId: string,
  record: DailySheetRecord
): Promise<void> {
  const client = getRedis();
  await client.set(
    toKey(deviceId),
    { ...record, headersVersion: SHEET_HEADERS_VERSION },
    { ex: TTL_SEC }
  );
}
