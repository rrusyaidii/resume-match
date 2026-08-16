import { NextRequest, NextResponse } from "next/server";
import type { AIAnalysisResult } from "@/lib/ai-client";
import { extractResumeTextFromFile } from "@/lib/analyze-resume-file";
import { updateHistoryEntry } from "@/lib/analysis-history";
import { isUnlockedRequest } from "@/lib/access-control";
import { PREP_RATE_LIMIT_MESSAGE } from "@/lib/constants";
import { generateInterviewPrep, isPrepConfigured } from "@/lib/interview-prep";
import type { InterviewPrepResult } from "@/lib/interview-prep-types";
import { getRequestIdentity } from "@/lib/request-identity";
import { checkPrepRateLimit } from "@/lib/redis-rate-limit";
import { validateJobDescription } from "@/lib/validate-job-description";

export const runtime = "nodejs";

interface PrepResponse {
  success: boolean;
  data?: InterviewPrepResult;
  error?: string;
}

function parseAnalysis(value: FormDataEntryValue | null): AIAnalysisResult | null {
  if (typeof value !== "string" || !value.trim()) return null;
  try {
    const parsed = JSON.parse(value) as AIAnalysisResult;
    if (!parsed || typeof parsed !== "object") return null;
    if (!Array.isArray(parsed.gaps) || !Array.isArray(parsed.strengths)) return null;
    if (!Array.isArray(parsed.dimensions)) return null;
    return parsed;
  } catch {
    return null;
  }
}

export async function POST(request: NextRequest) {
  try {
    if (!isPrepConfigured()) {
      return NextResponse.json<PrepResponse>(
        {
          success: false,
          error: "Interview prep is unavailable — the AI provider is not configured.",
        },
        { status: 503 }
      );
    }

    const formData = await request.formData();
    const file = formData.get("resume") as File | null;
    const jobDescription = formData.get("jobDescription") as string | null;
    const analysis = parseAnalysis(formData.get("analysis"));
    const historyIdRaw = formData.get("historyId");
    const historyId =
      typeof historyIdRaw === "string" && historyIdRaw.trim() ? historyIdRaw.trim() : null;

    if (!file) {
      return NextResponse.json<PrepResponse>(
        { success: false, error: "Resume file is required" },
        { status: 400 }
      );
    }

    const jdCheck = validateJobDescription(jobDescription ?? "");
    if (!jdCheck.valid) {
      return NextResponse.json<PrepResponse>(
        { success: false, error: jdCheck.error ?? "Invalid job description." },
        { status: 400 }
      );
    }

    if (!analysis) {
      return NextResponse.json<PrepResponse>(
        { success: false, error: "A completed analysis is required to build a prep pack." },
        { status: 400 }
      );
    }

    const unlocked = isUnlockedRequest(request);
    const rate = await checkPrepRateLimit(request, { unlocked });
    if (!rate.allowed) {
      return NextResponse.json<PrepResponse>(
        { success: false, error: PREP_RATE_LIMIT_MESSAGE },
        {
          status: 429,
          headers: rate.retryAfterSec
            ? { "Retry-After": String(rate.retryAfterSec) }
            : undefined,
        }
      );
    }

    const extracted = await extractResumeTextFromFile(file);
    if (!extracted.success) {
      return NextResponse.json<PrepResponse>(
        { success: false, error: extracted.error },
        { status: extracted.status ?? 400 }
      );
    }

    const jd = jobDescription!.trim().slice(0, 4000);
    const prep = await generateInterviewPrep(extracted.text, jd, analysis);

    if (historyId) {
      const identity = getRequestIdentity(request);
      // Best effort — the user still gets their prep if persistence fails.
      try {
        await updateHistoryEntry(identity.deviceId, historyId, { prep });
      } catch (error) {
        console.error(
          "Failed to save prep to history:",
          error instanceof Error ? error.message : error
        );
      }
    }

    return NextResponse.json<PrepResponse>({ success: true, data: prep });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("Prep error:", message);
    return NextResponse.json<PrepResponse>(
      { success: false, error: "Could not build your prep pack. Please try again." },
      { status: 500 }
    );
  }
}
