import { randomBytes } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import {
  createGoogleOAuthClient,
  GOOGLE_SCOPES,
  GOOGLE_STATE_COOKIE,
  isGoogleOAuthConfigured,
  signOAuthState,
} from "@/lib/google-oauth";
import { cookieOptions } from "@/lib/access-control";

export async function GET(request: NextRequest) {
  if (!isGoogleOAuthConfigured()) {
    return NextResponse.json(
      { success: false, error: "Google OAuth is not configured on this server." },
      { status: 503 }
    );
  }

  const nonce = randomBytes(16).toString("base64url");
  const state = signOAuthState(nonce);
  const client = createGoogleOAuthClient();

  const url = client.generateAuthUrl({
    access_type: "offline",
    prompt: "consent",
    scope: GOOGLE_SCOPES,
    state,
  });

  const response = NextResponse.redirect(url);
  response.cookies.set(GOOGLE_STATE_COOKIE, state, {
    ...cookieOptions(),
    maxAge: 60 * 10,
  });

  return response;
}
