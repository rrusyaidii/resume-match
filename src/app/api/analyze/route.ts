import { NextRequest, NextResponse } from "next/server";
import type { AIAnalysisResult } from "@/lib/ai-client";
import { processResumePdf } from "@/lib/analyze-resume-file";
import {
  attachAccessCookies,
  checkAndConsumeAccess,
  isUnlockedRequest,
} from "@/lib/access-control";
import { FREE_ANALYSIS_LIMIT, RATE_LIMIT_MESSAGE } from "@/lib/constants";
import { checkAnalyzeRateLimit } from "@/lib/redis-rate-limit";
import { isTurnstileConfigured, verifyTurnstileFromRequest } from "@/lib/turnstile";
import { validateJobDescription } from "@/lib/validate-job-description";

export const runtime = "nodejs";

interface AnalyzeResponse {
  success: boolean;
  data?: AIAnalysisResult;
  error?: string;
  remaining?: number;
  unlocked?: boolean;
}

function rateLimitResponse(retryAfterSec?: number) {
  return NextResponse.json<AnalyzeResponse>(
    { success: false, error: RATE_LIMIT_MESSAGE },
    {
      status: 429,
      headers: retryAfterSec ? { "Retry-After": String(retryAfterSec) } : undefined,
    }
  );
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get("resume") as File | null;
    const jobDescription = formData.get("jobDescription") as string | null;
    const turnstileToken = formData.get("turnstileToken");

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

    const unlocked = isUnlockedRequest(request);

    const rate = await checkAnalyzeRateLimit(request, { unlocked });
    if (!rate.allowed) {
      return rateLimitResponse(rate.retryAfterSec);
    }

    if (!unlocked && isTurnstileConfigured()) {
      const valid = await verifyTurnstileFromRequest(
        typeof turnstileToken === "string" ? turnstileToken : null,
        request
      );
      if (!valid) {
        return NextResponse.json<AnalyzeResponse>(
          { success: false, error: "Security check failed. Please try again." },
          { status: 403 }
        );
      }
    }

    const access = await checkAndConsumeAccess(request);

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
      return attachAccessCookies(response, access);
    }

    const result = await processResumePdf(file, jobDescription!);

    if (!result.success) {
      const response = NextResponse.json<AnalyzeResponse>(
        { success: false, error: result.error },
        { status: result.status ?? 400 }
      );
      return attachAccessCookies(response, access);
    }

    const response = NextResponse.json<AnalyzeResponse>({
      success: true,
      data: result.data,
      remaining: access.remaining,
      unlocked: access.unlocked,
    });

    return attachAccessCookies(response, access);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("Analyze error:", message);
    return NextResponse.json<AnalyzeResponse>(
      { success: false, error: "Analysis failed. Please try again." },
      { status: 500 }
    );
  }
}
