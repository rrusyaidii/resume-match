import { NextRequest, NextResponse } from "next/server";
import type { AIAnalysisResult } from "@/lib/ai-client";
import { processResumePdf, validatePdfFile } from "@/lib/analyze-resume-file";
import {
  ACCESS_COOKIE_NAME,
  checkAndConsumeAccess,
  cookieOptions,
} from "@/lib/access-control";
import { FREE_ANALYSIS_LIMIT, MAX_BATCH_SIZE } from "@/lib/constants";
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

function attachAccessCookie(response: NextResponse, cookieValue: string) {
  response.cookies.set(ACCESS_COOKIE_NAME, cookieValue, cookieOptions());
  return response;
}

function getResumeFiles(formData: FormData): File[] {
  const fromResume = formData.getAll("resume").filter((entry): entry is File => entry instanceof File);
  const fromBracket = formData
    .getAll("resume[]")
    .filter((entry): entry is File => entry instanceof File);
  return [...fromResume, ...fromBracket];
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const files = getResumeFiles(formData);
    const jobDescription = formData.get("jobDescription") as string | null;

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
      const fileError = validatePdfFile(file);
      if (fileError) {
        return NextResponse.json<BatchAnalyzeResponse>(
          { success: false, error: `${file.name}: ${fileError}` },
          { status: 400 }
        );
      }
    }

    const accessCookie = request.cookies.get(ACCESS_COOKIE_NAME)?.value;
    const access = checkAndConsumeAccess(accessCookie);

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
      return attachAccessCookie(response, access.cookieValue);
    }

    const results: BatchResultItem[] = [];

    for (const file of files) {
      try {
        const result = await processResumePdf(file, jobDescription!);
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

    return attachAccessCookie(response, access.cookieValue);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("Batch analyze error:", message);
    return NextResponse.json<BatchAnalyzeResponse>(
      { success: false, error: "Analysis failed. Please try again." },
      { status: 500 }
    );
  }
}
