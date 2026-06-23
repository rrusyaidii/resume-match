import { createHmac, timingSafeEqual } from "crypto";
import type { NextRequest } from "next/server";
import type { NextResponse } from "next/server";
import { FREE_ANALYSIS_LIMIT } from "./constants";
import {
  DEVICE_COOKIE_NAME,
  deviceCookieOptions,
  getRequestIdentity,
} from "./request-identity";
import {
  buildUsageKeys,
  getDevFallbackCount,
  getUsageCount,
  incrementDevFallbackCount,
  incrementUsage,
  isRedisConfigured,
} from "./usage-store";

export const ACCESS_COOKIE_NAME = "rm_access";
export { FREE_ANALYSIS_LIMIT };

interface AccessPayload {
  unlocked: boolean;
}

function getSecret(): string {
  const secret = process.env.COOKIE_SECRET;
  if (!secret || secret.length < 16) {
    throw new Error("COOKIE_SECRET is not configured or too short");
  }
  return secret;
}

function signPayload(payload: AccessPayload): string {
  const data = Buffer.from(JSON.stringify({ v: 2, ...payload })).toString("base64url");
  const sig = createHmac("sha256", getSecret()).update(data).digest("base64url");
  return `${data}.${sig}`;
}

function verifyToken(token: string): AccessPayload | null {
  const dot = token.indexOf(".");
  if (dot === -1) return null;

  const data = token.slice(0, dot);
  const sig = token.slice(dot + 1);
  const expected = createHmac("sha256", getSecret()).update(data).digest("base64url");

  try {
    const sigBuf = Buffer.from(sig);
    const expectedBuf = Buffer.from(expected);
    if (sigBuf.length !== expectedBuf.length || !timingSafeEqual(sigBuf, expectedBuf)) {
      return null;
    }
  } catch {
    return null;
  }

  try {
    const parsed = JSON.parse(Buffer.from(data, "base64url").toString("utf8"));
    return normalizePayload(parsed);
  } catch {
    return null;
  }
}

function normalizePayload(raw: unknown): AccessPayload | null {
  if (!raw || typeof raw !== "object") return null;

  const record = raw as Record<string, unknown>;
  if (typeof record.unlocked !== "boolean") return null;

  return { unlocked: record.unlocked };
}

function parsePayload(cookieValue?: string): AccessPayload {
  if (!cookieValue) return { unlocked: false };
  return verifyToken(cookieValue) ?? { unlocked: false };
}

function isValidPassword(password?: string | null): boolean {
  const expected = process.env.ACCESS_PASSWORD;
  if (!password || !expected) return false;

  const passBuf = Buffer.from(password);
  const expectedBuf = Buffer.from(expected);
  if (passBuf.length !== expectedBuf.length) return false;

  try {
    return timingSafeEqual(passBuf, expectedBuf);
  } catch {
    return false;
  }
}

async function readUsageCount(request: NextRequest): Promise<number> {
  const identity = getRequestIdentity(request);
  const keys = buildUsageKeys(identity.deviceId, identity.fingerprint);

  if (isRedisConfigured()) {
    return getUsageCount(keys);
  }

  return getDevFallbackCount(keys);
}

async function consumeUsage(request: NextRequest): Promise<number> {
  const identity = getRequestIdentity(request);
  const keys = buildUsageKeys(identity.deviceId, identity.fingerprint);

  if (isRedisConfigured()) {
    return incrementUsage(keys);
  }

  return incrementDevFallbackCount(keys);
}

function buildStatus(used: number, unlocked: boolean): AccessStatus {
  if (unlocked) {
    return { remaining: -1, unlocked: true, used };
  }

  return {
    remaining: Math.max(0, FREE_ANALYSIS_LIMIT - used),
    unlocked: false,
    used,
  };
}

export interface AccessStatus {
  remaining: number;
  unlocked: boolean;
  used: number;
}

export interface AccessCookieUpdate {
  accessCookie: string;
  deviceId: string;
  setDeviceCookie: boolean;
}

export interface AccessCheckResult extends AccessStatus {
  allowed: boolean;
  accessCookie: string;
  deviceId: string;
  setDeviceCookie: boolean;
}

export function isUnlockedRequest(request: NextRequest): boolean {
  const payload = parsePayload(request.cookies.get(ACCESS_COOKIE_NAME)?.value);
  return payload.unlocked;
}

export async function getAccessStatus(request: NextRequest): Promise<AccessCheckResult> {
  const identity = getRequestIdentity(request);
  const payload = parsePayload(request.cookies.get(ACCESS_COOKIE_NAME)?.value);

  if (payload.unlocked) {
    const used = await readUsageCount(request);
    return {
      allowed: true,
      ...buildStatus(used, true),
      accessCookie: signPayload(payload),
      deviceId: identity.deviceId,
      setDeviceCookie: identity.isNewDevice,
    };
  }

  const used = await readUsageCount(request);
  const allowed = used < FREE_ANALYSIS_LIMIT;

  return {
    allowed,
    ...buildStatus(used, false),
    accessCookie: signPayload({ unlocked: false }),
    deviceId: identity.deviceId,
    setDeviceCookie: identity.isNewDevice,
  };
}

export async function checkAndConsumeAccess(request: NextRequest): Promise<AccessCheckResult> {
  const identity = getRequestIdentity(request);
  const payload = parsePayload(request.cookies.get(ACCESS_COOKIE_NAME)?.value);
  const accessCookie = signPayload(payload);

  if (payload.unlocked) {
    const used = await readUsageCount(request);
    return {
      allowed: true,
      ...buildStatus(used, true),
      accessCookie,
      deviceId: identity.deviceId,
      setDeviceCookie: identity.isNewDevice,
    };
  }

  const used = await readUsageCount(request);

  if (used >= FREE_ANALYSIS_LIMIT) {
    return {
      allowed: false,
      ...buildStatus(used, false),
      accessCookie: signPayload({ unlocked: false }),
      deviceId: identity.deviceId,
      setDeviceCookie: identity.isNewDevice,
    };
  }

  const nextUsed = await consumeUsage(request);

  return {
    allowed: true,
    ...buildStatus(nextUsed, false),
    accessCookie: signPayload({ unlocked: false }),
    deviceId: identity.deviceId,
    setDeviceCookie: identity.isNewDevice,
  };
}

export interface UnlockResult {
  success: boolean;
  accessCookie?: string;
  deviceId?: string;
  setDeviceCookie?: boolean;
}

export function unlockWithPassword(
  request: NextRequest,
  password: string
): UnlockResult {
  if (!isValidPassword(password)) {
    return { success: false };
  }

  const identity = getRequestIdentity(request);

  return {
    success: true,
    accessCookie: signPayload({ unlocked: true }),
    deviceId: identity.deviceId,
    setDeviceCookie: identity.isNewDevice,
  };
}

export function cookieOptions() {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    maxAge: 60 * 60 * 24 * 365,
    path: "/",
  };
}

export function attachAccessCookies(
  response: NextResponse,
  update: Pick<AccessCookieUpdate, "accessCookie" | "deviceId" | "setDeviceCookie">
) {
  response.cookies.set(ACCESS_COOKIE_NAME, update.accessCookie, cookieOptions());

  if (update.setDeviceCookie) {
    response.cookies.set(DEVICE_COOKIE_NAME, update.deviceId, deviceCookieOptions());
  }

  return response;
}
