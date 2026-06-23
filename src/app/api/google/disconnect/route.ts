import { NextRequest, NextResponse } from "next/server";
import { deleteGoogleToken } from "@/lib/google-token-store";
import { getOrCreateDeviceId } from "@/lib/request-identity";

export async function POST(request: NextRequest) {
  try {
    const { deviceId } = getOrCreateDeviceId(request);
    await deleteGoogleToken(deviceId);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Google disconnect error:", error);
    return NextResponse.json(
      { success: false, error: "Could not disconnect Google account." },
      { status: 500 }
    );
  }
}
