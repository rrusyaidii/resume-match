import { NextRequest, NextResponse } from "next/server";
import { attachAccessCookies, getAccessStatus } from "@/lib/access-control";
import { FREE_ANALYSIS_LIMIT } from "@/lib/constants";

export async function GET(request: NextRequest) {
  try {
    const status = await getAccessStatus(request);

    const response = NextResponse.json({
      success: true,
      remaining: status.remaining,
      unlocked: status.unlocked,
      used: status.used,
      limit: FREE_ANALYSIS_LIMIT,
    });

    return attachAccessCookies(response, status);
  } catch (error) {
    console.error("Access status error:", error);
    return NextResponse.json(
      { success: false, error: "Could not read access status." },
      { status: 500 }
    );
  }
}
