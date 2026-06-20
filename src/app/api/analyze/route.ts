import { NextRequest, NextResponse } from "next/server";
import { extractTextFromPdf } from "@/lib/extract-pdf";
import { analyzeResume, AIAnalysisResult } from "@/lib/ai-client";
import {
  ACCESS_COOKIE_NAME,
  checkAndConsumeAccess,
  cookieOptions,
} from "@/lib/access-control";
import { FREE_ANALYSIS_LIMIT, SCANNED_PDF_ERROR } from "@/lib/constants";
import { validateJobDescription } from "@/lib/validate-job-description";

export const runtime = "nodejs";

interface AnalyzeResponse {
  success: boolean;
  data?: AIAnalysisResult;
  error?: string;
  remaining?: number;
  unlocked?: boolean;
}

function isPdfBuffer(buffer: Buffer): boolean {
  return buffer.length >= 4 && buffer.subarray(0, 4).toString("ascii") === "%PDF";
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

    if (!file.name.toLowerCase().endsWith(".pdf")) {
      return NextResponse.json<AnalyzeResponse>(
        { success: false, error: "Only PDF files are supported" },
        { status: 400 }
      );
    }

    if (file.size > 10 * 1024 * 1024) {
      return NextResponse.json<AnalyzeResponse>(
        { success: false, error: "File too large. Maximum size is 10MB" },
        { status: 400 }
      );
    }

    const buffer = Buffer.from(await file.arrayBuffer());

    if (!isPdfBuffer(buffer)) {
      return NextResponse.json<AnalyzeResponse>(
        { success: false, error: "Only valid PDF files are supported" },
        { status: 400 }
      );
    }

    let resumeText: string;
    try {
      resumeText = await extractTextFromPdf(buffer);
    } catch (pdfError) {
      const message = pdfError instanceof Error ? pdfError.message : "";
      if (message.includes("too many pages")) {
        return NextResponse.json<AnalyzeResponse>(
          { success: false, error: message },
          { status: 400 }
        );
      }
      throw pdfError;
    }

    if (!resumeText.trim()) {
      return NextResponse.json<AnalyzeResponse>(
        {
          success: false,
          error: SCANNED_PDF_ERROR,
        },
        { status: 422 }
      );
    }

    const truncatedResume = resumeText.slice(0, 8000);
    const truncatedJD = jobDescription!.trim().slice(0, 4000);

    const result = await analyzeResume(truncatedResume, truncatedJD);

    const response = NextResponse.json<AnalyzeResponse>({
      success: true,
      data: result,
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
