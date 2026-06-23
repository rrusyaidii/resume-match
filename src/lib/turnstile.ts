import type { NextRequest } from "next/server";
import { getClientIp } from "./rate-limit";

export function isTurnstileConfigured(): boolean {
  return Boolean(
    process.env.TURNSTILE_SECRET_KEY && process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY
  );
}

export function getTurnstileSiteKey(): string | undefined {
  return process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;
}

interface TurnstileVerifyResponse {
  success: boolean;
  "error-codes"?: string[];
}

export async function verifyTurnstile(
  token: string,
  requestIp: string
): Promise<boolean> {
  const secret = process.env.TURNSTILE_SECRET_KEY;
  if (!secret || !token.trim()) return false;

  const body = new URLSearchParams({
    secret,
    response: token,
    remoteip: requestIp,
  });

  const response = await fetch(
    "https://challenges.cloudflare.com/turnstile/v0/siteverify",
    {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body,
      signal: AbortSignal.timeout(10000),
    }
  );

  if (!response.ok) return false;

  const data = (await response.json()) as TurnstileVerifyResponse;
  return data.success === true;
}

export async function verifyTurnstileFromRequest(
  token: string | null | undefined,
  request: NextRequest
): Promise<boolean> {
  if (!isTurnstileConfigured()) return true;
  if (!token?.trim()) return false;
  return verifyTurnstile(token, getClientIp(request));
}
