import { NextRequest, NextResponse } from "next/server";
import type { AIAnalysisResult } from "@/lib/ai-client";
import { processResumePdf } from "@/lib/analyze-resume-file";
import {
  ACCESS_COOKIE_NAME,
  checkAndConsumeAccess,
  cookieOptions,
} from "@/lib/access-control";
import { FREE_ANALYSIS_LIMIT } from "@/lib/constants";
import { validateJobDescription } from "@/lib/validate-job-description";

export const runtime = "nodejs";

interface AnalyzeResponse {
  success: boolean;
  data?: AIAnalysisResult;
  error?: string;
  remaining?: number;
  unlocked?: boolean;
}

function attachAccessCookie(response: NextResponse, cookieValue: string) {
  response.cookies.set(ACCESS_COOKIE_NAME, cookieValue, cookieOptions());
  return response;
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get("resume") as File | null;
    const jobDescription = formData.get("jobDescription") as string | null;

    if (!file) {
      return NextResponse.json<AnalyzeResponse>(
        { success: false, error: "Resume file is required" },
        { status: 400 }
      );
    }

    const jdCheck = validateJobDescription(jobDescription ?? "");
    if (!jdCheck.valid) {
      return NextResponse.json<AnalyzeResponse>(
        { success: false, error: jdCheck.error ?? "Invalid job description." },
        { status: 400 }
      );
    }

    const accessCookie = request.cookies.get(ACCESS_COOKIE_NAME)?.value;
    const access = checkAndConsumeAccess(accessCookie);

    if (!access.allowed) {
      const response = NextResponse.json<AnalyzeResponse>(
        {
          success: false,
          error: `Free limit reached (${FREE_ANALYSIS_LIMIT} analyses). Enter access code to continue.`,
          remaining: 0,
          unlocked: false,
        },
        { status: 429 }
      );
      return attachAccessCookie(response, access.cookieValue);
    }

    const result = await processResumePdf(file, jobDescription!);

    if (!result.success) {
      const response = NextResponse.json<AnalyzeResponse>(
        { success: false, error: result.error },
        { status: result.status ?? 400 }
      );
      return attachAccessCookie(response, access.cookieValue);
    }

    const response = NextResponse.json<AnalyzeResponse>({
      success: true,
      data: result.data,
      remaining: access.remaining,
      unlocked: access.unlocked,
    });

    return attachAccessCookie(response, access.cookieValue);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("Analyze error:", message);
    return NextResponse.json<AnalyzeResponse>(
      { success: false, error: "Analysis failed. Please try again." },
      { status: 500 }
    );
  }
}
