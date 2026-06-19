import { NextRequest, NextResponse } from "next/server";
import { ACCESS_COOKIE_NAME, getAccessStatus } from "@/lib/access-control";
import { FREE_ANALYSIS_LIMIT } from "@/lib/constants";

export async function GET(request: NextRequest) {
  try {
    const cookieValue = request.cookies.get(ACCESS_COOKIE_NAME)?.value;
    const status = getAccessStatus(cookieValue);

    return NextResponse.json({
      success: true,
      ...status,
      limit: FREE_ANALYSIS_LIMIT,
    });
  } catch (error) {
    console.error("Access status error:", error);
    return NextResponse.json(
      { success: false, error: "Could not read access status." },
      { status: 500 }
    );
  }
}
