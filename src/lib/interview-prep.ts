import type { AIAnalysisResult } from "@/lib/ai-client";
import { buildPrepSystemPrompt, buildPrepUserPrompt } from "@/lib/interview-prep-prompt";
import {
  PREP_MAX_BEHAVIORAL,
  PREP_MAX_GAP_DEFENCE,
  PREP_MAX_QUESTIONS_TO_ASK,
  PREP_MAX_TECHNICAL,
  type BehavioralQuestion,
  type GapDefence,
  type InterviewPrepResult,
  type QuestionToAsk,
  type StarScaffold,
  type TechnicalQuestion,
} from "@/lib/interview-prep-types";
import { extractJsonObject, isJsonParseError, repairJson } from "@/lib/llm-json";

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY || "";

/** Prep is long-form generation; kept separate from ANALYSIS_MODEL so it can be tuned alone. */
export const PREP_MODEL = "google/gemini-2.5-flash";

const PREP_MAX_TOKENS = 4000;
const PREP_TEMPERATURE = 0.4;
const PREP_TIMEOUT_MS = 60000;

export function isPrepConfigured(): boolean {
  return OPENROUTER_API_KEY.length > 10;
}

function text(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function scaffold(value: unknown): StarScaffold {
  const raw = (value ?? {}) as Partial<StarScaffold>;
  return {
    situation: text(raw.situation),
    task: text(raw.task),
    action: text(raw.action),
    result: text(raw.result),
  };
}

function list<T>(value: unknown, max: number, map: (item: unknown) => T, keep: (item: T) => boolean): T[] {
  if (!Array.isArray(value)) return [];
  return value.map(map).filter(keep).slice(0, max);
}

function normalizePrep(raw: unknown): InterviewPrepResult {
  const data = (raw ?? {}) as Record<string, unknown>;

  const technical = list<TechnicalQuestion>(
    data.technical,
    PREP_MAX_TECHNICAL,
    (item) => {
      const entry = (item ?? {}) as Partial<TechnicalQuestion>;
      return {
        question: text(entry.question),
        topic: text(entry.topic),
        whatGoodLooksLike: text(entry.whatGoodLooksLike),
      };
    },
    (item) => item.question.length > 0
  );

  const behavioral = list<BehavioralQuestion>(
    data.behavioral,
    PREP_MAX_BEHAVIORAL,
    (item) => {
      const entry = (item ?? {}) as Partial<BehavioralQuestion>;
      return {
        question: text(entry.question),
        whyAsked: text(entry.whyAsked),
        scaffold: scaffold(entry.scaffold),
      };
    },
    (item) => item.question.length > 0
  );

  const gapDefence = list<GapDefence>(
    data.gapDefence,
    PREP_MAX_GAP_DEFENCE,
    (item) => {
      const entry = (item ?? {}) as Partial<GapDefence>;
      return {
        question: text(entry.question),
        gap: text(entry.gap),
        suggestedAngle: text(entry.suggestedAngle),
      };
    },
    (item) => item.question.length > 0
  );

  const questionsToAsk = list<QuestionToAsk>(
    data.questionsToAsk,
    PREP_MAX_QUESTIONS_TO_ASK,
    (item) => {
      const entry = (item ?? {}) as Partial<QuestionToAsk>;
      return {
        question: text(entry.question),
        rationale: text(entry.rationale),
      };
    },
    (item) => item.question.length > 0
  );

  if (!technical.length && !behavioral.length && !gapDefence.length && !questionsToAsk.length) {
    throw new Error("AI returned no usable interview questions");
  }

  return {
    detectedLevel: text(data.detectedLevel) || "Not specified",
    roleFamily: text(data.roleFamily) || "General",
    technical,
    behavioral,
    gapDefence,
    questionsToAsk,
    generatedAt: new Date().toISOString(),
  };
}

function parsePrepResponse(raw: string): InterviewPrepResult {
  const candidates = [raw, repairJson(extractJsonObject(raw))];
  let lastError: Error | undefined;

  for (const candidate of candidates) {
    try {
      return normalizePrep(JSON.parse(candidate));
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
    }
  }

  throw lastError ?? new Error("AI returned invalid JSON");
}

async function requestPrep(
  resumeText: string,
  jobDescription: string,
  analysis: AIAnalysisResult
): Promise<InterviewPrepResult> {
  const siteUrl =
    process.env.NEXT_PUBLIC_SITE_URL ??
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3000");

  const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${OPENROUTER_API_KEY}`,
      "HTTP-Referer": siteUrl,
      "X-Title": "ResuMatch",
    },
    body: JSON.stringify({
      model: PREP_MODEL,
      messages: [
        { role: "system", content: buildPrepSystemPrompt() },
        {
          role: "user",
          content: buildPrepUserPrompt(resumeText, jobDescription, analysis),
        },
      ],
      temperature: PREP_TEMPERATURE,
      max_tokens: PREP_MAX_TOKENS,
      response_format: { type: "json_object" },
    }),
    signal: AbortSignal.timeout(PREP_TIMEOUT_MS),
  });

  if (!response.ok) {
    const body = await response.text().catch(() => "");
    throw new Error(`OpenRouter HTTP ${response.status}: ${body.slice(0, 200)}`);
  }

  const data = await response.json();
  const rawContent = data.choices?.[0]?.message?.content ?? "";
  if (!rawContent.trim()) {
    throw new Error("AI returned empty response");
  }

  return parsePrepResponse(rawContent);
}

export async function generateInterviewPrep(
  resumeText: string,
  jobDescription: string,
  analysis: AIAnalysisResult
): Promise<InterviewPrepResult> {
  if (!isPrepConfigured()) {
    throw new Error("Interview prep requires OpenRouter to be configured.");
  }

  try {
    return await requestPrep(resumeText, jobDescription, analysis);
  } catch (firstError) {
    if (!isJsonParseError(firstError)) {
      throw firstError;
    }

    const message = firstError instanceof Error ? firstError.message : String(firstError);
    console.warn("Prep JSON parse failed, retrying once:", message);
    return await requestPrep(resumeText, jobDescription, analysis);
  }
}
