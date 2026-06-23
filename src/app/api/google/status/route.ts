import { NextRequest, NextResponse } from "next/server";
import { isGoogleOAuthConfigured } from "@/lib/google-oauth";
import { getGoogleToken, isGoogleTokenStoreAvailable } from "@/lib/google-token-store";
import { getOrCreateDeviceId } from "@/lib/request-identity";

export async function GET(request: NextRequest) {
  if (!isGoogleOAuthConfigured() || !isGoogleTokenStoreAvailable()) {
    return NextResponse.json({
      success: true,
      connected: false,
      configured: false,
    });
  }

  try {
    const { deviceId } = getOrCreateDeviceId(request);
    const token = await getGoogleToken(deviceId);

    return NextResponse.json({
      success: true,
      connected: Boolean(token),
      configured: true,
      email: token?.email,
    });
  } catch (error) {
    console.error("Google status error:", error);
    return NextResponse.json(
      { success: false, error: "Could not read Google connection status." },
      { status: 500 }
    );
  }
}
