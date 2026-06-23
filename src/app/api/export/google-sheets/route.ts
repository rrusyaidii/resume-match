import { NextRequest, NextResponse } from "next/server";
import type { BatchResultItem } from "@/lib/batch-types";
import { exportBatchToGoogleSheet } from "@/lib/google-sheets-export";
import { isGoogleOAuthConfigured } from "@/lib/google-oauth";
import { getGoogleToken, isGoogleTokenStoreAvailable } from "@/lib/google-token-store";
import { getOrCreateDeviceId } from "@/lib/request-identity";

interface ExportRequestBody {
  results?: BatchResultItem[];
  jobDescription?: string;
}

const MAX_BODY_BYTES = 500_000;

export async function POST(request: NextRequest) {
  if (!isGoogleOAuthConfigured() || !isGoogleTokenStoreAvailable()) {
    return NextResponse.json(
      {
        success: false,
        error: "Google Sheets export is not configured on this server.",
      },
      { status: 503 }
    );
  }

  const contentLength = Number(request.headers.get("content-length") ?? "0");
  if (contentLength > MAX_BODY_BYTES) {
    return NextResponse.json(
      { success: false, error: "Export payload is too large." },
      { status: 413 }
    );
  }

  let body: ExportRequestBody;
  try {
    body = (await request.json()) as ExportRequestBody;
  } catch {
    return NextResponse.json(
      { success: false, error: "Invalid export payload." },
      { status: 400 }
    );
  }

  const results = body.results;
  const jobDescription = body.jobDescription?.trim() ?? "";

  if (!Array.isArray(results) || results.length === 0) {
    return NextResponse.json(
      { success: false, error: "No batch results to export." },
      { status: 400 }
    );
  }

  if (!jobDescription) {
    return NextResponse.json(
      { success: false, error: "Job description is required for export." },
      { status: 400 }
    );
  }

  const hasSuccessful = results.some((item) => item.success && item.data);
  if (!hasSuccessful) {
    return NextResponse.json(
      { success: false, error: "No successful analyses to export." },
      { status: 400 }
    );
  }

  try {
    const { deviceId } = getOrCreateDeviceId(request);
    const token = await getGoogleToken(deviceId);

    if (!token) {
      return NextResponse.json(
        { success: false, error: "Connect Google before exporting." },
        { status: 401 }
      );
    }

    const sheet = await exportBatchToGoogleSheet(
      token.refreshToken,
      deviceId,
      results,
      jobDescription
    );

    return NextResponse.json({
      success: true,
      url: sheet.spreadsheetUrl,
      spreadsheetId: sheet.spreadsheetId,
      mode: sheet.mode,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Export failed";
    console.error("Google Sheets export error:", message);
    return NextResponse.json(
      { success: false, error: "Could not export to Google Sheets. Try reconnecting Google." },
      { status: 500 }
    );
  }
}
