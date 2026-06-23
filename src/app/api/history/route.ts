import { NextRequest, NextResponse } from "next/server";
import {
  clearHistory,
  deleteHistoryEntry,
  getHistory,
} from "@/lib/analysis-history";
import { attachAccessCookies, getAccessStatus } from "@/lib/access-control";

export async function GET(request: NextRequest) {
  try {
    const access = await getAccessStatus(request);
    const entries = await getHistory(access.deviceId);

    const response = NextResponse.json({
      success: true,
      entries,
    });

    return attachAccessCookies(response, access);
  } catch (error) {
    console.error("History GET error:", error);
    return NextResponse.json(
      { success: false, error: "Could not load history." },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const access = await getAccessStatus(request);
    const entryId = request.nextUrl.searchParams.get("entryId");

    if (entryId) {
      await deleteHistoryEntry(access.deviceId, entryId);
    } else {
      await clearHistory(access.deviceId);
    }

    const response = NextResponse.json({ success: true });
    return attachAccessCookies(response, access);
  } catch (error) {
    console.error("History DELETE error:", error);
    return NextResponse.json(
      { success: false, error: "Could not update history." },
      { status: 500 }
    );
  }
}
