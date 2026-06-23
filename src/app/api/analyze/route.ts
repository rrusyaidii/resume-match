import { NextRequest, NextResponse } from "next/server";
import type { AIAnalysisResult } from "@/lib/ai-client";
import { processResumeFile } from "@/lib/analyze-resume-file";
import {
  appendHistory,
  buildBatchHistoryEntry,
  buildSingleHistoryEntry,
} from "@/lib/analysis-history";
import {
  attachAccessCookies,
  checkAndConsumeAccess,
  getAccessStatus,
  isUnlockedRequest,
} from "@/lib/access-control";
import type { BatchResultItem } from "@/lib/batch-types";
import {
  createBatchSession,
  hashJobDescription,
  validateAndAdvanceBatchSession,
} from "@/lib/batch-session";
import { FREE_ANALYSIS_LIMIT, MAX_BATCH_SIZE, RATE_LIMIT_MESSAGE } from "@/lib/constants";
import { getRequestIdentity } from "@/lib/request-identity";
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
  batchSessionId?: string;
  batchComplete?: boolean;
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

function parseBatchTotal(value: FormDataEntryValue | null): number {
  if (typeof value !== "string") return 0;
  const parsed = parseInt(value, 10);
  if (!Number.isFinite(parsed) || parsed < 2) return 0;
  return Math.min(parsed, MAX_BATCH_SIZE);
}

function parseBatchResults(value: FormDataEntryValue | null): BatchResultItem[] | null {
  if (typeof value !== "string" || !value.trim()) return null;
  try {
    const parsed = JSON.parse(value) as BatchResultItem[];
    return Array.isArray(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get("resume") as File | null;
    const jobDescription = formData.get("jobDescription") as string | null;
    const turnstileToken = formData.get("turnstileToken");
    const batchSessionIdRaw = formData.get("batchSessionId");
    const batchSessionId =
      typeof batchSessionIdRaw === "string" && batchSessionIdRaw.trim()
        ? batchSessionIdRaw.trim()
        : null;
    const batchTotal = parseBatchTotal(formData.get("batchTotal"));
    const batchResults = parseBatchResults(formData.get("batchResults"));

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

    const jd = jobDescription!.trim();
    const jdHash = hashJobDescription(jd);
    const identity = getRequestIdentity(request);
    const unlocked = isUnlockedRequest(request);

    let access = await getAccessStatus(request);
    let newBatchSessionId: string | undefined;
    let batchAdvance:
      | Awaited<ReturnType<typeof validateAndAdvanceBatchSession>>
      | undefined;

    if (batchSessionId) {
      batchAdvance = await validateAndAdvanceBatchSession(
        batchSessionId,
        identity.deviceId,
        jdHash
      );
      if (!batchAdvance.ok) {
        const response = NextResponse.json<AnalyzeResponse>(
          { success: false, error: batchAdvance.error },
          { status: 400 }
        );
        return attachAccessCookies(response, access);
      }
    } else {
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

      access = await checkAndConsumeAccess(request);

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

      if (batchTotal > 1) {
        newBatchSessionId = await createBatchSession(identity.deviceId, batchTotal, jdHash);
        batchAdvance = await validateAndAdvanceBatchSession(
          newBatchSessionId,
          identity.deviceId,
          jdHash
        );
        if (!batchAdvance.ok) {
          const response = NextResponse.json<AnalyzeResponse>(
            { success: false, error: batchAdvance.error },
            { status: 500 }
          );
          return attachAccessCookies(response, access);
        }
      }
    }

    const result = await processResumeFile(file, jd);

    if (!result.success) {
      const response = NextResponse.json<AnalyzeResponse>(
        { success: false, error: result.error },
        { status: result.status ?? 400 }
      );
      return attachAccessCookies(response, access);
    }

    const sessionId = batchSessionId ?? newBatchSessionId;
    const isBatchComplete = batchAdvance?.ok === true && batchAdvance.isComplete;

    if (!sessionId) {
      await appendHistory(
        identity.deviceId,
        buildSingleHistoryEntry(file.name, jd, result.data)
      );
    } else if (isBatchComplete) {
      const completed: BatchResultItem[] = batchResults ? [...batchResults] : [];
      completed.push({ fileName: file.name, success: true, data: result.data });
      await appendHistory(identity.deviceId, buildBatchHistoryEntry(jd, completed));
    }

    const response = NextResponse.json<AnalyzeResponse>({
      success: true,
      data: result.data,
      remaining: access.remaining,
      unlocked: access.unlocked,
      batchSessionId: sessionId,
      batchComplete: isBatchComplete,
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
