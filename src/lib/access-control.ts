import { createHmac, timingSafeEqual } from "crypto";
import { FREE_ANALYSIS_LIMIT } from "./constants";

export const ACCESS_COOKIE_NAME = "rm_access";
export { FREE_ANALYSIS_LIMIT };

interface AccessPayload {
  count: number;
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
  const data = Buffer.from(JSON.stringify(payload)).toString("base64url");
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
  if (
    typeof record.count !== "number" ||
    !Number.isInteger(record.count) ||
    record.count < 0 ||
    record.count > FREE_ANALYSIS_LIMIT + 1000
  ) {
    return null;
  }

  if (typeof record.unlocked !== "boolean") return null;

  return { count: record.count, unlocked: record.unlocked };
}

function parsePayload(cookieValue?: string): AccessPayload {
  if (!cookieValue) return { count: 0, unlocked: false };
  return verifyToken(cookieValue) ?? { count: 0, unlocked: false };
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

export interface AccessStatus {
  remaining: number;
  unlocked: boolean;
  used: number;
}

export function getAccessStatus(cookieValue?: string): AccessStatus {
  const payload = parsePayload(cookieValue);

  if (payload.unlocked) {
    return { remaining: -1, unlocked: true, used: payload.count };
  }

  const remaining = Math.max(0, FREE_ANALYSIS_LIMIT - payload.count);
  return { remaining, unlocked: false, used: payload.count };
}

export interface AccessCheckResult extends AccessStatus {
  allowed: boolean;
  cookieValue: string;
}

export function checkAndConsumeAccess(cookieValue: string | undefined): AccessCheckResult {
  let payload = parsePayload(cookieValue);

  if (payload.unlocked) {
    return {
      allowed: true,
      remaining: -1,
      unlocked: true,
      used: payload.count,
      cookieValue: signPayload(payload),
    };
  }

  if (payload.count >= FREE_ANALYSIS_LIMIT) {
    return {
      allowed: false,
      remaining: 0,
      unlocked: false,
      used: payload.count,
      cookieValue: signPayload(payload),
    };
  }

  payload = { count: payload.count + 1, unlocked: false };
  return {
    allowed: true,
    remaining: FREE_ANALYSIS_LIMIT - payload.count,
    unlocked: false,
    used: payload.count,
    cookieValue: signPayload(payload),
  };
}

export interface UnlockResult {
  success: boolean;
  cookieValue?: string;
}

export function unlockWithPassword(
  cookieValue: string | undefined,
  password: string
): UnlockResult {
  if (!isValidPassword(password)) {
    return { success: false };
  }

  const payload = parsePayload(cookieValue);
  return {
    success: true,
    cookieValue: signPayload({ count: payload.count, unlocked: true }),
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
