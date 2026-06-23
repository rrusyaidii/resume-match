import { NextRequest, NextResponse } from "next/server";
import { processResumeFile, validateResumeFile } from "@/lib/analyze-resume-file";
import {
  attachAccessCookies,
  checkAndConsumeAccess,
  isUnlockedRequest,
} from "@/lib/access-control";
import { FREE_ANALYSIS_LIMIT, MAX_BATCH_SIZE, RATE_LIMIT_MESSAGE } from "@/lib/constants";
import { checkAnalyzeRateLimit } from "@/lib/redis-rate-limit";
import { isTurnstileConfigured, verifyTurnstileFromRequest } from "@/lib/turnstile";
import { validateJobDescription } from "@/lib/validate-job-description";

export const runtime = "nodejs";

import type { BatchResultItem } from "@/lib/batch-types";

interface BatchAnalyzeResponse {
  success: boolean;
  results?: BatchResultItem[];
  error?: string;
  remaining?: number;
  unlocked?: boolean;
}

function getResumeFiles(formData: FormData): File[] {
  const fromResume = formData.getAll("resume").filter((entry): entry is File => entry instanceof File);
  const fromBracket = formData
    .getAll("resume[]")
    .filter((entry): entry is File => entry instanceof File);
  return [...fromResume, ...fromBracket];
}

function rateLimitResponse(retryAfterSec?: number) {
  return NextResponse.json<BatchAnalyzeResponse>(
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
    const files = getResumeFiles(formData);
    const jobDescription = formData.get("jobDescription") as string | null;
    const turnstileToken = formData.get("turnstileToken");

    if (files.length === 0) {
      return NextResponse.json<BatchAnalyzeResponse>(
        { success: false, error: "At least one resume file is required" },
        { status: 400 }
      );
    }

    if (files.length > MAX_BATCH_SIZE) {
      return NextResponse.json<BatchAnalyzeResponse>(
        { success: false, error: `Maximum ${MAX_BATCH_SIZE} resumes per batch` },
        { status: 400 }
      );
    }

    const jdCheck = validateJobDescription(jobDescription ?? "");
    if (!jdCheck.valid) {
      return NextResponse.json<BatchAnalyzeResponse>(
        { success: false, error: jdCheck.error ?? "Invalid job description." },
        { status: 400 }
      );
    }

    for (const file of files) {
      const fileError = validateResumeFile(file);
      if (fileError) {
        return NextResponse.json<BatchAnalyzeResponse>(
          { success: false, error: `${file.name}: ${fileError}` },
          { status: 400 }
        );
      }
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
        return NextResponse.json<BatchAnalyzeResponse>(
          { success: false, error: "Security check failed. Please try again." },
          { status: 403 }
        );
      }
    }

    const access = await checkAndConsumeAccess(request);

    if (!access.allowed) {
      const response = NextResponse.json<BatchAnalyzeResponse>(
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

    const results: BatchResultItem[] = [];

    for (const file of files) {
      try {
        const result = await processResumeFile(file, jobDescription!);
        if (result.success) {
          results.push({ fileName: file.name, success: true, data: result.data });
        } else {
          results.push({ fileName: file.name, success: false, error: result.error });
        }
      } catch {
        results.push({
          fileName: file.name,
          success: false,
          error: "Analysis failed. Please try again.",
        });
      }
    }

    const anySuccess = results.some((item) => item.success);

    const response = NextResponse.json<BatchAnalyzeResponse>({
      success: anySuccess,
      results,
      remaining: access.remaining,
      unlocked: access.unlocked,
      error: anySuccess ? undefined : "No resumes could be analyzed.",
    });

    return attachAccessCookies(response, access);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("Batch analyze error:", message);
    return NextResponse.json<BatchAnalyzeResponse>(
      { success: false, error: "Analysis failed. Please try again." },
      { status: 500 }
    );
  }
}
