import { NextRequest, NextResponse } from "next/server";
import {
  cookieOptions,
} from "@/lib/access-control";
import {
  exchangeCodeForTokens,
  fetchGoogleEmail,
  GOOGLE_STATE_COOKIE,
  verifyOAuthState,
} from "@/lib/google-oauth";
import { saveGoogleToken } from "@/lib/google-token-store";
import { getOrCreateDeviceId, deviceCookieOptions, DEVICE_COOKIE_NAME } from "@/lib/request-identity";

function getSiteOrigin(request: NextRequest): string {
  const configured = process.env.NEXT_PUBLIC_SITE_URL;
  if (configured) return configured.replace(/\/$/, "");
  return request.nextUrl.origin;
}

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code");
  const state = request.nextUrl.searchParams.get("state");
  const storedState = request.cookies.get(GOOGLE_STATE_COOKIE)?.value;
  const origin = getSiteOrigin(request);

  const clearState = (response: NextResponse) => {
    response.cookies.set(GOOGLE_STATE_COOKIE, "", { ...cookieOptions(), maxAge: 0 });
    return response;
  };

  if (!code || !state || !storedState || state !== storedState || !verifyOAuthState(state)) {
    return clearState(
      NextResponse.redirect(`${origin}/?google=error&reason=invalid_state`)
    );
  }

  try {
    const tokens = await exchangeCodeForTokens(code);
    const email = await fetchGoogleEmail(tokens.access_token!);
    const { deviceId, isNewDevice } = getOrCreateDeviceId(request);

    await saveGoogleToken(deviceId, {
      refreshToken: tokens.refresh_token!,
      email,
      connectedAt: new Date().toISOString(),
    });

    const response = clearState(NextResponse.redirect(`${origin}/?google=connected`));
    if (isNewDevice) {
      response.cookies.set(DEVICE_COOKIE_NAME, deviceId, deviceCookieOptions());
    }
    return response;
  } catch (error) {
    const message = error instanceof Error ? error.message : "Google connection failed";
    console.error("Google OAuth callback error:", message);
    return clearState(
      NextResponse.redirect(`${origin}/?google=error&reason=oauth_failed`)
    );
  }
}
