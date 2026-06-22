import { NextRequest, NextResponse } from "next/server";
import {
  attachAccessCookies,
  unlockWithPassword,
} from "@/lib/access-control";
import { UNLOCK_RATE_LIMIT, UNLOCK_RATE_WINDOW_MS } from "@/lib/constants";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";

export async function POST(request: NextRequest) {
  try {
    const ip = getClientIp(request);
    const rate = checkRateLimit(`unlock:${ip}`, UNLOCK_RATE_LIMIT, UNLOCK_RATE_WINDOW_MS);

    if (!rate.allowed) {
      return NextResponse.json(
        { success: false, error: "Too many attempts. Try again later." },
        {
          status: 429,
          headers: rate.retryAfterSec
            ? { "Retry-After": String(rate.retryAfterSec) }
            : undefined,
        }
      );
    }

    const body = await request.json();
    const password = typeof body.password === "string" ? body.password : "";

    if (!password) {
      return NextResponse.json(
        { success: false, error: "Access code is required." },
        { status: 400 }
      );
    }

    const result = unlockWithPassword(request, password);

    if (!result.success || !result.accessCookie || !result.deviceId) {
      return NextResponse.json(
        { success: false, error: "Invalid access code." },
        { status: 401 }
      );
    }

    const response = NextResponse.json({ success: true, unlocked: true });
    return attachAccessCookies(response, {
      accessCookie: result.accessCookie,
      deviceId: result.deviceId,
      setDeviceCookie: result.setDeviceCookie ?? false,
    });
  } catch (error) {
    console.error("Unlock error:", error);
    return NextResponse.json(
      { success: false, error: "Could not verify access code. Try again." },
      { status: 500 }
    );
  }
}
