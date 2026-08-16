import { createHash, randomUUID } from "crypto";
import type { NextRequest } from "next/server";
import { getClientIp } from "@/lib/rate-limit";

export const DEVICE_COOKIE_NAME = "rm_device";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export interface RequestIdentity {
  deviceId: string;
  fingerprint: string;
  isNewDevice: boolean;
}

function normalizeDeviceId(value?: string): string | null {
  if (!value || !UUID_RE.test(value)) return null;
  return value;
}

/**
 * Memoized per request: several helpers resolve the identity independently during
 * one request, and without this each would mint a different UUID for a new device —
 * leaving data written under an id that never reaches the cookie.
 */
const deviceIdCache = new WeakMap<
  NextRequest,
  { deviceId: string; isNewDevice: boolean }
>();

export function getOrCreateDeviceId(request: NextRequest): {
  deviceId: string;
  isNewDevice: boolean;
} {
  const cached = deviceIdCache.get(request);
  if (cached) return cached;

  const existing = normalizeDeviceId(request.cookies.get(DEVICE_COOKIE_NAME)?.value);
  const resolved = existing
    ? { deviceId: existing, isNewDevice: false }
    : { deviceId: randomUUID(), isNewDevice: true };

  deviceIdCache.set(request, resolved);
  return resolved;
}

export function getRequestFingerprint(request: NextRequest): string {
  const ip = getClientIp(request);
  const userAgent = request.headers.get("user-agent") || "unknown";
  return createHash("sha256").update(`${ip}|${userAgent}`).digest("hex");
}

export function getRequestIdentity(request: NextRequest): RequestIdentity {
  const { deviceId, isNewDevice } = getOrCreateDeviceId(request);
  return {
    deviceId,
    fingerprint: getRequestFingerprint(request),
    isNewDevice,
  };
}

export function deviceCookieOptions() {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    maxAge: 60 * 60 * 24 * 365,
    path: "/",
  };
}
